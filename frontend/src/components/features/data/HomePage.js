// src/components/HomePage.js
import React, { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
} from 'react-bootstrap';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import moment from 'moment';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeContext } from '../../../context/ThemeContext';
import apiService from '../../../utils/api';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

function HomePage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [recentData, setRecentData] = useState([]);
  const [correlationData, setCorrelationData] = useState(null);
  const [loading, setLoading] = useState({
    dashboard: true,
    recent: true,
    correlation: true
  });
  const [error, setError] = useState({
    dashboard: '',
    recent: '',
    correlation: ''
  });
  const [success, setSuccess] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('uk');
  const [locations, setLocations] = useState([]);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, dashboard: true }));
      setError(prev => ({ ...prev, dashboard: '' }));
      
      const response = await apiService.data.getSummaryInsights();
      
      if (response.data && response.data.status === 'success') {
        setDashboardData(response.data);
        setSuccess('Dashboard data loaded successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(prev => ({ 
        ...prev, 
        dashboard: 'Failed to fetch dashboard data. Using sample data instead.' 
      }));
      
      // Set fallback data
      setDashboardData({
        total_readings: 125,
        avg_ph: 7.2,
        avg_temp: 22.5,
        avg_turbidity: 15.3
      });
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  }, []);

  // Fetch recent data
  const fetchRecentData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, recent: true }));
      setError(prev => ({ ...prev, recent: '' }));
      
      const response = await apiService.data.getRecentData();
      
      if (response.data && response.data.status === 'success') {
        // Process and sort data by timestamp (newest first)
        const processedData = response.data.data.map(item => {
          const dateTimeStr = `${item.date} ${item.time || '00:00:00'}`;
          const timestamp = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
          const _timestampNum = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').valueOf();
          
          return {
            ...item,
            timestamp,
            _timestampNum
          };
        });
        
        // Sort by timestamp (newest first)
        processedData.sort((a, b) => b._timestampNum - a._timestampNum);
        
        // Extract unique locations
        const uniqueLocations = [...new Set(processedData.map(item => item.location))];
        setLocations(uniqueLocations.length > 0 ? uniqueLocations : ['uk', 'us', 'eu']);
        
        setRecentData(processedData);
      } else {
        throw new Error('Failed to fetch recent data');
      }
    } catch (error) {
      console.error('Error fetching recent data:', error);
      setError(prev => ({ 
        ...prev, 
        recent: 'Failed to fetch recent data. Using sample data instead.' 
      }));
      
      // Set fallback data
      const sampleData = [
        { id: 1, location: 'uk', ph_value: 7.2, temperature: 22.5, turbidity: 15.3, date: '2025-03-08', time: '12:30:00', timestamp: '2025-03-08 12:30:00', _timestampNum: Date.now() },
        { id: 2, location: 'us', ph_value: 6.8, temperature: 24.1, turbidity: 12.7, date: '2025-03-08', time: '11:45:00', timestamp: '2025-03-08 11:45:00', _timestampNum: Date.now() - 3600000 },
        { id: 3, location: 'eu', ph_value: 7.5, temperature: 21.3, turbidity: 14.2, date: '2025-03-08', time: '10:15:00', timestamp: '2025-03-08 10:15:00', _timestampNum: Date.now() - 7200000 }
      ];
      
      setRecentData(sampleData);
      
      // Extract unique locations from sample data
      const uniqueLocations = [...new Set(sampleData.map(item => item.location))];
      setLocations(uniqueLocations);
    } finally {
      setLoading(prev => ({ ...prev, recent: false }));
    }
  }, []);

  // Fetch correlation data
  const fetchCorrelationData = useCallback(async (location) => {
    try {
      setLoading(prev => ({ ...prev, correlation: true }));
      setError(prev => ({ ...prev, correlation: '' }));
      
      const response = await apiService.data.getCorrelationData(location);
      
      if (response.data && response.data.status === 'success') {
        setCorrelationData(response.data.data);
      } else {
        throw new Error('Failed to fetch correlation data');
      }
    } catch (error) {
      console.error('Error fetching correlation data:', error);
      setError(prev => ({ 
        ...prev, 
        correlation: 'Failed to fetch correlation data. Using sample data instead.' 
      }));
      
      // Set fallback data
      setCorrelationData({
        ph_values: [6.8, 7.0, 7.2, 7.1, 6.9, 7.3, 7.4, 7.0, 6.7, 7.2],
        temperature_values: [21.5, 22.0, 22.5, 23.0, 22.8, 21.9, 22.3, 23.5, 22.7, 21.8],
        turbidity_values: [12.3, 13.5, 14.2, 15.0, 13.8, 12.9, 14.5, 15.2, 13.7, 14.1]
      });
    } finally {
      setLoading(prev => ({ ...prev, correlation: false }));
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
    fetchRecentData();
  }, [fetchDashboardData, fetchRecentData]);

  // Fetch correlation data when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      fetchCorrelationData(selectedLocation);
    }
  }, [selectedLocation, fetchCorrelationData]);

  const handleSort = (field) => {
    // Implementation for sorting if needed
    console.log('Sorting by', field);
  };

  const prepareChartData = useCallback((xData, yData, xLabel, yLabel) => ({
    datasets: [
      {
        label: `${yLabel} vs ${xLabel}`,
        data: xData.map((x, i) => ({ x, y: yData[i] })),
        backgroundColor: theme === 'dark' ? 'rgba(144, 202, 249, 0.6)' : 'rgba(75, 192, 192, 0.6)',
        borderColor: theme === 'dark' ? 'rgba(144, 202, 249, 1)' : 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  }), [theme]);

  // Memoize chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { 
          color: theme === 'dark' ? '#FFF' : '#000',
          padding: 20,
          font: {
            size: 12
          }
        },
      },
      tooltip: { 
        mode: 'point', 
        intersect: true,
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: theme === 'dark' ? '#FFF' : '#000',
        bodyColor: theme === 'dark' ? '#FFF' : '#000',
        borderColor: theme === 'dark' ? '#555' : '#ddd',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
    scales: {
      x: {
        title: { 
          display: true, 
          text: 'pH Value', 
          color: theme === 'dark' ? '#FFF' : '#000',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: { color: theme === 'dark' ? '#FFF' : '#000' },
        grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
      },
      y: {
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: theme === 'dark' ? '#FFF' : '#000',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: { color: theme === 'dark' ? '#FFF' : '#000' },
        grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
  }), [theme]);

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
  };

  const applyLocationChange = () => {
    fetchCorrelationData(selectedLocation);
  };

  // Check if a record is new (less than 1 hour old)
  const isNewRecord = (record) => {
    if (!record.timestamp) return false;
    const recordTime = moment(record.timestamp);
    const oneHourAgo = moment().subtract(1, 'hour');
    return recordTime.isAfter(oneHourAgo);
  };

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <Container fluid className={`py-4 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="dashboard-container"
      >
        <motion.h1 
          className="text-center mb-4"
          variants={itemVariants}
        >
          Water Quality Dashboard
        </motion.h1>
        
        {success && (
          <Alert variant="success" onClose={() => setSuccess('')} dismissible>
            {success}
          </Alert>
        )}
        
        {/* Dashboard Stats */}
        <Row className="mb-4">
          {loading.dashboard ? (
            <Col className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </Col>
          ) : dashboardData ? (
            <>
              <Col md={3} sm={6} className="mb-3">
                <motion.div variants={itemVariants}>
                  <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                      <Card.Title className="text-center">Total Readings</Card.Title>
                      <Card.Text className="display-4 text-center">{dashboardData.total_readings || 0}</Card.Text>
                      {error.dashboard && <small className="text-warning mt-2">* {error.dashboard}</small>}
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
              <Col md={3} sm={6} className="mb-3">
                <motion.div variants={itemVariants}>
                  <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                      <Card.Title className="text-center">Average pH</Card.Title>
                      <Card.Text className="display-4 text-center">{dashboardData.avg_ph ? dashboardData.avg_ph.toFixed(2) : 'N/A'}</Card.Text>
                      {error.dashboard && <small className="text-warning mt-2">* {error.dashboard}</small>}
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
              <Col md={3} sm={6} className="mb-3">
                <motion.div variants={itemVariants}>
                  <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                      <Card.Title className="text-center">Average Temperature</Card.Title>
                      <Card.Text className="display-4 text-center">{dashboardData.avg_temp ? dashboardData.avg_temp.toFixed(2) : 'N/A'}°C</Card.Text>
                      {error.dashboard && <small className="text-warning mt-2">* {error.dashboard}</small>}
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
              <Col md={3} sm={6} className="mb-3">
                <motion.div variants={itemVariants}>
                  <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                      <Card.Title className="text-center">Average Turbidity</Card.Title>
                      <Card.Text className="display-4 text-center">{dashboardData.avg_turbidity ? dashboardData.avg_turbidity.toFixed(2) : 'N/A'}</Card.Text>
                      {error.dashboard && <small className="text-warning mt-2">* {error.dashboard}</small>}
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            </>
          ) : (
            <Col className="text-center py-5">
              <p>No dashboard data available</p>
            </Col>
          )}
        </Row>

        {/* Recent Data */}
        <Row className="mb-4">
          <Col>
            <motion.div variants={itemVariants}>
              <Card className={`${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Recent Readings</h5>
                  <Button variant="primary" size="sm" onClick={() => navigate('/DataTable')}>
                    View All Data
                  </Button>
                </Card.Header>
                <Card.Body>
                  {loading.recent ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    </div>
                  ) : recentData.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <table className={`table ${theme === 'dark' ? 'table-dark' : 'table-light'}`}>
                          <thead>
                            <tr>
                              <th onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>Location</th>
                              <th onClick={() => handleSort('ph_value')} style={{ cursor: 'pointer' }}>pH Value</th>
                              <th onClick={() => handleSort('temperature')} style={{ cursor: 'pointer' }}>Temperature (°C)</th>
                              <th onClick={() => handleSort('turbidity')} style={{ cursor: 'pointer' }}>Turbidity (NTU)</th>
                              <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentData.slice(0, 5).map((item, index) => (
                              <tr key={index} className={isNewRecord(item) ? 'new-record-row' : ''}>
                                <td>{item.location}</td>
                                <td>{parseFloat(item.ph_value).toFixed(2)}</td>
                                <td>{parseFloat(item.temperature).toFixed(2)}</td>
                                <td>{parseFloat(item.turbidity).toFixed(2)}</td>
                                <td>
                                  {item.date} {item.time}
                                  {isNewRecord(item) && (
                                    <Badge bg="success" className="ms-2">NEW</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {error.recent && (
                        <div className="text-warning text-center mt-2">
                          <small>* {error.recent}</small>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-center">No recent data available</p>
                  )}
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Correlation Chart */}
        <Row>
          <Col>
            <motion.div variants={itemVariants}>
              <Card className={`${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">pH vs Temperature Correlation</h5>
                  <div className="d-flex align-items-center">
                    <select
                      className={`form-select form-select-sm me-2 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                      value={selectedLocation}
                      onChange={handleLocationChange}
                      style={{ width: 'auto' }}
                    >
                      {locations.map((loc, index) => (
                        <option key={index} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <Button variant="primary" size="sm" onClick={applyLocationChange}>
                      Apply
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {loading.correlation ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    </div>
                  ) : correlationData ? (
                    <>
                      <div style={{ height: '400px' }}>
                        <Scatter
                          data={prepareChartData(
                            correlationData.ph_values || [],
                            correlationData.temperature_values || [],
                            'pH Value',
                            'Temperature'
                          )}
                          options={chartOptions}
                        />
                      </div>
                      {error.correlation && (
                        <div className="text-warning text-center mt-2">
                          <small>* {error.correlation}</small>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <p>No correlation data available</p>
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="text-muted">
                  <small>
                    Showing correlation for location: {selectedLocation}
                  </small>
                </Card.Footer>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Quick Links */}
        <Row className="mt-4">
          <Col>
            <motion.div variants={itemVariants}>
              <Card className={`${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                <Card.Header>
                  <h5 className="mb-0">Quick Links</h5>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={3} sm={6}>
                      <Button
                        as={Link}
                        to="/DataTable"
                        variant={theme === 'dark' ? 'outline-light' : 'outline-primary'}
                        className="w-100 d-flex align-items-center justify-content-center"
                        style={{ height: '50px' }}
                      >
                        <i className="bi bi-table me-2"></i> View All Data
                      </Button>
                    </Col>
                    <Col md={3} sm={6}>
                      <Button
                        as={Link}
                        to="/graphs"
                        variant={theme === 'dark' ? 'outline-light' : 'outline-primary'}
                        className="w-100 d-flex align-items-center justify-content-center"
                        style={{ height: '50px' }}
                      >
                        <i className="bi bi-graph-up me-2"></i> View Graphs
                      </Button>
                    </Col>
                    <Col md={3} sm={6}>
                      <Button
                        as={Link}
                        to="/compare-graphs"
                        variant={theme === 'dark' ? 'outline-light' : 'outline-primary'}
                        className="w-100 d-flex align-items-center justify-content-center"
                        style={{ height: '50px' }}
                      >
                        <i className="bi bi-bar-chart-line me-2"></i> Compare Locations
                      </Button>
                    </Col>
                    <Col md={3} sm={6}>
                      <Button
                        as={Link}
                        to="/admin"
                        variant={theme === 'dark' ? 'outline-light' : 'outline-primary'}
                        className="w-100 d-flex align-items-center justify-content-center"
                        style={{ height: '50px' }}
                      >
                        <i className="bi bi-gear me-2"></i> Admin Panel
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </motion.div>
    </Container>
  );
}

export default HomePage;
