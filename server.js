import express from 'express';
import session from 'express-session';
import pgConnect from 'connect-pg-simple';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from './database/pool.js';

import authRouter from './routes/auth.js';
import booksRouter from './routes/books.js';
import homeworkRouter from './routes/homework.js';
import scheduleRouter from './routes/schedule.js';
import progressRouter from './routes/progress.js';
import adminRouter from './routes/admin.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PGStore = pgConnect(session);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new PGStore({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа, попробуйте позже :)' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/progress', progressRouter);
app.use('/api/admin', adminRouter);

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kaguya Diary server is running on port ${PORT} :)`);
});
