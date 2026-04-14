/* ══════════════════════════════════════════════════════════════
   SANDIGAN — Cache Middleware
   
   Usage on a route:
     router.get('/path', cache('prefix', ttlSeconds), controller);
   
   How it works:
   1. On GET request → check cache using full URL as key
   2. If HIT → return cached JSON instantly (no DB call)
   3. If MISS → run controller, intercept the response, cache it
   ══════════════════════════════════════════════════════════════ */

const { getCache, setCache } = require('../utils/cache');

/**
 * Express cache middleware factory.
 * @param {string} prefix - Cache key prefix (e.g., 'booking', 'finance')
 * @param {number} ttlSeconds - Time-to-live in seconds. Default: 60
 * @returns Express middleware function
 */
const cache = (prefix, ttlSeconds = 60) => {
    return (req, res, next) => {
        // Only cache GET requests — never cache mutations
        if (req.method !== 'GET') return next();

        // Build a unique cache key from prefix + full URL (includes query params)
        const key = `${prefix}:${req.originalUrl}`;

        // Check cache
        const cached = getCache(key);
        if (cached) {
            // Cache HIT — return immediately
            return res.json(cached);
        }

        // Cache MISS — intercept res.json to store the response
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            // Only cache successful responses (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setCache(key, data, ttlSeconds);
            }
            return originalJson(data);
        };

        next();
    };
};

module.exports = cache;
