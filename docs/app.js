// IMPORTANT: set to your Render base URL
const API = "https://intercomdesk-v2.onrender.com";

const $ = (id) => document.getElementById(id);

const Toast = {
  show(text) {
    const t = $("toast");
    t.innerText = text;
    t.style.display = "block";
    clearTimeout(this._tm);
    this._tm = setTimeout(() => (t.style.display = "none"), 2500);
  }
};

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

// -------- UI Tabs --------
const UI = {
  show(page) {
    const pages = ["user", "status", "chat", "admin"];
    for (const p of pages) {
      $("page-" + p).style.display = (p === page) ? "" : "none";
      $("tab-" + p).classList.toggle("active", p === page);
    }
  }
};

// -------- User Submit --------
const User = {
  cats: [],
  activeCat: null,

  async init() {
    await this.loadCats();
  },

  async loadCats() {
    const res = await fetch(API + "/api/categories");
    if (!res.ok) return Toast.show("API offline");
    this.cats = await res.json();

    // build chips
    const wrap = $("catChips");
    wrap.innerHTML = "";
    this.cats.forEach((c, idx) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.innerText = c.name;
      b.onclick = () => this.selectCat(c.id);
      wrap.appendChild(b);

      if (idx === 0) this.selectCat(c.id);
    });
  },

  async selectCat(id) {
    this.activeCat = id;

    // toggle active chip
    const wrap = $("catChips");
    [...wrap.children].forEach((el, i) => {
      const c = this.cats[i];
      el.classList.toggle("active", c && c.id === id);
    });

    // load issues
    const res = await fetch(API + "/api/categories/" + encodeURIComponent(id));
    const issues = res.ok ? await res.json() : [];
    const sel = $("subIssue");
    sel.innerHTML = "";
    issues.forEach((it) => {
      const o = document.createElement("option");
      o.value = it;
      o.textContent = it.replaceAll("_", " ");
      sel.appendChild(o);
    });
  },

  async fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  },

  reset() {
    $("desc").value = "";
    $("tags").value = "";
    $("files").value = "";
    $("submitBox").style.display = "none";
  },

  async submit() {
    const category = this.activeCat;
    const subIssue = $("subIssue").value;
    const priority = $("priority").value;
    const description = $("desc").value.trim();
    const tags = $("tags").value.trim();

    if (!category) return Toast.show("Pick a category");
    if (!subIssue) return Toast.show("Pick a sub-issue");
    if (!description) return Toast.show("Write a description");

    const files = $("files").files;
    const attachments = [];
    const max = Math.min(files.length, 3);

    for (let i = 0; i < max; i++) {
      const f = files[i];
      const data = await this.fileToDataURL(f);
      attachments.push({
        name: f.name,
        type: f.type || "application/octet-stream",
        data
      });
    }

    const body = { category, subIssue, priority, description, attachments, tags };

    const res = await fetch(API + "/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) return Toast.show("Submit failed (API down?)");

    const out = await res.json();
    const box = $("submitBox");
    box.style.display = "";
    box.innerHTML = `
      <div><b>✅ Complaint submitted</b></div>
      <div class="muted" style="margin-top:8px">Reference ID</div>
      <div style="margin-top:8px">
        <span class="pill"><b>${esc(out.reference)}</b></span>
        <button class="btn ghost" onclick="navigator.clipboard.writeText('${out.reference}'); Toast.show('Copied!')">Copy</button>
      </div>
      <div style="margin-top:10px" class="muted">Next steps</div>
      <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap">
        <button class="btn primary" onclick="UI.show('status'); document.getElementById('statusId').value='${out.reference}'; Status.check()">Check status</button>
        <button class="btn primary" onclick="UI.show('chat'); document.getElementById('chatId').value='${out.reference}'; Chat.open()">Open chat</button>
      </div>
    `;

    Toast.show("Submitted ✅");
    // Keep description? We'll clear for clean UX
    $("desc").value = "";
    $("files").value = "";
  }
};

// -------- Status --------
const Status = {
  async check() {
    const id = $("statusId").value.trim();
    if (!id) return Toast.show("Enter Reference ID");

    const res = await fetch(API + "/api/complaints/" + encodeURIComponent(id));
    if (!res.ok) {
      $("statusBox").style.display = "none";
      return Toast.show("Ticket not found");
    }

    const t = await res.json();
    $("statusBox").style.display = "";
    $("statusBox").innerHTML = renderTicket(t);
  }
};

