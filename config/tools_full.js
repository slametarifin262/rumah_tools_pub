// config/tools.js
// Daftar metadata tool yang ditampilkan sebagai grid card di halaman utama
// (views/index.ejs). Dibuat sebagai file konfigurasi (bukan tabel database)
// karena menambah tool baru selalu butuh perubahan kode (route + view) juga,
// jadi file config yang di-version-control sudah cukup, tanpa perlu tabel +
// panel admin khusus untuk CRUD tool.
//
// Dipakai di app.js pada GET '/' -> res.render('index', { tools: TOOLS, ... })
// lalu di-loop di index.ejs untuk membentuk elemen <a class="tool-card">.
//
// Field:
//   slug        - identifier singkat tool
//   title       - nama tool yang tampil di kartu
//   desc        - deskripsi singkat di bawah judul
//   href        - link tujuan kartu
//   category    - nilai data-category (dipakai filter tab di halaman utama)
//   iconClass   - class ikon FontAwesome, mis. "fa-solid fa-file-pdf"
//   iconBg      - class background kotak ikon (mis. "bg-red-50")
//   iconText    - class warna ikon (mis. "text-red-600")
//   badgeLabel  - teks label kategori kecil di pojok kanan atas kartu
//   badgeBg     - class background badge
//   badgeText   - class warna teks badge
//   badgeBorder - class border badge

