const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

const PRODUCTS = [
  {
    id: 'bp-hoodie',
    name: 'Black Power Signature Hoodie',
    price: 65,
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    description: 'Premium heavyweight hoodie with bold Black Power print.'
  },
  {
    id: 'bp-tee',
    name: 'Black Power Street Tee',
    price: 35,
    image:
      'https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=900&q=80',
    description: 'Soft cotton tee inspired by urban style and unity.'
  },
  {
    id: 'bp-cap',
    name: 'Black Power Crest Cap',
    price: 28,
    image:
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=80',
    description: 'Structured cap with embroidered crest and adjustable fit.'
  },
  {
    id: 'bp-jacket',
    name: 'Black Power Night Jacket',
    price: 90,
    image:
      'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80',
    description: 'Weather-resistant jacket for bold night movement.'
  }
];

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function ensureOrdersFile() {
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
    await fs.writeFile(ORDERS_FILE, '[]', 'utf-8');
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': MIME_TYPES['.json'] });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Request body too large'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}

function validateOrder(order) {
  const requiredFields = ['customerName', 'email', 'address', 'items', 'total'];
  const missingFields = requiredFields.filter(field => !order[field]);

  if (missingFields.length) {
    return `Missing required field(s): ${missingFields.join(', ')}`;
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return 'Order must include at least one cart item.';
  }

  for (const item of order.items) {
    if (!item.id || !item.name || typeof item.quantity !== 'number' || item.quantity < 1) {
      return 'Each item requires id, name, and a quantity of at least 1.';
    }
  }

  if (typeof order.total !== 'number' || Number.isNaN(order.total) || order.total <= 0) {
    return 'Order total must be a positive number.';
  }

  return null;
}

async function getOrders() {
  await ensureOrdersFile();
  const raw = await fs.readFile(ORDERS_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function saveOrder(order) {
  const orders = await getOrders();
  const savedOrder = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...order
  };

  orders.push(savedOrder);
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  return savedOrder;
}

async function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { message: 'Forbidden path.' });
    return;
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const file = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(file);
  } catch {
    sendJson(res, 404, { message: 'Resource not found.' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/products') {
      sendJson(res, 200, { products: PRODUCTS });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/orders') {
      const orders = await getOrders();
      sendJson(res, 200, { orders });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/orders') {
      const payload = await parseBody(req);
      const validationError = validateOrder(payload);

      if (validationError) {
        sendJson(res, 400, { message: validationError });
        return;
      }

      const order = await saveOrder(payload);
      sendJson(res, 201, {
        message: 'Order received successfully.',
        order
      });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { message: 'Unexpected server error.', error: error.message });
  }
});

ensureOrdersFile()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Black Power store running at http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize server', error);
    process.exit(1);
  });
