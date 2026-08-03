import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbgocfkaedkepblwivc.supabase.co';
const supabaseKey = 'sb_publishable_q1WIBSIzHV4lNdg3nEcdnQ_gDDDLPn4';
const supabase = createClient(supabaseUrl, supabaseKey);

// Delete in order: child tables first, then parent tables
const tables = [
  'flex_printing',
  'purchase_orders',
  'ledger',
  'campaigns',
  'hoardings',
  'notifications',
];

async function clearAllData() {
  console.log('🗑️  Clearing ALL data from the database...\n');

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete()
      .neq('id', -999999); // deletes all rows

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log(`⏭️  Table "${table}" does not exist, skipping.`);
      } else {
        console.error(`❌ Error clearing "${table}":`, error.message);
      }
    } else {
      console.log(`✅ Cleared table: ${table}`);
    }
  }

  console.log('\n🎉 All data has been wiped from the database!');
}

clearAllData();
