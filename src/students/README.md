## Student Performance API

These endpoints let you retrieve a student’s performance broken down by subject, term, academic year, and individual assessments.

All routes require an authenticated request and share the base path:

```
/api/students/:studentId/performance
```

### Common Query Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `academicYear` | `string` | Filter by year label (e.g. `2024/2025`). Use `all` to include every year. |
| `term` | `string` | Filter by stored term label (`Term 1`, `Q1`, etc.). Use `all` to include every term. |
| `subjectId` | `ObjectId` | Restrict results to a subject. |
| `classId` | `ObjectId` | Restrict to marks associated with a class. |
| `assessmentId` | `ObjectId` | Focus on a specific assessment. |
| `assessmentType` | `string` | Filter by assessment type (`Exam`, `Quiz`, etc.). |

All parameters are optional. Omitted values return the full data set for the chosen student.

---

### 1. GET `/summary`

Returns overall and per-term totals for each subject the student has marks for.

#### Example Request

```
GET /api/students/665f3.../performance/summary?academicYear=2024/2025&term=Term%201
Authorization: Bearer <token>
```

#### Example Response

```json
{
  "subjects": [
    {
      "subjectId": "664ab...",
      "subjectName": "Mathematics",
      "totalScore": 180,
      "totalMax": 200,
      "percentage": 90,
      "terms": [
        {
          "term": "Term 1",
          "totalScore": 90,
          "totalMax": 100,
          "percentage": 90
        },
        {
          "term": "Term 2",
          "totalScore": 90,
          "totalMax": 100,
          "percentage": 90
        }
      ]
    }
  ],
  "overall": {
    "totalScore": 180,
    "totalMax": 200,
    "percentage": 90
  }
}
```

---

### 2. GET `/assignments`

Shows the student’s history per assessment, grouped by academic year and subject.

#### Example Request

```
GET /api/students/665f3.../performance/assignments?subjectId=664ab...
Authorization: Bearer <token>
```

#### Example Response

```json
[
  {
    "academicYear": "2024/2025",
    "subjects": [
      {
        "subjectId": "664ab...",
        "subjectName": "Science",
        "subjectCode": "SCI",
        "classId": "663cd...",
        "className": "S2 A",
        "totalScore": 85,
        "totalMax": 100,
        "percentage": 85,
        "assignments": [
          {
            "assessmentId": "662fa...",
            "title": "Midterm",
            "term": "Term 1",
            "assessmentType": "Exam",
            "score": 85,
            "maxScore": 100,
            "percentage": 85,
            "deadline": "2024-02-01T00:00:00.000Z"
          }
        ]
      }
    ]
  }
]
```

---

### Error Handling

- `400 Bad Request` – any supplied ID fails ObjectId validation.
- `404 Not Found` – student ID does not exist or caller lacks permission.

---

### Tips

- Use `term=all` or omit the parameter to compare performance across the whole academic year.
- Combine `subjectId` and `assessmentType` to find how a student performs in a subject for a specific assessment type (e.g. quizzes vs. exams).
- The `classId` filter lets you analyse students who moved classes during the year by isolating marks from a particular class.


