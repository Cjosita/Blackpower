const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const products = [
  { id: 'neo-hoodie', name: 'Neon Pulse Hoodie', description: 'Premium heavyweight hoodie with reflective accents.', price: 69.99, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80' },
  { id: 'street-sneaker', name: 'Street Edge Sneakers', description: 'Urban comfort sneakers built for all-day movement.', price: 89.5, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80' },
  { id: 'wave-watch', name: 'Night Wave Watch', description: 'Water-resistant minimal watch with glow dial.', price: 120, image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80' },
  { id: 'sound-core', name: 'Sound Core Earbuds', description: 'Noise-isolating wireless earbuds with deep bass.', price: 49.9, image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80' },
  { id: 'city-backpack', name: 'City Runner Backpack', description: 'Weather-ready backpack with laptop compartment.', price: 74.25, image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80' },
  { id: 'lite-jacket', name: 'Aurora Lite Jacket', description: 'Lightweight jacket with breathable insulated shell.', price: 95, image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=900&q=80' }
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function ensureOrderStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

function readOrders() {
  ensureOrderStore();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(reqPath, res) {
  const safePath = path.normalize(reqPath).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);

  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
  stream.on('error', () => sendJson(res, 500, { error: 'Failed to read file' }));
}

async function handler(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && parsedUrl.pathname === '/api/products') {
    return sendJson(res, 200, products);
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/orders') {
    try {
      return sendJson(res, 200, readOrders());
    } catch {
      return sendJson(res, 500, { error: 'Unable to fetch orders.' });
    }
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/orders') {
    try {
      const { customerName, email, address, items } = await parseBody(req);
      if (!customerName || !email || !address || !Array.isArray(items) || items.length === 0) {
        return sendJson(res, 400, { error: 'Invalid order payload.' });
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      const normalizedItems = [];

      for (const item of items) {
        if (!item.id || typeof item.quantity !== 'number' || item.quantity < 1) {
          return sendJson(res, 400, { error: 'Invalid cart item.' });
        }
        const product = productMap.get(item.id);
        if (!product) return sendJson(res, 400, { error: `Unknown product id: ${item.id}` });
        normalizedItems.push({ id: product.id, name: product.name, price: product.price, quantity: Math.floor(item.quantity) });
      }

      const total = Number(normalizedItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2));
      const order = {
        id: `ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        customerName,
        email,
        address,
        items: normalizedItems,
        total,
        createdAt: new Date().toISOString()
      };

      const orders = readOrders();
      orders.push(order);
      saveOrders(orders);
      return sendJson(res, 201, { message: 'Order placed successfully.', order });
    } catch (error) {
      return sendJson(res, 400, { error: error.message === 'Invalid JSON' ? 'Invalid JSON body.' : 'Unable to save order.' });
    }
  }

  if (req.method === 'GET') {
    return serveStatic(parsedUrl.pathname, res);
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

ensureOrderStore();
http.createServer(handler).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
