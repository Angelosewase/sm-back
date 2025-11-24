# Token-Based Registration System

## Overview

This module implements a secure, token-based registration system that allows controlled user onboarding into the school management platform. The system ensures that only authorized administrators can invite new users, and registration is restricted to those with valid, unexpired tokens.

### Key Features

- **Role-Based Token Generation**: Super Admins can generate tokens for School Owners, while School Admins can generate tokens for Teachers and Headteachers
- **Token Validation**: Tokens are validated before use, ensuring they are active, unexpired, and unused
- **Automatic School Creation**: School Owners can create their school during registration
- **Audit Trail**: Complete tracking of token creation, usage, and expiration
- **Single-Use Tokens**: Each token can only be used once for security
- **Expiration Management**: Tokens automatically expire after a configurable number of days

---

## Architecture

### Registration Flow

1. **Super Admin** → Generates token for **School Owner**
2. **School Owner** → Uses token to register and create school
3. **School Owner** → Generates tokens for **Teachers** and **Headteachers**
4. **Teachers/Headteachers** → Use tokens to register under the school

### Token Lifecycle

```
Generated → Pending → Used/Expired
```

---

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/registration-tokens` or `/api/auth` for registration.

---

## 1. Generate Registration Token

**Endpoint:** `POST /api/registration-tokens/generate`

**Authentication:** Required (JWT Bearer Token)

**Authorization:** Super Admin, Admin, or School Owner

**Description:** Generate a registration token for inviting new users. The role that can be generated depends on the authenticated user's role.

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body (DTO: GenerateTokenDto)

```typescript
{
  role: "school owner" | "teacher" | "head teacher",  // Required
  expiresInDays?: number  // Optional, default: 30, min: 1, max: 365
}
```

#### Field Specifications

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `role` | `enum` | ✅ Yes | Must be one of: `"school owner"`, `"teacher"`, `"head teacher"` | Role for which to generate the token |
| `expiresInDays` | `number` | ❌ No | Minimum: 1, Maximum: 365, Default: 30 | Token expiration in days from generation date |

### Role-Based Token Generation Rules

| Authenticated User Role | Can Generate Tokens For | schoolId Behavior |
|------------------------|--------------------------|-------------------|
| **Super Admin** | `school owner` only | `null` (no school binding) |
| **Admin** or **School Owner** | `teacher`, `head teacher` | Automatically set to authenticated user's school |
| **Admin** or **School Owner** | `school owner` | ❌ **Not Allowed** |

### Example Request

```json
{
  "role": "teacher",
  "expiresInDays": 30
}
```

### Success Response (201 Created)

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "role": "teacher",
  "schoolId": "507f1f77bcf86cd799439011",
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "status": "pending",
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `token` | `string` | Unique 64-character hexadecimal token string |
| `role` | `string` | Role assigned to the token |
| `schoolId` | `string \| null` | School ID (null for SCHOOL_OWNER tokens) |
| `expiresAt` | `string` | ISO 8601 date string when token expires |
| `status` | `string` | Current status: `"pending"` |
| `createdAt` | `string` | ISO 8601 date string when token was created |

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "School ID is required for Teacher and Headteacher tokens"
}
```

**Possible Messages:**
- `"School ID is required for Teacher and Headteacher tokens"`
- `"School ID should not be provided for School Owner tokens"`
- Validation errors for `expiresInDays` (must be between 1 and 365)

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Super Admin can only generate tokens for School Owners"
}
```

**Possible Messages:**
- `"Super Admin can only generate tokens for School Owners"`
- `"School Admins cannot generate tokens for School Owners"`
- `"You can only generate tokens for your own school"`

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 2. Validate Registration Token

**Endpoint:** `POST /api/registration-tokens/validate`

**Authentication:** Not Required (Public Endpoint)

**Description:** Validate a registration token before registration. This endpoint checks if the token is valid, unexpired, and unused.

### Request Headers

```
Content-Type: application/json
```

### Request Body (DTO: ValidateTokenDto)

```typescript
{
  token: string  // Required, non-empty string
}
```

#### Field Specifications

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `token` | `string` | ✅ Yes | Non-empty string | Registration token to validate |

### Example Request

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

### Success Response (200 OK)

```json
{
  "valid": true,
  "role": "teacher",
  "schoolId": "507f1f77bcf86cd799439011",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `valid` | `boolean` | Always `true` for successful validation |
| `role` | `string` | Role associated with the token |
| `schoolId` | `string \| null` | School ID bound to the token (null for SCHOOL_OWNER) |
| `expiresAt` | `string` | ISO 8601 date string when token expires |

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "This registration token has already been used"
}
```

**Possible Messages:**
- `"Invalid registration token"` - Token not found in database
- `"This registration token has already been used"` - Token status is `"used"`
- `"This registration token has expired"` - Current date exceeds `expiresAt`
- `"This registration token is not valid"` - Token status is not `"pending"`

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Invalid registration token"
}
```

