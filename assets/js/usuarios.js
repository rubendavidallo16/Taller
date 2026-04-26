let currentPage = 0;
const PAGE_SIZE = 10;
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Auth !== 'undefined' && Auth.requireAdmin) {
    Auth.requireAdmin();
  } else if (typeof Auth !== 'undefined') {
    Auth.requireAuth(); // Fallback si requireAdmin no estuviera
  }
  
  setupNavLinks();
  injectModal();
  injectPagination();
  setupEventListeners();
  await loadUsuarios();
});

function setupNavLinks() {
  const links = document.querySelectorAll('nav a');
  const navMap = {
    'DASHBOARD': '/pages/dashboard.html',
    'USERS': '/pages/usuarios.html',
    'INVENTORY': '/pages/repuestos.html',
    'LOGS': '#',
    'TELEMETRY': '#',
    'LOGOUT': 'logout'
  };

  links.forEach(a => {
    const text = a.textContent.trim().toUpperCase();
    for (const key in navMap) {
      if (text.includes(key) && key !== 'LOGS' && key !== 'TELEMETRY') {
        if (navMap[key] === 'logout') {
          a.addEventListener('click', e => { e.preventDefault(); Auth.logout(); });
        } else {
          a.href = navMap[key];
        }
      }
    }
  });
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
      <form id="form-usuario" style="display:flex;flex-direction:column;gap:1rem;">
        <div style="display:flex;gap:1rem;">
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">NOMBRE</label>
            <input id="field-nombre" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">APELLIDO</label>
            <input id="field-apellido" type="text" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">EMAIL</label>
          <input id="field-email" type="email" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
        </div>
        <div style="display:flex;gap:1rem;">
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">ROL</label>
            <select id="field-rol" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;">
              <option value="ADMIN">ADMIN</option>
              <option value="MECANICO">MECÁNICO</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
            <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">ESTADO</label>
            <select id="field-estado" required style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;">
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;">
          <label style="font-size:0.7rem;font-weight:600;color:#A1A1AA;">CONTRASEÑA</label>
          <input id="field-password" type="password" style="background:#2A2A2A;border:1px solid #3A3A3A;color:#fff;padding:0.6rem;outline:none;"/>
          <small id="pwd-note" style="color:#6B7280;font-size:0.7rem;display:none;">Dejar vacío para no cambiar</small>
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
  container.style.cssText = 'display: flex; gap: 0.5rem;';
  
  const originalPag = document.querySelector('.mt-6.flex.justify-between.items-center');
  if (originalPag) {
    originalPag.innerHTML = '<span id="pag-info" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Mostrando 0 registros</span>';
    originalPag.appendChild(container);
  }
}

async function loadUsuarios(page = 0) {
  currentPage = page;
  try {
    const data = await API.getUsuarios(page, PAGE_SIZE);
    // Find the container list. We clear everything inside flex flex-col gap-[2px] except first row (header)
    const listWrapper = document.querySelector('.flex.flex-col.gap-\\[2px\\]');
    if (!listWrapper) return;
    const header = listWrapper.firstElementChild;
    listWrapper.innerHTML = '';
    listWrapper.appendChild(header);

    const content = data.content || [];
    content.forEach(usr => {
      const isInactive = usr.estado === 'INACTIVO';
      const opacityClass = isInactive ? 'opacity-50' : '';
      
      let roleHtml = '';
      if (usr.rol === 'ADMIN') {
        roleHtml = '<span class="bg-[#DC2626] text-[#fff6f5] px-3 py-1 text-[10px] tracking-widest font-bold uppercase">ADMIN</span>';
      } else {
        roleHtml = '<span class="bg-[#2a2a2a] text-on-surface px-3 py-1 text-[10px] tracking-widest font-bold uppercase outline outline-1 outline-[#5c403c]/30">MECÁNICO</span>';
      }

      let statusHtml = '';
      if (isInactive) {
        statusHtml = `
          <div class="w-1.5 h-1.5 bg-red-800 rounded-none"></div>
          <span class="font-label text-[10px] uppercase tracking-widest text-on-surface">Inactivo</span>
        `;
      } else {
        statusHtml = `
          <div class="w-1.5 h-1.5 bg-emerald-500 rounded-none"></div>
          <span class="font-label text-[10px] uppercase tracking-widest text-on-surface">Activo</span>
        `;
      }

      const row = document.createElement('div');
      row.className = 'grid grid-cols-12 gap-4 bg-[#131313] py-5 px-6 items-center hover:bg-[#1c1b1b] transition-colors duration-150 group';
      row.innerHTML = `
        <div class="col-span-2 font-headline text-sm tracking-widest text-on-surface ${opacityClass}">USR-${usr.id}</div>
        <div class="col-span-3 font-body font-medium text-white ${opacityClass}">${usr.nombre} ${usr.apellido}</div>
        <div class="col-span-3 font-body text-sm text-on-surface-variant ${opacityClass}">${usr.email}</div>
        <div class="col-span-2 flex ${opacityClass}">${roleHtml}</div>
        <div class="col-span-1 flex items-center gap-2 ${opacityClass}">${statusHtml}</div>
        <div class="col-span-1 flex justify-end gap-3 text-on-surface-variant">
          <button class="hover:text-white transition-colors btn-edit" data-id="${usr.id}"><span class="material-symbols-outlined text-[18px] pointer-events-none">edit</span></button>
          <button class="hover:text-[#DC2626] transition-colors btn-delete" data-id="${usr.id}"><span class="material-symbols-outlined text-[18px] pointer-events-none">delete</span></button>
        </div>
      `;
      listWrapper.appendChild(row);
    });

    renderPagination(data.totalPages || 1, data.totalElements || content.length);
  } catch (err) {}
}