function renderTicket(t) {
  const tl = (t.timeline || []).map(x => `
    <div class="tlItem">
      <b>${esc(x.event)}</b>
      <div class="muted">${fmt(x.at)}</div>
    </div>
  `).join("");

  const atts = (t.attachments || []).map(a => {
    const isImg = (a.type || "").startsWith("image/");
    if (isImg) {
      return `<div style="margin-top:10px">
        <span class="pill">${esc(a.name)}</span>
        <div style="margin-top:8px">
          <img src="${a.data}" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.12)"/>
        </div>
      </div>`;
    }
    return `<div style="margin-top:10px">
      <span class="pill">${esc(a.name)}</span>
      <a class="pill" href="${a.data}" target="_blank">Open</a>
    </div>`;
  }).join("");

  return `
    <div>
      <span class="pill"><b>${esc(t.id)}</b></span>
      <span class="pill">status: <b>${esc(t.status)}</b></span>
      <span class="pill">priority: <b>${esc(t.priority)}</b></span>
      ${t.tags ? `<span class="pill">tags: <b>${esc(t.tags)}</b></span>` : ""}
    </div>

    <div style="margin-top:10px" class="muted">
      <b>Category:</b> ${esc(t.category)} • <b>Issue:</b> ${esc(t.subIssue)}
    </div>

    <div style="margin-top:10px">
      <b>Description</b>
      <div class="muted" style="margin-top:6px">${esc(t.description)}</div>
    </div>

    ${t.adminReply ? `
      <div style="margin-top:12px">
        <b>Admin reply</b>
        <div class="muted" style="margin-top:6px">${esc(t.adminReply)}</div>
      </div>
    ` : ""}

    ${atts ? `<div style="margin-top:12px"><b>Attachments</b>${atts}</div>` : ""}

    <div style="margin-top:12px">
      <b>Timeline</b>
      <div class="timeline">${tl || `<div class="muted">No events</div>`}</div>
    </div>
  `;
}

