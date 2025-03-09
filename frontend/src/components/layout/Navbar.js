// src/components/layout/Navbar.js
// Reusable Navbar component

import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import useAuth from '../../hooks/useAuth';
import '../../styles/main.css';

const AppNavbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Navbar
      bg={theme === 'dark' ? 'dark' : 'light'}
      variant={theme === 'dark' ? 'dark' : 'light'}
      expand="lg"
      className="mb-3"
    >
      <Container>
        <Navbar.Brand as={Link} to="/">
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
                <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/graphs">Graphs</Nav.Link>
                <Nav.Link as={Link} to="/compare-graphs">Compare</Nav.Link>
                <Nav.Link as={Link} to="/DataTable">Data Table</Nav.Link>
                {user?.user_type === 'admin' && (
                  <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
                )}
              </>
            ) : (
              // Navigation items for non-logged-in users
              <>
                <Nav.Link as={Link} to="/about">About</Nav.Link>
                <Nav.Link as={Link} to="/pricing">Pricing</Nav.Link>
                <Nav.Link as={Link} to="/faqs">FAQs</Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            <Button
              variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
              size="sm"
              onClick={toggleTheme}
              className="me-2"
            >
              {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
            </Button>
            
            {isAuthenticated ? (
              <NavDropdown 
                title={`Hello, ${user?.username || 'User'}`} 
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Item className="d-flex">
                <Button 
                  variant="outline-primary" 
                  className="me-2"
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up
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