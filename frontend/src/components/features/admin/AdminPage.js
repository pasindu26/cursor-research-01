import React, { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import {
  Row,
  Col,
  Form,
  Button,
  Table,
  Spinner,
  Alert,
  Modal,
  Pagination,
  Badge,
  Card,
  ProgressBar,
} from 'react-bootstrap';
import apiService from '../../../utils/api';
import moment from 'moment';
import { ThemeContext } from '../../../context/ThemeContext';
import '../../../styles/AdminPage.css';

function AdminPage() {
  const [allData, setAllData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    location: '',
    ph_value: '',
    temperature: '',
    turbidity: '',
    date: moment().format('YYYY-MM-DD'),
    time: moment().format('HH:mm:ss'),
  });
  const [editRecord, setEditRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formErrors, setFormErrors] = useState({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    uniqueLocations: 0,
    avgPh: 0,
    avgTemp: 0,
    avgTurbidity: 0,
    lastUpdated: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteItemDetails, setDeleteItemDetails] = useState(null);
  const [showDataInsights, setShowDataInsights] = useState(false);

  const { theme } = useContext(ThemeContext);

  // Add logging to track component lifecycle
  useEffect(() => {
    console.log('AdminPage mounted');
    
    return () => {
      console.log('AdminPage unmounted');
      if (window.autoRefreshInterval) {
        clearInterval(window.autoRefreshInterval);
      }
    };
  }, []);
  
  // Add logging to track data changes
  useEffect(() => {
    console.log('allData changed, count:', allData.length);
  }, [allData]);
  
  useEffect(() => {
    console.log('displayedData changed, count:', displayedData.length);
  }, [displayedData]);

  // Function to process and normalize data
  const processData = useCallback((data) => {
    return data.map(item => {
      // Create a numeric timestamp for faster sorting
      const dateTimeStr = `${item.date} ${item.time || '00:00:00'}`;
      const timestamp = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      const _timestampNum = moment(dateTimeStr, 'YYYY-MM-DD HH:mm:ss').valueOf();
      
      return {
        ...item,
        timestamp,
        _timestampNum,
        status: item.status || 'active'
      };
    });
  }, []);

  // Apply filters and sorting
  const applyFilters = useCallback((data, dateFilter, locationFilter) => {
    let filteredData = [...data];
    
    // Apply date filter
    if (dateFilter) {
      filteredData = filteredData.filter(item => 
        item.date === dateFilter
      );
    }
    
    // Apply location filter
    if (locationFilter) {
      filteredData = filteredData.filter(item => 
        item.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    
    // Apply search term filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.id.toString().includes(searchTermLower) ||
        item.location.toLowerCase().includes(searchTermLower) ||
        item.ph_value.toString().includes(searchTermLower) ||
        item.temperature.toString().includes(searchTermLower) ||
        item.turbidity.toString().includes(searchTermLower) ||
        item.date.includes(searchTermLower) ||
        (item.time && item.time.includes(searchTermLower))
      );
    }
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => b._timestampNum - a._timestampNum);
    
    return filteredData;
  }, [searchTerm]);

  // Calculate statistics from the data
  const calculateStats = useCallback((data) => {
    if (!data || data.length === 0) return;
    
    const totalRecords = data.length;
    const uniqueLocations = new Set(data.map(item => item.location)).size;
    
    const phValues = data.map(item => parseFloat(item.ph_value)).filter(val => !isNaN(val));
    const tempValues = data.map(item => parseFloat(item.temperature)).filter(val => !isNaN(val));
    const turbidityValues = data.map(item => parseFloat(item.turbidity)).filter(val => !isNaN(val));
    
    const avgPh = phValues.length > 0 
      ? (phValues.reduce((sum, val) => sum + val, 0) / phValues.length).toFixed(2) 
      : 0;
    
    const avgTemp = tempValues.length > 0 
      ? (tempValues.reduce((sum, val) => sum + val, 0) / tempValues.length).toFixed(1) 
      : 0;
    
    const avgTurbidity = turbidityValues.length > 0 
      ? (turbidityValues.reduce((sum, val) => sum + val, 0) / turbidityValues.length).toFixed(2) 
      : 0;
    
    const lastUpdated = data.length > 0 ? moment() : null;
    
    setStats({
      totalRecords,
      uniqueLocations,
      avgPh,
      avgTemp,
      avgTurbidity,
      lastUpdated
    });
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Fetching admin dashboard data...');
      const response = await apiService.admin.getAllData();
      console.log('Admin data response received');
      
      if (response.data && response.data.status === 'success') {
        const sensorData = response.data.data || [];
        const users = response.data.users || [];
        
        console.log(`Received ${users.length} users and ${sensorData.length} sensor records`);
        
        // Process and normalize the data
        const processedData = processData(sensorData);
        
        // Extract unique locations
        const uniqueLocations = [...new Set(processedData.map(item => item.location))];
        setLocations(uniqueLocations);
        
        // Sort by newest first
        const sortedData = [...processedData].sort((a, b) => b._timestampNum - a._timestampNum);
        console.log('Data sorted by newest first');
        
        setAllData(sortedData);
        
        // Calculate statistics
        calculateStats(sortedData);
        
        // Apply filters to the sorted data
        const filteredData = applyFilters(sortedData, filterDate, filterLocation);
        setDisplayedData(filteredData);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [processData, applyFilters, filterDate, filterLocation, calculateStats]);

  // Effect to apply filters when filter values change
  useEffect(() => {
    if (allData.length > 0) {
      const filteredData = applyFilters(allData, filterDate, filterLocation);
      setDisplayedData(filteredData);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filterDate, filterLocation, allData, applyFilters]);

  // Effect to apply filters when search term changes
  useEffect(() => {
    if (allData.length > 0) {
      const filteredData = applyFilters(allData, filterDate, filterLocation);
      setDisplayedData(filteredData);
      setCurrentPage(1); // Reset to first page when search term changes
    }
  }, [searchTerm, allData, filterDate, filterLocation, applyFilters]);

  // Set up auto-refresh
  useEffect(() => {
    // Clear any existing interval
    if (window.autoRefreshInterval) {
      clearInterval(window.autoRefreshInterval);
    }
    
    // Set up new interval if auto-refresh is enabled
    if (autoRefreshEnabled) {
      console.log('Setting up auto-refresh interval (30s)');
      window.autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
    fetchAllData();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (window.autoRefreshInterval) {
        clearInterval(window.autoRefreshInterval);
      }
    };
  }, [fetchAllData, autoRefreshEnabled]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshData = useCallback(() => {
    setSuccessMessage('');
    setError('');
    setIsLoading(true);
    
    // Reset auto-refresh interval
    if (window.autoRefreshInterval) {
      clearInterval(window.autoRefreshInterval);
    }
    
    fetchAllData()
      .then(() => {
        setSuccessMessage('Data refreshed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      })
      .catch(err => {
        console.error('Error refreshing data:', err);
        setError('Failed to refresh data. Please try again.');
      });
      
    // Set up new interval
    if (autoRefreshEnabled) {
      window.autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
        fetchAllData();
      }, 30000);
    }
  }, [fetchAllData, autoRefreshEnabled]);

  const confirmDelete = (id) => {
    const itemToDelete = allData.find(item => item.id === id);
    if (itemToDelete) {
      setDeleteId(id);
      setDeleteItemDetails(itemToDelete);
      setShowDeleteModal(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsSubmitting(true);
    try {
      await apiService.admin.deleteRecord(deleteId);
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteId(null);
      setDeleteItemDetails(null);
      
      // Update local state to reflect deletion
      setAllData(prevData => prevData.filter(item => item.id !== deleteId));
      setDisplayedData(prevData => prevData.filter(item => item.id !== deleteId));
      
      setSuccessMessage('Record deleted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('API Error:', error);
      setError('Failed to delete record. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = (data) => {
    const errors = {};
    
    if (!data.location) errors.location = 'Location is required';
    if (!data.ph_value) errors.ph_value = 'pH value is required';
    if (!data.temperature) errors.temperature = 'Temperature is required';
    if (!data.turbidity) errors.turbidity = 'Turbidity is required';
    
    return errors;
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setFormErrors({});
    
    // Validate form
    const errors = validateForm(newRecord);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Create a timestamp for consistent sorting
      const now = moment();
      const formData = {
        ...newRecord,
        date: newRecord.date || now.format('YYYY-MM-DD'),
        time: newRecord.time || now.format('HH:mm:ss')
      };
      
      console.log('Creating new record with form data:', formData);
      
      // Map frontend fields to backend expected fields
      const backendRecord = {
        ph_value: parseFloat(formData.ph_value),
        temperature: parseFloat(formData.temperature),
        turbidity: parseFloat(formData.turbidity),
        location: formData.location,
        date: formData.date,
        time: formData.time,
        status: formData.status || 'active'
      };
      
      console.log('Sending to backend:', backendRecord);
      
      const response = await apiService.admin.createData(backendRecord);
      console.log('Create response received');
      
      // Close modal and reset form
      setShowCreateModal(false);
      setNewRecord({
        location: '',
        ph_value: '',
        temperature: '',
        turbidity: '',
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
      });
      
      setSuccessMessage('New record created successfully!');
      console.log('New record created');
      
      // Refresh data after a short delay
      setTimeout(() => {
      fetchAllData();
      }, 1000);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error creating record:', error);
      setError('Failed to create record. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record) => {
    setEditRecord({
      ...record,
      ph_value: record.ph_value.toString(),
      temperature: record.temperature.toString(),
      turbidity: record.turbidity.toString()
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    setFormErrors({});
    
    // Validate form
    const errors = validateForm(editRecord);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Create a timestamp for consistent sorting
      const now = moment();
      const formData = {
        ...editRecord,
        date: editRecord.date || now.format('YYYY-MM-DD'),
        time: editRecord.time || now.format('HH:mm:ss')
      };
      
      // Map frontend fields to backend expected fields
      const backendRecord = {
        ph_value: parseFloat(formData.ph_value),
        temperature: parseFloat(formData.temperature),
        turbidity: parseFloat(formData.turbidity),
        location: formData.location,
        date: formData.date,
        time: formData.time
      };
      
      await apiService.admin.updateRecord(editRecord.id, backendRecord);
      
      // Close modal
      setShowEditModal(false);
      setEditRecord(null);
      
      setSuccessMessage('Record updated successfully!');
      
      // Refresh data after a short delay
      setTimeout(() => {
      fetchAllData();
      }, 1000);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('API Error:', error);
      setError('Failed to update record. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayedData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Check if a record is new (less than 1 hour old)
  const isNewRecord = (record) => {
    if (!record.timestamp) return false;
    const recordTime = moment(record.timestamp);
    const oneHourAgo = moment().subtract(1, 'hour');
    return recordTime.isAfter(oneHourAgo);
  };

  const renderTableRows = () => {
    if (currentItems.length === 0) {
  return (
        <tr>
          <td colSpan="8" className="text-center py-4">
      {isLoading ? (
              <div className="d-flex justify-content-center">
          <Spinner animation="border" variant="primary" />
        </div>
            ) : (
              <div className="text-muted">
                <i className="bi bi-inbox fs-4 d-block mb-2"></i>
                No data available
              </div>
            )}
          </td>
              </tr>
      );
    }

    return currentItems.map((item) => (
      <tr key={item.id} className={isNewRecord(item) ? 'new-record-row' : ''}>
        <td>{item.id}</td>
        <td>
          <span className="d-flex align-items-center">
            <i className="bi bi-geo-alt-fill text-primary me-2"></i>
            {item.location}
          </span>
        </td>
        <td>
          <span className={
            item.ph_value < 6.5 ? 'text-danger' : 
            item.ph_value > 8.5 ? 'text-warning' : 
            'text-success'
          }>
            {item.ph_value}
          </span>
        </td>
        <td>
          <span className={
            item.temperature > 30 ? 'text-danger' : 
            item.temperature < 10 ? 'text-info' : 
            ''
          }>
            <i className="bi bi-thermometer-half me-1"></i>
            {item.temperature}°C
          </span>
        </td>
        <td>
          <span className={
            item.turbidity > 5 ? 'text-danger' : 
            item.turbidity < 1 ? 'text-success' : 
            'text-warning'
          }>
            {item.turbidity} NTU
          </span>
        </td>
        <td className="timestamp-cell">
          <span className="d-flex align-items-center">
            <i className="bi bi-calendar-event me-2"></i>
            <span>
              {item.date} <span className="time-part">{item.time}</span>
              {isNewRecord(item) && (
                <Badge bg="success" pill className="ms-2">NEW</Badge>
              )}
            </span>
          </span>
        </td>
        <td>
          <div className="btn-action-group">
                    <Button
              variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
                      size="sm"
              onClick={() => handleEdit(item)}
              className="me-2"
              title="Edit Record"
                    >
              <i className="bi bi-pencil-square"></i>
                    </Button>
                    <Button
              variant="outline-danger"
                      size="sm"
              onClick={() => confirmDelete(item.id)}
              title="Delete Record"
                    >
              <i className="bi bi-trash"></i>
                    </Button>
          </div>
                  </td>
                </tr>
    ));
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    // Calculate which page items to show (to avoid too many page buttons)
    let pageItems = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page button if not included in range
    if (startPage > 1) {
      pageItems.push(
        <Pagination.Item key={1} onClick={() => paginate(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        pageItems.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
      }
    }
    
    // Add page items in the calculated range
    for (let i = startPage; i <= endPage; i++) {
      pageItems.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => paginate(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Add last page button if not included in range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageItems.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
      }
      pageItems.push(
        <Pagination.Item key={totalPages} onClick={() => paginate(totalPages)}>
                  {totalPages}
                </Pagination.Item>
      );
    }

    const startIndex = indexOfFirstItem + 1;
    const endIndex = Math.min(indexOfLastItem, displayedData.length);

    return (
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
        <div className="pagination-info mb-3 mb-md-0">
          <small className="text-muted">
            Showing {startIndex} to {endIndex} of {displayedData.length} records
          </small>
        </div>
        <Pagination className="mb-0">
          <Pagination.First
            onClick={() => paginate(1)}
            disabled={currentPage === 1}
          />
          <Pagination.Prev
            onClick={() => paginate(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          />
          {pageItems}
          <Pagination.Next
            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          />
          <Pagination.Last
            onClick={() => paginate(totalPages)}
            disabled={currentPage === totalPages}
          />
            </Pagination>
      </div>
    );
  };

  const renderCreateModal = () => (
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
      backdrop="static"
      keyboard={false}
        centered
      size="lg"
      className={theme === 'dark' ? 'dark-modal' : ''}
    >
      <Modal.Header closeButton className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2"></i>
          Add New Water Quality Record
        </Modal.Title>
        </Modal.Header>
      <Modal.Body className={theme === 'dark' ? 'bg-dark text-white' : ''}>
          <Form>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Location <span className="text-danger">*</span></Form.Label>
                <Form.Select
                value={newRecord.location}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, location: e.target.value })
                  }
                  isInvalid={!!formErrors.location}
                  className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                >
                  <option value="">Select Location</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                  <option value="new">+ Add New Location</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {formErrors.location}
                </Form.Control.Feedback>
                {newRecord.location === 'new' && (
                  <Form.Control
                    className="mt-2"
                    type="text"
                    placeholder="Enter new location name"
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, newLocationName: e.target.value })
                    }
                  />
                )}
            </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Date & Time</Form.Label>
                <Row>
                  <Col>
                    <Form.Control
                      type="date"
                      value={newRecord.date}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, date: e.target.value })
                      }
                      className={`${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                      style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      type="time"
                      value={newRecord.time}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, time: e.target.value })
                      }
                      className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  pH Value <span className="text-danger">*</span>
                  <small className="text-muted ms-2">(0-14)</small>
                </Form.Label>
              <Form.Control
                type="number"
                  step="0.1"
                  min="0"
                  max="14"
                value={newRecord.ph_value}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, ph_value: e.target.value })
                }
                  isInvalid={!!formErrors.ph_value}
                  className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
              />
                <Form.Control.Feedback type="invalid">
                  {formErrors.ph_value}
                </Form.Control.Feedback>
            </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Temperature <span className="text-danger">*</span>
                  <small className="text-muted ms-2">(°C)</small>
                </Form.Label>
              <Form.Control
                type="number"
                  step="0.1"
                value={newRecord.temperature}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, temperature: e.target.value })
                }
                  isInvalid={!!formErrors.temperature}
                  className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
              />
                <Form.Control.Feedback type="invalid">
                  {formErrors.temperature}
                </Form.Control.Feedback>
            </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Turbidity <span className="text-danger">*</span>
                  <small className="text-muted ms-2">(NTU)</small>
                </Form.Label>
              <Form.Control
                type="number"
                  step="0.01"
                  min="0"
                value={newRecord.turbidity}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, turbidity: e.target.value })
                }
                  isInvalid={!!formErrors.turbidity}
                  className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
              />
                <Form.Control.Feedback type="invalid">
                  {formErrors.turbidity}
                </Form.Control.Feedback>
            </Form.Group>
            </Col>
          </Row>
          </Form>
        </Modal.Body>
      <Modal.Footer className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}>
          <Button
          variant={theme === 'dark' ? 'outline-light' : 'outline-secondary'}
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
        <Button
          variant="success"
          onClick={handleCreate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />{' '}
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-1"></i> Save Record
            </>
          )}
          </Button>
        </Modal.Footer>
      </Modal>
  );

  const renderEditModal = () => (
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
      backdrop="static"
      keyboard={false}
        centered
      size="lg"
      className={theme === 'dark' ? 'dark-modal' : ''}
    >
      <Modal.Header closeButton className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}>
        <Modal.Title>
          <i className="bi bi-pencil-square me-2"></i>
          Edit Water Quality Record
        </Modal.Title>
        </Modal.Header>
      <Modal.Body className={theme === 'dark' ? 'bg-dark text-white' : ''}>
          {editRecord && (
            <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                  value={editRecord.location}
                  onChange={(e) =>
                    setEditRecord({ ...editRecord, location: e.target.value })
                    }
                    isInvalid={!!formErrors.location}
                    className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                  >
                    <option value="">Select Location</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                    <option value="new">+ Add New Location</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.location}
                  </Form.Control.Feedback>
                  {editRecord.location === 'new' && (
                    <Form.Control
                      className="mt-2"
                      type="text"
                      placeholder="Enter new location name"
                      onChange={(e) =>
                        setEditRecord({ ...editRecord, newLocationName: e.target.value })
                      }
                    />
                  )}
              </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date & Time</Form.Label>
                  <Row>
                    <Col>
                      <Form.Control
                        type="date"
                        value={editRecord.date}
                        onChange={(e) =>
                          setEditRecord({ ...editRecord, date: e.target.value })
                        }
                        className={`${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                        style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        type="time"
                        value={editRecord.time}
                        onChange={(e) =>
                          setEditRecord({ ...editRecord, time: e.target.value })
                        }
                        className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                      />
                    </Col>
                  </Row>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    pH Value <span className="text-danger">*</span>
                    <small className="text-muted ms-2">(0-14)</small>
                  </Form.Label>
                <Form.Control
                  type="number"
                    step="0.1"
                    min="0"
                    max="14"
                  value={editRecord.ph_value}
                  onChange={(e) =>
                    setEditRecord({ ...editRecord, ph_value: e.target.value })
                  }
                    isInvalid={!!formErrors.ph_value}
                    className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.ph_value}
                  </Form.Control.Feedback>
              </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Temperature <span className="text-danger">*</span>
                    <small className="text-muted ms-2">(°C)</small>
                  </Form.Label>
                <Form.Control
                  type="number"
                    step="0.1"
                  value={editRecord.temperature}
                  onChange={(e) =>
                    setEditRecord({ ...editRecord, temperature: e.target.value })
                  }
                    isInvalid={!!formErrors.temperature}
                    className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.temperature}
                  </Form.Control.Feedback>
              </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Turbidity <span className="text-danger">*</span>
                    <small className="text-muted ms-2">(NTU)</small>
                  </Form.Label>
                <Form.Control
                  type="number"
                    step="0.01"
                    min="0"
                  value={editRecord.turbidity}
                  onChange={(e) =>
                    setEditRecord({ ...editRecord, turbidity: e.target.value })
                  }
                    isInvalid={!!formErrors.turbidity}
                    className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.turbidity}
                  </Form.Control.Feedback>
              </Form.Group>
              </Col>
            </Row>
            </Form>
          )}
        </Modal.Body>
      <Modal.Footer className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}>
          <Button
          variant={theme === 'dark' ? 'outline-light' : 'outline-secondary'}
            onClick={() => setShowEditModal(false)}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleUpdate}
            disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />{' '}
              Updating...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-1"></i> Update
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // Add a function to render the delete confirmation modal
  const renderDeleteModal = () => (
    <Modal
      show={showDeleteModal}
      onHide={() => setShowDeleteModal(false)}
      centered
      className={theme === 'dark' ? 'dark-modal' : ''}
    >
      <Modal.Header closeButton className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}>
        <Modal.Title>
          <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
          Confirm Deletion
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={theme === 'dark' ? 'bg-dark text-white' : ''}>
        {deleteItemDetails && (
          <>
            <p>Are you sure you want to delete this record?</p>
            <div className="alert alert-secondary">
              <strong>ID:</strong> {deleteItemDetails.id}<br />
              <strong>Location:</strong> {deleteItemDetails.location}<br />
              <strong>Date:</strong> {deleteItemDetails.date} {deleteItemDetails.time}<br />
              <strong>pH Value:</strong> <span className={
                deleteItemDetails.ph_value < 6.5 ? 'text-danger' : 
                deleteItemDetails.ph_value > 8.5 ? 'text-warning' : 
                'text-success'
              }>{deleteItemDetails.ph_value}</span><br />
              <strong>Temperature:</strong> <span className={
                deleteItemDetails.temperature > 30 ? 'text-danger' : 
                deleteItemDetails.temperature < 10 ? 'text-info' : 
                ''
              }>{deleteItemDetails.temperature}°C</span><br />
              <strong>Turbidity:</strong> <span className={
                deleteItemDetails.turbidity > 5 ? 'text-danger' : 
                deleteItemDetails.turbidity < 1 ? 'text-success' : 
                'text-warning'
              }>{deleteItemDetails.turbidity} NTU</span>
            </div>
            <p className="text-danger mb-0">
              <i className="bi bi-info-circle me-1"></i>
              This action cannot be undone.
            </p>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}>
        <Button
          variant={theme === 'dark' ? 'outline-light' : 'outline-secondary'}
          onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />{' '}
              Deleting...
            </>
          ) : (
            <>
              <i className="bi bi-trash me-1"></i> Delete
            </>
          )}
          </Button>
        </Modal.Footer>
      </Modal>
  );

  // Add a function to render the statistics cards
  const renderStatsCards = () => (
    <Row className="mb-4">
      <Col md={4} lg={2} className="mb-3 mb-lg-0">
        <Card className={`stat-card ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
          <Card.Body>
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-database fs-2 text-primary mb-2"></i>
              <h6 className="card-title">Total Records</h6>
              <h3 className="card-value">{stats.totalRecords}</h3>
    </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4} lg={2} className="mb-3 mb-lg-0">
        <Card className={`stat-card ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
          <Card.Body>
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-geo fs-2 text-success mb-2"></i>
              <h6 className="card-title">Locations</h6>
              <h3 className="card-value">{stats.uniqueLocations}</h3>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4} lg={2} className="mb-3 mb-lg-0">
        <Card className={`stat-card ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
          <Card.Body>
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-droplet-half fs-2 text-info mb-2"></i>
              <h6 className="card-title">Avg pH</h6>
              <h3 className="card-value">{stats.avgPh}</h3>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4} lg={2} className="mb-3 mb-lg-0">
        <Card className={`stat-card ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
          <Card.Body>
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-thermometer-half fs-2 text-danger mb-2"></i>
              <h6 className="card-title">Avg Temp</h6>
              <h3 className="card-value">{stats.avgTemp}°C</h3>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4} lg={2} className="mb-3 mb-lg-0">
        <Card className={`stat-card ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
          <Card.Body>
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-water fs-2 text-warning mb-2"></i>
              <h6 className="card-title">Avg Turbidity</h6>
              <h3 className="card-value">{stats.avgTurbidity}</h3>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4} lg={2} className="mb-3 mb-lg-0">
        <Card className={`stat-card ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
          <Card.Body>
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-clock-history fs-2 text-secondary mb-2"></i>
              <h6 className="card-title">Last Updated</h6>
              <p className="card-value fs-6">
                {stats.lastUpdated ? stats.lastUpdated.format('HH:mm:ss') : '-'}
              </p>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Function to calculate data insights
  const calculateDataInsights = useCallback(() => {
    if (allData.length === 0) return null;
    
    // Group data by location
    const locationGroups = {};
    allData.forEach(item => {
      if (!locationGroups[item.location]) {
        locationGroups[item.location] = [];
      }
      locationGroups[item.location].push(item);
    });
    
    // Calculate insights for each location
    const insights = Object.keys(locationGroups).map(location => {
      const items = locationGroups[location];
      const phValues = items.map(item => parseFloat(item.ph_value)).filter(val => !isNaN(val));
      const tempValues = items.map(item => parseFloat(item.temperature)).filter(val => !isNaN(val));
      const turbidityValues = items.map(item => parseFloat(item.turbidity)).filter(val => !isNaN(val));
      
      const avgPh = phValues.length > 0 
        ? (phValues.reduce((sum, val) => sum + val, 0) / phValues.length).toFixed(2) 
        : 0;
      
      const avgTemp = tempValues.length > 0 
        ? (tempValues.reduce((sum, val) => sum + val, 0) / tempValues.length).toFixed(1) 
        : 0;
      
      const avgTurbidity = turbidityValues.length > 0 
        ? (turbidityValues.reduce((sum, val) => sum + val, 0) / turbidityValues.length).toFixed(2) 
        : 0;
      
      // Calculate health score (simplified example)
      const phScore = phValues.length > 0 
        ? Math.max(0, 100 - Math.abs(parseFloat(avgPh) - 7.0) * 20) 
        : 0;
      
      const tempScore = tempValues.length > 0 
        ? Math.max(0, 100 - Math.abs(parseFloat(avgTemp) - 25.0) * 4) 
        : 0;
      
      const turbidityScore = turbidityValues.length > 0 
        ? Math.max(0, 100 - parseFloat(avgTurbidity) * 10) 
        : 0;
      
      const overallScore = Math.round((phScore + tempScore + turbidityScore) / 3);
      
      return {
        location,
        count: items.length,
        avgPh,
        avgTemp,
        avgTurbidity,
        phScore,
        tempScore,
        turbidityScore,
        overallScore
      };
    });
    
    // Sort by overall score (descending)
    return insights.sort((a, b) => b.overallScore - a.overallScore);
  }, [allData]);

  // Function to render the data insights
  const renderDataInsights = () => {
    if (!showDataInsights) return null;
    
    const insights = calculateDataInsights();
    if (!insights || insights.length === 0) {
      return (
        <Alert variant="info">
          No data available for insights.
        </Alert>
      );
    }
    
    return (
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-graph-up me-2"></i>
            Water Quality Insights
          </h5>
          <Button 
            variant="link" 
            className="p-0 text-decoration-none"
            onClick={() => setShowDataInsights(false)}
          >
            <i className="bi bi-x-lg"></i>
          </Button>
        </Card.Header>
        <Card.Body>
          <Row>
            {insights.map(insight => (
              <Col md={6} lg={4} key={insight.location} className="mb-3">
                <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : 'border'}`}>
                  <Card.Body>
                    <Card.Title className="d-flex justify-content-between">
                      <span>
                        <i className="bi bi-geo-alt me-2"></i>
                        {insight.location}
                      </span>
                      <Badge 
                        bg={
                          insight.overallScore >= 80 ? 'success' : 
                          insight.overallScore >= 60 ? 'warning' : 
                          'danger'
                        }
                      >
                        {insight.overallScore}%
                      </Badge>
                    </Card.Title>
                    <Card.Text className="small text-muted mb-3">
                      Based on {insight.count} records
                    </Card.Text>
                    
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>pH Quality ({insight.avgPh})</span>
                        <span>{Math.round(insight.phScore)}%</span>
                      </div>
                      <ProgressBar 
                        variant={
                          insight.phScore >= 80 ? 'success' : 
                          insight.phScore >= 60 ? 'warning' : 
                          'danger'
                        } 
                        now={insight.phScore} 
                        className="mb-2"
                      />
                    </div>
                    
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Temperature ({insight.avgTemp}°C)</span>
                        <span>{Math.round(insight.tempScore)}%</span>
                      </div>
                      <ProgressBar 
                        variant={
                          insight.tempScore >= 80 ? 'success' : 
                          insight.tempScore >= 60 ? 'warning' : 
                          'danger'
                        } 
                        now={insight.tempScore} 
                        className="mb-2"
                      />
                    </div>
                    
                    <div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>Turbidity ({insight.avgTurbidity} NTU)</span>
                        <span>{Math.round(insight.turbidityScore)}%</span>
                      </div>
                      <ProgressBar 
                        variant={
                          insight.turbidityScore >= 80 ? 'success' : 
                          insight.turbidityScore >= 60 ? 'warning' : 
                          'danger'
                        } 
                        now={insight.turbidityScore}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    );
  };

  // Function to export data to CSV
  const exportToCSV = () => {
    // Only export displayed data (after filtering)
    const dataToExport = displayedData;
    
    if (dataToExport.length === 0) {
      setError('No data to export');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Define CSV headers
    const headers = ['ID', 'Location', 'pH Value', 'Temperature', 'Turbidity', 'Date', 'Time'];
    
    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(item => [
        item.id,
        `"${item.location}"`, // Wrap in quotes to handle commas in location names
        item.ph_value,
        item.temperature,
        item.turbidity,
        item.date,
        item.time
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set up download attributes
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    link.setAttribute('href', url);
    link.setAttribute('download', `water_quality_data_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    // Append to document, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    setSuccessMessage('Data exported successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Add a function to render the loading overlay
  const renderLoadingOverlay = () => {
    if (!isLoading) return null;
    
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading data...</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`admin-dashboard ${theme}`}>
      <h2 className="mb-4">Admin Dashboard</h2>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      
      {/* Loading Overlay */}
      {renderLoadingOverlay()}
      
      {/* Statistics Cards */}
      {renderStatsCards()}
      
      {/* Data Insights */}
      {renderDataInsights()}
      
      {/* Show/Hide Insights Button */}
      {!showDataInsights && (
        <Button 
          variant={theme === 'dark' ? 'outline-light' : 'outline-primary'} 
          className="mb-4"
          onClick={() => setShowDataInsights(true)}
        >
          <i className="bi bi-graph-up me-2"></i>
          Show Water Quality Insights
        </Button>
      )}

      <Card className={`filter-card mb-4 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
        <Card.Body>
          <Card.Title className="mb-3">Filter Options</Card.Title>
          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <div className="search-input-wrapper">
                  <Form.Control
                    type="text"
                    placeholder="Search by ID, location, values, or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                  />
                  {searchTerm && (
                    <Button 
                      variant="link" 
                      className="search-clear-btn"
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="bi bi-x-circle"></i>
                    </Button>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  <i className="bi bi-calendar3 me-2"></i>
                  Filter by Date
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className={`${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                    style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                  />
                  {filterDate && (
                    <Button
                      variant="link"
                      className="position-absolute top-50 end-0 translate-middle-y pe-2"
                      onClick={() => setFilterDate('')}
                      style={{ color: theme === 'dark' ? '#6c757d' : undefined }}
                    >
                      <i className="bi bi-x-circle"></i>
                    </Button>
                  )}
                </div>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Location</Form.Label>
                <Form.Select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className={theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button
                variant={theme === 'dark' ? 'outline-light' : 'outline-secondary'}
                onClick={() => {
                  setFilterDate('');
                  setFilterLocation('');
                  setSearchTerm('');
                }}
                className="me-2"
              >
                <i className="bi bi-x-circle me-1"></i> Clear Filters
              </Button>
              <Button
                variant="primary"
                onClick={refreshData}
                disabled={isLoading}
              >
                {isLoading ? (
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
                  <><i className="bi bi-arrow-clockwise me-1"></i> Refresh</>
                )}
              </Button>
            </Col>
            <Col md={3} className="d-flex align-items-end justify-content-end">
              <Form.Check
                type="switch"
                id="auto-refresh-switch"
                label="Auto-refresh"
                checked={autoRefreshEnabled}
                onChange={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className="me-3"
              />
              <Button
                variant="success"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-plus-circle me-1"></i> Add New Record
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className={`mb-4 ${theme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-center mb-3">
            <span>Water Quality Data</span>
            <Badge bg="info" className="fs-6">
              {displayedData.length} Records
            </Badge>
          </Card.Title>
          <div className="table-responsive">
            <Table striped bordered hover variant={theme === 'dark' ? 'dark' : 'light'} className="table-fixed mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Location</th>
                  <th>pH Value</th>
                  <th>Temperature</th>
                  <th>Turbidity</th>
                  <th className="timestamp-cell">Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{renderTableRows()}</tbody>
            </Table>
          </div>
        </Card.Body>
        <Card.Footer className={`d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-dark border-secondary' : 'bg-light'}`}>
          {renderPagination()}
          <Button 
            variant={theme === 'dark' ? 'outline-light' : 'outline-primary'}
            size="sm"
            onClick={exportToCSV}
            disabled={displayedData.length === 0}
            className="ms-2"
            title="Export displayed data to CSV"
          >
            <i className="bi bi-download me-1"></i> Export CSV
          </Button>
        </Card.Footer>
      </Card>
      
      {renderCreateModal()}
      {renderEditModal()}
      {renderDeleteModal()}
    </div>
  );
}

export default AdminPage;
