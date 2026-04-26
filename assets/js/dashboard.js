document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  setupNavLinks();

  try {
    await loadStats();
    await loadRecentOrdenes();
  } catch(e) {
    Utils.showToast('Error al cargar el dashboard', 'error');
  }
});

function setupNavLinks() {
  const links = document.querySelectorAll('aside a');
  const navMap = {
    'DASHBOARD': '/pages/dashboard.html',
    'CLIENTES': '/pages/clientes.html',
    'VEHÍCULOS': '/pages/vehiculos.html',
    'ÓRDENES DE TRABAJO': '/pages/ordenes.html',
    'SERVICIOS': '/pages/servicios.html',
    'REPUESTOS': '/pages/repuestos.html',
    'USUARIOS': '/pages/usuarios.html'
  };

  links.forEach(a => {
    const text = a.textContent.trim().toUpperCase();
    if (navMap[text]) {
      a.href = navMap[text];
    } else if (text === 'LOGOUT') {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  });
}

async function loadStats() {
  try {
    const stats = await API.getDashboardStats();
    if (!stats) return;

    // Buscar las 4 tarjetas de estadísticas dinámicamente
    const statCards = document.querySelectorAll('.grid > div');
    if (statCards.length < 4) return;

    // Actualizamos basándonos en el orden de las tarjetas HTML
    updateStatCard(statCards[0], stats.ordenesActivas || 0);
    updateStatCard(statCards[1], stats.vehiculosEnTaller || 0);
    updateStatCard(statCards[2], stats.clientesRegistrados || 0);
    
    if (stats.ingresosDelMes != null) {
      updateStatCard(statCards[3], Utils.formatCurrency(stats.ingresosDelMes));
    }
  } catch (e) {
    console.warn('Usando valores estáticos: la API falló al cargar stats', e);
  }
}

function updateStatCard(cardEl, value) {
  if (!cardEl) return;
  const valueEl = cardEl.querySelector('.text-5xl, .text-4xl');
  if (valueEl) {
    valueEl.textContent = value;
  }
}

async function loadRecentOrdenes() {
  try {
    const data = await API.getRecentOrdenes();
    if (!data || !data.content) return;

    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    // Limpiar las filas estáticas existentes
    tbody.innerHTML = '';

    data.content.forEach(orden => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-outline-variant/15 hover:bg-surface-container-high/50 transition-colors group';

      const status = Utils.getStatusColor(orden.estado);
      const isPulse = orden.estado === 'EN_PROCESO' ? 'animate-pulse' : '';
      
      const cNombre = orden.cliente ? `${orden.cliente.nombre || ''} ${orden.cliente.apellido || ''}`.trim() : 'N/A';
      const vNombre = orden.vehiculo ? `${orden.vehiculo.marca || ''} ${orden.vehiculo.modelo || ''}`.trim() : 'N/A';
      const fecha = orden.fechaRecepcion ? Utils.formatDate(orden.fechaRecepcion) : 'N/A';

      tr.innerHTML = `
        <td class="p-4 font-headline text-sm font-bold text-neutral-400">#WO-${orden.id || '-'}</td>
        <td class="p-4 font-body text-sm text-on-surface">${cNombre}</td>
        <td class="p-4 font-body text-sm text-neutral-400">${vNombre}</td>
        <td class="p-4">
          <span class="inline-flex items-center gap-2 px-3 py-1 font-label text-xs uppercase tracking-widest font-bold" 
                style="color: ${status.text}; background: ${status.dot}33; border: 1px solid ${status.dot}80;">
            <span class="w-1.5 h-1.5 rounded-full ${isPulse}" style="background: ${status.dot}"></span>
            ${orden.estado}
          </span>
        </td>
        <td class="p-4 font-label text-sm text-neutral-500 text-right tracking-wider">${fecha}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.warn('Usando filas estáticas: la API falló al cargar órdenes recientes', e);
  }
}
