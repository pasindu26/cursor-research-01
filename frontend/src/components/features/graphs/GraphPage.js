import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert, Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'react-datepicker/dist/react-datepicker.css';
import { ThemeContext } from '../../../context/ThemeContext';
import apiService from '../../../utils/api';
import { motion } from 'framer-motion';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
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
  const [selectedDataType, setSelectedDataType] = useState('all'); // 'all', 'ph', 'temperature', 'turbidity'
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
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
  }, []);

  // Fetch available dates when location changes
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!location) return;
      
      try {
        setLoadingDates(true);
        const response = await apiService.data.getAvailableDates(location);
        if (response.data && response.data.status === 'success' && response.data.dates) {
          setAvailableDates(response.data.dates);
          
          // If we have dates and the current selected date is not in the list,
          // pre-select the first available date
          if (response.data.dates.length > 0) {
            const currentDateStr = moment(date).format('YYYY-MM-DD');
            if (!response.data.dates.includes(currentDateStr)) {
              setDate(new Date(response.data.dates[0]));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching available dates:', error);
        setAvailableDates([]);
      } finally {
        setLoadingDates(false);
      }
    };
    
    fetchAvailableDates();
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
      
      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'No data available for the selected date and location');
      }
      
      if (!response.data.ph_values || !response.data.temperature_values || !response.data.turbidity_values) {
        throw new Error('Invalid data format received from server');
      }
      
      // Process the data for the chart
      const labels = response.data.timestamps || response.data.times || [];
      
      if (labels.length === 0) {
        throw new Error('No data available for the selected date and location');
      }
      
      // Create datasets based on selected data type
      let datasets = [];
      
      if (selectedDataType === 'all' || selectedDataType === 'ph') {
        datasets.push({
          label: 'pH Value',
          data: response.data.ph_values,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          yAxisID: 'y',
        });
      }
      
      if (selectedDataType === 'all' || selectedDataType === 'temperature') {
        datasets.push({
          label: 'Temperature (°C)',
          data: response.data.temperature_values,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          yAxisID: selectedDataType === 'all' ? 'y1' : 'y',
        });
      }
      
      if (selectedDataType === 'all' || selectedDataType === 'turbidity') {
        datasets.push({
          label: 'Turbidity (NTU)',
          data: response.data.turbidity_values,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          yAxisID: selectedDataType === 'all' ? 'y2' : 'y',
        });
      }

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
      
      // Show a more user-friendly error message
      if (error.message.includes('No data')) {
        setError(`No data available for ${location} on ${moment(date).format('MMMM D, YYYY')}. Please select a different date.`);
      }
    } finally {
      setLoading(false);
    }
  }, [date, location, selectedDataType]);

  // Effect to fetch data when component mounts if location is available
  useEffect(() => {
    if (location && date) {
      fetchGraphData();
    }
  }, [location, date, fetchGraphData]);

  // Get y-axis label based on selected data type
  const getYAxisLabel = useCallback((dataType) => {
    switch (dataType) {
      case 'ph':
        return 'pH Value';
      case 'temperature':
        return 'Temperature (°C)';
      case 'turbidity':
        return 'Turbidity (NTU)';
      default:
        return '';
    }
  }, []);

  // Memoize chart options
  const chartOptions = useMemo(() => {
    const options = {
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
                
                if (label.includes('Temperature')) {
                  label += ' °C';
                } else if (label.includes('Turbidity')) {
                  label += ' NTU';
                }
              }
              return label;
            }
          }
        },
        title: {
          display: true,
          text: `Water Quality Data for ${location} on ${moment(date).format('YYYY-MM-DD')}`,
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
          type: 'linear',
          display: true,
          position: 'left',
                    title: {
                      display: true,
            text: selectedDataType === 'all' ? 'pH Value' : getYAxisLabel(selectedDataType),
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
    };
    
    // Add additional y-axes for multi-parameter view
    if (selectedDataType === 'all') {
      options.scales.y1 = {
        type: 'linear',
        display: true,
        position: 'right',
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
        grid: {
          drawOnChartArea: false,
        },
      };
      
      options.scales.y2 = {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Turbidity (NTU)',
          color: theme === 'dark' ? '#FFF' : '#000',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: { color: theme === 'dark' ? '#FFF' : '#000' },
        grid: {
          drawOnChartArea: false,
        },
      };
    }
    
    return options;
  }, [theme, date, location, selectedDataType, getYAxisLabel]);

  // Get input styles based on theme
  const getInputStyles = useCallback(() => ({
    backgroundColor: theme === 'dark' ? '#2b3035' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    borderColor: theme === 'dark' ? '#495057' : '#ced4da',
  }), [theme]);

  return (
    <Container fluid className="py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className={`shadow-sm mb-4 ${theme === 'dark' ? 'bg-dark text-white' : ''}`}>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Water Quality Graph
            </h4>
            {loading && (
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            )}
          </Card.Header>
          <Card.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                <i className="bi bi-check-circle-fill me-2"></i>
                {success}
              </Alert>
            )}
            
            <Row className="mb-4">
              <Col md={4} className="mb-3 mb-md-0">
                <Form.Group>
                  <Form.Label>
                    <i className="bi bi-geo-alt me-2"></i>
                    Select Location
                  </Form.Label>
                  <Form.Select 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    style={getInputStyles()}
                    disabled={availableLocations.length === 0}
                  >
                    {availableLocations.length === 0 ? (
                      <option value="">Loading locations...</option>
                    ) : (
                      <>
                        <option value="">Select a location</option>
                        {availableLocations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc.toUpperCase()}
                          </option>
                        ))}
                      </>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={4} className="mb-3 mb-md-0">
                <Form.Group>
                  <Form.Label>
                    <i className="bi bi-calendar-date me-2"></i>
                    Select Date
                  </Form.Label>
                  {loadingDates ? (
                    <div className="d-flex align-items-center">
                      <Spinner animation="border" size="sm" className="me-2" />
                      <span>Loading available dates...</span>
                    </div>
                  ) : (
                    <div className="custom-datepicker-container">
                      <DatePicker
                        selected={date}
                        onChange={(date) => setDate(date)}
                        className="form-control"
                        dateFormat="MMMM d, yyyy"
                        maxDate={new Date()}
                        highlightDates={availableDates.map(dateStr => new Date(dateStr))}
                        filterDate={date => {
                          // If we have available dates, only allow selecting those dates
                          if (availableDates.length > 0) {
                            return availableDates.includes(moment(date).format('YYYY-MM-DD'));
                          }
                          // Otherwise, allow all dates
                          return true;
                        }}
                        style={getInputStyles()}
                        placeholderText="Select a date"
                        popperClassName={theme === 'dark' ? 'dark-theme-datepicker' : ''}
                        renderCustomHeader={({
                          date,
                          changeYear,
                          changeMonth,
                          decreaseMonth,
                          increaseMonth,
                          prevMonthButtonDisabled,
                          nextMonthButtonDisabled,
                        }) => (
                          <div
                            style={{
                              margin: 10,
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={decreaseMonth}
                              disabled={prevMonthButtonDisabled}
                              className="btn btn-sm btn-outline-secondary me-2"
                            >
                              <i className="bi bi-chevron-left"></i>
                            </button>
                            <select
                              value={date.getFullYear()}
                              onChange={({ target: { value } }) => changeYear(value)}
                              className="form-select form-select-sm me-2"
                              style={{ width: "auto" }}
                            >
                              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(
                                (year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                )
                              )}
                            </select>
                            <select
                              value={date.getMonth()}
                              onChange={({ target: { value } }) => changeMonth(value)}
                              className="form-select form-select-sm"
                              style={{ width: "auto" }}
                            >
                              {[
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                              ].map((month, i) => (
                                <option key={month} value={i}>
                                  {month}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={increaseMonth}
                              disabled={nextMonthButtonDisabled}
                              className="btn btn-sm btn-outline-secondary ms-2"
                            >
                              <i className="bi bi-chevron-right"></i>
                            </button>
                          </div>
                        )}
                      />
                      {availableDates.length > 0 && (
                        <small className="text-muted d-block mt-1">
                          <i className="bi bi-info-circle me-1"></i>
                          Only dates with available data are selectable
                        </small>
                      )}
          </div>
                  )}
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    <i className="bi bi-bar-chart me-2"></i>
                    Data Type
                  </Form.Label>
                  <Form.Select
                    value={selectedDataType}
                    onChange={(e) => setSelectedDataType(e.target.value)}
                    style={getInputStyles()}
                  >
                    <option value="all">All Parameters</option>
                    <option value="ph">pH Value Only</option>
                    <option value="temperature">Temperature Only</option>
                    <option value="turbidity">Turbidity Only</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col>
                <Button 
                  variant={theme === 'dark' ? 'outline-light' : 'primary'} 
                  onClick={fetchGraphData}
                  disabled={!date || !location || loading}
                  className="w-100"
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading Data...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-repeat me-2"></i>
                      Update Graph
                    </>
                  )}
                </Button>
              </Col>
            </Row>
            
            <Row>
              <Col>
                <div className="chart-container" style={{ position: 'relative', height: '60vh', width: '100%' }}>
                  {chartData ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                      {loading ? (
                        <>
                          <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </Spinner>
                          <p className="mt-3">Loading graph data...</p>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-bar-chart-line text-muted" style={{ fontSize: '3rem' }}></i>
                          <p className="mt-3 text-muted">
                            {error ? error : 'Select a date and location to view the graph'}
                          </p>
                        </>
                      )}
        </div>
      )}
                </div>
              </Col>
            </Row>
          </Card.Body>
          <Card.Footer className="text-muted">
            <Row>
              <Col>
                <small>
                  <i className="bi bi-info-circle me-2"></i>
                  This graph shows water quality parameters over time for the selected date and location.
                </small>
              </Col>
            </Row>
          </Card.Footer>
        </Card>
        
        {chartData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className={`shadow-sm ${theme === 'dark' ? 'bg-dark text-white' : ''}`}>
              <Card.Header>
                <h5 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Data Insights
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4} className="mb-3 mb-md-0">
                    <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                      <Card.Body>
                        <h6 className="d-flex align-items-center">
                          <Badge bg="info" className="me-2">pH</Badge>
                          pH Value Analysis
                        </h6>
                        <p className="small">
                          {chartData.datasets.find(d => d.label === 'pH Value') ? (
                            <>
                              Average pH: <strong>{(chartData.datasets.find(d => d.label === 'pH Value').data.reduce((a, b) => a + b, 0) / chartData.datasets.find(d => d.label === 'pH Value').data.length).toFixed(2)}</strong><br />
                              Max pH: <strong>{Math.max(...chartData.datasets.find(d => d.label === 'pH Value').data).toFixed(2)}</strong><br />
                              Min pH: <strong>{Math.min(...chartData.datasets.find(d => d.label === 'pH Value').data).toFixed(2)}</strong>
                            </>
                          ) : (
                            'pH data not selected'
                          )}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col md={4} className="mb-3 mb-md-0">
                    <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                      <Card.Body>
                        <h6 className="d-flex align-items-center">
                          <Badge bg="danger" className="me-2">TEMP</Badge>
                          Temperature Analysis
                        </h6>
                        <p className="small">
                          {chartData.datasets.find(d => d.label === 'Temperature (°C)') ? (
                            <>
                              Average Temp: <strong>{(chartData.datasets.find(d => d.label === 'Temperature (°C)').data.reduce((a, b) => a + b, 0) / chartData.datasets.find(d => d.label === 'Temperature (°C)').data.length).toFixed(2)} °C</strong><br />
                              Max Temp: <strong>{Math.max(...chartData.datasets.find(d => d.label === 'Temperature (°C)').data).toFixed(2)} °C</strong><br />
                              Min Temp: <strong>{Math.min(...chartData.datasets.find(d => d.label === 'Temperature (°C)').data).toFixed(2)} °C</strong>
                            </>
                          ) : (
                            'Temperature data not selected'
                          )}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col md={4}>
                    <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                      <Card.Body>
                        <h6 className="d-flex align-items-center">
                          <Badge bg="primary" className="me-2">TURB</Badge>
                          Turbidity Analysis
                        </h6>
                        <p className="small">
                          {chartData.datasets.find(d => d.label === 'Turbidity (NTU)') ? (
                            <>
                              Average Turbidity: <strong>{(chartData.datasets.find(d => d.label === 'Turbidity (NTU)').data.reduce((a, b) => a + b, 0) / chartData.datasets.find(d => d.label === 'Turbidity (NTU)').data.length).toFixed(2)} NTU</strong><br />
                              Max Turbidity: <strong>{Math.max(...chartData.datasets.find(d => d.label === 'Turbidity (NTU)').data).toFixed(2)} NTU</strong><br />
                              Min Turbidity: <strong>{Math.min(...chartData.datasets.find(d => d.label === 'Turbidity (NTU)').data).toFixed(2)} NTU</strong>
                            </>
                          ) : (
                            'Turbidity data not selected'
                          )}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
}

