# Super Admin Module API Documentation

## Overview

The Super Admin Module provides comprehensive administrative capabilities for managing schools and users across the entire system. This module is exclusively accessible to users with the `SUPER_ADMIN` role and provides endpoints for:

- **School Management**: View, activate, and deactivate schools
- **User Management**: View and filter all system users

---

## Authentication & Authorization

All endpoints in this module require:

1. **JWT Authentication**: A valid JWT token must be provided in the `Authorization` header
   - Format: `Bearer <token>`
   - Header: `Authorization: Bearer <your-jwt-token>`

2. **Role-Based Access Control**: Only users with the `SUPER_ADMIN` role can access these endpoints
   - Role value: `"super admin"`

### Example Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## Base URL

All endpoints are prefixed with: `/api/super-admin`

---

## Schema Changes

### School Entity

Added a new field to the `School` schema:

```typescript
@Prop({ type: Boolean, default: true, index: true })
isActive?: boolean;
```

- **Type**: `Boolean`
- **Default**: `true`
- **Indexed**: Yes (for efficient filtering)
- **Description**: Indicates whether the school is active in the system

### Role Enum

Added a new role to the `Role` enum:

```typescript
SUPER_ADMIN = 'super admin'
```

Available roles:
- `super admin` - Super Admin (new)
- `admin` - Admin
- `school owner` - School Owner
- `teacher` - Teacher
- `student` - Student
- `head teacher` - Head Teacher
- `staff` - Staff
- `parent` - Parent

---

## School Management Endpoints

### 1. Get All Schools

Retrieve a paginated list of all schools in the system with optional filtering, search, and sorting.

**Endpoint:** `GET /api/super-admin/schools`

**Query Parameters (QuerySchoolsDto):**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No | - | Search text across school name, city, district, and email (case-insensitive) |
| `isActive` | boolean | No | - | Filter by active status (`true` for active, `false` for inactive) |
| `city` | string | No | - | Filter by city name (case-insensitive partial match) |
| `district` | string | No | - | Filter by district name (case-insensitive partial match) |
| `page` | number | No | `1` | Page number (1-based) |
| `limit` | number | No | `10` | Items per page (max: 100) |
| `sortBy` | string | No | `"name"` | Field to sort by (e.g., `name`, `createdAt`, `city`) |
| `order` | string | No | `"asc"` | Sort order: `"asc"` or `"desc"` |

**Request Example:**

```http
GET /api/super-admin/schools?q=Springfield&isActive=true&page=1&limit=20&sortBy=name&order=asc
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Springfield Elementary School",
      "schoolType": "Elementary",
      "establishedYear": 1995,
      "studentCapacity": 500,
      "description": "A community-driven school with focus on STEM education.",
      "address": "742 Evergreen Terrace",
      "city": "Springfield",
      "district": "Shelbyville District",
      "phoneNumber": "+1-202-555-0147",
      "email": "contact@springfield.edu",
      "website": "https://springfield.edu",
      "isActive": true,
      "users": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "email": "john@springfield.edu",
          "role": "admin"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasNext": true,
  "hasPrev": false
}
```

**Response Fields:**

- `items`: Array of school objects (populated with basic user info)
- `total`: Total number of schools matching the filter
- `page`: Current page number
- `limit`: Number of items per page
- `totalPages`: Total number of pages
- `hasNext`: Boolean indicating if there's a next page
- `hasPrev`: Boolean indicating if there's a previous page

**Error Responses:**

- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have SUPER_ADMIN role

---

### 2. Get School Details

Retrieve detailed information about a specific school, including all associated users with full user details.

