const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'dashboard-test.html');

const server = http.createServer((req, res) => {
  // Servir dashboard-test.html pour toutes les variantes d'URL
  const url = req.url.split('?')[0]; // Enlever les query params
  if (url === '/dashboard-test.html' || url === '/dashboard-test' || url === '/') {
    fs.readFile(FILE_PATH, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading file: ' + err.message);
        return;
      }
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`<html><body><h1>404 - File not found</h1><p>URL demandée: ${req.url}</p><p>Allez sur <a href="/dashboard-test.html">/dashboard-test.html</a></p></body></html>`);
  }
});

server.listen(PORT, () => {
  console.log(`✅ Dashboard server running at http://localhost:${PORT}/dashboard-test.html`);
  console.log(`📁 Serving file: ${FILE_PATH}`);
});

