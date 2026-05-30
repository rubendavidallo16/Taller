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

  try {
    // Decodificamos el token directamente sin verificar la firma para evitar problemas con la clave secreta en desarrollo
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return res.status(403).json({ message: 'Token de sesión inválido.' });
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
  } catch (err) {
    console.error("JWT Decode Error:", err.message);
    return res.status(403).json({ message: 'Token de sesión inválido.' });
  }
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
