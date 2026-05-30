const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdminOrMecanico } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdminOrMecanico);

// Helper para dar formato Supabase nested a los registros de vehículos
function formatVehiculoRow(row) {
  const {
    full_count,
    cliente_nombre,
    cliente_apellido,
    cliente_cedula,
    cliente_email,
    cliente_telefono,
    ...vehiculoData
  } = row;

  return {
    ...vehiculoData,
    clientes: vehiculoData.cliente_id ? {
      id: vehiculoData.cliente_id,
      nombre: cliente_nombre,
      apellido: cliente_apellido,
      cedula: cliente_cedula,
      email: cliente_email,
      telefono: cliente_telefono
    } : null
  };
}

// GET /api/vehiculos (Paginado y con búsqueda opcional)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const search = req.query.search || '';
  const offset = page * size;

  try {
    let queryText = `
      SELECT v.*, COUNT(*) OVER() AS full_count,
             c.nombre AS cliente_nombre, 
             c.apellido AS cliente_apellido, 
             c.cedula AS cliente_cedula,
             c.email AS cliente_email,
             c.telefono AS cliente_telefono
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
    `;
    let params = [];

    if (search.trim()) {
      queryText += `
        WHERE v.placa ILIKE $1 OR v.marca ILIKE $1 OR v.modelo ILIKE $1 
           OR c.nombre ILIKE $1 OR c.apellido ILIKE $1
      `;
      params.push(`%${search.trim()}%`);
      queryText += ' ORDER BY v.created_at DESC LIMIT $2 OFFSET $3';
      params.push(size, offset);
    } else {
      queryText += ' ORDER BY v.created_at DESC LIMIT $1 OFFSET $2';
      params.push(size, offset);
    }

    const { rows } = await db.query(queryText, params);
    
    const totalElements = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    const totalPages = Math.ceil(totalElements / size);

    const content = rows.map(formatVehiculoRow);

    return res.json({
      content,
      totalPages,
      totalElements
    });
  } catch (err) {
    console.error("Error al obtener vehículos:", err.message);
    return res.status(500).json({ message: 'Error al consultar vehículos en la base de datos.' });
  }
});

// GET /api/vehiculos/cliente/:cid
router.get('/cliente/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM vehiculos WHERE cliente_id = $1', [cid]);
    return res.json({ content: rows, totalPages: 1 });
  } catch (err) {
    console.error(`Error al obtener vehículos para cliente ${cid}:`, err.message);
    return res.status(500).json({ message: 'Error al consultar vehículos del cliente.' });
  }
});

// GET /api/vehiculos/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(`
      SELECT v.*,
             c.nombre AS cliente_nombre, 
             c.apellido AS cliente_apellido, 
             c.cedula AS cliente_cedula,
             c.email AS cliente_email,
             c.telefono AS cliente_telefono
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Vehículo no encontrado.' });
    }

    return res.json(formatVehiculoRow(rows[0]));
  } catch (err) {
    console.error(`Error al obtener vehículo ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al buscar el vehículo.' });
  }
});

// POST /api/vehiculos
router.post('/', async (req, res) => {
  const { placa, marca, modelo, anio, color, kilometraje, cliente_id } = req.body;

  if (!placa || !marca || !modelo || !cliente_id) {
    return res.status(400).json({ message: 'Placa, marca, modelo y cliente asignado son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO vehiculos (placa, marca, modelo, anio, color, kilometraje, cliente_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [placa.toUpperCase(), marca, modelo, anio, color, kilometraje, cliente_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error al crear vehículo:", err.message);
    // Si hay una restricción de placa única
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Ya existe un vehículo registrado con esta placa.' });
    }
    return res.status(500).json({ message: 'Error al registrar el vehículo.' });
  }
});

// PUT /api/vehiculos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { placa, marca, modelo, anio, color, kilometraje, cliente_id } = req.body;

  if (!placa || !marca || !modelo || !cliente_id) {
    return res.status(400).json({ message: 'Placa, marca, modelo y cliente asignado son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE vehiculos 
       SET placa = $1, marca = $2, modelo = $3, anio = $4, color = $5, kilometraje = $6, cliente_id = $7 
       WHERE id = $8 RETURNING *`,
      [placa.toUpperCase(), marca, modelo, anio, color, kilometraje, cliente_id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Vehículo no encontrado.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(`Error al actualizar vehículo ${id}:`, err.message);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Ya existe otro vehículo registrado con esta placa.' });
    }
    return res.status(500).json({ message: 'Error al actualizar el vehículo.' });
  }
});

// DELETE /api/vehiculos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query('DELETE FROM vehiculos WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Vehículo no encontrado.' });
    }
    return res.json({ message: 'Vehículo eliminado correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar vehículo ${id}:`, err.message);
    // Si hay un error de clave foránea (órdenes asociadas)
    if (err.code === '23503') {
      return res.status(400).json({ message: 'No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas.' });
    }
    return res.status(500).json({ message: 'Error al eliminar el vehículo.' });
  }
});

module.exports = router;
