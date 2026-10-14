// routes/tools.js
// SINTAKS BARU (ES Module)
import express from 'express';
const router = express.Router();

export default router;
const toolsConfig = require('../config/tools'); // Panggil file konfigurasi

// Endpoint untuk merender halaman spesifik tool
router.get('/:slug', (req, res) => {
    const slug = req.params.slug;
    
    // Cari data tool dari konfigurasi berdasarkan slug
    const toolData = toolsConfig.find(tool => tool.slug === slug);

    if (!toolData) {
        // Jika tool tidak ada di config, kembalikan halaman 404
        return res.status(404).render('404', { 
            title: 'Tidak Ditemukan', 
            message: 'Alat yang Anda cari tidak tersedia.' 
        });
    }

    try {
        // Render file EJS yang ada di folder views/tools/ dengan nama sesuai slug
        // Kirimkan juga 'toolData' agar view bisa menampilkan judul dan deskripsi dinamis
        res.render(`tools/${slug}`, { 
            title: toolData.title,
            tool: toolData 
        });
    } catch (error) {
        console.error(`Gagal merender view untuk tool: ${slug}`, error);
        res.status(500).send('Terjadi kesalahan saat memuat tampilan alat ini.');
    }
});

module.exports = router;