import { useState } from 'react';
import PermissionGate from '../../PermissionGate';
import ExportModal from './ExportModal';

/**
 * Shared ExportButton component
 *
 * Usage:
 *   Single dataset (e.g., in Revenue tab):
 *   <ExportButton user={user} datasetKey="revenue" title="Revenue Ledger" departmentKey="Finance" />
 *
 *   Multi-department (e.g., in HRIS / Inventory / Operations / Dashboard):
 *   <ExportButton user={user} label="Export Data" departmentKey="Workforce" />
 */
const ExportButton = ({
    user,
    datasetKey = null,
    departmentKey = null,
    department = null,
    title = 'Export Report',
    label = 'Export',
    variant = 'btn-save',
    size = 'sm',
    className = ''
}) => {
    const [showModal, setShowModal] = useState(false);

    // Strict target department check
    const targetDept = departmentKey || department || (datasetKey ? 'Finance' : 'Dashboard');

    return (
        <>
            <PermissionGate user={user} department={targetDept} action="export">
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className={`btn ${size ? `btn-${size}` : ''} ${variant} text-white fw-bold d-inline-flex align-items-center gap-2 shadow-sm rounded-3 ${className}`}
                >
                    <i className="bi bi-download"></i>
                    <span>{label}</span>
                </button>
            </PermissionGate>

            {showModal && (
                <ExportModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    datasetKey={datasetKey}
                    departmentKey={targetDept}
                    title={title}
                />
            )}
        </>
    );
};

export default ExportButton;
