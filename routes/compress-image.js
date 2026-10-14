const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { verifyCsrf } = require('../middleware/csrf');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // Limit 20MB
});

module.exports = function (db, logUsage) {
	// Halaman UI Form Resize & Kompres Gambar
	router.get('/resize-image', (req, res) => {
	    res.render('tools/resize-image', {
	        title: 'Resize & Kompres Gambar',
	        csrfToken: req.session.csrfToken
	    });
	});
    router.post('/process-resize-image', verifyCsrf, upload.single('photo'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'File gambar belum diunggah.' });
            }

            const quality = parseInt(req.body.quality) || 80;
            const targetWidth = parseInt(req.body.width) || null;
            const targetHeight = parseInt(req.body.height) || null;
            const scalePercent = parseFloat(req.body.scale_percent) || null; // misal: 50 (50%), 150 (150%), 200 (200%)
            const fitOption = req.body.fit || 'inside'; // 'inside' (jaga aspek rasio), 'cover', 'fill'
            const outputFormat = req.body.format || 'jpeg';

            const metadata = await sharp(req.file.buffer).metadata();
            let sharpInstance = sharp(req.file.buffer);

            let newWidth = targetWidth;
            let newHeight = targetHeight;

            // Jika menggunakan Skala Persentase (misal: 150% = 1.5x lebih besar, 50% = 0.5x lebih kecil)
            if (scalePercent && !targetWidth && !targetHeight) {
                const multiplier = scalePercent / 100;
                newWidth = Math.round(metadata.width * multiplier);
                newHeight = Math.round(metadata.height * multiplier);
            }

            // Lakukan Resize jika ada perubahan dimensi (Bisa LEBIH BESAR maupun LEBIH KECIL)
            if (newWidth || newHeight) {
                sharpInstance = sharpInstance.resize({
                    width: newWidth,
                    height: newHeight,
                    fit: fitOption,
                    // Note: withoutEnlargement TIDAK dipasang agar bisa memperbesar (upscale)
                });
            }

            let processedBuffer;
            let mimeType = 'image/jpeg';

            if (outputFormat === 'png') {
                mimeType = 'image/png';
                processedBuffer = await sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer();
            } else if (outputFormat === 'webp') {
                mimeType = 'image/webp';
                processedBuffer = await sharpInstance.webp({ quality }).toBuffer();
            } else {
                mimeType = 'image/jpeg';
                processedBuffer = await sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
            }

            const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
            const outputFileName = `resized_${Date.now()}.${ext}`;

            if (typeof logUsage === 'function') {
                await logUsage(req, {
                    toolSlug: 'resize-image',
                    toolName: 'Resize & Kompres Gambar',
                    summary: `Resize (${metadata.width}x${metadata.height}px -> ${newWidth || 'auto'}x${newHeight || 'auto'}px)`,
                    fileBuffer: processedBuffer,
                    fileName: outputFileName,
                    fileMime: mimeType
                });
            }

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
            res.send(processedBuffer);

        } catch (error) {
            console.error('Error Resize Image:', error);
            res.status(500).json({ success: false, message: 'Gagal memproses gambar.' });
        }
    });

    return router;
};