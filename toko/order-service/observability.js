import crypto from 'crypto';

export default function observability(app, serviceName) {
  const stats = {
    startedAt: new Date().toISOString(),
    requests: 0,
    totalMs: 0,
    errors5xx: 0
  };

  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    const t0 = process.hrtime.bigint();

    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      stats.requests++;
      stats.totalMs += ms;
      if (res.statusCode >= 500) stats.errors5xx++;

      console.log(
        JSON.stringify({
          time: new Date().toISOString(),
          service: serviceName,
          id,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ms: Math.round(ms)
        })
      );
    });

    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: serviceName,
      uptimeSec: Math.floor(process.uptime())
    });
  });

  app.get('/metrics', (_req, res) => {
    res.json({
      service: serviceName,
      startedAt: stats.startedAt,
      requests: stats.requests,
      errors5xx: stats.errors5xx,
      avgMs: stats.requests ? Math.round(stats.totalMs / stats.requests) : 0
    });
  });
}

