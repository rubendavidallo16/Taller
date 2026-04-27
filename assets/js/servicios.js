let currentPage = 0;
const PAGE_SIZE = 10;
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  setupNavLinks();
  injectModal();
  injectPagination();
  setupEventListeners();
  await loadServicios();
});

function setupNavLinks() {
  const links = document.querySelectorAll('nav a');
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
    if (text.includes('LOGOUT')) {
      a.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
    } else {
      for (const [key, path] of Object.entries(navMap)) {
        if (text.includes(key)) {
          a.href = path;
          break;
        }
      }
    }
  });

  // Tabs
  const tabs = Array.from(document.querySelectorAll('.border-b button, .border-b a'));
  const repuestosTab = tabs.find(t => t.textContent.includes('REPUESTOS'));
  if (repuestosTab) {
    repuestosTab.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.replace('/pages/repuestos.html');
    });
  }
}

function injectModal() {
  const div = document.createElement('div');
  div.id = 'modal-overlay';
  div.style.cssText = `
    display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75);
    align-items:center; justify-content:center; z-index:1000;
  `;
  div.innerHTML = `
    <div style="background:#1C1C1E; border:1px solid #3A3A3A; padding:2rem; width:500px; font-family:Inter,sans-serif;">
      <div style="display:flex;justify-content:space-between; align-items:center;margin-bottom:1.5rem;">
        <h3 id="modal-title" style="font-size:1.1rem;font-weight:700;color:#fff;border-left:3px solid #DC2626;padding-left:0.75rem;"></h3>
        <button type="button" id="modal-close" style="background:none;border:none;color:#6B7280;cursor:pointer;font-size:1.25rem;">✕</button>
      </div>
      <form id="form-servicio" style="display:flex;flex-direction:column;gap:1rem;">
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">NOMBRE DEL SERVICIO</label>
          <input id="field-nombre" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">DESCRIPCIÓN</label>
          <textarea id="field-descripcion" rows="3" style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">PRECIO BASE</label>
          <input id="field-precio" type="number" step="0.01" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
          <button type="button" id="btn-cancelar" style="background:transparent;border:1px solid #3A3A3A;color:#A1A1AA;padding:0.6rem 1.25rem;cursor:pointer;">CANCELAR</button>
          <button type="submit" style="background:#DC2626;border:none;color:#fff;padding:0.6rem 1.25rem;cursor:pointer;">GUARDAR</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(div);
}

function injectPagination() {
  const container = document.createElement('div');
  container.id = 'pagination-container';
  container.style.cssText = 'display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;';
  
  const originalPag = document.querySelector('.mt-6.flex.justify-between.items-center');
  if (originalPag) {
    originalPag.innerHTML = '<span id="pag-info">MOSTRANDO 0 REGISTROS</span>';
    originalPag.appendChild(container);
  }
}

async function loadServicios(page = 0) {
  currentPage = page;
  try {
    const data = await API.getServicios(page, PAGE_SIZE);
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const content = data.content || [];
    content.forEach(srv => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-surface-bright/20 hover:bg-surface-container-highest/50 transition-colors group';
      tr.innerHTML = `
        <td class="py-4 px-4 text-zinc-500 font-mono">SRV-${srv.id}</td>
        <td class="py-4 px-4 text-white uppercase font-bold">${srv.nombre}</td>
        <td class="py-4 px-4 text-zinc-400 max-w-xs truncate">${srv.descripcion || ''}</td>
        <td class="py-4 px-4 text-white font-mono">$${parseFloat(srv.precio).toFixed(2)}</td>
        <td class="py-4 px-4 text-right">
          <button class="text-zinc-500 hover:text-primary-container p-2 btn-edit" data-id="${srv.id}"><span class="material-symbols-outlined pointer-events-none">edit</span></button>
          <button class="text-zinc-500 hover:text-primary-container p-2 btn-delete" data-id="${srv.id}"><span class="material-symbols-outlined pointer-events-none">delete</span></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPagination(data.totalPages || 1, data.totalElements || content.length);
  } catch (err) { }
}

function renderPagination(totalPages, totalElements) {
  const info = document.getElementById('pag-info');
  if (info) {
    const start = currentPage * PAGE_SIZE + 1;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
    info.textContent = totalElements > 0 ? `MOSTRANDO ${start}-${end} DE ${totalElements} REGISTROS` : 'SIN REGISTROS';
  }

  const container = document.getElementById('pagination-container');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.className = i === currentPage ? 'bg-primary-container/20 text-white border-b-2 border-primary-container px-3 py-2' : 'bg-surface-container-highest px-3 py-2 text-zinc-400 hover:text-white';
    btn.onclick = () => loadServicios(i);
    container.appendChild(btn);
  }
}

function setupEventListeners() {
  const btns = Array.from(document.querySelectorAll('button'));
  const btnNuevo = btns.find(b => b.textContent && b.textContent.includes('Nuevo Servicio'));
  if (btnNuevo) btnNuevo.addEventListener('click', () => openModal('crear'));

  const tbody = document.querySelector('table tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');
      if (btnEdit) { 
        const srv = { id: btnEdit.getAttribute('data-id'), nombre: btnEdit.closest('tr').children[1].textContent, descripcion: btnEdit.closest('tr').children[2].textContent, precio: btnEdit.closest('tr').children[3].textContent.replace('$','') };
        openModal('editar', srv);
      }
      if (btnDelete) deleteServicio(btnDelete.getAttribute('data-id'));
    });
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancelar').addEventListener('click', closeModal);
  document.getElementById('form-servicio').addEventListener('submit', handleSubmit);
}

function openModal(mode, data = null) {
  document.getElementById('form-servicio').reset();
  const title = document.getElementById('modal-title');
  if (mode === 'crear') {
    title.textContent = 'NUEVO SERVICIO';
    editingId = null;
  } else {
    title.textContent = 'EDITAR SERVICIO';
    editingId = data.id;
    document.getElementById('field-nombre').value = data.nombre;
    document.getElementById('field-descripcion').value = data.descripcion;
    document.getElementById('field-precio').value = data.precio;
  }
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const data = {
    nombre: document.getElementById('field-nombre').value,
    descripcion: document.getElementById('field-descripcion').value,
    precio: parseFloat(document.getElementById('field-precio').value)
  };
  try {
    if (editingId) {
      await API.updateServicio(editingId, data);
      Utils.showToast('Actualizado', 'success');
    } else {
      await API.createServicio(data);
      Utils.showToast('Creado', 'success');
    }
    closeModal();
    loadServicios(currentPage);
  } catch (err) {}
}

function deleteServicio(id) {
  Utils.showConfirm('¿Eliminar servicio?', async () => {
    try {
      await API.deleteServicio(id);
      Utils.showToast('Eliminado', 'success');
      loadServicios(currentPage);
    } catch(err) {}
  });
}
