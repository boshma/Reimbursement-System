# Reimbursement System API Documentation

This document outlines the API endpoints for the Reimbursement System, designed to manage employee reimbursement requests within an organization. It includes all required HTTP requests, expected responses, and details about the data models.

## Authentication Requirements

Most API endpoints require authentication using a JWT token passed in the request header:

```
x-auth-token: your-jwt-token
```

## Data Models

### User Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the user. |
| username | string | Unique username for authentication. |
| password | string | Hashed password (not returned in API responses). |
| firstName | string | User's first name. |
| lastName | string | User's last name. |
| email | string | User's email address. |
| address | string | User's physical address. |
| role | string | User role: "EMPLOYEE" or "MANAGER". |
| profilePictureKey | string | S3 key for the user's profile picture (if any). |
| createdAt | timestamp | Timestamp when the user was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the user was last updated (ISO 8601). |

### Ticket Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the ticket. |
| userId | string | ID of the user who created the ticket. |
| amount | number | Reimbursement amount. |
| description | string | Description of the reimbursement request. |
| status | string | Status: "PENDING", "APPROVED", "DENIED". |
| reimbursementType | string | Type: "TRAVEL", "LODGING", "FOOD", or "OTHER". |
| receiptKey | string | S3 key for the receipt image (if uploaded). |
| processedBy | string | ID of the manager who processed the ticket. |
| processedAt | timestamp | Timestamp when the ticket was processed (ISO 8601). |
| createdAt | timestamp | Timestamp when the ticket was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the ticket was last updated (ISO 8601). |

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get authentication token |
| GET | /api/auth/profile | Get user profile |
| PATCH | /api/auth/profile | Update user profile |
| PATCH | /api/auth/users/:userId/role | Update user role (Manager only) |
| PATCH | /api/auth/profile/picture | Upload/update profile picture |
| POST | /api/tickets | Create a new reimbursement ticket |
| GET | /api/tickets/users/:userId/tickets | Get specific user's tickets |
| GET | /api/tickets | Get all tickets (Manager only) |
| PATCH | /api/tickets/users/:userId/tickets/:ticketId/status | Process a ticket (Manager only) |

## 1. Authentication Endpoints

### 1.1 Register a New User

`POST /api/auth/register`

This endpoint allows users to create a new account. All new users are registered with the "EMPLOYEE" role by default.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "username": "employee1",
    "password": "Employee123!",
    "firstName": "Jane",
    "lastName": "Employee",
    "email": "jane.employee@example.com",
    "address": "456 Oak St, Anytown, USA"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Unique username |
| password | string | Yes | Password |
| firstName | string | No | User's first name |
| lastName | string | No | User's last name |
| email | string | No | User's email address |
| address | string | No | User's physical address |

#### Response

**201 Created**
```json
{
    "message": "User registered successfully",
    "user": {
        "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "username": "employee1",
        "firstName": "Jane",
        "lastName": "Employee",
        "email": "jane.employee@example.com",
        "address": "456 Oak St, Anytown, USA",
        "role": "EMPLOYEE",
        "createdAt": "2025-03-18T15:46:24.506Z",
        "updatedAt": "2025-03-18T15:46:24.506Z"
    }
}
```

