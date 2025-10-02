const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { loadCharacters, loadSheets } = require("./lib/characterParser");

// Simple JSON file based session persistence
const DATA_DIR = path.join(__dirname, "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: {} }, null, 2));
}

function readSessions() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {};
  } catch (e) {
    console.error("Failed reading sessions store", e);
    return {};
  }
}

function writeSessions(map) {
  ensureDataDir();
  const payload = { sessions: map };
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(payload, null, 2));
}

function sanitizeSessionName(name) {
  return String(name || "").trim().slice(0, 100);
}

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const CHARACTERS_DIR = path.join(ROOT_DIR, "Characters");
const MONSTERS_DIR = path.join(ROOT_DIR, "Monsters");
const IMAGE_DIR = path.join(ROOT_DIR, "Resources", "Image");
const NODE_GRAPH_DIR = path.join(ROOT_DIR, "Node Graph");

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

function sendError(res, error) {
  console.error(error);
  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end("Internal server error");
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "text/html";
  }
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        sendNotFound(res);
      } else {
        sendError(res, err);
      }
      return;
    }
    res.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Content-Length": data.length
    });
    res.end(data);
  });
}

function safeLoad(directory, loader) {
  try {
    return loader(directory);
  } catch (error) {
    console.error(`Failed to load directory: ${directory}`, error);
    return [];
  }
}

function captureSheets() {
  const characters = safeLoad(CHARACTERS_DIR, loadSheets).map(sheet => ({
    ...sheet,
    category: "character"
  }));
  const monsters = safeLoad(MONSTERS_DIR, loadSheets).map(sheet => ({
    ...sheet,
    category: "monster"
  }));
  return { characters, monsters };
}