**Note:** If token is expired, it will be automatically marked as `"expired"` before returning the error.

---

## 3. Register with Token

**Endpoint:** `POST /api/auth/register`

**Authentication:** Not Required (Public Endpoint)

**Description:** Register a new user account using a valid registration token. For School Owners, school information must be provided. For Teachers and Headteachers, the school is determined automatically from the token.

### Request Headers

```
Content-Type: application/json
```

### Request Body (DTO: RegisterWithTokenDto)

#### Common Fields (All Roles)

```typescript
{
  token: string,                    // Required: Registration token
  email: string,                    // Required: Valid email address
  password: string,                 // Required: Minimum 8 characters
  name?: string,                    // Optional: Full name
  phone?: string,                   // Optional: Phone number
  yearsOfExperience?: number,       // Optional: Minimum 0
  qualifications?: string[],        // Optional: Array of qualification strings
  address?: string,                 // Optional: Street address
  city?: string,                    // Optional: City of residence
  state?: string,                   // Optional: State or region
  zipCode?: string,                 // Optional: Postal/ZIP code
  emergencyContact?: string,        // Optional: Emergency contact info
  additionalNotes?: string          // Optional: Additional notes
}
```

#### School Owner Specific Fields

```typescript
{
  // ... common fields above ...
  
  // Required for SCHOOL_OWNER role:
  schoolName: string,               // Required: School name
  schoolCity: string,               // Required: School city
  schoolDistrict: string,           // Required: School district
  schoolPhoneNumber: string,        // Required: School phone number
  schoolEmail: string,              // Required: Valid email address
  schoolWebsite: string,            // Required: Valid URL
  
  // Optional for SCHOOL_OWNER role:
  schoolType?: string,              // Optional: School type
  establishedYear?: number,         // Optional: Year established (integer)
  studentCapacity?: number,         // Optional: Student capacity (integer, min: 0)
  schoolDescription?: string,       // Optional: School description
  schoolAddress?: string            // Optional: School address
}
```

#### Complete Field Specifications

| Field | Type | Required | Constraints | Applies To |
|-------|------|----------|-------------|------------|
| `token` | `string` | ✅ Yes | Non-empty | All roles |
| `email` | `string` | ✅ Yes | Valid email format | All roles |
| `password` | `string` | ✅ Yes | Minimum 8 characters | All roles |
| `name` | `string` | ❌ No | - | All roles |
| `phone` | `string` | ❌ No | - | All roles |
| `yearsOfExperience` | `number` | ❌ No | Integer, minimum 0 | All roles |
| `qualifications` | `string[]` | ❌ No | Array of strings | All roles |
| `address` | `string` | ❌ No | - | All roles |
| `city` | `string` | ❌ No | - | All roles |
| `state` | `string` | ❌ No | - | All roles |
| `zipCode` | `string` | ❌ No | - | All roles |
| `emergencyContact` | `string` | ❌ No | - | All roles |
| `additionalNotes` | `string` | ❌ No | - | All roles |
| `schoolName` | `string` | ✅ Yes* | - | SCHOOL_OWNER only |
| `schoolCity` | `string` | ✅ Yes* | - | SCHOOL_OWNER only |
| `schoolDistrict` | `string` | ✅ Yes* | - | SCHOOL_OWNER only |
| `schoolPhoneNumber` | `string` | ✅ Yes* | - | SCHOOL_OWNER only |
| `schoolEmail` | `string` | ✅ Yes* | Valid email format | SCHOOL_OWNER only |
| `schoolWebsite` | `string` | ✅ Yes* | Valid URL format | SCHOOL_OWNER only |
| `schoolType` | `string` | ❌ No | - | SCHOOL_OWNER only |
| `establishedYear` | `number` | ❌ No | Integer | SCHOOL_OWNER only |
| `studentCapacity` | `number` | ❌ No | Integer, minimum 0 | SCHOOL_OWNER only |
| `schoolDescription` | `string` | ❌ No | - | SCHOOL_OWNER only |
| `schoolAddress` | `string` | ❌ No | - | SCHOOL_OWNER only |

