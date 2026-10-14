const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
// PASTIKAN Anda mengimpor koneksi database Anda di sini. Sesuaikan path-nya jika berbeda!
const db = require('../config/db'); 

// ==========================================
// 🛡️ MIDDLEWARE: PROTEKSI AKSES CRON
// ==========================================
router.use((req, res, next) => {
  const token = req.headers.authorization || req.query.token;
  if (token !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, error: 'Akses ditolak. Anda bukan mandornya!' });
  }
  next();
});

// ==========================================
// 📲 HELPER: KIRIM PESAN TELEGRAM
// ==========================================
async function kirimTelegram(pesan) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: pesan,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) { 
    console.error('Gagal kirim telegram:', e.message); 
  }
}

// ==========================================
// 1. 🔧 TIM MAINTENANCE (Real Pinging / Cek URL Nyata)
// ==========================================
router.get('/maintenance', async (req, res) => {
  try {
    // Ambil base URL secara dinamis (contoh: http://localhost:3000)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const tools = ['/tools/pdf-merge', '/tools/qrcode', '/tools/undangan-digital'];
    
    let up = 0;
    let down = [];

    // Mengecek satu per satu apakah URL-nya merespons dengan baik (bukan 404/500)
    for (const tool of tools) {
      try {
        const response = await fetch(`${baseUrl}${tool}`);
        if (response.ok) up++;
        else down.push(tool);
      } catch (err) {
        down.push(tool); // Jika server mati total atau error fetch
      }
    }

    let pesan = `✅ *Tim Maintenance LAPOR*\nPengecekan jam ${new Date().toLocaleString('id-ID')}\nStatus: *${up}/${tools.length} Tools Aman*.`;
    if (down.length > 0) {
      pesan += `\n\n⚠️ *PERINGATAN! Fitur DOWN:* \n${down.join('\n')}`;
    }

    await kirimTelegram(pesan);
    res.json({ ok: true, tim: 'maintenance', up, down });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==========================================
// 2. 📢 TIM MARKETING (Real Database Query)
// ==========================================
router.get('/marketing', async (req, res) => {
  try {
    // QUERY NYATA: Menghitung jumlah undangan yang dibuat hari ini
    // Pastikan nama tabel Anda benar (misal: 'invitations') dan punya kolom 'created_at'
    const [rows] = await db.query('SELECT COUNT(*) as total FROM invitations WHERE DATE(created_at) = CURDATE()');
    const totalUndangan = rows[0].total || 0;

    const ideKonten = [
      "Cara kompres PDF tanpa pecah di HP",
      "Undangan digital 5 menit jadi, gak perlu desainer",
      "3 Tools gratis warga Semarang yang jarang tau"
    ];
    const ideHariIni = ideKonten[Math.floor(Math.random() * ideKonten.length)];

    const pesan = `📢 *Tim Marketing LAPOR*\n\n📊 *Statistik Hari Ini:*\n- Undangan Dibuat: *${totalUndangan} undangan baru.*\n\n💡 *Ide Konten Hari Ini:*\n"${ideHariIni}"\n\nTugas: Posting di IG Story jam 10.00 & 19.00`;

    await kirimTelegram(pesan);
    res.json({ ok: true, tim: 'marketing', stat_undangan: totalUndangan, ide: ideHariIni });
  } catch (err) {
    console.error("Error Marketing:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==========================================
// 3. 🏭 TIM PRODUKSI (Real File Cleanup)
// ==========================================
router.get('/production', async (req, res) => {
  try {
    // Tentukan folder tempat Anda menyimpan file sampah / upload sementara
    // Asumsi: folder 'uploads' ada di dalam folder 'public'
    const uploadDir = path.join(__dirname, '../public/uploads'); 
    let fileDibersihkan = 0;
    const maxAge = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik
    const now = Date.now();

    // Pastikan foldernya ada, lalu baca isinya
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);

      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        // Hanya hapus file biasa (bukan folder) yang umurnya > 24 jam
        if (stats.isFile() && (now - stats.mtimeMs > maxAge)) {
          fs.unlinkSync(filePath); // Hapus file dari hardisk!
          fileDibersihkan++;
        }
      }
    }

    await kirimTelegram(`🏭 *Tim Produksi LAPOR*\nBersih-bersih server harian selesai.\n*${fileDibersihkan} file sampah* (>24 jam) berhasil dihapus. Storage kembali aman.`);
    res.json({ ok: true, tim: 'production', cleaned: fileDibersihkan });
  } catch (err) {
    console.error("Error Produksi:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;