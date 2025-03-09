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
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => b._timestampNum - a._timestampNum);
    
    return filteredData;
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
  }, [processData, applyFilters, filterDate, filterLocation]);

  // Effect to apply filters when filter values change
  useEffect(() => {
    if (allData.length > 0) {
      const filteredData = applyFilters(allData, filterDate, filterLocation);
      setDisplayedData(filteredData);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filterDate, filterLocation, allData, applyFilters]);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }
    
    console.log('Deleting record:', id);
    setIsLoading(true);
    setError('');
    
    try {
      await apiService.admin.deleteRecord(id);
      setSuccessMessage('Record deleted successfully!');
      
      // Update local state without a full refresh
      const updatedData = allData.filter(item => item.id !== id);
      setAllData(updatedData);
      
      // Apply filters to the updated data
      const filteredData = applyFilters(updatedData, filterDate, filterLocation);
      setDisplayedData(filteredData);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // Refresh data after a short delay to ensure backend has processed the deletion
      setTimeout(() => {
        fetchAllData();
      }, 1000);
    } catch (error) {
      console.error('Error deleting record:', error);
      setError('Failed to delete record. Please try again later.');
    } finally {
      setIsLoading(false);
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
          <td colSpan="8" className="text-center">
            {isLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              'No data available'
            )}
          </td>
        </tr>
      );
    }

    return currentItems.map((item) => (
      <tr key={item.id} className={isNewRecord(item) ? 'new-record-row' : ''}>
        <td>{item.id}</td>
        <td>{item.location}</td>
        <td>{item.ph_value}</td>
        <td>{item.temperature}</td>
        <td>{item.turbidity}</td>
        <td>
          {item.date} {item.time}
          {isNewRecord(item) && (
            <Badge bg="success" className="ms-2">NEW</Badge>
          )}
        </td>
        <td>
          <Button
            variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
            size="sm"
            onClick={() => handleEdit(item)}
            className="me-2"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(item.id)}
          >
            Delete
          </Button>
        </td>
      </tr>
    ));
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageItems = [];
    for (let i = 1; i <= totalPages; i++) {
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

    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.Prev
          onClick={() => paginate(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        />
        {pageItems}
        <Pagination.Next
          onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        />
      </Pagination>
    );
  };

  const renderCreateModal = () => (
    <Modal
      show={showCreateModal}
      onHide={() => setShowCreateModal(false)}
      centered
      className={theme === 'dark' ? 'dark-modal' : ''}
    >
      <Modal.Header closeButton>
        <Modal.Title>Create New Record</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            {locations.length > 0 ? (
              <Form.Control
                as="select"
                value={newRecord.location}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, location: e.target.value })
                }
                isInvalid={!!formErrors.location}
              >
                <option value="">Select Location</option>
                {locations.map((loc, index) => (
                  <option key={index} value={loc}>{loc}</option>
                ))}
              </Form.Control>
            ) : (
              <Form.Control
                type="text"
                placeholder="Enter location"
                value={newRecord.location}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, location: e.target.value })
                }
                isInvalid={!!formErrors.location}
              />
            )}
            <Form.Control.Feedback type="invalid">
              {formErrors.location}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>pH Value</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              placeholder="Enter pH value"
              value={newRecord.ph_value}
              onChange={(e) =>
                setNewRecord({ ...newRecord, ph_value: e.target.value })
              }
              isInvalid={!!formErrors.ph_value}
            />
            <Form.Control.Feedback type="invalid">
              {formErrors.ph_value}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Temperature</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              placeholder="Enter temperature"
              value={newRecord.temperature}
              onChange={(e) =>
                setNewRecord({ ...newRecord, temperature: e.target.value })
              }
              isInvalid={!!formErrors.temperature}
            />
            <Form.Control.Feedback type="invalid">
              {formErrors.temperature}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Turbidity</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              placeholder="Enter turbidity"
              value={newRecord.turbidity}
              onChange={(e) =>
                setNewRecord({ ...newRecord, turbidity: e.target.value })
              }
              isInvalid={!!formErrors.turbidity}
            />
            <Form.Control.Feedback type="invalid">
              {formErrors.turbidity}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={newRecord.date}
              onChange={(e) =>
                setNewRecord({ ...newRecord, date: e.target.value })
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Time</Form.Label>
            <Form.Control
              type="time"
              value={newRecord.time}
              onChange={(e) =>
                setNewRecord({ ...newRecord, time: e.target.value })
              }
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => setShowCreateModal(false)}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
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
              Creating...
            </>
          ) : (
            'Create'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      show={showEditModal}
      onHide={() => setShowEditModal(false)}
      centered
      className={theme === 'dark' ? 'dark-modal' : ''}
    >
      <Modal.Header closeButton>
        <Modal.Title>Edit Record</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {editRecord && (
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              {locations.length > 0 ? (
                <Form.Control
                  as="select"
                  value={editRecord.location}
                  onChange={(e) =>
                    setEditRecord({ ...editRecord, location: e.target.value })
                  }
                  isInvalid={!!formErrors.location}
                >
                  <option value="">Select Location</option>
                  {locations.map((loc, index) => (
                    <option key={index} value={loc}>{loc}</option>
                  ))}
                </Form.Control>
              ) : (
                <Form.Control
                  type="text"
                  placeholder="Enter location"
                  value={editRecord.location}
                  onChange={(e) =>
                    setEditRecord({ ...editRecord, location: e.target.value })
                  }
                  isInvalid={!!formErrors.location}
                />
              )}
              <Form.Control.Feedback type="invalid">
                {formErrors.location}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>pH Value</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="Enter pH value"
                value={editRecord.ph_value}
                onChange={(e) =>
                  setEditRecord({ ...editRecord, ph_value: e.target.value })
                }
                isInvalid={!!formErrors.ph_value}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.ph_value}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Temperature</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="Enter temperature"
                value={editRecord.temperature}
                onChange={(e) =>
                  setEditRecord({ ...editRecord, temperature: e.target.value })
                }
                isInvalid={!!formErrors.temperature}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.temperature}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Turbidity</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="Enter turbidity"
                value={editRecord.turbidity}
                onChange={(e) =>
                  setEditRecord({ ...editRecord, turbidity: e.target.value })
                }
                isInvalid={!!formErrors.turbidity}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.turbidity}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={editRecord.date}
                onChange={(e) =>
                  setEditRecord({ ...editRecord, date: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control
                type="time"
                value={editRecord.time}
                onChange={(e) =>
                  setEditRecord({ ...editRecord, time: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
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
            'Update'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className={`admin-dashboard ${theme}`}>
      <h2 className="mb-4">Admin Dashboard</h2>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <Row className="mb-4">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filter by Date</Form.Label>
            <Form.Control
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filter by Location</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter location"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3} className="d-flex align-items-end">
          <Button
            variant="secondary"
            onClick={() => {
              setFilterDate('');
              setFilterLocation('');
            }}
            className="me-2"
          >
            Clear Filters
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
              'Refresh'
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
            Add New Record
          </Button>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table striped bordered hover variant={theme === 'dark' ? 'dark' : 'light'}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Location</th>
              <th>pH Value</th>
              <th>Temperature</th>
              <th>Turbidity</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderTableRows()}</tbody>
        </Table>
      </div>

      {renderPagination()}
      {renderCreateModal()}
      {renderEditModal()}
    </div>
  );
}

export default AdminPage;
