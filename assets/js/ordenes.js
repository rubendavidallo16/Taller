let currentPage = 0;
let currentOrdenId = null;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();
  setupNavLinks();
  injectModals();
  setupEventListeners();
  await loadOrdenes();
});

function setupNavLinks() {
  const links = document.querySelectorAll('nav a');
  const navMap = {
    'DASHBOARD': '/pages/dashboard.html',
    'CLIENTES': '/pages/clientes.html',
    'VEHICLES': '/pages/vehiculos.html',
    'WORK_ORDERS': '/pages/ordenes.html',
    'INVENTORY': '/pages/repuestos.html',
    'LOG_OUT': 'logout'
  };

  links.forEach(a => {
    const text = a.textContent.trim().toUpperCase();
    for (const key in navMap) {
      if (text.includes(key)) {
        if (navMap[key] === 'logout') {
          a.addEventListener('click', e => { e.preventDefault(); Auth.logout(); });
        } else {
          a.href = navMap[key];
        }
      }
    }
  });
}

function injectModals() {
  const divN = document.createElement('div');
  divN.id = 'modal-nueva-orden';
  divN.style.cssText = `
    display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75);
    align-items:center; justify-content:center; z-index:1000;
  `;
  divN.innerHTML = `
    <div style="background:#1C1C1E; border:1px solid #3A3A3A; padding:2rem; width:500px; font-family:Inter,sans-serif;">
      <h3 style="color:#fff; border-left:3px solid #DC2626; padding-left:0.75rem; margin-bottom:1.5rem; font-weight:700;">NUEVA ORDEN</h3>
      <form id="form-nueva-orden" style="display:flex; flex-direction:column; gap:1rem;">
        <label style="color:#A1A1AA; font-size:0.7rem; font-weight:600;">VEHÍCULO</label>
        <select id="select-vehiculo" required style="background:#2A2A2A; color:#fff; padding:0.6rem; border:1px solid #3A3A3A; outline:none;"></select>
        
        <label style="color:#A1A1AA; font-size:0.7rem; font-weight:600;">OBSERVACIONES</label>
        <textarea id="obs-orden" rows="3" required style="background:#2A2A2A; color:#fff; padding:0.6rem; border:1px solid #3A3A3A; outline:none;"></textarea>
        
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
          <button type="button" onclick="document.getElementById('modal-nueva-orden').style.display='none'" style="background:none; color:#A1A1AA; padding:0.5rem 1rem; border:1px solid #3A3A3A; cursor:pointer;">CANCELAR</button>
          <button type="submit" style="background:#DC2626; color:#fff; padding:0.5rem 1rem; border:none; cursor:pointer;">CREAR ORDEN</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(divN);

  const panelItems = document.createElement('div');
  panelItems.id = 'panel-items';
  panelItems.style.cssText = `
    display:none; position:fixed; right:0; top:0; bottom:0; width:400px;
    background:#1C1C1E; border-left:1px solid #3A3A3A; z-index:100;
    padding:2rem; flex-direction:column; gap:1rem; font-family:Inter,sans-serif;
    transform:translateX(100%); transition:transform 0.3s;
  `;
  panelItems.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3 style="color:#fff; font-weight:700;">ÍTems DE ORDEN</h3>
      <button onclick="cerrarPanelItems()" style="background:none; border:none; color:#A1A1AA; font-size:1.5rem; cursor:pointer;">&times;</button>
    </div>
    <div id="items-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.5rem;"></div>
    <div style="color:#fff; font-weight:bold; text-align:right; border-top:1px solid #3A3A3A; padding-top:1rem;" id="items-total">TOTAL: $0.00</div>
    <form id="form-item" style="display:flex; flex-direction:column; gap:0.5rem; background:#2A2A2A; padding:1rem;">
      <select id="item-tipo" style="background:#1C1C1E; color:#fff; border:1px solid #3A3A3A; padding:0.5rem;">
        <option value="SERVICIO">SERVICIO</option>
        <option value="REPUESTO">REPUESTO</option>
      </select>
      <select id="item-id" style="background:#1C1C1E; color:#fff; border:1px solid #3A3A3A; padding:0.5rem;"></select>
      <div style="display:flex; gap:0.5rem;">
        <input id="item-cant" type="number" placeholder="Cant" value="1" min="1" style="background:#1C1C1E; color:#fff; border:1px solid #3A3A3A; padding:0.5rem; width:80px;"/>
        <input id="item-precio" type="number" placeholder="Precio" step="0.01" style="background:#1C1C1E; color:#fff; border:1px solid #3A3A3A; padding:0.5rem; flex:1;"/>
      </div>
      <button type="submit" style="background:#DC2626; color:#fff; border:none; padding:0.5rem; cursor:pointer;">AGREGAR</button>
    </form>
  `;
  document.body.appendChild(panelItems);

  document.getElementById('item-tipo').addEventListener('change', loadItemOptions);
}

function cerrarPanelItems() {
  document.getElementById('panel-items').style.transform = 'translateX(100%)';
  setTimeout(() => document.getElementById('panel-items').style.display = 'none', 300);
}

