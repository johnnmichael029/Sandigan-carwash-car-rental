import TopHeader from './TopHeader';

const CarRentManagement = ({ employee }) => (
    <div>
        <TopHeader
            employee={employee}
            title="Manage Car Rentals"
            subtitle="Track and manage all active car rentals"
        />
        {/* Car rental table goes here */}
        <div
            className="rounded-4 p-4 d-flex align-items-center justify-content-center"
            style={{ minHeight: 300, background: '#fff', border: '1px dashed rgba(0,0,0,0.15)', color: '#A3A3A3', fontSize: '0.9rem' }}
        >
            🚗 Car rentals table coming soon
        </div>
    </div>
);

export default CarRentManagement;
