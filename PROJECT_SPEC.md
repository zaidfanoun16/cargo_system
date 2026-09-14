
# CARGO_SYSTEM - Project Specification

## 1. Project Overview

CARGO_SYSTEM is a backend system for renting cars.

### Technologies

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- JWT Authentication
- REST API

---

## 2. Team Responsibilities

### Developer 1: Auth and Users

Responsible for:

- User registration
- User login
- Password hashing
- JWT authentication
- Access token
- Refresh token
- Authentication guards
- Roles guards
- User profile
- User management

Main folders:

- `src/auth/`
- `src/users/`

### Developer 2: Cars and Categories

Responsible for:

- Cars CRUD
- Car categories CRUD
- Cars search
- Cars filtering
- Car status management

Main folders:

- `src/cars/`
- `src/car-categories/`

### Shared Responsibility: Reservations

Reservations connect Users and Cars.

Both developers must coordinate on:

- Reservation entity
- Reservation creation
- Reservation cancellation
- Reservation confirmation
- Date conflict validation
- Reservation permissions

Main folder:

- `src/reservations/`

---

## 3. Main Entities

### 3.1 User

Fields:

- `id`: number, primary key
- `fullName`: string
- `email`: string, unique
- `passwordHash`: string
- `role`: UserRole
- `createdAt`: Date
- `updatedAt`: Date

Rules:

- Email must be unique.
- Password must be stored as a hash.
- Default role is `USER`.
- Users cannot change their own role.
- Only Admin can change a user's role.

---

### 3.2 CarCategory

Fields:

- `id`: number, primary key
- `name`: string, unique
- `description`: string, optional
- `createdAt`: Date
- `updatedAt`: Date

Rules:

- Category name must be unique.
- A category can contain many cars.
- Do not delete a category if it contains cars.

---

### 3.3 Car

Fields:

- `id`: number, primary key
- `brand`: string
- `model`: string
- `year`: number
- `color`: string
- `pricePerDay`: decimal
- `status`: CarStatus
- `categoryId`: number, foreign key
- `createdAt`: Date
- `updatedAt`: Date

Rules:

- License plate must be unique.
- `pricePerDay` must be greater than zero.
- Car year must be valid.
- Cars under maintenance cannot be reserved.
- Only Admin can create, update, or delete cars.

---

### 3.4 Reservation

Fields:

- `id`: number, primary key
- `startDate`: Date
- `endDate`: Date
- `status`: ReservationStatus
- `userId`: number, foreign key
- `carId`: number, foreign key
- `createdAt`: Date
- `updatedAt`: Date

Rules:

- `startDate` must be before `endDate`.
- Reservation dates cannot be in the past.
- A car cannot have overlapping reservations.
- A normal user can see only their own reservations.
- Admin can see all reservations.
- A user can cancel their reservation before it starts.
- Admin can confirm, cancel, or complete reservations.

---

## 4. Enums

### 4.1 UserRole

```text
USER
ADMIN
```

Default:

```text
USER
```

---

### 4.2 CarStatus

```text
AVAILABLE
MAINTENANCE
INACTIVE
```

Meaning:

- `AVAILABLE`: Car can be reserved.
- `MAINTENANCE`: Car is under maintenance.
- `INACTIVE`: Car is hidden or not active.

Note:

- We do not use `RESERVED` as a permanent car status.
- Reservation availability is checked using reservation dates.

---

### 4.3 ReservationStatus

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

Allowed flow:

```text
PENDING → CONFIRMED
PENDING → CANCELLED
CONFIRMED → COMPLETED
CONFIRMED → CANCELLED
```

Rules:

- New reservations start as `PENDING`.
- Admin confirms reservations.
- Cancelled reservations cannot become active again.
- Completed reservations cannot be cancelled.

---

## 5. Entity Relationships

### User and Reservation

```text
One User → Many Reservations
```

```text
User 1 ──── * Reservation
```

### Car and Reservation

```text
One Car → Many Reservations over time
```

```text
Car 1 ──── * Reservation
```

### CarCategory and Car

```text
One CarCategory → Many Cars
```

```text
CarCategory 1 ──── * Car
```

---