**Endpoint:** `GET /api/super-admin/schools/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the school |

**Request Example:**

```http
GET /api/super-admin/schools/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Springfield Elementary School",
  "schoolType": "Elementary",
  "establishedYear": 1995,
  "studentCapacity": 500,
  "description": "A community-driven school with focus on STEM education.",
  "address": "742 Evergreen Terrace",
  "city": "Springfield",
  "district": "Shelbyville District",
  "phoneNumber": "+1-202-555-0147",
  "email": "contact@springfield.edu",
  "website": "https://springfield.edu",
  "isActive": true,
  "users": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@springfield.edu",
      "role": "admin",
      "phone": "+1-202-555-0148",
      "avatar": "/uploads/avatars/john-doe.jpg"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Jane Smith",
      "email": "jane@springfield.edu",
      "role": "teacher",
      "phone": "+1-202-555-0149",
      "avatar": null
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Response Fields:**

- All school fields including `isActive`
- `users`: Array of user objects with populated fields: `name`, `email`, `role`, `phone`, `avatar`

**Error Responses:**

- `400 Bad Request`: Invalid ObjectId format
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have SUPER_ADMIN role
- `404 Not Found`: School with the provided ID does not exist

---

### 3. Activate School

Activate a school in the system (sets `isActive` to `true`).

**Endpoint:** `PATCH /api/super-admin/schools/:id/activate`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the school |

**Request Example:**

```http
PATCH /api/super-admin/schools/507f1f77bcf86cd799439011/activate
Authorization: Bearer <token>
```

**Request Body:** None

**Response (200 OK):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Springfield Elementary School",
  "schoolType": "Elementary",
  "establishedYear": 1995,
  "studentCapacity": 500,
  "description": "A community-driven school with focus on STEM education.",
  "address": "742 Evergreen Terrace",
  "city": "Springfield",
  "district": "Shelbyville District",
  "phoneNumber": "+1-202-555-0147",
  "email": "contact@springfield.edu",
  "website": "https://springfield.edu",
  "isActive": true,
  "users": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ObjectId format
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have SUPER_ADMIN role
- `404 Not Found`: School with the provided ID does not exist

---

### 4. Deactivate School

Deactivate a school in the system (sets `isActive` to `false`).

**Endpoint:** `PATCH /api/super-admin/schools/:id/deactivate`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the school |

**Request Example:**

```http
PATCH /api/super-admin/schools/507f1f77bcf86cd799439011/deactivate
Authorization: Bearer <token>
```

**Request Body:** None

**Response (200 OK):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Springfield Elementary School",
  "schoolType": "Elementary",
  "establishedYear": 1995,
  "studentCapacity": 500,
  "description": "A community-driven school with focus on STEM education.",
  "address": "742 Evergreen Terrace",
  "city": "Springfield",
  "district": "Shelbyville District",
  "phoneNumber": "+1-202-555-0147",
  "email": "contact@springfield.edu",
  "website": "https://springfield.edu",
  "isActive": false,
  "users": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ObjectId format
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have SUPER_ADMIN role
- `404 Not Found`: School with the provided ID does not exist

---

### 5. Toggle School Status

Activate or deactivate a school using a boolean flag in the request body.

**Endpoint:** `PATCH /api/super-admin/schools/:id/status`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the school |

**Request Body (ActivateSchoolDto):**

```json
{
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isActive` | boolean | Yes | `true` to activate, `false` to deactivate |

**Request Example:**

```http
PATCH /api/super-admin/schools/507f1f77bcf86cd799439011/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false
}
```

**Response (200 OK):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Springfield Elementary School",
  "schoolType": "Elementary",
  "establishedYear": 1995,
  "studentCapacity": 500,
  "description": "A community-driven school with focus on STEM education.",
  "address": "742 Evergreen Terrace",
  "city": "Springfield",
  "district": "Shelbyville District",
  "phoneNumber": "+1-202-555-0147",
  "email": "contact@springfield.edu",
  "website": "https://springfield.edu",
  "isActive": false,
  "users": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ObjectId format or invalid request body
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have SUPER_ADMIN role
- `404 Not Found`: School with the provided ID does not exist

---

## User Management Endpoints

