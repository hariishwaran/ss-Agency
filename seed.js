import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const hoardingsData = [
  { city: 'Madurai', location: 'Goripalayam AV Bridge ', width: 22, height: 30 },
  { city: 'Madurai', location: 'Kalavasal Guru Theater Vaigai Over Bridge ', width: 40, height: 25 },
  { city: 'Madurai', location: 'Airport Mandela Nagar Junction ', width: 60, height: 30 },
  { city: 'Madurai', location: 'Airport Road  Nr HCL (Towards Madurai) ', width: 95, height: 30 },
  { city: 'Madurai', location: 'Airport Road Nr HCL ', width: 95, height: 30 },
  { city: 'Madurai', location: 'Mattuthavani Bus Stand Nr Saravana Stores', width: 47, height: 28 },
  { city: 'Madurai', location: 'Mattuthavani Bus Stand Nr Saravana Stores', width: 47, height: 25 },
  { city: 'Madurai', location: 'Anna Nagar Vandiyur Toll Gate ', width: 20, height: 25 },
  { city: 'Madurai', location: 'Anna Nagar Vadiyur Toll Gate Opp RIO Hospital Towards Airport  ', width: 20, height: 25 },
  { city: 'Madurai', location: 'Vandiyur Toll Gate Towards Madurai City', width: 40, height: 30 },
  { city: 'Madurai', location: 'Arapalayam Junction', width: 20, height: 30 },
  { city: 'Madurai', location: 'Anna Nagar Apollo', width: 33, height: 33 }
].map((item, idx) => ({
  id: idx + 1,
  ...item,
  owner_id: 1,
  owner_name: 'SS Advertisers',
  contact_number: '+91 94431 12345',
  rent_amount: 0,
  rent_status: 'Paid',
  last_paid_date: '',
  next_due_date: '',
  notes: 'Seeded hoarding inventory',
  latitude: '',
  longitude: '',
  is_owned: 1,
  created_at: new Date().toISOString()
}));

const actualCampaigns = [];

function seedDatabase() {
  console.log('🌱 Seeding data/db.json database with actual dataset...');

  let dbState = {
    users: [
      {
        id: "usr-admin-1",
        name: "Admin User",
        email: "admin@admanager.com",
        password: "admin123",
        created_at: new Date().toISOString()
      },
      {
        id: "usr-admin-2",
        name: "Admin Gmail",
        email: "admin@gmail.com",
        password: "admin123",
        created_at: new Date().toISOString()
      }
    ],
    owners: [
      {
        id: 1,
        name: "SS Advertisers",
        contact_number: "+91 94431 12345",
        email: "info@ssadvertisers.com",
        payment_details: "Internal / Agency Owned"
      }
    ],
    hoardings: hoardingsData,
    campaigns: actualCampaigns,
    purchase_orders: [],
    ledger: [],
    flex_printing: []
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(dbState, null, 2), "utf-8");
  console.log('✅ Successfully seeded data/db.json with actual campaign dataset.');
}

seedDatabase();
