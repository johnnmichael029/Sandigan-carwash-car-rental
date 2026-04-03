const Employee = require('../models/employeeModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createLog } = require('./activityLogController');

// Get employee by ID
const getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all employees
const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create employee
const createEmployee = async (req, res) => {
    let {
        fullName, email, password, role, age, address, phone,
        baseSalary, salaryFrequency, status,
        hasAccount = true, shiftType = 'None', shiftStartTime,
        hiredDate
    } = req.body;

    // Default shift times if not provided
    if (shiftType === 'Morning' && !shiftStartTime) shiftStartTime = "08:00 AM";
    if (shiftType === 'Night' && !shiftStartTime) shiftStartTime = "05:00 PM";

    // Fallback unique identity for directory-only staff (Satisfies DB uniqueness without requiring a real email)
    if (!hasAccount || role === 'detailer') {
        if (!email || email.trim() === '') {
            email = `${role}_${Date.now()}@sandigan.local`;
        }
        if (!password || password.trim() === '') {
            password = `noaccount_${Date.now()}!`;
        }
    }

    try {
        let hashedPassword = null;
        if (hasAccount) {
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required for accounts.' });
            }
            // Check if email already exists
            const existingEmployee = await Employee.findOne({ email });
            if (existingEmployee) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const newEmployee = await Employee.create({
            fullName,
            email,
            password: hashedPassword,
            hasAccount,
            role: role || 'employee',
            shiftType,
            shiftStartTime,
            age: age ? Number(age) : undefined,
            address,
            contactNumber: phone,
            baseSalary: baseSalary ? Number(baseSalary) : 0,
            salaryFrequency: salaryFrequency || 'Monthly',
            status: status || 'Active',
            hiredDate: hiredDate ? new Date(hiredDate) : undefined
        });

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'HRIS',
                action: 'employee_created',
                message: `Created new ${newEmployee.role}: ${newEmployee.fullName}`,
                meta: { id: newEmployee._id, role: newEmployee.role }
            });
        }

        res.status(201).json({ message: 'Employee created successfully' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'The email address you entered is already in use by another account.' });
        }
        res.status(400).json({ error: error.message });
    }
};

// Update employee
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const {
        fullName, email, role, password, age, address, phone,
        baseSalary, salaryFrequency, status,
        hasAccount, shiftType, shiftStartTime,
        hiredDate
    } = req.body;

    // // Safety: prevent admin from demoting their own account
    if (req.employeeId && req.employeeId.toString() === id && role && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot change your own admin role.' });
    }

    try {
        const updateFields = {};
        if (fullName) updateFields.fullName = fullName;
        if (email !== undefined) {
            if (email && email.trim() !== '') {
                updateFields.email = email;
            } else if (!hasAccount || role === 'detailer') {
                // If it was cleared and we don't need a real account, generate fallback
                updateFields.email = `${role || 'staff'}_${Date.now()}@sandigan.local`;
            } else {
                updateFields.email = null;
            }
        }
        if (role) updateFields.role = role;
        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }
        if (age !== undefined) updateFields.age = age ? Number(age) : null;
        if (address !== undefined) updateFields.address = address;
        if (phone !== undefined) updateFields.contactNumber = phone;
        if (baseSalary !== undefined) updateFields.baseSalary = baseSalary ? Number(baseSalary) : 0;
        if (salaryFrequency !== undefined) updateFields.salaryFrequency = salaryFrequency;
        if (status !== undefined) updateFields.status = status;

        if (hasAccount !== undefined) updateFields.hasAccount = hasAccount;
        if (shiftType !== undefined) updateFields.shiftType = shiftType;
        if (shiftStartTime !== undefined) updateFields.shiftStartTime = shiftStartTime;
        if (hiredDate !== undefined) updateFields.hiredDate = hiredDate ? new Date(hiredDate) : null;

        const employee = await Employee.findByIdAndUpdate(id, updateFields, { returnDocument: 'after', runValidators: true });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'HRIS',
                action: 'employee_updated',
                message: `Updated profile for ${employee.fullName}`,
                meta: { id: employee._id, role: employee.role, changes: Object.keys(updateFields) }
            });
        }

        res.json({ message: 'Employee updated successfully', employee });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'The email address you entered is already in use by another account.' });
        }
        res.status(500).json({ message: error.message });
    }
};


// Delete employee
const deleteEmployee = async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await Employee.findByIdAndDelete(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'HRIS',
                action: 'employee_deleted',
                message: `Deleted employee record: ${employee.fullName}`,
                meta: { id: employee._id, role: employee.role }
            });
        }

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login employee
const loginEmployee = async (req, res) => {
    const { email, password } = req.body;

    try {
        const employee = await Employee.findOne({ email });
        if (!employee) return res.status(404).json({ error: "User not found" });

        // Check if the employee is allowed to log into the system
        if (!employee.hasAccount) {
            return res.status(403).json({ error: "This account does not have login access. Please contact your administrator." });
        }

        // Compare the password typed vs the hashed password in DB
        const isMatch = await bcrypt.compare(password, employee.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        // Issue a JWT token (expires in 8 hours)
        const token = jwt.sign(
            { id: employee._id, role: employee.role },
            process.env.JWT_SECRET || 'fallback-secret-until-azure-env-set',
            { expiresIn: '8h' }
        );

        // Set token as httpOnly cookie to prevent XSS-based token theft
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
        });

        res.status(200).json({
            message: "Login successful",
            employee: {
                id: employee._id,
                fullName: employee.fullName,
                role: employee.role
            }
        });

        // Log the login (non-blocking — after response sent)
        createLog({
            actorId: employee._id,
            actorName: employee.fullName,
            actorRole: employee.role,
            module: 'SYSTEM',
            action: 'staff_logged_in',
            message: `${employee.fullName} logged into the system`,
            meta: { role: employee.role }
        }).catch(() => { });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Logout employee
const logoutEmployee = async (req, res) => {
    let actorName = 'Unknown Staff';
    let actorId = null;
    let actorRole = 'employee';

    try {
        const token = req.cookies?.token;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            actorId = decoded.id;
            actorRole = decoded.role;

            // Look up the name in the database before clearing the cookie
            const emp = await Employee.findById(actorId).lean();
            if (emp) actorName = emp.fullName;
        }
    } catch (_) { }

    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.status(200).json({ message: 'Logged out successfully' });

    // Log logout with the captured name
    if (actorId) {
        createLog({
            actorId, actorName, actorRole,
            module: 'SYSTEM',
            action: 'staff_logged_out',
            message: `${actorName} logged out of the system`,
            meta: { role: actorRole }
        }).catch(() => { });
    }
};

module.exports = {
    getEmployee,
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    loginEmployee,
    logoutEmployee,
}