# Multi-Tenant Platform

A scalable, modern multi-tenant application platform built with Nx, React, and Express.

## Project Overview

The multi-tenant platform is a monorepo project managed by Nx that consists of:

- A React web application (`web`)
- An Express-based API server (`api`)
- Shared library code (`libs`)
- End-to-end testing infrastructure (`web-e2e`)

## Project Structure

```
multi-tenant-platform/
├── api/                  # Backend Express application
│   ├── src/              # API source code
│   └── project.json      # API project configuration
├── web/                  # Frontend React application
│   ├── src/              # Web app source code
│   └── project.json      # Web project configuration
├── libs/                 # Shared libraries
│   ├── types/            # Shared TypeScript types
│   └── ui/               # Shared UI components
├── web-e2e/              # End-to-end tests with Playwright
├── nx.json               # Nx workspace configuration
└── package.json          # Project dependencies and scripts
```

## Key Features

### 1. Multi-Tenancy Support

The platform implements multi-tenancy through:

- Tenant identification middleware in the API
- Extraction of tenant ID from request headers (`x-tenant-id`)
- Tenant-specific data handling in API endpoints

### 2. Frontend Application

- Built with React 19
- Uses Vite as the bundler
- Basic application structure with modular components
- CSS styling support (with CSS modules capability)

### 3. Backend API

- Express.js server with RESTful endpoints
- Environment variable configuration with dotenv
- CORS support for cross-origin requests
- JSON body parsing middleware
- Error handling middleware

### 4. Authentication

- Mock authentication system with `/api/auth/login` endpoint
- JWT token-based authentication (currently mocked)
- User data structure with tenant association

### 5. Build System & Development Workflow

- Nx-based build and development tools
- Parallel execution of frontend and backend
- Separate build configurations for development and production
- ESBuild for API transpilation and bundling

### 6. Testing Infrastructure

- Jest setup for unit testing
- Playwright configuration for end-to-end testing
- Test script automation through Nx commands

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/multi-tenant-platform.git
cd multi-tenant-platform

# Install dependencies
npm install
```

### Development

```bash
# Start both frontend and backend in development mode
npm run dev

# Start only the frontend
npm start

# Start only the backend
npm run start:api
```

### Building for Production

```bash
# Build both frontend and backend
npm run build:all

# Build only the frontend
npm run build

# Build only the backend
npm run build:api
```

### Testing

```bash
# Run all tests
npm run test:all

# Run frontend tests
npm test

# Run backend tests
npm run test:api

# Run end-to-end tests
npm run e2e
```

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the web application |
| `npm run start:api` | Start the API server |
| `npm run dev` | Run both web and API in parallel (development mode) |
| `npm run build` | Build the web application |
| `npm run build:api` | Build the API server |
| `npm run build:all` | Build both web and API in parallel |
| `npm run test` | Run web application tests |
| `npm run test:api` | Run API tests |
| `npm run test:all` | Run all tests in the workspace |
| `npm run e2e` | Run end-to-end tests with Playwright |
| `npm run lint` | Lint the web code |
| `npm run lint:all` | Lint all code in the workspace |
| `npm run format` | Format code with Prettier |
| `npm run clean` | Reset Nx cache and remove node_modules |
| `npm run update` | Update Nx and dependencies |

## Technology Stack

- **Frontend**: React 19, Vite, CSS Modules, TailwindCSS
- **Backend**: Express, Node.js, TypeScript
- **Testing**: Jest, Playwright
- **Build Tools**: Nx, ESBuild, Vite
- **Other**: TypeScript, dotenv for environment configuration

## Future Development

The current implementation provides a foundation for a multi-tenant application with the following potential expansion areas:

- Database integration with tenant isolation
- More robust authentication and authorization
- User and permission management per tenant

## License

This project is licensed under the MIT License - see the LICENSE file for details.
