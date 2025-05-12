# Multi-Tenant Platform API

A RESTful API service built with Fastify that powers the multi-tenant platform, providing endpoints for tenant management, user administration, competitions, and related features.

## Technologies

- **Framework**: [Fastify](https://fastify.io/)
- **Documentation**: Swagger/OpenAPI via [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- **CORS Support**: [@fastify/cors](https://github.com/fastify/fastify-cors)
- **Build Tool**: NX with esbuild bundler
- **Language**: TypeScript

## Features

- Complete REST API for multi-tenant operations
- API documentation with Swagger UI
- Authentication with API key
- CORS configuration
- Health check endpoint

## API Routes

The API consists of the following main route groups:

- **Tenants** (`/api/tenants`): Tenant management endpoints
- **Users** (`/api/users`): User management endpoints 
- **Competitions** (`/api/competitions`): Competition management endpoints
- **Competition Allowed Schools** (`/api/competition-allowed-schools`): Managing school access to competitions

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- Yarn or NPM
- Nx CLI (installed globally or available via npx)

### Installation

From the root of the project:

```bash
# Install dependencies
npm install

# Or if using Yarn
yarn
```

### Development

To start the API in development mode:

```bash
# Using Nx
nx serve api

# Or directly from the project root
npm run api:serve
```

The API server will start on port 3333 by default.

### Build

To build the API for production:

```bash
nx build api --configuration=production
```

The built files will be output to `dist/api`.

### API Documentation

When the API is running, you can access the Swagger documentation at:

```
http://localhost:3333/docs
```

This provides an interactive interface to explore and test all available endpoints.

## Configuration

The API uses environment variables for configuration. Create a `.env` file in the api directory with the following values:

```
# Server configuration
PORT=3333
HOST=0.0.0.0

# Environment
NODE_ENV=development

# Add any other required environment variables
```

## Authentication

The API uses an API key for authentication. Include the key in the request headers:

```
x-api-key: your-api-key
```

## Health Check

A health check endpoint is available at `/health` which returns the status of the API service.