// module.exports = [
export const TOOLS = [
    //emrgensi
    {
        slug: 'darurat',
        title: 'Kontak Darurat Terdekat',
        desc: 'Temukan dan hubungi armada mobil desa, ambulans, puskesmas, damkar, dan polisi terdekat dari lokasi Anda.',
        href: '/tools/darurat',
        category: 'Produktivitas & Utilitas',
        iconClass: 'fa-solid fa-truck-medical',
        iconBg: 'bg-red-50',
        iconText: 'text-red-600',
        badgeLabel: 'Kontak Darurat',
        badgeBg: 'bg-red-50',
        badgeText: 'text-red-600',
        badgeBorder: 'border-red-100'
    },
    // ==================== Event & Kreatif ====================
    // Tambahkan di dalam module.exports = [ ... ]
    {
        slug: 'papan-skor',
        title: 'Papan Skor Serbaguna',
        desc: 'Papan skor digital interaktif untuk berbagai cabang olahraga (Futsal, Badminton, Basket, Voli, Dll) dilengkapi timer dan aturan kustom.',
        href: '/tools/papan-skor',
        category: 'Produktivitas & Utilitas',
        iconClass: 'fa-solid fa-trophy',
        iconBg: 'bg-amber-50', iconText: 'text-amber-600',
        badgeLabel: 'Produktivitas',
        badgeBg: 'bg-blue-50', badgeText: 'text-blue-600', badgeBorder: 'border-blue-100'
    },
    {
        slug: 'undangan-digital',
        title: 'Undangan Digital (Web)',
        desc: 'Buat undangan pernikahan atau acara dengan mudah. Mendukung mode instan dan mode drag-and-drop kustom.',
        href: '/tools/undangan-digital',
        category: 'Event & Kreatif',
        iconClass: 'fa-solid fa-envelope-open-text',
        iconBg: 'bg-pink-50', 
        iconText: 'text-pink-600',
        badgeLabel: 'Kreatif',
        badgeBg: 'bg-pink-50', 
        badgeText: 'text-pink-600', 
        badgeBorder: 'border-pink-100'
    },
    // ==================== Dokumen & PDF ====================
    {
        slug: 'pdf-merge',
        title: 'PDF Merge',
        desc: 'Gabungkan beberapa dokumen PDF menjadi satu berkas secara urut dan rapi.',
        href: '/tools/pdf-merge',
        category: 'Dokumen & PDF',
        iconClass: 'fa-solid fa-file-pdf',
        iconBg: 'bg-red-50', iconText: 'text-red-600',
        badgeLabel: 'Dokumen & PDF',
        badgeBg: 'bg-red-50', badgeText: 'text-red-600', badgeBorder: 'border-red-100'
    },
    {
        slug: 'compress-pdf',
        title: 'Kompres Dokumen PDF',
        desc: 'Kecilkan ukuran file PDF dokumen/laporan tanpa mengorbankan keterbacaan teks.',
        href: '/tools/compress-pdf',
        category: 'Dokumen & PDF',
        iconClass: 'fa-solid fa-file-pdf',
        iconBg: 'bg-red-50', iconText: 'text-red-600',
        badgeLabel: 'Dokumen & PDF',
        badgeBg: 'bg-red-50', badgeText: 'text-red-600', badgeBorder: 'border-red-100'
    },
    {
        slug: 'pdf-watermark',
        title: 'PDF Watermark',
        desc: 'Amankan dokumen PDF Anda dengan tanda air teks atau gambar kustom.',
        href: '/tools/pdf-watermark',
        category: 'Dokumen & PDF',
        iconClass: 'fa-solid fa-stamp',
        iconBg: 'bg-orange-50', iconText: 'text-orange-600',
        badgeLabel: 'Dokumen & PDF',
        badgeBg: 'bg-red-50', badgeText: 'text-red-600', badgeBorder: 'border-red-100'
    },
    {
        slug: 'pdf-signature',
        title: 'PDF Signature',
        desc: 'Bubuhkan tanda tangan digital pada berkas dokumen secara langsung dan presisi.',
        href: '/tools/pdf-signature',
        category: 'Dokumen & PDF',
        iconClass: 'fa-solid fa-signature',
        iconBg: 'bg-amber-50', iconText: 'text-amber-600',
        badgeLabel: 'Dokumen & PDF',
        badgeBg: 'bg-red-50', badgeText: 'text-red-600', badgeBorder: 'border-red-100'
    },

    // ==================== Gambar & Media ====================
    {
        slug: 'resize-image',
        title: 'Resize & Kompres Gambar',
        desc: 'Ubah dimensi gambar menjadi lebih besar/kecil dan atur tingkat kompresi file (JPG, PNG, WebP).',
        href: '/tools/resize-image',
        category: 'Gambar & Media',
        iconClass: 'fa-solid fa-expand-wide',
        iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
        badgeLabel: 'Gambar & Media',
        badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600', badgeBorder: 'border-emerald-100'
    },
    {
        slug: 'background-remover',
        title: 'Background Remover',
        desc: 'Hapus latar belakang foto objek/orang secara otomatis dan efisien.',
        href: '/tools/background-remover',
        category: 'Gambar & Media',
        iconClass: 'fa-solid fa-image',
        iconBg: 'bg-pink-50', iconText: 'text-pink-600',
        badgeLabel: 'Gambar & Media',
        badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600', badgeBorder: 'border-emerald-100'
    },
    {
        slug: 'geotag',
        title: 'Foto Geotag',
        desc: 'Tambahkan watermark lokasi, koordinat GPS, timestamp, dan QR verifikasi keaslian pada foto.',
        href: '/tools/geotag',
        category: 'Gambar & Media',
        iconClass: 'fa-solid fa-map-location-dot',
        iconBg: 'bg-amber-50', iconText: 'text-amber-600',
        badgeLabel: 'Gambar & Media',
        badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600', badgeBorder: 'border-emerald-100'
    },

    // ==================== Bisnis & Keuangan ====================
    {
        slug: 'kasir',
        title: 'Aplikasi Kasir (POS)',
        desc: 'Sistem kasir digital untuk mencatat penjualan, kelola produk, dan mencetak struk transaksi.',
        href: '/tools/kasir',
        category: 'Bisnis & Keuangan',
        iconClass: 'fa-solid fa-cash-register',
        iconBg: 'bg-purple-50', iconText: 'text-purple-600',
        badgeLabel: 'Bisnis & Keuangan',
        badgeBg: 'bg-purple-50', badgeText: 'text-purple-600', badgeBorder: 'border-purple-100'
    },
    {
        slug: 'kalkulator-bisnis',
        title: 'Kalkulator Bisnis UMKM',
        desc: 'Hitung margin keuntungan, markup, PPN, diskon produk, hingga titik impas (BEP) untuk operasional usaha Anda.',
        href: '/tools/kalkulator-bisnis',
        category: 'Bisnis & Keuangan',
        iconClass: 'fa-solid fa-calculator',
        iconBg: 'bg-indigo-50', iconText: 'text-indigo-600',
        badgeLabel: 'Bisnis & Keuangan',
        badgeBg: 'bg-purple-50', badgeText: 'text-purple-600', badgeBorder: 'border-purple-100'
    },
    {
        slug: 'currency-detection',
        title: 'Currency Detection',
        desc: 'Deteksi dan ekstrak format mata uang secara otomatis dari dokumen teks.',
        href: '/tools/currency-detection',
        category: 'Bisnis & Keuangan',
        iconClass: 'fa-solid fa-money-bill-wave',
        iconBg: 'bg-cyan-50', iconText: 'text-cyan-600',
        badgeLabel: 'Bisnis & Keuangan',
        badgeBg: 'bg-purple-50', badgeText: 'text-purple-600', badgeBorder: 'border-purple-100'
    },
    {
        slug: 'number-to-text',
        title: 'Number to Text',
        desc: 'Konversi otomatis nominal angka menjadi kalimat terbilang untuk kuitansi/nota.',
        href: '/tools/number-to-text',
        category: 'Bisnis & Keuangan',
        iconClass: 'fa-solid fa-font-case',
        iconBg: 'bg-purple-50', iconText: 'text-purple-600',
        badgeLabel: 'Bisnis & Keuangan',
        badgeBg: 'bg-purple-50', badgeText: 'text-purple-600', badgeBorder: 'border-purple-100'
    },

    // ==================== Generator & Kode ====================
    {
        slug: 'qr-code',
        title: 'QR Code Generator',
        desc: 'Buat QR Code kustom dari tautan, teks, atau kontak dengan kualitas tinggi.',
        href: '/tools/qr-code',
        category: 'Generator & Kode',
        iconClass: 'fa-solid fa-qrcode',
        iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
        badgeLabel: 'Generator & Kode',
        badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-100'
    },
    {
        slug: 'barcode',
        title: 'Barcode Generator',
        desc: 'Hasilakn kode batang standar industri untuk inventaris dan produk Anda.',
        href: '/tools/barcode',
        category: 'Generator & Kode',
        iconClass: 'fa-solid fa-barcode',
        iconBg: 'bg-teal-50', iconText: 'text-teal-600',
        badgeLabel: 'Generator & Kode',
        badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-100'
    },
    {
        slug: 'short-link',
        title: 'Generate Short Link',
        desc: 'Konversi URL panjang Anda menjadi link ringkas yang profesional dan mudah dibagikan.',
        href: '/tools/short-link',
        category: 'Generator & Kode',
        iconClass: 'fa-solid fa-link',
        iconBg: 'bg-indigo-50', iconText: 'text-indigo-600',
        badgeLabel: 'Generator & Kode',
        badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-100'
    },
    {
        slug: 'password-generator',
        title: 'Generate Password',
        desc: 'Hasikan kata sandi kuat dan aman berstandar enkripsi tinggi.',
        href: '/tools/password-generator',
        category: 'Generator & Kode',
        iconClass: 'fa-solid fa-key',
        iconBg: 'bg-rose-50', iconText: 'text-rose-600',
        badgeLabel: 'Generator & Kode',
        badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-100'
    },

    // ==================== Produktivitas & Utilitas ====================
    {
        slug: 'kalender',
        title: 'Kalender Kerja & Peringatan',
        desc: 'Jadwal hari besar, agenda Pemkab Cilacap, dan penyesuaian tanggal keagamaan.',
        href: '/tools/kalender',
        category: 'Produktivitas & Utilitas',
        iconClass: 'fa-regular fa-calendar-check',
        iconBg: 'bg-blue-50', iconText: 'text-blue-600',
        badgeLabel: 'Produktivitas',
        badgeBg: 'bg-blue-50', badgeText: 'text-blue-600', badgeBorder: 'border-blue-100'
    },
    {
        slug: 'text-to-speech',
        title: 'Text to Speech',
        desc: 'Ubah naskah tulisan menjadi audio narasi alami langsung dari browser.',
        href: '/tools/text-to-speech',
        category: 'Produktivitas & Utilitas',
        iconClass: 'fa-solid fa-volume-high',
        iconBg: 'bg-violet-50', iconText: 'text-violet-600',
        badgeLabel: 'Produktivitas',
        badgeBg: 'bg-blue-50', badgeText: 'text-blue-600', badgeBorder: 'border-blue-100'
    },
    {
        slug: 'undian',
        title: 'Roda Undian Custom',
        desc: 'Papan undian acak berputar untuk doorprize, acak nama pemenang, pilihan kelompok, dan giveaway secara transparan.',
        href: '/tools/undian',
        category: 'Produktivitas & Utilitas',
        iconClass: 'fa-solid fa-arrows-spin',
        iconBg: 'bg-purple-50', iconText: 'text-purple-600',
        badgeLabel: 'Produktivitas',
        badgeBg: 'bg-blue-50', badgeText: 'text-blue-600', badgeBorder: 'border-blue-100'
    }
];
// Tambahkan di baris paling bawah config/tools.js
export default TOOLS;