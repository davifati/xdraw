#!/usr/bin/env node
// Simple static file server for the xDraw production build.
// Uses only Node.js built-ins – no npm install needed.

const http = require("http");
const fs = require("fs");
const path = require("path");

const BUILD_DIR = process.argv[2] || path.join(__dirname, "build");
const PORT = parseInt(process.argv[3] || "3737", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0].split("#")[0];

  let filePath = path.join(BUILD_DIR, urlPath);

  // SPA fallback: serve index.html for any path that isn't a file
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(BUILD_DIR, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    // Cache static assets aggressively, never cache index.html
    const isIndex = filePath.endsWith("index.html");
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": isIndex
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=31536000, immutable",
    });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`xDraw running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
