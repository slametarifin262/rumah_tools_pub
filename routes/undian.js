const express = require('express');
const router = express.Router();

module.exports = function (db, logUsage) {

    // Render Halaman Roda Undian
    router.get('/undian', (req, res) => {
        res.render('tools/undian', {
            title: 'Roda Undian Custom / Lucky Spin Wheel',
            csrfToken: req.session.csrfToken || ''
        });
    });

    // Logging Penggunaan Undian (Opsional)
    router.post('/log-undian-usage', async (req, res) => {
        try {
            const { winner, totalParticipants } = req.body;
            if (typeof logUsage === 'function') {
                await logUsage(req, {
                    toolSlug: 'undian',
                    toolName: 'Roda Undian Custom',
                    summary: `Pengundian berhasil. Pemenang: "${winner}" dari ${totalParticipants} peserta.`
                });
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false });
        }
    });

    return router;
};