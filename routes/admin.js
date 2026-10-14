// routes/admin.js
import express from 'express';
import { publishToInstagram } from '../services/instagramService.js';

const router = express.Router();

// Endpoint untuk memicu posting dari form dashboard admin
router.post('/publish-instagram', async (req, res) => {
  try {
    const { imageUrl, caption } = req.body;
    
    const result = await publishToInstagram(imageUrl, caption);
    
    res.json({ success: true, message: 'Berhasil posting!', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal posting ke Instagram' });
  }
});

export default router;