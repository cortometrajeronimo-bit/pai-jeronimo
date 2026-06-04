const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const MAPA = {
  "financiacion": "imprevistos",
  "desarrollo": "honorarios",
  "pre-produccion": "honorarios",
  "produccion": "honorarios",
  "post-produccion": "honorarios",
  "transporte": "transportes",
  "alimentacion": "catering",
  "locacion": "materiales-locaciones",
  "otros": "imprevistos"
};

async function run() {
  console.log("Fetching ALL cash_flow items to migrate legacy categories...");
  const { data: items, error } = await supabase
    .from('cash_flow')
    .select('id, concept, category');

  if (error) {
    console.error("Error fetching items:", error);
    process.exit(1);
  }

  let updatedCount = 0;

  for (const item of items) {
    const oldCat = item.category?.toLowerCase() || "";
    if (MAPA[oldCat]) {
      const newCat = MAPA[oldCat];
      console.log(`Updating '${item.concept}' from '${oldCat}' to '${newCat}'`);
      const { error: updateError } = await supabase
        .from('cash_flow')
        .update({ category: newCat })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`Failed to update ${item.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully migrated ${updatedCount} legacy items to strict categories.`);
}

run();
