const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn("ADVERTENCIA: No se detectó la variable DATABASE_URL en el entorno. Asegúrate de configurar tu archivo .env.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Prueba la conexión inicial
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error al conectar a PostgreSQL en Supabase:", err.message);
  } else {
    console.log("Conexión exitosa a la base de datos PostgreSQL de Supabase.");
    release();
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
