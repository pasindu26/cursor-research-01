import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { Form, Button, Spinner, Row, Col, Container, Alert, Card, Badge } from 'react-bootstrap';
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
import { motion } from 'framer-motion';

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

  // Update the chartOptions to include better tooltips and styling
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
            size: 12,
            weight: 'bold'
          },
          usePointStyle: true,
          pointStyle: 'circle'
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
          },
          title: function(tooltipItems) {
            return moment(tooltipItems[0].label).format('MMMM D, YYYY');
          }
        }
      },
      title: {
        display: true,
        text: `${getDataTypeLabel(dataType)} Comparison Across Locations`,
        color: theme === 'dark' ? '#FFF' : '#000',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      }
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
          },
          padding: {
            top: 10
          }
        },
        ticks: { 
          color: theme === 'dark' ? '#FFF' : '#000',
          maxRotation: 45,
          minRotation: 45,
          callback: function(value, index, values) {
            return moment(this.getLabelForValue(value)).format('MMM D');
          },
          padding: 5
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
          },
          padding: {
            bottom: 10
          }
        },
        ticks: { 
          color: theme === 'dark' ? '#FFF' : '#000',
          padding: 8, // Add padding to the ticks to prevent overlap
          callback: function(value, index, values) {
            // Format the tick value based on data type
            if (dataType === 'temperature') {
              return value.toFixed(1) + '°C';
            } else if (dataType === 'turbidity') {
              return value.toFixed(1) + ' NTU';
            } else {
              return value.toFixed(1);
            }
          }
        },
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
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
        hoverBorderWidth: 3
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 30 // Add extra padding at the bottom to ensure Y-axis values are visible
      }
    }
  }), [theme, dataType, getYAxisLabel, getDataTypeLabel]);

  // Add a function to calculate statistics for each location
  const calculateStats = useCallback(() => {
    if (!chartData || !chartData.datasets) return null;
    
    return chartData.datasets.map(dataset => {
      const values = dataset.data.filter(val => val !== null && val !== undefined);
      if (values.length === 0) return null;
      
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      return {
        location: dataset.label,
        color: dataset.borderColor,
        average: avg.toFixed(2),
        maximum: max.toFixed(2),
        minimum: min.toFixed(2),
        count: values.length
      };
    }).filter(Boolean);
  }, [chartData]);

  // Add custom styles for dark mode
  const getInputStyles = useCallback(() => ({
    backgroundColor: theme === 'dark' ? '#2b3035' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    borderColor: theme === 'dark' ? '#495057' : '#ced4da',
  }), [theme]);

  // Add a function to check if a location is already selected
  const isLocationSelected = useCallback((loc) => {
    return locations.includes(loc);
  }, [locations]);

  // Effect to fetch data when component mounts if locations are available
  useEffect(() => {
    if (locations.length > 0 && startDate && endDate) {
      fetchGraphData();
    }
  }, [locations, startDate, endDate, fetchGraphData]);

  // Add a custom date picker header renderer
  const renderCustomHeader = ({
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
  );

  // Add a function to get a descriptive title for the chart
  const getChartTitle = useCallback(() => {
    if (!chartData) return '';
    
    const dateRange = `${moment(startDate).format('MMM D, YYYY')} - ${moment(endDate).format('MMM D, YYYY')}`;
    return `${getDataTypeLabel(dataType)} Comparison (${dateRange})`;
  }, [chartData, startDate, endDate, dataType, getDataTypeLabel]);

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
              <i className="bi bi-graph-up-arrow me-2"></i>
              Compare Water Quality Data
            </h4>
            {loading && (
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            )}
          </Card.Header>
          <Card.Body>
            {errorMessage && (
              <Alert variant="danger" dismissible onClose={() => setErrorMessage('')}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMessage}
              </Alert>
            )}
            
            {successMessage && (
              <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
                <i className="bi bi-check-circle-fill me-2"></i>
                {successMessage}
              </Alert>
            )}
            
            <Form className="mb-4">
        <Row className="mb-3">
                <Col lg={3} md={6} className="mb-3 mb-lg-0">
            <Form.Group>
                    <Form.Label>
                      <i className="bi bi-calendar-date me-2"></i>
                      Start Date
                    </Form.Label>
                    <div className="custom-datepicker-container">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                        dateFormat="MMMM d, yyyy"
                className="form-control"
                placeholderText="Select start date"
                        style={getInputStyles()}
                        popperClassName={theme === 'dark' ? 'dark-theme-datepicker' : ''}
                        maxDate={endDate || new Date()}
                        renderCustomHeader={renderCustomHeader}
              />
                    </div>
            </Form.Group>
          </Col>
                <Col lg={3} md={6} className="mb-3 mb-lg-0">
            <Form.Group>
                    <Form.Label>
                      <i className="bi bi-calendar-date me-2"></i>
                      End Date
                    </Form.Label>
                    <div className="custom-datepicker-container">
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                        dateFormat="MMMM d, yyyy"
                className="form-control"
                placeholderText="Select end date"
                        style={getInputStyles()}
                        popperClassName={theme === 'dark' ? 'dark-theme-datepicker' : ''}
                        minDate={startDate}
                        maxDate={new Date()}
                        renderCustomHeader={renderCustomHeader}
              />
                    </div>
            </Form.Group>
          </Col>
                <Col lg={3} md={6} className="mb-3 mb-md-0">
            <Form.Group>
                    <Form.Label>
                      <i className="bi bi-geo-alt me-2"></i>
                      Add Location
                    </Form.Label>
                    <div className="d-flex">
                      <Form.Select
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                        style={getInputStyles()}
                        className="me-2"
                      >
                        <option value="">Select a location</option>
                        {availableLocations.map((loc, index) => (
                          <option key={index} value={loc} disabled={isLocationSelected(loc)}>
                            {loc.toUpperCase()} {isLocationSelected(loc) ? '(Already Added)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                      <Button 
                        variant={theme === 'dark' ? 'outline-light' : 'outline-primary'} 
                        onClick={addLocation} 
                        disabled={!locationInput || isLocationSelected(locationInput)}
                        className="d-flex align-items-center"
                        title="Add Location"
                      >
                        <i className="bi bi-plus-circle"></i>
                      </Button>
                    </div>
            </Form.Group>
          </Col>
                <Col lg={3} md={6}>
            <Form.Group>
                    <Form.Label>
                      <i className="bi bi-bar-chart me-2"></i>
                      Data Type
                    </Form.Label>
                    <Form.Select 
                      value={dataType} 
                      onChange={(e) => setDataType(e.target.value)}
                      style={getInputStyles()}
                    >
                <option value="ph_value">pH Value</option>
                <option value="temperature">Temperature</option>
                <option value="turbidity">Turbidity</option>
                    </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* List of Locations */}
        {locations.length > 0 && (
                <div className="mb-4 p-3 rounded" style={{ 
                  backgroundColor: theme === 'dark' ? '#212529' : '#f8f9fa',
                  border: `1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'}`
                }}>
                  <h5 className="mb-3">
                    <i className="bi bi-pin-map me-2"></i>
                    Selected Locations for Comparison
                  </h5>
                  <Row>
              {locations.map((loc, index) => (
                      <Col key={index} md={4} lg={3} className="mb-2">
                        <div className="d-flex align-items-center p-2 rounded" 
                             style={{ 
                               backgroundColor: theme === 'dark' ? '#343a40' : '#ffffff',
                               borderLeft: `4px solid ${getColor(index)}`,
                               boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                             }}>
                          <div className="d-flex align-items-center flex-grow-1">
                            <Badge bg="secondary" className="me-2">{index + 1}</Badge>
                            <span className="me-2 text-truncate">{loc.toUpperCase()}</span>
                          </div>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="rounded-circle d-flex align-items-center justify-content-center" 
                            style={{ width: '24px', height: '24px', padding: 0, minWidth: '24px' }}
                            onClick={() => removeLocation(loc)}
                            title={`Remove ${loc}`}
                          >
                            <i className="bi bi-x"></i>
                  </Button>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  <div className="mt-3 d-flex justify-content-end">
                    <Button 
                      variant="primary" 
                      onClick={fetchGraphData} 
                      disabled={loading || locations.length === 0}
                      className="d-flex align-items-center"
                    >
          {loading ? (
            <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Loading Data...
            </>
          ) : (
                        <>
                          <i className="bi bi-graph-up me-2"></i>
                          Generate Comparison Graph
                        </>
          )}
        </Button>
                  </div>
                </div>
              )}
      </Form>

      {/* Graph Section */}
            <div className="chart-container mb-4">
              {chartData ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="h-100"
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{getChartTitle()}</h5>
                    <div className="d-flex">
                      <Badge 
                        bg="light" 
                        text="dark" 
                        className="me-2 d-flex align-items-center"
                        style={{ fontSize: '0.8rem' }}
                      >
                        <i className="bi bi-calendar-range me-1"></i>
                        {moment(startDate).format('MMM D')} - {moment(endDate).format('MMM D, YYYY')}
                      </Badge>
                      <Badge 
                        bg="light" 
                        text="dark" 
                        className="d-flex align-items-center"
                        style={{ fontSize: '0.8rem' }}
                      >
                        <i className="bi bi-pin-map me-1"></i>
                        {locations.length} location{locations.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  <div style={{ height: '60vh', minHeight: '300px', paddingBottom: '20px' }}>
          <Line
            data={chartData}
            options={{
                        ...chartOptions,
              maintainAspectRatio: false,
                        layout: {
                          padding: {
                            left: 10,
                            right: 10,
                            top: 10,
                            bottom: 30 // Add extra padding at the bottom to ensure Y-axis values are visible
                          }
                        }
            }}
          />
        </div>
                </motion.div>
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '60vh', minHeight: '300px' }}>
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
                        {errorMessage ? errorMessage : 'Select date range, locations, and data type, then click "Generate Comparison Graph"'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Add a data insights section below the chart */}
            {chartData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-5" // Increase top margin to ensure separation from the chart
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
                      {calculateStats().map((stat, index) => (
                        <Col lg={4} md={6} key={index} className="mb-3">
                          <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                            <Card.Body>
                              <h6 className="d-flex align-items-center">
                                <span className="me-2" style={{ 
                                  display: 'inline-block', 
                                  width: '12px', 
                                  height: '12px', 
                                  backgroundColor: stat.color,
                                  borderRadius: '50%'
                                }}></span>
                                {stat.location}
                              </h6>
                              <div className="small">
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Average:</span>
                                  <strong>{stat.average} {dataType === 'temperature' ? '°C' : dataType === 'turbidity' ? 'NTU' : ''}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Maximum:</span>
                                  <strong>{stat.maximum} {dataType === 'temperature' ? '°C' : dataType === 'turbidity' ? 'NTU' : ''}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Minimum:</span>
                                  <strong>{stat.minimum} {dataType === 'temperature' ? '°C' : dataType === 'turbidity' ? 'NTU' : ''}</strong>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <span>Data Points:</span>
                                  <strong>{stat.count}</strong>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </motion.div>
            )}
          </Card.Body>
          <Card.Footer className="text-muted">
            <small>
              <i className="bi bi-info-circle me-2"></i>
              This graph compares water quality parameters across different locations over time.
            </small>
          </Card.Footer>
        </Card>
      </motion.div>
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
.react-datepicker {
  font-family: inherit;
  border-radius: 0.375rem;
  border: 1px solid #ced4da;
}

.react-datepicker__header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #ced4da;
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

export default CompareGraphPage;
