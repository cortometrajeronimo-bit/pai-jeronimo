const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching cash_flow items to migrate...");
  const { data: items, error } = await supabase
    .from('cash_flow')
    .select('id, concept, category')
    .ilike('concept', 'Transporte:%');

  if (error) {
    console.error("Error fetching items:", error);
    process.exit(1);
  }

  console.log(`Found ${items.length} items starting with 'Transporte:'`);
  let updatedCount = 0;

  for (const item of items) {
    if (item.category !== 'transportes' && item.category !== 'transporte') {
      console.log(`Updating ${item.concept} (currently: ${item.category})`);
      const { error: updateError } = await supabase
        .from('cash_flow')
        .update({ category: 'transportes' }) // Use exact plural to match budget categories
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`Failed to update ${item.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully migrated ${updatedCount} transport items to 'transportes' category.`);
}

run();
