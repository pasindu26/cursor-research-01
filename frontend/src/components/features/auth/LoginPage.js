// src/components/features/auth/LoginPage.js
import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeContext } from '../../../context/ThemeContext';
import useAuth from '../../../hooks/useAuth';
import '../../../styles/auth.css';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const { login } = useAuth();
    const { theme } = useContext(ThemeContext);
    
    // Focus on username input when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            const usernameInput = document.getElementById('username-input');
            if (usernameInput) usernameInput.focus();
        }, 500);
        
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }
        
        setError('');
        setLoading(true);
        
        try {
            console.log('Attempting login with:', { username });
            const result = await login({ username, password });
            console.log('Login result:', result);
            
            if (!result.success) {
                setError(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred during login. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Container fluid className="auth-container">
            <Row className="justify-content-center align-items-center min-vh-100">
                <Col xs={11} sm={10} md={8} lg={6} xl={5}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card 
                            className={`auth-card ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'}`}
                        >
                            <Card.Body className="p-4 p-md-5">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                >
                                    <h2 className="text-center mb-4 auth-title">
                                        <span className="gradient-text">Login</span>
                                    </h2>
                                    
                                    <div className="text-center mb-4">
                                        <p className="text-muted">
                                            Welcome back! Please enter your credentials to access your account.
                                        </p>
                                    </div>
                                </motion.div>
                                
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Alert 
                                            variant={theme === 'dark' ? 'danger' : 'danger'} 
                                            className={theme === 'dark' ? 'dark-alert' : ''}
                                        >
                                            {error}
                                        </Alert>
                                    </motion.div>
                                )}
                                
                                <Form onSubmit={handleSubmit}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">Username</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-person"></i>
                                                </span>
                                                <Form.Control
                                                    id="username-input"
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    placeholder="Enter your username (not email)"
                                                    required
                                                    className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                                                />
                                            </div>
                                            <Form.Text className="text-muted">
                                                Use the username you selected during registration
                                            </Form.Text>
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">Password</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-lock"></i>
                                                </span>
                                                <Form.Control
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Enter your password"
                                                    required
                                                    className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                                                />
                                                <Button 
                                                    variant="outline-secondary"
                                                    onClick={togglePasswordVisibility}
                                                    className={theme === 'dark' ? 'dark-btn-outline' : ''}
                                                >
                                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                                </Button>
                                            </div>
                                            <div className="d-flex justify-content-end mt-2">
                                                <Link to="/forgot-password" className="text-decoration-none small">
                                                    Forgot password?
                                                </Link>
                                            </div>
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <div className="d-grid gap-2 mt-4">
                                            <Button 
                                                variant="primary" 
                                                type="submit" 
                                                disabled={loading}
                                                className="auth-button"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            role="status"
                                                            aria-hidden="true"
                                                            className="me-2"
                                                        />
                                                        Logging in...
                                                    </>
                                                ) : (
                                                    'Login'
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                </Form>
                                
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6, duration: 0.5 }}
                                    className="text-center mt-4"
                                >
                                    <p className={theme === 'dark' ? 'text-light' : 'text-muted'}>
                                        Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
                                    </p>
                                </motion.div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
}

export default LoginPage; 
