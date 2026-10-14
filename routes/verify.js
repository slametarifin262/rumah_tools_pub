router.get('/verify', async (req, res) => {
    const photoId = req.query.id;
    
    // Cari data di DB berdasarkan ID hash
    const photoData = await db.collection('geotag_logs').findOne({ photoHash: photoId });

    if (!photoData) {
        return res.render('verify-result', { 
            valid: false, 
            message: 'Foto tidak terdaftar atau tidak valid.' 
        });
    }

    res.render('verify-result', {
        valid: true,
        data: photoData // lat, lng, timestamp, address
    });
});