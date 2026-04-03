const Holiday = require('../models/holidayModel');
const Attendance = require('../models/attendanceModel');

/**
 * GET all holiday dates
 */
const getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ dateStr: 1 });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST a new holiday
 */
const createHoliday = async (req, res) => {
    try {
        const { dateStr, name, type } = req.body;
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Admins only' });
        }

        // Check if its same date holiday
        const existingHolidayDate = await Holiday.findOne({ dateStr });
        if (existingHolidayDate) {
            return res.status(400).json({ error: 'A holiday is already recorded for this date.' });
        }

        const holiday = await Holiday.create({ dateStr, name, type });

        // AUTO-SYNC: Update existing attendance records for this date
        await Attendance.updateMany({ dateStr }, { 
            $set: { holidayType: type, holidayName: name } 
        });

        res.status(201).json(holiday);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * UPDATE a holiday
 */
const updateHoliday = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Admins only' });
        }
        const { dateStr, name, type } = req.body;
        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) return res.status(404).json({ error: 'Holiday not found' });

        const oldDate = holiday.dateStr;
        
        // If date is changing, check for duplicates and clear old attendance records
        if (dateStr && dateStr !== oldDate) {
            const dateInUse = await Holiday.findOne({ dateStr, _id: { $ne: holiday._id } });
            if (dateInUse) return res.status(400).json({ error: 'A holiday already exists on the new date.' });

            // Clear holiday status from attendance records on the OLD date
            await Attendance.updateMany({ dateStr: oldDate }, { 
                $set: { holidayType: 'None', holidayName: '' } 
            });
            
            holiday.dateStr = dateStr;
        }

        if (name) holiday.name = name;
        if (type) holiday.type = type;

        await holiday.save();

        // AUTO-SYNC: Update attendance records for the current dateStr
        await Attendance.updateMany({ dateStr: holiday.dateStr }, { 
            $set: { holidayType: holiday.type, holidayName: holiday.name } 
        });

        res.json(holiday);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * DELETE a holiday
 */
const deleteHoliday = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Admins only' });
        }
        const holiday = await Holiday.findById(req.params.id);
        if (holiday) {
            // AUTO-SYNC: Clear holiday status from attendance records for this date
            await Attendance.updateMany({ dateStr: holiday.dateStr }, { 
                $set: { holidayType: 'None', holidayName: '' } 
            });
            await holiday.deleteOne();
        }
        res.json({ message: 'Holiday deleted and attendance records synced.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
};
