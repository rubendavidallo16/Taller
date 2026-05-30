const express = require('express');
const router = express.Router();
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdmin);

// Inicializar cliente administrativo de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn("ADVERTENCIA: Falta SUPABASE_SERVICE_ROLE_KEY. La administración de usuarios (Crear, Editar, Eliminar) no funcionará completamente en Supabase Auth.");
}

// GET /api/usuarios (Administrar usuarios, solo administradores)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const offset = page * size;

  try {
    const { rows } = await db.query(
      'SELECT *, COUNT(*) OVER() AS full_count FROM usuarios ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [size, offset]
    );

    const totalElements = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    const totalPages = Math.ceil(totalElements / size);

    const content = rows.map(row => {
      const { full_count, ...cleanRow } = row;
      return { ...cleanRow, rol: row.role };
    });

    return res.json({
      content,
      totalPages,
      totalElements
    });
  } catch (err) {
    console.error("Error al obtener usuarios:", err.message);
    return res.status(500).json({ message: 'Error al consultar la tabla usuarios.' });
  }
});

// POST /api/usuarios (Crear nuevo usuario por Administrador)
router.post('/', async (req, res) => {
  const { nombre, apellido, email, rol, estado, password } = req.body;

  if (!nombre || !apellido || !email || !rol || !estado || !password) {
    return res.status(400).json({ message: 'Todos los campos son requeridos, incluyendo contraseña.' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ message: 'El servidor no está configurado con la clave de administración (Service Role Key).' });
  }

  try {
    // 1. Crear el usuario en Supabase Auth usando el cliente administrativo
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        role: rol
      }
    });

    if (authError) {
      return res.status(400).json({ message: `Error en Supabase Auth: ${authError.message}` });
    }

    const userId = authUser.user.id;

    // 2. Insertar o actualizar en la tabla public.usuarios (para prever si hay trigger o no)
    const { rows } = await db.query(
      `INSERT INTO usuarios (id, email, nombre, apellido, role, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE 
       SET email = $2, nombre = $3, apellido = $4, role = $5
       RETURNING *`,
      [userId, email, nombre, apellido, rol]
    );

    const savedUser = rows[0] ? { ...rows[0], rol: rows[0].role } : { id: userId, email, nombre, apellido, rol, estado };
    return res.status(201).json(savedUser);
  } catch (err) {
    console.error("Error al crear usuario:", err.message);
    return res.status(500).json({ message: 'Error interno al registrar el usuario.' });
  }
});

// PUT /api/usuarios/:id (Editar usuario existente por Administrador)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, rol, estado, password } = req.body;

  if (!nombre || !apellido || !email || !rol || !estado) {
    return res.status(400).json({ message: 'Campos requeridos incompletos.' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ message: 'El servidor no está configurado con la clave de administración.' });
  }

  try {
    // 1. Actualizar datos en Supabase Auth
    const updatePayload = {
      email,
      user_metadata: {
        nombre,
        apellido,
        role: rol
      }
    };
    if (password) {
      updatePayload.password = password;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
    if (authError) {
      return res.status(400).json({ message: `Error en Supabase Auth: ${authError.message}` });
    }

    // 2. Actualizar datos en la tabla public.usuarios
    const { rows } = await db.query(
      `UPDATE usuarios 
       SET email = $1, nombre = $2, apellido = $3, role = $4 
       WHERE id = $5 RETURNING *`,
      [email, nombre, apellido, rol, id]
    );

    if (rows.length === 0) {
      // Si por alguna razón el perfil no existía en public.usuarios, lo insertamos
      const insertRes = await db.query(
        `INSERT INTO usuarios (id, email, nombre, apellido, role, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
        [id, email, nombre, apellido, rol]
      );
      return res.json({ ...insertRes.rows[0], rol: insertRes.rows[0].role });
    }

    return res.json({ ...rows[0], rol: rows[0].role });
  } catch (err) {
    console.error(`Error al actualizar usuario ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al actualizar el usuario.' });
  }
});

// DELETE /api/usuarios/:id (Eliminar usuario)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ message: 'El servidor no está configurado con la clave de administración.' });
  }

  try {
    // 1. Eliminar usuario de Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    // Ignoramos error 404 de Supabase si el usuario ya no existía en Auth
    if (authError && authError.status !== 404) {
      return res.status(400).json({ message: `Error en Supabase Auth: ${authError.message}` });
    }

    // 2. Eliminar de la tabla public.usuarios
    const { rowCount } = await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      console.log(`Usuario ${id} no encontrado en tabla usuarios, pero removido de Auth.`);
    }

    return res.json({ message: 'Usuario eliminado correctamente.' });
  } catch (err) {
    console.error(`Error al eliminar usuario ${id}:`, err.message);
    return res.status(500).json({ message: 'Error al eliminar el usuario.' });
  }
});

module.exports = router;
