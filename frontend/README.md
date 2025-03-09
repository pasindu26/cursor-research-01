# Water360 Frontend

This is the frontend application for the Water360 project, a comprehensive water quality monitoring and analysis solution.

## Project Structure

The project follows a modular architecture with the following structure:

```
frontend/
├── public/              # Static files
├── src/                 # Source code
│   ├── components/      # React components
│   │   ├── common/      # Reusable UI components
│   │   ├── features/    # Feature-specific components
│   │   ├── layout/      # Layout components
│   │   └── pages/       # Page components
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── styles/          # CSS styles
│   ├── utils/           # Utility functions
│   ├── App.js           # Main application component
│   ├── config.js        # Application configuration
│   └── index.js         # Application entry point
├── .env                 # Environment variables
├── Dockerfile           # Docker configuration
└── package.json         # Dependencies and scripts
```

## Features

- **Authentication**: User login, signup, and session management
- **Dashboard**: Overview of water quality metrics
- **Data Visualization**: Interactive graphs and charts
- **Data Tables**: Tabular data display with sorting and filtering
- **Admin Panel**: User management and system configuration
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **React**: UI library
- **React Router**: Navigation and routing
- **React Bootstrap**: UI components
- **Axios**: HTTP client
- **Chart.js**: Data visualization
- **Bootstrap Icons**: Icon library
- **Framer Motion**: Animations

## Environment Variables

The application uses the following environment variables:

- `REACT_APP_BACKEND_URL`: URL of the backend API server

These variables are injected at runtime through Kubernetes ConfigMaps.

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Create a `.env` file with the required environment variables:

```
REACT_APP_BACKEND_URL=http://localhost:5000
```

4. Start the development server:

```bash
npm start
```

### Building for Production

```bash
npm run build
```

This will create a production-ready build in the `build` directory.

## Docker

The application can be built and run as a Docker container:

```bash
# Build the Docker image
docker build -t water360-frontend .

# Run the container
docker run -p 80:80 -e REACT_APP_BACKEND_URL=http://backend-api-url water360-frontend
```

## Kubernetes Deployment

The application is deployed to Kubernetes using the configuration files in the `K8s/Frontend` directory:

- `frontend-configmap.yaml`: Environment variables
- `frontend-water360.yaml`: Deployment configuration
- `frontend-service.yaml`: Service configuration

## Code Quality

The project includes tools for maintaining code quality:

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting

Run the following commands to check and fix code quality issues:

```bash
# Lint the code
npm run lint

# Fix linting issues
npm run lint:fix

# Format the code
npm run format
```

## Project Structure Best Practices

1. **Components**: Keep components small and focused on a single responsibility
2. **Custom Hooks**: Extract complex logic into custom hooks
3. **Context**: Use context for global state management
4. **Utils**: Keep utility functions pure and well-tested
5. **Config**: Centralize configuration in the config.js file

## Contributing

1. Follow the established project structure
2. Write clean, maintainable code
3. Document your changes
4. Test thoroughly before submitting changes

## License

This project is proprietary and confidential.
