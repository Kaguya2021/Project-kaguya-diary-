import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/pool.js';
import { logAuthEvent } from '../services/auth-logger.js';
import { notifyAdmin } from '../services/telegram.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.trim().length < 2 || password.length < 6) {
    return res.status(400).json({ error: 'Некорректные данные или короткий пароль :)' });
  }

  const cleanUsername = username.trim();
  const normalized = cleanUsername.toLowerCase();

  try {
    const check = await pool.query('SELECT id FROM users WHERE username_normalized = $1', [normalized]);
    if (check.rows.length > 0) {
      await logAuthEvent(pool, { attemptedUsername: cleanUsername, eventType: 'Register', success: false, req });
      return res.status(409).json({ error: 'Имя пользователя уже занято :)' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      `INSERT INTO users (username, username_normalized, password_hash) VALUES ($1, $2, $3) RETURNING id, username, created_at`,
      [cleanUsername, normalized, passwordHash]
    );

    const user = newUser.rows[0];
    await logAuthEvent(pool, { userId: user.id, attemptedUsername: cleanUsername, eventType: 'Register', success: true, req });

    await notifyAdmin(`НОВАЯ РЕГИСТРАЦИЯ\n Пользователь: ${user.username} (ID: ${user.id})\n Время: ${new Date().toLocaleString()}`);

    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации :)' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите имя и пароль :)' });
  }

  const cleanUsername = username.trim();
  const normalized = cleanUsername.toLowerCase();

  try {
    const result = await pool.query('SELECT * FROM users WHERE username_normalized = $1', [normalized]);
    if (result.rows.length === 0) {
      await logAuthEvent(pool, { attemptedUsername: cleanUsername, eventType: 'Login', success: false, req });
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль :)' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      await logAuthEvent(pool, { userId: user.id, attemptedUsername: cleanUsername, eventType: 'Login', success: false, req });
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль :)' });
    }

    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    await logAuthEvent(pool, { userId: user.id, attemptedUsername: cleanUsername, eventType: 'Login', success: true, req });

    await notifyAdmin(` УСПЕШНЫЙ ВХОД\n Пользователь: ${user.username} (ID: ${user.id})\n Время: ${new Date().toLocaleString()}`);

    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера при входе :)' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  try {
    const result = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Пользователь не найден :)' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера :)' });
  }
});

export default router;
