# My App

This project consists of three microservices (service1, service2, and service3) that are containerized using Docker. Each service has its own Dockerfile, package.json, and server.js file. The project also includes an SQL initialization script and a Docker Compose file to manage the services.

## Project Structure

```
my-app
├── service1
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── service2
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── service3
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── init.sql
├── docker-compose.yml
└── README.md
```

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd my-app
   ```

2. **Build the Docker images:**
   ```
   docker-compose build
   ```

3. **Run the services:**
   ```
   docker-compose up
   ```

## Services

- **Service 1:** Description of service1 functionality.
- **Service 2:** Description of service2 functionality.
- **Service 3:** Description of service3 functionality.

## Database Initialization

The `init.sql` file contains the SQL commands to set up the database. You can run this script to initialize your database with the necessary tables and data.

## License

This project is licensed under the MIT License. See the LICENSE file for details.