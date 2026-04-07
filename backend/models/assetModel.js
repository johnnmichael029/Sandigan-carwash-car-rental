const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const assetSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['Equipment', 'Rental Fleet', 'Facility'],
        required: true
    },
    serialNumber: {
        type: String,
        default: ''
    },
    purchaseDate: {
        type: Date,
        default: null
    },
    serviceCycleBookings: {
        type: Number,
        default: 500 // Trigger maintenance alert after 500 bookings/uses
    },
    usageCounter: {
        type: Number,
        default: 0 
    },
    status: {
        type: String,
        enum: ['Active', 'Degraded', 'Under Maintenance', 'Retired'],
        default: 'Active'
    },
    bayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bay',
        default: null // If stationed at a specific bay
    }
}, { timestamps: true });

const Asset = mongoose.model('asset', assetSchema);
module.exports = Asset;
