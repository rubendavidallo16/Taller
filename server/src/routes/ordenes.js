const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdminOrMecanico } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdminOrMecanico);

// Helper para dar formato Supabase nested a los registros de órdenes
function formatOrdenRow(row) {
  const {
    full_count,
    vehiculo_placa,
    vehiculo_marca,
    vehiculo_modelo,
    vehiculo_anio,
    vehiculo_color,
    vehiculo_kilometraje,
    vehiculo_cliente_id,
    cliente_nombre,
    cliente_apellido,
    cliente_cedula,
    cliente_email,
    cliente_telefono,
    ...ordenData
  } = row;

  return {
    ...ordenData,
    vehiculos: ordenData.vehiculo_id ? {
      id: ordenData.vehiculo_id,
      placa: vehiculo_placa,
      marca: vehiculo_marca,
      modelo: vehiculo_modelo,
      anio: vehiculo_anio,
      color: vehiculo_color,
      kilometraje: vehiculo_kilometraje,
      cliente_id: vehiculo_cliente_id,
      clientes: vehiculo_cliente_id ? {
        id: vehiculo_cliente_id,
        nombre: cliente_nombre,
        apellido: cliente_apellido,
        cedula: cliente_cedula,
        email: cliente_email,
        telefono: cliente_telefono
      } : null
    } : null
  };
}

// GET /api/ordenes (Paginado y con filtro de estado opcional)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const estado = req.query.estado || '';
  const offset = page * size;

  try {
    let queryText = `
      SELECT o.*, COUNT(*) OVER() AS full_count,
             v.placa AS vehiculo_placa,
             v.marca AS vehiculo_marca,
             v.modelo AS vehiculo_modelo,
             v.anio AS vehiculo_anio,
             v.color AS vehiculo_color,
             v.kilometraje AS vehiculo_kilometraje,
             v.cliente_id AS vehiculo_cliente_id,
             c.nombre AS cliente_nombre,
             c.apellido AS cliente_apellido,
             c.cedula AS cliente_cedula,
             c.email AS cliente_email,
             c.telefono AS cliente_telefono
      FROM ordenes o
      LEFT JOIN vehiculos v ON o.vehiculo_id = v.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
    `;
    let params = [];

    if (estado) {
      queryText += ' WHERE o.estado = $1';
      params.push(estado);
      queryText += ' ORDER BY o.fecha DESC LIMIT $2 OFFSET $3';
      params.push(size, offset);
    } else {
      queryText += ' ORDER BY o.fecha DESC LIMIT $1 OFFSET $2';
      params.push(size, offset);
    }

    const { rows } = await db.query(queryText, params);
    
    const totalElements = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    const totalPages = Math.ceil(totalElements / size);

    const content = rows.map(formatOrdenRow);

    return res.json({
      content,
      totalPages,
      totalElements
    });
  } catch (err) {
    console.error("Error al obtener órdenes:", err.message);
    return res.status(500).json({ message: 'Error al consultar órdenes de trabajo.' });
  }
});

// GET /api/ordenes/:id (Detalle completo de orden + items)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener los datos generales de la orden
    const ordenRes = await db.query(`
      SELECT o.*,
             v.placa AS vehiculo_placa,
             v.marca AS vehiculo_marca,
             v.modelo AS vehiculo_modelo,
             v.anio AS vehiculo_anio,
             v.color AS vehiculo_color,
             v.kilometraje AS vehiculo_kilometraje,
             v.cliente_id AS vehiculo_cliente_id,
             c.nombre AS cliente_nombre,
             c.apellido AS cliente_apellido,
             c.cedula AS cliente_cedula,
             c.email AS cliente_email,
             c.telefono AS cliente_telefono
      FROM ordenes o
      LEFT JOIN vehiculos v ON o.vehiculo_id = v.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE o.id = $1
    `, [id]);

    if (ordenRes.rows.length === 0) {
      return res.status(404).json({ message: 'Orden de trabajo no encontrada.' });
    }

    const orden = formatOrdenRow(ordenRes.rows[0]);

    // 2. Obtener los ítems asociados a la orden
    const itemsRes = await db.query(`
      SELECT oi.*,
             s.nombre AS servicio_nombre,
             s.descripcion AS servicio_descripcion,
             s.precio AS servicio_precio,
             r.nombre AS repuesto_nombre,
             r.referencia AS repuesto_referencia,
             r.precio AS repuesto_precio
      FROM orden_items oi
      LEFT JOIN servicios s ON oi.servicio_id = s.id
      LEFT JOIN repuestos r ON oi.repuesto_id = r.id
      WHERE oi.orden_id = $1
      ORDER BY oi.id ASC
    `, [id]);

    const items = itemsRes.rows.map(row => {
      const {
        servicio_nombre,
        servicio_descripcion,
        servicio_precio,
        repuesto_nombre,
        repuesto_referencia,
        repuesto_precio,
        ...itemData
      } = row;

      return {
        ...itemData,
        servicios: itemData.servicio_id ? {
          id: itemData.servicio_id,
          nombre: servicio_nombre,
          descripcion: servicio_descripcion,
          precio: servicio_precio
        } : null,
        repuestos: itemData.repuesto_id ? {
          id: itemData.repuesto_id,
          nombre: repuesto_nombre,
          referencia: repuesto_referencia,
          precio: repuesto_precio
        } : null
      };
    });

    // Añadimos tanto 'items' como 'orden_items' para prevenir fallos en el frontend
    orden.items = items;
    orden.orden_items = items;

    return res.json(orden);
  } catch (err) {
    console.error(`Error al obtener orden ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al buscar el detalle de la orden.' });
  }
});

// POST /api/ordenes (Crear nueva orden)
router.post('/', async (req, res) => {
  const { vehiculo_id, observaciones } = req.body;

  if (!vehiculo_id || !observaciones) {
    return res.status(400).json({ message: 'El vehículo y las observaciones son requeridos.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO ordenes (vehiculo_id, observaciones, estado, fecha, total) 
       VALUES ($1, $2, 'RECIBIDO', CURRENT_TIMESTAMP, 0.00) RETURNING *`,
      [vehiculo_id, observaciones]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error al crear orden:", err.message);
    return res.status(500).json({ message: 'Error al registrar la orden de trabajo.' });
  }
});

