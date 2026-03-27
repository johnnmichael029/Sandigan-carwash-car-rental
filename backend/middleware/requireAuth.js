const jwt = require('jsonwebtoken');

/**
 * Middleware: requireAuth
 * Verifies the JWT token sent in the httpOnly 'token' cookie.
 * Usage: router.patch('/:id', requireAuth, updateHandler)
 */
const requireAuth = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Authorization token required.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.employeeId = decoded.id;
        req.employeeRole = decoded.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }
};

module.exports = requireAuth;
