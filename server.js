console.log("📦 Server-Skript wird gestartet...");

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.get('/fotos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/fotos.html'));
});

//Rangliste
app.get('/rangliste', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/rangliste.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
