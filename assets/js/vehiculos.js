let currentPage = 0;
const PAGE_SIZE = 10;
let editingId = null;

const COLOR_MAP = {
  ROJO: '#DC2626',
  AZUL: '#2563EB',
  VERDE: '#16A34A',
  AMARILLO: '#D97706',
  NEGRO: '#111',
  BLANCO: '#F5F5F5',
  PLATA: '#9CA3AF',
  GRIS: '#6B7280'
};

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  setupNavLinks();
  injectModal();
  injectPagination();
  setupEventListeners();
  await loadVehiculos();
});

function setupNavLinks() {
  const links = document.querySelectorAll('nav a');
  const navMap = {
    'DASHBOARD': '/pages/dashboard.html',
    'CLIENTES': '/pages/clientes.html',
    'VEHÍCULOS': '/pages/vehiculos.html',
    'VEHICLES': '/pages/vehiculos.html',
    'ÓRDENES DE TRABAJO': '/pages/ordenes.html',
    'SERVICIOS': '/pages/servicios.html',
    'REPUESTOS': '/pages/repuestos.html',
    'USUARIOS': '/pages/usuarios.html'
  };

  links.forEach(a => {
    const text = a.textContent.trim().toUpperCase();
    if (text.includes('LOGOUT')) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    } else {
      for (const [key, path] of Object.entries(navMap)) {
        if (text.includes(key)) {
          a.href = path;
          break;
        }
      }
    }
  });
}

