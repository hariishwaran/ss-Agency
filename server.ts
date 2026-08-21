import express, { Request, Response, NextFunction } from "express";
import path from "path";

// ─── Database Setup (In-Memory Demo Mode) ───────────────────────────────────────
let owners: any[] = [
  { id: 1, name: "Arun Murugan", contact_number: "+91 94431 12345", email: "arun@muruganmedia.com", payment_details: "GPay: +91 94431 12345" },
  { id: 2, name: "K. R. Pandian", contact_number: "+91 98421 54321", email: "pandian@pandianads.com", payment_details: "HDFC A/c: 5010023491823" },
  { id: 3, name: "Meenakshi Sundaram", contact_number: "+91 99440 98765", email: "meenakshi@sundaram.org", payment_details: "UPI: sundaram@okaxis" },
  { id: 4, name: "S. S. Advertisers (Agency Owned)", contact_number: "N/A (Agency Owned)", email: "info@ssadvertisers.com", payment_details: "Internal" },
  { id: 5, name: "V. Balaji", contact_number: "+91 91234 56789", email: "balaji@balajipub.com", payment_details: "GPay: +91 91234 56789" },
  { id: 6, name: "Rajesh Kumar", contact_number: "+91 98765 43210", email: "rajesh@kumarhoardings.com", payment_details: "UPI: rajesh@okicici" },
  { id: 7, name: "Latha Swaminathan", contact_number: "+91 94440 11223", email: "latha@swamiads.com", payment_details: "SBI A/c: 20491823091" },
  { id: 8, name: "Suresh Pillai", contact_number: "+91 95000 88888", email: "suresh@pillaipub.com", payment_details: "GPay: +91 95000 88888" },
  { id: 9, name: "Devi Karumariamman Trust", contact_number: "+91 98840 99999", email: "trust@devikarumari.org", payment_details: "IOB A/c: 08291029302" },
  { id: 10, name: "P. R. Muthu", contact_number: "+91 97900 12345", email: "muthu@muthupromos.com", payment_details: "UPI: muthu@okhdfcbank" }
];

