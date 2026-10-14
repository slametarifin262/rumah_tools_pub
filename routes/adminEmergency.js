const express = require('express');

module.exports = (db, logUsage) => {
    const router = express.Router();

    // 1. Tampilkan Daftar Kontak Darurat
    router.get('/', async (req, res) => {
        try {
            const [contacts] = await db.query(
                'SELECT * FROM emergency_contacts ORDER BY tier_level ASC, id DESC'
            );
            res.render('admin/emergency', { 
                contacts, 
                user: req.session.user 
            });
        } catch (error) {
            console.error("Error fetching emergency contacts:", error);
            res.status(500).send("Terjadi kesalahan server saat mengambil data");
        }
    });

    // 2. Tambah Kontak Darurat Baru
    router.post('/add', async (req, res) => {
        const { 
            name, 
            category, 
            tier_level, 
            phone_number, 
            whatsapp_number, 
            address, 
            latitude, 
            longitude 
        } = req.body;

        // Parsing & Validasi Koordinat
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).send("Nilai Latitude dan Longitude harus berupa angka desimal valid.");
        }

        // Tentukan Tier Level Otomatis jika tidak dipilih di form
        let assignedTier = parseInt(tier_level, 10);
        if (isNaN(assignedTier)) {
            if (['damkar', 'polisi'].includes(category)) {
                assignedTier = 2;
            } else if (category === 'lainnya') {
                assignedTier = 3;
            } else {
                assignedTier = 1;
            }
        }

        try {
            await db.query(
                `INSERT INTO emergency_contacts 
                 (name, category, tier_level, phone_number, whatsapp_number, address, latitude, longitude) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    name,
                    category,
                    assignedTier,
                    phone_number,
                    whatsapp_number || null,
                    address || null,
                    lat,
                    lng
                ]
            );

            res.redirect('/admin/emergency');
        } catch (error) {
            console.error("Detail Error SQL Insert:", error);
            res.status(500).send(`Gagal menambah data: ${error.sqlMessage || error.message}`);
        }
    });

    // 3. Hapus Kontak
    router.post('/delete/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('DELETE FROM emergency_contacts WHERE id = ?', [id]);
            res.redirect('/admin/emergency');
        } catch (error) {
            console.error("Error deleting contact:", error);
            res.status(500).send("Gagal menghapus data");
        }
    });

    return router;
};