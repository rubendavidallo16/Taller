let recaptchaToken = null;
let widgetId = null;

window.onRecaptchaReady = function () {
  if (!document.getElementById('recaptcha-login')) {
    // Si el DOM aun no ha inyectado el div, esperamos 50ms
    setTimeout(window.onRecaptchaReady, 50);
    return;
  }
  try {
    widgetId = grecaptcha.render('recaptcha-login', {
      sitekey: window.CONFIG ? CONFIG.RECAPTCHA_SITE_KEY : '',
      theme: 'dark',
      callback: (token) => {
        recaptchaToken = token;
        const capErr = document.getElementById('recaptcha-error');
        if (capErr) capErr.style.display = 'none';
      },
      'expired-callback': () => {
        recaptchaToken = null;
      }
    });
  } catch (e) {
    console.warn("reCAPTCHA render error:", e);
  }
};

function initRegistro() {
  console.log("initRegistro iniciado");
  if (window.Auth && Auth.isAuthenticated()) {
    window.location.replace('/pages/dashboard.html');
  }

  const form = document.getElementById('formRegistro') || document.querySelector('form');
  if (!form) {
    console.error("No se encontró el formulario de registro.");
    return;
  }

  const submitBtn = document.getElementById('btnRegistrar') || form.querySelector('button');

  // Crear div para mostrar errores
  const errorDiv = document.createElement('p');
  errorDiv.id = 'registro-error';
  errorDiv.style.cssText = `
    display:none; margin-top:0.5rem; margin-bottom: 1rem;
    font-size:0.75rem; color:#FCA5A5;
    font-family:Inter,sans-serif; font-weight:500; text-align: center;
  `;
  submitBtn.parentNode.insertBefore(errorDiv, submitBtn);

  // Crear div para indicar éxito
  const successDiv = document.createElement('p');
  successDiv.id = 'registro-success';
  successDiv.style.cssText = `
    display:none; margin-top:0.5rem; margin-bottom: 1rem;
    font-size:0.75rem; color:#86efac;
    font-family:Inter,sans-serif; font-weight:500; text-align: center;
  `;
  submitBtn.parentNode.insertBefore(successDiv, submitBtn);

  // Contenedor reCAPTCHA
  const recaptchaWrapper = document.createElement('div');
  recaptchaWrapper.style.cssText = 'margin-bottom:1rem;';
  recaptchaWrapper.innerHTML = `
    <div id="recaptcha-login"></div>
    <p id="recaptcha-error" style="
      display:none; margin-top:0.4rem;
      font-size:0.72rem; color:#FCA5A5;
      font-family:Inter,sans-serif; font-weight:500;
    ">⚠ Completa la verificación de seguridad para continuar</p>
  `;
  form.insertBefore(recaptchaWrapper, submitBtn);


  console.log("submitBtn seleccionado:", submitBtn);
  if (!submitBtn) {
    console.error("submitBtn es null!");
  }

  submitBtn.addEventListener('click', async (e) => {
    console.log("Botón de registro clickeado!");
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!nombre || !apellido || !email || !password || !confirmPassword) {
      errorDiv.textContent = 'Por favor, completa todos los campos.';
      errorDiv.style.display = 'block';
      return;
    }

    if (password !== confirmPassword) {
      errorDiv.textContent = 'Las contraseñas no coinciden.';
      errorDiv.style.display = 'block';
      return;
    }

    if (password.length < 6) {
      errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errorDiv.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span style="font-family:Inter,sans-serif">REGISTRANDO...</span>';

    const submitBtn = form.querySelector('button[type="submit"]');

    try {
      if (!window.supabaseClient) throw new Error('Supabase no inicializado.');

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre,
            apellido: apellido,
            role: 'USER' // Rol por defecto
          }
        }
      });

      if (error) throw new Error(error.message);

      // Algunos proveedores requieren verificación de correo:
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('Este correo ya está registrado.');
      }

      successDiv.textContent = '¡Registro exitoso! Ya puedes iniciar sesión.';
      successDiv.style.display = 'block';
      form.reset();

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 2000);

    } catch (err) {
      errorDiv.textContent = err.message || 'Error al crear la cuenta.';
      errorDiv.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.innerHTML = originalHTML;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegistro);
} else {
  initRegistro();
}

