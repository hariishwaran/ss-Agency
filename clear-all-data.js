import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

function clearAllData() {
  console.log('🗑️  Clearing ALL data from data/db.json...\n');

  const emptyState = {
    users: [],
    owners: [],
    hoardings: [],
    campaigns: [],
    purchase_orders: [],
    ledger: [],
    flex_printing: []
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(emptyState, null, 2), 'utf-8');
  console.log('🎉 All data has been wiped from data/db.json!');
}

clearAllData();
