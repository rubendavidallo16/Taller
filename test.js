const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hxyqiogduegbdlzgdylc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4eXFpb2dkdWVnYmRsemdkeWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDU3MjIsImV4cCI6MjA5MzY4MTcyMn0.SBYeG0nqGyuIbVTIjA2QTw9tmtXikPSUgm8vLxFdvwY');

async function test() {
  const { data, error } = await supabase.from('ordenes').select('*, vehiculos(*, clientes(*))').order('fecha', { ascending: false }).limit(5);
  console.log(JSON.stringify({ data, error }, null, 2));
}
test();
