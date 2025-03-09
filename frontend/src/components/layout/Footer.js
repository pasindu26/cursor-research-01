// src/components/layout/Footer.js
// Reusable Footer component

import React, { useContext } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import '../../styles/main.css';

const Footer = () => {
  const { theme } = useContext(ThemeContext);
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`py-4 mt-5 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <Container>
        <Row className="mb-4">
          <Col md={4} className="mb-3 mb-md-0">
            <h5>Water360</h5>
            <p className="text-muted">
              Providing comprehensive water quality monitoring and analysis solutions.
            </p>
            <div className="d-flex gap-3">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                <i className="bi bi-twitter"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                <i className="bi bi-linkedin"></i>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                <i className="bi bi-github"></i>
              </a>
            </div>
          </Col>
          
          <Col md={2} className="mb-3 mb-md-0">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><Link to="/" className="text-decoration-none">Home</Link></li>
              <li><Link to="/about" className="text-decoration-none">About</Link></li>
              <li><Link to="/pricing" className="text-decoration-none">Pricing</Link></li>
              <li><Link to="/faqs" className="text-decoration-none">FAQs</Link></li>
            </ul>
          </Col>
          
          <Col md={3} className="mb-3 mb-md-0">
            <h6>Resources</h6>
            <ul className="list-unstyled">
              <li><Link to="/docs" className="text-decoration-none">Documentation</Link></li>
              <li><Link to="/api" className="text-decoration-none">API Reference</Link></li>
              <li><Link to="/blog" className="text-decoration-none">Blog</Link></li>
              <li><Link to="/support" className="text-decoration-none">Support</Link></li>
            </ul>
          </Col>
          
          <Col md={3}>
            <h6>Contact Us</h6>
            <address className="text-muted">
              <p>123 Water Street<br />Cityville, State 12345</p>
              <p>Email: <a href="mailto:info@water360.com" className="text-decoration-none">info@water360.com</a></p>
              <p>Phone: <a href="tel:+11234567890" className="text-decoration-none">+1 (123) 456-7890</a></p>
            </address>
          </Col>
        </Row>
        
        <hr />
        
        <Row>
          <Col md={6} className="text-center text-md-start">
            <p className="mb-0">&copy; {currentYear} Water360. All rights reserved.</p>
          </Col>
          <Col md={6} className="text-center text-md-end">
            <ul className="list-inline mb-0">
              <li className="list-inline-item">
                <Link to="/privacy" className="text-decoration-none">Privacy Policy</Link>
              </li>
              <li className="list-inline-item mx-2">•</li>
              <li className="list-inline-item">
                <Link to="/terms" className="text-decoration-none">Terms of Service</Link>
              </li>
              <li className="list-inline-item mx-2">•</li>
              <li className="list-inline-item">
                <Link to="/cookies" className="text-decoration-none">Cookie Policy</Link>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 