### 6. Get All Users

Retrieve a paginated list of all users in the system with optional filtering, search, and sorting.

**Endpoint:** `GET /api/super-admin/users`

**Query Parameters (QueryUserDto):**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No | - | Search text across user name and email (case-insensitive, max 200 chars) |
| `role` | enum | No | - | Filter by user role. Valid values: `"super admin"`, `"admin"`, `"school owner"`, `"teacher"`, `"student"`, `"head teacher"`, `"staff"`, `"parent"` |
| `email` | string | No | - | Filter by exact email address (case-insensitive) |
| `school` | string | No | - | Filter by school ID (MongoDB ObjectId) |
| `page` | number | No | `1` | Page number (1-based) |
| `limit` | number | No | `10` | Items per page (max: 100) |
| `sortBy` | string | No | `"createdAt"` | Field to sort by (e.g., `createdAt`, `email`, `name`) |
| `order` | string | No | `"desc"` | Sort order: `"asc"` or `"desc"` |

**Request Example:**

```http
GET /api/super-admin/users?role=teacher&school=507f1f77bcf86cd799439011&page=1&limit=20&sortBy=createdAt&order=desc
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "jane.smith@springfield.edu",
      "name": "Jane Smith",
      "role": "teacher",
      "phone": "+1-202-555-0149",
      "avatar": "/uploads/avatars/jane-smith.jpg",
      "experience": "5 years teaching experience",
      "school": "507f1f77bcf86cd799439011",
      "assignedClasses": ["507f1f77bcf86cd799439020"],
      "subjectsCanTeach": ["507f1f77bcf86cd799439021"],
      "yearsOfExperience": 5,
      "qualifications": ["B.Ed", "M.Sc Mathematics"],
      "address": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zipCode": "62701",
      "emergencyContact": "+1-202-555-0150",
      "additionalNotes": "Specializes in mathematics and physics",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

**Response Fields:**

- `items`: Array of user objects (password field is excluded)
- `total`: Total number of users matching the filter
- `page`: Current page number
- `limit`: Number of items per page
- `totalPages`: Total number of pages
- `hasNext`: Boolean indicating if there's a next page
- `hasPrev`: Boolean indicating if there's a previous page

**Note:** The `password` field is never included in the response for security reasons.

**Error Responses:**

- `400 Bad Request`: Invalid query parameters (e.g., invalid email format, invalid role enum value)
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have SUPER_ADMIN role

---

## Data Transfer Objects (DTOs)

### QuerySchoolsDto

Located at: `src/super-admin/dto/query-schools.dto.ts`

```typescript
export class QuerySchoolsDto {
  q?: string;              // Search text (optional)
  isActive?: boolean;      // Filter by active status (optional)
  city?: string;           // Filter by city (optional)
  district?: string;       // Filter by district (optional)
  page?: number;           // Page number, default: 1
  limit?: number;          // Items per page, default: 10, max: 100
  sortBy?: string;         // Sort field, default: "name"
  order?: 'asc' | 'desc'; // Sort order, default: "asc"
}
```

**Validation Rules:**
- `q`: Optional string
- `isActive`: Optional boolean (automatically converted from string query param)
- `city`: Optional string
- `district`: Optional string
- `page`: Optional number, minimum: 1
- `limit`: Optional number, minimum: 1, maximum: 100
- `sortBy`: Optional string
- `order`: Optional string, must be either `"asc"` or `"desc"`

---

### ActivateSchoolDto

Located at: `src/super-admin/dto/activate-school.dto.ts`

```typescript
export class ActivateSchoolDto {
  isActive: boolean;  // Required: true to activate, false to deactivate
}
```

**Validation Rules:**
- `isActive`: Required boolean

---

### QueryUserDto

Located at: `src/users/dto/query-user.dto.ts`

```typescript
export class QueryUserDto {
  q?: string;              // Search text (optional, max 200 chars)
  role?: Role;             // Filter by role (optional, enum)
  email?: string;          // Filter by email (optional, must be valid email)
  school?: string;         // Filter by school ID (optional)
  page?: number;           // Page number, default: 1
  limit?: number;          // Items per page, default: 10, max: 100
  sortBy?: string;         // Sort field, default: "createdAt"
  order?: 'asc' | 'desc'; // Sort order, default: "desc"
}
```

**Validation Rules:**
- `q`: Optional string, maximum length: 200 characters
- `role`: Optional enum value (must be one of the valid Role values)
- `email`: Optional string, must be a valid email format
- `school`: Optional string (MongoDB ObjectId)
- `page`: Optional number, minimum: 1
- `limit`: Optional number, minimum: 1, maximum: 100
- `sortBy`: Optional string
- `order`: Optional string, must be either `"asc"` or `"desc"`

---

## Response Models

### School Model

```typescript
{
  _id: string;                    // MongoDB ObjectId
  name: string;                   // School name
  schoolType?: string;            // Type of school (optional)
  establishedYear?: number;       // Year school was established (optional)
  studentCapacity: number;        // Maximum student capacity
  description?: string;           // School description (optional)
  address?: string;               // Street address (optional)
  city: string;                   // City (required)
  district: string;               // District (required)
  phoneNumber: string;            // Contact phone number (required)
  email: string;                  // Contact email (required, unique)
  website: string;                 // School website URL (required)
  users?: ObjectId[];             // Array of user ObjectIds (optional)
  isActive?: boolean;              // Active status (default: true)
  createdAt: Date;                 // Creation timestamp
  updatedAt: Date;                 // Last update timestamp
}
```

### User Model (Response)

```typescript
{
  _id: string;                    // MongoDB ObjectId
  email: string;                  // User email (unique, lowercase)
  name?: string;                  // User's full name (optional)
  role: Role;                     // User role (enum)
  phone?: string;                 // Contact phone (optional)
  avatar?: string;                // Avatar file path (optional)
  experience?: string;            // Experience description (optional)
  school?: ObjectId;              // Associated school ObjectId (optional)
  assignedClasses?: ObjectId[];   // Array of class ObjectIds (optional)
  subjectsCanTeach?: ObjectId[];  // Array of subject ObjectIds (optional)
  yearsOfExperience?: number;     // Years of experience (optional)
  qualifications?: string[];     // Array of qualifications (optional)
  address?: string;               // Street address (optional)
  city?: string;                 // City (optional)
  state?: string;                // State/region (optional)
  zipCode?: string;              // Postal code (optional)
  emergencyContact?: string;     // Emergency contact (optional)
  additionalNotes?: string;      // Additional notes (optional)
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}
```

**Note:** The `password` field is never included in API responses.

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid school id \"invalid-id\"",
  "error": "Bad Request"
}
```

