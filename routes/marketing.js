const express = require('express');
const router = express.Router();

router.get('/marketing', async (req, res) => {
  try {
    // Simulasi rekap data / laporan performa marketing harian rumah_tools
    const marketingReport = {
      activePlatform: "rumah_tools",
      targetAudience: "Pekerja Kantoran & Profesional",
      popularTools: ["pdf-merge", "kompres-pdf", "qr-code"],
      statusPromo: "Aktif",
      message: "📈 Laporan Marketing: Layanan siap dibagikan untuk meningkatkan produktivitas kantor hari ini!",
      time: new Date()
    };

    console.log('📢 Tim Marketing menjalankan tugas laporan harian...');

    // Jika ingin otomatis kirim ringkasan promosi ke Telegram Anda:
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `📢 *Laporan Tim Marketing Rumah Tools*\n\nTarget: ${marketingReport.targetAudience}\nStatus Promo: ${marketingReport.statusPromo}\nTools Populer: ${marketingReport.popularTools.join(', ')}\n\n_Yuk, semangat sebarkan tools kantor tanpa ribet hari ini!_`
        })
      });
    }

    res.json({ ok: true, report: marketingReport });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;