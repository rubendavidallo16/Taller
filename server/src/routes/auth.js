const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Inicializamos el cliente de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERROR: Falta configuración de Supabase URL o Anon Key en el archivo .env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función para verificar el captcha de Cloudflare Turnstile
async function verifyTurnstile(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  
  // Si no hay llave secreta de Turnstile o si es la clave de prueba siempre exitosa de Cloudflare
  if (!secret || secret === '1x0000000000000000000000000000000AA') {
    return true;
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: secret,
        response: token
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.success;
  } catch (error) {
    console.error("Error al verificar Turnstile:", error.message);
    return false;
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, captchaToken } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'El email y la contraseña son requeridos.' });
  }

  // Verificar Turnstile
  if (captchaToken) {
    const isValidCaptcha = await verifyTurnstile(captchaToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'Verificación de seguridad inválida.' });
    }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const metadata = data.user.user_metadata || {};

    return res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        nombre: metadata.nombre || '',
        apellido: metadata.apellido || '',
        role: metadata.role || 'USER'
      }
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ message: 'Error interno en el servidor durante el inicio de sesión.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, nombre, apellido, captchaToken } = req.body;

  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  // Verificar Turnstile
  if (captchaToken) {
    const isValidCaptcha = await verifyTurnstile(captchaToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'Verificación de seguridad inválida.' });
    }
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          apellido,
          role: 'USER' // Rol por defecto
        }
      }
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return res.status(400).json({ message: 'Este correo ya está registrado.' });
    }

    return res.status(201).json({
      message: '¡Registro exitoso!',
      user: {
        id: data.user.id,
        email: data.user.email,
        nombre: nombre,
        apellido: apellido
      }
    });
  } catch (err) {
    console.error("Error en registro:", err);
    return res.status(500).json({ message: 'Error interno en el servidor durante el registro.' });
  }
});

module.exports = router;
