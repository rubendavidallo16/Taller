window.Utils = {}

Utils.showToast = function(message, type = 'success') {
  // type: 'success' | 'error' | 'warning'
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.style.cssText = `
      position:fixed; bottom:1.5rem; right:1.5rem;
      display:flex; flex-direction:column; gap:0.5rem; z-index:9999;
    `
    document.body.appendChild(container)
  }

  const colors = {
    success: { bg:'#14532D', border:'#16A34A', text:'#86EFAC' },
    error:   { bg:'#450A0A', border:'#DC2626', text:'#FCA5A5' },
    warning: { bg:'#431407', border:'#D97706', text:'#FCD34D' }
  }
  const c = colors[type] || colors.success

  const toast = document.createElement('div')
  toast.style.cssText = `
    padding:0.875rem 1.25rem;
    background:${c.bg};
    border-left:4px solid ${c.border};
    color:${c.text};
    font-size:0.8rem;
    font-weight:600;
    font-family:Inter,sans-serif;
    letter-spacing:0.05em;
    min-width:280px;
    animation:slideInToast 0.2s ease;
  `
  toast.textContent = message

  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style')
    style.id = 'toast-keyframes'
    style.textContent = `
      @keyframes slideInToast {
        from { transform:translateX(110%); opacity:0; }
        to   { transform:translateX(0);   opacity:1; }
      }
    `
    document.head.appendChild(style)
  }

  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

Utils.showConfirm = function(message, onConfirm) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,0.75);
    display:flex; align-items:center; justify-content:center;
    z-index:9998;
  `
  overlay.innerHTML = `
    <div style="
      background:#1C1C1E;
      border:1px solid #3A3A3A;
      padding:2rem;
      max-width:400px; width:90%;
      font-family:Inter,sans-serif;
    ">
      <p style="color:#fff;font-size:0.95rem;margin-bottom:1.5rem;
                line-height:1.5;">${message}</p>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button id="confirm-cancel" style="
          background:transparent;border:1px solid #3A3A3A;
          color:#A1A1AA;padding:0.5rem 1.25rem;
          font-size:0.8rem;font-weight:600;
          letter-spacing:0.06em;cursor:pointer;
        ">CANCELAR</button>
        <button id="confirm-ok" style="
          background:#DC2626;border:none;color:#fff;
          padding:0.5rem 1.25rem;font-size:0.8rem;
          font-weight:600;letter-spacing:0.06em;cursor:pointer;
        ">CONFIRMAR</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove()
  overlay.querySelector('#confirm-ok').onclick = () => {
    overlay.remove()
    onConfirm()
  }
}

Utils.formatCurrency = (amount) =>
  '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

Utils.formatDate = (dateString) => {
  const d = new Date(dateString)
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
}

Utils.getStatusColor = (estado) => ({
  'RECIBIDO':   { dot:'#6B7280', text:'#9CA3AF' },
  'EN_PROCESO': { dot:'#D97706', text:'#FCD34D' },
  'TERMINADO':  { dot:'#16A34A', text:'#86EFAC' },
  'ENTREGADO':  { dot:'#2563EB', text:'#93C5FD' }
}[estado] || { dot:'#6B7280', text:'#9CA3AF' })

Utils.debounce = (fn, delay) => {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}
