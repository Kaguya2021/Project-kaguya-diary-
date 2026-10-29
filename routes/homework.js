import express from 'express';
import pool from '../database/pool.js';

const router = express.Router();

const SCHEDULE = {
  "Понедельник": ["К-тил", "Технол", "Хим", "Дин тарых", "Алгебр", "К-адаб"],
  "Вторник": ["Ч-тил", "Д-тарбия", "Биолог", "Тарых", "Геомет", "Алгебра"],
  "Среда": ["Геогр", "Физика", "К-адаб", "Инф-ка", "А.ж.к", "О-адаб"],
  "Четверг": ["Физика", "Биолог", "К-адаб", "О-адаб", "Геогр", "Тарых"],
  "Пятница": ["Алгебра", "Д-тарбия", "К-тил", "Ч-тил", "О-тил", "Хим"]
};

router.get('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  try {
    const result = await pool.query('SELECT * FROM homework WHERE user_id = $1 ORDER BY due_date DESC, id DESC', [req.session.userId]);
    res.json({ homework: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения ДЗ :)' });
  }
});

router.post('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  const { weekday, lesson_number, subject, description, due_date } = req.body;

  if (!weekday || !lesson_number || !subject || !description || !due_date) {
    return res.status(400).json({ error: 'Заполните все поля :)' });
  }

  // Серверная проверка расписания
  const allowedSubjects = SCHEDULE[weekday];
  if (!allowedSubjects || !allowedSubjects.includes(subject)) {
    return res.status(400).json({ error: 'Предмет не соответствует расписанию этого дня :)' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO homework (user_id, weekday, lesson_number, subject, description, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.session.userId, weekday, parseInt(lesson_number, 10), subject, description, due_date]
    );
    res.json({ success: true, homework: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения ДЗ :)' });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM homework WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Доступ запрещен :)' });

    const currentStatus = check.rows[0].is_completed;
    const result = await pool.query(
      'UPDATE homework SET is_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [!currentStatus, id]
    );
    res.json({ success: true, homework: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления статуса :)' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован :)' });
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM homework WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Доступ запрещен :)' });

    await pool.query('DELETE FROM homework WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления :)' });
  }
});

export default router;
