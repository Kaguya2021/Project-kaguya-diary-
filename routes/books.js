import express from 'express';
import pool from '../database/pool.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books WHERE is_visible = TRUE ORDER BY display_order ASC, id ASC');
    res.json({ books: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки книг :)' });
  }
});

export default router;
