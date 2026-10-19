const Inquiry = require('../models/inquiryModel');
const Notification = require('../models/notificationModel');
const {
    sendContactNotificationToAdmin,
    sendContactAcknowledgementToCustomer
} = require('../utils/emailService');

// 1. Submit a new contact inquiry (Public)
const submitInquiry = async (req, res) => {
    try {
        const { fullName, email, message } = req.body;

        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ error: 'Full name is required.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Valid email address is required.' });
        }
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Please enter your message.' });
        }

        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedMessage = message.trim();

        // 1. Save in the database
        const inquiry = await Inquiry.create({
            fullName: trimmedName,
            email: trimmedEmail,
            message: trimmedMessage,
            status: 'Unread'
        });

        // 2. Create in-system notification for admin/staff
        try {
            await Notification.create({
                message: `📩 New message from ${trimmedName}: "${trimmedMessage.slice(0, 60)}${trimmedMessage.length > 60 ? '...' : ''}"`,
                type: 'contact',
                isRead: false
            });
        } catch (notifErr) {
            console.error('[Inquiry] Failed to create system notification:', notifErr.message);
        }

        // 3. Send email notifications (Fire-and-forget so customer doesn't wait)
        sendContactNotificationToAdmin({
            fullName: trimmedName,
            email: trimmedEmail,
            message: trimmedMessage
        }).catch(err => console.error('[Inquiry] Admin email notification failed:', err.message));

        sendContactAcknowledgementToCustomer({
            fullName: trimmedName,
            email: trimmedEmail,
            message: trimmedMessage
        }).catch(err => console.error('[Inquiry] Customer acknowledgement email failed:', err.message));

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully! Our team will get back to you shortly.',
            inquiryId: inquiry._id
        });
    } catch (err) {
        console.error('[Inquiry] Submission failed:', err.message);
        res.status(500).json({ error: 'Failed to submit your message. Please try again later.' });
    }
};

// 2. Get all inquiries (Admin / Staff)
const getAllInquiries = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};

        if (status && status !== 'All') {
            filter.status = status;
        }

        if (search && search.trim()) {
            const query = search.trim();
            filter.$or = [
                { fullName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { message: { $regex: query, $options: 'i' } }
            ];
        }

        const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });
        const unreadCount = await Inquiry.countDocuments({ status: 'Unread' });

        res.json({
            inquiries,
            unreadCount
        });
    } catch (err) {
        console.error('[Inquiry] Fetch failed:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// 3. Update inquiry status or admin notes (Admin)
const updateInquiryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

        if (status === 'Replied') {
            updateData.repliedAt = new Date();
            updateData.repliedBy = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin' : 'Admin';
        }

        const updated = await Inquiry.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ error: 'Inquiry not found.' });
        }

        res.json(updated);
    } catch (err) {
        console.error('[Inquiry] Update failed:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// 4. Delete inquiry (Admin)
const deleteInquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Inquiry.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Inquiry not found.' });
        }
        res.json({ success: true, message: 'Inquiry deleted successfully.' });
    } catch (err) {
        console.error('[Inquiry] Delete failed:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    submitInquiry,
    getAllInquiries,
    updateInquiryStatus,
    deleteInquiry
};
