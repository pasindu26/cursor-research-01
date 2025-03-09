// src/components/common/Alert.js
// Reusable alert component

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert as BootstrapAlert } from 'react-bootstrap';
import '../../styles/main.css';

const Alert = ({ 
  variant = 'info', 
  message, 
  dismissible = true, 
  autoDismiss = false, 
  autoDismissTime = 5000,
  onDismiss = () => {},
}) => {
  const [show, setShow] = useState(true);

  // Auto-dismiss the alert after specified time
  useEffect(() => {
    if (autoDismiss && show) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, autoDismissTime);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTime, show, onDismiss]);

  // If not showing, return null
  if (!show || !message) {
    return null;
  }

  // Handle dismiss
  const handleDismiss = () => {
    setShow(false);
    onDismiss();
  };

  return (
    <BootstrapAlert 
      variant={variant} 
      dismissible={dismissible}
      onClose={dismissible ? handleDismiss : undefined}
      className="fade-in"
    >
      {message}
    </BootstrapAlert>
  );
};

Alert.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']),
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  dismissible: PropTypes.bool,
  autoDismiss: PropTypes.bool,
  autoDismissTime: PropTypes.number,
  onDismiss: PropTypes.func,
};

export default Alert; 