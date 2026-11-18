// ===================================================================
// [LAB 12 - Langkah 06] Skrip Pemantau Ketersediaan Service (Monitoring)
// Memeriksa endpoint /health seluruh service secara berkala.
// ===================================================================

const TARGETS = [
  { name: 'gateway', url: process.env.GATEWAY_URL || 'http://localhost:8080' },
  { name: 'product-service', url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000' },
  { name: 'order-service', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3001' }
];

const INTERVAL = Number(process.env.INTERVAL_MS) || 2000;
const last = {};

async function check(t) {
  const t0 = Date.now();
  try {
    const res = await fetch(t.url + '/health', { signal: AbortSignal.timeout(1500) });
    return { up: res.ok, ms: Date.now() - t0 };
  } catch {
    return { up: false, ms: Date.now() - t0 };
  }
}

async function tick() {
  const results = await Promise.all(TARGETS.map(check));
  console.log(
    new Date().toISOString().slice(11, 19),
    TARGETS.map((t, i) => `${t.name}=${results[i].up ? 'UP' : 'DOWN'}(${results[i].ms}ms)`).join(' ')
  );
  TARGETS.forEach((t, i) => {
    const up = results[i].up;
    if (last[t.name] === true && !up) console.log(`🚨 ALERT: ${t.name} DOWN!`);
    if (last[t.name] === false && up) console.log(`✅ RECOVERED: ${t.name} UP!`);
    last[t.name] = up;
  });
}

console.log('📡 Memulai Monitoring Sistem Toko Komik (interval 2s)...');
tick();
setInterval(tick, INTERVAL);

