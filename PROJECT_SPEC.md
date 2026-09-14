# CARGO_SYSTEM - Project Specification

## Project Overview

CARGO_SYSTEM is a car rental backend system built with:

- NestJS
- TypeScript
- PostgreSQL
- TypeORM

## Team Responsibilities

### Auth and Users
Responsible for:
- Register
- Login
- Authentication
- Authorization
- Users management

### Cars and Categories
Responsible for:
- Cars CRUD
- Car categories
- Car search and filtering
- Car status management

### Reservations
Responsible for:
- Create reservation
- Cancel reservation
- Track reservation
- Reservation status management

## Main Entities

### User

- id
- name
- email
- password
- role
- createdAt

### CarCategory

- id
- name
- description

### Car

- id
- brand
- model
- year
- pricePerDay
- status
- categoryId

### Reservation

- id
- startDate
- endDate
- status
- userId
- carId

## Enums

### UserRole

- USER
- ADMIN

### CarStatus

- AVAILABLE
- RESERVED
- MAINTENANCE

### ReservationStatus

- PENDING
- CONFIRMED
- CANCELLED
- COMPLETED

## Entity Relationships

- One User can have many Reservations.
- One Car can have many Reservations over time.
- One CarCategory can have many Cars.

## API Responsibilities

### Auth

- POST /auth/register
- POST /auth/login

### Users

- GET /users/profile

### Cars

- GET /cars
- GET /cars/:id
- POST /cars
- PATCH /cars/:id
- DELETE /cars/:id

### Reservations

- POST /reservations
- GET /reservations
- PATCH /reservations/:id/cancel