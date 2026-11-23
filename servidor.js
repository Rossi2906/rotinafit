/* Servidor local opcional do RotinaFit — sem dependências. */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8"
};

function openBrowser(url) {
  if (process.env.NO_OPEN === "1") return;
  const command = process.platform === "win32"
    ? 'start "" "' + url + '"'
    : process.platform === "darwin"
      ? 'open "' + url + '"'
      : 'xdg-open "' + url + '"';
  exec(command, function () { /* abrir navegador é opcional */ });
}

const server = http.createServer(function (req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Requisicao invalida.");
  }

  const relative = path.normalize(pathname).replace(/^[/\\]+/, "");
  const file = path.resolve(ROOT, relative || "index.html");

  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Acesso negado.");
  }

  fs.stat(file, function (err, stats) {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Arquivo nao encontrado: " + relative);
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(file).pipe(res);
  });
});

function networkUrls() {
  const urls = ["http://localhost:" + PORT];
  Object.keys(os.networkInterfaces()).forEach(function (name) {
    (os.networkInterfaces()[name] || []).forEach(function (iface) {
      const isIPv4 = iface.family === 4 || String(iface.family) === "IPv4";
      if (isIPv4 && !iface.internal) urls.push("http://" + iface.address + ":" + PORT);
    });
  });
  return urls;
}

server.listen(PORT, HOST, function () {
  console.log("RotinaFit rodando em:");
  networkUrls().forEach(function (url) { console.log("  " + url); });
  console.log("No celular, use o endereco com o IP da maquina (nao localhost).");
  console.log("Pressione Ctrl+C para encerrar.");
  openBrowser("http://localhost:" + PORT);
});
