// src/components/features/data/DataTable.js
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { Table, Form, Button, Row, Col, InputGroup, Alert, Spinner, Badge, Card, ProgressBar } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'react-datepicker/dist/react-datepicker.css';
import { ThemeContext } from '../../../context/ThemeContext';
import apiService from '../../../utils/api';
import { motion } from 'framer-motion';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [availableDates, setAvailableDates] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = React.useRef(null);

  const { theme } = useContext(ThemeContext);

  // Process and normalize data
  const processData = useCallback((rawData) => {
    if (!Array.isArray(rawData)) {
      console.error('Expected array but got:', typeof rawData);
      return [];
    }
    
    // Extract unique dates from the data
    const uniqueDates = new Set();
    
    const processedData = rawData.map(item => {
      // Create a numeric timestamp for faster sorting
      const dateTimeStr = `${item.date} ${item.time || '00:00:00'}`;
      const timestamp = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      const _timestampNum = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').valueOf();
      
      // Add date to unique dates set
      if (item.date) {
        uniqueDates.add(item.date);
      }
      
      return {
        ...item,
        timestamp,
        _timestampNum,
        ph_value: parseFloat(item.ph_value),
        temperature: parseFloat(item.temperature),
        turbidity: parseFloat(item.turbidity)
      };
    });
    
    // Update available dates state
    setAvailableDates(Array.from(uniqueDates).map(dateStr => new Date(dateStr)));
    
    return processedData;
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
    setCurrentPage(1); // Reset to first page when filters or sort changes
  }, [data, searchTerm, sortField, sortDirection, applyFiltersAndSort]);

  // Add a function to handle clicks outside the calendar
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarRef]);

  // Add a function to format the date for display
  const formatDate = (date) => {
    if (!date) return '';
    return moment(date).format('MMMM D, YYYY');
  };

  // Add a function to handle date selection
  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setShowCalendar(false);
  };

  // Add a function to generate calendar days
  const generateCalendarDays = () => {
    if (!date) return [];
    
    const currentDate = date ? moment(date) : moment();
    const firstDay = moment(currentDate).startOf('month');
    const lastDay = moment(currentDate).endOf('month');
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.day();
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Calculate total days to show (previous month + current month + next month)
    const daysInMonth = lastDay.date();
    const totalDays = daysFromPrevMonth + daysInMonth;
    const totalRows = Math.ceil(totalDays / 7);
    const totalCells = totalRows * 7;
    
    const days = [];
    
    // Add days from previous month
    const prevMonth = moment(firstDay).subtract(1, 'month');
    const daysInPrevMonth = prevMonth.daysInMonth();
    
    for (let i = 0; i < daysFromPrevMonth; i++) {
      const dayNumber = daysInPrevMonth - daysFromPrevMonth + i + 1;
      const dayDate = moment(prevMonth).date(dayNumber).toDate();
      days.push({
        date: dayDate,
        day: dayNumber,
        isCurrentMonth: false,
        isAvailable: isDateAvailable(dayDate)
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = moment(firstDay).date(i).toDate();
      days.push({
        date: dayDate,
        day: i,
        isCurrentMonth: true,
        isToday: moment().format('YYYY-MM-DD') === moment(dayDate).format('YYYY-MM-DD'),
        isSelected: date && moment(date).format('YYYY-MM-DD') === moment(dayDate).format('YYYY-MM-DD'),
        isAvailable: isDateAvailable(dayDate)
      });
    }
    
    // Add days from next month to fill the remaining cells
    const remainingCells = totalCells - days.length;
    const nextMonth = moment(lastDay).add(1, 'month');
    
    for (let i = 1; i <= remainingCells; i++) {
      const dayDate = moment(nextMonth).date(i).toDate();
      days.push({
        date: dayDate,
        day: i,
        isCurrentMonth: false,
        isAvailable: isDateAvailable(dayDate)
      });
    }
    
    return days;
  };

  // Add a function to navigate to previous/next month
  const navigateMonth = (direction) => {
    if (!date) {
      setDate(new Date());
      return;
    }
    
    const newDate = moment(date).add(direction, 'month').toDate();
    setDate(newDate);
  };

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

  // Add a function to calculate statistics
  const calculateStats = useCallback(() => {
    if (!data || data.length === 0) return null;
    
    // Calculate statistics for pH, temperature, and turbidity
    const phValues = data.map(item => item.ph_value).filter(val => !isNaN(val));
    const tempValues = data.map(item => item.temperature).filter(val => !isNaN(val));
    const turbValues = data.map(item => item.turbidity).filter(val => !isNaN(val));
    
    // Helper function to calculate statistics
    const getStats = (values) => {
      if (values.length === 0) return { min: 0, max: 0, avg: 0 };
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      
      return { min, max, avg };
    };
    
    // Get unique locations
    const uniqueLocations = [...new Set(data.map(item => item.location))];
    
    return {
      ph: getStats(phValues),
      temperature: getStats(tempValues),
      turbidity: getStats(turbValues),
      totalRecords: data.length,
      uniqueLocations: uniqueLocations.length,
      locations: uniqueLocations
    };
  }, [data]);

  // Add a function to get status color based on value
  const getStatusColor = useCallback((value, type) => {
    if (type === 'ph') {
      if (value < 6.5) return 'danger';
      if (value > 8.5) return 'danger';
      if (value < 7.0 || value > 8.0) return 'warning';
      return 'success';
    } else if (type === 'temperature') {
      if (value > 30) return 'danger';
      if (value > 25) return 'warning';
      if (value < 10) return 'info';
      return 'success';
    } else if (type === 'turbidity') {
      if (value > 20) return 'danger';
      if (value > 10) return 'warning';
      return 'success';
    }
    return 'primary';
  }, []);

  // Add a function to export data to CSV
  const exportToCSV = useCallback(() => {
    if (displayedData.length === 0) return;
    
    // Create CSV content
    const headers = ['ID', 'Location', 'pH Value', 'Temperature (°C)', 'Turbidity (NTU)', 'Date', 'Time'];
    const csvContent = [
      headers.join(','),
      ...displayedData.map(item => [
        item.id,
        item.location,
        item.ph_value.toFixed(2),
        item.temperature.toFixed(2),
        item.turbidity.toFixed(2),
        item.date,
        item.time
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `water_quality_data_${moment().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess('Data exported successfully');
    setTimeout(() => setSuccess(''), 3000);
  }, [displayedData]);

  // Add a function to handle page changes
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of table when changing pages
    const tableElement = document.querySelector('.table-responsive');
    if (tableElement) {
      tableElement.scrollTop = 0;
    }
  };

  // Add a function to get paginated data
  const getPaginatedData = useCallback(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return displayedData.slice(startIndex, endIndex);
  }, [displayedData, currentPage, rowsPerPage]);

  // Add a function to calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(displayedData.length / rowsPerPage);
  }, [displayedData, rowsPerPage]);

  // Add a function to generate page numbers
  const getPageNumbers = useCallback(() => {
    const pageNumbers = [];
    const maxPageButtons = 5; // Maximum number of page buttons to show
    
    if (totalPages <= maxPageButtons) {
      // If total pages is less than or equal to max buttons, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);
      
      // Calculate start and end of page range
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning or end
      if (currentPage <= 2) {
        endPage = 4;
      } else if (currentPage >= totalPages - 1) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add page numbers
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always include last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  }, [currentPage, totalPages]);

  // Add a function to check if a date is in available dates
  const isDateAvailable = useCallback((date) => {
    if (!date || availableDates.length === 0) return true;
    
    const dateStr = moment(date).format('YYYY-MM-DD');
    return availableDates.some(availableDate => 
      moment(availableDate).format('YYYY-MM-DD') === dateStr
    );
  }, [availableDates]);

  // Add a function to highlight available dates in the calendar
  const highlightWithRanges = useMemo(() => {
    return [
      {
        "react-datepicker__day--highlighted-custom": availableDates
      }
    ];
  }, [availableDates]);

  // Update the function to position the calendar correctly
  useEffect(() => {
    if (showCalendar && calendarRef.current) {
      const inputElement = document.querySelector('.custom-calendar-container .form-control');
      if (inputElement) {
        const inputRect = inputElement.getBoundingClientRect();
        calendarRef.current.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
        calendarRef.current.style.left = `${inputRect.left + window.scrollX}px`;
        
        // Ensure the calendar doesn't go off-screen
        const calendarRect = calendarRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        if (calendarRect.right > viewportWidth) {
          // Adjust position if calendar goes off the right edge
          calendarRef.current.style.left = `${viewportWidth - calendarRect.width - 10}px`;
        }
      }
    }
  }, [showCalendar]);

  return (
    <div className="py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className={`shadow-sm mb-4 ${theme === 'dark' ? 'bg-dark text-white' : ''}`}>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="bi bi-table me-2"></i>
              <h4 className="mb-0 d-none d-sm-block">Sensor Data Table</h4>
              <h5 className="mb-0 d-block d-sm-none">Sensor Data</h5>
            </div>
            <div className="d-flex">
              {displayedData.length > 0 && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={exportToCSV}
                  className="me-2 d-none d-md-block"
                  title="Export to CSV"
                >
                  <i className="bi bi-download me-1"></i>
                  Export
                </Button>
              )}
              <Button
                variant={isPolling ? "outline-danger" : "outline-success"}
                size="sm"
                onClick={togglePolling}
                className="me-2"
                title={isPolling ? "Stop Auto-refresh" : "Start Auto-refresh"}
              >
                <i className={`bi ${isPolling ? "bi-pause-circle" : "bi-play-circle"} me-1`}></i>
                <span className="d-none d-md-inline">
                  {isPolling ? "Stop Auto-refresh" : "Start Auto-refresh"}
                </span>
              </Button>
              <Button
                variant="primary"
                size="sm"
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
                title="Refresh Data"
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
                    <span className="d-none d-md-inline">Loading...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    <span className="d-none d-md-inline">Refresh</span>
                  </>
                )}
              </Button>
            </div>
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
            
            <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : 'bg-light'}`}>
              <Card.Body>
                <h5 className="mb-3">
                  <i className="bi bi-funnel me-2"></i>
                  Filter Options
                </h5>
                <Row className="mb-3">
                  <Col lg={3} md={6} className="mb-3 mb-lg-0">
                    <Form.Group>
                      <Form.Label>
                        <i className="bi bi-calendar-date me-2"></i>
                        Filter by Date
                      </Form.Label>
                      <div className="custom-calendar-container">
                        <InputGroup>
                          <Form.Control
                            type="text"
                            placeholder="Select date"
                            value={formatDate(date)}
                            onClick={() => setShowCalendar(!showCalendar)}
                            readOnly
                          />
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => setShowCalendar(!showCalendar)}
                          >
                            <i className="bi bi-calendar"></i>
                          </Button>
                          {date && (
                            <Button 
                              variant="outline-secondary" 
                              onClick={() => setDate(null)}
                            >
                              <i className="bi bi-x"></i>
                            </Button>
                          )}
              </InputGroup>
                        
                        {availableDates.length > 0 && (
                          <small className="text-muted d-block mt-1">
                            <i className="bi bi-info-circle me-1"></i>
                            Only dates with available data are selectable
                          </small>
                        )}
                      </div>
            </Form.Group>
          </Col>
                  <Col lg={3} md={6} className="mb-3 mb-lg-0">
                    <Form.Group>
                      <Form.Label>
                        <i className="bi bi-geo-alt me-2"></i>
                        Filter by Location
                      </Form.Label>
                      {locations.length > 0 ? (
                        <Form.Select
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                        >
                          <option value="">All Locations</option>
                          {locations.map((loc, index) => (
                            <option key={index} value={loc}>{loc.toUpperCase()}</option>
                          ))}
                        </Form.Select>
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
                  <Col lg={3} md={6} className="mb-3 mb-md-0">
                    <Form.Group>
                      <Form.Label>
                        <i className="bi bi-search me-2"></i>
                Search
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="text"
                          placeholder="Search by ID, location..."
                          value={searchTerm}
                          onChange={handleSearch}
                        />
                        {searchTerm && (
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => setSearchTerm('')}
                          >
                            <i className="bi bi-x"></i>
              </Button>
                        )}
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col lg={3} md={6} className="d-flex align-items-end">
                    <Button
                      variant="outline-secondary"
                      onClick={handleReset}
                      className="w-100"
                    >
                      <i className="bi bi-arrow-counterclockwise me-2"></i>
                      Reset Filters
              </Button>
          </Col>
        </Row>
              </Card.Body>
            </Card>
            
            <div className="table-responsive">
              <Table
                striped
                bordered
                hover
                variant={theme === 'dark' ? 'dark' : 'light'}
                className="mb-0"
                responsive
              >
                <thead className="table-header">
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', minWidth: '60px' }}>
                      <div className="d-flex align-items-center">
                        <span>ID</span>
                        <span className="ms-1">{renderSortIndicator('id')}</span>
                      </div>
                    </th>
                    <th onClick={() => handleSort('location')} style={{ cursor: 'pointer', minWidth: '100px' }}>
                      <div className="d-flex align-items-center">
                        <span>Location</span>
                        <span className="ms-1">{renderSortIndicator('location')}</span>
                      </div>
                    </th>
                    <th onClick={() => handleSort('ph_value')} style={{ cursor: 'pointer', minWidth: '90px' }}>
                      <div className="d-flex align-items-center">
                        <span>pH Value</span>
                        <span className="ms-1">{renderSortIndicator('ph_value')}</span>
                      </div>
                    </th>
                    <th onClick={() => handleSort('temperature')} style={{ cursor: 'pointer', minWidth: '140px' }}>
                      <div className="d-flex align-items-center">
                        <span>Temperature (°C)</span>
                        <span className="ms-1">{renderSortIndicator('temperature')}</span>
                      </div>
                    </th>
                    <th onClick={() => handleSort('turbidity')} style={{ cursor: 'pointer', minWidth: '130px' }}>
                      <div className="d-flex align-items-center">
                        <span>Turbidity (NTU)</span>
                        <span className="ms-1">{renderSortIndicator('turbidity')}</span>
                      </div>
                    </th>
                    <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer', minWidth: '180px' }}>
                      <div className="d-flex align-items-center">
                        <span>Timestamp</span>
                        <span className="ms-1">{renderSortIndicator('timestamp')}</span>
                      </div>
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
                        <p className="mt-2 mb-0">Loading data...</p>
                      </td>
                    </tr>
                  ) : displayedData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <i className="bi bi-inbox text-muted" style={{ fontSize: '2rem' }}></i>
                        <p className="mt-2 mb-0">No data available</p>
                      </td>
                    </tr>
                  ) : (
                    getPaginatedData().map((item) => (
                      <tr key={item.id} className={isNewRecord(item) ? 'new-record-row' : ''}>
                        <td>{item.id}</td>
                        <td>
                          <Badge 
                            bg={theme === 'dark' ? 'secondary' : 'light'} 
                            text={theme === 'dark' ? 'light' : 'dark'}
                            className="location-badge"
                          >
                            {item.location.toUpperCase()}
                          </Badge>
                        </td>
                        <td>{item.ph_value.toFixed(2)}</td>
                        <td>{item.temperature.toFixed(2)}</td>
                        <td>{item.turbidity.toFixed(2)}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="bi bi-clock me-1 text-muted"></i>
                            <span>{item.date} {item.time}</span>
                            {isNewRecord(item) && (
                              <Badge bg="success" className="ms-2">NEW</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
              <div className="text-muted mb-2 mb-md-0">
                <i className="bi bi-info-circle me-2"></i>
                <small>
                  {displayedData.length} records found
                  {isPolling && (
                    <span className="ms-2">
                      <i className="bi bi-arrow-repeat me-1"></i>
                      Auto-refreshing every 10 seconds
                    </span>
                  )}
                </small>
              </div>
              <div className="d-flex">
                {displayedData.length > 0 && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={exportToCSV}
                    className="me-2 d-block d-md-none"
                    title="Export to CSV"
                  >
                    <i className="bi bi-download me-1"></i>
                    Export
                  </Button>
                )}
                {isPolling && (
                  <Badge 
                    bg="success" 
                    className="pulse-animation"
                  >
                    <i className="bi bi-arrow-repeat me-1"></i>
                    Live Updates
                  </Badge>
                )}
              </div>
            </div>
          </Card.Footer>
        </Card>
      </motion.div>
      
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : 'bg-light'}`}>
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-bar-chart-line me-2"></i>
            Data Statistics
          </h5>
        </Card.Header>
        <Card.Body>
          {calculateStats() ? (
            <Row>
              <Col md={4} className="mb-3 mb-md-0">
                <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                  <Card.Body>
                    <h6 className="d-flex align-items-center mb-3">
                      <i className="bi bi-water me-2 text-info"></i>
                      pH Value Statistics
                    </h6>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <small>Average pH</small>
                        <small className={`text-${getStatusColor(calculateStats().ph.avg, 'ph')}`}>
                          {calculateStats().ph.avg.toFixed(2)}
                        </small>
                      </div>
                      <ProgressBar 
                        now={(calculateStats().ph.avg / 14) * 100} 
                        variant={getStatusColor(calculateStats().ph.avg, 'ph')} 
                        className="mb-2" 
                        style={{ height: '8px' }} 
                      />
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Min: <strong>{calculateStats().ph.min.toFixed(2)}</strong></span>
                      <span>Max: <strong>{calculateStats().ph.max.toFixed(2)}</strong></span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3 mb-md-0">
                <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                  <Card.Body>
                    <h6 className="d-flex align-items-center mb-3">
                      <i className="bi bi-thermometer-half me-2 text-danger"></i>
                      Temperature Statistics
                    </h6>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <small>Average Temperature</small>
                        <small className={`text-${getStatusColor(calculateStats().temperature.avg, 'temperature')}`}>
                          {calculateStats().temperature.avg.toFixed(2)} °C
                        </small>
                      </div>
                      <ProgressBar 
                        now={(calculateStats().temperature.avg / 40) * 100} 
                        variant={getStatusColor(calculateStats().temperature.avg, 'temperature')} 
                        className="mb-2" 
                        style={{ height: '8px' }} 
                      />
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Min: <strong>{calculateStats().temperature.min.toFixed(2)} °C</strong></span>
                      <span>Max: <strong>{calculateStats().temperature.max.toFixed(2)} °C</strong></span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                  <Card.Body>
                    <h6 className="d-flex align-items-center mb-3">
                      <i className="bi bi-cloud-haze me-2 text-primary"></i>
                      Turbidity Statistics
                    </h6>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <small>Average Turbidity</small>
                        <small className={`text-${getStatusColor(calculateStats().turbidity.avg, 'turbidity')}`}>
                          {calculateStats().turbidity.avg.toFixed(2)} NTU
                        </small>
                      </div>
                      <ProgressBar 
                        now={(calculateStats().turbidity.avg / 30) * 100} 
                        variant={getStatusColor(calculateStats().turbidity.avg, 'turbidity')} 
                        className="mb-2" 
                        style={{ height: '8px' }} 
                      />
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Min: <strong>{calculateStats().turbidity.min.toFixed(2)} NTU</strong></span>
                      <span>Max: <strong>{calculateStats().turbidity.max.toFixed(2)} NTU</strong></span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
            <div className="text-center py-3">
              <i className="bi bi-bar-chart text-muted" style={{ fontSize: '2rem' }}></i>
              <p className="mt-2 mb-0">No data available for statistics</p>
            </div>
          )}
        </Card.Body>
        <Card.Footer>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Based on {calculateStats()?.totalRecords || 0} records from {calculateStats()?.uniqueLocations || 0} locations
              </small>
            </div>
            <div>
              {calculateStats()?.locations.map((loc, index) => (
                <Badge 
                  key={index} 
                  bg="secondary" 
                  className="me-1"
                  style={{ fontSize: '0.7rem' }}
                >
                  {loc.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </Card.Footer>
      </Card>
      
      {displayedData.length > 0 && (
        <div className="pagination-container mt-3 d-flex justify-content-between align-items-center flex-wrap">
          <div className="d-flex align-items-center mb-2 mb-sm-0">
            <Form.Select 
              size="sm" 
              value={rowsPerPage} 
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ width: 'auto' }}
              className="me-2"
            >
              <option value="5">5 rows</option>
              <option value="10">10 rows</option>
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
            </Form.Select>
            <span className="text-muted small">
              Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, displayedData.length)} of {displayedData.length} entries
            </span>
          </div>
          
          <nav aria-label="Data table pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <Button 
                  variant="link" 
                  className="page-link" 
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </Button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <Button 
                  variant="link" 
                  className="page-link" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </Button>
              </li>
              
              {getPageNumbers().map((page, index) => (
                <li 
                  key={index} 
                  className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                >
                  <Button 
                    variant="link" 
                    className="page-link" 
                    onClick={() => page !== '...' && handlePageChange(page)}
                    disabled={page === '...'}
                  >
                    {page}
                  </Button>
                </li>
              ))}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <Button 
                  variant="link" 
                  className="page-link" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <i className="bi bi-chevron-right"></i>
                </Button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <Button 
                  variant="link" 
                  className="page-link" 
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      )}
      
      {/* Render calendar in a portal to avoid containment issues */}
      {showCalendar && (
        <div 
          ref={calendarRef} 
          className={`custom-calendar ${theme === 'dark' ? 'dark-theme' : ''}`}
          style={{ position: 'fixed', zIndex: 1050 }}
        >
          <div className="calendar-header">
            <button 
              className="btn btn-sm btn-link" 
              onClick={() => navigateMonth(-1)}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="month-year">
              {date ? moment(date).format('MMMM YYYY') : moment().format('MMMM YYYY')}
            </span>
            <button 
              className="btn btn-sm btn-link" 
              onClick={() => navigateMonth(1)}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          
          <div className="calendar-days">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
              <div key={index} className="weekday">{day}</div>
            ))}
            
            {generateCalendarDays().map((day, index) => (
              <div 
                key={index} 
                className={`day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''} ${day.isAvailable ? 'available' : 'disabled'}`}
                onClick={() => day.isAvailable && handleDateSelect(day.date)}
              >
                {day.day}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style jsx="true">{`
        .table-header th {
          background-color: ${theme === 'dark' ? '#343a40' : '#f8f9fa'};
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .new-record-row {
          animation: highlight 2s ease-in-out;
        }
        
        .location-badge {
          font-weight: normal;
          font-size: 0.85rem;
        }
        
        @keyframes highlight {
          0% { background-color: rgba(40, 167, 69, 0.2); }
          100% { background-color: transparent; }
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        /* Custom Calendar styles */
        .custom-calendar-container {
          position: relative;
        }
        
        .custom-calendar {
          width: 280px;
          background-color: #fff;
          border: 1px solid #ced4da;
          border-radius: 0.375rem;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
        }
        
        .dark-theme {
          background-color: #343a40;
          border-color: #495057;
          color: #fff;
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .calendar-header button {
          color: ${theme === 'dark' ? '#fff' : '#007bff'};
          padding: 0.25rem 0.5rem;
        }
        
        .dark-theme .calendar-header button {
          color: #fff;
        }
        
        .month-year {
          font-weight: bold;
        }
        
        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        
        .weekday {
          text-align: center;
          font-weight: bold;
          font-size: 0.8rem;
          padding: 0.25rem;
          color: ${theme === 'dark' ? '#adb5bd' : '#6c757d'};
        }
        
        .day {
          text-align: center;
          padding: 0.25rem;
          cursor: pointer;
          border-radius: 0.25rem;
        }
        
        .day:hover {
          background-color: ${theme === 'dark' ? '#495057' : '#e9ecef'};
        }
        
        .day.other-month {
          color: ${theme === 'dark' ? '#6c757d' : '#adb5bd'};
        }
        
        .day.today {
          font-weight: bold;
          border: 1px solid ${theme === 'dark' ? '#6c757d' : '#007bff'};
        }
        
        .day.selected {
          background-color: #007bff;
          color: #fff;
        }
        
        .day.available {
          background-color: ${theme === 'dark' ? 'rgba(13, 110, 253, 0.2)' : 'rgba(0, 123, 255, 0.1)'};
        }
        
        .day.disabled {
          color: ${theme === 'dark' ? '#495057' : '#ced4da'};
          cursor: not-allowed;
          background-color: transparent;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .table-responsive {
            max-height: 60vh;
            overflow-y: auto;
          }
          
          .card-body {
            padding: 0.75rem;
          }
          
          .form-label {
            font-size: 0.9rem;
          }
        }
        
        /* Pagination styles */
        .pagination-container {
          padding: 0.75rem;
          border-top: 1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'};
        }
        
        .pagination .page-link {
          color: ${theme === 'dark' ? '#fff' : '#007bff'};
          background-color: ${theme === 'dark' ? '#343a40' : '#fff'};
          border-color: ${theme === 'dark' ? '#495057' : '#dee2e6'};
        }
        
        .pagination .page-item.active .page-link {
          background-color: ${theme === 'dark' ? '#007bff' : '#007bff'};
          border-color: ${theme === 'dark' ? '#007bff' : '#007bff'};
          color: #fff;
        }
        
        .pagination .page-item.disabled .page-link {
          color: ${theme === 'dark' ? '#6c757d' : '#6c757d'};
          background-color: ${theme === 'dark' ? '#343a40' : '#fff'};
          border-color: ${theme === 'dark' ? '#495057' : '#dee2e6'};
        }
      `}</style>
    </div>
  );
}

export default DataTable;
