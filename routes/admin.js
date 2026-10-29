import express from 'express';
import pool from '../database/pool.js';

const router = express.Router();

async function adminCheck(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  try {
    const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (userRes.rows.length === 0 || userRes.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав :)' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера :)' });
  }
}

router.get('/stats', adminCheck, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const books = await pool.query('SELECT COUNT(*) FROM books');
    const hw = await pool.query('SELECT COUNT(*) FROM homework');
    res.json({
      users_count: users.rows[0].count,
      books_count: books.rows[0].count,
      homework_count: hw.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения статистики :)' });
  }
});

export default router;
