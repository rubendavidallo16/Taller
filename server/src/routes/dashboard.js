const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdminOrMecanico } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdminOrMecanico);

// GET /api/dashboard/stats (Estadísticas generales)
router.get('/stats', async (req, res) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  try {
    const [statsRes, ingresosRes] = await Promise.all([
      db.query(`
        SELECT 
          (SELECT COUNT(*) FROM ordenes WHERE estado IN ('RECIBIDO', 'EN_PROCESO')) AS ordenes_activas,
          (SELECT COUNT(*) FROM vehiculos) AS vehiculos_taller,
          (SELECT COUNT(*) FROM clientes) AS clientes_registrados
      `),
      db.query(`
        SELECT SUM(oi.subtotal) AS ingresos
        FROM orden_items oi
        INNER JOIN ordenes o ON oi.orden_id = o.id
        WHERE o.fecha >= $1
      `, [firstDayOfMonth])
    ]);

    const stats = statsRes.rows[0];
    const ingresos = parseFloat(ingresosRes.rows[0].ingresos) || 0.00;

    return res.json({
      ordenesActivas: parseInt(stats.ordenes_activas) || 0,
      vehiculosEnTaller: parseInt(stats.vehiculos_taller) || 0,
      clientesRegistrados: parseInt(stats.clientes_registrados) || 0,
      ingresosDelMes: ingresos
    });
  } catch (err) {
    console.error("Error al obtener estadísticas del dashboard:", err.message);
    return res.status(500).json({ message: 'Error al calcular estadísticas.' });
  }
});

// GET /api/dashboard/recent-ordenes (Últimas 5 órdenes de trabajo)
router.get('/recent-ordenes', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT o.*,
             v.marca AS vehiculo_marca,
             v.modelo AS vehiculo_modelo,
             c.nombre AS cliente_nombre,
             c.apellido AS cliente_apellido
      FROM ordenes o
      LEFT JOIN vehiculos v ON o.vehiculo_id = v.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY o.fecha DESC
      LIMIT 5
    `);

    const formattedRows = rows.map(row => {
      const {
        vehiculo_marca,
        vehiculo_modelo,
        cliente_nombre,
        cliente_apellido,
        ...ordenData
      } = row;

      return {
        ...ordenData,
        vehiculos: {
          marca: vehiculo_marca,
          modelo: vehiculo_modelo,
          clientes: {
            nombre: cliente_nombre,
            apellido: cliente_apellido
          }
        }
      };
    });

    return res.json(formattedRows);
  } catch (err) {
    console.error("Error al obtener órdenes recientes:", err.message);
    return res.status(500).json({ message: 'Error al consultar órdenes recientes.' });
  }
});

module.exports = router;