function injectModal() {
  const div = document.createElement('div');
  div.id = 'modal-overlay';
  div.style.cssText = `
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,0.75);
    align-items:center; justify-content:center; z-index:1000;
  `;
  div.innerHTML = `
    <div style="
      background:#1C1C1E; border:1px solid #3A3A3A;
      padding:2rem; width:500px; max-width:90vw;
      font-family:Inter,sans-serif;
    ">
      <div style="display:flex;justify-content:space-between;
                  align-items:center;margin-bottom:1.5rem;">
        <h3 id="modal-title" style="
          font-size:1.1rem;font-weight:700;color:#fff;
          border-left:3px solid #DC2626;padding-left:0.75rem;
          font-family:'Space Grotesk',sans-serif;
          letter-spacing:-0.02em;
        "></h3>
        <button type="button" id="modal-close" style="
          background:none;border:none;color:#6B7280;
          cursor:pointer;font-size:1.25rem;
        ">✕</button>
      </div>
      <form id="form-vehiculo" style="display:flex;flex-direction:column;gap:1rem;">
        <input type="hidden" id="vehiculo-id"/>
        
        <div style="display:flex;gap:1rem;">
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Placa</label>
            <input id="field-placa" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Marca</label>
            <input id="field-marca" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"/>
          </div>
        </div>

        <div style="display:flex;gap:1rem;">
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Modelo</label>
            <input id="field-modelo" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Año</label>
            <input id="field-anio" type="number" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"/>
          </div>
        </div>

        <div style="display:flex;gap:1rem;">
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Color</label>
            <input id="field-color" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Kilometraje</label>
            <input id="field-kilometraje" type="number" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"/>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;letter-spacing:0.08em;text-transform:uppercase;">Cliente Asignado</label>
          <select id="field-cliente" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem 0.875rem;font-size:0.875rem;width:100%;outline:none;"></select>
        </div>

        <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
          <button type="button" id="btn-cancelar" style="background:transparent;border:1px solid #3A3A3A;color:#A1A1AA;padding:0.6rem 1.25rem;font-size:0.8rem;font-weight:600;cursor:pointer;">CANCELAR</button>
          <button type="submit" style="background:#DC2626;border:none;color:#fff;padding:0.6rem 1.25rem;font-size:0.8rem;font-weight:600;cursor:pointer;">GUARDAR</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(div);
  
  // Convertir placa a mayúsculas automáticamente
  document.getElementById('field-placa').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
  });
}

function injectPagination() {
  const container = document.createElement('div');
  container.id = 'pagination-container';
  container.style.cssText = `
    display: flex; gap: 0.5rem; justify-content: center;
    margin-top: 1rem; padding-bottom: 2rem;
  `;
  const tableWrapper = document.querySelector('.overflow-x-auto');
  if (tableWrapper && tableWrapper.parentNode) {
    const staticPag = tableWrapper.nextElementSibling;
    if (staticPag && staticPag.innerText.includes('MOSTRANDO')) {
      staticPag.style.display = 'none';
      tableWrapper.parentNode.insertBefore(container, staticPag);
    } else {
      tableWrapper.parentNode.appendChild(container);
    }
  }
}

async function loadVehiculos(page = 0, search = '') {
  currentPage = page;
  try {
    let data;
    // Búsqueda real de vehículos cuando la API lo soporte (mock utilizando getVehiculos)
    if (search.trim()) {
      // Como no hay endpoint searchVehiculos definido explícitamente en el HTML, usaremos getVehiculos como base.
      // Se asume soporte en el backend futuro o se adapta.
      data = await API.getVehiculos(page, PAGE_SIZE); 
    } else {
      data = await API.getVehiculos(page, PAGE_SIZE);
    }

    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const content = data.content || [];
    
    content.forEach(veh => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-surface-container-highest hover:bg-surface-container-high/30 transition-colors';
      
      const c = veh.cliente ? `${veh.cliente.nombre || ''} ${veh.cliente.apellido || ''}`.trim() : 'Sin Cliente';
      const colorVal = (veh.color || 'NN').toUpperCase();
      const hex = COLOR_MAP[colorVal] || '#3A3A3A';

      const colorSpan = `
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;background:${hex};border:1px solid #3A3A3A;flex-shrink:0;"></span>
          ${colorVal}
        </span>
      `;

      tr.innerHTML = `
        <td class="px-6 py-5 text-on-surface/50 font-mono text-xs">V-${veh.id}</td>
        <td class="px-6 py-5 font-bold text-white tracking-wider">${veh.placa}</td>
        <td class="px-6 py-5 text-on-surface">${veh.marca}</td>
        <td class="px-6 py-5 text-on-surface">${veh.modelo}</td>
        <td class="px-6 py-5 text-on-surface/70 font-mono">${veh.anio}</td>
        <td class="px-6 py-5 text-on-surface/70 text-xs">${colorSpan}</td>
        <td class="px-6 py-5 text-on-surface">${c}</td>
        <td class="px-6 py-5 text-right">
          <div class="flex items-center justify-end gap-3">
            <button class="text-on-surface/50 hover:text-white transition-colors btn-edit" data-id="${veh.id}" title="Editar">
              <span class="material-symbols-outlined text-[18px] pointer-events-none">edit</span>
            </button>
            <button class="text-on-surface/50 hover:text-primary-container transition-colors btn-delete" data-id="${veh.id}" title="Eliminar">
              <span class="material-symbols-outlined text-[18px] pointer-events-none">delete</span>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPagination(data.totalPages || 1);
  } catch (err) {
    if (typeof Utils !== 'undefined') Utils.showToast(err.message || 'Error al cargar vehículos', 'error');
  }
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination-container');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.style.cssText = `
      padding: 0.5rem 1rem; cursor: pointer;
      background: ${i === currentPage ? '#DC2626' : '#2A2A2A'};
      color: #fff; border: 1px solid #3A3A3A;
      font-size: 0.8rem; font-weight: 600;
    `;
    btn.onclick = () => loadVehiculos(i);
    container.appendChild(btn);
  }
}

function setupEventListeners() {
  const btns = Array.from(document.querySelectorAll('button'));
  const btnNuevo = btns.find(b => b.textContent && b.textContent.includes('NUEVO VEHÍCULO'));
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => openModal('crear'));
  }

  const searchInput = document.querySelector('input[placeholder*="BUSCAR"]');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      loadVehiculos(0, e.target.value);
    }, 400));
  }

  const tbody = document.querySelector('table tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');
      
      if (btnEdit) editVehiculo(btnEdit.getAttribute('data-id'));
      if (btnDelete) deleteVehiculo(btnDelete.getAttribute('data-id'));
    });
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancelar').addEventListener('click', closeModal);
  
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      closeModal();
    }
  });

  document.getElementById('form-vehiculo').addEventListener('submit', handleSubmit);
}

async function openModal(mode, vehiculo = null) {
  try {
    const res = await API.getClientes(0, 100);
    const select = document.getElementById('field-cliente');
    select.innerHTML = (res.content || []).map(c => 
      `<option value="${c.id}">${c.nombre} ${c.apellido}</option>`
    ).join('');
  } catch (err) {
    Utils.showToast('Error al cargar la lista de clientes', 'warning');
  }

  const form = document.getElementById('form-vehiculo');
  form.reset();
  
  const title = document.getElementById('modal-title');
  if (mode === 'crear') {
    title.textContent = 'NUEVO VEHÍCULO';
    editingId = null;
  } else if (mode === 'editar' && vehiculo) {
    title.textContent = 'EDITAR VEHÍCULO';
    editingId = vehiculo.id;
    document.getElementById('field-placa').value = vehiculo.placa || '';
    document.getElementById('field-marca').value = vehiculo.marca || '';
    document.getElementById('field-modelo').value = vehiculo.modelo || '';
    document.getElementById('field-anio').value = vehiculo.anio || '';
    document.getElementById('field-color').value = vehiculo.color || '';
    document.getElementById('field-kilometraje').value = vehiculo.kilometraje || '';
    if (vehiculo.cliente && vehiculo.cliente.id) {
      document.getElementById('field-cliente').value = vehiculo.cliente.id;
    }
  }
  
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('form-vehiculo').reset();
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const data = {
    placa: document.getElementById('field-placa').value.toUpperCase(),
    marca: document.getElementById('field-marca').value,
    modelo: document.getElementById('field-modelo').value,
    anio: parseInt(document.getElementById('field-anio').value, 10),
    color: document.getElementById('field-color').value,
    kilometraje: parseInt(document.getElementById('field-kilometraje').value, 10),
    cliente: { id: parseInt(document.getElementById('field-cliente').value, 10) }
  };
  
  try {
    if (editingId) {
      await API.updateVehiculo(editingId, data);
      Utils.showToast('Vehículo actualizado correctamente', 'success');
    } else {
      await API.createVehiculo(data);
      Utils.showToast('Vehículo registrado correctamente', 'success');
    }
    closeModal();
    await loadVehiculos(currentPage);
  } catch (err) {
    Utils.showToast(err.message || 'Error al guardar', 'error');
  }
}

async function editVehiculo(id) {
  try {
    const v = await API.getVehiculoById(id);
    openModal('editar', v);
  } catch (err) {
    Utils.showToast('Error al cargar datos del vehículo', 'error');
  }
}

function deleteVehiculo(id) {
  Utils.showConfirm('¿Eliminar este vehículo?', async () => {
    try {
      await API.deleteVehiculo(id);
      Utils.showToast('Vehículo eliminado', 'success');
      await loadVehiculos(currentPage);
    } catch (err) {
      Utils.showToast(err.message || 'Error al eliminar', 'error');
    }
  });
}
