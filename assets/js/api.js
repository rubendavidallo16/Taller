async function apiFetch(endpoint, options = {}) {
  const url = CONFIG.API_BASE_URL + endpoint;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + Auth.getToken(),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    Auth.logout();
    throw new Error('Sesión expirada o no autorizada.');
  }
  
  if (!response.ok) {
    let errorMsg = 'Ocurrió un error en la solicitud.';
    try {
      const err = await response.json();
      errorMsg = err.message || errorMsg;
    } catch (e) {
      // Ignorar fallback parse JSON
    }
    throw new Error(errorMsg);
  }
  
  if (response.status === 204) return null;
  return response.json();
}

window.API = {
  // Auth
  login: (email, password, recaptchaToken) =>
    fetch(CONFIG.API_BASE_URL + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, recaptchaToken })
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (r.status === 401) throw new Error('Credenciales incorrectas.');
        if (r.status === 400) throw new Error(err.message || 'Verificación de seguridad fallida.');
        if (r.status === 429) throw new Error('Demasiados intentos. Espera unos minutos.');
        throw new Error(err.message || 'Error al iniciar sesión.');
      }
      return r.json();
    }),

  // Clientes
  getClientes:    (page=0, size=10) => apiFetch(`/clientes?page=${page}&size=${size}`),
  getClienteById: (id)              => apiFetch(`/clientes/${id}`),
  createCliente:  (data)            => apiFetch('/clientes', { method:'POST', body:JSON.stringify(data) }),
  updateCliente:  (id, data)        => apiFetch(`/clientes/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  deleteCliente:  (id)              => apiFetch(`/clientes/${id}`, { method:'DELETE' }),
  searchClientes: (q)               => apiFetch(`/clientes/search?q=${encodeURIComponent(q)}`),

  // Vehículos
  getVehiculos:          (page=0, size=10) => apiFetch(`/vehiculos?page=${page}&size=${size}`),
  getVehiculoById:       (id)              => apiFetch(`/vehiculos/${id}`),
  createVehiculo:        (data)            => apiFetch('/vehiculos', { method:'POST', body:JSON.stringify(data) }),
  updateVehiculo:        (id, data)        => apiFetch(`/vehiculos/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  deleteVehiculo:        (id)              => apiFetch(`/vehiculos/${id}`, { method:'DELETE' }),
  getVehiculosByCliente: (cid)             => apiFetch(`/vehiculos/cliente/${cid}`),

  // Órdenes
  getOrdenes:          (page=0, size=10, estado='') => apiFetch(`/ordenes?page=${page}&size=${size}${estado ? '&estado='+estado : ''}`),
  getOrdenById:        (id)                         => apiFetch(`/ordenes/${id}`),
  createOrden:         (data)                       => apiFetch('/ordenes', { method:'POST', body:JSON.stringify(data) }),
  updateOrdenEstado:   (id, estado)                 => apiFetch(`/ordenes/${id}/estado`, { method:'PATCH', body:JSON.stringify({ estado }) }),
  deleteOrden:         (id)                         => apiFetch(`/ordenes/${id}`, { method:'DELETE' }),
  addItemToOrden:      (oid, item)                  => apiFetch(`/ordenes/${oid}/items`, { method:'POST', body:JSON.stringify(item) }),
  removeItemFromOrden: (oid, iid)                   => apiFetch(`/ordenes/${oid}/items/${iid}`, { method:'DELETE' }),

  // Servicios
  getServicios:    (page=0, size=10) => apiFetch(`/servicios?page=${page}&size=${size}`),
  createServicio:  (data)            => apiFetch('/servicios', { method:'POST', body:JSON.stringify(data) }),
  updateServicio:  (id, data)        => apiFetch(`/servicios/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  deleteServicio:  (id)              => apiFetch(`/servicios/${id}`, { method:'DELETE' }),

  // Repuestos
  getRepuestos:   (page=0, size=10) => apiFetch(`/repuestos?page=${page}&size=${size}`),
  createRepuesto: (data)            => apiFetch('/repuestos', { method:'POST', body:JSON.stringify(data) }),
  updateRepuesto: (id, data)        => apiFetch(`/repuestos/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  deleteRepuesto: (id)              => apiFetch(`/repuestos/${id}`, { method:'DELETE' }),

  // Usuarios
  getUsuarios:    (page=0, size=10) => apiFetch(`/usuarios?page=${page}&size=${size}`),
  createUsuario:  (data)            => apiFetch('/usuarios', { method:'POST', body:JSON.stringify(data) }),
  updateUsuario:  (id, data)        => apiFetch(`/usuarios/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  deleteUsuario:  (id)              => apiFetch(`/usuarios/${id}`, { method:'DELETE' }),

  // Dashboard
  getDashboardStats:  () => apiFetch('/dashboard/stats'),
  getRecentOrdenes:   () => apiFetch('/ordenes?page=0&size=5&sort=fecha,desc'),
};