**Common causes:**
- Invalid ObjectId format
- Invalid query parameter format
- Validation errors in request body

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Common causes:**
- Missing JWT token
- Invalid or expired JWT token
- Malformed Authorization header

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Common causes:**
- User does not have the `SUPER_ADMIN` role
- JWT token does not contain required role

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "School with id \"507f1f77bcf86cd799439011\" not found",
  "error": "Not Found"
}
```

**Common causes:**
- Resource with the provided ID does not exist
- Resource has been deleted

---

## Service Methods

### SuperAdminService

The service layer provides the following methods:

#### `getAllSchools(query: QuerySchoolsDto)`

Retrieves paginated list of schools with filtering and search capabilities.

**Parameters:**
- `query`: QuerySchoolsDto object with filtering options

**Returns:** Paginated response with schools array and metadata

---

#### `getSchoolDetails(id: string): Promise<School>`

Retrieves detailed school information with populated user data.

**Parameters:**
- `id`: School MongoDB ObjectId

**Returns:** School object with populated users

**Throws:** `NotFoundException` if school not found

---

#### `activateSchool(id: string): Promise<School>`

Activates a school by setting `isActive` to `true`.

**Parameters:**
- `id`: School MongoDB ObjectId

**Returns:** Updated school object

**Throws:** `NotFoundException` if school not found

---

#### `deactivateSchool(id: string): Promise<School>`

Deactivates a school by setting `isActive` to `false`.

**Parameters:**
- `id`: School MongoDB ObjectId

**Returns:** Updated school object

**Throws:** `NotFoundException` if school not found

---

#### `getAllUsers(query: QueryUserDto)`

Retrieves paginated list of users with filtering and search capabilities.

**Parameters:**
- `query`: QueryUserDto object with filtering options

**Returns:** Paginated response with users array and metadata

---

## Database Changes

### School Collection

**New Field Added:**
- `isActive` (Boolean, default: `true`, indexed)

**Migration Note:** Existing schools will have `isActive` set to `true` by default when the schema is applied.

### User Collection

**No changes** - The User collection remains unchanged. The module only reads from it.

---

## Usage Examples

### Example 1: Get all active schools in a specific city

```bash
curl -X GET "http://localhost:3000/api/super-admin/schools?city=Springfield&isActive=true&page=1&limit=10" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Example 2: Search for schools by name

