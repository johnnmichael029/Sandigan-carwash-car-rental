import CategoryManager from '../shared/CategoryManager';

const BillCategoryManager = ({ show, onClose, onUpdate }) => {
    return (
        <CategoryManager
            show={show}
            onClose={onClose}
            onUpdate={onUpdate}
            endpoint="bill-categories"
            title="Bill Type Library"
            subtitle="Define scalable categories for recurring business costs"
            itemName="Type"
        />
    );
};

export default BillCategoryManager;