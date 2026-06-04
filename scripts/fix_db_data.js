const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Delete the duplicate Renault kiwid item
  const idToDelete = '1e0d8987-f627-4928-be68-494a08517871';
  console.log(`Deleting duplicate transport item: ${idToDelete}`);
  const { error: delError } = await supabase
    .from('cash_flow')
    .delete()
    .eq('id', idToDelete);

  if (delError) {
    console.error("Failed to delete duplicate:", delError);
  } else {
    console.log("Successfully deleted duplicate transport.");
  }

  // 2. Insert the new Colchón item
  console.log("Inserting Colchón Transportes item...");
  const { error: insError } = await supabase
    .from('cash_flow')
    .insert({
      project_id: '36eb2fa9-4196-45c0-8883-d29267c8ae22',
      concept: 'Colchón Transportes',
      date: new Date().toISOString().slice(0, 10),
      amount: 68000,
      category: 'imprevistos',
      type: 'expense',
      is_projected: true,
      notes: 'Colchón reservado para transportes'
    });

  if (insError) {
    console.error("Failed to insert colchón:", insError);
  } else {
    console.log("Successfully inserted colchón.");
  }
}

run();
