import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

const scheduleData = {
    'Понедельник': ['К-тил', 'Технол', 'Хим', 'Дин тарых', 'Алгебр', 'К-адаб'],
    'Вторник': ['Ч-тил', 'Д-тарбия', 'Биолог', 'Тарых', 'Геомет', 'Алгебра'],
    'Среда': ['Геогр', 'Физика', 'К-адаб', 'Инф-ка', 'А.ж.к', 'О-адаб'],
    'Четверг': ['Физика', 'Биолог', 'К-адаб', 'О-адаб', 'Геогр', 'Тарых'],
    'Пятница': ['Алгебра', 'Д-тарбия', 'К-тил', 'Ч-тил', 'О-тил', 'Хим']
};

router.get('/', isAuthenticated, (req, res) => {
    res.json(scheduleData);
});

export default router;
