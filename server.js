console.log("📦 Server-Skript wird gestartet...");

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const Database = require('better-sqlite3');


const app = express();
const PORT = process.env.PORT || 3000;

// ---- DB einrichten ----
const db = new Database('data.db');
db.pragma('journal_mode = wal');

// Tabellen anlegen (idempotent)
db.exec(`
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prename TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  position INTEGER,
  name TEXT,
  time TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Startseite
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

//Fotos
app.get('/api/fotos', (req, res) => {
  const dir = path.join(__dirname, 'public', 'fotos');
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  try {
    if (!fs.existsSync(dir)) return res.json([]);
    const files = fs.readdirSync(dir)
        .filter(f => allowed.has(path.extname(f).toLowerCase()))
        .sort();
    res.json(files); // Frontend baut daraus /fotos/<filename>
  } catch (e) {
    console.error('Fotos lesen fehlgeschlagen:', e);
    res.json([]);
  }
});


//Rangliste
app.post('/anmelden', (req, res) => {
  const { prename, name, email, phone, kategorie, consent } = req.body;
  try {
    db.prepare(`
      INSERT INTO registrations (prename, name, email, phone, category, consent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(prename, name, email, phone, kategorie, consent ? 1 : 0);

    // zurück zur Startseite mit „Danke“-Hinweis
    res.redirect('/?thanks=1');
  } catch (e) {
    console.error('Anmeldung speichern fehlgeschlagen:', e);
    res.status(500).send('Fehler beim Speichern der Anmeldung.');
  }
});

app.get('/api/rangliste', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT category, position, name, time, notes
      FROM results
      ORDER BY COALESCE(category,''), COALESCE(position, 999999), created_at
    `).all();
    res.json(rows);
  } catch (e) {
    console.error('Rangliste lesen fehlgeschlagen:', e);
    res.json([]);
  }
});



// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
