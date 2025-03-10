import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert, Card, Accordion } from 'react-bootstrap';
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
import { motion } from 'framer-motion';
import './GraphPage.css';

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

// Helper function to get data type label
const getDataTypeLabel = (type) => {
  switch (type) {
    case 'ph_value':
      return 'pH Value';
    case 'temperature':
      return 'Temperature (°C)';
    case 'turbidity':
      return 'Turbidity';
    default:
      return type;
  }
};

const GraphPage = () => {
  // State for form inputs
  const [location, setLocation] = useState('uk');
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [dataType, setDataType] = useState('temperature');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState(['uk']);
  const [availableLocations, setAvailableLocations] = useState([]);
  
  // State for data and UI
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [showingSampleData, setShowingSampleData] = useState(false);

  // Theme context
  const { theme } = useContext(ThemeContext);

  // Fetch available locations
  const fetchLocations = useCallback(async () => {
    try {
      // Try to get locations from sensor data first
      const sensorResponse = await apiService.data.getSensorData();
      console.log('Fetching locations from sensor data:', sensorResponse.data);
      
      let locations = [];
      
      // Process sensor data response
      if (sensorResponse.data && Array.isArray(sensorResponse.data.data)) {
        // Extract unique locations from sensor data
        const sensorLocations = [...new Set(sensorResponse.data.data
          .filter(item => item && item.location)
          .map(item => item.location))];
        locations = [...locations, ...sensorLocations];
      }
      
      // If no locations found in sensor data, try getAllData
      if (locations.length === 0) {
        const allDataResponse = await apiService.data.getAllData();
        console.log('Fetching locations from all data:', allDataResponse.data);
        
        // Process all data response
        if (allDataResponse.data) {
          // Check if data is in the expected format
          if (allDataResponse.data.data && typeof allDataResponse.data.data === 'object') {
            // Handle case where data is an object with nested arrays
            if (allDataResponse.data.data.sensor_data && Array.isArray(allDataResponse.data.data.sensor_data)) {
              // Extract unique locations from sensor_data
              const allDataLocations = [...new Set(allDataResponse.data.data.sensor_data
                .filter(item => item && item.location)
                .map(item => item.location))];
              locations = [...locations, ...allDataLocations];
            } 
            // Handle case where data is an array
            else if (Array.isArray(allDataResponse.data.data)) {
              // Extract unique locations from data array
              const allDataLocations = [...new Set(allDataResponse.data.data
                .filter(item => item && item.location)
                .map(item => item.location))];
              locations = [...locations, ...allDataLocations];
            }
          }
        }
      }
      
      // Remove duplicates
      locations = [...new Set(locations)];
      console.log('Found locations:', locations);
      
      if (locations.length > 0) {
        setAvailableLocations(locations);
      return;
    }

      // If still no locations found, use default locations
      console.warn('No locations found in API responses, using default locations');
      setAvailableLocations(['uk', 'us', 'eu', 'asia', 'africa']);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setAvailableLocations(['uk', 'us', 'eu', 'asia', 'africa']);
    }
  }, []);
  
  // Check database connection and data availability
  const checkDatabaseConnection = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get sensor data
      console.log('Checking sensor data...');
      const sensorDataResponse = await apiService.data.getSensorData();
      console.log('Raw sensor data response:', JSON.stringify(sensorDataResponse));
      
      // Get all data
      console.log('Checking all data...');
      const allDataResponse = await apiService.data.getAllData();
      console.log('Raw all data response:', JSON.stringify(allDataResponse));
      
      // Extract available locations from sensor data
      let availableLocations = new Set();
      
      // Process sensor data
      if (sensorDataResponse && sensorDataResponse.data) {
        let sensorData = [];
        
        // Handle different response formats
        if (sensorDataResponse.data.status === 'success' && sensorDataResponse.data.data) {
          sensorData = sensorDataResponse.data.data;
        } else if (Array.isArray(sensorDataResponse.data)) {
          sensorData = sensorDataResponse.data;
        } else if (typeof sensorDataResponse.data === 'object') {
          sensorData = Object.values(sensorDataResponse.data).flat();
        }
        
        // Extract locations
        sensorData.forEach(item => {
          if (item && item.location) {
            availableLocations.add(item.location);
          }
        });
      }
      
      // Process all data
      if (allDataResponse && allDataResponse.data) {
        let allData = [];
        
        // Handle different response formats
        if (allDataResponse.data.status === 'success' && allDataResponse.data.data) {
          allData = allDataResponse.data.data;
        } else if (Array.isArray(allDataResponse.data)) {
          allData = allDataResponse.data;
        } else if (typeof allDataResponse.data === 'object') {
          // If it's an object, try to extract arrays from it
          Object.values(allDataResponse.data).forEach(value => {
            if (Array.isArray(value)) {
              allData = allData.concat(value);
            }
          });
        }
        
        // Extract locations
        allData.forEach(item => {
          if (item && item.location) {
            availableLocations.add(item.location);
          }
        });
      }
      
      // If no locations found, add default locations
      if (availableLocations.size === 0) {
        ['US', 'EU', 'Asia', 'Africa'].forEach(loc => availableLocations.add(loc));
      }
      
      // Create debug info
      const debugInfo = {
        sensorDataCount: sensorDataResponse?.data?.data?.length || 
                         (Array.isArray(sensorDataResponse?.data) ? sensorDataResponse.data.length : 0),
        allDataCount: allDataResponse?.data?.data?.length || 
                     (Array.isArray(allDataResponse?.data) ? allDataResponse.data.length : 0),
        availableLocations: Array.from(availableLocations),
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(debugInfo);
      setSuccess('Database connection checked successfully');
      
      // Try to fetch data for the current selection to see if it works
      await fetchGraphData();
      
    } catch (error) {
      console.error('Error checking database connection:', error);
      setError(`Error checking database connection: ${error.message}`);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [fetchGraphData]);
  
  // Generate sample data for visualization
  const generateSampleData = (type) => {
    const sampleData = [];
    const today = moment(date);
    
    // Generate 24 data points for a day (hourly)
    for (let i = 0; i < 24; i++) {
      let value;
      
      // Generate realistic sample values based on data type
      switch (type) {
        case 'temperature':
          // Temperature between 10°C and 25°C
          value = 10 + Math.random() * 15;
          break;
        case 'ph':
          // pH between 6.5 and 8.5
          value = 6.5 + Math.random() * 2;
          break;
        case 'turbidity':
          // Turbidity between 0 and 10 NTU
          value = Math.random() * 10;
          break;
        case 'conductivity':
          // Conductivity between 200 and 800 µS/cm
          value = 200 + Math.random() * 600;
          break;
        case 'dissolved_oxygen':
          // DO between 4 and 12 mg/L
          value = 4 + Math.random() * 8;
          break;
        default:
          value = Math.random() * 10 + 10;
      }
      
      sampleData.push({
        date: today.format('YYYY-MM-DD'),
        time: `${i.toString().padStart(2, '0')}:00:00`,
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return sampleData;
  };
  
  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (compareMode) {
        // Ensure we have at least one location selected
        if (selectedLocations.length === 0) {
          throw new Error('Please select at least one location for comparison');
        }
        
        // Fetch comparison data for multiple locations
        const params = {
          date,
          locations: selectedLocations.join(','),
          dataType
        };
        
        console.log('Fetching comparison data with params:', params);
        const response = await apiService.graphs.getCompareGraphData(params);
        console.log('Raw comparison data response:', JSON.stringify(response));
        
        // Enhanced response handling
        if (response) {
          let responseData = {};
          
          // Check if we have a valid response structure
          if (response.data && typeof response.data === 'object') {
            // Handle case where response.data has a status property
            if (response.data.status === 'success' && response.data.data) {
              responseData = response.data.data;
              console.log('Success response data:', JSON.stringify(responseData));
            } 
            // Handle case where response.data is the data directly
            else if (Object.keys(response.data).length > 0) {
              responseData = response.data;
              console.log('Direct response data:', JSON.stringify(responseData));
            }
          }
          
          console.log('Processed response data:', JSON.stringify(responseData));
          
          // Check if we have valid data for any location
          const hasValidData = Object.values(responseData).some(
            locData => Array.isArray(locData) && locData.length > 0
          );
          
          if (hasValidData) {
            setGraphData(responseData);
            setShowingSampleData(false);
            setSuccess('Graph data loaded successfully');
          } else {
            console.warn('No valid data found in response, using sample data');
            // Generate sample data for selected locations
            const sampleData = {};
            selectedLocations.forEach(loc => {
              sampleData[loc] = generateSampleData(dataType);
            });
            setGraphData(sampleData);
            setShowingSampleData(true);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        // Single location mode
        if (!location) {
          throw new Error('Please select a location');
        }
        
        const params = {
          date,
          location,
          dataType
        };
        
        console.log('Fetching single location data with params:', params);
        const response = await apiService.graphs.getGraphData(params);
        console.log('Raw single location data response:', JSON.stringify(response));
        
        // Enhanced response handling
        if (response) {
          let responseData = [];
          
          // Check if we have a valid response structure
          if (response.data && typeof response.data === 'object') {
            // Handle case where response.data has a status property
            if (response.data.status === 'success' && response.data.data) {
              responseData = response.data.data;
              console.log('Success response data:', JSON.stringify(responseData));
            } 
            // Handle case where response.data is the data directly
            else if (Array.isArray(response.data)) {
              responseData = response.data;
              console.log('Direct array response data:', JSON.stringify(responseData));
            }
            // Handle case where response.data contains the array in a property
            else if (response.data[dataType] && Array.isArray(response.data[dataType])) {
              responseData = response.data[dataType];
              console.log('Data type property response data:', JSON.stringify(responseData));
            }
            // Handle case where response.data contains the array in a location property
            else if (response.data[location] && Array.isArray(response.data[location])) {
              responseData = response.data[location];
              console.log('Location property response data:', JSON.stringify(responseData));
            }
            // Handle case where response.data.data is empty array
            else if (response.data.status === 'success' && Array.isArray(response.data.data) && response.data.data.length === 0) {
              console.warn('Empty data array in response');
              responseData = [];
            }
          }
          
          console.log('Processed response data:', JSON.stringify(responseData));
          
          // Check if we have valid data
          if (Array.isArray(responseData) && responseData.length > 0) {
            setGraphData(responseData);
            setShowingSampleData(false);
            setSuccess('Graph data loaded successfully');
          } else {
            console.warn('No valid data found in response, using sample data');
            setGraphData(generateSampleData(dataType));
            setShowingSampleData(true);
          }
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
      setError(`Error fetching graph data: ${error.message}`);
      
      // Use sample data as fallback
      if (compareMode) {
        const sampleData = {};
        selectedLocations.forEach(loc => {
          sampleData[loc] = generateSampleData(dataType);
        });
        setGraphData(sampleData);
      } else {
        setGraphData(generateSampleData(dataType));
      }
      setShowingSampleData(true);
    } finally {
      setLoading(false);
    }
  }, [compareMode, date, dataType, location, selectedLocations]);
  
  // Initial data fetch
  useEffect(() => {
    fetchLocations();
    // Check database connection
    checkDatabaseConnection();
    // Initial data fetch when component mounts
    fetchGraphData();
  }, [fetchLocations, fetchGraphData, checkDatabaseConnection]);
  
  // Reset selected locations when toggling compare mode
  useEffect(() => {
    if (compareMode) {
      // If switching to compare mode, initialize with current location
      setSelectedLocations([location]);
    }
  }, [compareMode, location]);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!graphData) {
      console.log('No graph data available');
      return null;
    }
    
    console.log('Preparing chart data from:', graphData);
    
    const colors = [
      'rgba(75, 192, 192, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(153, 102, 255, 1)'
    ];
    
    if (compareMode) {
      // Comparison mode - multiple lines for different locations
      // Check if graphData is properly structured
      if (typeof graphData !== 'object' || graphData === null) {
        console.error('Invalid graphData format for compare mode:', graphData);
        return null;
      }
      
      try {
        // Get all unique times across all locations
        const allTimes = new Set();
        
        // Safely extract times from all locations
        Object.entries(graphData).forEach(([loc, locData]) => {
          // Ensure locData is an array before processing
          if (Array.isArray(locData)) {
            locData.forEach(item => {
              if (item && item.time) {
                allTimes.add(item.time);
              }
            });
          }
        });
        
        // Convert to array and sort chronologically
        const labels = Array.from(allTimes).sort();
        
        if (labels.length === 0) {
          console.warn('No valid time labels found in data');
          return null;
        }
        
        // Create datasets for each location
        const datasets = [];
        
        Object.entries(graphData).forEach(([loc, locData], index) => {
          // Skip if locData is not an array or is empty
          if (!Array.isArray(locData) || locData.length === 0) {
            console.warn(`Skipping invalid data for location: ${loc}`);
            return;
          }
          
          // Create a map of time to value for quick lookup
          const timeValueMap = {};
          locData.forEach(item => {
            if (item && item.time && item.value !== undefined) {
              timeValueMap[item.time] = parseFloat(item.value);
            }
          });
          
          // Create dataset with values for each time label
          const data = labels.map(time => timeValueMap[time] !== undefined ? timeValueMap[time] : null);
          
          datasets.push({
            label: loc,
            data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('1)', '0.2)'),
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.1
          });
        });
        
        if (datasets.length === 0) {
          console.warn('No valid datasets created');
          return null;
        }
        
        return {
          labels,
          datasets
        };
      } catch (error) {
        console.error('Error preparing comparison chart data:', error);
        return null;
      }
    } else {
      // Single location mode - one line for the selected location
      // Check if graphData is properly structured
      if (!Array.isArray(graphData)) {
        console.error('Invalid graphData format for single location mode:', graphData);
        return null;
      }
      
      try {
        // Extract time and value from each data point
        const validData = graphData.filter(item => 
          item && typeof item === 'object' && item.time !== undefined && item.value !== undefined
        );
        
        if (validData.length === 0) {
          console.warn('No valid data points found');
          return null;
        }
        
        // Sort data by time
        validData.sort((a, b) => {
          if (a.time < b.time) return -1;
          if (a.time > b.time) return 1;
          return 0;
        });
        
        const labels = validData.map(item => item.time);
        const data = validData.map(item => parseFloat(item.value));
        
        return {
          labels,
          datasets: [
            {
              label: getDataTypeLabel(dataType),
              data,
              borderColor: colors[0],
              backgroundColor: colors[0].replace('1)', '0.2)'),
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 5,
              tension: 0.1
            }
          ]
        };
      } catch (error) {
        console.error('Error preparing single location chart data:', error);
        return null;
      }
    }
  }, [graphData, compareMode, dataType]);
  
  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme === 'dark' ? '#fff' : '#333',
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: theme === 'dark' ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: theme === 'dark' ? '#fff' : '#333',
        bodyColor: theme === 'dark' ? '#fff' : '#333',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
              
              // Add units based on data type
              if (dataType === 'temperature') {
                label += ' °C';
              } else if (dataType === 'turbidity') {
                label += ' NTU';
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#333',
          maxRotation: 45,
          minRotation: 45
        },
        title: {
          display: true,
          text: compareMode ? 'Date' : 'Time',
          color: theme === 'dark' ? '#fff' : '#333',
          font: {
            weight: 'bold'
          }
        }
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#333'
        },
        title: {
          display: true,
          text: getDataTypeLabel(dataType),
          color: theme === 'dark' ? '#fff' : '#333',
          font: {
            weight: 'bold'
          }
        },
        beginAtZero: dataType !== 'ph_value' // Start at zero except for pH values
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeInOutQuad'
      }
    }
  }), [theme, compareMode, dataType]);
  
  // Handle location selection in compare mode
  const handleLocationChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setSelectedLocations(prev => [...prev, value]);
    } else {
      setSelectedLocations(prev => prev.filter(loc => loc !== value));
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!date) {
      setError('Please select a date');
      return;
    }
    
    if (compareMode) {
      if (selectedLocations.length === 0) {
        setError('Please select at least one location for comparison');
        return;
      }
    } else {
      if (!location) {
        setError('Please select a location');
        return;
      }
    }
    
    if (!dataType) {
      setError('Please select a data type');
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    // Log the request parameters
    console.log('Submitting graph request with params:', {
      date,
      location: compareMode ? selectedLocations : location,
      dataType,
      compareMode
    });
    
    // Fetch graph data
    fetchGraphData();
  };

  // Test API with specific parameters
  const testApiWithParams = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Test parameters
      const testParams = {
        date: date || '2025-03-10',
        location: location || 'africa',
        dataType: dataType || 'temperature'
      };
      
      console.log('Testing API with params:', testParams);
      
      // Make direct API call
      const response = await apiService.graphs.getGraphData(testParams);
      console.log('Test API response:', JSON.stringify(response));
      
      // Update debug info with test results
      setDebugInfo(prev => ({
        ...prev,
        testApiParams: testParams,
        testApiResponse: response.data,
        testApiTimestamp: new Date().toISOString()
      }));
      
      // Check if we have valid data
      let hasValidData = false;
      
      if (response.data && response.data.status === 'success') {
        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          hasValidData = true;
          setSuccess('Test API call successful - data found!');
        }
      }
      
      if (!hasValidData) {
        setError('Test API call successful but no data found for the parameters');
      }
      
    } catch (error) {
      console.error('Error testing API:', error);
      setError(`Error testing API: ${error.message}`);
      setDebugInfo(prev => ({
        ...prev,
        testApiError: error.message,
        testApiTimestamp: new Date().toISOString()
      }));
    } finally {
      setLoading(false);
    }
  }, [date, location, dataType]);

  return (
    <Container fluid className="graph-page py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Row className="mb-4">
          <Col>
            <h2 className="page-title">
              <i className="bi bi-graph-up me-2"></i>
              Water Quality Graphs
            </h2>
            <p className="text-muted">
              Visualize water quality data over time. Select parameters below to customize your graph.
            </p>
          </Col>
        </Row>
        
        {/* Error Alert */}
        {error && (
          <Alert 
            variant="danger" 
            className="mb-4" 
            dismissible 
            onClose={() => setError('')}
          >
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </Alert>
        )}
        
        {/* Sample Data Alert */}
        {showingSampleData && (
          <Alert 
            variant="warning" 
            className="mb-4" 
            dismissible 
            onClose={() => setShowingSampleData(false)}
          >
            <i className="bi bi-info-circle-fill me-2"></i>
            <strong>No data available for the selected parameters.</strong> Showing sample data instead.
            <div className="mt-2">
              <small>
                Try selecting a different location, date, or data type. You can also check the database connection
                to see what data is available.
              </small>
            </div>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            <i className="bi bi-check-circle-fill me-2"></i>
            {success}
          </Alert>
        )}
        
        {/* Debug Information */}
        {debugInfo && (
          <Accordion className="mb-4">
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                <i className="bi bi-bug-fill me-2"></i> Debug Information
              </Accordion.Header>
              <Accordion.Body>
                <pre className="debug-info">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
                <div className="mt-3">
                  <small className="text-muted">
                    This information can help diagnose issues with data retrieval.
                  </small>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )}
        
        <Row className="mb-4">
          <Col lg={4} md={6} className="mb-3">
            <Card className={`shadow-sm ${theme === 'dark' ? 'bg-dark text-white' : ''}`}>
              <Card.Body>
                <Card.Title>Graph Settings</Card.Title>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="compare-mode"
                      label="Compare Multiple Locations"
                      checked={compareMode}
                      onChange={(e) => setCompareMode(e.target.checked)}
              />
            </Form.Group>
                  
                  {!compareMode ? (
                    <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
                      <Form.Select 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                        className={theme === 'dark' ? 'bg-dark text-white' : ''}
                      >
                        {availableLocations.map(loc => (
                          <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  ) : (
                    <Form.Group className="mb-3">
                      <Form.Label>Select Locations</Form.Label>
                      <div className="location-checkboxes">
                        {availableLocations.map(loc => (
                          <Form.Check 
                            key={loc}
                            type="checkbox"
                            id={`location-${loc}`}
                            label={loc.toUpperCase()}
                            value={loc}
                            checked={selectedLocations.includes(loc)}
                            onChange={handleLocationChange}
                          />
                        ))}
                      </div>
                    </Form.Group>
                  )}
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Date</Form.Label>
                    <Form.Control 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={moment().format('YYYY-MM-DD')}
                      className={theme === 'dark' ? 'bg-dark text-white' : ''}
              />
            </Form.Group>
                  
                  <Form.Group className="mb-3">
              <Form.Label>Data Type</Form.Label>
                    <Form.Select 
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                      className={theme === 'dark' ? 'bg-dark text-white' : ''}
              >
                      <option value="temperature">Temperature</option>
                <option value="ph_value">pH Value</option>
                <option value="turbidity">Turbidity</option>
                    </Form.Select>
            </Form.Group>
                  
                  <Button 
                    variant={theme === 'dark' ? 'outline-light' : 'primary'} 
                    type="submit"
                    disabled={loading || (compareMode && selectedLocations.length === 0)}
                    className="w-100 mb-2"
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-graph-up me-2"></i>
                        Generate Graph
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    className="w-100 d-flex align-items-center justify-content-center"
                    onClick={checkDatabaseConnection}
                    disabled={loading}
                  >
                    <i className="bi bi-database-check me-2"></i> Check Database Connection
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    className="w-100 d-flex align-items-center justify-content-center mt-2"
                    onClick={testApiWithParams}
                    disabled={loading}
                  >
                    <i className="bi bi-lightning-charge me-2"></i> Test API
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={8} md={6}>
            <Card className={`shadow-sm h-100 ${theme === 'dark' ? 'bg-dark text-white' : ''}`}>
              <Card.Body>
                <Card.Title>
                  {compareMode ? 'Location Comparison' : `${location.toUpperCase()} ${getDataTypeLabel(dataType)}`}
                  <span className="text-muted ms-2 small">
                    {moment(date).format('MMMM D, YYYY')}
                  </span>
                </Card.Title>
                
                <div className="chart-container" style={{ height: '400px', position: 'relative' }}>
                  {loading ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <Spinner animation="border" role="status" variant={theme === 'dark' ? 'light' : 'primary'}>
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    </div>
                  ) : chartData ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                      <p>No data available. Please select parameters and generate a graph.</p>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col>
            <Card className={`shadow-sm ${theme === 'dark' ? 'bg-dark text-white' : ''}`}>
              <Card.Body>
                <Card.Title>Understanding Water Quality Parameters</Card.Title>
                <Row>
                  <Col md={4}>
                    <h5><i className="bi bi-thermometer-half me-2"></i>Temperature</h5>
                    <p>Water temperature affects oxygen levels, metabolism of aquatic organisms, and overall ecosystem health. Optimal range varies by water body and season.</p>
                  </Col>
                  <Col md={4}>
                    <h5><i className="bi bi-droplet-half me-2"></i>pH Value</h5>
                    <p>pH measures acidity or alkalinity on a scale of 0-14. Most aquatic life thrives in a pH range of 6.5-8.5. Values outside this range can stress or harm organisms.</p>
                  </Col>
                  <Col md={4}>
                    <h5><i className="bi bi-water me-2"></i>Turbidity</h5>
                    <p>Turbidity measures water clarity. High turbidity can indicate pollution, erosion, or algal growth, and can affect light penetration and ecosystem function.</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </motion.div>
    </Container>
  );
};

export default GraphPage;
