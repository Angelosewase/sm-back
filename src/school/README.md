# School Module API Guide

This guide explains how to interact with the School module endpoints that manage school records. All routes are prefixed with `/school` and are secured according to the global application configuration (ensure you include any required authentication headers).

Swagger documentation is available at `/api-docs` when the service runs in non-production environments.

---

## Endpoints

### Create a School
- **URL:** `POST /school`
- **Body:**
  ```json
  {
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
    "website": "https://springfield.edu"
  }
  ```
- **Responses:**
  - `201 Created` – returns the created school document.
  - `400 Bad Request` – validation failure.
  - `409 Conflict` – duplicate name or other unique field.

---

### List Schools
- **URL:** `GET /school`
- **Description:** Returns all schools sorted alphabetically by name.
- **Responses:**
  - `200 OK` – array of school documents.

---

### Get a School by ID
- **URL:** `GET /school/:id`
- **Parameters:** `id` – Mongoose ObjectId of the school record.
- **Responses:**
  - `200 OK` – the matching school document.
  - `400 Bad Request` – invalid ObjectId.
  - `404 Not Found` – no school associated with the provided id.

---

### Update a School
- **URL:** `PATCH /school/:id`
- **Parameters:** `id` – ObjectId of the school record.
- **Body:** Provide only the fields you want to update. Same validation rules as the create payload.
- **Responses:**
  - `200 OK` – updated school document.
  - `400 Bad Request` – invalid ObjectId or validation failure.
  - `404 Not Found` – school not found.
  - `409 Conflict` – duplicate unique field.

---

### Delete a School
- **URL:** `DELETE /school/:id`
- **Parameters:** `id` – ObjectId of the school record.
- **Responses:**
  - `200 OK` – school deleted successfully.
  - `400 Bad Request` – invalid ObjectId.
  - `404 Not Found` – school not found.

---

## Validation Rules
The DTO layer enforces constraints using `class-validator`. Key requirements:
- `name`, `city`, `district`, `phoneNumber`, `email`, and `website` are required.
- `email` must be a valid email address.
- `website` must be a valid URL.
- `studentCapacity` must be an integer ≥ 0.
- `establishedYear` must be ≥ 1800 if provided.
- Length limits apply to text fields (see Swagger docs for details).

---

## Error Handling
The service translates common database and validation issues into NestJS HTTP exceptions:
- Invalid ObjectIds → `400 Bad Request`.
- Missing records → `404 Not Found`.
- Duplicate keys (e.g., reusing a unique name) → `409 Conflict`.

The response body follows the default NestJS error structure:
```json
{
  "statusCode": 409,
  "message": "A school with the provided unique details already exists",
  "error": "Conflict"
}
```

---

## Tips for Integration
- Use the Swagger UI (`/api-docs`) to explore endpoint contracts and test payloads.
- Reuse the DTO definitions (`CreateSchoolDto`, `UpdateSchoolDto`) if you generate clients from Swagger/OpenAPI.
- Ensure your requests supply authentication headers if required by the global guards.
- Log or handle `409 Conflict` responses to inform users about duplicate entries.


