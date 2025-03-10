// src/components/layout/Navbar.js
// Reusable Navbar component

import React, { useContext, useState, useEffect } from 'react';
import { Navbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import useAuth from '../../hooks/useAuth';
import '../../styles/Navbar.css';
import '../../styles/main.css';

const AppNavbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  
  // Function to check if a nav link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Check if Bootstrap Icons are loaded
  useEffect(() => {
    // Create a link element to load Bootstrap Icons if not already loaded
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
    linkElement.onload = () => setIconsLoaded(true);
    
    // Check if Bootstrap Icons are already loaded
    const existingLink = document.querySelector('link[href*="bootstrap-icons"]');
    if (existingLink) {
      setIconsLoaded(true);
    } else {
      document.head.appendChild(linkElement);
    }
    
    return () => {
      // Don't remove the link element as other components might need it
    };
  }, []);

  return (
    <Navbar
      bg={theme === 'dark' ? 'dark' : 'light'}
      variant={theme === 'dark' ? 'dark' : 'light'}
      expand="lg"
      className={`navbar-custom mb-3 ${scrolled ? 'navbar-scrolled' : ''}`}
      fixed="top"
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="brand-custom">
          <img
            src="/logo.png"
            width="30"
            height="30"
            className="d-inline-block align-top me-2"
            alt="Water360 Logo"
          />
          Water360
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {isAuthenticated ? (
              // Navigation items for logged-in users
              <>
                <Nav.Link as={Link} to="/" className={`nav-link-animated ${isActive('/') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-house-door me-1"></i> : null} Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/graphs" className={`nav-link-animated ${isActive('/graphs') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-graph-up me-1"></i> : null} Graphs
                </Nav.Link>
                <Nav.Link as={Link} to="/compare-graphs" className={`nav-link-animated ${isActive('/compare-graphs') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-bar-chart me-1"></i> : null} Compare
                </Nav.Link>
                <Nav.Link as={Link} to="/DataTable" className={`nav-link-animated ${isActive('/DataTable') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-table me-1"></i> : null} Data Table
                </Nav.Link>
                {user?.user_type === 'admin' && (
                  <Nav.Link as={Link} to="/admin" className={`nav-link-animated ${isActive('/admin') ? 'active' : ''}`}>
                    {iconsLoaded ? <i className="bi bi-shield-lock me-1"></i> : null} Admin
                  </Nav.Link>
                )}
              </>
            ) : (
              // Navigation items for non-logged-in users
              <>
                <Nav.Link as={Link} to="/about" className={`nav-link-animated ${isActive('/about') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-info-circle me-1"></i> : null} About
                </Nav.Link>
                <Nav.Link as={Link} to="/pricing" className={`nav-link-animated ${isActive('/pricing') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-tag me-1"></i> : null} Pricing
                </Nav.Link>
                <Nav.Link as={Link} to="/faqs" className={`nav-link-animated ${isActive('/faqs') ? 'active' : ''}`}>
                  {iconsLoaded ? <i className="bi bi-question-circle me-1"></i> : null} FAQs
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            <Button
              variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
              size="sm"
              onClick={toggleTheme}
              className="theme-toggle me-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? 
                <>{iconsLoaded ? <i className="bi bi-sun-fill me-1"></i> : null} Light</> : 
                <>{iconsLoaded ? <i className="bi bi-moon-fill me-1"></i> : null} Dark</>
              }
            </Button>
            
            {isAuthenticated ? (
              <NavDropdown 
                title={
                  <span>
                    {iconsLoaded ? <i className="bi bi-person-circle me-1"></i> : null}
                    {user?.username || 'User'}
                  </span>
                } 
                id="user-dropdown"
                align="end"
                className="user-dropdown"
              >
                <NavDropdown.Item as={Link} to="/profile" className="dropdown-item-custom">
                  {iconsLoaded ? <i className="bi bi-person me-2"></i> : null} Profile
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/settings" className="dropdown-item-custom">
                  {iconsLoaded ? <i className="bi bi-gear me-2"></i> : null} Settings
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout} className="dropdown-item-custom text-danger">
                  {iconsLoaded ? <i className="bi bi-box-arrow-right me-2"></i> : null} Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Item className="d-flex">
                <Button 
                  variant="outline-primary" 
                  className="me-2 auth-btn"
                  onClick={() => navigate('/login')}
                >
                  {iconsLoaded ? <i className="bi bi-box-arrow-in-right me-1"></i> : null} Login
                </Button>
                <Button 
                  variant="primary"
                  className="auth-btn"
                  onClick={() => navigate('/signup')}
                >
                  {iconsLoaded ? <i className="bi bi-person-plus me-1"></i> : null} Sign Up
                </Button>
              </Nav.Item>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar; 