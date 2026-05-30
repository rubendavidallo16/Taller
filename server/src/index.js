const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de CORS - Permitimos peticiones desde cualquier origen en desarrollo,
// pero se puede restringir en producción.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares de parseo de datos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de solicitudes recibidas (útil para depuración)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ruta de estado del servidor
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Importar enrutadores
const authRouter = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const vehiculosRouter = require('./routes/vehiculos');
const serviciosRouter = require('./routes/servicios');
const repuestosRouter = require('./routes/repuestos');
const ordenesRouter = require('./routes/ordenes');
const usuariosRouter = require('./routes/usuarios');
const dashboardRouter = require('./routes/dashboard');

// Registrar rutas de la API REST
app.use('/api/auth', authRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/vehiculos', vehiculosRouter);
app.use('/api/servicios', serviciosRouter);
app.use('/api/repuestos', repuestosRouter);
app.use('/api/ordenes', ordenesRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/dashboard', dashboardRouter);

// Manejo de rutas inexistentes (404)
app.use((req, res, next) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.url}` });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error global detectado:", err);
  res.status(err.status || 500).json({
    message: err.message || 'Ocurrió un error inesperado en el servidor.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Servidor REST Paddock CMS ejecutándose en:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`==================================================`);
});
