let currentPage = 0;
const PAGE_SIZE = 10;
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  setupNavLinks();
  injectModal();
  injectPagination();
  setupEventListeners();
  await loadRepuestos();
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

  const tabs = Array.from(document.querySelectorAll('.border-b button, .border-b a'));
  const srvTab = tabs.find(t => t.textContent.includes('SERVICIOS'));
  if (srvTab) {
    srvTab.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.replace('/pages/servicios.html');
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
      <form id="form-repuesto" style="display:flex;flex-direction:column;gap:1rem;">
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">NOMBRE</label>
          <input id="field-nombre" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">REFERENCIA</label>
          <input id="field-referencia" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
        </div>
        <div style="display:flex;gap:1rem;">
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">STOCK</label>
            <input id="field-stock" type="number" min="0" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">PRECIO UNITARIO</label>
            <input id="field-precio" type="number" step="0.01" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
          </div>
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
  // Not heavily styled just a container implementation
  const container = document.createElement('div');
  container.id = 'pagination-container';
  container.style.cssText = 'display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;';
  
  // Try to append below the table
  const table = document.querySelector('table');
  if (table && table.parentElement) {
    if (!document.getElementById('pag-info')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<span id="pag-info">MOSTRANDO 0 REGISTROS</span>';
      wrap.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:1rem; font-size:0.75rem; color:#A1A1AA;';
      wrap.appendChild(container);
      table.parentElement.appendChild(wrap);
    }
  }
}

async function loadRepuestos(page = 0) {
  currentPage = page;
  try {
    const data = await API.getRepuestos(page, PAGE_SIZE);
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const content = data.content || [];
    content.forEach(rep => {
      const isLow = rep.stock < 5;
      const stockHtml = isLow 
        ? `<span style="color:#D97706">${rep.stock} <span class="material-symbols-outlined text-[14px]" style="vertical-align:middle;margin-left:4px;">warning</span></span>`
        : `<span class="bg-surface-container-highest text-white px-2 py-1 text-xs font-mono ghost-border">${rep.stock}</span>`;

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-surface-container-highest transition-colors duration-150 group';
      tr.innerHTML = `
        <td class="py-4 pl-4 font-mono text-primary-container text-xs">#RP-${rep.id}</td>
        <td class="py-4 px-4 font-medium text-white">${rep.nombre}</td>
        <td class="py-4 px-4 font-mono text-on-surface-variant text-xs">${rep.referencia}</td>
        <td class="py-4 px-4 text-right">${stockHtml}</td>
        <td class="py-4 px-4 text-right font-mono text-white">$${parseFloat(rep.precio).toFixed(2)}</td>
        <td class="py-4 pr-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="text-on-surface-variant hover:text-white p-1 btn-edit" data-id="${rep.id}"><span class="material-symbols-outlined text-[20px] pointer-events-none">edit</span></button>
          <button class="text-on-surface-variant hover:text-primary-container p-1 btn-delete" data-id="${rep.id}"><span class="material-symbols-outlined text-[20px] pointer-events-none">delete</span></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPagination(data.totalPages || 1, data.totalElements || content.length);
  } catch (err) {}
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
    btn.onclick = () => loadRepuestos(i);
    container.appendChild(btn);
  }
}

function setupEventListeners() {
  const btns = Array.from(document.querySelectorAll('button'));
  const btnNuevo = btns.find(b => b.textContent && b.textContent.includes('NUEVO REPUESTO'));
  if (btnNuevo) btnNuevo.addEventListener('click', () => openModal('crear'));

  const tbody = document.querySelector('table tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');
      if (btnEdit) {
        const id = btnEdit.getAttribute('data-id');
        API.getRepuestos(0, 100).then(res => {
          const r = res.content.find(x => x.id == id);
          if (r) openModal('editar', r);
        });
      }
      if (btnDelete) deleteRepuesto(btnDelete.getAttribute('data-id'));
    });
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancelar').addEventListener('click', closeModal);
  document.getElementById('form-repuesto').addEventListener('submit', handleSubmit);
}

function openModal(mode, data = null) {
  document.getElementById('form-repuesto').reset();
  const title = document.getElementById('modal-title');
  if (mode === 'crear') {
    title.textContent = 'NUEVO REPUESTO';
    editingId = null;
  } else {
    title.textContent = 'EDITAR REPUESTO';
    editingId = data.id;
    document.getElementById('field-nombre').value = data.nombre;
    document.getElementById('field-referencia').value = data.referencia;
    document.getElementById('field-stock').value = data.stock;
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
    referencia: document.getElementById('field-referencia').value,
    stock: parseInt(document.getElementById('field-stock').value),
    precio: parseFloat(document.getElementById('field-precio').value)
  };
  try {
    if (editingId) {
      await API.updateRepuesto(editingId, data);
      Utils.showToast('Actualizado', 'success');
    } else {
      await API.createRepuesto(data);
      Utils.showToast('Creado', 'success');
    }
    closeModal();
    loadRepuestos(currentPage);
  } catch (err) {}
}

function deleteRepuesto(id) {
  Utils.showConfirm('¿Eliminar repuesto?', async () => {
    try {
      await API.deleteRepuesto(id);
      Utils.showToast('Eliminado', 'success');
      loadRepuestos(currentPage);
    } catch(err) {}
  });
}
