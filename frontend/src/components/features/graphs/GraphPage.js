import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert, Card } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'react-datepicker/dist/react-datepicker.css';
import { ThemeContext } from '../../../context/ThemeContext';
import apiService from '../../../utils/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function GraphPage() {
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableLocations, setAvailableLocations] = useState([]);
  const { theme } = useContext(ThemeContext);

  // Fetch available locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await apiService.data.getSensorData();
        if (response.data && response.data.data) {
          // Extract unique locations
          const uniqueLocations = [...new Set(response.data.data.map(item => item.location))];
          setAvailableLocations(uniqueLocations);
          
          // If we have locations and no location is selected, pre-select the first one
          if (uniqueLocations.length > 0 && !location) {
            setLocation(uniqueLocations[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setError('Failed to fetch available locations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
  }, [location]);

  const fetchGraphData = useCallback(async () => {
    if (!date || !location) {
      setError('Please select both date and location');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      
      const params = {
        date: formattedDate,
        location: location
      };
      
      console.log('Fetching graph data with params:', params);
      const response = await apiService.graphs.getGraphData(params);
      console.log('Graph data response:', response);
      
      if (!response.data || !response.data.ph_values || !response.data.temperature_values || !response.data.turbidity_values) {
        throw new Error('Invalid data format received from server');
      }
      
      // Process the data for the chart
      const labels = response.data.timestamps || response.data.times || [];
      
      if (labels.length === 0) {
        throw new Error('No data available for the selected date and location');
      }
      
      const datasets = [
        {
          label: 'pH Value',
          data: response.data.ph_values,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Temperature (°C)',
          data: response.data.temperature_values,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Turbidity (NTU)',
          data: response.data.turbidity_values,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        }
      ];
      
      setChartData({
        labels,
        datasets
      });
      
      setSuccess('Graph data loaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error fetching graph data:', error);
      setError(error.message || 'Failed to fetch graph data. Please try again later.');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  }, [date, location]);

  // Effect to fetch data when component mounts if location is available
  useEffect(() => {
    if (location && date) {
      fetchGraphData();
    }
  }, [location, date, fetchGraphData]);

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
        mode: 'index', 
        intersect: false,
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: theme === 'dark' ? '#FFF' : '#000',
        bodyColor: theme === 'dark' ? '#FFF' : '#000',
        borderColor: theme === 'dark' ? '#555' : '#ddd',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
      title: {
        display: true,
        text: `Sensor Data for ${location} on ${moment(date).format('YYYY-MM-DD')}`,
        color: theme === 'dark' ? '#FFF' : '#000',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        title: { 
          display: true, 
          text: 'Time', 
          color: theme === 'dark' ? '#FFF' : '#000',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: { 
          color: theme === 'dark' ? '#FFF' : '#000',
          maxRotation: 45,
          minRotation: 45
        },
        grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
      },
      y: {
        title: {
          display: true,
          text: 'Value',
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
    interaction: {
      mode: 'index',
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.4
      }
    }
  }), [theme, location, date]);

  // Add custom styles for dark mode
  const getInputStyles = useCallback(() => ({
    backgroundColor: theme === 'dark' ? '#2b3035' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    borderColor: theme === 'dark' ? '#495057' : '#ced4da',
  }), [theme]);

  return (
    <Container fluid className={`py-4 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'}`}>
        <Card.Body>
          <h2 className="text-center mb-4">Daily Sensor Data Graph</h2>
          
          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" onClose={() => setSuccess('')} dismissible>
              {success}
            </Alert>
          )}
          
          <Form className="mb-4 p-4 rounded" style={{ backgroundColor: theme === 'dark' ? '#343a40' : '#f8f9fa' }}>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <DatePicker
                    selected={date}
                    onChange={(date) => setDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="form-control"
                    placeholderText="Select date"
                    maxDate={new Date()}
                    style={getInputStyles()}
                    calendarClassName={theme === 'dark' ? 'dark-calendar' : ''}
                    wrapperClassName={theme === 'dark' ? 'dark-calendar-wrapper' : ''}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  {availableLocations.length > 0 ? (
                    <Form.Control
                      as="select"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={getInputStyles()}
                    >
                      <option value="">Select a location</option>
                      {availableLocations.map((loc, index) => (
                        <option key={index} value={loc}>{loc}</option>
                      ))}
                    </Form.Control>
                  ) : (
                    <Form.Control
                      type="text"
                      placeholder="Enter location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={getInputStyles()}
                    />
                  )}
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button
                  variant="primary"
                  onClick={fetchGraphData}
                  disabled={loading || !date || !location}
                  className="w-100"
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading...
                    </>
                  ) : (
                    'Generate Graph'
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
          
          {/* Graph Section */}
          {chartData ? (
            <div className="mt-4 p-3 rounded" style={{ 
              height: '70vh', 
              width: '100%', 
              margin: '0 auto',
              backgroundColor: theme === 'dark' ? '#343a40' : '#f8f9fa',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <Line
                data={chartData}
                options={chartOptions}
              />
            </div>
          ) : (
            <div className="text-center mt-5 p-5 rounded" style={{ 
              backgroundColor: theme === 'dark' ? '#343a40' : '#f8f9fa',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              {loading ? (
                <div>
                  <Spinner animation="border" role="status" />
                  <h4 className="mt-3">Loading graph data...</h4>
                </div>
              ) : (
                <>
                  <h4>No graph data available</h4>
                  <p>Select date and location, then click "Generate Graph"</p>
                </>
              )}
            </div>
          )}
          
          {chartData && (
            <div className="mt-3 text-center">
              <p className="text-muted">
                <small>
                  Showing data for {location} on {moment(date).format('MMMM D, YYYY')}
                </small>
              </p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

// Add these styles to your CSS file (e.g., src/styles/main.css)
const styles = `
.dark-calendar {
  background-color: #2b3035 !important;
  color: #fff !important;
  border-color: #495057 !important;
}

.dark-calendar .react-datepicker__header {
  background-color: #343a40 !important;
  color: #fff !important;
  border-bottom-color: #495057 !important;
}

.dark-calendar .react-datepicker__current-month,
.dark-calendar .react-datepicker__day-name,
.dark-calendar .react-datepicker__day {
  color: #fff !important;
}

.dark-calendar .react-datepicker__day:hover {
  background-color: #495057 !important;
}

.dark-calendar .react-datepicker__day--selected {
  background-color: #0d6efd !important;
}

.dark-calendar .react-datepicker__day--keyboard-selected {
  background-color: #0d6efd !important;
}

.dark-calendar .react-datepicker__input-container input {
  background-color: #2b3035 !important;
  color: #fff !important;
  border-color: #495057 !important;
}

.dark-calendar-wrapper .react-datepicker__triangle {
  border-bottom-color: #343a40 !important;
}

.dark-calendar-wrapper .react-datepicker__triangle::before {
  border-bottom-color: #495057 !important;
}
`;

// Add the styles to the document
const styleSheet = document.createElement('style');
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default GraphPage;