function buildCsvSummary(records) {
  const header = [
    "Name",
    "Category",
    "Tier",
    "Race",
    "SPD",
    "MV",
    "HP",
    "MP",
    "AC"
  ];

  const rows = records.map(record => {
    const hp = record.combat?.hp?.max ?? record.combat?.hp?.current ?? "";
    const mp = record.combat?.resource?.max ?? record.combat?.resource?.current ?? "";
    const values = [
      record.name || record.id,
      record.category,
      record.tier ?? "",
      record.race ?? "",
      record.combat?.spd ?? "",
      record.combat?.mv ?? "",
      hp,
      mp,
      record.combat?.ac ?? ""
    ];
    return values
      .map(value => (value === null || value === undefined ? "" : String(value)))
      .map(value => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value))
      .join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

function toFlatRecord(sheet, incrementalId) {
  const hp = sheet.combat?.hp;
  const resource = sheet.combat?.resource;
  return {
    id: incrementalId.toString().padStart(3, "0"),
    name: sheet.name || sheet.id,
    tier: sheet.tier ?? null,
    race: sheet.race || "",
    core: sheet.core || {},
    combat: {
      hp: hp?.max ?? hp?.current ?? null,
      mp: resource?.max ?? resource?.current ?? null,
      ac: sheet.combat?.ac ?? null,
      spd: sheet.combat?.spd ?? null,
      mv: sheet.combat?.mv ?? (sheet.combat?.spd ? sheet.combat.spd / 3 : null)
    },
    category: sheet.category || "character"
  };
}

function buildFlatExport(records) {
  let counter = 1;
  return records.map(r => toFlatRecord(r, counter++));
}

function handleConversionRequest(res, body) {
  try {
    const { characters, monsters } = captureSheets();
    const all = [...characters, ...monsters];
    let selected = all;
    if (body && Array.isArray(body.ids) && body.ids.length) {
      const idSet = new Set(body.ids.map(String));
      selected = all.filter(s => idSet.has(s.id));
    }
    const flat = buildFlatExport(selected);
    const summaryCsv = buildCsvSummary(selected);
    sendJson(res, 200, {
      exportedAt: new Date().toISOString(),
      count: flat.length,
      records: flat,
      summaryCsv
    });
  } catch (error) {
    sendError(res, error);
  }
}

function handleApi(req, res, urlObj) {
  if (req.method === "GET" && urlObj.pathname === "/api/characters") {
    try {
      const characters = loadCharacters(CHARACTERS_DIR);
      sendJson(res, 200, { characters });
    } catch (error) {
      sendError(res, error);
    }
    return true;
  }

  if (req.method === "GET" && urlObj.pathname === "/api/sheets") {
    try {
      const payload = captureSheets();
      sendJson(res, 200, payload);
    } catch (error) {
      sendError(res, error);
    }
    return true;
  }

  if (req.method === 'GET' && urlObj.pathname === '/api/skills') {
    try {
      const skills = parseSkills();
      sendJson(res, 200, { skills });
    } catch (e) {
      sendError(res, e);
    }
    return true;
  }

  if (req.method === "POST" && urlObj.pathname === "/api/convert") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      let parsed = null;
      if (body.trim()) {
        try { parsed = JSON.parse(body); } catch (e) { parsed = null; }
      }
      handleConversionRequest(res, parsed || {});
    });
    return true;
  }

  // Server-side sessions API
  if (urlObj.pathname === "/api/sessions") {
    if (req.method === "GET") {
      const map = readSessions();
      const list = Object.values(map).map(s => ({
        name: s.name,
        updatedAt: s.updatedAt,
        turn: s.turn,
        allies: (s.allies || []).length,
        enemies: (s.enemies || []).length
      }));
      sendJson(res, 200, { sessions: list });
      return true;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          if (!payload || !payload.name) {
            return sendJson(res, 400, { error: "Missing session name" });
          }
            const name = sanitizeSessionName(payload.name);
            const sessions = readSessions();
            const now = new Date().toISOString();
            const existing = sessions[name];
            const session = {
              name,
              createdAt: existing?.createdAt || now,
              updatedAt: now,
              turn: Number.isFinite(payload.turn) ? payload.turn : 1,
              allies: Array.isArray(payload.allies) ? payload.allies : [],
              enemies: Array.isArray(payload.enemies) ? payload.enemies : [],
              turnOrder: Array.isArray(payload.turnOrder) ? payload.turnOrder : [],
              pendingSort: Boolean(payload.pendingSort)
            };
            sessions[name] = session;
            writeSessions(sessions);
            sendJson(res, 200, { ok: true, session });
        } catch (e) {
          sendJson(res, 400, { error: "Invalid JSON" });
        }
      });
      return true;
    }
  }

  if (urlObj.pathname.startsWith("/api/sessions/")) {
    const name = decodeURIComponent(urlObj.pathname.split("/").pop());
    const sessions = readSessions();
    if (req.method === "GET") {
      const session = sessions[name];
      if (!session) return sendNotFound(res);
      sendJson(res, 200, { session });
      return true;
    }
    if (req.method === "DELETE") {
      if (!sessions[name]) return sendNotFound(res);
      delete sessions[name];
      writeSessions(sessions);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  if (req.method === "GET" && urlObj.pathname.startsWith("/api/characters/")) {
    const id = urlObj.pathname.split("/").pop();
    try {
      const characters = loadCharacters(CHARACTERS_DIR);
      const found = characters.find(character => character.id === id);
      if (!found) {
        sendNotFound(res);
      } else {
        sendJson(res, 200, { character: found });
      }
    } catch (error) {
      sendError(res, error);
    }
    return true;
  }

  if (req.method === "GET" && urlObj.pathname === "/api/ping") {
    sendJson(res, 200, { ok: true });
    return true;
  }

  // Image serving route: /img/<path>
  if (req.method === 'GET' && urlObj.pathname.startsWith('/img/')) {
    const rel = urlObj.pathname.replace(/^\/img\//,'');
    const safe = rel.split('/').filter(seg => seg && seg !== '..').join(path.sep);
    const filePath = path.join(IMAGE_DIR, safe);
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) { return sendNotFound(res); }
      serveStaticFile(res, filePath);
    });
    return true;
  }

  return false;
}

