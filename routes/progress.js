import express from 'express';
import pool from '../database/pool.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.get('/:bookId', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const bookId = req.params.bookId;

    try {
        const result = await pool.query(
            'SELECT last_page, zoom_level FROM reading_progress WHERE user_id = $1 AND book_id = $2',
            [userId, bookId]
        );
        if (result.rows.length === 0) {
            return res.json({ last_page: 1, zoom_level: 1.0 });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.post('/:bookId', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const bookId = req.params.bookId;
    const { last_page, zoom_level } = req.body;

    try {
        await pool.query(
            `INSERT INTO reading_progress (user_id, book_id, last_page, zoom_level, updated_at) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
             ON CONFLICT (user_id, book_id) 
             DO UPDATE SET last_page = $3, zoom_level = $4, updated_at = CURRENT_TIMESTAMP`,
            [userId, bookId, last_page || 1, zoom_level || 1.0]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving progress:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

export default router;
