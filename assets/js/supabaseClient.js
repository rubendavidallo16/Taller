// Se espera que la librería de Supabase esté definida globalmente
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

if (!window.supabase) {
  console.error("Supabase script no se ha cargado.");
} else if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  console.error("Falta configuración de Supabase en config.js");
} else {
  window.supabaseClient = supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
  );
}
