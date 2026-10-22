import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.SERVICE_B_PORT || 5000;

app.use(cors());
app.use(express.json());

const reviews = [
  {
    id: 1,
    komik_id: 1,
    judul_komik: 'Omniscient Reader Viewpoint',
    reviewer: 'Azzahra',
    rating: 9.8,
    comment: 'Alur cerita dan karakter Dokja sangat menarik!'
  },
  {
    id: 2,
    komik_id: 2,
    judul_komik: 'Tower of God',
    reviewer: 'Budi Santoso',
    rating: 9.5,
    comment: 'World building sangat luas dan penuh misteri lantai demi lantai.'
  },
  {
    id: 3,
    komik_id: 3,
    judul_komik: 'Im the Max-Level Newbie',
    reviewer: 'Citra',
    rating: 8.8,
    comment: 'Aksi pertarungan seru dan pacing ceritanya cepat.'
  }
];

app.get('/', (_req, res) => {
  res.json({
    service: 'Service B - Review & Rating Service (Week 4)',
    port: PORT,
    status: 'running',
    endpoints: {
      all_reviews: '/reviews',
      review_detail: '/reviews/:id'
    }
  });
});

app.get('/reviews', (_req, res) => {
  res.json({
    service: 'Service B - Review & Rating Service (Week 4)',
    total: reviews.length,
    reviews
  });
});

app.get('/reviews/:id', (req, res) => {
  const review = reviews.find((r) => r.id === Number(req.params.id));
  if (!review) {
    return res.status(404).json({ error: 'Review tidak ditemukan' });
  }
  res.json({
    service: 'Service B - Review & Rating Service (Week 4)',
    review
  });
});

app.listen(PORT, () => {
  console.log(`⭐ [Service B] Review & Rating berjalan di port ${PORT}`);
});
