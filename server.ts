import express, { Request, Response, NextFunction } from "express";
import path from "path";
import pg from "pg";

const { Pool } = pg;

// ─── Database Setup ────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ETNb9slRY6WA@ep-billowing-sound-aydq8obx-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS owners (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      email TEXT,
      payment_details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hoardings (
      id SERIAL PRIMARY KEY,
      location TEXT NOT NULL,
      city TEXT DEFAULT 'Chennai',
      width REAL NOT NULL,
      height REAL NOT NULL,
      total_area REAL GENERATED ALWAYS AS (width * height) STORED,
      owner_name TEXT,
      contact_number TEXT,
      owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
      rent_amount REAL NOT NULL,
      rent_status TEXT DEFAULT 'Pending' CHECK (rent_status IN ('Paid', 'Pending')),
      last_paid_date TEXT,
      next_due_date TEXT,
      notes TEXT,
      latitude TEXT,
      longitude TEXT,
      is_owned INTEGER DEFAULT 0,
      image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      client_info TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      hoarding_id INTEGER REFERENCES hoardings(id) ON DELETE CASCADE,
      internal_notes TEXT,
      po_status TEXT DEFAULT 'none' CHECK (po_status IN ('none', 'pending', 'partial', 'paid')),
      total_po_amount REAL DEFAULT 0,
      paid_po_amount REAL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      hoarding_id INTEGER REFERENCES hoardings(id) ON DELETE CASCADE,
      po_number TEXT NOT NULL,
      po_date TEXT NOT NULL DEFAULT CURRENT_DATE::text,
      vendor_name TEXT NOT NULL,
      description TEXT NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'cancelled')),
      payment_terms TEXT DEFAULT 'Due on Receipt',
      due_date TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      hoarding_id INTEGER REFERENCES hoardings(id) ON DELETE CASCADE,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
      po_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
      amount_paid REAL NOT NULL,
      payment_date TEXT NOT NULL,
      period_covered TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Other')),
      receipt_url TEXT,
      transaction_type TEXT DEFAULT 'other' CHECK (transaction_type IN ('po_payment', 'rent', 'other')),
      reference_number TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS flex_printing (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
      hoarding_id INTEGER REFERENCES hoardings(id) ON DELETE SET NULL,
      printing_type TEXT NOT NULL CHECK (printing_type IN ('outsource', 'own_printing')),
      flex_size TEXT,
      quantity INTEGER DEFAULT 1,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      vendor_name TEXT,
      vendor_contact TEXT,
      assignment_date TEXT,
      expected_completion TEXT,
      outsource_status TEXT CHECK (outsource_status IN ('assigned', 'in_progress', 'completed', 'delayed')),
      outsource_cost REAL,
      material_cost REAL,
      labor_cost REAL,
      total_cost REAL GENERATED ALWAYS AS (COALESCE(material_cost, 0) + COALESCE(labor_cost, 0)) STORED,
      ledger_entry_id TEXT REFERENCES ledger(id) ON DELETE SET NULL,
      payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Migrate existing data from hoardings -> owners
  try {
    await pool.query(`
      ALTER TABLE hoardings ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL;
      ALTER TABLE hoardings ALTER COLUMN owner_name DROP NOT NULL;
      ALTER TABLE hoardings ALTER COLUMN contact_number DROP NOT NULL;
    `);

    const { rows: unmigrated } = await pool.query(`
      SELECT DISTINCT owner_name, contact_number 
      FROM hoardings 
      WHERE owner_id IS NULL AND owner_name IS NOT NULL AND owner_name != ''
    `);

    for (const row of unmigrated) {
      const { rows: ownerRows } = await pool.query(`
        INSERT INTO owners (name, contact_number)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [row.owner_name, row.contact_number]);

      let ownerId;
      if (ownerRows.length > 0) {
        ownerId = ownerRows[0].id;
      } else {
        const { rows: existingOwner } = await pool.query(`
          SELECT id FROM owners WHERE name = $1 AND contact_number = $2
        `, [row.owner_name, row.contact_number]);
        if (existingOwner.length > 0) {
          ownerId = existingOwner[0].id;
        }
      }

      if (ownerId) {
        await pool.query(`
          UPDATE hoardings 
          SET owner_id = $1 
          WHERE owner_name = $2 AND contact_number = $3 AND owner_id IS NULL
        `, [ownerId, row.owner_name, row.contact_number]);
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  }

  console.log("✅ PostgreSQL database initialized");
}

initDb().catch(console.error);

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function boolToInt(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  return val ? 1 : 0;
}

function rowToHoarding(row: any) {
  if (!row) return null;
  const owner = row.owner_id ? {
    id: row.owner_id,
    name: row.owner_name_rel || row.owner_name || '',
    contact_number: row.owner_contact_rel || row.contact_number || '',
    email: row.owner_email_rel || '',
    payment_details: row.owner_payment_rel || ''
  } : undefined;

  return {
    ...row,
    total_area: row.width * row.height,
    is_owned: !!row.is_owned,
    owner_name: row.owner_name_rel || row.owner_name || '',
    contact_number: row.owner_contact_rel || row.contact_number || '',
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
    const { rows } = await pool.query("SELECT * FROM owners ORDER BY name ASC");
    res.json(rows);
  }));

  app.get("/api/owners/:id", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM owners WHERE id = $1", [req.params.id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  }));

  app.post("/api/owners", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const { rows } = await pool.query(`
      INSERT INTO owners (name, contact_number, email, payment_details)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [d.name, d.contact_number, d.email ?? null, d.payment_details ?? null]);
    res.status(201).json(rows[0]);
  }));

  app.put("/api/owners/:id", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const fields = Object.keys(d).filter(k => !["id","created_at"].includes(k));
    if (!fields.length) { res.status(400).json({ error: "No fields to update" }); return; }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = fields.map(f => d[f]);
    const { rows } = await pool.query(
      `UPDATE owners SET ${setClause} WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    res.json(rows[0]);
  }));

  app.delete("/api/owners/:id", requireAuth, asyncHandler(async (req, res) => {
    await pool.query("DELETE FROM owners WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }));

  // ── Hoardings ──────────────────────────────────────────────────────────────
  app.get("/api/hoardings", requireAuth, asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT h.*, o.name AS owner_name_rel, o.contact_number AS owner_contact_rel, o.email AS owner_email_rel, o.payment_details AS owner_payment_rel
      FROM hoardings h
      LEFT JOIN owners o ON h.owner_id = o.id
      ORDER BY h.created_at DESC
    `);
    res.json(rows.map(rowToHoarding));
  }));

  app.get("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT h.*, o.name AS owner_name_rel, o.contact_number AS owner_contact_rel, o.email AS owner_email_rel, o.payment_details AS owner_payment_rel
      FROM hoardings h
      LEFT JOIN owners o ON h.owner_id = o.id
      WHERE h.id = $1
    `, [req.params.id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rowToHoarding(rows[0]));
  }));

  app.post("/api/hoardings", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const { rows: insertRes } = await pool.query(`
      INSERT INTO hoardings (location, city, width, height, owner_name, contact_number, owner_id, rent_amount, rent_status, last_paid_date, next_due_date, notes, latitude, longitude, is_owned, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      d.location,
      d.city ?? "Chennai",
      d.width,
      d.height,
      d.owner_name ?? null,
      d.contact_number ?? null,
      d.owner_id ?? null,
      d.rent_amount,
      d.rent_status ?? "Pending",
      d.last_paid_date ?? null,
      d.next_due_date ?? null,
      d.notes ?? null,
      d.latitude ?? null,
      d.longitude ?? null,
      boolToInt(d.is_owned) ?? 0,
      d.image_url ?? null
    ]);
    
    const { rows } = await pool.query(`
      SELECT h.*, o.name AS owner_name_rel, o.contact_number AS owner_contact_rel, o.email AS owner_email_rel, o.payment_details AS owner_payment_rel
      FROM hoardings h
      LEFT JOIN owners o ON h.owner_id = o.id
      WHERE h.id = $1
    `, [insertRes[0].id]);
    res.status(201).json(rowToHoarding(rows[0]));
  }));

  app.put("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const fields = Object.keys(d).filter(k => !["id","created_at","total_area","owner"].includes(k));
    if (!fields.length) { res.status(400).json({ error: "No fields to update" }); return; }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    
    const values = fields.map(f => f === "is_owned" ? boolToInt(d[f]) : d[f]);
    await pool.query(
      `UPDATE hoardings SET ${setClause} WHERE id = $1`,
      [req.params.id, ...values]
    );

    const { rows } = await pool.query(`
      SELECT h.*, o.name AS owner_name_rel, o.contact_number AS owner_contact_rel, o.email AS owner_email_rel, o.payment_details AS owner_payment_rel
      FROM hoardings h
      LEFT JOIN owners o ON h.owner_id = o.id
      WHERE h.id = $1
    `, [req.params.id]);
    res.json(rowToHoarding(rows[0]));
  }));

  app.delete("/api/hoardings/:id", requireAuth, asyncHandler(async (req, res) => {
    await pool.query("DELETE FROM ledger WHERE hoarding_id = $1", [req.params.id]);
    await pool.query("DELETE FROM campaigns WHERE hoarding_id = $1", [req.params.id]);
    await pool.query("DELETE FROM hoardings WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }));

  // ── Campaigns ─────────────────────────────────────────────────────────────
  app.get("/api/campaigns", requireAuth, asyncHandler(async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM campaigns ORDER BY created_at DESC");
    res.json(rows);
  }));

  app.get("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM campaigns WHERE id = $1", [req.params.id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  }));

  app.get("/api/campaigns/by-hoarding/:hoardingId", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM campaigns WHERE hoarding_id = $1 ORDER BY start_date ASC", [req.params.hoardingId]);
    res.json(rows);
  }));

  app.post("/api/campaigns", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const { rows } = await pool.query(`
      INSERT INTO campaigns (client_info, start_date, end_date, hoarding_id, internal_notes, po_status, total_po_amount, paid_po_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      d.client_info, d.start_date, d.end_date, d.hoarding_id,
      d.internal_notes ?? null, "none", 0, 0
    ]);
    res.status(201).json(rows[0]);
  }));

  app.put("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const fields = Object.keys(d).filter(k => !["id","created_at"].includes(k));
    if (!fields.length) { res.status(400).json({ error: "No fields to update" }); return; }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    
    const values = fields.map(f => d[f]);
    const { rows } = await pool.query(
      `UPDATE campaigns SET ${setClause} WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    res.json(rows[0]);
  }));

  app.delete("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    await pool.query("DELETE FROM campaigns WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }));

  // Campaign PO summary refresh
  app.post("/api/campaigns/:id/refresh-po-summary", requireAuth, asyncHandler(async (req, res) => {
    const campaignId = req.params.id;
    const { rows: pos } = await pool.query("SELECT total_amount, paid_amount, status FROM purchase_orders WHERE campaign_id = $1", [campaignId]);
    const totalAmount = pos.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
    const paidAmount = pos.reduce((s: number, p: any) => s + Number(p.paid_amount), 0);
    let poStatus = "none";
    if (pos.length > 0) {
      const nonCancelled = pos.filter((p: any) => p.status !== "cancelled");
      if (nonCancelled.length === 0) poStatus = "none";
      else if (nonCancelled.every((p: any) => p.status === "paid")) poStatus = "paid";
      else if (nonCancelled.some((p: any) => p.status === "partial" || p.status === "paid")) poStatus = "partial";
      else poStatus = "pending";
    }
    const { rows } = await pool.query(
      "UPDATE campaigns SET po_status = $1, total_po_amount = $2, paid_po_amount = $3 WHERE id = $4 RETURNING *",
      [poStatus, totalAmount, paidAmount, campaignId]
    );
    res.json(rows[0]);
  }));

  // ── Purchase Orders ───────────────────────────────────────────────────────
  app.get("/api/purchase_orders", requireAuth, asyncHandler(async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM purchase_orders ORDER BY created_at DESC");
    res.json(rows);
  }));

  app.get("/api/purchase_orders/by-campaign/:campaignId", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM purchase_orders WHERE campaign_id = $1 ORDER BY created_at DESC", [req.params.campaignId]);
    res.json(rows);
  }));

  app.get("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  }));

  app.post("/api/purchase_orders", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const id = genUUID();
    const { rows } = await pool.query(`
      INSERT INTO purchase_orders (id, campaign_id, hoarding_id, po_number, po_date, vendor_name, description, total_amount, paid_amount, balance_amount, status, payment_terms, due_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      id, d.campaign_id, d.hoarding_id, d.po_number,
      d.po_date, d.vendor_name, d.description,
      d.total_amount, 0, d.total_amount,
      "draft", d.payment_terms ?? "Due on Receipt",
      d.due_date, d.notes ?? null
    ]);
    res.status(201).json(rows[0]);
  }));

  app.put("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const fields = Object.keys(d).filter(k => !["id","created_at"].includes(k));
    if (!fields.length) { res.status(400).json({ error: "No fields to update" }); return; }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    
    const values = fields.map(f => d[f]);
    const { rows } = await pool.query(
      `UPDATE purchase_orders SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    res.json(rows[0]);
  }));

  app.delete("/api/purchase_orders/:id", requireAuth, asyncHandler(async (req, res) => {
    await pool.query("DELETE FROM purchase_orders WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }));

  // ── Ledger ────────────────────────────────────────────────────────────────
  app.get("/api/ledger", requireAuth, asyncHandler(async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM ledger ORDER BY payment_date DESC");
    res.json(rows);
  }));

  app.post("/api/ledger", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const id = genUUID();
    const { rows } = await pool.query(`
      INSERT INTO ledger (id, hoarding_id, campaign_id, po_id, amount_paid, payment_date, period_covered, payment_method, receipt_url, transaction_type, reference_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      id, d.hoarding_id ?? null, d.campaign_id ?? null, d.po_id ?? null,
      d.amount_paid, d.payment_date, d.period_covered, d.payment_method,
      d.receipt_url ?? null, d.transaction_type ?? "other", d.reference_number ?? null
    ]);
    res.status(201).json(rows[0]);
  }));

  app.delete("/api/ledger/:id", requireAuth, asyncHandler(async (req, res) => {
    await pool.query("DELETE FROM ledger WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }));

  // ── Flex Printing ─────────────────────────────────────────────────────────
  app.get("/api/flex_printing", requireAuth, asyncHandler(async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM flex_printing ORDER BY created_at DESC");
    res.json(rows);
  }));

  app.get("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM flex_printing WHERE id = $1", [req.params.id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  }));

  app.post("/api/flex_printing", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const { rows } = await pool.query(`
      INSERT INTO flex_printing (campaign_id, hoarding_id, printing_type, flex_size, quantity, notes, status, vendor_name, vendor_contact, assignment_date, expected_completion, outsource_status, outsource_cost, material_cost, labor_cost, ledger_entry_id, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      d.campaign_id ?? null, d.hoarding_id ?? null, d.printing_type, d.flex_size ?? null,
      d.quantity ?? 1, d.notes ?? null, d.status ?? "pending", d.vendor_name ?? null,
      d.vendor_contact ?? null, d.assignment_date ?? null, d.expected_completion ?? null,
      d.outsource_status ?? null, d.outsource_cost ?? null, d.material_cost ?? null,
      d.labor_cost ?? null, d.ledger_entry_id ?? null, d.payment_status ?? null
    ]);
    res.status(201).json(rows[0]);
  }));

  app.put("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    const fields = Object.keys(d).filter(k => !["id","created_at","total_cost"].includes(k));
    if (!fields.length) { res.status(400).json({ error: "No fields to update" }); return; }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    
    const values = fields.map(f => d[f]);
    const { rows } = await pool.query(
      `UPDATE flex_printing SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    res.json(rows[0]);
  }));

  app.delete("/api/flex_printing/:id", requireAuth, asyncHandler(async (req, res) => {
    await pool.query("DELETE FROM flex_printing WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }));

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", asyncHandler(async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "postgres" });
    } catch (err: any) {
      res.status(500).json({ status: "error", db: "postgres", detail: err.message });
    }
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
          pool.end();
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
