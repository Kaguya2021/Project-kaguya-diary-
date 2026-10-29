import pool from '../database/pool.js';

export async function isAdmin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Необходима авторизация :)' });
    }
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
        if (result.rows.length > 0 && result.rows[0].role === 'admin') {
            return next();
        }
        return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора :)' });
    } catch (err) {
        console.error('Admin check error:', err);
        return res.status(500).json({ error: 'Ошибка сервера :)' });
    }
}
