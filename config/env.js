// Konfigurasi terpusat. Semua pembacaan process.env dan validasi ada di sini,
// supaya aplikasi gagal start (fail-fast) bila konfigurasi tidak aman.
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const isProduction = process.env.NODE_ENV === 'production';

function fail(msg) {
    console.error(`[CONFIG] ${msg}`);
    process.exit(1);
}

const REQUIRED = ['DB_PASSWORD', 'SESSION_SECRET', 'FILE_ENCRYPTION_KEY'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
    fail(`Variabel .env berikut wajib diisi: ${missing.join(', ')}`);
}

const sessionSecrets = process.env.SESSION_SECRET.split(',').map((s) => s.trim()).filter(Boolean);
if (sessionSecrets.some((s) => s.length < 32)) {
    const msg = 'SESSION_SECRET minimal 32 karakter acak.';
    if (isProduction) fail(msg);
    console.warn(`[CONFIG] PERINGATAN: ${msg}`);
}

if (!/^[0-9a-fA-F]{64}$/.test(process.env.FILE_ENCRYPTION_KEY)) {
    fail('FILE_ENCRYPTION_KEY harus tepat 64 karakter hex (32 byte).');
}

const bool = (v, def = false) => {
    if (v === undefined || v === '') return def;
    return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

function parseTrustProxy(v) {
    if (v === undefined || v === '') return isProduction ? 1 : false;
    if (/^\d+$/.test(v)) return Number(v) || false;
    if (['true', 'false'].includes(v)) return v === 'true' ? 1 : false;
    return v; // daftar subnet, mis. "loopback, 10.0.0.0/8"
}

const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
if (isProduction && !baseUrl) {
    console.warn('[CONFIG] PERINGATAN: BASE_URL belum diisi; link undangan akan memakai header Host dari request.');
}

const cspMode = ['off', 'report-only', 'enforce'].includes(process.env.CSP_MODE) ? process.env.CSP_MODE : 'off';
const repoAccess = process.env.REPO_ACCESS === 'authenticated' ? 'authenticated' : 'admin';

const config = Object.freeze({
    isProduction,
    root: ROOT,
    publicDir: path.join(ROOT, 'public'),
    viewsDir: path.join(ROOT, 'views'),
    docsDir: path.join(ROOT, 'public', 'dokumentasi', 'docs'),
    uploadDir: path.join(ROOT, 'public', 'uploads', 'invitations'),
    port: Number(process.env.PORT) || 3000,
    baseUrl,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    sessionSecrets,
    sessionStore: process.env.SESSION_STORE === 'memory' ? 'memory' : 'mysql',
    cookieSecure: process.env.COOKIE_SECURE ? bool(process.env.COOKIE_SECURE) : isProduction,
    cspMode,
    fileEncryptionKey: Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'hex'),
    ipHashSecret: process.env.IP_HASH_SECRET || sessionSecrets[0],
    donationWebhookSecret: process.env.DONATION_WEBHOOK_SECRET || '',
    // Simulasi donasi TIDAK PERNAH aktif di production, apa pun isi .env
    enableDonationSimulation: bool(process.env.ENABLE_DONATION_SIMULATION) && !isProduction,
    cronSecret: process.env.CRON_SECRET || '',
    instagramCronEnabled: bool(process.env.INSTAGRAM_CRON_ENABLED),
    repoAccess,
    allowNegativeStock: bool(process.env.ALLOW_NEGATIVE_STOCK),
    allowApiKeyQuery: bool(process.env.ALLOW_API_KEY_QUERY),
    undanganRequireLogin: bool(process.env.UNDANGAN_REQUIRE_LOGIN),
    timezone: 'Asia/Jakarta'
});

export default config;
