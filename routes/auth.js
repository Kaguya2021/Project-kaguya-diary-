import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/pool.js';
import { sendTelegramNotification } from '../services/telegram.js';

const router = express.Router();

function normalizeUsername(username) {
    return username.trim().toLowerCase();
}

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.trim().length === 0 || password.length < 6) {
        return res.status(400).json({ error: 'Некорректные данные или короткий пароль (мин. 6 символов) :)' });
    }

    const normUsername = normalizeUsername(username);

    try {
        const existing = await pool.query('SELECT id FROM users WHERE username_normalized = $1', [normUsername]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Имя пользователя уже занято :)' });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = await pool.query(
            `INSERT INTO users (username, username_normalized, password_hash, role) 
             VALUES ($1, $2, $3, 'student') RETURNING id, username, role, created_at`,
            [username.trim(), normUsername, passwordHash]
        );

        const user = newUser.rows[0];
        req.session.userId = user.id;
        req.session.role = user.role;

        await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        await pool.query(
            `INSERT INTO auth_events (user_id, attempted_username_normalized, event_type, success) VALUES ($1, $2, 'REGISTRATION', true)`,
            [user.id, normUsername]
        );

        sendTelegramNotification(`🆕 НОВАЯ РЕГИСТРАЦИЯ\nПользователь: ${user.username}\nID: ${user.id}\nВремя: ${new Date().toLocaleString()}`);

        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Ошибка сервера при регистрации :)' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля :)' });
    }

    const normUsername = normalizeUsername(username);

    try {
        const result = await pool.query('SELECT * FROM users WHERE username_normalized = $1', [normUsername]);
        if (result.rows.length === 0) {
            await pool.query(
                `INSERT INTO auth_events (attempted_username_normalized, event_type, success) VALUES ($1, 'LOGIN', false)`,
                [normUsername]
            );
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль :)' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            await pool.query(
                `INSERT INTO auth_events (user_id, attempted_username_normalized, event_type, success) VALUES ($1, $2, 'LOGIN', false)`,
                [user.id, normUsername]
            );
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль :)' });
        }

        req.session.userId = user.id;
        req.session.role = user.role;

        await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        await pool.query(
            `INSERT INTO auth_events (user_id, attempted_username_normalized, event_type, success) VALUES ($1, $2, 'LOGIN', true)`,
            [user.id, normUsername]
        );

        sendTelegramNotification(`🔑 УСПЕШНЫЙ ВХОД\nПользователь: ${user.username}\nID: ${user.id}\nВремя: ${new Date().toLocaleString()}`);

        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера при входе :)' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при выходе :)' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

router.get('/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ isAuthenticated: false });
    }
    try {
        const result = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [req.session.userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ isAuthenticated: false });
        }
        res.json({ isAuthenticated: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

export default router;
