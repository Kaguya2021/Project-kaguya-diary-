import express from 'express';
import pool from '../database/pool.js';
import { isAuthenticated } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/stats', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        const booksCount = await pool.query('SELECT COUNT(*) FROM books WHERE is_visible = true');
        const userHwStats = await pool.query(
            `SELECT 
                COUNT(*) as total, 
                SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed 
             FROM homework WHERE user_id = $1`,
            [userId]
        );

        res.json({
            availableBooks: parseInt(booksCount.rows[0].count),
            totalHomework: parseInt(userHwStats.rows[0].total || 0),
            completedHomework: parseInt(userHwStats.rows[0].completed || 0)
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.get('/logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ae.*, u.username 
             FROM auth_events ae 
             LEFT JOIN users u ON ae.user_id = u.id 
             ORDER BY ae.created_at DESC LIMIT 50`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, created_at, last_login_at, is_active FROM users ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

export default router;
