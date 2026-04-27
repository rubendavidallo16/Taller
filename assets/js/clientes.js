let currentPage = 0;
const PAGE_SIZE = 10;
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  setupNavLinks();
  injectModal();
  injectPagination();
  setupEventListeners();
  await loadClientes();
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
      <form id="form-cliente" style="display:flex;flex-direction:column;gap:1rem;">
        <input type="hidden" id="cliente-id"/>
        ${['nombre','apellido','cedula','telefono','email'].map(f => `
          <div style="display:flex;flex-direction:column;gap:0.4rem;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;
                          letter-spacing:0.08em;text-transform:uppercase;">
              ${f.charAt(0).toUpperCase()+f.slice(1)}
            </label>
            <input id="field-${f}" type="${f === 'email' ? 'email' : 'text'}"
              ${f !== 'direccion' ? 'required' : ''}
              style="background:#2A2A2A;border:1px solid #3A3A3A;
                     color:#fff;padding:0.6rem 0.875rem;
                     font-size:0.875rem;width:100%;outline:none;"/>
          </div>
        `).join('')}
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;
                        letter-spacing:0.08em;text-transform:uppercase;">
            Dirección
          </label>
          <textarea id="field-direccion" rows="2"
            style="background:#2A2A2A;border:1px solid #3A3A3A;
                   color:#fff;padding:0.6rem 0.875rem;
                   font-size:0.875rem;width:100%;outline:none;resize:none;">
          </textarea>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:0.5rem;">
          <button type="button" id="btn-cancelar" style="
            background:transparent;border:1px solid #3A3A3A;
            color:#A1A1AA;padding:0.6rem 1.25rem;
            font-size:0.8rem;font-weight:600;cursor:pointer;
          ">CANCELAR</button>
          <button type="submit" style="
            background:#DC2626;border:none;color:#fff;
            padding:0.6rem 1.25rem;font-size:0.8rem;
            font-weight:600;cursor:pointer;
          ">GUARDAR</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(div);
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

async function loadClientes(page = 0, search = '') {
  currentPage = page;
  try {
    let data;
    if (search.trim()) {
      const res = await API.searchClientes(search.trim());
      data = { content: Array.isArray(res) ? res : (res.content || []), totalPages: 1 };
    } else {
      data = await API.getClientes(page, PAGE_SIZE);
    }

    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const content = data.content || [];
    
    content.forEach(cliente => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-surface-variant/30 hover:bg-surface-container transition-colors group';
      
      tr.innerHTML = `
        <td class="py-4 px-6 font-mono text-xs text-[#DC2626]">#C-${cliente.id}</td>
        <td class="py-4 px-6 font-medium text-on-surface">${cliente.nombre || ''}</td>
        <td class="py-4 px-6 text-on-surface">${cliente.apellido || ''}</td>
        <td class="py-4 px-6 text-on-surface-variant">${cliente.cedula || ''}</td>
        <td class="py-4 px-6 text-on-surface-variant">${cliente.telefono || ''}</td>
        <td class="py-4 px-6 text-on-surface-variant">${cliente.email || ''}</td>
        <td class="py-4 px-6 text-right">
          <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="text-on-surface-variant hover:text-on-surface btn-edit" data-id="${cliente.id}">
              <span class="material-symbols-outlined text-lg pointer-events-none" data-icon="edit">edit</span>
            </button>
            <button class="text-on-surface-variant hover:text-primary-container btn-delete" data-id="${cliente.id}">
              <span class="material-symbols-outlined text-lg pointer-events-none" data-icon="delete">delete</span>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPagination(data.totalPages || 1);
  } catch (err) {
    if (typeof Utils !== 'undefined') Utils.showToast(err.message || 'Error al cargar clientes', 'error');
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
    btn.onclick = () => loadClientes(i);
    container.appendChild(btn);
  }
}

function setupEventListeners() {
  const btns = Array.from(document.querySelectorAll('button'));
  const btnNuevo = btns.find(b => b.textContent.includes('NUEVO CLIENTE'));
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => openModal('crear'));
  }

  const searchInput = document.querySelector('input[placeholder*="BUSCAR"]');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      loadClientes(0, e.target.value);
    }, 400));
  }

  const tbody = document.querySelector('table tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');
      
      if (btnEdit) editCliente(btnEdit.getAttribute('data-id'));
      if (btnDelete) deleteCliente(btnDelete.getAttribute('data-id'));
    });
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancelar').addEventListener('click', closeModal);
  
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      closeModal();
    }
  });

  document.getElementById('form-cliente').addEventListener('submit', handleSubmit);
}

function openModal(mode, cliente = null) {
  const form = document.getElementById('form-cliente');
  form.reset();
  
  const title = document.getElementById('modal-title');
  if (mode === 'crear') {
    title.textContent = 'NUEVO CLIENTE';
    editingId = null;
  } else if (mode === 'editar' && cliente) {
    title.textContent = 'EDITAR CLIENTE';
    editingId = cliente.id;
    document.getElementById('field-nombre').value = cliente.nombre || '';
    document.getElementById('field-apellido').value = cliente.apellido || '';
    document.getElementById('field-cedula').value = cliente.cedula || '';
    document.getElementById('field-telefono').value = cliente.telefono || '';
    document.getElementById('field-email').value = cliente.email || '';
    document.getElementById('field-direccion').value = cliente.direccion || '';
  }
  
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('form-cliente').reset();
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const data = {
    nombre: document.getElementById('field-nombre').value,
    apellido: document.getElementById('field-apellido').value,
    cedula: document.getElementById('field-cedula').value,
    telefono: document.getElementById('field-telefono').value,
    email: document.getElementById('field-email').value,
    direccion: document.getElementById('field-direccion').value
  };
  
  try {
    if (editingId) {
      await API.updateCliente(editingId, data);
      Utils.showToast('Cliente actualizado correctamente', 'success');
    } else {
      await API.createCliente(data);
      Utils.showToast('Cliente registrado correctamente', 'success');
    }
    closeModal();
    await loadClientes(currentPage);
  } catch (err) {
    Utils.showToast(err.message || 'Error al guardar', 'error');
  }
}

async function editCliente(id) {
  try {
    const cliente = await API.getClienteById(id);
    openModal('editar', cliente);
  } catch (err) {
    Utils.showToast('Error al cargar datos del cliente', 'error');
  }
}

function deleteCliente(id) {
  Utils.showConfirm('¿Eliminar este cliente?', async () => {
    try {
      await API.deleteCliente(id);
      Utils.showToast('Cliente eliminado', 'success');
      await loadClientes(currentPage);
    } catch (err) {
      Utils.showToast(err.message || 'Error al eliminar', 'error');
    }
  });
}
