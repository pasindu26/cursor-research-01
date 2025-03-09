import React from 'react';
import { Container, Row, Col, Card, Accordion } from 'react-bootstrap';
import '../../styles/main.css';

const FAQs = () => {
  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Frequently Asked Questions</h1>
          <p className="lead text-center">
            Find answers to common questions about Water360
          </p>
        </Col>
      </Row>
      
      <Row>
        <Col lg={8} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Body>
              <Accordion defaultActiveKey="0">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>What is Water360?</Accordion.Header>
                  <Accordion.Body>
                    Water360 is a comprehensive water quality monitoring and analysis solution that provides
                    real-time data on water quality parameters. Our platform helps organizations make informed
                    decisions about water management and conservation.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="1">
                  <Accordion.Header>How does Water360 work?</Accordion.Header>
                  <Accordion.Body>
                    Water360 uses a network of sensors to collect data on various water quality parameters.
                    This data is transmitted to our cloud platform, where it is analyzed and presented in
                    easy-to-understand dashboards. Users can access this information through our web application
                    and receive alerts when parameters exceed predefined thresholds.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="2">
                  <Accordion.Header>What parameters does Water360 monitor?</Accordion.Header>
                  <Accordion.Body>
                    Water360 monitors a wide range of water quality parameters, including pH, temperature,
                    dissolved oxygen, turbidity, conductivity, and various contaminants. The specific parameters
                    monitored can be customized based on your needs.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="3">
                  <Accordion.Header>How accurate is the data?</Accordion.Header>
                  <Accordion.Body>
                    Water360 uses high-precision sensors that provide accurate measurements within industry
                    standards. Our sensors are regularly calibrated and maintained to ensure data reliability.
                    The accuracy specifications vary by parameter, but typically fall within ±2% of the actual value.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="4">
                  <Accordion.Header>Can Water360 integrate with existing systems?</Accordion.Header>
                  <Accordion.Body>
                    Yes, Water360 is designed to integrate seamlessly with existing water management systems.
                    We provide APIs and connectors for common platforms, and our team can work with you to
                    develop custom integrations if needed.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="5">
                  <Accordion.Header>How is the data secured?</Accordion.Header>
                  <Accordion.Body>
                    Water360 takes data security seriously. All data is encrypted during transmission and storage,
                    and our platform is hosted in secure, SOC 2 compliant data centers. We implement role-based
                    access controls and regular security audits to protect your data.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="6">
                  <Accordion.Header>What support options are available?</Accordion.Header>
                  <Accordion.Body>
                    Water360 offers various support options, including email support, phone support, and
                    dedicated account management for enterprise customers. Our support team is available
                    during business hours, and emergency support is available 24/7 for critical issues.
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-5">
        <Col className="text-center">
          <h3>Still have questions?</h3>
          <p>Contact our support team for assistance</p>
          <a href="mailto:support@water360.com" className="btn btn-primary">
            Contact Support
          </a>
        </Col>
      </Row>
    </Container>
  );
};

export default FAQs;
