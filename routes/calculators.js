const express = require('express');
const router = express.Router();

module.exports = function (db, logUsage) {

    // 1. Halaman Utama Kalkulator Bisnis UMKM
    router.get('/kalkulator-bisnis', (req, res) => {
        res.render('tools/kalkulator-bisnis', {
            title: 'Kalkulator Bisnis & Keuangan UMKM',
            activeTab: req.query.type || 'margin',
            csrfToken: req.session.csrfToken || ''
        });
    });

    // 2. API Endpoint opsional jika ingin mencatat log aktivitas perhitungan UMKM
    router.post('/log-calculator-usage', async (req, res) => {
        try {
            const { type, summary } = req.body;
            if (typeof logUsage === 'function') {
                await logUsage(req, {
                    toolSlug: 'kalkulator-bisnis',
                    toolName: `Kalkulator Bisnis - ${type}`,
                    summary: summary || 'Melakukan perhitungan kalkulator bisnis'
                });
            }
            res.json({ success: true });
        } catch (error) {
            console.error('Error log calculator:', error);
            res.status(500).json({ success: false });
        }
    });

    return router;
};