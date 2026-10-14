// SINTAKS BARU (ES Module)
import express from 'express';
const router = express.Router();

export default router;
const db = require('../config/db'); // Sesuaikan koneksi DB Anda

// GET: /api/emergency-contacts?lat=-7.683&lng=109.002&radius=15
router.get('/api/emergency-contacts', async (req, res) => {
    try {
        const { lat, lng, radius = 15 } = req.query; // Radius default 15 KM

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Koordinat lat dan lng wajib diisi.' });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        // Query Rumus Haversine (Jarak dalam KM)
        const query = `
            SELECT 
                id, name, category, tier_level, phone_number, whatsapp_number, address,
                latitude, longitude,
                (
                    6371 * acos(
                        cos(radians(?)) * cos(radians(latitude)) *
                        cos(radians(longitude) - radians(?)) +
                        sin(radians(?)) * sin(radians(latitude))
                    )
                ) AS distance_km
            FROM emergency_contacts
            WHERE is_active = 1
            HAVING distance_km <= ?
            ORDER BY tier_level ASC, distance_km ASC
            LIMIT 30
        `;

        const [contacts] = await db.query(query, [userLat, userLng, userLat, parseFloat(radius)]);

        res.json({
            success: true,
            total: contacts.length,
            user_location: { lat: userLat, lng: userLng },
            data: contacts
        });

    } catch (error) {
        console.error('Error fetching emergency contacts:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;