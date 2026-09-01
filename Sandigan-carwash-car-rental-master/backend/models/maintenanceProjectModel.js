const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const maintenanceProjectSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'asset',
        default: null
    },
    bayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bay',
        default: null
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    partsUsed: [{
        inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'inventory' },
        name: String,
        quantity: Number,
        costPerUnit: Number
    }],
    laborCost: {
        type: Number,
        default: 0
    },
    assignedPersonnel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        default: null
    },
    startDate: {
        type: Date,
        default: null
    },
    completionDate: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const MaintenanceProject = mongoose.model('maintenance_project', maintenanceProjectSchema);
module.exports = MaintenanceProject;
