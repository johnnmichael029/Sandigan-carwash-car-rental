const jwt = require('jsonwebtoken');
const Employee = require('../models/employeeModel');

/**
 * Middleware: requireAuth
 * Verifies the JWT token sent in the httpOnly 'token' cookie.
 * Usage: router.patch('/:id', requireAuth, updateHandler)
 */
const requireAuth = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Authorization token required.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch the active employee to ensure they still exist and have access
        const user = await Employee.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Session invalid: User not found.' });
        }

        req.user = user; // Attach full user object for audit logs
        req.employeeId = decoded.id;
        req.employeeRole = decoded.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }
};

module.exports = requireAuth;
