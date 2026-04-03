const mongoose = require('mongoose');

const payableSchema = new mongoose.Schema({
    vendorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Vendor', 
        required: true 
    },
    billNumber: { 
        type: String, 
        required: true,
        unique: true
    },
    description: { 
        type: String, 
        required: true // e.g. "Monthly Water Bill", "Stock - Microfiber towels"
    },
    amount: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    currency: { 
        type: String, 
        default: 'PHP' 
    },
    
    // Dates
    issueDate: { 
        type: Date, 
        default: Date.now 
    },
    dueDate: { 
        type: Date, 
        required: true 
    },
    paidDate: { 
        type: Date, 
        default: null 
    },
    
    // Tracking
    status: { 
        type: String, 
        enum: ['Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Cancelled'], 
        default: 'Unpaid' 
    },
    amountPaid: { 
        type: Number, 
        default: 0 
    },
    balanceOwed: { 
        type: Number, 
        default: 0 // Will auto-calculate on update
    },
    
    // Payment History Tracking
    payments: [{
        amount: Number,
        date: Date,
        method: String, // Bank Transfer, Cash, Check
        reference: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' }
    }],
    
    attachment: { 
        type: String, // URL/Path to receipt/invoice image
        default: null 
    },
    notes: { type: String, default: '' }
    
}, { timestamps: true });

// Auto-calculate balance owed and generate billNumber if missing before saving
payableSchema.pre('save', async function() {
    this.balanceOwed = (this.amount || 0) - (this.amountPaid || 0);
    
    // Auto-status update
    if (this.amountPaid === 0) {
        this.status = 'Unpaid';
    } else if (this.amountPaid < this.amount) {
        this.status = 'Partially Paid';
    } else {
        this.status = 'Paid';
        if (!this.paidDate) this.paidDate = new Date();
    }

    // Generate billNumber if it's missing or an empty string
    if (!this.billNumber || this.billNumber === '') {
        try {
            const today = new Date();
            const phTime = new Date(today.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
            const mm = phTime.getUTCMonth() + 1;
            const dd = String(phTime.getUTCDate()).padStart(2, '0');
            const yy = String(phTime.getUTCFullYear()).slice(-2);
            const dateStr = `${mm}${dd}${yy}`;
            const prefix = `INV-${dateStr}-`;

            const billsToday = await mongoose.model('AccountPayable').find({ 
                billNumber: new RegExp(`^${prefix}`) 
            });

            let highestSeq = 0;
            billsToday.forEach(b => {
                const parts = b.billNumber.split('-');
                const seq = parseInt(parts[parts.length - 1]);
                if (!isNaN(seq) && seq > highestSeq) {
                    highestSeq = seq;
                }
            });

            this.billNumber = `${prefix}${String(highestSeq + 1).padStart(2, '0')}`;
        } catch (err) {
            console.error("Error auto-generating billNumber in pre-save:", err);
            // If it still fails, use a timestamp to avoid validation error at least
            this.billNumber = `INV-ERR-${Date.now()}`;
        }
    }
});

module.exports = mongoose.model('AccountPayable', payableSchema);
