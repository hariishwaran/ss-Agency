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

const actualCampaigns = [
  {
    id: 12,
    client_info: 'one',
    start_date: '2026-10-01',
    end_date: '2026-10-31',
    hoarding_id: 1,
    internal_notes: 'Upcoming campaign',
    po_status: 'none',
    total_po_amount: 0,
    paid_po_amount: 0,
    created_at: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 13,
    client_info: 'test',
    start_date: '2026-09-01',
    end_date: '2026-10-02',
    hoarding_id: 1,
    internal_notes: 'Active campaign',
    po_status: 'none',
    total_po_amount: 0,
    paid_po_amount: 0,
    created_at: '2026-09-01T11:00:00.000Z'
  },
  {
    id: 6,
    client_info: 'Pothys Deepavali Celebration',
    start_date: '2026-09-01',
    end_date: '2026-10-31',
    hoarding_id: 1,
    internal_notes: 'Pre-bookings for festive season',
    po_status: 'pending',
    total_po_amount: 300000,
    paid_po_amount: 0,
    created_at: '2026-08-21T12:00:29.505Z'
  },
  {
    id: 7,
    client_info: 'Tata EV Punch Launch',
    start_date: '2026-08-20',
    end_date: '2026-10-20',
    hoarding_id: 1,
    internal_notes: 'Focus on clean energy marketing',
    po_status: 'partial',
    total_po_amount: 180000,
    paid_po_amount: 90000,
    created_at: '2026-08-21T12:00:29.505Z'
  },
  {
    id: 2,
    client_info: 'Airtel 5G Plus Launch',
    start_date: '2026-08-15',
    end_date: '2026-11-15',
    hoarding_id: 1,
    internal_notes: 'Visible display priority',
    po_status: 'partial',
    total_po_amount: 240000,
    paid_po_amount: 80000,
    created_at: '2026-08-21T12:00:29.505Z'
  },
  {
    id: 10,
    client_info: 'Apollo Hospitals Healthcare Checkup',
    start_date: '2026-08-12',
    end_date: '2026-09-25',
    hoarding_id: 1,
    internal_notes: 'Medical checkup packages promotion',
    po_status: 'none',
    total_po_amount: 0,
    paid_po_amount: 0,
    created_at: '2026-08-21T12:00:29.505Z'
  },
  {
    id: 3,
    client_info: 'Joyalukkas Onam Festive Sale',
    start_date: '2026-08-10',
    end_date: '2026-09-20',
    hoarding_id: 1,
    internal_notes: 'Festive banners',
    po_status: 'pending',
    total_po_amount: 90000,
    paid_po_amount: 0,
    created_at: '2026-08-21T12:00:29.505Z'
  },
  {
    id: 8,
    client_info: 'Preethi Zodiac Mixer Grinder',
    start_date: '2026-08-05',
    end_date: '2026-09-05',
    hoarding_id: 1,
    internal_notes: 'Kitchen appliances promotion',
    po_status: 'paid',
    total_po_amount: 85000,
    paid_po_amount: 85000,
    created_at: '2026-08-21T12:00:29.505Z'
  },
  {
    id: 14,
    client_info: 'test',
    start_date: '2026-09-01',
    end_date: '2026-10-01',
    hoarding_id: 1,
    internal_notes: null,
    po_status: 'none',
    total_po_amount: 0,
    paid_po_amount: 0,
    created_at: '2026-09-01T12:00:00.000Z'
  },
  {
    id: 15,
    client_info: 'test',
    start_date: '2026-09-01',
    end_date: '2026-10-01',
    hoarding_id: 1,
    internal_notes: null,
    po_status: 'none',
    total_po_amount: 0,
    paid_po_amount: 0,
    created_at: '2026-09-01T13:00:00.000Z'
  }
];

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