export default GraphPage;

// Add these styles at the end of the file
const styles = `
.react-datepicker {
  font-family: inherit;
  border-radius: 0.375rem;
  border: 1px solid #ced4da;
}

.react-datepicker__header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #ced4da;
}

.react-datepicker__day--highlighted {
  background-color: rgba(0, 123, 255, 0.2);
  border-radius: 0.3rem;
}

.react-datepicker__day--selected {
  background-color: #0d6efd;
  color: white;
  border-radius: 0.3rem;
}

.react-datepicker__day--keyboard-selected {
  background-color: rgba(0, 123, 255, 0.2);
  border-radius: 0.3rem;
}

.react-datepicker__day--outside-month {
  color: #6c757d;
}

.dark-theme-datepicker .react-datepicker {
  background-color: #343a40;
  border-color: #495057;
}

.dark-theme-datepicker .react-datepicker__header {
  background-color: #212529;
  border-bottom-color: #495057;
}

.dark-theme-datepicker .react-datepicker__current-month,
.dark-theme-datepicker .react-datepicker__day-name,
.dark-theme-datepicker .react-datepicker__day {
  color: #f8f9fa;
}

.dark-theme-datepicker .react-datepicker__day--outside-month {
  color: #6c757d;
}

.dark-theme-datepicker .react-datepicker__day--highlighted {
  background-color: rgba(13, 110, 253, 0.3);
}

.dark-theme-datepicker .react-datepicker__day--selected {
  background-color: #0d6efd;
}

.dark-theme-datepicker .react-datepicker__day:hover {
  background-color: #495057;
}

.custom-datepicker-container {
  position: relative;
}
`;

// Add the styles to the document
const styleSheet = document.createElement('style');
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
