const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdminOrMecanico } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdminOrMecanico);

// GET /api/repuestos
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const offset = page * size;

  try {
    const { rows } = await db.query(
      'SELECT *, COUNT(*) OVER() AS full_count FROM repuestos ORDER BY id DESC LIMIT $1 OFFSET $2',
      [size, offset]
    );

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
    console.error("Error al obtener repuestos:", err.message);
    return res.status(500).json({ message: 'Error al consultar repuestos.' });
  }
});

// POST /api/repuestos
router.post('/', async (req, res) => {
  const { nombre, referencia, stock, precio } = req.body;

  if (!nombre || !referencia || stock === undefined || precio === undefined) {
    return res.status(400).json({ message: 'El nombre, referencia, stock y precio son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      'INSERT INTO repuestos (nombre, referencia, stock, precio) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, referencia.toUpperCase(), parseInt(stock), parseFloat(precio)]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error al crear repuesto:", err.message);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Ya existe un repuesto registrado con esta referencia.' });
    }
    return res.status(500).json({ message: 'Error al registrar el repuesto.' });
  }
});

// PUT /api/repuestos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, referencia, stock, precio } = req.body;

  if (!nombre || !referencia || stock === undefined || precio === undefined) {
    return res.status(400).json({ message: 'El nombre, referencia, stock y precio son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      'UPDATE repuestos SET nombre = $1, referencia = $2, stock = $3, precio = $4 WHERE id = $5 RETURNING *',
      [nombre, referencia.toUpperCase(), parseInt(stock), parseFloat(precio), id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Repuesto no encontrado.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(`Error al actualizar repuesto ${id}:`, err.message);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Ya existe otro repuesto registrado con esta referencia.' });
    }
    return res.status(500).json({ message: 'Error al actualizar el repuesto.' });
  }
});

// DELETE /api/repuestos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query('DELETE FROM repuestos WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Repuesto no encontrado.' });
    }
    return res.json({ message: 'Repuesto eliminado correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar repuesto ${id}:`, err.message);
    if (err.code === '23503') {
      return res.status(400).json({ message: 'No se puede eliminar el repuesto porque está asociado a ítems de órdenes.' });
    }
    return res.status(500).json({ message: 'Error al eliminar el repuesto.' });
  }
});

module.exports = router;
