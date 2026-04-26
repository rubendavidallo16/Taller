/* =============================================================
   PADDOCK CMS — recaptcha.js
   Módulo para inicializar y validar Google reCAPTCHA v2.
   Depende de config.js (window.CONFIG) y del script externo de Google.
   ============================================================= */

(function () {
  'use strict';

  /* -----------------------------------------------------------
     ESTADO LOCAL
     ----------------------------------------------------------- */
  let widgetId = null;
  let recaptchaReady = false;
  let recaptchaToken = null;

  /* -----------------------------------------------------------
     1. initRecaptcha(containerId, onSuccess, onExpired)
        Renderiza el widget dentro del elemento especificado.
     ----------------------------------------------------------- */
  function initRecaptcha(containerId, onSuccess, onExpired) {
    if (typeof grecaptcha === 'undefined') {
      console.error('El script de reCAPTCHA de Google no ha cargado.');
      return;
    }

    // Renderizar
    widgetId = grecaptcha.render(containerId, {
      'sitekey': CONFIG.RECAPTCHA_SITE_KEY,
      'theme': 'dark', // PADDOCK CMS usa principalmente dark mode
      'callback': (token) => {
        recaptchaToken = token;
        if (onSuccess) onSuccess(token);
      },
      'expired-callback': () => {
        recaptchaToken = null;
        if (onExpired) onExpired();
      },
      'error-callback': () => {
        recaptchaToken = null;
        console.error('Error interno de reCAPTCHA.');
      }
    });

    recaptchaReady = true;
  }

  /* -----------------------------------------------------------
     2. getToken()
        Retorna el string del token obtenido, o null si expiró/falta.
     ----------------------------------------------------------- */
  function getToken() {
    return recaptchaToken;
  }

  /* -----------------------------------------------------------
     3. isCompleted()
        Retorna true si reCAPTCHA resolvió el desafío.
     ----------------------------------------------------------- */
  function isCompleted() {
    return recaptchaToken !== null;
  }

  /* -----------------------------------------------------------
     4. resetRecaptcha()
        Reinicia el desafío para un nuevo intento/login.
     ----------------------------------------------------------- */
  function resetRecaptcha() {
    if (widgetId !== null && typeof grecaptcha !== 'undefined') {
      grecaptcha.reset(widgetId);
    }
    recaptchaToken = null;
  }

  /* -----------------------------------------------------------
     5. getRecaptchaScriptTag()
        Informativo: retorna la etiqueta para inyectar a HTML.
     ----------------------------------------------------------- */
  function getRecaptchaScriptTag() {
    return '<script src="https://www.google.com/recaptcha/api.js" async defer></script>';
  }

  /* -----------------------------------------------------------
     Exportación global
     ----------------------------------------------------------- */
  window.Recaptcha = {
    initRecaptcha,
    getToken,
    isCompleted,
    resetRecaptcha,
    getRecaptchaScriptTag // Opcional, pero se mantiene según requerimiento
  };
})();
