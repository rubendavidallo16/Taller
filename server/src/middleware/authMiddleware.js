const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // El token suele venir como 'Bearer <token>'
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de sesión no provisto.' });
  }

  if (!JWT_SECRET) {
    console.error("ERROR: SUPABASE_JWT_SECRET no está configurada en las variables de entorno.");
    return res.status(500).json({ message: 'Error interno de configuración del servidor.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token de sesión inválido o expirado.' });
    }

    // Adaptamos el payload de Supabase JWT a la estructura del servidor
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.user_metadata?.role || 'USER',
      nombre: decoded.user_metadata?.nombre || '',
      apellido: decoded.user_metadata?.apellido || ''
    };

    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({ message: 'Acceso denegado: Requiere rol de Administrador.' });
  }
}

function requireAdminOrMecanico(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MECANICO')) {
    next();
  } else {
    return res.status(403).json({ message: 'Acceso denegado: Permisos insuficientes.' });
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrMecanico
};