// -------- Chat --------
const Chat = {
  id: null,
  poll: null,

  close() {
    this.id = null;
    $("chatWrap").style.display = "none";
    clearInterval(this.poll);
    this.poll = null;
  },

  async open() {
    const id = $("chatId").value.trim();
    if (!id) return Toast.show("Enter Reference ID");

    const ok = await this.refresh(id);
    if (!ok) return;

    this.id = id;
    $("chatWrap").style.display = "";

    clearInterval(this.poll);
    this.poll = setInterval(() => this.refresh(), 2500);
  },

  async refresh(idOverride) {
    const id = idOverride || this.id;
    if (!id) return false;

    const res = await fetch(API + "/api/complaints/" + encodeURIComponent(id));
    if (!res.ok) {
      Toast.show("Ticket not found");
      return false;
    }

    const t = await res.json();
    $("chatMeta").innerText = `${t.id} • ${t.status} • ${t.category}/${t.subIssue}`;

    const box = $("chatMsgs");
    box.innerHTML = "";

    const msgs = t.messages || [];
    if (msgs.length === 0) {
      box.innerHTML = `<div class="muted">No messages yet. Send the first one.</div>`;
      return true;
    }

    for (const m of msgs) {
      const div = document.createElement("div");
      div.className = "bubble " + (m.sender === "admin" ? "admin" : "user");
      div.innerHTML = `<div>${esc(m.text)}</div><div class="meta">${m.sender.toUpperCase()} • ${fmt(m.at)}</div>`;
      box.appendChild(div);
    }

    box.scrollTop = box.scrollHeight;
    return true;
  },

  async send() {
    if (!this.id) return Toast.show("Open a ticket first");
    const text = $("chatText").value.trim();
    if (!text) return;

    $("chatText").value = "";

    const res = await fetch(API + "/api/complaints/" + encodeURIComponent(this.id) + "/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) return Toast.show("Send failed");
    await this.refresh();
  }
};

// -------- Admin --------
const Admin = {
  key: localStorage.getItem("ICD_ADMIN_KEY") || "",
  selected: null,
  categories: [],

  async login() {
    const k = $("adminKey").value.trim();
    if (!k) return Toast.show("Enter admin key");
    this.key = k;
    localStorage.setItem("ICD_ADMIN_KEY", k);
    $("adminUI").style.display = "";
    Toast.show("Admin logged in ✅");
    await this.loadCatsFilter();
    await this.load();
    await this.loadCategories();
  },

  logout() {
    this.key = "";
    localStorage.removeItem("ICD_ADMIN_KEY");
    $("adminUI").style.display = "none";
    $("ticketList").innerHTML = "";
    $("ticketDetail").innerHTML = "Select a ticket…";
    Toast.show("Logged out");
  },

  async loadCatsFilter() {
    const res = await fetch(API + "/api/categories");
    const cats = res.ok ? await res.json() : [];
    const sel = $("fCategory");
    sel.innerHTML = `<option value="">All categories</option>`;
    cats.forEach(c => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      sel.appendChild(o);
    });
  },

  async load() {
    if (!this.key) return;

    const q = $("q").value.trim();
    const status = $("fStatus").value;
    const priority = $("fPriority").value;
    const category = $("fCategory").value;

    const url = new URL(API + "/api/admin/tickets");
    if (q) url.searchParams.set("q", q);
    if (status) url.searchParams.set("status", status);
    if (priority) url.searchParams.set("priority", priority);
    if (category) url.searchParams.set("category", category);

    const res = await fetch(url.toString(), { headers: { "x-admin-key": this.key } });
    if (!res.ok) return Toast.show("Admin API failed (key?)");

    const tickets = await res.json();

    const list = $("ticketList");
    list.innerHTML = "";

    if (tickets.length === 0) {
      list.innerHTML = `<div class="muted">No tickets found.</div>`;
      return;
    }

    tickets.forEach(t => {
      const row = document.createElement("div");
      row.className = "ticketRow";
      row.innerHTML = `
        <div class="top">
          <div>${esc(t.id)}</div>
          <div>
            <span class="pill">${esc(t.status)}</span>
            <span class="pill">${esc(t.priority)}</span>
          </div>
        </div>
        <div class="sub">${esc(t.category)}/${esc(t.subIssue)} • ${fmt(t.updatedAt)} ${t.tags ? " • tags: " + esc(t.tags) : ""}</div>
      `;
      row.onclick = () => this.open(t.id);
      list.appendChild(row);
    });
  },

  async open(id) {
    this.selected = id;
    const res = await fetch(API + "/api/admin/tickets/" + encodeURIComponent(id), { headers: { "x-admin-key": this.key } });
    if (!res.ok) return Toast.show("Failed to load ticket detail");

    const t = await res.json();

    const timeline = (t.timeline || []).map(x => `
      <div class="tlItem"><b>${esc(x.event)}</b><div class="muted">${fmt(x.at)}</div></div>
    `).join("");

    const messages = (t.messages || []).map(m => `
      <div class="tlItem"><b>${esc(m.sender.toUpperCase())}</b> <span class="muted">• ${fmt(m.at)}</span><div style="margin-top:6px">${esc(m.text)}</div></div>
    `).join("") || `<div class="muted">No messages yet.</div>`;

    const atts = (t.attachments || []).map(a => {
      const isImg = (a.type || "").startsWith("image/");
      if (isImg) return `
        <div style="margin-top:10px">
          <span class="pill">${esc(a.name)}</span>
          <div style="margin-top:8px"><img src="${a.data}" style="max-width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.12)"/></div>
        </div>`;
      return `<div style="margin-top:10px"><span class="pill">${esc(a.name)}</span> <a class="pill" href="${a.data}" target="_blank">Open</a></div>`;
    }).join("") || `<div class="muted">None</div>`;

    $("ticketDetail").innerHTML = `
      <div>
        <span class="pill"><b>${esc(t.id)}</b></span>
        <span class="pill">status: <b>${esc(t.status)}</b></span>
        <span class="pill">priority: <b>${esc(t.priority)}</b></span>
      </div>

      <div style="margin-top:10px" class="muted">
        <b>Category:</b> ${esc(t.category)} • <b>Issue:</b> ${esc(t.subIssue)}
      </div>

      <div style="margin-top:10px">
        <b>Description</b>
        <div class="muted" style="margin-top:6px">${esc(t.description)}</div>
      </div>

      <div class="divider"></div>

      <div class="row">
        <select id="admStatus">
          <option value="pending">pending</option>
          <option value="investigating">investigating</option>
          <option value="resolved">resolved</option>
          <option value="rejected">rejected</option>
        </select>
        <input id="admAssign" placeholder="Assign to…" value="${esc(t.assignedTo || "")}"/>
      </div>

      <div class="row">
        <input id="admTags" placeholder="tags…" value="${esc(t.tags || "")}"/>
        <button class="btn primary" onclick="Admin.save()">Save update</button>
      </div>

      <div style="margin-top:10px">
        <b>Admin reply (public)</b>
        <textarea id="admReply" rows="3" style="margin-top:8px">${esc(t.adminReply || "")}</textarea>
      </div>

      <div style="margin-top:10px">
        <b>Internal note (private)</b>
        <textarea id="admNote" rows="3" style="margin-top:8px">${esc(t.internalNote || "")}</textarea>
      </div>

      <div style="margin-top:10px">
        <b>Send message (admin → user)</b>
        <div class="row" style="margin-top:8px">
          <input id="admMsg" placeholder="Type message…"/>
          <button class="btn primary" onclick="Admin.sendMsg()">Send</button>
        </div>
      </div>

      <div class="divider"></div>

      <b>Attachments</b>
      ${atts}

      <div class="divider"></div>

      <b>Timeline</b>
      <div class="timeline">${timeline || `<div class="muted">No events</div>`}</div>

      <div class="divider"></div>

      <b>Chat log</b>
      <div class="timeline">${messages}</div>
    `;

    // set status select
    setTimeout(() => { $("admStatus").value = t.status || "pending"; }, 0);
  },

  async save() {
    if (!this.selected) return;
    const body = {
      id: this.selected,
      status: $("admStatus").value,
      assignedTo: $("admAssign").value,
      tags: $("admTags").value,
      adminReply: $("admReply").value,
      internalNote: $("admNote").value
    };

    const res = await fetch(API + "/api/admin/tickets/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": this.key },
      body: JSON.stringify(body)
    });

    if (!res.ok) return Toast.show("Update failed");
    Toast.show("Updated ✅");
    await this.load();
    await this.open(this.selected);
  },

  async sendMsg() {
    if (!this.selected) return;
    const text = $("admMsg").value.trim();
    if (!text) return;
    $("admMsg").value = "";

    const res = await fetch(API + "/api/admin/tickets/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": this.key },
      body: JSON.stringify({ id: this.selected, text })
    });

    if (!res.ok) return Toast.show("Send failed");
    Toast.show("Sent ✅");
    await this.open(this.selected);
  },

  async export() {
    const res = await fetch(API + "/api/admin/export", { headers: { "x-admin-key": this.key } });
    if (!res.ok) return Toast.show("Export failed");
    const data = await res.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intercomdesk_export.json";
    a.click();
    URL.revokeObjectURL(url);
  },

  // Category manager
  async loadCategories() {
    const res = await fetch(API + "/api/admin/categories", { headers: { "x-admin-key": this.key } });
    if (!res.ok) return Toast.show("Load categories failed");
    this.categories = await res.json();
    this.renderCats();
  },

  renderCats() {
    const root = $("catEditor");
    root.innerHTML = "";

    this.categories.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "catBlock";
      div.innerHTML = `
        <div class="row">
          <input value="${esc(c.id)}" placeholder="id" oninput="Admin.categories[${idx}].id=this.value"/>
          <input value="${esc(c.name)}" placeholder="name" oninput="Admin.categories[${idx}].name=this.value"/>
          <button class="btn ghost" onclick="Admin.removeCategory(${idx})">Remove</button>
        </div>
        <div class="muted" style="margin-top:8px">Sub-issues (comma separated)</div>
        <input value="${esc((c.issues||[]).join(','))}" oninput="Admin.categories[${idx}].issues=this.value.split(',').map(x=>x.trim()).filter(Boolean)"/>
      `;
      root.appendChild(div);
    });
  },

  addCategory() {
    this.categories.push({ id: "new_category", name: "New Category", issues: ["new_issue"] });
    this.renderCats();
  },

  removeCategory(i) {
    this.categories.splice(i, 1);
    this.renderCats();
  },

  async saveCategories() {
    const res = await fetch(API + "/api/admin/categories/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": this.key },
      body: JSON.stringify({ next: this.categories })
    });
    if (!res.ok) return Toast.show("Save categories failed");
    Toast.show("Categories saved ✅");
    await User.loadCats();
    await this.loadCatsFilter();
  }
};

// Boot
(async function () {
  try {
    await User.init();
    const stored = localStorage.getItem("ICD_ADMIN_KEY") || "";
    if (stored) $("adminKey").value = stored;
  } catch {
    Toast.show("Frontend loaded, API may be offline.");
  }
})();
