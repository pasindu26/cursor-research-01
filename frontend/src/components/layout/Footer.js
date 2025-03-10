// src/components/layout/Footer.js
// Reusable Footer component

import React, { useContext, useState } from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import '../../styles/Footer.css';
import '../../styles/main.css';

const Footer = () => {
  const { theme } = useContext(ThemeContext);
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    
    // Simple email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Here you would typically call an API to subscribe the user
    // For now, we'll just simulate a successful subscription
    setError('');
    setSubscribed(true);
    setEmail('');
    
    // Reset the subscribed state after 5 seconds
    setTimeout(() => {
      setSubscribed(false);
    }, 5000);
  };

  return (
    <footer className={`footer py-5 mt-5 ${theme === 'dark' ? 'footer-dark' : 'footer-light'}`}>
      <Container className="footer-container">
        <Row className="mb-4 footer-main-row">
          <Col lg={3} md={6} className="mb-4 mb-md-0">
            <div className="footer-brand">
              <h5 className="mb-3">Water360</h5>
              <p className="text-muted mb-3">
                Providing comprehensive water quality monitoring and analysis solutions.
              </p>
              <div className="footer-social d-flex gap-3">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                  <i className="bi bi-linkedin"></i>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="GitHub">
                  <i className="bi bi-github"></i>
                </a>
              </div>
            </div>
          </Col>
          
          <Col lg={2} md={6} className="mb-4 mb-md-0">
            <h6 className="footer-heading mb-3">Quick Links</h6>
            <ul className="footer-links list-unstyled">
              <li className="mb-2"><Link to="/" className="footer-link">Home</Link></li>
              <li className="mb-2"><Link to="/about" className="footer-link">About</Link></li>
              <li className="mb-2"><Link to="/pricing" className="footer-link">Pricing</Link></li>
              <li className="mb-2"><Link to="/faqs" className="footer-link">FAQs</Link></li>
            </ul>
          </Col>
          
          <Col lg={2} md={6} className="mb-4 mb-md-0">
            <h6 className="footer-heading mb-3">Resources</h6>
            <ul className="footer-links list-unstyled">
              <li className="mb-2"><Link to="/docs" className="footer-link">Documentation</Link></li>
              <li className="mb-2"><Link to="/api" className="footer-link">API Reference</Link></li>
              <li className="mb-2"><Link to="/blog" className="footer-link">Blog</Link></li>
              <li className="mb-2"><Link to="/support" className="footer-link">Support</Link></li>
            </ul>
          </Col>
          
          <Col lg={2} md={6} className="mb-4 mb-md-0 footer-contact-col">
            <h6 className="footer-heading mb-3">Contact Us</h6>
            <address className="footer-contact">
              <p className="mb-2 footer-address">
                <i className="bi bi-geo-alt me-2"></i>
                <span>
                  123 Water Street<br />
                  Cityville, State 12345
                </span>
              </p>
              <div className="mb-2 footer-contact-item">
                <i className="bi bi-envelope me-2"></i>
                <a href="mailto:info@water360.com" className="footer-link">
                  info@water360.com
                </a>
              </div>
              <div className="mb-2 footer-contact-item">
                <i className="bi bi-telephone me-2"></i>
                <a href="tel:+11234567890" className="footer-link">
                  +1 (123) 456-7890
                </a>
              </div>
            </address>
          </Col>
          
          <Col lg={3} md={6} className="mb-4 mb-md-0 footer-newsletter-col">
            <h6 className="footer-heading mb-3">Newsletter</h6>
            <p className="text-muted mb-3">Subscribe to our newsletter for the latest updates and insights.</p>
            <Form onSubmit={handleSubscribe} className="newsletter-form">
              <InputGroup className="mb-2">
                <Form.Control
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`newsletter-input ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                  aria-label="Email address for newsletter"
                />
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="newsletter-button"
                  disabled={subscribed}
                >
                  {subscribed ? <i className="bi bi-check-lg"></i> : 'Subscribe'}
                </Button>
              </InputGroup>
              {error && <p className="text-danger small mt-1">{error}</p>}
              {subscribed && <p className="text-success small mt-1">Thank you for subscribing!</p>}
            </Form>
          </Col>
        </Row>
        
        <hr className="footer-divider" />
        
        <Row className="footer-bottom">
          <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
            <p className="footer-copyright mb-0">&copy; {currentYear} Water360. All rights reserved.</p>
          </Col>
          <Col md={6} className="text-center text-md-end">
            <ul className="footer-legal list-inline mb-0">
              <li className="list-inline-item">
                <Link to="/privacy" className="footer-link">Privacy Policy</Link>
              </li>
              <li className="list-inline-item mx-2 footer-separator">•</li>
              <li className="list-inline-item">
                <Link to="/terms" className="footer-link">Terms of Service</Link>
              </li>
              <li className="list-inline-item mx-2 footer-separator">•</li>
              <li className="list-inline-item">
                <Link to="/cookies" className="footer-link">Cookie Policy</Link>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 