function renderPagination(totalPages, totalElements) {
  const info = document.getElementById('pag-info');
  if (info) {
    const start = currentPage * PAGE_SIZE + 1;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
    info.textContent = totalElements > 0 ? `Mostrando ${start}-${end} de ${totalElements} registros` : '0 registros';
  }

  const container = document.getElementById('pagination-container');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.className = i === currentPage 
      ? 'bg-[#2a2a2a] text-white px-3 py-2 border-b-2 border-red-600 flex items-center' 
      : 'bg-[#1c1b1b] text-white px-3 py-2 hover:bg-[#2a2a2a] transition-colors flex items-center';
    btn.onclick = () => loadUsuarios(i);
    container.appendChild(btn);
  }
}

function setupEventListeners() {
  const btns = Array.from(document.querySelectorAll('button'));
  const btnNuevo = btns.find(b => b.textContent && b.textContent.includes('Nuevo Usuario'));
  if (btnNuevo) btnNuevo.addEventListener('click', () => openModal('crear'));

  const listWrapper = document.querySelector('.flex.flex-col.gap-\\[2px\\]');
  if (listWrapper) {
    listWrapper.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');
      if (btnEdit) {
        const id = btnEdit.getAttribute('data-id');
        API.getUsuarios(0, 100).then(res => {
          const u = res.content.find(x => x.id == id);
          if (u) openModal('editar', u);
        });
      }
      if (btnDelete) deleteUsuario(btnDelete.getAttribute('data-id'));
    });
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancelar').addEventListener('click', closeModal);
  document.getElementById('form-usuario').addEventListener('submit', handleSubmit);
}

function openModal(mode, data = null) {
  const form = document.getElementById('form-usuario');
  form.reset();
  const title = document.getElementById('modal-title');
  const pwdNote = document.getElementById('pwd-note');
  const pwdField = document.getElementById('field-password');

  if (mode === 'crear') {
    title.textContent = 'NUEVO USUARIO';
    editingId = null;
    pwdNote.style.display = 'none';
    pwdField.required = true;
  } else {
    title.textContent = 'EDITAR USUARIO';
    editingId = data.id;
    document.getElementById('field-nombre').value = data.nombre;
    document.getElementById('field-apellido').value = data.apellido;
    document.getElementById('field-email').value = data.email;
    document.getElementById('field-rol').value = data.rol;
    document.getElementById('field-estado').value = data.estado || 'ACTIVO';
    pwdNote.style.display = 'block';
    pwdField.required = false;
  }
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById('field-nombre').value,
    apellido: document.getElementById('field-apellido').value,
    email: document.getElementById('field-email').value,
    rol: document.getElementById('field-rol').value,
    estado: document.getElementById('field-estado').value
  };

  const pwd = document.getElementById('field-password').value;
  if (pwd) {
    payload.password = pwd;
  } else if (!editingId) {
    // Si estamos creando y la pwd está vacía, no deberíamos llegar aquí por el HTML required, 
    // pero por si acaso devolvemos error.
    Utils.showToast('Contraseña es requerida para nuevo usuario', 'error');
    return;
  }

  try {
    if (editingId) {
      await API.updateUsuario(editingId, payload);
      Utils.showToast('Usuario actualizado', 'success');
    } else {
      await API.createUsuario(payload);
      Utils.showToast('Usuario creado', 'success');
    }
    closeModal();
    loadUsuarios(currentPage);
  } catch (err) {
    if (typeof Utils !== 'undefined') {
      Utils.showToast(err.message || 'Error guardando usuario', 'error');
    }
  }
}

function deleteUsuario(id) {
  if (typeof Utils !== 'undefined') {
    Utils.showConfirm('¿Eliminar este usuario?', async () => {
      try {
        await API.deleteUsuario(id);
        Utils.showToast('Usuario eliminado', 'success');
        loadUsuarios(currentPage);
      } catch(err) {
        Utils.showToast(err.message || 'Error al eliminar', 'error');
      }
    });
  }
}
