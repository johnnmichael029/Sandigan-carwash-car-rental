import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import carService from '../../assets/icon/car.png';

const EmployeeDashboard = () => {
    const [employee, setEmployee] = useState(null);
    const navigate = useNavigate();
    const [isServicesOpen, setIsServicesOpen] = useState(false);

    // Toggle services dropdown
    const toggleServices = () => {
        setIsServicesOpen(!isServicesOpen);
    };
    
    return (
        <div className="container-fluid p-0">
            <div className="d-flex">
                {/* --- SIDEBAR LEFT (Col 2) --- */}
                <nav className="sidebar-container pt-3 sidebar vh-100">
                    <div className="sidebar-sticky d-flex flex-column vh-100">
                        <div className="brand-container border-bottom w-100 d-flex justify-content-center align-items-center mb-3">
                            <img className='sandigan-logo' src={sandiganLogo} alt="Sandigan Logo" style={{width: "60%"}} />                          
                        </div>
                        
                        <ul className="nav flex-column d-flex w-100">
                            {/* Main Dropdown Header */}
                            <li className="nav-item w-100">
                                <div 
                                    className="nav-link active ps-4 d-flex justify-content-between align-items-center" 
                                    onClick={toggleServices} 
                                    style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
                                >
                                    <div className="service-container d-flex align-items-start">
                                        <img src={carService} alt="Car Service Icon" />
                                        <span className='brand-primary ps-2'>Services</span>
                                    </div>                             
                                    <span>{isServicesOpen ? <img src={upArrow} alt="Up Arrow" style={{width: '12px'}} /> : <img src={downArrow} alt="Down Arrow" style={{width: '12px'}} />}</span>
                                </div>
                            </li>

                            {/* Sub-menu Items (Only shows if isServicesOpen is true) */}
                            {isServicesOpen && (
                                <div className="animate-fade-in"> 
                                    <li className="nav-item w-100 ">
                                        <a className="nav-link ps-5" href="#" style={{ color: 'var(--text-dark-secondary)' }}>
                                            Bookings
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link ps-5" href="#" style={{ color: 'var(--text-dark-secondary)' }}>
                                            Car Rent
                                        </a>
                                    </li>
                                </div>
                            )}
                        </ul>
                    </div>
                </nav>

                {/* --- MAIN CONTENT RIGHT (Col 10) --- */}
                <main className="right-content-container col-md-10 pt-3">
                    <div className="header-container d-flex justify-content-between align-items-center mb-3 border-bottom">
                        <h5 className="text-dark-secondary px-3 font-poppins">Manage Bookings</h5>
                        {/* Using the fullName we verified in Atlas */}
                        <span>Welcome back, <strong>{employee?.fullName}</strong>!</span>
                    </div>

                {/* --- BOOKING CARDS GO HERE --- */}
                <div className="row">
                    {/* Mapping through your bookings... */}
                </div>
                </main>
            </div>
        </div>
    );
}
export default EmployeeDashboard;