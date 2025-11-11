# Students Module

This module exposes a set of REST endpoints for managing students, their class assignments, and soft-delete lifecycle. All routes are protected with the JWT access guard; include a valid `Authorization: Bearer <token>` header.

Base path: `/students`

## Data Model Highlights

- `studentId` – required, unique per school.
- `name` – required full name.
- `class` – optional `Class` reference. Counts are incremented/decremented automatically when a class is set or removed.
- `status` – one of `active | graduated | transferred | suspended` (default `active`).
- Soft delete is tracked with `isTrashed` and `trashedAt`.

Students may exist without a class (for example when suspended or trashed). When trashed, any existing class assignment is cleared and the class headcount is decremented. Restoring a student leaves them without a class until one is reassigned.

## Endpoints

- `POST /students`
  - Body: `CreateStudentDto`
    - Required: `studentId`, `name`
    - Optional: `classId`, `schoolId`, contact/guardian fields, `status`, `isTrashed`
    - If `classId` is supplied, capacity is validated and the class count increments (skipped when `isTrashed` is `true`).

- `GET /students`
  - Query (`QueryStudentsDto`):
    - Pagination: `page` (default 1), `limit` (default 25, max 100)
    - Filtering: `search` (name, studentId, email, phone), `status`, `guardianRelationShip`, `classId`, `schoolId`
    - Trash controls: `includeTrashed`, `onlyTrashed`
    - Sorting: `sortBy` (`createdAt|updatedAt|name|studentId|status`), `sortOrder` (`asc|desc`)
  - Returns `{ data: Student[], meta: { total, page, limit, pages } }`

- `GET /students/:id`
  - Returns a single student (class and school populated). `404` if not found.

- `PATCH /students/:id`
  - Body: any subset of `UpdateStudentDto`
  - `classId` may be set to a new `ObjectId` or to `null` to unassign. Capacity and class counters adjust automatically.
  - Setting `isTrashed` to `true` clears the class and records `trashedAt`; setting back to `false` simply restores the student without reassigning a class.

- `PATCH /students/:id/class`
  - Body: `{ classId: '<ObjectId>' }` to assign/transfer or `{ classId: null }` to unassign.
  - Operates even if other fields should stay untouched.

- `PATCH /students/:id/trash`
  - Moves a student to trash, clears their class (if any), and decrements the class count.

- `PATCH /students/:id/restore`
  - Restores a trashed student. No class is assigned automatically.

- `DELETE /students/:id`
  - Permanently removes the student. If they had a class and were not trashed, the class count is decremented first.

## Usage Tips

- Always send ISO 8601 strings for date fields (`dob`, `enrollmentDate`).
- To remove optional values (`dob`, `schoolId`, etc.) during updates, send them explicitly as `null`.
- When importing or bulk creating, avoid assigning classes to trashed students; the service rejects that combination.
- To audit trash operations, rely on the `trashedAt` timestamp; listings with `includeTrashed=true` expose both active and trashed records.

## DTO Reference

### `CreateStudentDto`
- `studentId` *(string, required)* – unique admission number per school.
- `name` *(string, required)* – full display name.
- `classId` *(string, optional)* – `Class` document `_id`; triggers capacity check and student count increment when provided.
- `email` *(string, optional)* – validated as email and normalised to lowercase.
- `phoneNumber`, `gender`, `address`, `previousSchool`, `guardianName`, `guardianPhoneNumber`, `guardianEmergencyContact`, `medicalInformation`, `additionalNotes` *(string, optional)*.
- `dob`, `enrollmentDate` *(ISO date string, optional)* – converted to `Date`.
- `guardianRelationShip` *(enum: father|mother|guardian|other, optional)*.
- `status` *(enum: active|graduated|transferred|suspended, optional, defaults to active)*.
- `schoolId` *(string, optional)* – `School` document `_id`.
- `isTrashed` *(boolean, optional)* – initialise student in trash state (skips class increment).

### `UpdateStudentDto`
- Extends `PartialType(CreateStudentDto)`; all fields optional.
- `classId` may be supplied to assign or set explicitly to `null` to unassign.
- `isTrashed` toggles trash state (class cleared automatically when set to `true`).

### `QueryStudentsDto`
- `page` *(number, optional)* – default 1.
- `limit` *(number, optional)* – default 25, max 100.
- `search` *(string, optional)* – fuzzy search across `name`, `studentId`, `email`, `phoneNumber`.
- `status`, `guardianRelationShip` *(enum filters, optional)*.
- `classId`, `schoolId` *(string ObjectId filters, optional)*.
- `includeTrashed`, `onlyTrashed` *(boolean flags, optional)* – control soft-delete visibility.
- `sortBy` *(string, optional)* – `createdAt|updatedAt|name|studentId|status`; default `createdAt`.
- `sortOrder` *(string, optional)* – `asc|desc`; default `desc`.

### `ChangeStudentClassDto`
- `classId` *(string or null, optional)* – new class to assign (capacity checked) or `null` to clear class.


