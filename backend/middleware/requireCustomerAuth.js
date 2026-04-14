const jwt = require('jsonwebtoken');
const Customer = require('../models/customerModel');

/**
 * Middleware: requireCustomerAuth
 * Verifies the JWT token sent via Bearer Token in headers.
 * Mobile apps typically use headers, not cookies.
 */
const requireCustomerAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'customer') {
            return res.status(403).json({ error: 'Access denied: Admins cannot use customer routes.' });
        }

        const customer = await Customer.findById(decoded._id).select('-password');
        if (!customer) {
            return res.status(401).json({ error: 'Session invalid: Customer not found.' });
        }

        req.customer = customer;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }
};

module.exports = requireCustomerAuth;
