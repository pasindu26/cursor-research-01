// src/App.js
import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import AppNavbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { ThemeContext } from './context/ThemeContext';

// Import pages
import LoginPage from './components/features/auth/LoginPage';
import SignupPage from './components/features/auth/SignupPage';
import HomePage from './components/features/data/HomePage';
import GraphPage from './components/features/graphs/GraphPage';
import DataTable from './components/features/data/DataTable';
import CompareGraphPage from './components/features/graphs/CompareGraphPage';
import AdminPage from './components/features/admin/AdminPage';
import Pricing from './components/pages/Pricing';
import FAQs from './components/pages/FAQs';
import About from './components/pages/About';

// Import styles
import './styles/main.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Define a ProtectedRoute component for admin access
const ProtectedRoute = ({ requireAdmin, children }) => {
    const { auth } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                // If not logged in, redirect to login
                if (!auth.loggedIn) {
                    navigate('/login', { 
                        state: { 
                            from: location.pathname,
                            message: 'Please log in to access this page' 
                        }
                    });
                    return;
                }

                // If requireAdmin and user is not admin, redirect to home
                if (requireAdmin && auth.user && auth.user.user_type !== 'admin') {
                    navigate('/', { 
                        state: { 
                            message: 'You do not have permission to access the admin area' 
                        }
                    });
                    return;
                }

                // User has access
                setChecking(false);
            } catch (error) {
                console.error('Error checking access permissions:', error);
                navigate('/login', { 
                    state: { 
                        message: 'Authentication error. Please log in again.' 
                    }
                });
            }
        };

        checkAccess();
    }, [auth, navigate, location.pathname, requireAdmin]);

    if (checking) {
        return (
            <div className="d-flex justify-content-center align-items-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return children;
};

function App() {
    const { auth } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        // Simulating a short delay to ensure auth state is loaded
        const timeout = setTimeout(() => {
            setAuthLoading(false);
        }, 500);
        return () => clearTimeout(timeout);
    }, []);

    if (authLoading) {
        return (
            <div className="spinner-container" style={{ height: '100vh', background: 'var(--bg-gradient)' }}>
                <div className="text-center text-white">
                    <div className="spinner"></div>
                    <h2 className="mt-3">Loading...</h2>
                    <p>Please wait while we prepare your experience!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`app ${theme}`}>
            {/* Navbar */}
            <AppNavbar />

            {/* Main Content */}
            <div className="main-content-wrapper">
                <div className="main-content container mt-4">
                    <Routes>
                        {/* Auth Routes */}
                        <Route
                            path="/login"
                            element={
                                auth.loggedIn ? (
                                    <Navigate to={auth.user?.user_type === 'admin' ? '/admin' : '/'} replace />
                                ) : (
                                    <LoginPage />
                                )
                            }
                        />
                        <Route
                            path="/signup"
                            element={auth.loggedIn ? <Navigate to="/" replace /> : <SignupPage />}
                        />
                        
                        {/* Protected Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <AdminPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/"
                            element={
                                auth.loggedIn ? (
                                    <HomePage />
                                ) : (
                                    <Navigate to="/login" state={{ from: location }} replace />
                                )
                            }
                        />
                        <Route
                            path="/graphs"
                            element={
                                auth.loggedIn ? (
                                    <GraphPage />
                                ) : (
                                    <Navigate to="/login" state={{ from: location }} replace />
                                )
                            }
                        />
                        <Route
                            path="/compare-graphs"
                            element={
                                auth.loggedIn ? (
                                    <CompareGraphPage />
                                ) : (
                                    <Navigate to="/login" state={{ from: location }} replace />
                                )
                            }
                        />
                        <Route
                            path="/DataTable"
                            element={
                                auth.loggedIn ? (
                                    <DataTable />
                                ) : (
                                    <Navigate to="/login" state={{ from: location }} replace />
                                )
                            }
                        />
                        
                        {/* Public Routes */}
                        <Route
                            path="/pricing"
                            element={
                                auth.loggedIn ? (
                                    <Navigate to="/" replace />
                                ) : (
                                    <Pricing />
                                )
                            }
                        />
                        <Route
                            path="/faqs"
                            element={
                                auth.loggedIn ? (
                                    <Navigate to="/" replace />
                                ) : (
                                    <FAQs />
                                )
                            }
                        />
                        <Route
                            path="/about"
                            element={
                                auth.loggedIn ? (
                                    <Navigate to="/" replace />
                                ) : (
                                    <About />
                                )
                            }
                        />
                        
                        {/* Fallback Route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default App;
