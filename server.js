// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- DB: Postgres Pool ---------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render-Postgres erwartet SSL:
  ssl: { rejectUnauthorized: false },
});

// kleiner Helper für DB-Queries
const db = {
  query: (text, params) => pool.query(text, params),
};

/* ---------- Middleware ---------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // falls du später JSON-APIs brauchst
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Tabellen bei Start anlegen ---------- */
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        prename   TEXT NOT NULL,
        name      TEXT NOT NULL,
        email     TEXT NOT NULL,
        phone     TEXT,
        category  TEXT,
        consent   BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        category  TEXT,
        position  INT,
        name      TEXT,
        time      TEXT,
        notes     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Datenbanktabellen sind bereit.');
  } catch (err) {
    console.error('❌ Fehler beim Anlegen der Tabellen:', err);
  }
})();

/* ---------- Routen ---------- */

// Startseite
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Healthcheck (praktisch für Render)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Anmeldung speichern
app.post('/anmelden', async (req, res) => {
  const { prename, name, email, phone, kategorie, consent } = req.body;

  if (!prename || !name || !email) {
    return res.status(400).send('Fehlende Pflichtfelder.');
  }

  try {
    await db.query(
        `INSERT INTO registrations (prename, name, email, phone, category, consent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [prename, name, email, phone || null, kategorie || null, !!consent]
    );
    // zurück zur Startseite mit "Danke"-Hinweis
    res.redirect('/?thanks=1');
  } catch (err) {
    console.error('❌ Anmeldung speichern fehlgeschlagen:', err);
    res.status(500).send('Fehler beim Speichern der Anmeldung.');
  }
});

// Rangliste liefern (JSON) – leer -> []
app.get('/api/rangliste', async (_req, res) => {
  try {
    const { rows } = await db.query(
        `SELECT category, position, name, time, notes
       FROM results
       ORDER BY COALESCE(category,''), COALESCE(position, 999999), created_at`
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Rangliste lesen fehlgeschlagen:', err);
    res.json([]);
  }
});

// Fotos aus /public/fotos auflisten (JSON) – leer -> []
app.get('/api/fotos', (_req, res) => {
  const dir = path.join(__dirname, 'public', 'fotos');
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  try {
    if (!fs.existsSync(dir)) return res.json([]);
    const files = fs
        .readdirSync(dir)
        .filter(f => allowed.has(path.extname(f).toLowerCase()))
        .sort();
    res.json(files); // Frontend baut URLs als /fotos/<filename>
  } catch (err) {
    console.error('❌ Fotos lesen fehlgeschlagen:', err);
    res.json([]);
  }
});

// Fallback: 404 für Unbekanntes (optional)
app.use((req, res) => {
  res.status(404).send('Nicht gefunden.');
});

/* ---------- Serverstart ---------- */
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
