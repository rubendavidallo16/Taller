// Función auxiliar para manejar respuestas de Supabase
function handleResponse({ data, error }) {
  if (error) {
    throw new Error(error.message || 'Ocurrió un error en la base de datos.');
  }
  return data;
}

window.API = {
  // Clientes
  getClientes: async (page = 0, size = 10) => {
    const from = page * size;
    const to = from + size - 1;
    return handleResponse(await supabaseClient.from('clientes').select('*').range(from, to));
  },
  getClienteById: async (id) => {
    return handleResponse(await supabaseClient.from('clientes').select('*').eq('id', id).single());
  },
  createCliente: async (data) => {
    return handleResponse(await supabaseClient.from('clientes').insert([data]).select().single());
  },
  updateCliente: async (id, data) => {
    return handleResponse(await supabaseClient.from('clientes').update(data).eq('id', id).select().single());
  },
  deleteCliente: async (id) => {
    return handleResponse(await supabaseClient.from('clientes').delete().eq('id', id));
  },
  searchClientes: async (q) => {
    return handleResponse(await supabaseClient.from('clientes').select('*').or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`));
  },

  // Vehículos
  getVehiculos: async (page = 0, size = 10) => {
    const from = page * size;
    const to = from + size - 1;
    return handleResponse(await supabaseClient.from('vehiculos').select('*, clientes(*)').range(from, to));
  },
  getVehiculoById: async (id) => {
    return handleResponse(await supabaseClient.from('vehiculos').select('*, clientes(*)').eq('id', id).single());
  },
  createVehiculo: async (data) => {
    return handleResponse(await supabaseClient.from('vehiculos').insert([data]).select().single());
  },
  updateVehiculo: async (id, data) => {
    return handleResponse(await supabaseClient.from('vehiculos').update(data).eq('id', id).select().single());
  },
  deleteVehiculo: async (id) => {
    return handleResponse(await supabaseClient.from('vehiculos').delete().eq('id', id));
  },
  getVehiculosByCliente: async (cid) => {
    return handleResponse(await supabaseClient.from('vehiculos').select('*').eq('cliente_id', cid));
  },

  // Órdenes
  getOrdenes: async (page = 0, size = 10, estado = '') => {
    const from = page * size;
    const to = from + size - 1;
    let query = supabaseClient.from('ordenes').select('*, vehiculos(*, clientes(*))');
    if (estado) query = query.eq('estado', estado);
    return handleResponse(await query.range(from, to).order('fecha', { ascending: false }));
  },
  getOrdenById: async (id) => {
    return handleResponse(await supabaseClient.from('ordenes').select('*, vehiculos(*, clientes(*)), orden_items(*)').eq('id', id).single());
  },
  createOrden: async (data) => {
    return handleResponse(await supabaseClient.from('ordenes').insert([data]).select().single());
  },
  updateOrdenEstado: async (id, estado) => {
    return handleResponse(await supabaseClient.from('ordenes').update({ estado }).eq('id', id).select().single());
  },
  deleteOrden: async (id) => {
    return handleResponse(await supabaseClient.from('ordenes').delete().eq('id', id));
  },
  addItemToOrden: async (oid, item) => {
    item.orden_id = oid;
    return handleResponse(await supabaseClient.from('orden_items').insert([item]).select().single());
  },
  removeItemFromOrden: async (oid, iid) => {
    return handleResponse(await supabaseClient.from('orden_items').delete().eq('id', iid).eq('orden_id', oid));
  },

  // Servicios
  getServicios: async (page = 0, size = 10) => {
    const from = page * size;
    const to = from + size - 1;
    return handleResponse(await supabaseClient.from('servicios').select('*').range(from, to));
  },
  createServicio: async (data) => {
    return handleResponse(await supabaseClient.from('servicios').insert([data]).select().single());
  },
  updateServicio: async (id, data) => {
    return handleResponse(await supabaseClient.from('servicios').update(data).eq('id', id).select().single());
  },
  deleteServicio: async (id) => {
    return handleResponse(await supabaseClient.from('servicios').delete().eq('id', id));
  },

  // Repuestos
  getRepuestos: async (page = 0, size = 10) => {
    const from = page * size;
    const to = from + size - 1;
    return handleResponse(await supabaseClient.from('repuestos').select('*').range(from, to));
  },
  createRepuesto: async (data) => {
    return handleResponse(await supabaseClient.from('repuestos').insert([data]).select().single());
  },
  updateRepuesto: async (id, data) => {
    return handleResponse(await supabaseClient.from('repuestos').update(data).eq('id', id).select().single());
  },
  deleteRepuesto: async (id) => {
    return handleResponse(await supabaseClient.from('repuestos').delete().eq('id', id));
  },

  // Usuarios
  getUsuarios: async (page = 0, size = 10) => {
    const from = page * size;
    const to = from + size - 1;
    return handleResponse(await supabaseClient.from('usuarios').select('*').range(from, to));
  },
  createUsuario: async (data) => {
    return handleResponse(await supabaseClient.from('usuarios').insert([data]).select().single());
  },
  updateUsuario: async (id, data) => {
    return handleResponse(await supabaseClient.from('usuarios').update(data).eq('id', id).select().single());
  },
  deleteUsuario: async (id) => {
    return handleResponse(await supabaseClient.from('usuarios').delete().eq('id', id));
  },

  // Dashboard
  getDashboardStats: async () => {
    // Para simplificar, obtenemos los conteos básicos
    const [ordenesActivas, vehiculos, clientes] = await Promise.all([
      supabaseClient.from('ordenes').select('id', { count: 'exact', head: true }).in('estado', ['RECIBIDO', 'EN_PROCESO']),
      supabaseClient.from('vehiculos').select('id', { count: 'exact', head: true }),
      supabaseClient.from('clientes').select('id', { count: 'exact', head: true })
    ]);
    return {
      ordenesActivas: ordenesActivas.count || 0,
      vehiculosEnTaller: vehiculos.count || 0,
      clientesRegistrados: clientes.count || 0,
      ingresosDelMes: 0 // Requiere lógica más compleja, en cero por ahora
    };
  },
  getRecentOrdenes: async () => {
    return handleResponse(await supabaseClient.from('ordenes').select('*, vehiculos(marca, modelo, clientes(nombre, apellido))').order('fecha', { ascending: false }).limit(5));
  }
};
