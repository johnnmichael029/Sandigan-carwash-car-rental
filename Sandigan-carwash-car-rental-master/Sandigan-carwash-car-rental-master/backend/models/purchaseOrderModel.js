const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: { type: String, required: true, unique: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [{
        inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true },
        lineTotal: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Draft', 'Submitted', 'Received', 'Cancelled'], 
        default: 'Draft' 
    },
    expectedDeliveryDate: { type: Date },
    receivedDate: { type: Date },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' }
}, { timestamps: true });

// Auto-generate PO Number if missing
purchaseOrderSchema.pre('validate', async function() {
    if (!this.poNumber) {
        try {
            const today = new Date();
            const dateStr = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
            const prefix = `PO-${dateStr}-`;
            const posToday = await mongoose.model('PurchaseOrder').find({
                poNumber: new RegExp(`^${prefix}`)
            });
            
            let highestSeq = 0;
            posToday.forEach(po => {
                const parts = po.poNumber.split('-');
                const seq = parseInt(parts[parts.length - 1]);
                if (!isNaN(seq) && seq > highestSeq) highestSeq = seq;
            });
            this.poNumber = `${prefix}${String(highestSeq + 1).padStart(2, '0')}`;
        } catch(err) {
            this.poNumber = `PO-ERR-${Date.now()}`;
        }
    }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