async function loadOrdenes() {
  const estadoFilter = document.querySelector('select:first-of-type').value;
  let queryEstado = '';
  if (estadoFilter !== 'ESTADO: TODOS') {
    queryEstado = estadoFilter;
  }

  try {
    const data = await API.getOrdenes(currentPage, PAGE_SIZE, queryEstado);
    const container = document.querySelector('.bg-surface-container.flex-1.overflow-auto');
    if (!container) return;
    
    // Mantener la fila de cabecera
    const header = container.querySelector('.grid.border-b');
    container.innerHTML = '';
    if (header) container.appendChild(header);

    (data.content || []).forEach(orden => {
      const statusColor = Utils.getStatusColor(orden.estado);
      const isPulse = orden.estado === 'EN_PROCESO' ? 'animate-pulse' : '';
      const vNombre = orden.vehiculo ? `${orden.vehiculo.marca || ''} ${orden.vehiculo.modelo || ''}` : 'N/A';

      const row = document.createElement('div');
      row.className = 'grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-surface-container-high transition-colors cursor-pointer group bg-surface-container-high';
      row.innerHTML = `
        <div class="col-span-2 font-headline font-bold text-sm">#WO-${orden.id}</div>
        <div class="col-span-3 font-label text-sm text-zinc-300 w-full truncate">${vNombre}</div>
        <div class="col-span-3 flex items-center gap-2">
          <div class="w-2 h-2 ${isPulse}" style="background-color:${statusColor.dot}"></div>
          <span class="font-label text-xs uppercase tracking-widest" style="color:${statusColor.dot}">${orden.estado}</span>
        </div>
        <div class="col-span-4 flex justify-end gap-2 opacity-100">
          <button class="text-white hover:text-primary-container p-1 btn-view" data-id="${orden.id}"><span class="material-symbols-outlined text-lg pointer-events-none">visibility</span></button>
          ${orden.estado === 'RECIBIDO' ? `<button class="text-white hover:text-red-500 p-1 btn-del" data-id="${orden.id}"><span class="material-symbols-outlined text-lg pointer-events-none">delete</span></button>` : ''}
        </div>
      `;
      container.appendChild(row);
    });
  } catch (e) {
    console.error(e);
  }
}

async function verDetalle(id) {
  currentOrdenId = id;
  try {
    const orden = await API.getOrdenById(id);
    const detailPanel = document.querySelector('.bg-surface-container-high.p-6.ghost-border.flex.flex-col.gap-6.relative.overflow-hidden');
    if (!detailPanel) return;

    detailPanel.querySelector('h3').textContent = `#WO-${orden.id}`;
    const spans = detailPanel.querySelectorAll('.grid-cols-2 span.text-white');
    if (spans.length >= 2) {
      spans[0].textContent = orden.cliente ? `${orden.cliente.nombre} ${orden.cliente.apellido}` : 'N/A';
      spans[1].textContent = Utils.formatDate(orden.fechaIngreso || new Date());
    }

    const wMap = { 'RECIBIDO': '25%', 'EN_PROCESO': '50%', 'TERMINADO': '75%', 'ENTREGADO': '100%' };
    const bar = detailPanel.querySelector('.bg-primary-container');
    if (bar) bar.style.width = wMap[orden.estado] || '0%';

    const btn = detailPanel.querySelector('.mt-auto button');
    if (btn) {
      if (orden.estado === 'ENTREGADO') {
        btn.textContent = 'COMPLETADO';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
      } else {
        btn.textContent = 'AVANZAR ESTADO';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.onclick = avanzarEstado;
      }
    }

    renderItemsPanel(orden.items || []);
  } catch(e) {
    console.error(e);
  }
}

async function avanzarEstado() {
  if (!currentOrdenId) return;
  const transiciones = { 'RECIBIDO': 'EN_PROCESO', 'EN_PROCESO': 'TERMINADO', 'TERMINADO': 'ENTREGADO' };
  try {
    const orden = await API.getOrdenById(currentOrdenId);
    const siguiente = transiciones[orden.estado];
    if (!siguiente) return;
    await API.updateOrdenEstado(currentOrdenId, siguiente);
    Utils.showToast('Estado actualizado a ' + siguiente, 'success');
    await loadOrdenes();
    await verDetalle(currentOrdenId);
  } catch (e) {
    Utils.showToast('Error avanzando estado', 'error');
  }
}

