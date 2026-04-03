const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null/undefined values if no account
    },
    password: {
        type: String,
        // Not required if hasAccount is false
    },
    hasAccount: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['admin', 'employee', 'detailer'],
        default: 'employee'
    },
    shiftType: {
        type: String,
        enum: ['Morning', 'Night', 'None'],
        default: 'None'
    },
    shiftStartTime: {
        type: String, // e.g., "08:00 AM"
    },
    age: { type: Number },
    address: { type: String },
    contactNumber: { type: String },

    // Fixed Salary Fields (for Employee / Admin)
    baseSalary: { type: Number, default: 0 },
    salaryFrequency: { type: String, enum: ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'], default: 'Weekly' },
    nonTaxableAllowance: { type: Number, default: 0 }, // e.g., Load or NT Allowance from Tenex
    
    // Government Identifiers (Required for Payslips)
    sssNo: { type: String },
    tinNo: { type: String },
    philhealthNo: { type: String },
    pagibigNo: { type: String },

    lastPaidDate: { type: Date },
    hiredDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Active', 'On Leave', 'Sick'], default: 'Active' }
}, { timestamps: true });

const Employee = mongoose.model('employee', employeeSchema);

module.exports = Employee;