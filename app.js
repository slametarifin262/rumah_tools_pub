import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import axios from 'axios';
import QRCode from 'qrcode';
import crypto from 'crypto';

import db from './config/db.js';
import toolsList from './config/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Konfigurasi View Engine & Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Deklarasikan Multer TERLEBIH DAHULU sebelum rute yang menggunakannya
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Limit 10MB
});

// 3. Rute Utama Beranda
app.get('/', (req, res) => {
  res.render('index', {
    title: 'RumahTools - Solusi Utilitas & Alat Digital Anda',
    description: 'Solusi utilitas & alat digital profesional.',
    csrfToken: 'dummy-token-sementara',
    tools: toolsList,
    activeTool: null
  });
});

// Route Halaman Daftar Tools
app.get('/tools', (req, res) => {
  res.render('index', {
    title: 'Semua Tools - RumahTools',
    description: 'Daftar lengkap utilitas dan alat digital.',
    csrfToken: 'dummy-token-sementara',
    tools: toolsList,
    activeTool: null
  });
});

// Route Dinamis untuk Detail Tool (contoh: /tools/qr-code)
app.get('/tools/:slug', (req, res) => {
  const toolSlug = req.params.slug;
  const tool = toolsList.find(t => t.slug === toolSlug || t.id === toolSlug);

  if (!tool) {
    return res.status(404).send('Alat (Tool) tidak ditemukan.');
  }

  res.render(`tools/${toolSlug}`, {
    title: `${tool.name} - RumahTools`,
    description: tool.description || 'Utilitas digital profesional.',
    csrfToken: 'dummy-token-sementara',
    tool: tool,
    tools: toolsList
  }, (err, html) => {
    if (err) {
      return res.render('index', {
        title: `${tool.name} - RumahTools`,
        description: tool.description || 'Utilitas digital profesional.',
        csrfToken: 'dummy-token-sementara',
        tools: toolsList,
        activeTool: tool
      });
    }
    res.send(html);
  });
});

// ==========================================
// 4. RUTE PROSES GEOTAG (/api/v1/tools/process-geotag)
// ==========================================
app.post('/api/v1/tools/process-geotag', upload.single('photo'), async (req, res) => {
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

        // Dapatkan Alamat dari Koordinat (Reverse Geocoding)
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

        const now = new Date();
        const timeString = now.toLocaleString('id-ID', { 
            timeZone: 'Asia/Jakarta',
            dateStyle: 'medium',
            timeStyle: 'short'
        }) + ' WIB';

        const imageMetadata = await sharp(req.file.buffer).metadata();
        const width = imageMetadata.width || 1280;
        const height = imageMetadata.height || 720;

        const boxHeight = Math.round(height * 0.22); 
        const qrSize = Math.round(boxHeight * 0.82);  
        const marginY = Math.round((boxHeight - qrSize) / 2); 

        // Generate QR Code Maps
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const qrMapsBuffer = await QRCode.toBuffer(mapsUrl, {
            width: qrSize,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        // Generate QR Code Verifikasi
        const photoHash = crypto.createHash('sha256')
            .update(`${lat}_${lng}_${Date.now()}_RUMAH_TOOLS_SECRET`)
            .digest('hex')
            .substring(0, 12);

        const verifyUrl = `https://rumahtools.online/verify?id=${photoHash}`;
        const qrVerifyBuffer = await QRCode.toBuffer(verifyUrl, {
            width: qrSize,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        const leftQrSpace = qrSize + 25;  
        const rightQrSpace = qrSize + 25; 
        const textBlockWidth = width - leftQrSpace - rightQrSpace;

        const maxChar = Math.max(15, Math.floor(textBlockWidth / 12));
        const shortAddress = addressText.length > maxChar 
            ? addressText.substring(0, maxChar) + '...' 
            : addressText;

        // 1. Buat banner hitam polos menggunakan Sharp langsung (Tanpa SVG)
        const bannerBuffer = await sharp({
            create: {
                width: width,
                height: boxHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0.85 }
            }
        }).png().toBuffer();

        // 2. Komposit banner hitam dan QR Code ke foto asli
        const processedImageBuffer = await sharp(req.file.buffer)
            .composite([
                { input: bannerBuffer, top: height - boxHeight, left: 0 },
                { input: qrMapsBuffer, top: height - boxHeight + marginY, left: 12 },
                { input: qrVerifyBuffer, top: height - boxHeight + marginY, left: width - qrSize - 12 }
            ])
            .jpeg({ quality: 90 })
            .toBuffer();

        // 3. Ubah buffer hasil ke format Base64 untuk dikirim sebagai JSON Pratinjau
        const base64Image = `data:image/jpeg;base64,${processedImageBuffer.toString('base64')}`;

        return res.json({
            success: true,
            image: base64Image,
            info: {
                time: timeString,
                coords: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                address: shortAddress,
                note: customNote
            }
        });

    } catch (error) {
        console.error('Error Geotag:', error);
        res.status(500).json({ success: false, message: 'Gagal memproses foto geotag.' });
    }
});

// 5. Handler 404 & Listen
app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan.');
});

app.listen(PORT, () => {
  console.log(`Server RumahTools berjalan di port ${PORT}`);
});