function parseSkills() {
  const results = [];
  if (!fs.existsSync(NODE_GRAPH_DIR)) return results;
  const files = fs.readdirSync(NODE_GRAPH_DIR).filter(f => f.toLowerCase().endsWith('.md'));
  files.forEach(file => {
    try {
      const full = path.join(NODE_GRAPH_DIR, file);
      const raw = fs.readFileSync(full, 'utf8');
      const name = file.replace(/\.md$/i,'');
      // Tier & rarity
      const tierMatch = raw.match(/\*\*Tier\*\*\s*\|\s*([^\n]+)/i);
      let tier=null, rarity=null; if (tierMatch) { const seg=tierMatch[1]; const tNum=seg.match(/(\d+)/); if(tNum) tier=parseInt(tNum[1],10); const rar=seg.match(/#(Common|Uncommon|Rare|Epic|Legendary)/i); if (rar) rarity=rar[1]; }
      // Type tags
      const typeMatch = raw.match(/\*\*Type\*\*\s*\|\s*([^\n]+)/i);
      const typeTags = typeMatch ? (typeMatch[1].match(/#([A-Za-z0-9_-]+)/g)||[]).map(t=>t.slice(1)) : [];
      const passive = typeTags.includes('Passive');
      const active = typeTags.includes('Active');
      // Effect Details bullets
      const lines = raw.split(/\r?\n/);
      const effectDetails = [];
      const effIdx = lines.findIndex(l => /Effect Details/i.test(l));
      if (effIdx !== -1) {
        for (let i=effIdx+1;i<lines.length;i++) {
          const line=lines[i];
          if (/^\s*-\s*\*\*/.test(line)) {
            effectDetails.push(line.replace(/^\s*-\s*/, '').replace(/\*\*/g,'').trim());
          } else if (/^##\s/.test(line) || /^---/.test(line)) { break; }
        }
      }
      // Roll hints & resource cost
      const rollHints=[]; let resourceCost=null;
      effectDetails.forEach(eff => {
        const roll=eff.match(/Roll\s+([0-9dD+\- ]+(?:INT|STR|DEX|WIS|CHA|CON)?(?:\s+or\s+(?:INT|STR|DEX|WIS|CHA|CON))?)/i); if (roll) {
          let hint = roll[1].trim();
          hint = hint.replace(/\b(INT|STR|DEX|WIS|CHA|CON)\b\s+or\s+\b(INT|STR|DEX|WIS|CHA|CON)\b/i, (m,a,b)=>`${a.toUpperCase()}|${b.toUpperCase()}`);
          rollHints.push(hint);
        }
        const cost=eff.match(/Resource Cost\s*:\s*(\d+)\s*MP/i); if(cost) resourceCost=parseInt(cost[1],10);
      });
      // Prerequisites section
      const prereqIdx = lines.findIndex(l => /Prerequisites/i.test(l));
      const prerequisites=[];
      if (prereqIdx !== -1) {
        for (let i=prereqIdx+1;i<lines.length;i++) {
          const ln = lines[i];
          if (/^###\s|^##\s|^---/.test(ln)) break;
          const linkMatch = ln.match(/\[\[([^\]]+)\]\]/g); if (linkMatch) {
            linkMatch.forEach(lk => { const name = lk.replace(/[[\]]/g,'').trim(); if (name) prerequisites.push(name); });
          }
        }
      }
      results.push({ id:name, name, tier, rarity, typeTags, passive, active, effectDetails, rollHints, resourceCost, prerequisites });
    } catch(_) { /* ignore */ }
  });
  return results;
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  if (urlObj.pathname.startsWith("/api/")) {
    const handled = handleApi(req, res, urlObj);
    if (!handled) {
      sendNotFound(res);
    }
    return;
  }

  let requestedPath = urlObj.pathname;
  if (requestedPath === "/") {
    requestedPath = "index.html";
  } else {
    requestedPath = requestedPath.replace(/^\/+/, "");
  }

  const normalPath = path.normalize(requestedPath);
  const pathSegments = normalPath.split(path.sep);
  if (pathSegments.some(segment => segment === "..")) {
    sendNotFound(res);
    return;
  }

  const filePath = path.join(PUBLIC_DIR, normalPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback = path.join(PUBLIC_DIR, "index.html");
      serveStaticFile(res, fallback);
      return;
    }
    serveStaticFile(res, filePath);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tracker server running on http://localhost:${PORT}`);
  ensureDataDir();
});