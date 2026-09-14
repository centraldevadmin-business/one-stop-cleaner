import { Router } from 'express';
import db from '../../db/database.js';

export const adminRouter = Router();

// GET /api/settings - Retrieve all settings as key-value map
adminRouter.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/settings - Update settings
adminRouter.post('/', async (req, res) => {
  try {
    const body = req.body;
    for (const [key, value] of Object.entries(body)) {
      await db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, datetime('now')) 
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(key, value);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
