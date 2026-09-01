import CategoryManager from '../shared/CategoryManager';

const BillCategoryManager = ({ show, onClose, onUpdate, isDark }) => {
    return (
        <CategoryManager
            show={show}
            onClose={onClose}
            onUpdate={onUpdate}
            endpoint="bill-categories"
            title="Bill Type Library"
            subtitle="Define scalable categories for recurring business costs"
            itemName="Type"
            isDark={isDark}
        />
    );
};

export default BillCategoryManager;