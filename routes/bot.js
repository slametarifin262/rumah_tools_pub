const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const os = require('os');
const fs = require('fs');
const path = require('path');

const toolsList = require('../config/tools.js');

const router = express.Router();
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: false });

// Helper AI (tanpa top-level await)
async function askAI(prompt) {
  try {
    const aiModule = await import('../services/aiService.js');
    const fn = aiModule.generateAnswerLLM || aiModule.default;
    if (typeof fn === 'function') {
      return await fn(prompt);
    }
    return "Maaf, fungsi AI tidak ditemukan.";
  } catch (e) {
    return "Maaf, fitur AI sedang tidak tersedia.";
  }
}

// 1. ROUTE GET (Untuk Pengujian Langsung lewat Browser / Health Check)
router.get('/webhook', (req, res) => {
  res.json({ ok: true, message: "Webhook Telegram Aktif & Ready!" });
});

// 2. ROUTE POST (Untuk Menerima Pesan dari Telegram API)
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (!update || !update.message || !update.message.text) {
      return res.json({ ok: true });
    }

    const msg = update.message;
    const chatId = msg.chat.id;
    const teks = msg.text.trim();
    const teksLower = teks.toLowerCase();

    // MENU / SAPAAN
    const kataSapaan = ['hay', 'hi', 'hai', 'halo', 'layanan', 'help', 'menu'];
    if (kataSapaan.some(kw => teksLower === kw || teksLower.startsWith(kw + ' '))) {
      const listTools = Array.isArray(toolsList) ? toolsList : (toolsList.default || []);
      const groupedTools = listTools.reduce((acc, tool) => {
        const cat = tool.category || 'Utilitas Lainnya';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(tool);
        return acc;
      }, {});

      let daftarToolsText = '';
      for (const [kategori, list] of Object.entries(groupedTools)) {
        daftarToolsText += `\n📁 *${kategori}*:\n`;
        list.forEach(item => {
          daftarToolsText += `  • \`analisa ${item.slug}\` _(${item.title})_\n`;
        });
      }

      const pesanMenu = 
`👋 *Halo Mandor! Selamat Datang di Bot Asisten*

🤖 *3 LAYANAN AGENT:*
1️⃣ *Tim Maintenance:* Ketik \`cek server\`
2️⃣ *Tim Produksi:* Ketik \`bersihkan server\`
3️⃣ *Tim Analisa Data:* Ketik \`analisa <slug_tool>\`

🛠️ *DAFTAR SLUG TOOL:*
${daftarToolsText}`;

      await bot.sendMessage(chatId, pesanMenu, { parse_mode: 'Markdown' });
      return res.json({ ok: true });
    }

    // CEK SERVER
    if (teksLower.includes('cek server')) {
      const uptimeJam = (process.uptime() / 3600).toFixed(2);
      const ramBebas = (os.freemem() / (1024 * 1024)).toFixed(0);
      const totalRam = (os.totalmem() / (1024 * 1024)).toFixed(0);

      const status = 
`🖥️ *Status Server:* Normal
⏱️ *Uptime:* ${uptimeJam} Jam
💾 *Sisa RAM:* ${ramBebas} MB / ${totalRam} MB`;

      await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
      return res.json({ ok: true });
    }

    // BERSIHKAN SERVER
    if (teksLower.includes('bersihkan server')) {
      const folderTemp = path.join(process.cwd(), 'public/uploads/temp');
      let jumlahTerhapus = 0;

      if (fs.existsSync(folderTemp)) {
        const files = fs.readdirSync(folderTemp);
        for (const file of files) {
          fs.unlinkSync(path.join(folderTemp, file));
          jumlahTerhapus++;
        }
      }

      await bot.sendMessage(
        chatId, 
        `✅ *Pembersihan Selesai!*\nBerhasil menghapus *${jumlahTerhapus} file temporer*.`, 
        { parse_mode: 'Markdown' }
      );
      return res.json({ ok: true });
    }

    // FALLBACK AI / TANYA
    if (teksLower.startsWith('tanya ') || teksLower.startsWith('ai ')) {
      const pertanyaan = teks.replace(/^(tanya|ai)\s+/i, '');
      const jawaban = await askAI(pertanyaan);
      await bot.sendMessage(chatId, `🤖 *Jawaban AI:*\n\n${jawaban}`, { parse_mode: 'Markdown' });
      return res.json({ ok: true });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(200).json({ ok: false, error: error.message });
  }
});

module.exports = router;