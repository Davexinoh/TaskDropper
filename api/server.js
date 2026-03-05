"use strict";

const express = require("express");
const cors = require("cors");
const { init, run, get, all } = require("./db");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" })); // allow base64 attachments

const ADMIN_KEY = process.env.ADMIN_KEY || "intercomdesk-admin";
const PORT = process.env.PORT || 10000;

function now() {
  return Date.now();
}

function makeId() {
  // short + readable
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  const tail = String(Date.now()).slice(-4);
  return `ICD-${rnd}-${tail}`;
}

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.get("/", (req, res) => res.send("IntercomDesk API (SQLite) is running ✅"));

// ---------- Public: Categories ----------
app.get("/api/categories", async (req, res) => {
  const cats = await all(`SELECT id, name FROM categories ORDER BY name ASC;`);
  res.json(cats);
});

app.get("/api/categories/:id", async (req, res) => {
  const id = req.params.id;
  const issues = await all(`SELECT issue FROM category_issues WHERE category_id = ? ORDER BY issue ASC;`, [id]);
  res.json(issues.map(x => x.issue));
});

// ---------- Public: Create ticket ----------
app.post("/api/complaints", async (req, res) => {
  try {
    const { category, subIssue, priority, description, attachments, tags } = req.body;

    if (!category || !subIssue || !description) {
      return res.status(400).json({ error: "missing fields" });
    }

    const cat = await get(`SELECT id FROM categories WHERE id = ?;`, [category]);
    if (!cat) return res.status(400).json({ error: "invalid category" });

    const id = makeId();
    const createdAt = now();
    const pr = priority || "normal";
    const st = "pending";

    await run(
      `INSERT INTO tickets (id, category_id, sub_issue, priority, status, description, created_at, updated_at, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, category, subIssue, pr, st, description, createdAt, createdAt, (tags || "").trim()]
    );

    await run(`INSERT INTO timeline (ticket_id, event, at) VALUES (?, ?, ?);`, [id, "created", createdAt]);

    // Attachments: up to 3, data_url base64
    if (Array.isArray(attachments)) {
      const limited = attachments.slice(0, 3);
      for (const a of limited) {
        if (!a || !a.data || !a.name) continue;
        await run(
          `INSERT INTO attachments (ticket_id, name, mime, data_url, at) VALUES (?, ?, ?, ?, ?);`,
          [id, String(a.name), String(a.type || "application/octet-stream"), String(a.data), createdAt]
        );
      }
    }

    res.json({ success: true, reference: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

// ---------- Public: Get ticket ----------
app.get("/api/complaints/:id", async (req, res) => {
  const id = req.params.id;

  const t = await get(
    `SELECT id, category_id AS category, sub_issue AS subIssue, priority, status, description,
            created_at AS createdAt, updated_at AS updatedAt, admin_reply AS adminReply, tags
     FROM tickets WHERE id = ?;`,
    [id]
  );

  if (!t) return res.status(404).json({ error: "not found" });

  const timeline = await all(`SELECT event, at FROM timeline WHERE ticket_id = ? ORDER BY at ASC;`, [id]);
  const messages = await all(`SELECT sender, body AS text, at FROM messages WHERE ticket_id = ? ORDER BY at ASC;`, [id]);
  const attachments = await all(`SELECT name, mime AS type, data_url AS data, at FROM attachments WHERE ticket_id = ? ORDER BY at ASC;`, [id]);

  res.json({ ...t, timeline, messages, attachments });
});

// ---------- Public: User message ----------
app.post("/api/complaints/:id/message", async (req, res) => {
  const id = req.params.id;
  const { text } = req.body;

  const t = await get(`SELECT id FROM tickets WHERE id = ?;`, [id]);
  if (!t) return res.status(404).json({ error: "not found" });

  if (!text || !String(text).trim()) return res.status(400).json({ error: "empty" });

  const at = now();
  await run(`INSERT INTO messages (ticket_id, sender, body, at) VALUES (?, ?, ?, ?);`, [id, "user", String(text).trim(), at]);
  await run(`UPDATE tickets SET updated_at = ? WHERE id = ?;`, [at, id]);

  res.json({ success: true });
});

// ---------- Admin: List tickets (with filters) ----------
app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
  const { q, status, priority, category } = req.query;

  let where = [];
  let params = [];

  if (status) { where.push(`status = ?`); params.push(status); }
  if (priority) { where.push(`priority = ?`); params.push(priority); }
  if (category) { where.push(`category_id = ?`); params.push(category); }

  if (q) {
    where.push(`(id LIKE ? OR description LIKE ? OR sub_issue LIKE ? OR tags LIKE ? OR assigned_to LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  const sql = `
    SELECT id, category_id AS category, sub_issue AS subIssue, priority, status,
           created_at AS createdAt, updated_at AS updatedAt, tags, assigned_to AS assignedTo
    FROM tickets
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY updated_at DESC;
  `;

  const rows = await all(sql, params);
  res.json(rows);
});

// ---------- Admin: Ticket detail ----------
app.get("/api/admin/tickets/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const t = await get(`SELECT * FROM tickets WHERE id = ?;`, [id]);
  if (!t) return res.status(404).json({ error: "not found" });

  const timeline = await all(`SELECT event, at FROM timeline WHERE ticket_id = ? ORDER BY at ASC;`, [id]);
  const messages = await all(`SELECT sender, body AS text, at FROM messages WHERE ticket_id = ? ORDER BY at ASC;`, [id]);
  const attachments = await all(`SELECT name, mime AS type, data_url AS data, at FROM attachments WHERE ticket_id = ? ORDER BY at ASC;`, [id]);

  res.json({
    id: t.id,
    category: t.category_id,
    subIssue: t.sub_issue,
    priority: t.priority,
    status: t.status,
    description: t.description,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    adminReply: t.admin_reply,
    internalNote: t.internal_note,
    assignedTo: t.assigned_to,
    tags: t.tags,
    timeline,
    messages,
    attachments
  });
});

// ---------- Admin: Update ticket (status/reply/note/assign/tags) ----------
app.post("/api/admin/tickets/update", requireAdmin, async (req, res) => {
  const { id, status, adminReply, internalNote, assignedTo, tags } = req.body;
  if (!id) return res.status(400).json({ error: "missing id" });

  const t = await get(`SELECT id, status FROM tickets WHERE id = ?;`, [id]);
  if (!t) return res.status(404).json({ error: "not found" });

  const at = now();

  if (status && status !== t.status) {
    await run(`UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?;`, [status, at, id]);
    await run(`INSERT INTO timeline (ticket_id, event, at) VALUES (?, ?, ?);`, [id, status, at]);
  } else {
    await run(`UPDATE tickets SET updated_at = ? WHERE id = ?;`, [at, id]);
  }

  if (typeof adminReply === "string") await run(`UPDATE tickets SET admin_reply = ? WHERE id = ?;`, [adminReply, id]);
  if (typeof internalNote === "string") await run(`UPDATE tickets SET internal_note = ? WHERE id = ?;`, [internalNote, id]);
  if (typeof assignedTo === "string") await run(`UPDATE tickets SET assigned_to = ? WHERE id = ?;`, [assignedTo, id]);
  if (typeof tags === "string") await run(`UPDATE tickets SET tags = ? WHERE id = ?;`, [tags, id]);

  res.json({ success: true });
});

// ---------- Admin: Send chat message ----------
app.post("/api/admin/tickets/message", requireAdmin, async (req, res) => {
  const { id, text } = req.body;
  if (!id) return res.status(400).json({ error: "missing id" });

  const t = await get(`SELECT id FROM tickets WHERE id = ?;`, [id]);
  if (!t) return res.status(404).json({ error: "not found" });

  if (!text || !String(text).trim()) return res.status(400).json({ error: "empty" });

  const at = now();
  await run(`INSERT INTO messages (ticket_id, sender, body, at) VALUES (?, ?, ?, ?);`, [id, "admin", String(text).trim(), at]);
  await run(`UPDATE tickets SET updated_at = ? WHERE id = ?;`, [at, id]);

  res.json({ success: true });
});

// ---------- Admin: Export ----------
app.get("/api/admin/export", requireAdmin, async (req, res) => {
  const rows = await all(`SELECT * FROM tickets ORDER BY updated_at DESC;`);
  res.json({ exportedAt: now(), tickets: rows });
});

// ---------- Admin: Category manager ----------
app.get("/api/admin/categories", requireAdmin, async (req, res) => {
  const cats = await all(`SELECT id, name FROM categories ORDER BY name ASC;`);
  const out = [];
  for (const c of cats) {
    const issues = await all(`SELECT issue FROM category_issues WHERE category_id = ? ORDER BY issue ASC;`, [c.id]);
    out.push({ id: c.id, name: c.name, issues: issues.map(x => x.issue) });
  }
  res.json(out);
});

app.post("/api/admin/categories/save", requireAdmin, async (req, res) => {
  const { next } = req.body;
  if (!Array.isArray(next)) return res.status(400).json({ error: "invalid" });

  // Replace categories atomically-ish (simple approach)
  await run(`DELETE FROM category_issues;`);
  await run(`DELETE FROM categories;`);

  for (const c of next) {
    if (!c || !c.id || !c.name || !Array.isArray(c.issues)) continue;
    await run(`INSERT INTO categories (id, name) VALUES (?, ?);`, [String(c.id), String(c.name)]);
    for (const issue of c.issues) {
      await run(`INSERT INTO category_issues (category_id, issue) VALUES (?, ?);`, [String(c.id), String(issue)]);
    }
  }

  res.json({ success: true });
});

// ---------- Boot ----------
(async () => {
  await init();
  app.listen(PORT, () => console.log(`✅ IntercomDesk API running on :${PORT}`));
})();
