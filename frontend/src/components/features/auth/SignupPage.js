// src/components/features/auth/SignupPage.js
import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeContext } from '../../../context/ThemeContext';
import axios from 'axios';
import { isValidEmail, isValidPassword, getPasswordStrength, getPasswordStrengthLabel } from '../../../utils/validation';
import '../../../styles/auth.css';

function SignupPage() {
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        user_type: 'customer'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const navigate = useNavigate();
    const { theme } = useContext(ThemeContext);
    
    // Get backend URL from environment variables
    const BACKEND_URL = window._env_?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    
    const passwordStrength = getPasswordStrength(formData.password);
    const strengthLabel = getPasswordStrengthLabel(passwordStrength);
    
    // Focus on firstname input when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            const firstnameInput = document.getElementById('firstname-input');
            if (firstnameInput) firstnameInput.focus();
        }, 500);
        
        return () => clearTimeout(timer);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submitted with data:', formData);
        
        // Reset messages
        setError('');
        setSuccess('');
        
        // Validate form
        if (!formData.firstname || !formData.lastname || !formData.username || 
            !formData.email || !formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            return;
        }
        
        if (!isValidEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        if (!isValidPassword(formData.password)) {
            setError('Password must be at least 8 characters and include at least one letter and one number');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        
        try {
            console.log('Sending registration data:', formData);
            console.log('Endpoint:', `${BACKEND_URL}/register`);
            
            // Direct axios call to backend
            const response = await axios.post(`${BACKEND_URL}/register`, {
                firstname: formData.firstname,
                lastname: formData.lastname,
                username: formData.username,
                email: formData.email,
                password: formData.password,
                user_type: formData.user_type
            });
            
            console.log('Registration response:', response.data);
            
            if (response.data.status === 'success') {
                setSuccess('Account created successfully! Redirecting to login...');
                
                // Display a message encouraging users to remember their credentials
                alert(`Account created successfully! Please remember your login details:
Username: ${formData.username}
Password: (your entered password)`);
                
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(response.data.message || 'Failed to create account. Please try again.');
            }
        } catch (err) {
            console.error('Registration error:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.message || 'An error occurred during registration. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const getStrengthColor = () => {
        if (passwordStrength < 2) return '#dc3545'; // danger
        if (passwordStrength < 3) return '#ffc107'; // warning
        return '#28a745'; // success
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
                                        <span className="gradient-text">Create an Account</span>
                                    </h2>
                                    
                                    <div className="text-center mb-4">
                                        <p className="text-muted">
                                            Join Water360 to access comprehensive water quality monitoring tools.
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
                                
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Alert 
                                            variant={theme === 'dark' ? 'success' : 'success'} 
                                            className={theme === 'dark' ? 'dark-alert-success' : ''}
                                        >
                                            {success}
                                        </Alert>
                                    </motion.div>
                                )}
                                
                                <Form onSubmit={handleSubmit}>
                                    <Row>
                                        <Col md={6}>
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3, duration: 0.5 }}
                                            >
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="auth-label">First Name</Form.Label>
                                                    <div className="input-group">
                                                        <span className="input-group-text">
                                                            <i className="bi bi-person"></i>
                                                        </span>
                    <Form.Control
                                                            id="firstname-input"
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleChange}
                                                            placeholder="Enter first name"
                        required
                                                            className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                    />
                                                    </div>
                </Form.Group>
                                            </motion.div>
                                        </Col>
                                        <Col md={6}>
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3, duration: 0.5 }}
                                            >
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="auth-label">Last Name</Form.Label>
                                                    <div className="input-group">
                                                        <span className="input-group-text">
                                                            <i className="bi bi-person"></i>
                                                        </span>
                    <Form.Control
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                                                            placeholder="Enter last name"
                        required
                                                            className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                    />
                                                    </div>
                </Form.Group>
                                            </motion.div>
                                        </Col>
                                    </Row>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">Username</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-person-badge"></i>
                                                </span>
                    <Form.Control
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                                                    placeholder="Choose a username"
                        required
                                                    className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                    />
                                            </div>
                </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">Email</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-envelope"></i>
                                                </span>
                    <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                                                    placeholder="Enter your email"
                        required
                                                    className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                    />
                                            </div>
                </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">User Type</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-person-badge"></i>
                                                </span>
                                                <Form.Select
                        name="user_type"
                        value={formData.user_type}
                        onChange={handleChange}
                        required
                                                    className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                    >
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                                                </Form.Select>
                                            </div>
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">Password</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-lock"></i>
                                                </span>
                                                <Form.Control
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    placeholder="Create a password"
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
                                            {formData.password && (
                                                <div className="mt-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small>Password strength: 
                                                            <span style={{ color: getStrengthColor(), marginLeft: '5px' }}>
                                                                {strengthLabel}
                                                            </span>
                                                        </small>
                                                        <small>{passwordStrength * 25}%</small>
                                                    </div>
                                                    <div className="progress mt-1" style={{ height: '5px' }}>
                                                        <div 
                                                            className="progress-bar" 
                                                            role="progressbar" 
                                                            style={{ 
                                                                width: `${passwordStrength * 25}%`,
                                                                backgroundColor: getStrengthColor()
                                                            }}
                                                            aria-valuenow={passwordStrength * 25} 
                                                            aria-valuemin="0" 
                                                            aria-valuemax="100"
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6, duration: 0.5 }}
                                    >
                                        <Form.Group className="mb-4">
                                            <Form.Label className="auth-label">Confirm Password</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-lock-fill"></i>
                                                </span>
                                                <Form.Control
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    placeholder="Confirm your password"
                                                    required
                                                    className={`auth-input ${theme === 'dark' ? 'dark-input' : ''}`}
                                                />
                                                <Button 
                                                    variant="outline-secondary"
                                                    onClick={toggleConfirmPasswordVisibility}
                                                    className={theme === 'dark' ? 'dark-btn-outline' : ''}
                                                >
                                                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                                </Button>
                                            </div>
                </Form.Group>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.7, duration: 0.5 }}
                                        className="mt-4"
                                    >
                                        <div className="d-grid">
                                            <Button 
                                                type="submit" 
                                                variant="primary" 
                                                size="lg" 
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
                                                        Creating Account...
                                                    </>
                                                ) : (
                                                    'Sign Up'
                                                )}
                </Button>
                                        </div>
                                    </motion.div>
            </Form>
                                
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8, duration: 0.5 }}
                                    className="text-center mt-4"
                                >
                                    <p className="mb-0">
                                        Already have an account? <Link to="/login" className="auth-link">Login</Link>
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

export default SignupPage;
