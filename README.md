# Water360 - Water Quality Monitoring System

## Project Structure

The project is organized as follows:

### Frontend
- `/frontend` - React-based frontend application
  - `/src/components` - Main component files
    - `/features` - Feature-specific components
      - `/auth` - Authentication components (LoginPage, SignupPage, etc.)
    - `/layout` - Layout components (Navbar, Footer, etc.)
    - `/common` - Reusable components
  - `/src/context` - React context providers
  - `/src/hooks` - Custom React hooks
  - `/src/pages` - Static pages
  - `/src/utils` - Utility functions
  - `/src/styles` - CSS files

### Backend
- `/backend` - Flask-based backend application
  - `/api` - API endpoints
    - `/auth` - Authentication endpoints
    - `/data` - Data endpoints
  - `/core` - Core functionality
  - `/scripts` - Database scripts and utilities

### Deployment
- `/K8s` - Kubernetes configuration files

## Authentication

Authentication is implemented using JWT tokens. The authentication flow includes:
- Registration (`/register` endpoint)
- Login (`/login` endpoint)
- Authentication check (`/check` endpoint)
- Logout (`/logout` endpoint)

## Data Visualization

The application provides various data visualization features:
- Dashboard with summary statistics
- Interactive graphs
- Data comparison tools
- Tabular data views