# Teachers Module Quick Guide

Base path: `/api/teachers`

## Listing Teachers
- `GET /api/teachers`
- Query params you can combine:
  - `q`: fuzzy match on name/email (delegated to users service)
  - `status`: `Active | On Leave | Inactive`
  - `department`: plain string match
  - `subjectId`: subject ObjectId present in `subjectsCanTeach`
  - `classId`: class ObjectId present in `assignedClasses`
  - `includeTrashed`: `true` to include trashed rows
  - `onlyTrashed`: `true` to return only trashed rows
  - `page`, `limit`, `sortBy`, `order`: standard paging options

## Trash Workflow
- Move one teacher to trash: `DELETE /api/teachers/:id`
- Restore: `PATCH /api/teachers/:id/restore`
- Permanently delete (only from trash): `DELETE /api/teachers/:id/permanent`
- Bulk actions (body `{ "ids": ["..."] }`):
  - `POST /api/teachers/bulk/trash`
  - `POST /api/teachers/bulk/restore`
  - `POST /api/teachers/bulk/permanent`

## Subject & Class Assignments
- Assign classes: `POST /api/teachers/:id/classes` with `{ "classIds": [] }`
- Remove classes: `DELETE /api/teachers/:id/classes`
- Assign subjects: `POST /api/teachers/:id/subjects` with `{ "subjectIds": [] }`
- Remove subjects: `DELETE /api/teachers/:id/subjects`
- All assignment mutations are blocked when the teacher is in the trash.

## Create / Update
- `POST /api/teachers` creates both user and teacher records. Optional fields include `department`, `subjectsCanTeach`, `assignedClasses`, `status`, and contact details.
- `PATCH /api/teachers/:id` updates teacher metadata (fails if trashed).

## Behaviour Notes
- Trashing a teacher:
  - clears their `classTeacher` assignments,
  - unsets them on subject schedules (`SubjectAssignment.teacher`),
  - keeps the underlying user record alive.
- Permanent deletion removes the teacher profile, related assignments, and the user record.
- All ID parameters expect valid MongoDB ObjectIds.

Keep it simple: stick to these endpoints, supply valid IDs, and respect the trash → restore/permanent flow. No code spelunking required.


