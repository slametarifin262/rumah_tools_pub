// Otomatis menyisipkan header X-CSRF-Token ke setiap request fetch() yang
// mengubah data (POST/PUT/PATCH/DELETE) ke server sendiri (same-origin).
// Tokennya diambil dari <meta name="csrf-token"> yang dirender server per-session.
// Ini pasangan dari middleware verifyCsrf di app.js.
(function () {
    var meta = document.querySelector('meta[name="csrf-token"]');
    var token = meta ? meta.getAttribute('content') : null;
    if (!token) return;

    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
        init = init || {};
        var method = (init.method || (input && input.method) || 'GET').toUpperCase();

        if (['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) !== -1) {
            var headers = new Headers(init.headers || (input && input.headers) || {});
            if (!headers.has('X-CSRF-Token')) {
                headers.set('X-CSRF-Token', token);
            }
            init.headers = headers;
        }

        return originalFetch(input, init);
    };

    // Helper global untuk tools yang 100% jalan di browser (tidak pernah
    // mengirim data olahan ke server) supaya pemakaiannya tetap tercatat
    // sebagai analitik anonim (lihat POST /api/v1/track di app.js).
    // Dibatasi maksimal 1x per menit per toolSlug supaya tidak spam saat
    // user mengetik/berulang-ulang menekan tombol yang sama.
    var lastTrack = {};
    window.trackFeature = function (toolSlug) {
        var now = Date.now();
        if (lastTrack[toolSlug] && now - lastTrack[toolSlug] < 60000) return;
        lastTrack[toolSlug] = now;

        fetch('/api/v1/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolSlug: toolSlug })
        }).catch(function () { /* diam-diam gagal, tidak mengganggu UX */ });
    };
})();
