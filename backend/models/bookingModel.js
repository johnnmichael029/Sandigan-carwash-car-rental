const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const bookingSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    emailAddress: {
        type: String,
        required: true
    },
    vehicleType: {
        type: String,
        required: true
    },
    serviceType: {
        type: [String],
        required: true
    },
    bookingTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'Pending',
    },
    statusLogs: {
        type: [{
            status: String,
            timestamp: { type: Date, default: Date.now }
        }],
        default: [{ status: 'Pending' }]
    },
    batchId: {
        type: String,
        required: true,
        unique: true
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    detailer: {
        type: String,
        default: ''
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        default: null
    },
    // ---- Car Rental Support Fields ----
    isRental: {
        type: Boolean,
        default: false
    },
    rentalStartDate: {
        type: Date
    },
    rentalDurationDays: {
        type: Number
    },
    destination: {
        type: String
    },
    bayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bay',
        default: null
    },
    actualStartTime: {
        type: Date,
        default: null
    },
    actualEndTime: {
        type: Date,
        default: null
    },
    commission: {
        type: Number,
        default: 0
    },
    commissionStatus: {
        type: String,
        enum: ['Unpaid', 'Paid'],
        default: 'Unpaid'
    },
    smcId: {
        type: String,
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    promoCode: {
        type: String,
        default: null
    },
    promoDiscount: {
        type: Number,
        default: 0
    },
    purchasedProducts: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        category: String,
        quantity: Number,
        price: Number
    }],
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'customer',
        default: null
    }
}, { timestamps: true });
const Booking = mongoose.model('booking', bookingSchema);

module.exports = Booking;
