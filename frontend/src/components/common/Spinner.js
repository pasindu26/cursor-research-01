// src/components/common/Spinner.js
// Reusable loading spinner component

import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/main.css';

const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  // Determine spinner size
  const spinnerSize = {
    small: { width: '20px', height: '20px' },
    medium: { width: '40px', height: '40px' },
    large: { width: '60px', height: '60px' },
  }[size];

  // Render full-page spinner
  if (fullPage) {
    return (
      <div className="spinner-container" style={{ height: '100vh', background: 'var(--bg-gradient)' }}>
        <div className="text-center text-white">
          <div className="spinner" style={spinnerSize}></div>
          {text && <h2 className="mt-3">{text}</h2>}
          <p>Please wait while we prepare your experience!</p>
        </div>
      </div>
    );
  }

  // Render inline spinner
  return (
    <div className="spinner-container">
      <div className="text-center">
        <div className="spinner" style={spinnerSize}></div>
        {text && <p className="mt-2">{text}</p>}
      </div>
    </div>
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  text: PropTypes.string,
  fullPage: PropTypes.bool,
};

export default Spinner; 