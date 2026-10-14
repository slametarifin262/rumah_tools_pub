const express = require('express');
const router = express.Router();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const XLSX = require('exceljs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { verifyCsrf, safeCompare } = require('../middleware/csrf');
const { convertNominal } = require('../utils/converter');

const uploadExcel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = require('path').extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.csv') cb(null, true);
        else cb(new Error('Hanya file CSV atau XLSX yang diperbolehkan.'));
    }
});

async function readExcelFile(buffer) {
    const workbook = new XLSX.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const data = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        const rowValues = row.values.slice(1).map(val => (val && typeof val === 'object' && val.result !== undefined ? val.result : val));
        data.push(rowValues);
    });
    return data;
}

module.exports = function (db, logUsage) {
    router.use(cors());

    const validateApiKey = async (req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        if (!apiKey) {
            return res.status(401).json({ success: false, message: 'Akses ditolak. API Key tidak ditemukan.' });
        }
        try {
            const [rows] = await db.query('SELECT * FROM api_keys WHERE api_key = ? AND status = "active"', [apiKey]);
            if (rows.length === 0) {
                return res.status(403).json({ success: false, message: 'API Key tidak valid atau telah dinonaktifkan.' });
            }
            req.apiKey = apiKey;
            req.apiUser = rows[0];
            next();
        } catch (error) {
            res.status(500).json({ success: false, message: 'Kesalahan server.' });
        }
    };

    const apiKeyRateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        keyGenerator: (req) => req.apiKey || req.ip,
        handler: (req, res) => {
            res.status(429).json({ success: false, error: 'Batas kuota API Key Anda telah habis. Silakan tunggu beberapa saat.' });
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Public API Endpoints
    router.get('/v1/tools', validateApiKey, apiKeyRateLimiter, async (req, res) => {
        try {
            const [rows] = await db.query('SELECT id, nama_tool, deskripsi FROM tools');
            res.json({ success: true, total: rows.length, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Gagal mengambil data.' });
        }
    });

    router.get('/v1/tools/:id', validateApiKey, apiKeyRateLimiter, async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM tools WHERE id = ?', [req.params.id]);
            if (rows.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Gagal mengambil detail data.' });
        }
    });

    // Donasi
    router.post('/donations/create', verifyCsrf, async (req, res) => {
        try {
            const { name, amount, bank } = req.body;
            const donorName = name && name.trim() !== '' ? name : 'Hamba Allah';
            const vaNumber = `${bank ? bank.toUpperCase() : 'BANK'}-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

            const [result] = await db.execute(
                'INSERT INTO donations (donor_name, amount, bank, va_number, status) VALUES (?, ?, ?, ?, 0)',
                [donorName, amount, bank, vaNumber]
            );

            res.json({ success: true, insertId: result.insertId, vaNumber, donorName, amount, status: 0 });
        } catch (error) {
            console.error('Error MySQL:', error);
            res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi' });
        }
    });

    router.post('/donations/webhook', async (req, res) => {
        try {
            const webhookSecret = req.headers['x-webhook-secret'];
            if (!safeCompare(webhookSecret, process.env.DONATION_WEBHOOK_SECRET || '')) {
                return res.status(401).json({ success: false, message: 'Webhook signature tidak valid.' });
            }

            const { va_number } = req.body;
            const [result] = await db.execute('UPDATE donations SET status = 1 WHERE va_number = ? AND status = 0', [va_number]);

            if (result.affectedRows > 0) {
                res.json({ success: true, message: 'Status donasi berhasil diubah ke Terbayar (1)' });
            } else {
                res.status(404).json({ success: false, message: 'VA tidak ditemukan atau sudah dibayar' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui status' });
        }
    });

    router.post('/donations/simulate', verifyCsrf, async (req, res) => {
        try {
            const { va_number } = req.body;
            const [result] = await db.execute('UPDATE donations SET status = 1 WHERE va_number = ? AND status = 0', [va_number]);

            if (result.affectedRows > 0) {
                res.json({ success: true, message: 'Status donasi berhasil diubah ke Terbayar (1) [SIMULASI]' });
            } else {
                res.status(404).json({ success: false, message: 'VA tidak ditemukan atau sudah dibayar' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui status' });
        }
    });

    // Kalender Events
    router.get('/kalender/events', async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT id, nama_peringatan AS title, DATE_FORMAT(tanggal, '%Y-%m-%d') AS start, categories, keterangan
                FROM kalender_peringatan
            `);

            const events = rows.map(item => {
                let parsedCategories = [];
                if (typeof item.categories === 'string') {
                    try { parsedCategories = JSON.parse(item.categories); } catch (e) { parsedCategories = [item.categories]; }
                } else if (Array.isArray(item.categories)) {
                    parsedCategories = item.categories;
                }
                return {
                    id: item.id,
                    title: item.title,
                    start: item.start,
                    allDay: true,
                    extendedProps: { categories: parsedCategories, keterangan: item.keterangan || '' }
                };
            });

            res.json(events);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            res.status(500).json({ error: 'Gagal mengambil data dari database' });
        }
    });

    router.post('/kalender/generate', requireAdmin, verifyCsrf, async (req, res) => {
        const { tahun } = req.body;
        if (!tahun) return res.status(400).json({ success: false, message: 'Tahun harus diisi' });

        try {
            const [masters] = await db.query('SELECT * FROM master_peringatan');
            let generated = 0;

            for (const master of masters) {
                const [exists] = await db.query('SELECT id FROM kalender_peringatan WHERE master_id = ? AND tahun = ?', [master.id, tahun]);
                if (exists.length === 0) {
                    const mm = String(master.bulan).padStart(2, '0');
                    const dd = String(master.tanggal_default).padStart(2, '0');
                    const tanggalFormatted = `${tahun}-${mm}-${dd}`;
                    const ket = master.is_hijriah ? 'Harap sesuaikan tanggal Masehi dengan kalender resmi Hijriah.' : '';

                    await db.query(
                        'INSERT INTO kalender_peringatan (master_id, tahun, nama_peringatan, tanggal, categories, keterangan) VALUES (?, ?, ?, ?, ?, ?)',
                        [master.id, tahun, master.nama_peringatan, tanggalFormatted, JSON.stringify(master.categories), ket]
                    );
                    generated++;
                }
            }

            await logUsage(req, { toolSlug: 'kalender', toolName: 'Kalender Kerja & Peringatan', summary: `Generate ${generated} peringatan tahun ${tahun}` });
            res.json({ success: true, message: `Berhasil generate ${generated} data untuk tahun ${tahun}.` });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    router.post('/kalender/save', requireAdmin, verifyCsrf, async (req, res) => {
        const { id, nama_peringatan, tanggal, categories, keterangan } = req.body;
        const tahun = new Date(tanggal).getFullYear();
        const categoriesJson = JSON.stringify(Array.isArray(categories) ? categories : [categories]);

        try {
            if (id) {
                await db.query(
                    'UPDATE kalender_peringatan SET nama_peringatan = ?, tanggal = ?, tahun = ?, categories = ?, keterangan = ? WHERE id = ?',
                    [nama_peringatan, tanggal, tahun, categoriesJson, keterangan, id]
                );
            } else {
                await db.query(
                    'INSERT INTO kalender_peringatan (nama_peringatan, tanggal, tahun, categories, keterangan) VALUES (?, ?, ?, ?, ?)',
                    [nama_peringatan, tanggal, tahun, categoriesJson, keterangan]
                );
            }

            await logUsage(req, { toolSlug: 'kalender', toolName: 'Kalender Kerja & Peringatan', summary: `Simpan peringatan: ${nama_peringatan}` });
            res.json({ success: true, message: 'Data berhasil disimpan.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    router.delete('/kalender/delete/:id', requireAdmin, verifyCsrf, async (req, res) => {
        try {
            await db.query('DELETE FROM kalender_peringatan WHERE id = ?', [req.params.id]);
            await logUsage(req, { toolSlug: 'kalender', toolName: 'Kalender Kerja & Peringatan', summary: `Hapus peringatan ID ${req.params.id}` });
            res.json({ success: true, message: 'Event berhasil dihapus.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // Excel Converter
    router.post('/number-to-text/read-excel', verifyCsrf, uploadExcel.single('file'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'File Excel tidak ditemukan.' });

            const data = await readExcelFile(req.file.buffer);
            if (!data || data.length < 2) return res.status(400).json({ success: false, message: 'File Excel tidak memiliki data yang cukup.' });

            const headers = data[0].map((header, index) => String(header ?? `Kolom ${index + 1}`));
            const nominalIndex = headers.findIndex(header => header.toLowerCase().trim() === 'nominal');

            if (nominalIndex === -1) return res.status(400).json({ success: false, message: 'Kolom "Nominal" tidak ditemukan.' });

            const rows = data.slice(1).filter(row => row.some(val => val !== null && val !== undefined && val !== ''));
            const workbook = new XLSX.Workbook();
            const worksheet = workbook.addWorksheet('Hasil Terbilang');

            worksheet.addRow([...headers, 'Terbilang']);
            rows.forEach(row => {
                const nominal = row[nominalIndex];
                const terbilang = convertNominal(nominal, true);
                worksheet.addRow([...headers.map((_, i) => row[i] ?? ''), terbilang]);
            });

            const outputBuffer = await workbook.xlsx.writeBuffer();

            await logUsage(req, {
                toolSlug: 'number-to-text',
                toolName: 'Nominal ke Teks (Excel)',
                summary: `${rows.length} baris dipproses dari "${req.file.originalname}"`,
                fileBuffer: outputBuffer,
                fileName: 'Hasil_Terbilang.xlsx',
                fileMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Hasil_Terbilang.xlsx"');
            res.send(Buffer.from(outputBuffer));
        } catch (error) {
            console.error('Error Excel:', error);
            res.status(500).json({ success: false, message: 'Gagal memproses file Excel.' });
        }
    });

    // Logging QR & Barcode
    router.post('/qr-code/log', verifyCsrf, async (req, res) => {
        try {
            const { text, dataUrl } = req.body;
            if (!text || !dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
                return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
            }

            const fileBuffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
            const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;

            await logUsage(req, {
                toolSlug: 'qr-code',
                toolName: 'QR Code Generator',
                summary: `QR untuk: "${preview}"`,
                fileBuffer,
                fileName: 'rumah-tools-qr-code.png',
                fileMime: 'image/png'
            });

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mencatat riwayat QR Code.' });
        }
    });

    router.post('/barcode/log', verifyCsrf, async (req, res) => {
        try {
            const { text, format, svg } = req.body;
            if (!text || !svg) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

            const fileBuffer = Buffer.from(svg, 'utf8');
            const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;

            await logUsage(req, {
                toolSlug: 'barcode',
                toolName: 'Barcode Generator',
                summary: `Barcode ${format || ''} untuk: "${preview}"`,
                fileBuffer,
                fileName: 'rumah-tools-barcode.svg',
                fileMime: 'image/svg+xml'
            });

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mencatat riwayat Barcode.' });
        }
    });

    // ==========================================
    // PRODUCTS & KASIR — semua route di bawah ini KONSISTEN pakai skema
    // store_id + tabel product_units (multi-satuan). Sebelumnya ada dua
    // skema produk yang beda (store_id vs user_id) menulis ke tabel `products`
    // yang sama — itu penyebab "gagal simpan" / "gagal hapus". Sudah disatukan.
    // ==========================================

    // Cari produk by barcode — cocok ke barcode utama ATAU barcode varian satuan
    router.get('/v1/product/scan/:barcode', requireAuth, async (req, res) => {
        try {
            const storeId = req.session?.user?.store_id || 1;
            const { barcode } = req.params;
            const [rows] = await db.query(
                `SELECT DISTINCT p.* FROM products p
                 LEFT JOIN product_units pu ON pu.product_id = p.id
                 WHERE p.store_id = ? AND (p.barcode = ? OR pu.barcode_satuan = ?)
                 LIMIT 1`,
                [storeId, barcode, barcode]
            );

            if (rows.length === 0) return res.json({ success: false, message: 'Produk tidak ditemukan.' });
            res.json({ success: true, product: rows[0] });
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    });

    router.get('/v1/product/search', requireAuth, async (req, res) => {
        try {
            const storeId = req.session?.user?.store_id || 1;
            const query = req.query.q || '';
            const [rows] = await db.query(
                `SELECT DISTINCT p.* FROM products p
                 LEFT JOIN product_units pu ON pu.product_id = p.id
                 WHERE p.store_id = ? AND (p.barcode = ? OR p.nama_produk LIKE ? OR pu.barcode_satuan = ?)`,
                [storeId, query, `%${query}%`, query]
            );
            res.json({ success: true, data: rows });
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    });

    router.get('/v1/products', requireAuth, async (req, res) => {
        try {
            const storeId = req.session?.user?.store_id || 1;
            const [products] = await db.query(
                `SELECT p.*, 
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id', pu.id,
                                'nama_satuan', pu.nama_satuan,
                                'jumlah_konversi', pu.jumlah_konversi,
                                'harga_jual', pu.harga_jual,
                                'barcode_satuan', pu.barcode_satuan
                            )
                        ) AS units
                 FROM products p
                 LEFT JOIN product_units pu ON p.id = pu.product_id
                 WHERE p.store_id = ?
                 GROUP BY p.id
                 ORDER BY p.id DESC`,
                [storeId]
            );
            res.json({ success: true, data: products });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data produk: ' + err.message });
        }
    });

    router.post('/v1/products', requireAuth, verifyCsrf, async (req, res) => {
        const storeId = req.session?.user?.store_id || 1;
        const { kode_barcode, nama_produk, satuan_terkecil, stok_terkecil, units } = req.body;

        if (!nama_produk || !satuan_terkecil || !units || units.length === 0) {
            return res.json({ success: false, message: 'Data produk dan minimal 1 satuan harus diisi!' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [prodResult] = await connection.query(
                `INSERT INTO products (store_id, barcode, nama_produk, satuan_terkecil, stok_terkecil) VALUES (?, ?, ?, ?, ?)`,
                [storeId, kode_barcode || null, nama_produk, satuan_terkecil, stok_terkecil || 0]
            );

            const productId = prodResult.insertId;

            for (const unit of units) {
                await connection.query(
                    `INSERT INTO product_units (product_id, nama_satuan, jumlah_konversi, harga_jual, barcode_satuan) VALUES (?, ?, ?, ?, ?)`,
                    [productId, unit.nama_satuan, unit.jumlah_konversi, unit.harga_jual, unit.barcode_satuan || null]
                );
            }

            await connection.commit();
            res.json({ success: true, message: 'Produk berhasil disimpan!', productId });
        } catch (err) {
            await connection.rollback();
            res.json({ success: false, message: 'Gagal menyimpan: ' + err.message });
        } finally {
            connection.release();
        }
    });

    router.put('/v1/products/:id', requireAuth, verifyCsrf, async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const storeId = req.session?.user?.store_id || 1;
            const productId = req.params.id;
            const { kode_barcode, nama_produk, satuan_terkecil, stok_terkecil, units } = req.body;

            const [result] = await connection.query(
                'UPDATE products SET barcode = ?, nama_produk = ?, satuan_terkecil = ?, stok_terkecil = ? WHERE id = ? AND store_id = ?',
                [kode_barcode || null, nama_produk, satuan_terkecil, stok_terkecil || 0, productId, storeId]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.json({ success: false, message: 'Produk tidak ditemukan.' });
            }

            if (Array.isArray(units)) {
                await connection.query('DELETE FROM product_units WHERE product_id = ?', [productId]);
                for (const unit of units) {
                    await connection.query(
                        `INSERT INTO product_units (product_id, nama_satuan, jumlah_konversi, harga_jual, barcode_satuan) VALUES (?, ?, ?, ?, ?)`,
                        [productId, unit.nama_satuan, unit.jumlah_konversi, unit.harga_jual, unit.barcode_satuan || null]
                    );
                }
            }

            await connection.commit();
            res.json({ success: true, message: 'Produk berhasil diperbarui!' });
        } catch (err) {
            await connection.rollback();
            res.json({ success: false, message: 'Gagal memperbarui: ' + err.message });
        } finally {
            connection.release();
        }
    });

    router.delete('/v1/products/:id', requireAuth, verifyCsrf, async (req, res) => {
        try {
            const storeId = req.session?.user?.store_id || 1;
            const productId = req.params.id;
            const [result] = await db.query('DELETE FROM products WHERE id = ? AND store_id = ?', [productId, storeId]);
            if (result.affectedRows === 0) {
                return res.json({ success: false, message: 'Produk tidak ditemukan.' });
            }
            res.json({ success: true, message: 'Produk berhasil dihapus!' });
        } catch (err) {
            res.json({ success: false, message: 'Gagal menghapus: ' + err.message });
        }
    });

    router.post('/v1/checkout', requireAuth, verifyCsrf, async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const userId = req.session.user.id;
            const storeId = req.session.user.store_id || 1;
            const { items, total_harga, ket_bayar, bayar, kembali } = req.body;

            const [trxResult] = await connection.query(
                `INSERT INTO transactions (user_id, store_id, total_harga, ket_bayar, bayar, kembali) VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, storeId, total_harga, ket_bayar, bayar, kembali]
            );
            const transactionId = trxResult.insertId;

            for (const item of items) {
                const totalQtyTerkecilDipotong = item.qty_jual * item.jumlah_konversi;

                await connection.query(
                    `INSERT INTO transaction_details (transaction_id, user_id, product_id, nama_produk, satuan, harga, qty, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [transactionId, userId, item.product_id, `${item.nama_produk} (${item.nama_satuan})`, item.nama_satuan, item.harga_jual, item.qty_jual, item.subtotal]
                );

                await connection.query(
                    `UPDATE products SET stok_terkecil = stok_terkecil - ? WHERE id = ? AND store_id = ?`,
                    [totalQtyTerkecilDipotong, item.product_id, storeId]
                );
            }

            await connection.commit();
            res.json({ success: true, transactionId });
        } catch (err) {
            await connection.rollback();
            res.json({ success: false, message: err.message });
        } finally {
            connection.release();
        }
    });

    // Catatan: endpoint inventory lama (/v1/inventory/add, /update, /delete) sudah
    // dihapus karena memakai skema products.user_id yang konflik dengan skema
    // store_id + product_units yang dipakai halaman Tambah Produk & Inventaris.
    // Gunakan /v1/products (POST), /v1/products/:id (PUT/DELETE) sebagai gantinya.

    // Sales Reports
    router.get('/v1/reports/sales', requireAuth, async (req, res) => {
        try {
            const userId = req.session.user.id;
            const { startDate, endDate, ketBayar } = req.query;

            let query = `
                SELECT t.id, t.total_harga, t.ket_bayar, t.created_at, 
                       COUNT(td.id) AS total_item, SUM(td.qty) AS total_qty
                FROM transactions t
                LEFT JOIN transaction_details td ON t.id = td.transaction_id
                WHERE t.user_id = ?
            `;
            let params = [userId];

            if (startDate && endDate) {
                query += ' AND DATE(t.created_at) BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                query += ' AND DATE(t.created_at) >= ?';
                params.push(startDate);
            } else if (endDate) {
                query += ' AND DATE(t.created_at) <= ?';
                params.push(endDate);
            }

            if (ketBayar && ketBayar !== 'ALL') {
                query += ' AND t.ket_bayar = ?';
                params.push(ketBayar);
            }

            query += ' GROUP BY t.id ORDER BY t.created_at DESC';

            const [transactions] = await db.query(query, params);
            const totalOmzet = transactions.reduce((sum, item) => sum + parseFloat(item.total_harga), 0);
            const totalTransaksi = transactions.length;

            res.json({ success: true, summary: { totalOmzet, totalTransaksi }, data: transactions });
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    });

    router.get('/v1/reports/sales/:id', requireAuth, async (req, res) => {
        try {
            const userId = req.session.user.id;
            const transactionId = req.params.id;

            const [trx] = await db.query(
                'SELECT t.*, u.email AS username FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = ? AND t.user_id = ?',
                [transactionId, userId]
            );

            if (trx.length === 0) return res.json({ success: false, message: 'Transaksi tidak ditemukan.' });

            const [items] = await db.query('SELECT * FROM transaction_details WHERE transaction_id = ?', [transactionId]);

            res.json({ success: true, transaction: trx[0], items });
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    });

    return router;
};