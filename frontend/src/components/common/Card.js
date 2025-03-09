// src/components/common/Card.js
// Reusable card component

import React from 'react';
import PropTypes from 'prop-types';
import { Card as BootstrapCard } from 'react-bootstrap';
import '../../styles/main.css';

const Card = ({ 
  title, 
  subtitle, 
  children, 
  footer, 
  className = '', 
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  animated = true,
  onClick = null,
}) => {
  // Determine if the card is clickable
  const isClickable = onClick !== null;
  
  // Combine class names
  const cardClassName = `
    ${className} 
    ${animated ? 'fade-in' : ''} 
    ${isClickable ? 'cursor-pointer' : ''}
  `.trim();
  
  return (
    <BootstrapCard 
      className={cardClassName}
      onClick={isClickable ? onClick : undefined}
      style={isClickable ? { cursor: 'pointer' } : undefined}
    >
      {(title || subtitle) && (
        <BootstrapCard.Header className={headerClassName}>
          {title && <BootstrapCard.Title>{title}</BootstrapCard.Title>}
          {subtitle && <BootstrapCard.Subtitle className="text-muted">{subtitle}</BootstrapCard.Subtitle>}
        </BootstrapCard.Header>
      )}
      
      <BootstrapCard.Body className={bodyClassName}>
        {children}
      </BootstrapCard.Body>
      
      {footer && (
        <BootstrapCard.Footer className={footerClassName}>
          {footer}
        </BootstrapCard.Footer>
      )}
    </BootstrapCard>
  );
};

Card.propTypes = {
  title: PropTypes.node,
  subtitle: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  footerClassName: PropTypes.string,
  animated: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Card; 