# Academic Years & Terms Module API Guide

This guide explains how to interact with the Academic Years and Terms modules. These modules work together to manage academic years and their associated terms with strict sequential operations and state management.

All routes are prefixed with `/academic-years` and `/terms` respectively. Swagger documentation is available at `/api-docs` when the service runs in non-production environments.

---

## Table of Contents

- [Overview](#overview)
- [Business Rules](#business-rules)
- [Academic Year Module](#academic-year-module)
- [Term Module](#term-module)
- [Workflow Examples](#workflow-examples)
- [Error Handling](#error-handling)

---

## Overview

The Academic Years and Terms modules provide a structured way to manage academic periods:

- **Academic Years**: Represent a full academic year (e.g., "2024/2025")
- **Terms**: Each academic year has exactly 3 terms (Term 1, Term 2, Term 3) that must be opened and closed sequentially

### Key Features

- Only one academic year can be open at a time
- Terms are automatically created when an academic year is created (3 terms per year)
- Terms can only be managed when their parent academic year is open
- Terms must be opened and closed sequentially (Term 1 → Term 2 → Term 3)
- Once a term is closed, it cannot be reopened
- Only one term can be open at a time within an academic year

---

## Business Rules

### Academic Year Rules

1. **Single Open Year**: Only one academic year can be open at any given time
2. **Auto-Term Creation**: When creating an academic year, 3 terms are automatically created (order: 1, 2, 3)
3. **Close Validation**: An academic year cannot be closed if any of its terms are currently open

### Term Rules

1. **Sequential Opening**: Terms must be opened in order (Term 1 → Term 2 → Term 3)
2. **Previous Term Requirement**: To open Term N, all previous terms (1 to N-1) must have been opened and closed
3. **No Reopening**: Once a term is closed, it cannot be reopened
4. **Single Open Term**: Only one term can be open at a time within an academic year
5. **Academic Year Dependency**: Terms can only be opened/closed when their parent academic year is open

---

## Academic Year Module

### Base URL
```
/academic-years
```

### Data Transfer Objects (DTOs)

#### CreateAcademicYearDto

```typescript
{
  label: string;           // Required: Academic year label (e.g., "2024/2025")
  startDate?: string;      // Optional: ISO 8601 date string (e.g., "2024-09-01")
  endDate?: string;        // Optional: ISO 8601 date string (e.g., "2025-06-30")
}
```

**Validation Rules:**
- `label`: Required, must be a non-empty string, must be unique
- `startDate`: Optional, must be a valid ISO 8601 date string if provided
- `endDate`: Optional, must be a valid ISO 8601 date string if provided

### Endpoints

#### 1. Create Academic Year

**POST** `/academic-years`

Creates a new academic year and automatically creates 3 terms (order 1, 2, 3) for it.

**Request Body:**
```json
{
  "label": "2024/2025",
  "startDate": "2024-09-01",
  "endDate": "2025-06-30"
}
```

**Response:** `201 Created`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "label": "2024/2025",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2025-06-30T00:00:00.000Z",
  "isOpen": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failure or duplicate label
- `409 Conflict`: Academic year with the same label already exists

---

#### 2. Get All Academic Years

**GET** `/academic-years`

Returns all academic years sorted by label in descending order (newest first).

**Response:** `200 OK`
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "label": "2024/2025",
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2025-06-30T00:00:00.000Z",
    "isOpen": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "label": "2023/2024",
    "startDate": "2023-09-01T00:00:00.000Z",
    "endDate": "2024-06-30T00:00:00.000Z",
    "isOpen": false,
    "createdAt": "2023-01-15T10:30:00.000Z",
    "updatedAt": "2023-01-15T10:30:00.000Z"
  }
]
```

---

#### 3. Get Currently Open Academic Year

**GET** `/academic-years/open`

Returns the academic year that is currently open, or `null` if none is open.

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "label": "2024/2025",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2025-06-30T00:00:00.000Z",
  "isOpen": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Note:** Returns `null` if no academic year is currently open.

---

#### 4. Get Academic Year by ID

**GET** `/academic-years/:id`

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the academic year

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "label": "2024/2025",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2025-06-30T00:00:00.000Z",
  "isOpen": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: Academic year with the provided ID does not exist

---

#### 5. Open Academic Year

**PATCH** `/academic-years/:id/open`

Opens an academic year. If another academic year is currently open, it will be automatically closed.

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the academic year

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "label": "2024/2025",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2025-06-30T00:00:00.000Z",
  "isOpen": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Academic year is already open
- `404 Not Found`: Academic year with the provided ID does not exist

---

#### 6. Close Academic Year

**PATCH** `/academic-years/:id/close`

Closes an academic year. The academic year cannot be closed if any of its terms are currently open.

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the academic year

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "label": "2024/2025",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2025-06-30T00:00:00.000Z",
  "isOpen": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: 
  - Academic year is not open
  - Cannot close academic year while a term is open
- `404 Not Found`: Academic year with the provided ID does not exist

---

## Term Module

### Base URL
```
/terms
```

### Endpoints

#### 1. Get All Terms for an Academic Year

**GET** `/terms/academic-year/:academicYearId`

Returns all terms for a specific academic year, sorted by order (1, 2, 3).

**Path Parameters:**
- `academicYearId` (string, required): MongoDB ObjectId of the academic year

**Response:** `200 OK`
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
    "order": 1,
    "isOpen": false,
    "isClosed": true,
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2024-12-15T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-12-15T18:00:00.000Z"
  },
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
    "order": 2,
    "isOpen": true,
    "isClosed": false,
    "startDate": "2025-01-10T00:00:00.000Z",
    "endDate": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-10T09:00:00.000Z"
  },
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
    "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
    "order": 3,
    "isOpen": false,
    "isClosed": false,
    "startDate": null,
    "endDate": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

#### 2. Get Currently Open Term for an Academic Year

**GET** `/terms/academic-year/:academicYearId/open`

Returns the term that is currently open for the specified academic year, or `null` if none is open.

**Path Parameters:**
- `academicYearId` (string, required): MongoDB ObjectId of the academic year

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
  "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
  "order": 2,
  "isOpen": true,
  "isClosed": false,
  "startDate": "2025-01-10T00:00:00.000Z",
  "endDate": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-10T09:00:00.000Z"
}
```

**Note:** Returns `null` if no term is currently open for the academic year.

---

#### 3. Get Term by ID

**GET** `/terms/id/:id`

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the term

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
  "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
  "order": 1,
  "isOpen": false,
  "isClosed": true,
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2024-12-15T00:00:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-12-15T18:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: Term with the provided ID does not exist

---

#### 4. Open a Term

**PATCH** `/terms/academic-year/:academicYearId/term/:order/open`

Opens a term. This will automatically close any currently open term in the same academic year.

**Path Parameters:**
- `academicYearId` (string, required): MongoDB ObjectId of the academic year
- `order` (number, required): Term order (1, 2, or 3)

**Validation:**
- The academic year must be open
- The term must not be already closed
- The term must not be already open
- All previous terms (1 to order-1) must have been opened and closed
- Only one term can be open at a time (any currently open term will be closed)

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
  "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
  "order": 2,
  "isOpen": true,
  "isClosed": false,
  "startDate": "2025-01-10T09:00:00.000Z",
  "endDate": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-10T09:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: 
  - Cannot open term when academic year is not open
  - Term has been closed and cannot be reopened
  - Term is already open
  - Cannot open Term N. Term X must be opened and closed first (for sequential validation)
  - Term order must be 1, 2, or 3
- `404 Not Found`: 
  - Academic year not found
  - Term not found for this academic year

**Example:**
```bash
# Open Term 1
PATCH /terms/academic-year/65a1b2c3d4e5f6g7h8i9j0k1/term/1/open

# Open Term 2 (Term 1 must be closed first)
PATCH /terms/academic-year/65a1b2c3d4e5f6g7h8i9j0k1/term/2/open

# Open Term 3 (Terms 1 and 2 must be closed first)
PATCH /terms/academic-year/65a1b2c3d4e5f6g7h8i9j0k1/term/3/open
```

---

#### 5. Close a Term

**PATCH** `/terms/academic-year/:academicYearId/term/:order/close`

Closes a term. Once closed, a term cannot be reopened.

**Path Parameters:**
- `academicYearId` (string, required): MongoDB ObjectId of the academic year
- `order` (number, required): Term order (1, 2, or 3)

**Validation:**
- The academic year must be open
- The term must be currently open

**Response:** `200 OK`
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
  "academicYear": "65a1b2c3d4e5f6g7h8i9j0k1",
  "order": 1,
  "isOpen": false,
  "isClosed": true,
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2024-12-15T18:00:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-12-15T18:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: 
  - Cannot close term when academic year is not open
  - Term is not open
  - Term order must be 1, 2, or 3
- `404 Not Found`: 
  - Academic year not found
  - Term not found for this academic year

---

## Workflow Examples

### Complete Academic Year Workflow

#### Step 1: Create Academic Year
```bash
POST /academic-years
{
  "label": "2024/2025",
  "startDate": "2024-09-01",
  "endDate": "2025-06-30"
}
```
**Result:** Academic year created with 3 terms (all closed, not open)

#### Step 2: Open Academic Year
```bash
PATCH /academic-years/{yearId}/open
```
**Result:** Academic year is now open (any previously open year is closed)

#### Step 3: Open Term 1
```bash
PATCH /terms/academic-year/{yearId}/term/1/open
```
**Result:** Term 1 is now open, `startDate` is set to current timestamp

#### Step 4: Close Term 1
```bash
PATCH /terms/academic-year/{yearId}/term/1/close
```
**Result:** Term 1 is closed, `isClosed` is set to `true`, `endDate` is set to current timestamp

#### Step 5: Open Term 2
```bash
PATCH /terms/academic-year/{yearId}/term/2/open
```
**Result:** Term 2 is now open (Term 1 was already closed, so validation passes)

#### Step 6: Close Term 2
```bash
PATCH /terms/academic-year/{yearId}/term/2/close
```
**Result:** Term 2 is closed

#### Step 7: Open Term 3
```bash
PATCH /terms/academic-year/{yearId}/term/3/open
```
**Result:** Term 3 is now open (Terms 1 and 2 were already closed)

#### Step 8: Close Term 3
```bash
PATCH /terms/academic-year/{yearId}/term/3/close
```
**Result:** Term 3 is closed

#### Step 9: Close Academic Year
```bash
PATCH /academic-years/{yearId}/close
```
**Result:** Academic year is closed (all terms are closed, so validation passes)

---

### Common Use Cases

#### Get Current Academic Year and Open Term
```bash
# Get open academic year
GET /academic-years/open

# Get open term for that year
GET /terms/academic-year/{yearId}/open
```

#### Check Term Status
```bash
# Get all terms for an academic year
GET /terms/academic-year/{yearId}

# Response shows:
# - Term 1: isClosed: true, isOpen: false
# - Term 2: isClosed: false, isOpen: true
# - Term 3: isClosed: false, isOpen: false
```

#### Switch to New Academic Year
```bash
# 1. Create new year
POST /academic-years { "label": "2025/2026" }

# 2. Open new year (automatically closes old one)
PATCH /academic-years/{newYearId}/open

# 3. Start Term 1
PATCH /terms/academic-year/{newYearId}/term/1/open
```

---

## Error Handling

### Common Error Scenarios

#### 1. Trying to Open Term 2 Before Term 1 is Closed
```json
{
  "statusCode": 400,
  "message": "Cannot open Term 2. Term 1 must be opened and closed first",
  "error": "Bad Request"
}
```

#### 2. Trying to Reopen a Closed Term
```json
{
  "statusCode": 400,
  "message": "Term 1 has been closed and cannot be reopened",
  "error": "Bad Request"
}
```

#### 3. Trying to Close Academic Year with Open Term
```json
{
  "statusCode": 400,
  "message": "Cannot close academic year while a term is open",
  "error": "Bad Request"
}
```

#### 4. Trying to Open/Close Term When Academic Year is Closed
```json
{
  "statusCode": 400,
  "message": "Cannot open term when academic year is not open",
  "error": "Bad Request"
}
```

#### 5. Invalid Term Order
```json
{
  "statusCode": 400,
  "message": "Term order must be 1, 2, or 3",
  "error": "Bad Request"
}
```

#### 6. Duplicate Academic Year Label
```json
{
  "statusCode": 400,
  "message": "Academic year with label \"2024/2025\" already exists",
  "error": "Bad Request"
}
```

---

## Data Models

### AcademicYear Schema
```typescript
{
  _id: ObjectId;
  label: string;              // Unique, e.g., "2024/2025"
  startDate?: Date;
  endDate?: Date;
  isOpen: boolean;            // Only one can be true at a time
  createdAt: Date;
  updatedAt: Date;
}
```

### Term Schema
```typescript
{
  _id: ObjectId;
  academicYear: ObjectId;     // Reference to AcademicYear
  order: number;               // 1, 2, or 3 (unique per academic year)
  isOpen: boolean;             // Only one can be true per academic year
  isClosed: boolean;            // Once true, term cannot be reopened
  startDate?: Date;            // Set when term is opened
  endDate?: Date;               // Set when term is closed
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `academicYear` + `order`: Unique compound index (ensures one term per order per year)

---

## Testing Tips

1. **Use Swagger UI**: Navigate to `/api-docs` to explore and test endpoints interactively
2. **Sequential Testing**: Always test term operations in sequence (1 → 2 → 3)
3. **State Validation**: Check `isOpen` and `isClosed` flags after each operation
4. **Error Scenarios**: Test error cases (e.g., trying to open Term 2 before Term 1 is closed)
5. **Academic Year Switching**: Test opening a new academic year while another is open

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All ID parameters must be valid MongoDB ObjectIds
- Date strings in DTOs should be in ISO 8601 format (e.g., "2024-09-01" or "2024-09-01T00:00:00Z")
- The `startDate` and `endDate` for terms are automatically set when opening/closing
- Terms are automatically created when an academic year is created (no manual term creation needed)

