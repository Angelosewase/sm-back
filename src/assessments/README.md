# Assessments Module

This module handles the management of assessments in the system, including CRUD operations, filtering, and performance analytics.

## Base URL

`/api/assessments`

## Endpoints

### 1. Create Assessment

- **Endpoint:** `POST /api/assessments`
- **Description:** Creates a new assessment with the specified details
- **Request Body:** `CreateAssessmentDto`
  - `academicYear` (string, required): Academic Year ID
  - `term` (string, required): Term ID
  - `subject` (string, required): Subject ID
  - `class` (string, required): Class ID
  - `title` (string, required): Assessment title
  - `description` (string, optional): Assessment description
  - `weight` (number, optional): Number of questions in the assessment
  - `AssessmentType` (enum, required): Type of assessment (Quiz, Test, Exam, etc.)
  - `deadline` (Date, required): Deadline for the assessment
  - `maxScore` (number, optional): Maximum score for the assessment
- **Response:** Created assessment object
- **Status Code:** 201

### 2. Update Assessment

- **Endpoint:** `PUT /api/assessments/:id`
- **Description:** Updates an existing assessment by ID
- **Parameters:** `id` (string): Assessment ID
- **Request Body:** `UpdateAssessmentDto`
- **Response:** Updated assessment object
- **Status Code:** 200

### 3. List Assessments

- **Endpoint:** `GET /api/assessments`
- **Description:** Retrieves a paginated list of assessments with optional filtering and search
- **Query Parameters:**
  - `academicYear` (string, optional): Filter by academic year
  - `term` (string, optional): Filter by term
  - `subject` (string, optional): Filter by subject
  - `class` (string, optional): Filter by class
  - `status` (string, optional): Filter by status (active, trashed, deleted, locked)
  - `assessmentType` (string, optional): Filter by assessment type
  - `deadlineStart` (string, optional): Filter by deadline start date
  - `deadlineEnd` (string, optional): Filter by deadline end date
  - `page` (number, optional): Page number for pagination
  - `pageSize` (number, optional): Number of items per page
- **Response:** Paginated list of assessments
- **Status Code:** 200

### 4. Get Assessment Details

- **Endpoint:** `GET /api/assessments/:id`
- **Description:** Retrieves detailed information for a specific assessment
- **Parameters:** `id` (string): Assessment ID
- **Response:** Assessment details object
- **Status Code:** 200

### 5. Soft Delete Assessment

- **Endpoint:** `PUT /api/assessments/:id/soft-delete`
- **Description:** Moves an assessment to trash (soft delete) by updating its status
- **Parameters:** `id` (string): Assessment ID
- **Response:** Updated assessment with trashed status
- **Status Code:** 200

### 6. Permanently Delete Assessment

- **Endpoint:** `DELETE /api/assessments/:id`
- **Description:** Permanently removes an assessment from the system
- **Parameters:** `id` (string): Assessment ID
- **Response:** Confirmation of deletion
- **Status Code:** 200

### 7. Get Assessment Performance

- **Endpoint:** `GET /api/assessments/:id/performance`
- **Description:** Retrieves performance analytics for a specific assessment including current submissions, availability, and performance metrics
- **Parameters:** `id` (string): Assessment ID
- **Response:** Performance statistics object
- **Status Code:** 200

### 8. Get Subject Performance

- **Endpoint:** `GET /api/assessments/subject/:subjectId/performance`
- **Description:** Retrieves performance analytics for all assessments within a specific subject
- **Parameters:** 
  - `subjectId` (string): Subject ID
- **Query Parameters:**
  - `academicYear` (string, optional): Filter by academic year
  - `term` (string, optional): Filter by term
  - `classId` (string, optional): Filter by class
- **Response:** Subject performance statistics across all assessment types
- **Status Code:** 200

### 9. Get Class Performance

- **Endpoint:** `GET /api/assessments/class/:classId/performance`
- **Description:** Retrieves performance analytics for all assessments within a specific class across all subjects
- **Parameters:** 
  - `classId` (string): Class ID
- **Query Parameters:**
  - `academicYear` (string, optional): Filter by academic year
  - `term` (string, optional): Filter by term
- **Response:** Class performance statistics across all subjects
- **Status Code:** 200

## Data Models

### Assessment Schema

The assessment schema includes fields for academic year, term, subject, class, title, description, weight, assessment type, deadline, max score, and status management.

### Assessment Types

Supported assessment types are defined in the schema enum and include categories like Quiz, Test, Exam, Assignment, etc.

## Dependencies

This module integrates with:

- **Subjects Module:** For subject information and validation
- **Classes Module:** For class information and validation
- **Marks Module:** For performance analytics and submission tracking
- **Terms Module:** For term information and validation
- **Academic Year Module:** For academic year information and validation

## Notes

- All endpoints use MongoDB ObjectId for ID parameters
- The module supports soft deletion with status tracking
- Performance analytics provide comprehensive insights into assessment effectiveness
- Filtering and pagination are available for efficient data retrieval
