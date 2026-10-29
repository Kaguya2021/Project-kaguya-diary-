import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import pool from '../database/pool.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminId = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : null;

let bot = null;

if (token) {
    bot = new Telegraf(token);

    bot.start(async (ctx) => {
        const chatId = ctx.from.id;
        if (adminId && chatId === adminId) {
            await ctx.reply('Здравствуйте, администратор! Панель управления Kaguya Diary:\n/stats - Статистика сайта\n/users - Список пользователей\n/logs - Журнал событий\n/help - Справка :)');
        } else {
            await ctx.reply('Добро пожаловать в Kaguya Diary! У вас нет прав администратора этого бота :)');
        }
    });

    bot.command('help', async (ctx) => {
        if (adminId && ctx.from.id === adminId) {
            await ctx.reply('Команды администратора:\n/start - Главное меню\n/stats - Статистика\n/users - Пользователи\n/logs - Журнал событий :)');
        } else {
            await ctx.reply('Доступно только администратору :)');
        }
    });

    bot.command('stats', async (ctx) => {
        if (!adminId || ctx.from.id !== adminId) return ctx.reply('Доступ запрещен :)');
        try {
            const usersCount = await pool.query('SELECT COUNT(*) FROM users');
            const booksCount = await pool.query('SELECT COUNT(*) FROM books');
            const hwCount = await pool.query('SELECT COUNT(*) FROM homework');
            await ctx.reply(`📊 Статистика Kaguya Diary:\nПользователей: ${usersCount.rows[0].count}\nКниг: ${booksCount.rows[0].count}\nЗаданий ДЗ: ${hwCount.rows[0].count} :)`);
        } catch (err) {
            await ctx.reply('Ошибка получения статистики :)');
        }
    });

    bot.command('users', async (ctx) => {
        if (!adminId || ctx.from.id !== adminId) return ctx.reply('Доступ запрещен :)');
        try {
            const users = await pool.query('SELECT id, username, role, created_at, last_login_at FROM users ORDER BY id DESC LIMIT 10');
            let msg = '👥 Последние пользователи:\n';
            users.rows.forEach(u => {
                msg += `ID: ${u.id} | ${u.username} (${u.role}) | Рег: ${new Date(u.created_at).toLocaleDateString()}\n`;
            });
            await ctx.reply(msg);
        } catch (err) {
            await ctx.reply('Ошибка получения пользователей :)');
        }
    });

    bot.command('logs', async (ctx) => {
        if (!adminId || ctx.from.id !== adminId) return ctx.reply('Доступ запрещен :)');
        try {
            const logs = await pool.query(
                `SELECT ae.event_type, ae.success, ae.created_at, u.username 
                 FROM auth_events ae LEFT JOIN users u ON ae.user_id = u.id 
                 ORDER BY ae.created_at DESC LIMIT 15`
            );
            let msg = '📜 Последние события:\n';
            logs.rows.forEach((l, i) => {
                msg += `${i+1}. [${l.event_type}] ${l.username || 'Неизвестный'} - ${l.success ? 'Успех' : 'Ошибка'} (${new Date(l.created_at).toLocaleTimeString()})\n`;
            });
            await ctx.reply(msg);
        } catch (err) {
            await ctx.reply('Ошибка получения логирования :)');
        }
    });

    bot.launch().catch(err => console.error('Telegram bot launch error:', err));
}

export function sendTelegramNotification(message) {
    if (bot && adminId) {
        bot.telegram.sendMessage(adminId, message).catch(err => {
            console.error('Failed to send Telegram notification:', err);
        });
    }
}

export function startBot() {
    if (bot) {
        console.log('Telegram bot started successfully :)');
    } else {
        console.log('Telegram bot token not provided, bot skipped :)');
    }
}
