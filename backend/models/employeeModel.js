const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'employee', 'detailer'],
        default: 'employee'
    },
    age: { type: Number },
    address: { type: String },
    contactNumber: { type: String },

    // Fixed Salary Fields (for Employee / Admin)
    baseSalary: { type: Number, default: 0 },
    salaryFrequency: { type: String, enum: ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'], default: 'Weekly' },
    lastPaidDate: { type: Date },
    status: { type: String, enum: ['Active', 'On Leave', 'Sick'], default: 'Active' }
}, { timestamps: true });

const Employee = mongoose.model('employee', employeeSchema);

module.exports = Employee;