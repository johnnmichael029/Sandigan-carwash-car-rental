import { useState, useEffect } from 'react';
import bgimg from '../../assets/img/hero-bg-img.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import { API_BASE, authHeaders } from '../../api/config';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Prevent already-logged-in employee from seeing the login page
    useEffect(() => {
        const employee = localStorage.getItem('employee');
        if (employee) {
            navigate('/employee', { replace: true });
        }
    }, [navigate]);

    // Auto-clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Basic input sanitization
    const sanitizeInput = (input) =>
        input.replace(/<[^>]*>?/gm, '').trim();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const cleanData = {
            email: sanitizeInput(email),
            password: sanitizeInput(password),
        };

        try {
            const response = await fetch(`${API_BASE}/employees/login`, {
                method: 'POST',
                body: JSON.stringify(cleanData),
                headers: authHeaders(),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed. Please check your credentials.');
                return;
            }

            // Store only non-sensitive employee info; the JWT is held in an httpOnly cookie
            localStorage.setItem('employee', JSON.stringify(data.employee));

            Swal.fire({
                icon: 'success',
                title: 'Login Successful',
                showConfirmButton: true,
                confirmButtonColor: '#23A0CE',
                text: `Welcome back, ${data.employee.fullName}!`,
                timer: 2000,
                background: '#111',
                color: '#FAFAFA',
                customClass: { popup: 'rounded-5' },
            }).then(() => {
                navigate('/employee');
            });
        } catch (err) {
            console.error('Network error:', err);
            setError('Server is unreachable. Please try again later.');
        } finally {
            setIsLoading(false);
        }
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
                    <img src={sandiganLogo} alt="Sandigan Logo" className="mb-3" />

                    <form className="w-100" onSubmit={handleLogin}>
                        {/* Email */}
                        <div className="input-container my-3">
                            <label className="form-label" htmlFor="login-email">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        {/* Password with show/hide toggle */}
                        <div className="input-container mb-3">
                            <label className="form-label" htmlFor="login-password">Password</label>
                            <div className="input-group">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    style={{ borderLeft: 'none' }}
                                >
                                    {showPassword ? (
                                        // Eye-slash icon
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.939 6.065 0 8 0 8s3 5.5 8 5.5a7.07 7.07 0 0 0 2.79-.588M5.21 3.088A7.07 7.07 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.935-2.642 3.179zm4.653 4.653a2.5 2.5 0 0 1-3.499-3.499z"/>
                                            <path d="m13.646 14.354-12-12 .708-.708 12 12z"/>
                                        </svg>
                                    ) : (
                                        // Eye icon
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
                                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="btn-login-submit"
                            type="submit"
                            className="btn btn-primary w-100 py-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                                    <span role="status">Signing in...</span>
                                </>
                            ) : 'Sign In'}
                        </button>

                        {/* Error Toast */}
                        {error && (
                            <div
                                className="toast show align-items-center text-bg-danger border-0 mt-3"
                                role="alert"
                                aria-live="assertive"
                                aria-atomic="true"
                            >
                                <div className="d-flex">
                                    <div className="toast-body">{error}</div>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white me-2 m-auto"
                                        onClick={() => setError(null)}
                                        aria-label="Close"
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Login;