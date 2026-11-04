// ===================================================================
// [LAB 08 - Langkah 04] Skrip Pembuktian Rate Limiting Gateway
// Mengirim 30 request berturut-turut ke API Gateway (port 8080)
// Hasil yang diharapkan: 20 request berstatus 200, 10 request berstatus 429
// ===================================================================

(async () => {
  console.log('⚡ Pengujian Rate Limiting pada API Gateway (Maks. 20 request / 10s)');
  console.log('Target URL: http://localhost:8080/service-a/health');
  console.log('-----------------------------------------------------------------');

  let success = 0;
  let rejected = 0;

  for (let i = 1; i <= 30; i++) {
    try {
      const res = await fetch('http://localhost:8080/service-a/health');
      const label = res.status === 200 ? '200 OK (Request Lolos)' :
                    res.status === 429 ? '429 Too Many Requests (Ditolak Gateway)' :
                    `${res.status} ${res.statusText}`;

      if (res.status === 200) success++;
      if (res.status === 429) rejected++;

      console.log(`Request ${String(i).padStart(2, ' ')} -> Status: ${res.status} [${label}]`);
    } catch (err) {
      console.error(`Request ${i} Gagal:`, err.message);
    }
  }

  console.log('-----------------------------------------------------------------');
  console.log(`Hasil: ${success} request berhasil, ${rejected} request ditolak (429).`);
})();
