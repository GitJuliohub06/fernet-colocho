const path = require('path');
const express = require('express');
const session = require('express-session');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'fernet_colocho_lab_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);

app.use('/api', (_req, res) => {
  return res.status(404).json({ error: 'Endpoint de API no encontrado.' });
});

app.use((err, _req, res, _next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: `Error al subir imagen: ${err.message}` });
  }
  if (err) {
    console.error('Error no controlado:', err.message);
    return res.status(400).json({ error: err.message || 'Error interno del servidor.' });
  }
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor Fernet & Colocho activo en http://${HOST}:${PORT}`);
});