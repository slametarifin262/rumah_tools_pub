const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { safeCompare } = require('../middleware/csrf');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi beberapa saat.' }
});

const resetAccessLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(404).send('Halaman tidak ditemukan.')
});

module.exports = function (db) {
    // GET /login
    router.get('/login', (req, res) => {
        if (req.session && req.session.user) {
            return res.redirect('/dashboard/api-key');
        }
        res.render('login', {
            title: 'Login Masuk',
            error: req.query.error || null
        });
    });

    // POST /login
    router.post('/login', loginLimiter, async (req, res) => {
        const { email, password } = req.body;
        const genericError = 'Email atau password salah.';

        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length === 0) {
                return res.render('login', { title: 'Login Admin', page: 'login', error: genericError });
            }

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.render('login', { title: 'Login Admin', page: 'login', error: genericError });
            }

            req.session.user = { id: user.id, name: user.name || user.nama, role: user.role, store_id: user.store_id || 1 };
            res.redirect('/dashboard/api-key');
        } catch (err) {
            console.error('Login Error:', err.message);
            res.status(500).send('Terjadi kesalahan server.');
        }
    });

    // GET /logout
    router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    });

    // GET /reset-akses/:token
    router.get('/reset-akses/:token', resetAccessLimiter, async (req, res) => {
        if (!safeCompare(req.params.token, process.env.RESET_ACCESS_TOKEN)) {
            return res.status(404).send('Halaman tidak ditemukan.');
        }

        const adminEmail = process.env.RESET_ACCESS_EMAIL || 'admin@gmail.com';

        try {
            const newPassword = crypto.randomBytes(9).toString('base64url');
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const [result] = await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, adminEmail]);

            if (result.affectedRows === 0) {
                return res.status(404).send(`Akun dengan email ${adminEmail} tidak ditemukan.`);
            }

            console.log(`>>> Reset akses dipakai untuk ${adminEmail} dari IP ${req.ip} pada ${new Date().toISOString()}`);

            res.type('text/plain').send(
                `Password untuk akun ${adminEmail} berhasil direset.\n\n` +
                `Password baru (HANYA tampil sekali di sini): ${newPassword}\n\n` +
                `Segera login di /login lalu ganti ke password pilihan Anda sendiri.`
            );
        } catch (err) {
            console.error('Gagal reset akses:', err);
            res.status(500).send('Gagal mereset akses. Cek log server.');
        }
    });

    return router;
};