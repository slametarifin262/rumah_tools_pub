const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const util = require('util');
const libre = require('libreoffice-convert');
const libreConvert = util.promisify(libre.convert);

const { verifyCsrf } = require('../middleware/csrf');
// kalau butuh login dulu
// const { requireAuth } = require('../middleware/auth');

// Konfigurasi Multer (Maksimal file 20 MB)
const uploadDoc = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung. Gunakan DOCX, XLSX, PPTX, atau PDF.'));
        }
    }
});

module.exports = function (db, logUsage) {

    /**
     * Endpoint umum untuk konversi dokumen:
     * - Word (.docx) -> PDF
     * - Excel (.xlsx) -> PDF
     * - PDF -> Word (.docx)
     */
    // router.post('/convert-document', requireAuth, verifyCsrf, uploadDoc.single('file'), async (req, res) => {
    router.post('/convert-document', verifyCsrf, uploadDoc.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'File dokumen belum diunggah.' });
            }

            const targetFormat = req.body.target_format; // contoh: 'pdf' atau 'docx'
            if (!targetFormat || !['pdf', 'docx', 'xlsx'].includes(targetFormat.toLowerCase())) {
                return res.status(400).json({ success: false, message: 'Format tujuan tidak valid.' });
            }

            const inputExt = path.extname(file.originalname).toLowerCase();
            const outputFormat = `.${targetFormat.toLowerCase()}`;

            // Proses Konversi menggunakan LibreOffice
            const convertedBuffer = await libreConvert(req.file.buffer, outputFormat, undefined);

            // Nama File Output
            const originalNameWithoutExt = path.parse(req.file.originalname).name;
            const outputFileName = `${originalNameWithoutExt}_converted${outputFormat}`;

            // Penentuan MIME Type
            let mimeType = 'application/octet-stream';
            if (outputFormat === '.pdf') mimeType = 'application/pdf';
            if (outputFormat === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            // Catat Riwayat Penggunaan
            if (typeof logUsage === 'function') {
                await logUsage(req, {
                    toolSlug: 'doc-converter',
                    toolName: 'Konversi Dokumen',
                    summary: `Konversi ${inputExt} ke ${outputFormat} (${req.file.originalname})`,
                    fileBuffer: convertedBuffer,
                    fileName: outputFileName,
                    fileMime: mimeType
                });
            }

            // Kirim respons file
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
            res.send(convertedBuffer);

        } catch (error) {
            console.error('Error konversi dokumen:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengonversi dokumen. Pastikan LibreOffice sudah terinstal di server.'
            });
        }
    });

    return router;
};