"use strict";

const { app, BrowserWindow, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");

// ---------------------------------------------------------------------------
// Build directory: bundled inside app when packaged, local when in dev
// ---------------------------------------------------------------------------
function getBuildDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "build")
    : path.join(__dirname, "../excalidraw-app/build");
}

// ---------------------------------------------------------------------------
// Find an available TCP port, starting from `preferred`
// ---------------------------------------------------------------------------
function findFreePort(preferred) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.on("error", () => resolve(findFreePort(preferred + 1)));
    server.listen(preferred, "127.0.0.1", () => {
      server.close(() => resolve(preferred));
    });
  });
}

// ---------------------------------------------------------------------------
// Static file server (pure Node built-ins, no npm deps)
// ---------------------------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};

function startServer(buildDir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || "/").split("?")[0].split("#")[0];
      let filePath = path.join(buildDir, urlPath);

      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) filePath = path.join(buildDir, "index.html");
      } catch {
        // file not found → SPA fallback
        filePath = path.join(buildDir, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || "application/octet-stream";
      const isIndex = filePath.endsWith("index.html");

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": isIndex
            ? "no-cache, no-store, must-revalidate"
            : "public, max-age=31536000, immutable",
        });
        res.end(data);
      });
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      console.log(`[xDraw] server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
let mainWindow = null;
let httpServer = null;

async function createWindow() {
  const buildDir = getBuildDir();
  const port = await findFreePort(3737);

  httpServer = await startServer(buildDir, port);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Open all external URLs in the system browser, not in the app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://localhost:${port}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function shutdown() {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}

app.whenReady().then(createWindow);

// macOS: re-create window when dock icon is clicked and no windows are open
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  shutdown();
  app.quit();
});

app.on("before-quit", shutdown);
