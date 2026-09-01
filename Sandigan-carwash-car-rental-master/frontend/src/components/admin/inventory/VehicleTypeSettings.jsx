import CategoryManager from '../shared/CategoryManager';

const VehicleTypeSettings = ({ show, onClose, onUpdate, isDark }) => {
    return (
        <CategoryManager
            show={show}
            onClose={onClose}
            onUpdate={onUpdate}
            endpoint="vehicle-types"
            title="Vehicle Types Library"
            subtitle="Manage global vehicle types for Car Rentals and Services"
            itemName="Vehicle Type"
            isDark={isDark}
        />
    );
};

export default VehicleTypeSettings;
