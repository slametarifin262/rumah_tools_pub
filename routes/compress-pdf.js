const express = require('express');
const router = express.Router();
const multer = require('multer');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { verifyCsrf } = require('../middleware/csrf');

// PERBAIKAN 2: Tambahkan fileFilter agar hanya menerima PDF
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // Maksimal 50 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file berformat PDF yang diizinkan!'), false);
        }
    }
});

module.exports = function (db, logUsage) {
    
    // Halaman UI Form Kompres PDF
    router.get('/compress-pdf', (req, res) => {
        res.render('tools/compress-pdf', {
            title: 'Kompres Dokumen PDF',
            csrfToken: req.session.csrfToken
        });
    }); 

    router.post('/process-compress-pdf', verifyCsrf, upload.single('pdf'), async (req, res) => {
        let inputPath = '';
        let outputPath = '';

        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'File PDF belum diunggah atau format tidak valid.' });
            }

            // PERBAIKAN 1: Validasi Preset (Whitelist)
            const allowedPresets = ['/screen', '/ebook', '/printer', '/prepress', '/default'];
            const userPreset = req.body.preset;
            const preset = allowedPresets.includes(userPreset) ? userPreset : '/ebook';

            const tempDir = os.tmpdir();
            inputPath = path.join(tempDir, `input_${Date.now()}.pdf`);
            outputPath = path.join(tempDir, `output_${Date.now()}.pdf`);

            fs.writeFileSync(inputPath, req.file.buffer);

            // --- DETEKSI EXEC PATH GHOSTSCRIPT ---
            let gsCmd;

            if (process.platform === 'win32') {
                // Menunjuk langsung ke folder lokal gs10.08.0 di dalam project
                const localGsPath = path.join(__dirname, '..', 'bin', 'gs10.08.0', 'bin', 'gswin64c.exe');

                if (fs.existsSync(localGsPath)) {
                    gsCmd = localGsPath; // Gunakan Ghostscript lokal di Drive D
                } else {
                    gsCmd = 'gswin64c';  // Fallback jika terinstall di System PATH Windows
                }
            } else {
                gsCmd = 'gs'; // Jalankan perintah standar Linux saat dideploy nanti
            }

            // Gunakan variabel gsCmd saat memanggil child_process execFile:
            const gsArgs = [
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                `-dPDFSETTINGS=${preset}`,
                '-dNOPAUSE',
                '-dQUIET',
                '-dBATCH',
                `-sOutputFile=${outputPath}`,
                inputPath
            ];

            // PERBAIKAN 3: Tangkap stderr agar jika gagal ada log error yang jelas
            await new Promise((resolve, reject) => {
                execFile(gsCmd, gsArgs, (error, stdout, stderr) => {
                    if (error) {
                        return reject(new Error(stderr || error.message));
                    }
                    resolve();
                });
            });

            const compressedBuffer = fs.readFileSync(outputPath);
            const outputFileName = `compressed_${Date.now()}.pdf`;

            if (typeof logUsage === 'function') {
                await logUsage(req, {
                    toolSlug: 'compress-pdf',
                    toolName: 'Kompres Dokumen PDF',
                    summary: `Kompres PDF dari ${(req.file.size / 1024).toFixed(1)}KB menjadi ${(compressedBuffer.length / 1024).toFixed(1)}KB`,
                    fileBuffer: compressedBuffer,
                    fileName: outputFileName,
                    fileMime: 'application/pdf'
                });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
            res.send(compressedBuffer);

        } catch (error) {
            console.error('Error Compress PDF:', error.message);
            // Tambahkan pengecekan error dari Multer
            if (error.message.includes('PDF yang diizinkan')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Gagal memproses kompresi PDF.' });
        } finally {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    });

    return router;
};