**400 Bad Request**
```json
{
    "message": "Username and password are required"
}
```
```json
{
    "message": "Username already exists"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 1.2 Login

`POST /api/auth/login`

This endpoint authenticates a user and returns a JWT token.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "username": "employee1",
    "password": "Employee123!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Username for authentication |
| password | string | Yes | User's password |

#### Response

**200 OK**
```json
{
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "username": "employee1",
        "firstName": "Jane",
        "lastName": "Employee",
        "email": "jane.employee@example.com",
        "address": "456 Oak St, Anytown, USA",
        "role": "EMPLOYEE",
        "createdAt": "2025-03-18T15:46:24.506Z",
        "updatedAt": "2025-03-18T15:46:24.506Z"
    }
}
```

**400 Bad Request**
```json
{
    "message": "Username and password are required"
}
```

**401 Unauthorized**
```json
{
    "message": "Invalid credentials"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 1.3 Get User Profile

`GET /api/auth/profile`

This endpoint retrieves the authenticated user's profile information.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |

#### Response

**200 OK**
```json
{
    "user": {
        "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "username": "employee1",
        "firstName": "Jane",
        "lastName": "Employee",
        "email": "jane.employee@example.com",
        "address": "456 Oak St, Anytown, USA",
        "role": "EMPLOYEE",
        "createdAt": "2025-03-18T15:46:24.506Z",
        "updatedAt": "2025-03-18T15:46:24.506Z"
    },
    "profilePictureUrl": "https://s3-bucket-url.com/profiles/image.jpg"
}
```

If no profile picture has been uploaded, profilePictureUrl will be null.

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```
```json
{
    "message": "Token is not valid"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 1.4 Update User Profile

`PATCH /api/auth/profile`

This endpoint updates the authenticated user's profile information.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "firstName": "Updated",
    "lastName": "Employee",
    "email": "updated@example.com",
    "address": "789 Updated St, Updated Town"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | No | Updated first name |
| lastName | string | No | Updated last name |
| email | string | No | Updated email address |
| address | string | No | Updated address |

#### Response

**200 OK**
```json
{
    "message": "Profile updated successfully",
    "user": {
        "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "username": "employee1",
        "firstName": "Updated",
        "lastName": "Employee",
        "email": "updated@example.com",
        "address": "789 Updated St, Updated Town",
        "role": "EMPLOYEE",
        "createdAt": "2025-03-18T15:46:24.506Z",
        "updatedAt": "2025-03-18T15:47:18.588Z"
    }
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```
```json
{
    "message": "Token is not valid"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 1.5 Update User Role

`PATCH /api/auth/users/:userId/role`

This endpoint allows managers to change other users' roles.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |
| Content-Type | application/json | Yes |

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | ID of the user whose role is being changed |

#### Request Body

```json
{
    "role": "MANAGER"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | Yes | New role: "EMPLOYEE" or "MANAGER" |

#### Response

**200 OK**
```json
{
    "message": "User role updated successfully",
    "user": {
        "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "username": "employee1",
        "firstName": "Jane",
        "lastName": "Employee",
        "email": "jane.employee@example.com",
        "role": "MANAGER",
        "createdAt": "2025-03-18T15:46:24.506Z",
        "updatedAt": "2025-03-18T15:48:32.123Z"
    }
}
```

**400 Bad Request**
```json
{
    "message": "User ID and role are required"
}
```
```json
{
    "message": "User not found"
}
```
```json
{
    "message": "Invalid role"
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```

**403 Forbidden**
```json
{
    "message": "Not authorized to update user roles"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 1.6 Update Profile Picture

`PATCH /api/auth/profile/picture`

This endpoint allows users to upload or update their profile picture.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |

#### Request Body

Form data with a file field:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| profilePicture | file | Yes | Image file (jpg/png/gif) |

#### Response

**200 OK**
```json
{
    "message": "Profile picture updated successfully",
    "user": {
        "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "username": "employee1",
        "firstName": "Jane",
        "lastName": "Employee",
        "email": "jane.employee@example.com",
        "role": "EMPLOYEE",
        "profilePictureKey": "profiles/1616923664382-a1b2c3d4e5f6.jpg",
        "createdAt": "2025-03-18T15:46:24.506Z",
        "updatedAt": "2025-03-18T15:50:12.382Z"
    },
    "profilePictureUrl": "https://s3-bucket-url.com/profiles/1616923664382-a1b2c3d4e5f6.jpg"
}
```

**400 Bad Request**
```json
{
    "message": "No file uploaded or file is empty"
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

## 2. Ticket Endpoints

### 2.1 Create a New Ticket

`POST /api/tickets`

This endpoint allows employees to create a new reimbursement ticket.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |

#### Method 1: Create Ticket with JSON Data

**Headers:**

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

**Body:**
```json
{
    "amount": 150.75,
    "description": "Business trip to Seattle",
    "reimbursementType": "TRAVEL"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Reimbursement amount |
| description | string | Yes | Description of the expense |
| reimbursementType | string | No | "TRAVEL", "LODGING", "FOOD", or "OTHER" |

#### Method 2: Create Ticket with Receipt

**Body:**

Form data with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Reimbursement amount |
| description | string | Yes | Description of the expense |
| reimbursementType | string | No | "TRAVEL", "LODGING", "FOOD", or "OTHER" |
| receipt | file | No | Receipt file (image or PDF) |

#### Response

**201 Created**
```json
{
    "message": "Ticket created successfully",
    "ticket": {
        "id": "8515734d-2374-46ab-8ab9-1df911e72ac2",
        "userId": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "amount": 150.75,
        "description": "Business trip to Seattle",
        "status": "PENDING",
        "reimbursementType": "TRAVEL",
        "receiptKey": "receipts/1616923780123-a1b2c3d4e5f6.jpg",
        "createdAt": "2025-03-18T15:47:25.629Z",
        "updatedAt": "2025-03-18T15:47:25.629Z",
        "processedBy": null,
        "processedAt": null
    }
}
```

**400 Bad Request**
```json
{
    "message": "Amount and description are required"
}
```
```json
{
    "message": "Invalid reimbursement type"
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 2.2 Get User's Tickets

`GET /api/tickets/users/:userId/tickets`

This endpoint allows employees to view their own tickets or managers to view any user's tickets.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | ID of the user whose tickets to retrieve |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Filter by reimbursement type: "TRAVEL", "LODGING", "FOOD", "OTHER" |
| page | number | No | Page number for pagination (default: 1) |
| limit | number | No | Results per page (default: 10) |

#### Response

**200 OK**
```json
{
    "tickets": [
        {
            "id": "8515734d-2374-46ab-8ab9-1df911e72ac2",
            "userId": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "amount": 150.75,
            "description": "Business trip to Seattle",
            "status": "APPROVED",
            "reimbursementType": "TRAVEL",
            "receiptKey": "receipts/1616923780123-a1b2c3d4e5f6.jpg",
            "receiptUrl": "https://s3-bucket-url.com/receipts/1616923780123-a1b2c3d4e5f6.jpg",
            "createdAt": "2025-03-18T15:47:25.629Z",
            "updatedAt": "2025-03-18T15:47:45.085Z",
            "processedBy": "e6341d94-f9e0-4c46-b4e0-81ef034c65a7",
            "processedAt": "2025-03-18T15:47:45.085Z"
        },
        {
            "id": "3ba128a9-28c4-4ae3-ae26-22ebd654f83b",
            "userId": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "amount": 249.99,
            "description": "Hotel stay for conference",
            "status": "DENIED",
            "reimbursementType": "LODGING",
            "receiptKey": null,
            "createdAt": "2025-03-18T15:47:25.711Z",
            "updatedAt": "2025-03-18T15:47:45.189Z",
            "processedBy": "e6341d94-f9e0-4c46-b4e0-81ef034c65a7",
            "processedAt": "2025-03-18T15:47:45.189Z"
        }
    ],
    "pagination": {
        "total": 2,
        "page": 1,
        "limit": 10,
        "pages": 1
    }
}
```

**400 Bad Request**
```json
{
    "message": "Invalid reimbursement type"
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```

**403 Forbidden**
```json
{
    "message": "Access denied. You can only view your own tickets."
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 2.3 Get All Tickets (Manager Only)

`GET /api/tickets`

This endpoint allows managers to view all tickets in the system.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: "PENDING", "APPROVED", "DENIED" |
| page | number | No | Page number for pagination (default: 1) |
| limit | number | No | Results per page (default: 10) |

#### Response

**200 OK**
```json
{
    "tickets": [
        {
            "id": "8515734d-2374-46ab-8ab9-1df911e72ac2",
            "userId": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "amount": 150.75,
            "description": "Business trip to Seattle",
            "status": "APPROVED",
            "reimbursementType": "TRAVEL",
            "receiptKey": "receipts/1616923780123-a1b2c3d4e5f6.jpg",
            "receiptUrl": "https://s3-bucket-url.com/receipts/1616923780123-a1b2c3d4e5f6.jpg",
            "createdAt": "2025-03-18T15:47:25.629Z",
            "updatedAt": "2025-03-18T15:47:45.085Z",
            "processedBy": "e6341d94-f9e0-4c46-b4e0-81ef034c65a7",
            "processedAt": "2025-03-18T15:47:45.085Z"
        },
        {
            "id": "57dd5448-5f31-4199-9636-0e2b25b888a0",
            "userId": "428f29f8-4f32-4cc0-97bc-5c28ac69b65c",
            "amount": 45.25,
            "description": "Office supplies",
            "status": "PENDING",
            "reimbursementType": "OTHER",
            "receiptKey": null,
            "createdAt": "2025-03-18T15:47:25.844Z",
            "updatedAt": "2025-03-18T15:47:25.844Z",
            "processedBy": null,
            "processedAt": null
        }
    ],
    "pagination": {
        "total": 2,
        "page": 1,
        "limit": 10,
        "pages": 1
    }
}
```

**400 Bad Request**
```json
{
    "message": "Invalid ticket status"
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```

**403 Forbidden**
```json
{
    "message": "Access denied. Manager role required."
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

### 2.4 Process a Ticket (Manager Only)

`PATCH /api/tickets/users/:userId/tickets/:ticketId/status`

This endpoint allows managers to approve or deny a ticket.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| x-auth-token | <auth-token-value> | Yes |
| Content-Type | application/json | Yes |

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | ID of the user who created the ticket |
| ticketId | string | Yes | ID of the ticket to process |

#### Request Body

```json
{
    "status": "APPROVED"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status: "APPROVED" or "DENIED" |

#### Response

**200 OK**
```json
{
    "message": "Ticket processed successfully",
    "ticket": {
        "id": "8515734d-2374-46ab-8ab9-1df911e72ac2",
        "userId": "38c83721-e03e-4e82-bc56-13fc97efdebd",
        "amount": 150.75,
        "description": "Business trip to Seattle",
        "status": "APPROVED",
        "reimbursementType": "TRAVEL",
        "receiptKey": "receipts/1616923780123-a1b2c3d4e5f6.jpg",
        "createdAt": "2025-03-18T15:47:25.629Z",
        "updatedAt": "2025-03-18T15:47:45.085Z",
        "processedBy": "e6341d94-f9e0-4c46-b4e0-81ef034c65a7",
        "processedAt": "2025-03-18T15:47:45.085Z"
    }
}
```

**400 Bad Request**
```json
{
    "message": "Status is required"
}
```
```json
{
    "message": "Invalid ticket status"
}
```
```json
{
    "message": "Ticket not found"
}
```
```json
{
    "message": "Ticket has already been processed"
}
```
```json
{
    "message": "Managers cannot process their own tickets"
}
```

**401 Unauthorized**
```json
{
    "message": "No token, authorization denied"
}
```

**403 Forbidden**
```json
{
    "message": "Not authorized to process tickets"
}
```

**500 Server Error**
```json
{
    "message": "Server error"
}
```

## Status Code Summary

| Status Code | Description |
|------------|-------------|
| 200 OK | Request processed successfully |
| 201 Created | Resource created successfully |
| 400 Bad Request | Invalid request data (missing fields, invalid values, etc.) |
| 401 Unauthorized | Authentication required or authentication failed |
| 403 Forbidden | User doesn't have permission for the requested action |
| 500 Server Error | Server-side error occurred |

## Constants

### User Roles
- EMPLOYEE
- MANAGER

### Ticket Status
- PENDING
- APPROVED
- DENIED

### Reimbursement Types
- TRAVEL
- LODGING
- FOOD
- OTHER

## Database Model

The system uses a single-table design in DynamoDB with the following structure:

| Component | Description |
|-----------|-------------|
| PK | Primary partition key in format USER#{id} |
| SK | Primary sort key in format USER#{id} or TICKET#{id} |
| UsernameIndex | GSI for looking up users by username |
| UserTicketsIndex | GSI for filtering tickets by user |
| TicketStatusIndex | GSI for filtering tickets by status |

## File Upload

The system supports file uploads for:

- **Profile Pictures** - Stored in the `profiles/` directory in S3
- **Receipts** - Stored in the `receipts/` directory in S3

File access is provided through time-limited signed URLs that grant temporary access to the files.

### Implementation Notes

- File uploads are limited to 5MB in size
- Receipts must be image files (jpg/jpeg/png/gif) or PDF files
- Profile pictures must be image files (jpg/jpeg/png/gif)
- Timestamps are stored in ISO 8601 format
- Managers cannot process their own tickets


# Logging System Documentation

The Reimbursement System includes a comprehensive logging system built with Winston and Morgan to track application events, HTTP requests, and errors.

## Overview

The logging system consists of several components:

1. **Winston Logger Configuration** (`src/config/logger.js`): Core logging utility that manages log levels, formats, and transports.
2. **HTTP Request Logging Middleware** (`src/middleware/loggerMiddleware.js`): Express middleware that logs incoming HTTP requests using Morgan.
3. **Integration in Express Application** (`src/app.js`): Logger middleware is applied to the Express application to capture all HTTP traffic.

## Log Levels

The system uses the following log levels (in order of severity):

| Level | Description |
|-------|-------------|
| error | Application errors and exceptions |
| warn | Warning conditions |
| info | Informational messages |
| http | HTTP request logs |
| debug | Debug messages (development only) |

## Log Storage

Logs are stored in the following locations:

- **Console**: All logs in development, filtered in production
- **combined.log**: All log levels
- **error.log**: Only error-level logs

Log files use automatic rotation with a 5MB size limit and keep up to 5 historical files.

## HTTP Request Logging

All HTTP requests are logged with the following information:
- IP address
- HTTP method
- URL
- Status code
- Response size
- Response time
- Request body (with sensitive fields redacted)

## Environment Configuration

The logging behavior adapts based on the `NODE_ENV` environment variable:

- **Development**: Detailed logs including debug level
- **Production**: More concise logs (info level and above); HTTP logs only for errors (status >= 400)

## Security Considerations

To protect sensitive information:
- Password fields in request bodies are automatically redacted
- No sensitive information is logged by the system

## Integration with Error Handling

The system includes a global error handler that logs all uncaught exceptions with detailed context information.