```bash
curl -X GET "http://localhost:3000/api/super-admin/schools?q=Elementary&sortBy=name&order=asc" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Example 3: Deactivate a school

```bash
curl -X PATCH "http://localhost:3000/api/super-admin/schools/507f1f77bcf86cd799439011/deactivate" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Example 4: Toggle school status using request body

```bash
curl -X PATCH "http://localhost:3000/api/super-admin/schools/507f1f77bcf86cd799439011/status" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### Example 5: Get all teachers from a specific school

```bash
curl -X GET "http://localhost:3000/api/super-admin/users?role=teacher&school=507f1f77bcf86cd799439011&page=1&limit=20" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Example 6: Search for users by name or email

```bash
curl -X GET "http://localhost:3000/api/super-admin/users?q=john&sortBy=createdAt&order=desc" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

---

## Testing

All endpoints are protected and require:
1. Valid JWT authentication
2. User with `SUPER_ADMIN` role

To test these endpoints:

1. **Create a super admin user** (via database seeder or direct database insertion)
2. **Login** to get a JWT token
3. **Use the token** in the Authorization header for all requests

---

## Module Structure

```
src/super-admin/
├── dto/
│   ├── query-schools.dto.ts      # Query parameters for school listing
│   └── activate-school.dto.ts    # Request body for status toggle
├── super-admin.controller.ts      # Controller with all endpoints
├── super-admin.service.ts         # Service with business logic
├── super-admin.module.ts         # NestJS module definition
└── README.md                      # This documentation file
```

---

## Integration

The Super Admin Module is integrated into the main application:

- **Module Registration**: `SuperAdminModule` is imported in `AppModule`
- **Dependencies**: 
  - `SchoolModule` (for school management)
  - `UsersModule` (for user management)
  - `MongooseModule` (for database access)

---

## Notes

1. **Pagination**: All list endpoints support pagination with configurable page size (max 100 items per page)

2. **Search**: Search functionality uses case-insensitive regex matching

3. **Filtering**: Multiple filters can be combined (e.g., `isActive=true&city=Springfield&district=District1`)

4. **Sorting**: All list endpoints support custom sorting by any field in ascending or descending order

5. **Security**: Password fields are never exposed in API responses

6. **Performance**: The `isActive` field is indexed for efficient filtering

7. **Default Values**: New schools are created with `isActive: true` by default

---

## Support

For issues or questions regarding the Super Admin Module, please refer to:
- The main application documentation
- Swagger/OpenAPI documentation at `/api-docs` (when running in development mode)
- The source code in `src/super-admin/`

