let recaptchaToken = null;
let widgetId = null;

window.onRecaptchaReady = function() {
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

// Ejecución inmediata con IIFE
(function() {
  if (window.Auth && Auth.isAuthenticated()) {
    window.location.replace('/pages/dashboard.html');
  }

  const form = document.querySelector('form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

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

  // Div de error general
  const errorDiv = document.createElement('p');
  errorDiv.id = 'login-error';
  errorDiv.style.cssText = `
    display:none; margin-top:0.5rem; margin-bottom: 1rem;
    font-size:0.75rem; color:#FCA5A5;
    font-family:Inter,sans-serif; font-weight:500;
  `;
  form.insertBefore(errorDiv, submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const errEl = document.getElementById('login-error');
    const capErr = document.getElementById('recaptcha-error');

    errEl.style.display = 'none';
    capErr.style.display = 'none';

    if (!email || !password) {
      errEl.textContent = 'Completa todos los campos.';
      errEl.style.display = 'block';
      return;
    }

    if (!recaptchaToken) {
      capErr.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span style="font-family:Inter,sans-serif">AUTENTICANDO...</span>';

    try {
      if (!window.supabaseClient) throw new Error('Supabase no inicializado.');
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: recaptchaToken
        }
      });

      if (error) throw new Error(error.message);

      // Adaptación al sistema antiguo de sesión para no romper otras partes
      const metadata = data.user.user_metadata || {};
      Auth.saveSession(data.session.access_token, {
        id: data.user.id,
        email: data.user.email,
        role: metadata.role || 'USER',
        nombre: metadata.nombre || '',
        apellido: metadata.apellido || ''
      });
      
      window.location.replace('/pages/dashboard.html');
    } catch (err) {
      errEl.textContent = err.message || 'Error al iniciar sesión.';
      errEl.style.display = 'block';
      recaptchaToken = null;
      if (widgetId !== null && window.grecaptcha) grecaptcha.reset(widgetId);
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.innerHTML = originalHTML;
    }
  });
})();

