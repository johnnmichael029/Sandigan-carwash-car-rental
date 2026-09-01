const MaintenanceProject = require('../models/maintenanceProjectModel');
const Asset = require('../models/assetModel');
const Inventory = require('../models/inventoryModel');
const Expense = require('../models/expenseModel');

// @desc    Get all maintenance projects
// @route   GET /api/maintenance
// @access  Private/Admin
const getMaintenanceProjects = async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search) {
            const regex = new RegExp(search, 'i');
            filter = {
                $or: [
                    { title: regex },
                    { status: regex },
                    { priority: regex },
                    { description: regex }
                ]
            };
        }

        const projects = await MaintenanceProject.find(filter)
            .populate('assetId', 'name category status')
            .populate('bayId', 'name')
            .populate('assignedPersonnel', 'fullName employeeId')
            .sort({ createdAt: -1 });

        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new maintenance project
// @route   POST /api/maintenance
// @access  Private/Admin
const createMaintenanceProject = async (req, res) => {
    try {
        const { title, description, assetId, bayId, priority, assignedPersonnel, startDate, partsUsed, laborCost } = req.body;

        const project = new MaintenanceProject({
            title, description, assetId, bayId, priority, assignedPersonnel, startDate, partsUsed, laborCost
        });

        // If linked to an asset, set it to "Under Maintenance"
        if (assetId) {
            await Asset.findByIdAndUpdate(assetId, { status: 'Under Maintenance' }, { returnDocument: 'after', runValidators: true });
        }

        const created = await project.save();
        const populated = await MaintenanceProject.findById(created._id)
            .populate('assetId', 'name category status')
            .populate('bayId', 'name')
            .populate('assignedPersonnel', 'fullName employeeId');

        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a maintenance project
// @route   PUT /api/maintenance/:id
// @access  Private/Admin
const updateMaintenanceProject = async (req, res) => {
    try {
        const project = await MaintenanceProject.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Maintenance project not found' });

        const previousStatus = project.status;

        const fields = ['title', 'description', 'assetId', 'bayId', 'status', 'priority',
            'partsUsed', 'laborCost', 'assignedPersonnel', 'startDate', 'completionDate'];
        fields.forEach(field => {
            if (req.body[field] !== undefined) project[field] = req.body[field];
        });

        // Restore the Asset status to Active if the project is cancelled
        if (req.body.status === 'Cancelled' && previousStatus !== 'Cancelled' && project.assetId) {
            await Asset.findByIdAndUpdate(project.assetId, { status: 'Active' }, { returnDocument: 'after', runValidators: true });
        }

        const updated = await project.save();
        const populated = await MaintenanceProject.findById(updated._id)
            .populate('assetId', 'name category status')
            .populate('bayId', 'name')
            .populate('assignedPersonnel', 'fullName employeeId');

        res.status(200).json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Complete a maintenance project (cross-module integration)
// @route   POST /api/maintenance/:id/complete
// @access  Private/Admin
const completeMaintenanceProject = async (req, res) => {
    try {
        const project = await MaintenanceProject.findById(req.params.id)
            .populate('assetId', 'name')
            .populate('assignedPersonnel', 'fullName');

        if (!project) return res.status(404).json({ message: 'Maintenance project not found' });

        // 1. Mark project as Completed
        project.status = 'Completed';
        project.completionDate = new Date();

        // 2. Deduct parts from Inventory
        if (project.partsUsed && project.partsUsed.length > 0) {
            for (const part of project.partsUsed) {
                if (part.inventoryId) {
                    await Inventory.findByIdAndUpdate(part.inventoryId, {
                        $inc: { currentStock: -part.quantity }
                    }, { returnDocument: 'after', runValidators: true });
                }
            }
        }

        // 3. Log expense in Finance Ledger
        const totalPartsCost = (project.partsUsed || []).reduce((sum, p) => sum + (p.quantity * p.costPerUnit), 0);
        const totalCost = totalPartsCost + (project.laborCost || 0);

        if (totalCost > 0) {
            const partsList = (project.partsUsed || []).map(p => `${p.name} (x${p.quantity})`).join(', ');
            const expense = new Expense({
                title: `Maintenance: ${project.title}`,
                amount: totalCost,
                category: 'Equipment Maintenance',
                date: new Date(),
                description: `Asset: ${project.assetId?.name || 'N/A'}. ${partsList ? `Parts: ${partsList} (₱${totalPartsCost.toFixed(2)}). ` : ''}Labor: ₱${(project.laborCost || 0).toFixed(2)}. ${project.description || ''}`
            });
            await expense.save();
        }

        // 4. Restore the Asset status to Active, reset its usage counter & ADD to maintenance log
        if (project.assetId) {
            const assetIdentifier = project.assetId._id || project.assetId;
            const logEntry = {
                date: new Date(),
                description: `Maintenance Completed: ${project.title}. ${project.description || ''}`,
                performedBy: project.assignedPersonnel?.fullName || 'System',
                laborCost: Number(project.laborCost) || 0
            };

            await Asset.findByIdAndUpdate(assetIdentifier, {
                status: 'Active',
                usageCounter: 0,
                $push: { maintenanceLogs: logEntry }
            }, { returnDocument: 'after', runValidators: true });
        }

        await project.save();

        const populated = await MaintenanceProject.findById(project._id)
            .populate('assetId', 'name category status')
            .populate('bayId', 'name')
            .populate('assignedPersonnel', 'fullName employeeId');

        res.status(200).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a maintenance project
// @route   DELETE /api/maintenance/:id
// @access  Private/Admin
const deleteMaintenanceProject = async (req, res) => {
    try {
        const project = await MaintenanceProject.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Maintenance project not found' });

        // If linked asset was "Under Maintenance", restore it
        if (project.assetId && project.status !== 'Completed') {
            await Asset.findByIdAndUpdate(project.assetId, { status: 'Active' }, { returnDocument: 'after', runValidators: true });
        }

        await project.deleteOne();
        res.status(200).json({ message: 'Maintenance project removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMaintenanceProjects,
    createMaintenanceProject,
    updateMaintenanceProject,
    completeMaintenanceProject,
    deleteMaintenanceProject
};
