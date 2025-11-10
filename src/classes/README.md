# Classes Module

The `classes` module provides CRUD operations for managing class records, along with pagination, searching, grade-level filtering, and student count bookkeeping. Classes are linked to teachers via user accounts with the `teacher` role.

## Data Model

| Field          | Type     | Description                                                          |
|----------------|----------|----------------------------------------------------------------------|
| `name`         | string   | Unique identifier for the class.                                     |
| `gradeLevel`   | string   | Grade level associated with the class (e.g., `Grade 6`).             |
| `capacity`     | number   | Maximum number of students allowed.                                  |
| `description`  | string   | Optional description.                                                |
| `status`       | enum     | `active` or `inactive`. Defaults to `active`.                         |
| `classTeacher` | ObjectId | Optional reference to a `User` document with role `teacher`.          |
| `studentCount` | number   | Internally managed count of enrolled students. Defaults to `0`.      |
| `isTrashed`    | boolean  | Indicates whether the class sits in the trash. Defaults to `false`.   |
| `trashedAt`    | Date     | Timestamp of when the class was trashed (null when active).           |

## REST Endpoints

Base path: `/classes`

### Create Class

- **Method**: `POST /classes`
- **Body**:
  ```json
  {
    "name": "Mathematics 101",
    "gradeLevel": "Grade 6",
    "capacity": 30,
    "description": "Core math class covering algebra basics",
    "status": "active",
    "classTeacher": "64f0a5b3c21a7123456789ab"
  }
  ```
- **Notes**: `classTeacher` is optional. When provided it must reference an existing user with the `teacher` role.

### List Classes

- **Method**: `GET /classes`
- **Query Parameters**:
  - `page` *(optional)*: number ≥ 1 (default `1`)
  - `limit` *(optional)*: number between 1 and 100 (default `10`)
  - `search` *(optional)*: case-insensitive match on `name` or `description`
- `gradeLevel` *(optional)*: exact grade-level match
- `includeTrashed` *(optional)*: include trashed classes alongside active ones
- `onlyTrashed` *(optional)*: return only trashed classes
- **Response**:
  ```json
  {
    "data": [
      {
        "_id": "...",
        "name": "Mathematics 101",
        "gradeLevel": "Grade 6",
        "capacity": 30,
        "studentCount": 12,
        "status": "active",
        "classTeacher": { /* populated teacher data */ }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
  ```

### Retrieve Class by ID

- **Method**: `GET /classes/:id`
- **Response**: Populated class document. Returns `404` if the class does not exist.

### Update Class

- **Method**: `PATCH /classes/:id`
- **Body**: Any subset of the create payload fields (except `studentCount`, which is internally managed).
- **Rules**:
  - Updating `classTeacher` triggers the same teacher-role validation as creation.
  - `capacity` cannot be set below the current `studentCount`.
  - Trashed classes must be restored before they can be updated.

### Soft-Delete (Trash) Class

- **Method**: `DELETE /classes/:id`
- **Response**: `204 No Content` on success. Marks the class as trashed without removing it from the database.
- **Notes**: Trashed classes are excluded from results unless `includeTrashed` or `onlyTrashed` is used.

### Restore Class

- **Method**: `PATCH /classes/:id/restore`
- **Response**: Restored class document. Returns `400` if the class is not trashed.

### Permanently Delete Class

- **Method**: `DELETE /classes/:id/permanent`
- **Response**: `204 No Content` on success. Class must already be in the trash.

### Bulk Operations

- **Method**: `POST /classes/bulk/trash`
- **Body**: `{ "ids": ["..."] }` — moves multiple classes to the trash.
- **Method**: `POST /classes/bulk/restore`
- **Body**: `{ "ids": ["..."] }` — restores multiple trashed classes.
- **Method**: `POST /classes/bulk/permanent`
- **Body**: `{ "ids": ["..."] }` — permanently removes trashed classes.

- **Responses**: Bulk endpoints return the number of modified/deleted records.

## Student Count Management

Student counts are managed through service-level helpers rather than direct API inputs:

| Method                                  | Description                                                       |
|-----------------------------------------|-------------------------------------------------------------------|
| `ClassesService.incrementStudentCount`  | Increases `studentCount` by a positive amount (capacity-checked). Fails when the class is trashed. |
| `ClassesService.decrementStudentCount`  | Decreases `studentCount` by a positive amount (floored at zero). Fails when the class is trashed.  |

Use these helpers from other modules (e.g., enrollment flows) to keep class sizes in sync. Both methods return the updated, teacher-populated class document.

## Validation & Error Handling

- Requests leverage `class-validator` decorators for DTO validation.
- Errors include:
  - `400 Bad Request`: invalid payloads, assigning non-teacher as instructor, exceeding capacity, or lowering capacity below `studentCount`.
  - `404 Not Found`: class records not found for `GET`, `PATCH`, `DELETE`, or student count adjustments.
- All responses use standard NestJS exception filters configured in the application.

## Dependencies

- Requires the `users` module to be active so teacher lookups can confirm the instructor role.
- Relies on Mongoose for data persistence and population of `classTeacher` references.