*Required only when registering with a SCHOOL_OWNER token

### Example Requests

#### Example 1: Register as Teacher

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "email": "teacher@example.com",
  "password": "SecurePass123!",
  "name": "Jane Smith",
  "phone": "+1-123-456-7890",
  "yearsOfExperience": 5,
  "qualifications": ["B.Ed", "TESOL Certificate"],
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "emergencyContact": "+1-987-654-3210"
}
```

#### Example 2: Register as School Owner

```json
{
  "token": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
  "email": "owner@myschool.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1-123-456-7890",
  "schoolName": "Springfield Elementary School",
  "schoolType": "Primary",
  "establishedYear": 2020,
  "studentCapacity": 500,
  "schoolDescription": "A community-driven school with focus on STEM education",
  "schoolAddress": "742 Evergreen Terrace",
  "schoolCity": "Springfield",
  "schoolDistrict": "Shelbyville District",
  "schoolPhoneNumber": "+1-202-555-0147",
  "schoolEmail": "contact@springfield.edu",
  "schoolWebsite": "https://www.springfield.edu"
}
```

### Success Response (201 Created)

#### Response for Teacher/Headteacher

```json
{
  "message": "Registration successful",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "teacher@example.com",
    "name": "Jane Smith",
    "role": "teacher",
    "school": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Springfield Elementary School"
    }
  }
}
```

#### Response for School Owner

```json
{
  "message": "Registration successful",
  "user": {
    "id": "507f1f77bcf86cd799439013",
    "email": "owner@myschool.com",
    "name": "John Doe",
    "role": "school owner",
    "school": {
      "id": "507f1f77bcf86cd799439014",
      "name": "Springfield Elementary School"
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Success message: `"Registration successful"` |
| `user.id` | `string` | MongoDB ObjectId of created user |
| `user.email` | `string` | User's email address |
| `user.name` | `string` | User's full name |
| `user.role` | `string` | User's role (from token) |
| `user.school` | `object \| undefined` | School information (if applicable) |
| `user.school.id` | `string` | MongoDB ObjectId of school |
| `user.school.name` | `string` | School name |

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "School information is required for School Owner registration"
}
```

**Possible Messages:**
- `"Invalid registration token"` - Token not found
- `"This registration token has already been used"` - Token was previously used
- `"This registration token has expired"` - Token expiration date has passed
- `"This registration token is not valid"` - Token status is not pending
- `"School information is required for School Owner registration"` - Missing required school fields
- `"School ID is missing from token"` - Token for TEACHER/HEADTeacher missing schoolId
- `"School with that id \"...\" not found"` - Invalid school ID in token
- `"User with that email already exists"` - Email is already registered
- Validation errors for required fields (email format, password length, etc.)

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Invalid registration token"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "User with that email already exists"
}
```

---

## 4. Get My Tokens

**Endpoint:** `GET /api/registration-tokens/my-tokens`

**Authentication:** Required (JWT Bearer Token)

**Authorization:** Super Admin, Admin, or School Owner

**Description:** Retrieve all registration tokens generated by the authenticated user. Optionally filter by role.

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | `string` | ❌ No | Filter tokens by role: `"school owner"`, `"teacher"`, or `"head teacher"` |

### Example Requests

```
GET /api/registration-tokens/my-tokens
GET /api/registration-tokens/my-tokens?role=teacher
```

### Success Response (200 OK)

```json
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "role": "teacher",
    "schoolId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Springfield Elementary School"
    },
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439016",
      "email": "admin@school.com",
      "name": "School Admin"
    },
    "status": "pending",
    "usedAt": null,
    "usedBy": null,
    "usedFromIp": null,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439017",
    "token": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
    "role": "school owner",
    "schoolId": null,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439018",
      "email": "superadmin@system.com",
      "name": "Super Admin"
    },
    "status": "used",
    "usedAt": "2024-01-15T14:30:00.000Z",
    "usedBy": {
      "_id": "507f1f77bcf86cd799439019",
      "email": "owner@newschool.com",
      "name": "New School Owner"
    },
    "usedFromIp": "192.168.1.100",
    "createdAt": "2024-01-01T08:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
]
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `string` | MongoDB ObjectId of token document |
| `token` | `string` | Token string (64 characters) |
| `role` | `string` | Role assigned to token |
| `schoolId` | `object \| null` | School object (if bound) or null |
| `schoolId._id` | `string` | School MongoDB ObjectId |
| `schoolId.name` | `string` | School name |
| `expiresAt` | `string` | ISO 8601 expiration date |
| `createdBy` | `object` | User who created the token |
| `createdBy._id` | `string` | Creator's MongoDB ObjectId |
| `createdBy.email` | `string` | Creator's email |
| `createdBy.name` | `string` | Creator's name |
| `status` | `string` | Token status: `"pending"`, `"used"`, or `"expired"` |
| `usedAt` | `string \| null` | ISO 8601 date when token was used (null if unused) |
| `usedBy` | `object \| null` | User who used the token (null if unused) |
| `usedBy._id` | `string` | User's MongoDB ObjectId |
| `usedBy.email` | `string` | User's email |
| `usedBy.name` | `string` | User's name |
| `usedFromIp` | `string \| null` | IP address from which token was used |
| `createdAt` | `string` | ISO 8601 creation date |
| `updatedAt` | `string` | ISO 8601 last update date |

### Error Responses

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## 5. Get Token Statistics

**Endpoint:** `GET /api/registration-tokens/my-tokens/stats`

**Authentication:** Required (JWT Bearer Token)

**Authorization:** Super Admin, Admin, or School Owner

**Description:** Get statistics about registration tokens generated by the authenticated user.

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Example Request

```
GET /api/registration-tokens/my-tokens/stats
```

### Success Response (200 OK)

```json
{
  "total": 25,
  "pending": 10,
  "used": 12,
  "expired": 3
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total number of tokens generated |
| `pending` | `number` | Number of tokens with status "pending" |
| `used` | `number` | Number of tokens with status "used" |
| `expired` | `number` | Number of tokens with status "expired" |

### Error Responses

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## Data Transfer Objects (DTOs)

### GenerateTokenDto

```typescript
{
  role: "school owner" | "teacher" | "head teacher",
  expiresInDays?: number  // Optional, default: 30, range: 1-365
}
```

**Validation Rules:**
- `role`: Must be one of the three allowed roles
- `expiresInDays`: If provided, must be an integer between 1 and 365

---

### ValidateTokenDto

```typescript
{
  token: string  // Required, non-empty
}
```

**Validation Rules:**
- `token`: Must be a non-empty string

---

### RegisterWithTokenDto

See [Register with Token](#3-register-with-token) section for complete field specifications.

**Validation Rules:**
- `token`: Required, non-empty string
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters
- `schoolName`, `schoolCity`, `schoolDistrict`, `schoolPhoneNumber`, `schoolEmail`, `schoolWebsite`: Required when token role is `"school owner"`
- All other fields are optional

---

## Token Status Enum

| Status | Description |
|--------|-------------|
| `pending` | Token is generated but not yet used |
| `used` | Token has been used for registration |
| `expired` | Token has passed its expiration date |

---

## Database Schema

### RegistrationToken Collection

```typescript
{
  _id: ObjectId,
  token: string,              // Unique, indexed
  role: string,               // Enum: "school owner", "teacher", "head teacher"
  schoolId: ObjectId | null,  // Reference to School, null for SCHOOL_OWNER tokens
  expiresAt: Date,            // Indexed, TTL enabled for auto-deletion
  createdBy: ObjectId,        // Reference to User who created the token
  status: string,             // Enum: "pending", "used", "expired"
  usedAt: Date | null,        // Timestamp when token was used
  usedBy: ObjectId | null,    // Reference to User who used the token
  usedFromIp: string | null,  // IP address from registration request
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- Unique index on `token`
- Index on `expiresAt` (TTL index for auto-deletion of expired tokens)
- Index on `status` and `expiresAt` (compound)
- Index on `createdBy`
- Index on `schoolId`

---

## Security Considerations

1. **Token Generation**
   - Tokens are cryptographically secure random 64-character hexadecimal strings
   - Tokens are stored with hashed values in the database
   - Only authorized roles can generate tokens

2. **Token Validation**
   - Tokens are validated before each registration attempt
   - Expired tokens are automatically marked as expired
   - Used tokens cannot be reused

3. **Role-Based Access Control**
   - Super Admins can only generate SCHOOL_OWNER tokens
   - School Admins can only generate tokens for their own school
   - School-bound tokens prevent cross-school registration

4. **Audit Trail**
   - All token operations are logged with timestamps
   - IP addresses are captured during registration
   - Token creator and user information is tracked

5. **Expiration**
   - Tokens automatically expire after the configured number of days
   - Expired tokens are automatically cleaned up via TTL index

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| `200 OK` | Successful GET/POST request |
| `201 Created` | Resource successfully created |
| `400 Bad Request` | Invalid request data or validation failure |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | Insufficient permissions for the operation |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource conflict (e.g., duplicate email) |
| `500 Internal Server Error` | Server-side error |

Error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## Complete Registration Flow Examples

### Example 1: School Owner Registration Flow

1. **Super Admin generates token:**
   ```bash
   POST /api/registration-tokens/generate
   Authorization: Bearer <super_admin_token>
   {
     "role": "school owner",
     "expiresInDays": 30
   }
   ```

2. **Response:**
   ```json
   {
     "token": "abc123...",
     "role": "school owner",
     "schoolId": null,
     "expiresAt": "2024-12-31T23:59:59.000Z",
     "status": "pending"
   }
   ```

3. **School Owner validates token:**
   ```bash
   POST /api/registration-tokens/validate
   {
     "token": "abc123..."
   }
   ```

4. **School Owner registers:**
   ```bash
   POST /api/auth/register
   {
     "token": "abc123...",
     "email": "owner@school.com",
     "password": "SecurePass123!",
     "name": "John Doe",
     "schoolName": "My School",
     "schoolCity": "New York",
     "schoolDistrict": "Manhattan",
     "schoolPhoneNumber": "+1-123-456-7890",
     "schoolEmail": "info@myschool.com",
     "schoolWebsite": "https://myschool.com"
   }
   ```

5. **School and user are created, token is marked as used**

### Example 2: Teacher Registration Flow

1. **School Admin generates token:**
   ```bash
   POST /api/registration-tokens/generate
   Authorization: Bearer <school_admin_token>
   {
     "role": "teacher",
     "expiresInDays": 30
   }
   ```

2. **Teacher validates and registers:**
   ```bash
   POST /api/auth/register
   {
     "token": "def456...",
     "email": "teacher@school.com",
     "password": "SecurePass123!",
     "name": "Jane Smith"
   }
   ```

3. **Teacher account is created under the admin's school**

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Token strings are case-sensitive
- Email addresses are automatically lowercased and trimmed
- Passwords are hashed using bcrypt before storage
- Token expiration is checked against the server's current time (UTC)
- School IDs are MongoDB ObjectIds (24-character hexadecimal strings)
- All endpoints return JSON responses

---

## Support

For issues or questions regarding the token-based registration system, please contact the development team or refer to the main project documentation.

