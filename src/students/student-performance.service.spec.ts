import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StudentPerformanceService } from './student-performance.service';
import { Marks } from 'src/marks/schemas/marks.schema';
import { Assessment } from 'src/assessments/schemas/assessment-schema';
import { Subject } from 'src/subjects/schemas/subject.schema';
import { Class } from 'src/classes/schemas/class.schema';

describe('StudentPerformanceService', () => {
  let service: StudentPerformanceService;
  let marksAggregate: jest.Mock;

  const createAggregateReturn = (payload: any) => ({
    exec: jest.fn().mockResolvedValue(payload),
  });

  beforeEach(async () => {
    marksAggregate = jest.fn();

    const assessmentsModelMock = { collection: { name: 'assessments' } };
    const subjectsModelMock = { collection: { name: 'subjects' } };
    const classesModelMock = { collection: { name: 'classes' } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentPerformanceService,
        {
          provide: getModelToken(Marks.name),
          useValue: {
            aggregate: marksAggregate,
          },
        },
        {
          provide: getModelToken(Assessment.name),
          useValue: assessmentsModelMock,
        },
        {
          provide: getModelToken(Subject.name),
          useValue: subjectsModelMock,
        },
        {
          provide: getModelToken(Class.name),
          useValue: classesModelMock,
        },
      ],
    }).compile();

    service = module.get(StudentPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns subject summaries with overall percentages', async () => {
    const studentId = new Types.ObjectId().toHexString();
    const summaryRows = [
      {
        _id: new Types.ObjectId(),
        subjectName: 'Mathematics',
        totalScore: 180,
        totalMax: 200,
        terms: [
          { term: 'Term 1', totalScore: 90, totalMax: 100 },
          { term: 'Term 2', totalScore: 90, totalMax: 100 },
        ],
      },
    ];

    const execMock = createAggregateReturn(summaryRows);
    marksAggregate.mockReturnValueOnce(execMock);

    const result = await service.getStudentPerformanceSummary(studentId, {
      academicYear: '2024/2025',
      term: 'Term 1',
    });

    expect(marksAggregate).toHaveBeenCalledTimes(1);
    const pipeline = marksAggregate.mock.calls[0][0];
    expect(pipeline[0]).toMatchObject({
      $match: expect.objectContaining({
        student: new Types.ObjectId(studentId),
        academicYear: '2024/2025',
        term: 'Term 1',
      }),
    });

    expect(result.subjects).toHaveLength(1);
    expect(result.subjects[0]).toMatchObject({
      subjectName: 'Mathematics',
      totalScore: 180,
      totalMax: 200,
      percentage: 90,
      terms: [
        { term: 'Term 1', totalScore: 90, totalMax: 100, percentage: 90 },
        { term: 'Term 2', totalScore: 90, totalMax: 100, percentage: 90 },
      ],
    });
    expect(result.overall).toEqual({
      totalScore: 180,
      totalMax: 200,
      percentage: 90,
    });
  });

  it('returns assignment breakdown grouped by academic year and subject', async () => {
    const studentId = new Types.ObjectId().toHexString();
    const assignmentRows = [
      {
        _id: '2024/2025',
        academicYear: '2024/2025',
        subjects: [
          {
            subjectId: new Types.ObjectId(),
            subjectName: 'Science',
            subjectCode: 'SCI',
            classId: new Types.ObjectId(),
            className: 'Class A',
            totalScore: 85,
            totalMax: 100,
            assignments: [
              {
                assessmentId: new Types.ObjectId(),
                title: 'Midterm',
                term: 'Term 1',
                assessmentType: 'Exam',
                score: 85,
                maxScore: 100,
                deadline: new Date('2024-02-01'),
              },
            ],
          },
        ],
      },
    ];

    const execMock = createAggregateReturn(assignmentRows);
    marksAggregate.mockReturnValueOnce(execMock);

    const result = await service.getStudentAssignmentsBreakdown(studentId, {
      subjectId: assignmentRows[0].subjects[0].subjectId.toHexString(),
    });

    expect(marksAggregate).toHaveBeenCalledTimes(1);
    const pipeline = marksAggregate.mock.calls[0][0];
    expect(pipeline[0]).toMatchObject({
      $match: expect.objectContaining({
        student: new Types.ObjectId(studentId),
        subject: assignmentRows[0].subjects[0].subjectId,
      }),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      academicYear: '2024/2025',
      subjects: [
        {
          subjectName: 'Science',
          totalScore: 85,
          totalMax: 100,
          percentage: 85,
          assignments: [
            {
              title: 'Midterm',
              term: 'Term 1',
              assessmentType: 'Exam',
              score: 85,
              maxScore: 100,
              percentage: 85,
            },
          ],
        },
      ],
    });
  });

  it('throws when provided invalid ObjectIds in filters', async () => {
    const studentId = new Types.ObjectId().toHexString();

    await expect(
      service.getStudentPerformanceSummary(studentId, {
        subjectId: 'not-an-object-id',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(marksAggregate).not.toHaveBeenCalled();
  });
});

