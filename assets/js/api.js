// Enrutador de llamadas API para comunicarse con el servidor REST backend

async function apiRequest(endpoint, options = {}) {
  const token = window.Auth ? Auth.getToken() : null;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      data = { message: text || 'Error al procesar la respuesta del servidor.' };
    }

    if (!response.ok) {
      throw new Error(data.message || `Error en la solicitud: ${response.statusText}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

window.API = {
  // Clientes
  getClientes: async (page = 0, size = 10) => {
    return apiRequest(`/clientes?page=${page}&size=${size}`);
  },
  getClienteById: async (id) => {
    return apiRequest(`/clientes/${id}`);
  },
  createCliente: async (data) => {
    return apiRequest('/clientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateCliente: async (id, data) => {
    return apiRequest(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteCliente: async (id) => {
    return apiRequest(`/clientes/${id}`, {
      method: 'DELETE'
    });
  },
  searchClientes: async (q) => {
    return apiRequest(`/clientes?search=${encodeURIComponent(q)}`);
  },

  // Vehículos
  getVehiculos: async (page = 0, size = 10) => {
    return apiRequest(`/vehiculos?page=${page}&size=${size}`);
  },
  getVehiculoById: async (id) => {
    return apiRequest(`/vehiculos/${id}`);
  },
  createVehiculo: async (data) => {
    return apiRequest('/vehiculos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateVehiculo: async (id, data) => {
    return apiRequest(`/vehiculos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteVehiculo: async (id) => {
    return apiRequest(`/vehiculos/${id}`, {
      method: 'DELETE'
    });
  },
  getVehiculosByCliente: async (cid) => {
    return apiRequest(`/vehiculos/cliente/${cid}`);
  },

  // Órdenes
  getOrdenes: async (page = 0, size = 10, estado = '') => {
    return apiRequest(`/ordenes?page=${page}&size=${size}&estado=${estado}`);
  },
  getOrdenById: async (id) => {
    return apiRequest(`/ordenes/${id}`);
  },
  createOrden: async (data) => {
    return apiRequest('/ordenes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateOrdenEstado: async (id, estado) => {
    return apiRequest(`/ordenes/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado })
    });
  },
  deleteOrden: async (id) => {
    return apiRequest(`/ordenes/${id}`, {
      method: 'DELETE'
    });
  },
  addItemToOrden: async (oid, item) => {
    return apiRequest(`/ordenes/${oid}/items`, {
      method: 'POST',
      body: JSON.stringify(item)
    });
  },
  removeItemFromOrden: async (oid, iid) => {
    return apiRequest(`/ordenes/${oid}/items/${iid}`, {
      method: 'DELETE'
    });
  },

  // Servicios
  getServicios: async (page = 0, size = 10) => {
    return apiRequest(`/servicios?page=${page}&size=${size}`);
  },
  createServicio: async (data) => {
    return apiRequest('/servicios', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateServicio: async (id, data) => {
    return apiRequest(`/servicios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteServicio: async (id) => {
    return apiRequest(`/servicios/${id}`, {
      method: 'DELETE'
    });
  },

  // Repuestos
  getRepuestos: async (page = 0, size = 10) => {
    return apiRequest(`/repuestos?page=${page}&size=${size}`);
  },
  createRepuesto: async (data) => {
    return apiRequest('/repuestos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateRepuesto: async (id, data) => {
    return apiRequest(`/repuestos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteRepuesto: async (id) => {
    return apiRequest(`/repuestos/${id}`, {
      method: 'DELETE'
    });
  },

  // Usuarios
  getUsuarios: async (page = 0, size = 10) => {
    return apiRequest(`/usuarios?page=${page}&size=${size}`);
  },
  createUsuario: async (data) => {
    return apiRequest('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateUsuario: async (id, data) => {
    return apiRequest(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteUsuario: async (id) => {
    return apiRequest(`/usuarios/${id}`, {
      method: 'DELETE'
    });
  },

  // Dashboard
  getDashboardStats: async () => {
    return apiRequest('/dashboard/stats');
  },
  getRecentOrdenes: async () => {
    return apiRequest('/dashboard/recent-ordenes');
  }
};
