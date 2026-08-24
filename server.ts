import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// ─── Database Setup (GitHub & Local File System Mode) ───────────────────────────
const DB_PATH = path.join(process.cwd(), "data", "db.json");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "hariishwaran";
const GITHUB_REPO = process.env.GITHUB_REPO || "ss-Agency";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_FILE_PATH = "data/db.json";

interface DatabaseState {
  owners: any[];
  hoardings: any[];
  campaigns: any[];
  purchase_orders: any[];
  ledger: any[];
  flex_printing: any[];
}

let owners: any[] = [];
let hoardings: any[] = [];
let campaigns: any[] = [];
let purchase_orders: any[] = [];
let ledger: any[] = [];
let flex_printing: any[] = [];

let dbCache: DatabaseState | null = null;

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

async function loadDb(): Promise<DatabaseState> {
  if (dbCache) {
    return dbCache;
  }

  if (GITHUB_TOKEN) {
    try {
      console.log("Loading database from GitHub API...");
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (res.ok) {
        const data = await res.json() as any;
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        dbCache = JSON.parse(decoded);
        console.log("✅ Database loaded successfully from GitHub");
        return dbCache!;
      } else {
        console.error(`Failed to load db from GitHub (${res.status}): ${res.statusText}`);
      }
    } catch (err: any) {
      console.error("Error loading db from GitHub, falling back to local file:", err.message);
    }
  }

  // Fallback to local file system
  try {
    console.log("Loading database from local disk...");
    const content = fs.readFileSync(DB_PATH, "utf-8");
    dbCache = JSON.parse(content);
    console.log("✅ Database loaded successfully from disk");
    return dbCache!;
  } catch (err: any) {
    console.error("Error loading db from disk:", err.message);
    dbCache = {
      owners: [],
      hoardings: [],
      campaigns: [],
      purchase_orders: [],
      ledger: [],
      flex_printing: []
    };
    return dbCache!;
  }
}

async function saveDb(state: DatabaseState): Promise<void> {
  dbCache = state;
  const jsonString = JSON.stringify(state, null, 2);

  // Write locally if not in Vercel environment (or as a fallback)
  if (!process.env.VERCEL) {
    try {
      fs.writeFileSync(DB_PATH, jsonString, "utf-8");
      console.log("✅ Database saved to local disk");
    } catch (err: any) {
      console.error("Failed to save database to local disk:", err.message);
    }
  }

  // Push to GitHub if GITHUB_TOKEN is present
  if (GITHUB_TOKEN) {
    try {
      console.log("Saving database to GitHub API...");
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
      
      const getFileRes = await fetch(`${url}?ref=${GITHUB_BRANCH}`, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      let sha: string | undefined;
      if (getFileRes.ok) {
        const metadata = await getFileRes.json() as any;
        sha = metadata.sha;
      }

      const putRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "db: update database [skip ci]",
          content: Buffer.from(jsonString).toString("base64"),
          sha,
          branch: GITHUB_BRANCH,
        }),
      });

      if (putRes.ok) {
        console.log("✅ Database committed successfully to GitHub");
      } else {
        const errDetail = await putRes.text();
        console.error(`Failed to commit database to GitHub (${putRes.status}): ${errDetail}`);
      }
    } catch (err: any) {
      console.error("Error committing database to GitHub:", err.message);
    }
  }
}

let isSaving = false;
let saveQueue: DatabaseState[] = [];

async function queueSave() {
  const state = { owners, hoardings, campaigns, purchase_orders, ledger, flex_printing };
  if (isSaving) {
    saveQueue.push(state);
    return;
  }
  isSaving = true;
  try {
    await saveDb(state);
  } finally {
    isSaving = false;
    if (saveQueue.length > 0) {
      saveQueue.shift();
      saveQueue = [];
      queueSave();
    }
  }
}

async function initDbState() {
  const db = await loadDb();
  owners = db.owners || [];
  hoardings = db.hoardings || [];
  campaigns = db.campaigns || [];
  purchase_orders = db.purchase_orders || [];
  ledger = db.ledger || [];
  flex_printing = db.flex_printing || [];
}

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

// Ensure database state is loaded before processing requests
app.use(asyncHandler(async (_req, _res, next) => {
  await initDbState();
  next();
}));

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
    await queueSave();
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
    await queueSave();
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
    await queueSave();
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
    await queueSave();
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
    await queueSave();
    res.json(rowToHoarding(hoardings[index]));
  }));

  app.delete("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    hoardings = hoardings.filter(h => h.id !== id);
    ledger = ledger.filter(l => l.hoarding_id !== id);
    campaigns = campaigns.filter(c => c.hoarding_id !== id);
    flex_printing = flex_printing.filter(fp => fp.hoarding_id !== id);
    purchase_orders = purchase_orders.filter(po => po.hoarding_id !== id);
    await queueSave();
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
    await queueSave();
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
    await queueSave();
    res.json(campaigns[index]);
  }));

  app.delete("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    campaigns = campaigns.filter(c => c.id !== id);
    purchase_orders = purchase_orders.filter(po => po.campaign_id !== id);
    ledger = ledger.filter(l => l.campaign_id !== id);
    flex_printing = flex_printing.filter(fp => fp.campaign_id !== id);
    await queueSave();
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

    await queueSave();
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
    await queueSave();
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
    await queueSave();
    res.json(purchase_orders[index]);
  }));

  app.delete("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    purchase_orders = purchase_orders.filter(po => po.id !== req.params.id);
    await queueSave();
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
    await queueSave();
    res.status(201).json(newEntry);
  }));

  app.delete("/api/ledger/:id", requireAuth, asyncHandler(async (req, res) => {
    ledger = ledger.filter(l => l.id !== req.params.id);
    await queueSave();
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
    await queueSave();
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
    await queueSave();
    res.json(updatedOrder);
  }));

  app.delete("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    flex_printing = flex_printing.filter(fp => fp.id !== id);
    await queueSave();
    res.json({ ok: true });
  }));

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", asyncHandler(async (_req, res) => {
    res.json({ status: "ok", db: GITHUB_TOKEN ? "github" : "local-disk" });
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
