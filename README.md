# Kaguya Diary

Modern electronic diary and interactive library built for the 9-V class.

## Features
- Secure authentication with normalized unique usernames (`username_normalized`) and `bcrypt` password hashing.
- 15 PDF books library with embedded `PDF.js` reader, progress tracking, and bookmarks.
- Official 9-V class schedule (Monday - Friday).
- Homework manager with server-side schedule validation.
- Telegram bot integration for admin notifications (`/start`, `/logs`, `/stats`, `/users`, `/help`).
- Modern minimal dark/light UI design.

## Setup Instructions
1. Clone repository and run `npm install`.
2. Copy `.env.example` to `.env` and fill in your Neon PostgreSQL database URL and Telegram credentials.
3. Run `npm start` to launch the server and Telegram bot.
