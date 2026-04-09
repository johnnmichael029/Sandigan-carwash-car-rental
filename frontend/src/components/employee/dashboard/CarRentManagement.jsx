import TopHeader from './TopHeader';

const CarRentManagement = ({ employee, isDark }) => (
    <div>
        <TopHeader
            employee={employee}
            title="Manage Car Rentals"
            subtitle="Track and manage all active car rentals"
        />
        {/* Car rental table goes here */}
        <div
            className="rounded-4 p-4 d-flex align-items-center justify-content-center"
            style={{ minHeight: 300, background: 'var(--theme-card-bg)', border: '1px dashed var(--theme-content-border)', color: 'var(--theme-content-text-secondary)', fontSize: '0.9rem' }}
        >
            🚗 Car rentals table coming soon
        </div>
    </div>
);

export default CarRentManagement;
