import CategoryManager from '../shared/CategoryManager';

const InventoryCategoryManager = ({ show, onClose, onUpdate }) => {
    return (
        <CategoryManager
            show={show}
            onClose={onClose}
            onUpdate={onUpdate}
            endpoint="inventory-categories"
            title="Category Library"
            subtitle="Manage unified categories for Warehouse and Catalog"
            itemName="Category"
        />
    );
};

export default InventoryCategoryManager;