## 6. Authentication and Authorization

### Public Endpoints

- Register
- Login
- View cars
- View car categories

### User Permissions

A normal user can:

- Register
- Login
- View cars
- View categories
- Create reservations
- View their own reservations
- Cancel their own reservation before it starts
- View and update their profile

A normal user cannot:

- Create cars
- Update cars
- Delete cars
- Manage categories
- View other users' reservations
- Change their role to Admin

### Admin Permissions

Admin can:

- Manage users
- Manage cars
- Manage categories
- View all reservations
- Confirm reservations
- Cancel reservations
- Complete reservations
- Change user roles

---

## 7. API Endpoints

### Authentication

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/refresh` | Authenticated | Refresh access token |

### Users

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/users/profile` | User/Admin | Get current user profile |
| PATCH | `/users/profile` | User/Admin | Update current profile |
| GET | `/users` | Admin | Get all users |
| GET | `/users/:id` | Admin | Get user by ID |
| PATCH | `/users/:id/role` | Admin | Change user role |

### Car Categories

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/car-categories` | Public | Get all categories |
| GET | `/car-categories/:id` | Public | Get category by ID |
| POST | `/car-categories` | Admin | Create category |
| PATCH | `/car-categories/:id` | Admin | Update category |
| DELETE | `/car-categories/:id` | Admin | Delete category |

### Cars

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/cars` | Public | Get all cars |
| GET | `/cars/:id` | Public | Get car by ID |
| POST | `/cars` | Admin | Create car |
| PATCH | `/cars/:id` | Admin | Update car |
| DELETE | `/cars/:id` | Admin | Delete car |

### Reservations

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/reservations` | User | Create reservation |
| GET | `/reservations/my` | User | Get current user's reservations |
| GET | `/reservations` | Admin | Get all reservations |
| GET | `/reservations/:id` | Owner/Admin | Get reservation details |
| PATCH | `/reservations/:id/cancel` | Owner/Admin | Cancel reservation |
| PATCH | `/reservations/:id/confirm` | Admin | Confirm reservation |
| PATCH | `/reservations/:id/complete` | Admin | Complete reservation |

---

## 8. Reservation Rules

When creating a reservation, the system must check:

1. User is authenticated.
2. Car exists.
3. Car status is not `MAINTENANCE`.
4. Car status is not `INACTIVE`.
5. Start date is before end date.
6. Dates are not in the past.
7. There is no overlapping reservation.
8. New reservation status is `PENDING`.

### Example

Existing reservation:

```text
10/10 → 15/10
```

Not allowed:

```text
12/10 → 18/10
```

Allowed:

```text
16/10 → 20/10
```

---

## 9. Shared Files Rules

The following files are shared between both developers:

- `src/main.ts`
- `src/app.module.ts`
- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`
- `PROJECT_SPEC.md`

Rules:

1. Do not modify shared files without informing the other developer.
2. Shared changes must be committed and pushed.
3. Shared changes must enter `main` through a Pull Request.
4. Both developers must pull the latest `main` after merging.
5. Never commit `.env`.
6. Never commit database passwords or secrets.

---

## 10. Git Workflow

### Feature Branches

Developer 1:

```text
feature/auth-users
```

Developer 2:

```text
feature/cars-categories
```

### Rules

- Do not work directly on `main`.
- Each feature must have its own branch.
- Use clear commit messages.
- Open a Pull Request before merging.
- Review changes before merging.
- Pull the latest `main` before starting new work.

---

## 11. Development Order

### Phase 1: Shared Setup

- PostgreSQL connection
- TypeORM configuration
- Environment variables
- Global validation
- Project specification

### Phase 2: Auth and Users

- User entity
- Register
- Login
- JWT
- Guards
- Roles
- User profile

### Phase 3: Cars and Categories

- Category entity
- Car entity
- Categories CRUD
- Cars CRUD
- Search
- Filtering

### Phase 4: Reservations

- Reservation entity
- Create reservation
- Date conflict validation
- Cancel reservation
- Confirm reservation
- Complete reservation

### Phase 5: Testing

- Postman testing
- Swagger documentation
- Validation testing
- Authorization testing
- Error handling