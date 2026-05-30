const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdminOrMecanico } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdminOrMecanico);

// GET /api/servicios
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const offset = page * size;

  try {
    const { rows } = await db.query(
      'SELECT *, COUNT(*) OVER() AS full_count FROM servicios ORDER BY id DESC LIMIT $1 OFFSET $2',
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
    console.error("Error al obtener servicios:", err.message);
    return res.status(500).json({ message: 'Error al consultar servicios.' });
  }
});

// POST /api/servicios
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio } = req.body;

  if (!nombre || precio === undefined) {
    return res.status(400).json({ message: 'El nombre y el precio son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      'INSERT INTO servicios (nombre, descripcion, precio) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion, parseFloat(precio)]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error al crear servicio:", err.message);
    return res.status(500).json({ message: 'Error al registrar el servicio.' });
  }
});

// PUT /api/servicios/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio } = req.body;

  if (!nombre || precio === undefined) {
    return res.status(400).json({ message: 'El nombre y el precio son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      'UPDATE servicios SET nombre = $1, descripcion = $2, precio = $3 WHERE id = $4 RETURNING *',
      [nombre, descripcion, parseFloat(precio), id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(`Error al actualizar servicio ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al actualizar el servicio.' });
  }
});

// DELETE /api/servicios/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query('DELETE FROM servicios WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado.' });
    }
    return res.json({ message: 'Servicio eliminado correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar servicio ${id}:`, err.message);
    if (err.code === '23503') {
      return res.status(400).json({ message: 'No se puede eliminar el servicio porque está asociado a ítems de órdenes.' });
    }
    return res.status(500).json({ message: 'Error al eliminar el servicio.' });
  }
});

module.exports = router;
