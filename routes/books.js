import express from 'express';
import pool from '../database/pool.js';
import { isAuthenticated } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books WHERE is_visible = true ORDER BY display_order ASC, id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.post('/', isAuthenticated, isAdmin, async (req, res) => {
    const { title, description, cover_url, pdf_storage_key, display_order } = req.body;
    if (!title || !pdf_storage_key) {
        return res.status(400).json({ error: 'Название и путь к PDF обязательны :)' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO books (title, description, cover_url, pdf_storage_key, display_order) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, description || '', cover_url || '', pdf_storage_key, display_order || 0]
        );
        res.json({ success: true, book: result.rows[0] });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
    const bookId = req.params.id;
    try {
        await pool.query('DELETE FROM books WHERE id = $1', [bookId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting book:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

export default router;
