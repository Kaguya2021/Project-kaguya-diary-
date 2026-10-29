import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './database/pool.js';
import { initDb } from './database/schema.js';
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import homeworkRoutes from './routes/homework.js';
import scheduleRoutes from './routes/schedule.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';
import { startBot } from './services/telegram.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false
}));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Слишком много попыток входа, попробуйте позже :)' }
});
app.use('/api/auth/', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'kaguya_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Kaguya Diary server running on port ${PORT} :)`);
        startBot();
    });
}).catch(err => {
    console.error('Database initialization failed:', err);
});
