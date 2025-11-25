import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StudentPerformanceService } from './student-performance.service';
import { Marks } from 'src/marks/schemas/marks.schema';

describe('StudentPerformanceService', () => {
  let service: StudentPerformanceService;
  let marksModel: { find: jest.Mock };

  const setupFindMock = (result: any[]) => {
    const execMock = jest.fn().mockResolvedValue(result);
    const leanMock = jest.fn().mockReturnValue({ exec: execMock });
    const populateMock = jest.fn().mockReturnValue({ lean: leanMock });
    marksModel.find.mockImplementationOnce(() => ({
      populate: populateMock,
    }));
    return { execMock, leanMock, populateMock };
  };

  beforeEach(async () => {
    marksModel = { find: jest.fn() as any };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentPerformanceService,
        {
          provide: getModelToken(Marks.name),
          useValue: marksModel,
        },
      ],
    }).compile();

    service = module.get(StudentPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns subject summaries with overall percentages', async () => {
    const studentObjectId = new Types.ObjectId();
    const studentId = studentObjectId.toHexString();
    const subjectId = new Types.ObjectId();
    const summaryMarks = [
      {
        _id: new Types.ObjectId(),
        student: studentObjectId,
        subject: { _id: subjectId, name: 'Mathematics', code: 'MATH', maxScore: 100 },
        academicYear: '2024/2025',
        term: 'Term 1',
        score: 90,
        assessment: {
          _id: new Types.ObjectId(),
          title: 'Midterm',
          AssessmentType: 'Exam',
          maxScore: 100,
        },
      },
      {
        _id: new Types.ObjectId(),
        student: studentObjectId,
        subject: { _id: subjectId, name: 'Mathematics', code: 'MATH', maxScore: 100 },
        academicYear: '2024/2025',
        term: 'Term 2',
        score: 90,
        assessment: {
          _id: new Types.ObjectId(),
          title: 'Final',
          AssessmentType: 'Exam',
          maxScore: 100,
        },
      },
    ];

    const { populateMock } = setupFindMock(summaryMarks);

    const result = await service.getStudentPerformanceSummary(studentId, {
      academicYear: '2024/2025',
    });

    expect(marksModel.find).toHaveBeenCalled();
    const matchArgs = marksModel.find.mock.calls[0][0];
    expect(String(matchArgs.student)).toEqual(studentId);
    expect(matchArgs.academicYear).toEqual('2024/2025');
    expect(populateMock).toHaveBeenCalledWith([
      { path: 'assessment', select: 'title AssessmentType maxScore deadline' },
      { path: 'subject', select: 'name code maxScore' },
      { path: 'class', select: 'name' },
    ]);

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
    const studentObjectId = new Types.ObjectId();
    const studentId = studentObjectId.toHexString();
    const subjectId = new Types.ObjectId();
    const classId = new Types.ObjectId();
    const assessmentId = new Types.ObjectId();
    const assignmentMarks = [
      {
        _id: new Types.ObjectId(),
        student: studentObjectId,
        subject: { _id: subjectId, name: 'Science', code: 'SCI', maxScore: 100 },
        class: { _id: classId, name: 'Class A' },
        academicYear: '2024/2025',
        term: 'Term 1',
        score: 85,
        assessmentType: 'Exam',
        assessment: {
          _id: assessmentId,
          title: 'Midterm',
          AssessmentType: 'Exam',
          maxScore: 100,
          deadline: new Date('2024-02-01'),
        },
      },
    ];

    const { populateMock } = setupFindMock(assignmentMarks);

    const result = await service.getStudentAssignmentsBreakdown(studentId, {
      subjectId: subjectId.toHexString(),
    });

    expect(marksModel.find).toHaveBeenCalled();
    const matchArgs = marksModel.find.mock.calls[0][0];
    expect(String(matchArgs.student)).toEqual(studentId);
    expect(String(matchArgs.subject)).toEqual(subjectId.toHexString());
    expect(populateMock).toHaveBeenCalledWith([
      { path: 'assessment', select: 'title AssessmentType maxScore deadline' },
      { path: 'subject', select: 'name code maxScore' },
      { path: 'class', select: 'name' },
    ]);

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
              assessmentId: assessmentId.toHexString(),
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

    expect(marksModel.find).not.toHaveBeenCalled();
  });
});
