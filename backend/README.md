# Water360 Backend

A Flask-based RESTful API for the Water360 water quality monitoring application.

## Project Structure

```
backend/
├── Dockerfile            # Container configuration
├── requirements.txt      # Python dependencies
├── app.py               # Application entry point
├── config/              # Configuration management
├── api/                 # API endpoints
│   ├── auth/            # Authentication endpoints
│   ├── data/            # Data management endpoints
│   └── graphs/          # Graph data endpoints
├── core/                # Core application components
├── models/              # Shared models
├── services/            # Shared services
├── utils/               # Utility functions
└── kubernetes/          # Kubernetes deployment manifests
```

## Getting Started

### Local Development

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set environment variables:
   ```
   export FLASK_ENV=development
   export MYSQL_HOST=localhost
   export MYSQL_USER=yourusername
   export MYSQL_PASSWORD=yourpassword
   export MYSQL_DB=water360
   export JWT_SECRET_KEY=yoursecretkey
   ```

4. Run the application:
   ```
   python app.py
   ```

### Docker Development

1. Build the Docker image:
   ```
   docker build -t water360/backend:latest .
   ```

2. Run the container:
   ```
   docker run -p 5000:5000 \
     -e MYSQL_HOST=host.docker.internal \
     -e MYSQL_USER=yourusername \
     -e MYSQL_PASSWORD=yourpassword \
     -e MYSQL_DB=water360 \
     -e JWT_SECRET_KEY=yoursecretkey \
     water360/backend:latest
   ```

## API Endpoints

### Authentication

- `POST /api/auth/login`: User login
- `POST /api/auth/signup`: User registration
- `GET /api/auth/check`: Validate authentication token
- `POST /api/auth/logout`: User logout

### Data

- `GET /api/data/all`: Get all sensor data
- `GET /api/data/recent`: Get recent sensor data
- `POST /api/data/create`: Create new sensor data record
- `PUT /api/data/update/:id`: Update existing sensor data record
- `DELETE /api/data/delete/:id`: Delete sensor data record

### Graphs

- `GET /api/graphs/data`: Get graph data for visualization
- `GET /api/graphs/compare`: Get comparative graph data

## Kubernetes Deployment

1. Create Kubernetes secrets:
   ```
   kubectl create secret generic water360-secrets \
     --from-literal=MYSQL_USER=yourusername \
     --from-literal=MYSQL_PASSWORD=yourpassword \
     --from-literal=JWT_SECRET_KEY=yoursecretkey
   ```

2. Apply Kubernetes manifests:
   ```
   kubectl apply -f kubernetes/configmap.yaml
   kubectl apply -f kubernetes/deployment.yaml
   kubectl apply -f kubernetes/service.yaml
   kubectl apply -f kubernetes/ingress.yaml
   ```

## Contributing

1. Follow the project structure
2. Use the established patterns for route handlers and services
3. Write tests for new functionality
4. Document your changes

## License

This project is licensed under the MIT License - see the LICENSE file for details. 