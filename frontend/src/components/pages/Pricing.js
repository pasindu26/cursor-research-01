import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import '../../styles/main.css';

const Pricing = () => {
  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Pricing Plans</h1>
          <p className="lead text-center">
            Choose the plan that fits your needs
          </p>
        </Col>
      </Row>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-light text-center py-3">
              <h3>Basic</h3>
              <div className="display-4">$99</div>
              <div className="text-muted">per month</div>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled">
                <li className="mb-2">✅ Up to 5 monitoring points</li>
                <li className="mb-2">✅ Standard parameters</li>
                <li className="mb-2">✅ Daily data updates</li>
                <li className="mb-2">✅ Basic dashboard</li>
                <li className="mb-2">✅ Email alerts</li>
                <li className="mb-2">✅ 30-day data history</li>
                <li className="mb-2">✅ Email support</li>
              </ul>
            </Card.Body>
            <Card.Footer className="bg-white border-0 text-center pb-4">
              <Button variant="outline-primary" size="lg" className="px-4">
                Get Started
              </Button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow border-primary">
            <Card.Header className="bg-primary text-white text-center py-3">
              <h3>Professional</h3>
              <Badge bg="light" text="primary" className="mb-2">Most Popular</Badge>
              <div className="display-4">$299</div>
              <div className="text-light">per month</div>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled">
                <li className="mb-2">✅ Up to 20 monitoring points</li>
                <li className="mb-2">✅ Advanced parameters</li>
                <li className="mb-2">✅ Hourly data updates</li>
                <li className="mb-2">✅ Advanced dashboard</li>
                <li className="mb-2">✅ Email and SMS alerts</li>
                <li className="mb-2">✅ 1-year data history</li>
                <li className="mb-2">✅ Priority email support</li>
                <li className="mb-2">✅ API access</li>
                <li className="mb-2">✅ Custom reports</li>
              </ul>
            </Card.Body>
            <Card.Footer className="bg-white border-0 text-center pb-4">
              <Button variant="primary" size="lg" className="px-4">
                Get Started
              </Button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-light text-center py-3">
              <h3>Enterprise</h3>
              <div className="display-4">Custom</div>
              <div className="text-muted">contact for pricing</div>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled">
                <li className="mb-2">✅ Unlimited monitoring points</li>
                <li className="mb-2">✅ All parameters</li>
                <li className="mb-2">✅ Real-time data updates</li>
                <li className="mb-2">✅ Custom dashboard</li>
                <li className="mb-2">✅ Advanced alerting system</li>
                <li className="mb-2">✅ Unlimited data history</li>
                <li className="mb-2">✅ 24/7 phone support</li>
                <li className="mb-2">✅ Advanced API access</li>
                <li className="mb-2">✅ Custom integrations</li>
                <li className="mb-2">✅ Dedicated account manager</li>
                <li className="mb-2">✅ On-site training</li>
              </ul>
            </Card.Body>
            <Card.Footer className="bg-white border-0 text-center pb-4">
              <Button variant="outline-primary" size="lg" className="px-4">
                Contact Sales
              </Button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-5">
        <Col lg={8} className="mx-auto text-center">
          <h3>Need a custom solution?</h3>
          <p className="lead">
            We offer tailored solutions for organizations with specific requirements.
            Contact our sales team to discuss your needs.
          </p>
          <Button variant="outline-primary" size="lg" className="mt-3">
            Request a Quote
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default Pricing;
