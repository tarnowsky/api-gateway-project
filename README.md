# Cloud-Native Microservice Application with API Gateway Architecture

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)


## Overview

This project showcases a **cloud-native microservice-based application architecture** utilizing an **API Gateway** to provide advanced non-functional properties such as **load balancing**, **fault tolerance**, and **security**. The system is containerized and designed for scalable and resilient deployments.

## Features

- **API Gateway**:
    - Load balancing to distribute requests across service replicas.
    - Secure access using JWT-based authentication or API key authorization.
    - Rate limiting and request validation.
    - Fault tolerance mechanisms (e.g., retries, fallback).
- **Microservices**:
    - `user-service`: Handles user registration, authentication, and management.
    - `product-service`: Manages the list of products.
    - `order-service`: Handles order placement and retrieval.
- **Database per Service**: Each microservice has its own isolated database instance (e.g., PostgreSQL or MongoDB).
- **Containerization**: Fully containerized using Docker and Docker Compose for easy deployment.

## Technologies and Tools

- **API Gateway**: Kong / NGINX / Express Gateway
- **Microservices**: Node.js (Express or NestJS)
- **Databases**: PostgreSQL or MongoDB
- **Security**: JWT / API Key
- **Containerization**: Docker, Docker Compose
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana)

## Architecture

The system consists of three independent microservices exposed to the external world via a centralized **API Gateway**. The API Gateway manages routing, request forwarding, and non-functional concerns, ensuring a secure, scalable, and fault-tolerant architecture.

### Diagram (Placeholder)
```
[Client] --> [API Gateway] --> [user-service | product-service | order-service]
```

## Setup and Deployment

### Prerequisites

- Docker and Docker Compose installed on your machine.
- Node.js (if running services locally).

### Steps

1. Clone the repository:
     ```bash
     git clone https://github.com/your-username/api-gateway-project.git
     cd api-gateway-project
     ```

2. Build and start the services using Docker Compose:
     ```bash
     docker-compose up --build
     ```

3. Access the API Gateway at `http://localhost:<gateway-port>`.

4. Test the microservices via the API Gateway:
     - `user-service`: `http://localhost:<gateway-port>/users`
     - `product-service`: `http://localhost:<gateway-port>/products`
     - `order-service`: `http://localhost:<gateway-port>/orders`
