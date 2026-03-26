const moongose = require('mongoose');
const Schema = moongose.Schema;

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
        default: 'employee'
    }
}, { timestamps: true });

const Employee = moongose.model('employee', employeeSchema);

module.exports = Employee;