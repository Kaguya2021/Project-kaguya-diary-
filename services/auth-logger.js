import pool from '../database/pool.js';
import crypto from 'crypto';

export async function logAuthEvent(client, { userId, attemptedUsername, eventType, success, req }) {
  try {
    const normalized = attemptedUsername ? attemptedUsername.trim().toLowerCase() : null;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const userAgent = req.headers['user-agent'] || '';

    await client.query(
      `INSERT INTO auth_events (user_id, attempted_username_normalized, event_type, success, ip_hash, user_agent_summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, normalized, eventType, success, ipHash, userAgent.substring(0, 200)]
    );
  } catch (err) {
    console.error('Auth logging error:', err.message);
  }
}
