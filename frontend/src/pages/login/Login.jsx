import { useState, useEffect, useMemo } from 'react';
import bgimg from '../../assets/img/hero-bg-img.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null); 
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

        // Define the URL
    const BASE_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:4000/api/employees/login' 
            : 'https://sandigan-backend-api-gzdvgkcphtbbcngq.japaneast-01.azurewebsites.net/api/employees/login';

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // We will add the fetch logic here later

        // Sanitize inputs before sending to backend
        const cleanData = {
            email: sanitizeInput(email),
            password: sanitizeInput(password)
        };

        try {
            // Simulate API call
            const response = await fetch(BASE_URL, {
                method: 'POST',
                body: JSON.stringify(cleanData),
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                // If backend sent { error: "Invalid credentials" }, show that
                setError(data.error || 'Login failed. Please check your credentials.');
                return; // Stop execution here
            }       

            if (response.ok) {
                // Handle successful login (e.g., store token, redirect)
                console.log('Login successful:', data.employee);

                // Store employee data in localStorage (or use context/state management)
                localStorage.setItem('employee', JSON.stringify(data.employee));
                // Show success alert
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful',
                    showConfirmButton: true,
                    confirmButtonColor: "#23A0CE",
                    text: `Welcome back, ${data.employee.fullName}!`,
                    timer: 2000,
                    background: '#111',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FAFAFA',
                    customClass: {
                        popup: 'rounded-5'
                    }
                }).then(() => {
                    navigate('/employee');
                });

            }
        } catch (error) {
            // This catches network errors (server offline, etc.)
            console.error("Network error:", error);
            setError('Server is unreachable. Please try again later.');;
        } finally {
            setIsLoading(false);
        }

    };

    // Timer for Toast messages
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(false);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    // Basic input sanitization function
    const sanitizeInput = (input) => {
    // 1. Remove leading/trailing whitespace
    // 2. Remove any HTML tags (the < > characters)
    // 3. Escape special characters
    return input.replace(/<[^>]*>?/gm, '').trim();
    };

    return (
        <section className="login-section">
            <div className='hero-bg-image-container position-relative overflow-hidden d-flex align-items-center justify-content-center'>
                <div className='bubble-container d-flex align-items-center justify-content-between position-absolute w-100 h-100'>
                    <img src={bubble1} className="bubble bubble1" alt="Bubble" />
                    <img src={bubble2} className="bubble bubble2" alt="Bubble" />
                    <img src={ellipse} className="ellipse position-absolute top-0 end-0" alt="Ellipse" />
                </div>                    
                <img src={bgimg} className='hero-bg-image position-absolute' alt='Hero Background' />
                <div className="form-container card p-5" style={{ width: '100%', maxWidth: '400px', borderRadius: '15px' }}>
                    <h3 className="text-center mb-4 hero-title">Employee Login</h3>
                    <form className="w-100" onSubmit={handleLogin}>
                        <div className="input-container mb-3">
                            <label className="form-label">Email Address</label>
                            <input 
                                type="email" 
                                className="form-control" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="input-container mb-3">
                            <label className="form-label">Password</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <button 
                        type="submit" 
                        className="btn btn-primary w-100 py-2"
                        disabled={isLoading}
                        >
                        {isLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                <span role="status">Signing in...</span>
                            </>
                        ) : (
                            "Sign In"
                        )}
                        </button>
                        <div className="">
                            {error && (
                                <div className="toast show align-items-center text-bg-danger border-0 mt-3" role="alert" aria-live="assertive" aria-atomic="true">
                                    <div className="d-flex">
                                        <div className="toast-body">
                                            {error}
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn-close btn-close-white me-2 m-auto" 
                                            onClick={() => setError(null)} 
                                            data-bs-dismiss="toast" 
                                            aria-label="Close">                                           
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>  
        </section>
    );
};

export default Login;