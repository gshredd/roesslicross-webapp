// db.js
const { Pool } = require('pg');

// Render gibt dir eine DATABASE_URL. Für lokale Tests kannst du dieselbe URL nutzen.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render-Postgres benötigt SSL, local ggf. auch ok:
    ssl: { rejectUnauthorized: false },
});

// einfacher Helper
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
