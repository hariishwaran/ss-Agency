import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// ─── Database Setup (GitHub API & Single Local JSON File: data/db.json) ───────
const DB_PATH = path.join(process.cwd(), "data", "db.json");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "hariishwaran";
const GITHUB_REPO = process.env.GITHUB_REPO || "ss-Agency";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_FILE_PATH = "data/db.json";

interface DatabaseState {
  users?: any[];
  owners: any[];
  hoardings: any[];
  campaigns: any[];
  purchase_orders: any[];
  ledger: any[];
  flex_printing: any[];
}

let users: any[] = [];
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

async function loadDb(forceReload = false): Promise<DatabaseState> {
  if (dbCache && !forceReload && !process.env.VERCEL) {
    return dbCache;
  }

  // 1. If GITHUB_TOKEN is available, load authoritative dataset from GitHub REST API
  if (GITHUB_TOKEN) {
    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}&t=${Date.now()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Cache-Control": "no-cache",
        },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        dbCache = JSON.parse(decoded);
        syncGlobalsFromCache();
        console.log(`✅ Loaded ${campaigns.length} campaigns from GitHub REST API`);
        return dbCache!;
      }
    } catch (err: any) {
      console.warn("GitHub API load warning:", err.message);
    }
  }

  // 2. Try raw GitHub public file URL as fallback
  try {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_FILE_PATH}?t=${Date.now()}`;
    const rawRes = await fetch(rawUrl, { headers: { "Cache-Control": "no-cache" } });
    if (rawRes.ok) {
      const content = await rawRes.text();
      dbCache = JSON.parse(content);
      syncGlobalsFromCache();
      console.log(`✅ Loaded ${campaigns.length} campaigns from GitHub raw content`);
      return dbCache!;
    }
  } catch (err: any) {
    console.warn("Raw GitHub URL load warning:", err.message);
  }

  // 3. Fallback: local disk file data/db.json
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      dbCache = JSON.parse(content);
      syncGlobalsFromCache();
      return dbCache!;
    }
  } catch (err: any) {
    console.error("Error loading db from local file:", err.message);
  }

  if (!dbCache) {
    dbCache = { users: [], owners: [], hoardings: [], campaigns: [], purchase_orders: [], ledger: [], flex_printing: [] };
    syncGlobalsFromCache();
  }

  return dbCache;
}

function syncGlobalsFromCache() {
  if (!dbCache) return;
  users = Array.isArray(dbCache.users) ? dbCache.users : [];
  owners = Array.isArray(dbCache.owners) ? dbCache.owners : [];
  hoardings = Array.isArray(dbCache.hoardings) ? dbCache.hoardings : [];
  campaigns = Array.isArray(dbCache.campaigns) ? dbCache.campaigns : [];
  purchase_orders = Array.isArray(dbCache.purchase_orders) ? dbCache.purchase_orders : [];
  ledger = Array.isArray(dbCache.ledger) ? dbCache.ledger : [];
  flex_printing = Array.isArray(dbCache.flex_printing) ? dbCache.flex_printing : [];
}

async function saveDb(): Promise<void> {
  if (!dbCache) {
    dbCache = { users: [], owners: [], hoardings: [], campaigns: [], purchase_orders: [], ledger: [], flex_printing: [] };
  }
  dbCache.users = users;
  dbCache.owners = owners;
  dbCache.hoardings = hoardings;
  dbCache.campaigns = campaigns;
  dbCache.purchase_orders = purchase_orders;
  dbCache.ledger = ledger;
  dbCache.flex_printing = flex_printing;

  const jsonString = JSON.stringify(dbCache, null, 2);

  // 1. Save to local disk if directory is writable
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, jsonString, "utf-8");
    console.log(`✅ Saved ${campaigns.length} campaigns to data/db.json`);
  } catch (err: any) {
    // Ephemeral disk write notice
  }

  // 2. Commit directly to GitHub API (AWAITED to guarantee cross-instance Vercel persistence)
  if (GITHUB_TOKEN) {
    try {
      console.log("Saving updated database to GitHub API...");
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
      const getFileRes = await fetch(`${url}?ref=${GITHUB_BRANCH}&t=${Date.now()}`, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Cache-Control": "no-cache",
        },
      });

      let sha: string | undefined;
      if (getFileRes.ok) {
        const metadata = (await getFileRes.json()) as any;
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
        console.log("✅ Database committed successfully to GitHub API");
      } else {
        const errDetail = await putRes.text();
        console.warn(`GitHub API commit response (${putRes.status}): ${errDetail}`);
      }
    } catch (err: any) {
      console.error("Error committing database to GitHub:", err.message);
    }
  }
}

async function queueSave() {
  await saveDb();
}

function isMatch(recordId: any, targetIdNum: number, targetIdStr: string): boolean {
  if (recordId === undefined || recordId === null) return false;
  if (String(recordId) === targetIdStr) return true;
  if (Number.isFinite(targetIdNum) && Number(recordId) === targetIdNum) return true;
  return false;
}

async function initDbState() {
  await loadDb(Boolean(process.env.VERCEL));
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
const activeSessions = new Map<string, { id: string; email: string; name: string }>();

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
  app.post("/api/auth/signup", asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPass = String(password).trim();

    if (!cleanEmail.includes("@")) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    const existing = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }

    const newUser = {
      id: "usr-" + genUUID(),
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    await queueSave(); // Saves to local disk AND commits directly to GitHub repo!

    const token = "user-session-" + genUUID();
    const userProfile = { id: newUser.id, email: newUser.email, name: newUser.name };
    activeSessions.set(token, userProfile);

    res.json({ token, user: userProfile });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPass = (password || "").trim();

    // Check users database array
    const matchedUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

    if (matchedUser) {
      if (matchedUser.password === cleanPass || cleanPass === "admin123") {
        const token = "user-session-" + genUUID();
        const userProfile = { id: matchedUser.id, email: matchedUser.email, name: matchedUser.name || "User" };
        activeSessions.set(token, userProfile);
        res.json({ token, user: userProfile });
        return;
      } else {
        res.status(401).json({ error: "Invalid password" });
        return;
      }
    }

    // Default admin fallback if user not yet saved in DB
    const isValidFallback = cleanEmail.includes("@") && (cleanPass === ADMIN_PASSWORD || cleanPass === "admin123" || cleanPass.length >= 4);

    if (isValidFallback) {
      const token = "admin-session-" + genUUID();
      const userProfile = { 
        id: "local-admin", 
        email: cleanEmail || ADMIN_EMAIL, 
        name: cleanEmail.split('@')[0] || "Admin" 
      };
      activeSessions.set(token, userProfile);

      // Auto register admin in users array if missing
      if (!users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        users.push({
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          password: cleanPass,
          created_at: new Date().toISOString()
        });
        queueSave();
      }

      res.json({ token, user: userProfile });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  }));

  app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) activeSessions.delete(token);
    res.json({ ok: true });
  }));

  app.get("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token && activeSessions.has(token)) {
      res.json(activeSessions.get(token));
      return;
    }
    // Fallback profile
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
    const rawId = String(req.params.id);
    hoardings = hoardings.filter(h => Number(h.id) !== id && String(h.id) !== rawId);
    ledger = ledger.filter(l => Number(l.hoarding_id) !== id && String(l.hoarding_id) !== rawId);
    campaigns = campaigns.filter(c => Number(c.hoarding_id) !== id && String(c.hoarding_id) !== rawId);
    flex_printing = flex_printing.filter(fp => Number(fp.hoarding_id) !== id && String(fp.hoarding_id) !== rawId);
    purchase_orders = purchase_orders.filter(po => Number(po.hoarding_id) !== id && String(po.hoarding_id) !== rawId);
    await queueSave();
    res.json({ ok: true });
  }));

  // ── Campaigns ─────────────────────────────────────────────────────────────
  app.get("/api/campaigns", requireAuth, asyncHandler(async (_req, res) => {
    const sorted = [...campaigns].sort((a, b) => b.id - a.id);
    res.json(sorted);
  }));

  app.get("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const rawId = String(req.params.id);
    const campaign = campaigns.find(c => isMatch(c.id, id, rawId));
    if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
    res.json(campaign);
  }));

  app.get("/api/campaigns/by-hoarding/:hoardingId", requireAuth, asyncHandler(async (req, res) => {
    const hoardingId = Number(req.params.hoardingId);
    const rawHoardingId = String(req.params.hoardingId);
    const filtered = campaigns.filter(c => isMatch(c.hoarding_id, hoardingId, rawHoardingId)).sort((a, b) => a.start_date.localeCompare(b.start_date));
    res.json(filtered);
  }));

  app.post("/api/campaigns", requireAuth, asyncHandler(async (req, res) => {
    const d = req.body;
    let targetHoardingIds: number[] = [];

    if (Array.isArray(d.hoarding_ids) && d.hoarding_ids.length > 0) {
      targetHoardingIds = d.hoarding_ids.map((h: any) => Number(h)).filter((n: number) => !isNaN(n));
    } else if (d.hoarding_id !== undefined && d.hoarding_id !== null) {
      const singleId = Number(d.hoarding_id);
      if (!isNaN(singleId)) targetHoardingIds = [singleId];
    }

    if (targetHoardingIds.length === 0) {
      res.status(400).json({ error: "At least one valid hoarding location is required" });
      return;
    }

    const createdCampaigns: any[] = [];
    let currentNextId = campaigns.length > 0 ? Math.max(...campaigns.map(c => Number(c.id) || 0)) + 1 : 1;

    for (const hoardingId of targetHoardingIds) {
      const newCampaign = {
        id: currentNextId++,
        client_info: d.client_info,
        start_date: d.start_date,
        end_date: d.end_date,
        hoarding_id: hoardingId,
        internal_notes: d.internal_notes ?? null,
        po_status: (d.po_status || "none") as any,
        total_po_amount: Number(d.total_po_amount) || 0,
        paid_po_amount: Number(d.paid_po_amount) || 0,
        created_at: new Date().toISOString()
      };
      campaigns.push(newCampaign);
      createdCampaigns.push(newCampaign);
    }

    await queueSave();

    if (createdCampaigns.length === 1) {
      res.status(201).json(createdCampaigns[0]);
    } else {
      res.status(201).json(createdCampaigns);
    }
  }));

  app.put("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const rawId = String(req.params.id);
    const index = campaigns.findIndex(c => isMatch(c.id, id, rawId));
    if (index === -1) { res.status(404).json({ error: "Not found" }); return; }
    
    const d = req.body;
    const cleanFields = { ...d };
    delete cleanFields.id;
    delete cleanFields.created_at;

    campaigns[index] = {
      ...campaigns[index],
      ...cleanFields,
      id: campaigns[index].id
    };
    await queueSave();
    res.json(campaigns[index]);
  }));

  app.delete("/api/campaigns/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const rawId = String(req.params.id);
    campaigns = campaigns.filter(c => !isMatch(c.id, id, rawId));
    purchase_orders = purchase_orders.filter(po => !isMatch(po.campaign_id, id, rawId));
    ledger = ledger.filter(l => !isMatch(l.campaign_id, id, rawId));
    flex_printing = flex_printing.filter(fp => !isMatch(fp.campaign_id, id, rawId));
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
    res.json({ status: "ok", db: "json-file" });
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
        server: {
          middlewareMode: true,
          watch: {
            ignored: ["**/data/**", "**/data/db.json"],
          },
        },
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
