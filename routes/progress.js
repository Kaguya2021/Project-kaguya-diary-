import express from 'express';
import pool from '../database/pool.js';

const router = express.Router();

router.get('/:bookId', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  const { bookId } = req.params;
  try {
    const result = await pool.query(
      'SELECT last_page, zoom_level FROM reading_progress WHERE user_id = $1 AND book_id = $2',
      [req.session.userId, bookId]
    );
    if (result.rows.length === 0) {
      return res.json({ last_page: 1, zoom_level: 1.0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения прогресса :)' });
  }
});

router.post('/:bookId', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  const { bookId } = req.params;
  const { last_page, zoom_level } = req.body;

  try {
    await pool.query(
      `INSERT INTO reading_progress (user_id, book_id, last_page, zoom_level, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, book_id)
       DO UPDATE SET last_page = EXCLUDED.last_page, zoom_level = EXCLUDED.zoom_level, updated_at = CURRENT_TIMESTAMP`,
      [req.session.userId, bookId, last_page || 1, zoom_level || 1.0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения прогресса :)' });
  }
});

export default router;
