const express = require('express');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Data contoh layanan RumahTools.
// Silakan ubah atau tambahkan layanan sesuai kebutuhan.
const tools = [
  {
    title: 'Konverter PDF',
    category: 'Dokumen',
    href: '/tools/pdf',
    desc: 'Bantu kebutuhan pengolahan dokumen PDF.',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    iconClass: 'fa-solid fa-file-pdf',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    badgeBorder: 'border-green-200',
    badgeLabel: 'Populer'
  },
  {
    title: 'Generator QR Code',
    category: 'Generator',
    href: '/tools/qr-code',
    desc: 'Buat QR Code untuk kebutuhan digital Anda.',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    iconClass: 'fa-solid fa-qrcode',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    badgeLabel: 'Praktis'
  },
  {
    title: 'Generator Teks',
    category: 'Generator',
    href: '/tools/teks',
    desc: 'Bantu membuat dan mengolah teks dengan mudah.',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    iconClass: 'fa-solid fa-wand-magic-sparkles',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    badgeLabel: 'Tools'
  },
  {
    title: 'Konverter Gambar',
    category: 'Gambar',
    href: '/tools/gambar',
    desc: 'Halaman untuk kebutuhan konversi gambar.',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    iconClass: 'fa-solid fa-image',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    badgeLabel: 'Praktis'
  },
  {
    title: 'Generator Slug',
    category: 'Generator',
    href: '/tools/slug',
    desc: 'Bantu membuat slug URL yang mudah dibaca.',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    iconClass: 'fa-solid fa-link',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    badgeLabel: 'SEO'
  },
  {
    title: 'Utilitas Digital',
    category: 'Utilitas',
    href: '/tools/utilitas',
    desc: 'Kumpulan alat bantu produktivitas digital.',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    iconClass: 'fa-solid fa-toolbox',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    badgeLabel: 'Tools'
  }
];

app.get('/', (req, res) => {
  res.render('index', {
    tools,
    // Halaman demo ini belum mengaktifkan middleware CSRF.
    csrfToken: '',
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || ''
  });
});

// Halaman sementara agar tautan contoh tidak menghasilkan 404.
app.get('/tools/:slug', (req, res) => {
  res.status(501).send(
    'Tools ini belum dibuat: ' + req.params.slug
  );
});

// Gunakan port yang diberikan hosting, jika tersedia.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RumahTools berjalan pada port ${PORT}`);
});