# Marks Module

The marks module encapsulates everything needed to capture, edit, and report on assessment marks for students. It is implemented as a NestJS feature module backed by Mongoose models and secured with JWT + role-based guards.

## High-level Responsibilities
- Persist per-student marks with term, subject, and assessment metadata in the `Marks` collection.
- Allow teachers and admins to enter marks individually or in bulk.
- Allow teachers and admins to update existing marks (score and/or comment) without any approval workflow.
- Provide helper aggregations for analytics (subject averages, class performance, student reports).

## Data Model Snapshot
- Collection: `marks`
- Schema (`marks.schema.ts`):
  - `student`: `ObjectId` (ref `Student`)
  - `subject`: `ObjectId` (ref `Subject`)
  - `class`: `ObjectId` (ref `Class`) *(set in service though not explicitly decorated in schema)*
  - `assessment`: `ObjectId` (ref `Assessment`)
  - `academicYear`: `string`
  - `term`: `string`
  - `assessmentType`: `string` (`exam`, `practical cat`, `practical exam`, `cat`, etc.)
  - `score`: `number`
  - `maxScore`: `number` (defaults to subject `maxScore`)
  - `comment`: `string`
  - `weight`: `number` (default `1`)
  - `createdBy` / `updatedBy`: `ObjectId` (ref `Teacher`)
- Indexed by combinations of student/subject/year/term/assessmentType for fast lookups.

## Authentication & Authorization
- All controller endpoints are decorated with `@UseGuards(JwtAuthGuard, RolesGuard)`.
- Teacher-only operations: enter marks, bulk enter, list marks, update marks.
- Admin-only operations: same as teacher (no additional approval step required).

## API Surface

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/marks` | `teacher`, `admin` | Enter a single mark. |
| `POST` | `/api/marks/bulk` | `teacher`, `admin` | Enter multiple marks in one request. |
| `POST` | `/api/marks/update/:id` | `teacher`, `admin` | Update score and/or comment for an existing mark. |
| `GET` | `/api/marks` | `teacher`, `admin` | Return all stored marks documents. |

All POST endpoints require a Bearer access token (`Authorization: Bearer <JWT>`).

## DTOs & Payloads

### Single Mark (`EnterMarkDto`)
- `studentId` *(string, required)*: Student `_id`.
- `subjectId` *(string, required)*: Subject `_id`.
- `classId` *(string, required)*: Class `_id`.
- `academicYear` *(string, required)*: e.g. `"2024/2025"`.
- `term` *(string, required)*: e.g. `"Term 1"`.
- `assessmentType` *(string, optional)*: Freely named; consider using `AssessmentType` enum.
- `score` *(number, required)*: 0..`subject.maxScore`.
- `comment` *(string, optional)*: Teacher remark.

### Bulk Mark (`BulkMarksDto`)
- `marks`: `SingleMark[]` with `assessmentType` required and validated against the enum (`exam`, `practical cat`, `practical exam`, `cat`).

### Update Mark
- `score?`: Optional numeric score override validated against the linked subject's `maxScore`.
- `comment?`: Optional comment string.

## Endpoint Details & Samples

### Enter a Single Mark
- **Request** `POST /api/marks`

```json
{
  "studentId": "665fe4d7b6c12345f0a5d111",
  "subjectId": "665fea72a1b6789012cdef45",
  "classId": "665fd2103fe9abcd0d123458",
  "academicYear": "2024/2025",
  "term": "Term 1",
  "assessmentType": "exam",
  "score": 78,
  "comment": "Great improvement"
}
```

- **Success (201)**: Returns the created mark document.
- **Errors**: `404 Subject not found`, `400 score must be between 0 and <max>`, `400 class id "<id>" not found`.

### Bulk Enter Marks
- **Request** `POST /api/marks/bulk`

```json
{
  "marks": [
    {
      "studentId": "665fe4d7b6c12345f0a5d111",
      "subjectId": "665fea72a1b6789012cdef45",
      "classId": "665fd2103fe9abcd0d123458",
      "academicYear": "2024/2025",
      "term": "Term 1",
      "assessmentType": "cat",
      "score": 32,
      "comment": "Missing homework"
    },
    {
      "studentId": "665fe4d7b6c12345f0a5d112",
      "subjectId": "665fea72a1b6789012cdef45",
      "classId": "665fd2103fe9abcd0d123458",
      "academicYear": "2024/2025",
      "term": "Term 1",
      "assessmentType": "cat",
      "score": 45
    }
  ]
}
```

- **Success**: `{ "results": [{ "ok": true, "id": "<markId>" }, { "ok": false, "error": "...", "mark": { ... } }] }`
- The loop catches individual errors so one failing mark does not cancel the others.

### Update Mark
- **Request** `POST /api/marks/update/:id`

```json
{
  "score": 80,
  "comment": "Corrected typo in grade"
}
```

- Validates the score against the subject's configured `maxScore`. Updates `maxScore` snapshot on the mark at the same time.

### List Marks
- **Request** `GET /api/marks`
- Returns every mark record (no pagination or filtering implemented; consider adding when required).

## Aggregation Helpers (Service Only)
These are not wired to controller routes but are available for other modules:
- `getSubjectAggregatedMarks` – Average/highest/lowest for a subject.
- `getClassPerformance` – Per-subject averages and top students for a class.
- `getClassSubjectQuarterAverages` – Quarter-wise subject averages.
- `getStudentAcademicReport` – Term-by-term breakdown of CAT vs Exam totals per subject.

Expose additional REST endpoints or GraphQL resolvers as needed if consumers require this analytics data.

## Error Handling & Auditing
- Throws standard Nest exceptions (`BadRequestException`, `NotFoundException`).

## Testing & Tooling Tips
- Use Swagger UI (if enabled) to explore the routes tagged under `Marks`.
- When writing e2e tests, seed subjects/classes/students to satisfy validation checks in `enterMark`.
- For data cleanup in tests, remember that `bulk` operations return per-record success states—assert on both success and error branches.


