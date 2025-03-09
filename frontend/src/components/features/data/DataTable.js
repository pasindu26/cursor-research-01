// src/components/features/data/DataTable.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Table, Form, Button, Row, Col, InputGroup, Alert, Spinner, Badge, Card } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'react-datepicker/dist/react-datepicker.css';
import { ThemeContext } from '../../../context/ThemeContext';
import apiService from '../../../utils/api';

function DataTable() {
  const [data, setData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [date, setDate] = useState(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { theme } = useContext(ThemeContext);

  // Process and normalize data
  const processData = useCallback((rawData) => {
    if (!Array.isArray(rawData)) {
      console.error('Expected array but got:', typeof rawData);
      return [];
    }
    
    return rawData.map(item => {
      // Create a numeric timestamp for faster sorting
      const dateTimeStr = `${item.date} ${item.time || '00:00:00'}`;
      const timestamp = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      const _timestampNum = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').valueOf();
      
      return {
        ...item,
        timestamp,
        _timestampNum,
        ph_value: parseFloat(item.ph_value),
        temperature: parseFloat(item.temperature),
        turbidity: parseFloat(item.turbidity)
      };
    });
  }, []);

  // Fetch data from the backend
  const fetchData = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching data with params:', params);
      const response = await apiService.data.getSensorData(params);
      console.log('Data response:', response);
      
      if (response.data && response.data.status === 'success') {
        const processedData = processData(response.data.data || []);
        
        // Extract unique locations for the dropdown
        const uniqueLocations = [...new Set(processedData.map(item => item.location))];
        setLocations(uniqueLocations);
        
        setData(processedData);
        applyFiltersAndSort(processedData, searchTerm, sortField, sortDirection);
        
        setSuccess('Data loaded successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again later.');
      setData([]);
      setDisplayedData([]);
    } finally {
      setLoading(false);
    }
  }, [processData, searchTerm, sortField, sortDirection]);

  // Apply filters and sorting to the data
  const applyFiltersAndSort = useCallback((dataToFilter, search, field, direction) => {
    let filtered = [...dataToFilter];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.location && item.location.toLowerCase().includes(searchLower)) ||
        (item.date && item.date.includes(search)) ||
        (item.id && item.id.toString().includes(search))
      );
    }
    
    // Sort data
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (field === 'timestamp') {
        comparison = a._timestampNum - b._timestampNum;
      } else if (field === 'location') {
        comparison = a.location.localeCompare(b.location);
      } else if (field === 'ph_value' || field === 'temperature' || field === 'turbidity') {
        comparison = a[field] - b[field];
      } else if (field === 'id') {
        comparison = a.id - b.id;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    setDisplayedData(filtered);
  }, []);

  // Initial data fetch
  useEffect(() => {
    const params = {};
    if (date) {
      params.date = moment(date).format('YYYY-MM-DD');
    }
    if (location) {
      params.location = location;
    }
    
    fetchData(params);
  }, [fetchData, date, location]);

  // Set up polling if enabled
  useEffect(() => {
    let interval;
    
    if (isPolling) {
      interval = setInterval(() => {
        const params = {};
        if (date) {
          params.date = moment(date).format('YYYY-MM-DD');
        }
        if (location) {
          params.location = location;
        }
        
        fetchData(params);
      }, 10000); // Poll every 10 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, fetchData, date, location]);

  // Apply filters and sorting when data or sort parameters change
  useEffect(() => {
    applyFiltersAndSort(data, searchTerm, sortField, sortDirection);
  }, [data, searchTerm, sortField, sortDirection, applyFiltersAndSort]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (field) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleReset = () => {
    setDate(null);
    setLocation('');
    setSearchTerm('');
    setSortField('timestamp');
    setSortDirection('desc');
    fetchData({});
  };

  const togglePolling = () => {
    setIsPolling(!isPolling);
  };

  // Check if a record is new (less than 1 hour old)
  const isNewRecord = (record) => {
    if (!record.timestamp) return false;
    const recordTime = moment(record.timestamp);
    const oneHourAgo = moment().subtract(1, 'hour');
    return recordTime.isAfter(oneHourAgo);
  };

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className={`data-table-container ${theme}`}>
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'}`}>
        <Card.Body>
          <h2 className="mb-4">Sensor Data Table</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Row className="mb-4">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Date</Form.Label>
                <DatePicker
                  selected={date}
                  onChange={date => setDate(date)}
                  dateFormat="yyyy-MM-dd"
                  className="form-control"
                  placeholderText="Select date"
                  isClearable
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Location</Form.Label>
                {locations.length > 0 ? (
                  <Form.Control
                    as="select"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc, index) => (
                      <option key={index} value={loc}>{loc}</option>
                    ))}
                  </Form.Control>
                ) : (
                  <Form.Control
                    type="text"
                    placeholder="Enter location"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                )}
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button
                variant="secondary"
                onClick={handleReset}
                className="me-2"
              >
                Reset
              </Button>
              <Button
                variant={isPolling ? "danger" : "success"}
                onClick={togglePolling}
                className="me-2"
              >
                {isPolling ? "Stop Auto-refresh" : "Start Auto-refresh"}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const params = {};
                  if (date) {
                    params.date = moment(date).format('YYYY-MM-DD');
                  }
                  if (location) {
                    params.location = location;
                  }
                  fetchData(params);
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />{' '}
                    Loading...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </Col>
          </Row>
          
          <div className="table-responsive">
            <Table striped bordered hover variant={theme === 'dark' ? 'dark' : 'light'}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                    ID {renderSortIndicator('id')}
                  </th>
                  <th onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>
                    Location {renderSortIndicator('location')}
                  </th>
                  <th onClick={() => handleSort('ph_value')} style={{ cursor: 'pointer' }}>
                    pH Value {renderSortIndicator('ph_value')}
                  </th>
                  <th onClick={() => handleSort('temperature')} style={{ cursor: 'pointer' }}>
                    Temperature (°C) {renderSortIndicator('temperature')}
                  </th>
                  <th onClick={() => handleSort('turbidity')} style={{ cursor: 'pointer' }}>
                    Turbidity (NTU) {renderSortIndicator('turbidity')}
                  </th>
                  <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>
                    Timestamp {renderSortIndicator('timestamp')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && displayedData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    </td>
                  </tr>
                ) : displayedData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  displayedData.map((item) => (
                    <tr key={item.id} className={isNewRecord(item) ? 'new-record-row' : ''}>
                      <td>{item.id}</td>
                      <td>{item.location}</td>
                      <td>{item.ph_value.toFixed(2)}</td>
                      <td>{item.temperature.toFixed(2)}</td>
                      <td>{item.turbidity.toFixed(2)}</td>
                      <td>
                        {item.date} {item.time}
                        {isNewRecord(item) && (
                          <Badge bg="success" className="ms-2">NEW</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="mt-3 text-muted">
            <small>
              {displayedData.length} records found
              {isPolling && ' • Auto-refreshing every 10 seconds'}
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default DataTable;
