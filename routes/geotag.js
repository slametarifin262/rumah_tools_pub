const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { verifyCsrf } = require('../middleware/csrf');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Limit 10MB
});

module.exports = function (db, logUsage) {

    router.post('/process-geotag', verifyCsrf, upload.single('photo'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Foto belum diambil.' });
            }

            const customNote = req.body.custom_note && req.body.custom_note.trim() !== '' 
                ? req.body.custom_note 
                : 'Supported by rumah_tools.id';

            const { latitude, longitude } = req.body;
            const lat = parseFloat(latitude) || 0;
            const lng = parseFloat(longitude) || 0;

            // 1. Dapatkan Nama Alamat dari Koordinat (Reverse Geocoding)
            let addressText = 'Lokasi tidak diketahui';
            try {
                const geoRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                    params: { format: 'json', lat: lat, lon: lng },
                    headers: { 'User-Agent': 'RumahTools-GeotagApp/1.0' }
                });
                if (geoRes.data && geoRes.data.display_name) {
                    addressText = geoRes.data.display_name;
                }
            } catch (err) {
                console.error('Gagal mengambil alamat:', err.message);
            }

            // Format tanggal & waktu saat ini (WIB)
            const now = new Date();
            const timeString = now.toLocaleString('id-ID', { 
                timeZone: 'Asia/Jakarta',
                dateStyle: 'medium',
                timeStyle: 'short'
            }) + ' WIB';

            // 2. Dapatkan Ukuran Dimensi Foto
            const imageMetadata = await sharp(req.file.buffer).metadata();
            const width = imageMetadata.width || 1280;
            const height = imageMetadata.height || 720;

            // 3. Hitung Dimensi Banner & QR Code (Adaptif Sesuai Resolusi Foto)
            const boxHeight = Math.round(height * 0.22); // Tinggi banner 22% dari foto
            const qrSize = Math.round(boxHeight * 0.82);  // Ukuran QR Code 82% dari tinggi banner
            const marginY = Math.round((boxHeight - qrSize) / 2); // Margin tengah vertikal

            // 4. Generate QR Code 1 (KIRI: Direct Google Maps)
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
            const qrMapsBuffer = await QRCode.toBuffer(mapsUrl, {
                width: qrSize,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
            });

            // 5. Generate QR Code 2 (KANAN: Verifikasi Keaslian Foto)
            const photoHash = crypto.createHash('sha256')
                .update(`${lat}_${lng}_${Date.now()}_RUMAH_TOOLS_SECRET`)
                .digest('hex')
                .substring(0, 12);

            const verifyUrl = `https://rumah_tools.id/verify?id=${photoHash}`;
            const qrVerifyBuffer = await QRCode.toBuffer(verifyUrl, {
                width: qrSize,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
            });

            // 6. Hitung Area & Font Teks Tengah agar Tidak Menimpa QR Code
            const leftQrSpace = qrSize + 25;  // Batas aman dari QR Kiri
            const rightQrSpace = qrSize + 25; // Batas aman dari QR Kanan
            const textBlockWidth = width - leftQrSpace - rightQrSpace;

            const fontSizeTitle = Math.round(width * 0.020);
            const fontSizeSub = Math.round(width * 0.015);

            // Potong teks alamat jika melebihi lebar area tengah
            const maxChar = Math.max(15, Math.floor(textBlockWidth / (fontSizeSub * 0.6)));
            const shortAddress = addressText.length > maxChar 
                ? addressText.substring(0, maxChar) + '...' 
                : addressText;

            // 7. Template SVG Banner & Teks Tengah
            const svgOverlay = Buffer.from(`
                <svg width="${width}" height="${boxHeight}">
                    <!-- Background Banner Hitam Transparan -->
                    <rect width="100%" height="100%" fill="black" opacity="0.70" />

                    <!-- Teks Informasi di Antara QR Kiri & QR Kanan -->
                    <g transform="translate(${leftQrSpace}, 0)">
                        <!-- Baris 1: Waktu -->
                        <text x="0" y="${fontSizeTitle + 10}" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="${fontSizeTitle}" font-weight="bold">
                            📅 ${timeString}
                        </text>

                        <!-- Baris 2: Koordinat -->
                        <text x="0" y="${fontSizeTitle + fontSizeSub + 20}" fill="#FFD700" font-family="Arial, sans-serif" font-size="${fontSizeSub}">
                            📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </text>

                        <!-- Baris 3: Lokasi -->
                        <text x="0" y="${fontSizeTitle + (fontSizeSub * 2) + 30}" fill="#E0E0E0" font-family="Arial, sans-serif" font-size="${fontSizeSub}">
                            🏠 ${shortAddress}
                        </text>

                        <!-- Baris 4: Supported by / Custom Note -->
                        <text x="0" y="${fontSizeTitle + (fontSizeSub * 3) + 40}" fill="#00FFC8" font-family="Arial, sans-serif" font-size="${fontSizeSub}" font-weight="bold">
                            🌐 ${customNote}
                        </text>
                    </g>
                </svg>
            `);

            // 8. Komposisi Layering Sharp (Foto Utama + Banner SVG + QR Maps + QR Verifikasi)
            const processedImageBuffer = await sharp(req.file.buffer)
                .composite([
                    {
                        input: svgOverlay,
                        top: height - boxHeight,
                        left: 0
                    },
                    {
                        input: qrMapsBuffer,
                        top: height - boxHeight + marginY,
                        left: 12
                    },
                    {
                        input: qrVerifyBuffer,
                        top: height - boxHeight + marginY,
                        left: width - qrSize - 12
                    }
                ])
                .jpeg({ quality: 90 })
                .toBuffer();

            const outputFileName = `geotag_${Date.now()}.jpg`;
            const coordText = `Lat: ${lat.toFixed(6)}, Long: ${lng.toFixed(6)}`;

            // 9. Catat Log Penggunaan Aplikasi
            if (typeof logUsage === 'function') {
                await logUsage(req, {
                    toolSlug: 'geotag-photo',
                    toolName: 'Foto Geotag',
                    summary: `Geotag foto di ${coordText}`,
                    fileBuffer: processedImageBuffer,
                    fileName: outputFileName,
                    fileMime: 'image/jpeg'
                });
            }

            // 10. Send Response Gambar Hasil Geotag
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
            res.send(processedImageBuffer);

        } catch (error) {
            console.error('Error Geotag:', error);
            res.status(500).json({ success: false, message: 'Gagal memproses foto geotag.' });
        }
    });

    return router;
};