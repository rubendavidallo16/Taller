const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdminOrMecanico } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas de clientes
router.use(authenticateToken);
router.use(requireAdminOrMecanico);

// GET /api/clientes (Paginado y con búsqueda opcional)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const search = req.query.search || '';
  const offset = page * size;

  try {
    let queryText = 'SELECT *, COUNT(*) OVER() AS full_count FROM clientes';
    let params = [];

    if (search.trim()) {
      queryText += ' WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1 OR telefono ILIKE $1 OR cedula ILIKE $1';
      params.push(`%${search.trim()}%`);
      queryText += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
      params.push(size, offset);
    } else {
      queryText += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      params.push(size, offset);
    }

    const { rows } = await db.query(queryText, params);
    
    const totalElements = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    const totalPages = Math.ceil(totalElements / size);

    const content = rows.map(row => {
      const { full_count, ...cleanRow } = row;
      return cleanRow;
    });

    return res.json({
      content,
      totalPages,
      totalElements
    });
  } catch (err) {
    console.error("Error al obtener clientes:", err.message);
    return res.status(500).json({ message: 'Error al consultar clientes en la base de datos.' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(`Error al obtener cliente ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al buscar el cliente.' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  const { nombre, apellido, cedula, telefono, email, direccion } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({ message: 'El nombre y apellido son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      'INSERT INTO clientes (nombre, apellido, cedula, telefono, email, direccion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, apellido, cedula, telefono, email, direccion]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error al crear cliente:", err.message);
    return res.status(500).json({ message: 'Error al registrar el cliente.' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, cedula, telefono, email, direccion } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({ message: 'El nombre y apellido son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      'UPDATE clientes SET nombre = $1, apellido = $2, cedula = $3, telefono = $4, email = $5, direccion = $6 WHERE id = $7 RETURNING *',
      [nombre, apellido, cedula, telefono, email, direccion, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(`Error al actualizar cliente ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al actualizar el cliente.' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query('DELETE FROM clientes WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }
    return res.json({ message: 'Cliente eliminado correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar cliente ${id}:`, err.message);
    // Si hay un error de clave foránea (por vehículos asociados)
    if (err.code === '23503') {
      return res.status(400).json({ message: 'No se puede eliminar el cliente porque tiene vehículos asociados.' });
    }
    return res.status(500).json({ message: 'Error al eliminar el cliente.' });
  }
});

module.exports = router;
