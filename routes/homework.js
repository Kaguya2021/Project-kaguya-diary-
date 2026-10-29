import express from 'express';
import pool from '../database/pool.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

const validSchedule = {
    'Понедельник': ['К-тил', 'Технол', 'Хим', 'Дин тарых', 'Алгебр', 'К-адаб'],
    'Вторник': ['Ч-тил', 'Д-тарбия', 'Биолог', 'Тарых', 'Геомет', 'Алгебра'],
    'Среда': ['Геогр', 'Физика', 'К-адаб', 'Инф-ка', 'А.ж.к', 'О-адаб'],
    'Четверг': ['Физика', 'Биолог', 'К-адаб', 'О-адаб', 'Геогр', 'Тарых'],
    'Пятница': ['Алгебра', 'Д-тарбия', 'К-тил', 'Ч-тил', 'О-тил', 'Хим']
};

router.get('/', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const { status, weekday } = req.query;

    try {
        let query = 'SELECT * FROM homework WHERE user_id = $1';
        let params = [userId];
        let paramIndex = 2;

        if (status === 'completed') {
            query += ` AND is_completed = true`;
        } else if (status === 'uncompleted') {
            query += ` AND is_completed = false`;
        }

        if (weekday) {
            query += ` AND weekday = $${paramIndex}`;
            params.push(weekday);
            paramIndex++;
        }

        query += ' ORDER BY due_date ASC, id DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching homework:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.post('/', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const { weekday, lesson_number, subject, description, due_date } = req.body;

    if (!weekday || !lesson_number || !subject || !description) {
        return res.status(400).json({ error: 'Заполните все обязательные поля :)' });
    }

    const dayLessons = validSchedule[weekday];
    if (!dayLessons) {
        return res.status(400).json({ error: 'Неверный день недели :)' });
    }

    const expectedSubject = dayLessons[lesson_number - 1];
    if (!expectedSubject || expectedSubject.toLowerCase() !== subject.toLowerCase()) {
        return res.status(400).json({ error: `Предмет "${subject}" не соответствует расписанию для ${weekday} на уроке №${lesson_number} :)` });
    }

    try {
        const result = await pool.query(
            `INSERT INTO homework (user_id, weekday, lesson_number, subject, description, due_date) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, weekday, lesson_number, expectedSubject, description, due_date || null]
        );
        res.json({ success: true, homework: result.rows[0] });
    } catch (err) {
        console.error('Error creating homework:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.put('/:id', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const hwId = req.params.id;
    const { description, is_completed, due_date } = req.body;

    try {
        const check = await pool.query('SELECT * FROM homework WHERE id = $1 AND user_id = $2', [hwId, userId]);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ запрещен или задание не найдено :)' });
        }

        const current = check.rows[0];
        const newDesc = description !== undefined ? description : current.description;
        const newStatus = is_completed !== undefined ? is_completed : current.is_completed;
        const newDueDate = due_date !== undefined ? due_date : current.due_date;

        const updated = await pool.query(
            `UPDATE homework SET description = $1, is_completed = $2, due_date = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 AND user_id = $5 RETURNING *`,
            [newDesc, newStatus, newDueDate, hwId, userId]
        );

        res.json({ success: true, homework: updated.rows[0] });
    } catch (err) {
        console.error('Error updating homework:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const hwId = req.params.id;

    try {
        const check = await pool.query('DELETE FROM homework WHERE id = $1 AND user_id = $2 RETURNING id', [hwId, userId]);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ запрещен или задание не найдено :)' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting homework:', err);
        res.status(500).json({ error: 'Ошибка сервера :)' });
    }
});

export default router;