function renderItemsPanel(items) {
  const p = document.getElementById('panel-items');
  p.style.display = 'flex';
  setTimeout(() => p.style.transform = 'translateX(0)', 10);

  const list = document.getElementById('items-list');
  list.innerHTML = '';
  let total = 0;
  items.forEach(it => {
    let sub = parseFloat(it.cantidad) * parseFloat(it.precioHistorico || it.precio);
    total += sub;
    const name = it.servicio ? it.servicio.nombre : (it.repuesto ? it.repuesto.nombre : 'Item');
    list.innerHTML += `
      <div style="background:#2A2A2A; padding:0.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div style="color:#A1A1AA; font-size:0.8rem;">
          <strong style="color:#fff">${name}</strong> (${it.cantidad})<br/>
          $${sub.toFixed(2)}
        </div>
        <button onclick="eliminarItem(${it.id})" style="color:#DC2626; background:none; border:none; cursor:pointer;">&times;</button>
      </div>
    `;
  });
  document.getElementById('items-total').textContent = 'TOTAL: ' + Utils.formatCurrency(total);
  loadItemOptions();
}

let loadedOptions = { servicio: [], repuesto: [] };

async function loadItemOptions() {
  const tipo = document.getElementById('item-tipo').value;
  const sel = document.getElementById('item-id');
  sel.innerHTML = '<option disabled selected>Cargando...</option>';
  try {
    if (tipo === 'SERVICIO') {
      const r = await API.getServicios(0, 50);
      loadedOptions.servicio = r.content || [];
      sel.innerHTML = loadedOptions.servicio.map(s => `<option value="${s.id}" data-precio="${s.precio}">${s.nombre}</option>`).join('');
    } else {
      const r = await API.getRepuestos(0, 50);
      loadedOptions.repuesto = r.content || [];
      sel.innerHTML = loadedOptions.repuesto.map(s => `<option value="${s.id}" data-precio="${s.precio}">${s.nombre}</option>`).join('');
    }
    updatePrecioField();
  } catch(e) {}
}

document.getElementById('item-id')?.addEventListener('change', updatePrecioField);

function updatePrecioField() {
  const sel = document.getElementById('item-id');
  if (sel.selectedOptions.length > 0) {
    document.getElementById('item-precio').value = sel.selectedOptions[0].getAttribute('data-precio') || 0;
  }
}

async function agregarItem(e) {
  e.preventDefault();
  if(!currentOrdenId) return Utils.showToast('Seleccione una orden primero', 'error');
  const tipo = document.getElementById('item-tipo').value;
  const itemId = document.getElementById('item-id').value;
  const cantidad = document.getElementById('item-cant').value;
  const precio = document.getElementById('item-precio').value;
  
  if(!itemId) return;

  const body = {
    cantidad: parseFloat(cantidad),
    precioHistorico: parseFloat(precio)
  };
  if(tipo === 'SERVICIO') body.servicio = { id: itemId };
  else body.repuesto = { id: itemId };

  try {
    await API.addItemToOrden(currentOrdenId, body);
    Utils.showToast('Ítem agregado', 'success');
    await verDetalle(currentOrdenId);
  } catch(e) {
    Utils.showToast(e.message || 'Error', 'error');
  }
}

async function eliminarItem(itemId) {
  try {
    await API.removeItemFromOrden(currentOrdenId, itemId);
    Utils.showToast('Ítem eliminado', 'success');
    await verDetalle(currentOrdenId);
  } catch(e) {
    Utils.showToast(e.message || 'Error', 'error');
  }
}

function setupEventListeners() {
  document.getElementById('form-item').addEventListener('submit', agregarItem);
  
  document.querySelector('.bg-surface-container.flex-1.overflow-auto')?.addEventListener('click', e => {
    const btnV = e.target.closest('.btn-view');
    const btnD = e.target.closest('.btn-del');
    if (btnV) verDetalle(btnV.getAttribute('data-id'));
    if (btnD) {
      Utils.showConfirm('¿Eliminar orden?', async () => {
        try {
          await API.deleteOrden(btnD.getAttribute('data-id'));
          Utils.showToast('Orden eliminada', 'success');
          loadOrdenes();
        }catch(e) { Utils.showToast(e.message, 'error'); }
      });
    }
  });

  const selectFiltro = document.querySelector('select:first-of-type');
  if (selectFiltro) selectFiltro.addEventListener('change', loadOrdenes);

  // New order button setup
  const btnNew = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('NEW_ORDER'));
  if (btnNew) {
    btnNew.addEventListener('click', async () => {
      document.getElementById('modal-nueva-orden').style.display = 'flex';
      const sv = document.getElementById('select-vehiculo');
      sv.innerHTML = '<option disabled>Cargando...</option>';
      try {
        const v = await API.getVehiculos(0, 100);
        sv.innerHTML = (v.content||[]).map(x => `<option value="${x.id}">${x.placa} - ${x.marca}</option>`).join('');
      } catch(e) {}
    });
  }

  document.getElementById('form-nueva-orden').addEventListener('submit', async e => {
    e.preventDefault();
    const vehiculoId = document.getElementById('select-vehiculo').value;
    const observaciones = document.getElementById('obs-orden').value;
    try {
      await API.createOrden({ vehiculo: {id: vehiculoId}, observaciones });
      Utils.showToast('Orden creada', 'success');
      document.getElementById('modal-nueva-orden').style.display = 'none';
      e.target.reset();
      loadOrdenes();
    } catch(err) { Utils.showToast('Error al crear orden', 'error'); }
  });
}