// PUT /api/ordenes/:id/estado (Actualizar estado de la orden)
router.put('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ message: 'El estado es requerido.' });
  }

  const estadosValidos = ['RECIBIDO', 'EN_PROCESO', 'TERMINADO', 'ENTREGADO'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  try {
    const { rows } = await db.query(
      'UPDATE ordenes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Orden de trabajo no encontrada.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(`Error al actualizar estado de orden ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al actualizar el estado.' });
  }
});

// DELETE /api/ordenes/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Primero eliminamos los items asociados por integridad referencial si es necesario, 
    // o dejamos que lo maneje el DELETE.
    await db.query('DELETE FROM orden_items WHERE orden_id = $1', [id]);
    const { rowCount } = await db.query('DELETE FROM ordenes WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Orden de trabajo no encontrada.' });
    }
    return res.json({ message: 'Orden eliminada correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar orden ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al eliminar la orden.' });
  }
});

// Helper interno para actualizar el total de una orden
async function recalcularTotalOrden(ordenId) {
  const { rows } = await db.query(
    'SELECT SUM(subtotal) AS total FROM orden_items WHERE orden_id = $1',
    [ordenId]
  );
  const total = rows[0].total ? parseFloat(rows[0].total) : 0.00;
  await db.query('UPDATE ordenes SET total = $1 WHERE id = $2', [total, ordenId]);
}

// POST /api/ordenes/:id/items (Agregar ítem a orden)
router.post('/:id/items', async (req, res) => {
  const { id: ordenId } = req.params;
  const { cantidad, subtotal, servicio_id, repuesto_id } = req.body;

  if (cantidad === undefined || subtotal === undefined) {
    return res.status(400).json({ message: 'Cantidad y subtotal son requeridos.' });
  }

  try {
    // Inserción en orden_items
    const { rows } = await db.query(
      `INSERT INTO orden_items (orden_id, cantidad, subtotal, servicio_id, repuesto_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ordenId, parseInt(cantidad), parseFloat(subtotal), servicio_id || null, repuesto_id || null]
    );

    // Actualizamos el total general de la orden
    await recalcularTotalOrden(ordenId);

    // Si se agrega un repuesto, descontamos el stock del repuesto
    if (repuesto_id) {
      await db.query(
        'UPDATE repuestos SET stock = GREATEST(0, stock - $1) WHERE id = $2',
        [parseInt(cantidad), repuesto_id]
      );
    }

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(`Error al agregar ítem a orden ${ordenId}:`, err.message);
    return res.status(500).json({ message: 'Error al agregar el ítem a la orden.' });
  }
});

// DELETE /api/ordenes/:id/items/:itemId (Eliminar ítem de orden)
router.delete('/:id/items/:itemId', async (req, res) => {
  const { id: ordenId, itemId } = req.params;

  try {
    // Obtenemos los detalles del ítem antes de borrarlo por si era un repuesto (para devolver stock)
    const itemRes = await db.query(
      'SELECT cantidad, repuesto_id FROM orden_items WHERE id = $1 AND orden_id = $2',
      [itemId, ordenId]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ message: 'Ítem no encontrado.' });
    }

    const { cantidad, repuesto_id } = itemRes.rows[0];

    // Eliminación
    await db.query('DELETE FROM orden_items WHERE id = $1 AND orden_id = $2', [itemId, ordenId]);

    // Recalcular total de la orden
    await recalcularTotalOrden(ordenId);

    // Si era un repuesto, devolvemos el stock
    if (repuesto_id) {
      await db.query(
        'UPDATE repuestos SET stock = stock + $1 WHERE id = $2',
        [parseInt(cantidad), repuesto_id]
      );
    }

    return res.json({ message: 'Ítem eliminado de la orden correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar ítem ${itemId} de orden ${ordenId}:`, err.message);
    return res.status(500).json({ message: 'Error al eliminar el ítem de la orden.' });
  }
});

module.exports = router;