let hoardings: any[] = [
  { id: 1, location: "Goripalayam AV Bridge, Madurai", city: "Madurai", width: 22, height: 30, owner_id: 1, rent_amount: 25000, rent_status: "Paid", last_paid_date: "2026-08-01", next_due_date: "2026-09-01", notes: "Premium location with high traffic", latitude: "9.9252", longitude: "78.1198", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Goripalayam%20AV%20Bridge%20%2022x30.jpg" },
  { id: 2, location: "Kalavasal Junction Over Bridge, Madurai", city: "Madurai", width: 40, height: 25, owner_id: 2, rent_amount: 35000, rent_status: "Pending", last_paid_date: "2026-07-15", next_due_date: "2026-08-15", notes: "Visible from both sides", latitude: "9.9234", longitude: "78.0954", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Kalavasal%20Guru%20Theater%20Vaigai%20Over%20Bridge%20%2040x25.jpg" },
  { id: 3, location: "Airport Mandela Nagar Junction, Madurai", city: "Madurai", width: 60, height: 30, owner_id: 3, rent_amount: 45000, rent_status: "Paid", last_paid_date: "2026-08-05", next_due_date: "2026-09-05", notes: "Main airport approach road", latitude: "9.8345", longitude: "78.0912", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Airport%20Mandela%20Nagar%20Junction%20%2060x30.jpg" },
  { id: 4, location: "Anna Nagar Suguna Stores, Madurai", city: "Madurai", width: 20, height: 30, owner_id: 4, rent_amount: 0, rent_status: "Paid", last_paid_date: "", next_due_date: "", notes: "Agency owned hoarding, zero rent cost", latitude: "9.9189", longitude: "78.1402", is_owned: 1, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Anna%20Nagar%20Suguna%20Stores%2020x30.jpg" },
  { id: 5, location: "Mattuthavani Bus Stand Opp Saravana Stores, Madurai", city: "Madurai", width: 47, height: 28, owner_id: 5, rent_amount: 30000, rent_status: "Pending", last_paid_date: "2026-07-01", next_due_date: "2026-08-01", notes: "Very crowded area, commercial zone", latitude: "9.9401", longitude: "78.1565", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Mattuthavani%20Bus%20Stand%20Nr%20Saravana%20Stores%2047x28.jpg" },
  { id: 6, location: "Railway Station Over Bridge, Chennai", city: "Chennai", width: 30, height: 20, owner_id: 6, rent_amount: 50000, rent_status: "Paid", last_paid_date: "2026-08-10", next_due_date: "2026-09-10", notes: "Located near Central Station", latitude: "13.0827", longitude: "80.2707", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Anna%20Salai%20Teynampet%2030x20.jpg" },
  { id: 7, location: "Gandhipuram Signal, Coimbatore", city: "Coimbatore", width: 45, height: 20, owner_id: 7, rent_amount: 40000, rent_status: "Pending", last_paid_date: "2026-07-20", next_due_date: "2026-08-20", notes: "Prime commercial junction in Coimbatore", latitude: "11.0168", longitude: "76.9558", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Coimbatore%20Karanampettai%2060x25.jpg" },
  { id: 8, location: "Tirunelveli Junction Arch, Tirunelveli", city: "Tirunelveli", width: 50, height: 25, owner_id: 8, rent_amount: 28000, rent_status: "Paid", last_paid_date: "2026-08-03", next_due_date: "2026-09-03", notes: "Excellent visibility at entry arch", latitude: "8.7284", longitude: "77.6891", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Tirunelveli%20Junction%2050x25.jpg" },
  { id: 9, location: "Vilakkuthoon Junction, Madurai", city: "Madurai", width: 30, height: 30, owner_id: 9, rent_amount: 18000, rent_status: "Paid", last_paid_date: "2026-08-01", next_due_date: "2026-09-01", notes: "Historical trade hub, retail crowd", latitude: "9.9154", longitude: "78.1251", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Vilakuthun%20Signal%2030x30.jpg" },
  { id: 10, location: "Sethupathi School Simmakkal, Madurai", city: "Madurai", width: 45, height: 28, owner_id: 10, rent_amount: 22000, rent_status: "Pending", last_paid_date: "2026-07-10", next_due_date: "2026-08-10", notes: "Near busy Simmakkal market area", latitude: "9.9231", longitude: "78.1228", is_owned: 0, image_url: "https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/Sethupathi%20School%20Simmakkal%2045x28.jpg" }
];

let campaigns: any[] = [
  { id: 1, client_info: "HDFC Bank Home Loan", start_date: "2026-08-01", end_date: "2026-09-30", hoarding_id: 1, internal_notes: "Regular campaign, monthly inspection required", po_status: "paid", total_po_amount: 120000, paid_po_amount: 120000, created_at: new Date().toISOString() },
  { id: 2, client_info: "Airtel 5G Plus Launch", start_date: "2026-08-15", end_date: "2026-11-15", hoarding_id: 2, internal_notes: "Visible display priority", po_status: "partial", total_po_amount: 240000, paid_po_amount: 80000, created_at: new Date().toISOString() },
  { id: 3, client_info: "Joyalukkas Onam Festive Sale", start_date: "2026-08-10", end_date: "2026-09-10", hoarding_id: 3, internal_notes: "Festive banners", po_status: "pending", total_po_amount: 90000, paid_po_amount: 0, created_at: new Date().toISOString() },
  { id: 4, client_info: "TVS Raider 125 Promo", start_date: "2026-08-01", end_date: "2026-08-31", hoarding_id: 4, internal_notes: "Agency-owned hoarding promo", po_status: "none", total_po_amount: 0, paid_po_amount: 0, created_at: new Date().toISOString() },
  { id: 5, client_info: "Saravana Stores Aadi Discount", start_date: "2026-07-15", end_date: "2026-08-15", hoarding_id: 5, internal_notes: "Discount campaign next to store", po_status: "paid", total_po_amount: 150000, paid_po_amount: 150000, created_at: new Date().toISOString() },
  { id: 6, client_info: "Pothys Deepavali Celebration", start_date: "2026-09-01", end_date: "2026-10-31", hoarding_id: 6, internal_notes: "Pre-bookings for festive season", po_status: "pending", total_po_amount: 300000, paid_po_amount: 0, created_at: new Date().toISOString() },
  { id: 7, client_info: "Tata EV Punch Launch", start_date: "2026-08-20", end_date: "2026-10-20", hoarding_id: 7, internal_notes: "Focus on clean energy marketing", po_status: "partial", total_po_amount: 180000, paid_po_amount: 90000, created_at: new Date().toISOString() },
  { id: 8, client_info: "Preethi Zodiac Mixer Grinder", start_date: "2026-08-05", end_date: "2026-09-05", hoarding_id: 8, internal_notes: "Kitchen appliances promotion", po_status: "paid", total_po_amount: 85000, paid_po_amount: 85000, created_at: new Date().toISOString() },
  { id: 9, client_info: "Aasan Classes IIT-JEE Admissions", start_date: "2026-05-01", end_date: "2026-08-31", hoarding_id: 9, internal_notes: "Educational season hoarding", po_status: "paid", total_po_amount: 200000, paid_po_amount: 200000, created_at: new Date().toISOString() },
  { id: 10, client_info: "Apollo Hospitals Healthcare Checkup", start_date: "2026-08-12", end_date: "2026-09-12", hoarding_id: 10, internal_notes: "Medical checkup packages promotion", po_status: "none", total_po_amount: 0, paid_po_amount: 0, created_at: new Date().toISOString() }
];

let purchase_orders: any[] = [
  { id: "po-1", campaign_id: 1, hoarding_id: 1, po_number: "PO-HDFC-2026-001", po_date: "2026-08-01", vendor_name: "HDFC Bank Ltd", description: "Home Loan Promotion on Goripalayam Hoarding", total_amount: 120000, paid_amount: 120000, balance_amount: 0, status: "paid", payment_terms: "Due on Receipt", due_date: "2026-08-15", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "po-2", campaign_id: 2, hoarding_id: 2, po_number: "PO-AIRTEL-2026-015", po_date: "2026-08-15", vendor_name: "Bharti Airtel Ltd", description: "5G Launch on Kalavasal Junction", total_amount: 240000, paid_amount: 80000, balance_amount: 160000, status: "partial", payment_terms: "Net 30", due_date: "2026-09-15", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

let ledger: any[] = [
  { id: "ledger-1", hoarding_id: 1, campaign_id: 1, po_id: "po-1", amount_paid: 120000, payment_date: "2026-08-05", period_covered: "Aug - Sept 2026", payment_method: "Bank Transfer", receipt_url: null, transaction_type: "po_payment", reference_number: "TXN10293021", created_at: new Date().toISOString() },
  { id: "ledger-2", hoarding_id: 2, campaign_id: 2, po_id: "po-2", amount_paid: 80000, payment_date: "2026-08-20", period_covered: "First Month Advance", payment_method: "UPI", receipt_url: null, transaction_type: "po_payment", reference_number: "TXN992019", created_at: new Date().toISOString() }
];

let flex_printing: any[] = [
  { id: 1, campaign_id: 1, hoarding_id: 1, printing_type: "own_printing", flex_size: "22x30 ft", quantity: 1, notes: "Matte finish", status: "completed", vendor_name: null, vendor_contact: null, assignment_date: "2026-07-28", expected_completion: "2026-07-31", outsource_status: null, outsource_cost: 0, material_cost: 4500, labor_cost: 1500, total_cost: 6000, payment_status: "paid", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, campaign_id: 2, hoarding_id: 2, printing_type: "outsource", flex_size: "40x25 ft", quantity: 1, notes: "Glossy print", status: "in_progress", vendor_name: "Bright Flex Printers", vendor_contact: "9843210928", assignment_date: "2026-08-16", expected_completion: "2026-08-20", outsource_status: "in_progress", outsource_cost: 8500, material_cost: 0, labor_cost: 0, total_cost: 0, payment_status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function boolToInt(val: unknown): number {
  if (val === undefined || val === null) return 0;
  return val ? 1 : 0;
}

function rowToHoarding(row: any) {
  if (!row) return null;
  const owner = row.owner_id ? owners.find(o => o.id === row.owner_id) : undefined;

  return {
    ...row,
    total_area: row.width * row.height,
    is_owned: !!row.is_owned,
    owner_name: owner?.name || row.owner_name || '',
    contact_number: owner?.contact_number || row.contact_number || '',
    owner
  };
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "admin@admanager.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_USER = { id: "local-admin", email: ADMIN_EMAIL, name: "Admin" };

// ─── Express App ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "10mb" }));

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

// ── Auth middleware ────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || token.trim() === "" || token === "null" || token === "undefined") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

  // ── Auth Routes ───────────────────────────────────────────────────────────
  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = "admin-session-" + genUUID();
      res.json({ token, user: ADMIN_USER });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  }));

  app.post("/api/auth/logout", asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  }));

  app.get("/api/auth/me", requireAuth, asyncHandler(async (_req, res) => {
    res.json(ADMIN_USER);
  }));

  // ── Owners ─────────────────────────────────────────────────────────────────
  app.get("/api/owners", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...owners].sort((a, b) => a.name.localeCompare(b.name));
    res.json(sorted);
  }));

  app.get("/api/owners/:id", requireAuth, asyncHandler(async (req, res) => {
    const owner = owners.find(o => o.id === Number(req.params.id));
    if (!owner) { res.status(404).json({ error: "Not found" }); return; }
    res.json(owner);
  }));

  app.post("/api/owners", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const nextId = owners.length > 0 ? Math.max(...owners.map(o => o.id)) + 1 : 1;
    const newOwner = {
      id: nextId,
      name: d.name,
      contact_number: d.contact_number,
      email: d.email ?? null,
      payment_details: d.payment_details ?? null,
      created_at: new Date().toISOString()
    };
    owners.push(newOwner);
    res.status(201).json(newOwner);
  }));

  app.put("/api/owners/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const index = owners.findIndex(o => o.id === id);
    if (index === -1) { res.status(404).json({ error: "Not found" }); return; }
    
    const d = req.body;
    owners[index] = {
      ...owners[index],
      ...d,
      id // retain original id
    };
    res.json(owners[index]);
  }));

  app.delete("/api/owners/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    owners = owners.filter(o => o.id !== id);
    hoardings.forEach(h => {
      if (h.owner_id === id) {
        h.owner_id = null;
      }
    });
    res.json({ ok: true });
  }));

  // ── Hoardings ──────────────────────────────────────────────────────────────
  app.get("/api/hoardings", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...hoardings].sort((a, b) => b.id - a.id);
    res.json(sorted.map(rowToHoarding));
  }));

  app.get("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    const hoarding = hoardings.find(h => h.id === Number(req.params.id));
    if (!hoarding) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rowToHoarding(hoarding));
  }));

  app.post("/api/hoardings", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const nextId = hoardings.length > 0 ? Math.max(...hoardings.map(h => h.id)) + 1 : 1;
    const newHoarding = {
      id: nextId,
      location: d.location,
      city: d.city ?? "Chennai",
      width: Number(d.width),
      height: Number(d.height),
      owner_name: d.owner_name ?? null,
      contact_number: d.contact_number ?? null,
      owner_id: d.owner_id ? Number(d.owner_id) : null,
      rent_amount: Number(d.rent_amount),
      rent_status: d.rent_status ?? "Pending",
      last_paid_date: d.last_paid_date ?? null,
      next_due_date: d.next_due_date ?? null,
      notes: d.notes ?? null,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      is_owned: boolToInt(d.is_owned),
      image_url: d.image_url ?? null,
      created_at: new Date().toISOString()
    };
    hoardings.push(newHoarding);
    res.status(201).json(rowToHoarding(newHoarding));
  }));

  app.put("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const index = hoardings.findIndex(h => h.id === id);
    if (index === -1) { res.status(404).json({ error: "Not found" }); return; }
    
    const d = req.body;
    const cleanFields = { ...d };
    delete cleanFields.id;
    delete cleanFields.created_at;
    delete cleanFields.total_area;
    delete cleanFields.owner;

    if (cleanFields.is_owned !== undefined) {
      cleanFields.is_owned = boolToInt(cleanFields.is_owned);
    }

    hoardings[index] = {
      ...hoardings[index],
      ...cleanFields,
      id // retain original id
    };
    res.json(rowToHoarding(hoardings[index]));
  }));

  app.delete("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    hoardings = hoardings.filter(h => h.id !== id);
    ledger = ledger.filter(l => l.hoarding_id !== id);
    campaigns = campaigns.filter(c => c.hoarding_id !== id);
    flex_printing = flex_printing.filter(fp => fp.hoarding_id !== id);
    purchase_orders = purchase_orders.filter(po => po.hoarding_id !== id);
    res.json({ ok: true });
  }));

  // ── Campaigns ─────────────────────────────────────────────────────────────
  app.get("/api/campaigns", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...campaigns].sort((a, b) => b.id - a.id);
    res.json(sorted);
  }));

  app.get("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const campaign = campaigns.find(c => c.id === Number(req.params.id));
    if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
    res.json(campaign);
  }));

  app.get("/api/campaigns/by-hoarding/:hoardingId", requireAuth, asyncHandler(async (req, res) => {
    const hoardingId = Number(req.params.hoardingId);
    const filtered = campaigns.filter(c => c.hoarding_id === hoardingId).sort((a, b) => a.start_date.localeCompare(b.start_date));
    res.json(filtered);
  }));

  app.post("/api/campaigns", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const nextId = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1;
    const newCampaign = {
      id: nextId,
      client_info: d.client_info,
      start_date: d.start_date,
      end_date: d.end_date,
      hoarding_id: Number(d.hoarding_id),
      internal_notes: d.internal_notes ?? null,
      po_status: "none" as const,
      total_po_amount: 0,
      paid_po_amount: 0,
      created_at: new Date().toISOString()
    };
    campaigns.push(newCampaign);
    res.status(201).json(newCampaign);
  }));

  app.put("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const index = campaigns.findIndex(c => c.id === id);
    if (index === -1) { res.status(404).json({ error: "Not found" }); return; }
    
    const d = req.body;
    const cleanFields = { ...d };
    delete cleanFields.id;
    delete cleanFields.created_at;

    campaigns[index] = {
      ...campaigns[index],
      ...cleanFields,
      id
    };
    res.json(campaigns[index]);
  }));

  app.delete("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    campaigns = campaigns.filter(c => c.id !== id);
    purchase_orders = purchase_orders.filter(po => po.campaign_id !== id);
    ledger = ledger.filter(l => l.campaign_id !== id);
    flex_printing = flex_printing.filter(fp => fp.campaign_id !== id);
    res.json({ ok: true });
  }));

  // Campaign PO summary refresh
  app.post("/api/campaigns/:id/refresh-po-summary", requireAuth, asyncHandler(async (req, res) => {
    const campaignId = Number(req.params.id);
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campaignIndex === -1) { res.status(404).json({ error: "Not found" }); return; }

    const pos = purchase_orders.filter(po => po.campaign_id === campaignId);
    const totalAmount = pos.reduce((s, p) => s + Number(p.total_amount), 0);
    const paidAmount = pos.reduce((s, p) => s + Number(p.paid_amount), 0);
    let poStatus = "none";
    if (pos.length > 0) {
      const nonCancelled = pos.filter(p => p.status !== "cancelled");
      if (nonCancelled.length === 0) poStatus = "none";
      else if (nonCancelled.every(p => p.status === "paid")) poStatus = "paid";
      else if (nonCancelled.some(p => p.status === "partial" || p.status === "paid")) poStatus = "partial";
      else poStatus = "pending";
    }

    campaigns[campaignIndex].po_status = poStatus as any;
    campaigns[campaignIndex].total_po_amount = totalAmount;
    campaigns[campaignIndex].paid_po_amount = paidAmount;

    res.json(campaigns[campaignIndex]);
  }));

  // ── Purchase Orders ───────────────────────────────────────────────────────
  app.get("/api/purchase_orders", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...purchase_orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(sorted);
  }));

  app.get("/api/purchase_orders/by-campaign/:campaignId", requireAuth, asyncHandler(async (req, res) => {
    const campaignId = Number(req.params.campaignId);
    const filtered = purchase_orders.filter(po => po.campaign_id === campaignId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(filtered);
  }));

  app.get("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    const po = purchase_orders.find(p => p.id === req.params.id);
    if (!po) { res.status(404).json({ error: "Not found" }); return; }
    res.json(po);
  }));

  app.post("/api/purchase_orders", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const id = genUUID();
    const newPO = {
      id,
      campaign_id: Number(d.campaign_id),
      hoarding_id: Number(d.hoarding_id),
      po_number: d.po_number,
      po_date: d.po_date,
      vendor_name: d.vendor_name,
      description: d.description,
      total_amount: Number(d.total_amount),
      paid_amount: 0,
      balance_amount: Number(d.total_amount),
      status: "draft" as const,
      payment_terms: d.payment_terms ?? "Due on Receipt",
      due_date: d.due_date,
      notes: d.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    purchase_orders.push(newPO);
    res.status(201).json(newPO);
  }));

  app.put("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    const index = purchase_orders.findIndex(po => po.id === req.params.id);
    if (index === -1) { res.status(404).json({ error: "Not found" }); return; }

    const d = req.body;
    const cleanFields = { ...d };
    delete cleanFields.id;
    delete cleanFields.created_at;

    purchase_orders[index] = {
      ...purchase_orders[index],
      ...cleanFields,
      updated_at: new Date().toISOString(),
      id: req.params.id
    };
    res.json(purchase_orders[index]);
  }));

  app.delete("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    purchase_orders = purchase_orders.filter(po => po.id !== req.params.id);
    res.json({ ok: true });
  }));

  // ── Ledger ────────────────────────────────────────────────────────────────
  app.get("/api/ledger", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...ledger].sort((a, b) => b.payment_date.localeCompare(a.payment_date));
    res.json(sorted);
  }));

  app.post("/api/ledger", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const id = genUUID();
    const newEntry = {
      id,
      hoarding_id: d.hoarding_id ? Number(d.hoarding_id) : null,
      campaign_id: d.campaign_id ? Number(d.campaign_id) : null,
      po_id: d.po_id ?? null,
      amount_paid: Number(d.amount_paid),
      payment_date: d.payment_date,
      period_covered: d.period_covered,
      payment_method: d.payment_method as any,
      receipt_url: d.receipt_url ?? null,
      transaction_type: d.transaction_type ?? "other",
      reference_number: d.reference_number ?? null,
      created_at: new Date().toISOString()
    };
    ledger.push(newEntry);
    res.status(201).json(newEntry);
  }));

  app.delete("/api/ledger/:id", requireAuth, asyncHandler(async (req, res) => {
    ledger = ledger.filter(l => l.id !== req.params.id);
    res.json({ ok: true });
  }));

  // ── Flex Printing ─────────────────────────────────────────────────────────
  app.get("/api/flex_printing", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...flex_printing].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(sorted);
  }));

  app.get("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    const order = flex_printing.find(fp => fp.id === Number(req.params.id));
    if (!order) { res.status(404).json({ error: "Not found" }); return; }
    res.json(order);
  }));

  app.post("/api/flex_printing", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const nextId = flex_printing.length > 0 ? Math.max(...flex_printing.map(fp => fp.id)) + 1 : 1;
    const newOrder = {
      id: nextId,
      campaign_id: d.campaign_id ? Number(d.campaign_id) : null,
      hoarding_id: d.hoarding_id ? Number(d.hoarding_id) : null,
      printing_type: d.printing_type,
      flex_size: d.flex_size ?? null,
      quantity: d.quantity ? Number(d.quantity) : 1,
      notes: d.notes ?? null,
      status: d.status ?? "pending",
      vendor_name: d.vendor_name ?? null,
      vendor_contact: d.vendor_contact ?? null,
      assignment_date: d.assignment_date ?? null,
      expected_completion: d.expected_completion ?? null,
      outsource_status: d.outsource_status ?? null,
      outsource_cost: d.outsource_cost ? Number(d.outsource_cost) : null,
      material_cost: d.material_cost ? Number(d.material_cost) : null,
      labor_cost: d.labor_cost ? Number(d.labor_cost) : null,
      total_cost: (d.material_cost ? Number(d.material_cost) : 0) + (d.labor_cost ? Number(d.labor_cost) : 0),
      ledger_entry_id: d.ledger_entry_id ?? null,
      payment_status: d.payment_status ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    flex_printing.push(newOrder);
    res.status(201).json(newOrder);
  }));

  app.put("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const index = flex_printing.findIndex(fp => fp.id === id);
    if (index === -1) { res.status(404).json({ error: "Not found" }); return; }

    const d = req.body;
    const cleanFields = { ...d };
    delete cleanFields.id;
    delete cleanFields.created_at;
    delete cleanFields.total_cost;

    const updatedOrder = {
      ...flex_printing[index],
      ...cleanFields,
      updated_at: new Date().toISOString(),
      id
    };

    updatedOrder.total_cost = (updatedOrder.material_cost ? Number(updatedOrder.material_cost) : 0) + (updatedOrder.labor_cost ? Number(updatedOrder.labor_cost) : 0);

    flex_printing[index] = updatedOrder;
    res.json(updatedOrder);
  }));

  app.delete("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    flex_printing = flex_printing.filter(fp => fp.id !== id);
    res.json({ ok: true });
  }));

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", asyncHandler(async (_req, res) => {
    res.json({ status: "ok", db: "in-memory-mock" });
  }));

  // Serve location images
  app.use("/location_images", express.static(path.join(process.cwd(), "location_images")));

  export default app; // Export for Vercel

  // ─── Server Startup (Local only) ─────────────────────────────────────────────
  async function setupViteAndListen() {
    if (process.env.VERCEL) return;

    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  // ─── Global Error Handler ───────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  });

  if (!process.env.VERCEL) {
    setupViteAndListen().then(() => {
      const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📦 Login: admin@admanager.com / admin123`);
      });

      const shutdown = (signal: string) => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
          process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
      };

      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));
    }).catch(err => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
  }
