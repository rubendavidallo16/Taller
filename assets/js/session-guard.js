let warningShown = false
let guardInterval = null

function startSessionTimer() {
  const tick = () => {
    const remaining = Auth.getTokenRemainingMs()
    if (remaining <= 0) {
      clearInterval(guardInterval)
      Auth.logout()
    }
    if (remaining <= 5 * 60 * 1000 && !warningShown) {
      warningShown = true
      showExpiryWarning()
    }
  }
  guardInterval = setInterval(tick, 30000)
  tick()
}

function showExpiryWarning() {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);
    display:flex;align-items:center;justify-content:center;z-index:9997;
  `
  overlay.innerHTML = `
    <div style="background:#1C1C1E;border:1px solid #3A3A3A;
                padding:2rem;max-width:400px;width:90%;
                font-family:Inter,sans-serif;text-align:center;">
      <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
      <h3 style="color:#fff;font-size:1rem;font-weight:700;
                 font-family:'Space Grotesk',sans-serif;
                 margin-bottom:0.5rem;">SESIÓN POR EXPIRAR</h3>
      <p style="color:#A1A1AA;font-size:0.8rem;margin-bottom:1.5rem;
                line-height:1.5;">
        Tu sesión expira en menos de 5 minutos.<br/>
        Guarda tu trabajo para evitar perder cambios.
      </p>
      <div style="display:flex;gap:0.75rem;justify-content:center;">
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="background:transparent;border:1px solid #3A3A3A;
                 color:#A1A1AA;padding:0.5rem 1.25rem;
                 font-size:0.8rem;font-weight:600;cursor:pointer;">
          ENTENDIDO
        </button>
        <button onclick="Auth.logout()"
          style="background:#DC2626;border:none;color:#fff;
                 padding:0.5rem 1.25rem;font-size:0.8rem;
                 font-weight:600;cursor:pointer;">
          CERRAR SESIÓN
        </button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
}

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isAuthenticated()) startSessionTimer()
})

window.SessionGuard = { startSessionTimer }
