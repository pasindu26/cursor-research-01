import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { Form, Button, Spinner, Row, Col, Container, Alert, Card } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  Filler,
} from 'chart.js';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import { ThemeContext } from '../../../context/ThemeContext';
import apiService from '../../../utils/api';

import 'react-datepicker/dist/react-datepicker.css';

// Register Chart.js components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip, Filler);

function CompareGraphPage() {
  const [startDate, setStartDate] = useState(moment().subtract(7, 'days').toDate());
  const [endDate, setEndDate] = useState(new Date());
  const [locations, setLocations] = useState([]);
  const [dataType, setDataType] = useState('ph_value');
  const [chartData, setChartData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [loading, setLoading] = useState(false);
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
          
          // If we have locations, pre-select the first one
          if (uniqueLocations.length > 0 && locations.length === 0) {
            setLocations([uniqueLocations[0]]);
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setErrorMessage('Failed to fetch available locations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
  }, [locations.length]);

  const addLocation = useCallback(() => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations(prev => [...prev, locationInput.trim()]);
      setLocationInput('');
      setSuccessMessage(`Added ${locationInput.trim()} to comparison`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  }, [locationInput, locations]);

  const removeLocation = useCallback((location) => {
    setLocations(prev => prev.filter(loc => loc !== location));
  }, []);

  // Add data processing functions
  const processGraphData = useCallback((responseData) => {
    if (!responseData) {
      throw new Error('No data received from server');
    }

    // Handle different response formats
    if (Array.isArray(responseData)) {
      return responseData;
    }
    
    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    
    if (typeof responseData === "object") {
      return Object.entries(responseData).map(([location, data]) => ({
        location,
        data: Array.isArray(data) ? data : 
              Array.isArray(data.data) ? data.data :
              Object.entries(data).map(([date, value]) => ({
                date,
                value: parseFloat(value)
              }))
      }));
    }
    
    throw new Error('Unsupported data format received from server');
  }, []);

  const createDatasets = useCallback((graphData, sortedDates) => {
    return graphData.map((locationData, index) => {
      if (!Array.isArray(locationData.data)) {
        console.warn(`Invalid data format for location ${locationData.location}`);
        return null;
      }

      // Create a map of date to value for easy lookup
      const dateValueMap = locationData.data.reduce((acc, entry) => {
        if (entry?.date && entry?.value !== undefined) {
          acc[entry.date] = parseFloat(entry.value);
        }
        return acc;
      }, {});

      return {
        label: locationData.location,
        data: sortedDates.map(date => dateValueMap[date] ?? null),
        borderColor: getColor(index),
        backgroundColor: getColor(index, 0.2),
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        borderWidth: 2,
        pointHoverRadius: 6,
      };
    }).filter(Boolean); // Remove null datasets
  }, []);

  const fetchGraphData = useCallback(async () => {
    if (!startDate || !endDate || locations.length === 0) {
      setErrorMessage('Please provide start date, end date, and at least one location.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const params = {
        startDate: moment(startDate).format('YYYY-MM-DD'),
        endDate: moment(endDate).format('YYYY-MM-DD'),
        locations: locations.join(','),
        dataType,
      };

      console.log('Fetching data with params:', params);
      const response = await apiService.graphs.getCompareGraphData(params);
      console.log('Raw response:', response);

      const graphData = processGraphData(response.data);
      console.log('Processed graph data:', graphData);

      // Extract all unique dates
      const allDates = new Set();
      graphData.forEach(locationData => {
        if (Array.isArray(locationData.data)) {
          locationData.data.forEach(entry => {
            if (entry?.date) allDates.add(entry.date);
          });
        }
      });

      if (allDates.size === 0) {
        throw new Error('No data found for the selected parameters. Try different dates or locations.');
      }

      // Sort dates chronologically
      const sortedDates = Array.from(allDates).sort();

      // Create datasets for each location
      const datasets = createDatasets(graphData, sortedDates);

      if (datasets.length === 0) {
        throw new Error('No valid data available for the selected parameters');
      }

      setChartData({
        labels: sortedDates,
        datasets,
      });
      
      setSuccessMessage('Graph data loaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error in fetchGraphData:', error);
      setErrorMessage(error.message || 'Failed to fetch comparison data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, locations, dataType, processGraphData, createDatasets]);

  const getDataTypeLabel = useCallback((type) => {
    switch (type) {
      case 'ph_value':
        return 'pH Values';
      case 'temperature':
        return 'Temperature';
      case 'turbidity':
        return 'Turbidity';
      default:
        return '';
    }
  }, []);

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
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
              
              if (dataType === 'temperature') {
                label += ' °C';
              } else if (dataType === 'turbidity') {
                label += ' NTU';
              }
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        title: { 
          display: true, 
          text: 'Date', 
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
          text: getYAxisLabel(dataType),
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
  }), [theme, dataType, getYAxisLabel]);

  // Add custom styles for dark mode
  const getInputStyles = useCallback(() => ({
    backgroundColor: theme === 'dark' ? '#2b3035' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    borderColor: theme === 'dark' ? '#495057' : '#ced4da',
  }), [theme]);

  // Effect to fetch data when component mounts if locations are available
  useEffect(() => {
    if (locations.length > 0 && startDate && endDate) {
      fetchGraphData();
    }
  }, [locations, startDate, endDate, fetchGraphData]);

  return (
    <Container fluid className={`py-4 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'}`}>
        <Card.Body>
          <h2 className="text-center mb-4">Compare Values Across Locations</h2>
          
          {errorMessage && (
            <Alert variant="danger" onClose={() => setErrorMessage('')} dismissible>
              {errorMessage}
            </Alert>
          )}
          
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
              {successMessage}
            </Alert>
          )}

          <Form className="mb-4 p-4 rounded" style={{ backgroundColor: theme === 'dark' ? '#343a40' : '#f8f9fa' }}>
            <Row className="mb-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="form-control"
                    placeholderText="Select start date"
                    style={getInputStyles()}
                    calendarClassName={theme === 'dark' ? 'dark-calendar' : ''}
                    wrapperClassName={theme === 'dark' ? 'dark-calendar-wrapper' : ''}
                    maxDate={endDate || new Date()}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="form-control"
                    placeholderText="Select end date"
                    style={getInputStyles()}
                    calendarClassName={theme === 'dark' ? 'dark-calendar' : ''}
                    wrapperClassName={theme === 'dark' ? 'dark-calendar-wrapper' : ''}
                    minDate={startDate}
                    maxDate={new Date()}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  {availableLocations.length > 0 ? (
                    <Form.Control
                      as="select"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
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
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      style={getInputStyles()}
                    />
                  )}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Data Type</Form.Label>
                  <Form.Control 
                    as="select" 
                    value={dataType} 
                    onChange={(e) => setDataType(e.target.value)}
                    style={getInputStyles()}
                  >
                    <option value="ph_value">pH Value</option>
                    <option value="temperature">Temperature</option>
                    <option value="turbidity">Turbidity</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            {/* Add Location Button */}
            <Row className="mb-3">
              <Col md={3}>
                <Button 
                  variant={theme === 'dark' ? 'outline-light' : 'outline-dark'} 
                  onClick={addLocation} 
                  className="w-100 mt-2"
                  disabled={!locationInput}
                >
                  Add Location
                </Button>
              </Col>
              <Col md={9}>
                <Button 
                  variant="primary" 
                  onClick={fetchGraphData} 
                  disabled={loading || locations.length === 0}
                  className="w-100 mt-2"
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading...
                    </>
                  ) : (
                    'Generate Comparison Graph'
                  )}
                </Button>
              </Col>
            </Row>

            {/* List of Locations */}
            {locations.length > 0 && (
              <div className="mb-3 p-3 rounded" style={{ backgroundColor: theme === 'dark' ? '#212529' : '#e9ecef' }}>
                <h5>Selected Locations:</h5>
                <div className="d-flex flex-wrap">
                  {locations.map((loc, index) => (
                    <div key={index} className="me-2 mb-2 p-2 rounded d-flex align-items-center" 
                         style={{ 
                           backgroundColor: theme === 'dark' ? '#495057' : '#dee2e6',
                           borderLeft: `4px solid ${getColor(index)}` 
                         }}>
                      <span className="me-2">{loc}</span>
                      <Button variant="danger" size="sm" onClick={() => removeLocation(loc)}>
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <h4 className="text-center mb-3">{getDataTypeLabel(dataType)} Comparison</h4>
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
                  <p>Select date range, locations, and data type, then click "Generate Comparison Graph"</p>
                </>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

// Move helper functions outside component
const getYAxisLabel = (dataType) => {
  const labels = {
    ph_value: 'pH Value',
    temperature: 'Temperature (°C)',
    turbidity: 'Turbidity (NTU)',
  };
  return labels[dataType] || '';
};

const getColor = (index, opacity = 1) => {
  const colors = [
    `rgba(75, 192, 192, ${opacity})`,
    `rgba(255, 99, 132, ${opacity})`,
    `rgba(54, 162, 235, ${opacity})`,
    `rgba(255, 206, 86, ${opacity})`,
    `rgba(153, 102, 255, ${opacity})`,
    `rgba(255, 159, 64, ${opacity})`,
    `rgba(201, 203, 207, ${opacity})`,
    `rgba(255, 205, 86, ${opacity})`,
    `rgba(75, 192, 192, ${opacity})`,
    `rgba(54, 162, 235, ${opacity})`,
  ];
  return colors[index % colors.length];
};

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

export default CompareGraphPage;
