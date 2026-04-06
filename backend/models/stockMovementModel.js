const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    type: { 
        type: String, 
        enum: ['Inbound', 'Outbound', 'Adjustment'], 
        required: true 
    },
    quantity: { type: Number, required: true }, // Should be positive for inbound, negative for outbound
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, required: true }, // e.g., "Booking #BK-123", "PO-040626-01 Received", "Manual Adjustment"
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' },
    performedByName: { type: String, default: 'System' }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
