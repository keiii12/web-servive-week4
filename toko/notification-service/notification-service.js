// ===================================================================
// [LAB 10 - Langkah 02] Notification Service (RabbitMQ Consumer)
// Bertugas mendengarkan event 'order.created' dari RabbitMQ exchange 'orders'
// dan memproses pengiriman email konfirmasi pembelian komik secara asinkron.
// ===================================================================

import 'dotenv/config';
import amqp from 'amqplib';

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost';

// Menentukan nama antrean (default: 'notification-queue', bisa diganti misal 'audit-queue' untuk pub/sub)
const QUEUE = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'notification-queue';

// Flag pengujian: mensimulasikan crash sebelum pesan di-acknowledge (Lab 10 Langkah 07)
const IS_CRASH_MODE = process.argv.includes('--crash');

// Penyimpanan sementara untuk mencegah duplikasi pemrosesan pesan (Idempotensi dasar)
const processedMessageIds = new Set();

async function startNotificationConsumer() {
  console.log(`🔌 Menghubungkan notification-service ke RabbitMQ di ${AMQP_URL}...`);
  
  const connection = await amqp.connect(AMQP_URL);
  const channel = await connection.createChannel();

  // 1. Deklarasikan Exchange 'orders' bertipe 'fanout' (semua antrean terikat menerima salinan)
  await channel.assertExchange('orders', 'fanout', { durable: true });

  // 2. Deklarasikan Antrean (Queue) agar bersifat tahan banting (durable: true)
  await channel.assertQueue(QUEUE, { durable: true });

  // 3. Ikat (Bind) Antrean ke Exchange 'orders'
  await channel.bindQueue(QUEUE, 'orders', '');

  // 4. Prefetch 1: Ambil 1 pesan dalam satu waktu (mencegah penumpukan beban di satu worker)
  channel.prefetch(1);

  console.log(`📬 [${QUEUE}] Siap mendengarkan event pesanan baru dari RabbitMQ...`);
  if (IS_CRASH_MODE) {
    console.log(`⚠️ MODE CRASH AKTIF: Consumer akan crash sengaja sebelum mengirim ACK.`);
  }

  // 5. Konsumsi pesan dari antrean
  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    let eventData;
    try {
      eventData = JSON.parse(msg.content.toString());
    } catch (parseError) {
      console.error('❌ Pesan rusak atau bukan JSON yang valid. Membuang pesan...');
      channel.ack(msg);
      return;
    }

    const messageId = msg.properties.messageId || `msg-${Date.now()}`;

    // Cek Idempotensi: Apakah pesan ini sudah pernah diproses sebelumnya?
    if (processedMessageIds.has(messageId)) {
      console.log(`⚠️ [Duplikat Terdeteksi] Pesan ID: ${messageId} sudah pernah diproses. Melewati...`);
      channel.ack(msg);
      return;
    }

    // Simulasi pengiriman email konfirmasi (delay 1 detik)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`\n===========================================================`);
    console.log(`✉️ [${QUEUE}] EMAIL NOTIFIKASI TERKIRIM:`);
    console.log(`   -> Penerima: Pembeli Toko Komik`);
    console.log(`   -> Pesanan #${eventData.orderId}: "${eventData.productName}"`);
    console.log(`   -> Jumlah: ${eventData.qty} unit | Total Bayar: Rp ${Number(eventData.totalPrice).toLocaleString('id-ID')}`);
    console.log(`   -> Message ID: ${messageId}`);
    console.log(`===========================================================`);

    // Tandai pesan sudah diproses
    processedMessageIds.add(messageId);

    // Pengujian skenario crash (Langkah 07): crash sebelum memanggil channel.ack()
    if (IS_CRASH_MODE) {
      console.error(`💥 [SIMULASI CRASH] Consumer mati mendadak sebelum sempat mengirim ACK!`);
      process.exit(1);
    }

    // Konfirmasi ke RabbitMQ bahwa pesan berhasil diproses sempurna (Acknowledge)
    channel.ack(msg);
  });
}

startNotificationConsumer().catch((err) => {
  console.error('❌ Gagal menjalankan notification-service:', err.message);
  process.exit(1);
});

