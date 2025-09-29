const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { loadCharacters } = require("./lib/characterParser");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const CHARACTERS_DIR = path.join(ROOT_DIR, "Characters");

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

  return false;
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
});