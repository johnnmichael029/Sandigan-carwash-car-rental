const mongoose = require('mongoose');

const crmTagSchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    color:       { type: String, required: true, default: '#6b7280' }, // hex background color for the badge
    textColor:   { type: String, required: true, default: '#ffffff' },
    isSystem:    { type: Boolean, default: false }, // system tags cannot be deleted
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CrmTag', crmTagSchema);
