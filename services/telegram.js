import TelegramBot from 'node-telegram-bot-api';
import pool from '../database/pool.js';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminId = parseInt(process.env.ADMIN_ID, 10);

let bot = null;
if (token) {
  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== adminId) {
      return bot.sendMessage(chatId, 'У вас нет доступа к панели администрирования :)');
    }
    bot.sendMessage(chatId, 'Добро пожаловать, госпожа Кагуя. Панель администратора Kaguya Diary активна.\n\nКоманды:\n/logs - последние события\n/stats - статистика сайта\n/users - список пользователей\n/help - справка');
  });

  bot.onText(/\/logs/, async (msg) => {
    if (msg.chat.id !== adminId) return;
    try {
      const res = await pool.query(
        `SELECT ae.*, u.username FROM auth_events ae LEFT JOIN users u ON ae.user_id = u.id ORDER BY ae.created_at DESC LIMIT 20`
      );
      if (res.rows.length === 0) return bot.sendMessage(msg.chat.id, 'Журнал событий пуст.');
      
      let text = 'ПОСЛЕДНИЕ СОБЫТИЯ:\n\n';
      res.rows.forEach((row, i) => {
        text += `${i + 1}. [${row.event_type}] Пользователь: ${row.username || row.attempted_username_normalized || 'неизвестно'} | Успех: ${row.success ? 'Да' : 'Нет'} | ${new Date(row.created_at).toLocaleString()}\n`;
      });
      bot.sendMessage(msg.chat.id, text);
    } catch (err) {
      bot.sendMessage(msg.chat.id, 'Ошибка получения логов.');
    }
  });

  bot.onText(/\/stats/, async (msg) => {
    if (msg.chat.id !== adminId) return;
    try {
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      const booksCount = await pool.query('SELECT COUNT(*) FROM books');
      const hwCount = await pool.query('SELECT COUNT(*) FROM homework');
      bot.sendMessage(msg.chat.id, `СТАТИСТИКА САЙТА:\n- Пользователей: ${usersCount.rows[0].count}\n- Книг в базе: ${booksCount.rows[0].count}\n- Д/З записано: ${hwCount.rows[0].count}`);
    } catch (err) {
      bot.sendMessage(msg.chat.id, 'Ошибка получения статистики.');
    }
  });

  bot.onText(/\/users/, async (msg) => {
    if (msg.chat.id !== adminId) return;
    try {
      const res = await pool.query('SELECT id, username, created_at, last_login_at, is_active FROM users ORDER BY created_at DESC LIMIT 20');
      let text = 'СПИСОК ПОЛЬЗОВАТЕЛЕЙ:\n\n';
      res.rows.forEach(u => {
        text += `ID: ${u.id} | ${u.username} | Создан: ${new Date(u.created_at).toLocaleDateString()} | Активен: ${u.is_active ? 'Да' : 'Нет'}\n`;
      });
      bot.sendMessage(msg.chat.id, text);
    } catch (err) {
      bot.sendMessage(msg.chat.id, 'Ошибка получения пользователей.');
    }
  });

  bot.onText(/\/help/, async (msg) => {
    if (msg.chat.id !== adminId) return;
    bot.sendMessage(msg.chat.id, 'Справка:\n/start - Меню\n/logs - Логи входов/регистраций\n/stats - Статистика\n/users - Список пользователей');
  });
}

export async function notifyAdmin(message) {
  if (!bot || !adminId) return;
  try {
    await bot.sendMessage(adminId, message);
  } catch (err) {
    console.error('Telegram notification error:', err.message);
  }
}
