import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import '../../styles/main.css';

const About = () => {
  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">About Water360</h1>
          <p className="lead text-center">
            Comprehensive water quality monitoring and analysis solution
          </p>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col lg={8} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Body>
              <h2>Our Mission</h2>
              <p>
                At Water360, we are dedicated to providing accurate, real-time water quality monitoring solutions
                that help organizations make informed decisions about water management and conservation.
              </p>
              
              <h2 className="mt-4">Our Story</h2>
              <p>
                Founded in 2020, Water360 emerged from a need for more accessible and comprehensive water quality
                data. Our team of environmental scientists and software engineers came together to create a
                platform that makes water quality monitoring simple, accurate, and actionable.
              </p>
              
              <h2 className="mt-4">Our Technology</h2>
              <p>
                We combine cutting-edge sensor technology with advanced data analytics to provide real-time
                insights into water quality. Our platform integrates seamlessly with existing infrastructure
                and provides customizable dashboards and alerts to keep you informed.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <h2 className="text-center">Our Team</h2>
        </Col>
      </Row>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="rounded-circle bg-light mx-auto mb-3" style={{ width: '120px', height: '120px' }}></div>
              <h4>John Doe</h4>
              <p className="text-muted">CEO & Founder</p>
              <p>Environmental scientist with over 15 years of experience in water quality management..</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="rounded-circle bg-light mx-auto mb-3" style={{ width: '120px', height: '120px' }}></div>
              <h4>Jane Smith</h4>
              <p className="text-muted">CTO</p>
              <p>Software engineer specializing in IoT and data analytics for environmental applications.</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="rounded-circle bg-light mx-auto mb-3" style={{ width: '120px', height: '120px' }}></div>
              <h4>Michael Johnson</h4>
              <p className="text-muted">Head of Research</p>
              <p>PhD in Environmental Engineering with a focus on water quality monitoring systems.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default About;
