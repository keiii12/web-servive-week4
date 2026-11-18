const { test } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const json = { 'Content-Type': 'application/json' };
const get = (p) => fetch(BASE + p);
const post = (p, body) => fetch(BASE + p, { method: 'POST', headers: json, body: JSON.stringify(body) });

let createdOrder;

test('GET /products mengembalikan daftar produk yang valid', async () => {
  const res = await get('/product-service/products');
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.ok(Array.isArray(list) && list.length > 0);
  for (const p of list) {
    assert.equal(typeof p.id, 'number');
    assert.equal(typeof p.name, 'string');
    assert.equal(typeof p.price, 'number');
    assert.equal(typeof p.stock, 'number');
  }
});

test('GET /products/:id mengembalikan satu produk', async () => {
  const res = await get('/product-service/products/1');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, 1);
});

test('GET /products/:id untuk id tak dikenal mengembalikan 404', async () => {
  const res = await get('/product-service/products/999');
  assert.equal(res.status, 404);
  assert.ok((await res.json()).error);
});

test('POST /orders berhasil (201) dan mengurangi stok', async () => {
  const before = await (await get('/product-service/products/2')).json();
  const res = await post('/order-service/orders', { productId: 2, qty: 1 });
  assert.equal(res.status, 201);
  createdOrder = await res.json();
  assert.equal(createdOrder.productId, 2);
  assert.equal(createdOrder.qty, 1);
  assert.equal(createdOrder.total, before.price);
  const after = await (await get('/product-service/products/2')).json();
  assert.equal(after.stock, before.stock - 1);
});

test('POST /orders dengan qty melebihi stok mengembalikan 409', async () => {
  const res = await post('/order-service/orders', { productId: 1, qty: 9999 });
  assert.equal(res.status, 409);
});

test('POST /orders dengan input tidak valid mengembalikan 400', async () => {
  assert.equal((await post('/order-service/orders', {})).status, 400);
  assert.equal((await post('/order-service/orders', { productId: 1, qty: -1 })).status, 400);
});

test('POST /orders untuk produk tak dikenal mengembalikan 404', async () => {
  const res = await post('/order-service/orders', { productId: 9999, qty: 1 });
  assert.equal(res.status, 404);
});

test('GET /orders memuat pesanan yang baru dibuat', async () => {
  const list = await (await get('/order-service/orders')).json();
  assert.ok(list.some(o => (o.id || o.orderId) === (createdOrder.id || createdOrder.orderId)));
});

// ===================================================================
// [LAB 12 - Langkah 07] Pengujian Observability & Distributed Tracing
// ===================================================================
test('GET /product-service/health mengembalikan 200 dan status ok', async () => {
  const res = await get('/product-service/health');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
});

test('POST /order-service/orders memuat header X-Request-Id pada respons', async () => {
  const res = await post('/order-service/orders', { productId: 1, qty: 1 });
  assert.ok(res.headers.get('x-request-id'));
});

