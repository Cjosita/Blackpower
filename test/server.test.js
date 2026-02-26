const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const BASE = 'http://127.0.0.1:4010';
let serverProcess;

function waitForServerReady() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 5000);

    serverProcess.stdout.on('data', data => {
      if (data.toString().includes('running')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on('data', data => {
      clearTimeout(timeout);
      reject(new Error(data.toString()));
    });
  });
}

test.before(async () => {
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '4010' }
  });

  await waitForServerReady();
});

test.after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

test('GET /api/products returns seeded products', async () => {
  const response = await fetch(`${BASE}/api/products`);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.ok(Array.isArray(data.products));
  assert.ok(data.products.length >= 4);
});

test('POST /api/orders stores and returns order', async () => {
  const order = {
    customerName: 'Test Buyer',
    email: 'buyer@example.com',
    address: '123 Unity Way',
    items: [{ id: 'bp-tee', name: 'Black Power Street Tee', quantity: 2, price: 35 }],
    total: 70
  };

  const response = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.order.customerName, 'Test Buyer');
  assert.ok(data.order.id);
});

test('POST /api/orders validates bad payload', async () => {
  const response = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: 'No Items' })
  });

  assert.equal(response.status, 400);
});
