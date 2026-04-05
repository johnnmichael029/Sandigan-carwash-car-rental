import CategoryManager from '../shared/CategoryManager';

const RevenueCategoryManager = ({ show, onClose, onUpdate }) => {
    return (
        <CategoryManager
            show={show}
            onClose={onClose}
            onUpdate={onUpdate}
            endpoint="revenue-categories"
            title="Revenue Tag Library"
            subtitle="Manage unified income groups for financial reporting"
            itemName="Tag"
        />
    );
};

export default RevenueCategoryManager;