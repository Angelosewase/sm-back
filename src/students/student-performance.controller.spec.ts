import { Test, TestingModule } from '@nestjs/testing';
import { StudentPerformanceController } from './student-performance.controller';
import { StudentPerformanceService } from './student-performance.service';
import { StudentPerformanceQueryDto } from './dto/student-performance-query.dto';

describe('StudentPerformanceController', () => {
  let controller: StudentPerformanceController;
  let service: jest.Mocked<StudentPerformanceService>;

  beforeEach(async () => {
    const serviceMock: jest.Mocked<StudentPerformanceService> = {
      getStudentPerformanceSummary: jest.fn(),
      getStudentAssignmentsBreakdown: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentPerformanceController],
      providers: [
        {
          provide: StudentPerformanceService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(StudentPerformanceController);
    service = module.get(StudentPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to service for summary endpoint', async () => {
    const studentId = 'student123';
    const query: StudentPerformanceQueryDto = {
      academicYear: '2024/2025',
      term: 'Term 1',
    };
    const summaryResult = { subjects: [], overall: { totalScore: 0, totalMax: 0, percentage: null } };
    service.getStudentPerformanceSummary.mockResolvedValue(summaryResult as any);

    const result = await controller.getSummary(studentId, query);

    expect(service.getStudentPerformanceSummary).toHaveBeenCalledWith(
      studentId,
      query,
    );
    expect(result).toBe(summaryResult);
  });

  it('delegates to service for assignments endpoint', async () => {
    const studentId = 'student123';
    const query: StudentPerformanceQueryDto = { subjectId: '507f1f77bcf86cd799439011' };
    const breakdownResult = [{ academicYear: '2024/2025', subjects: [] }];
    service.getStudentAssignmentsBreakdown.mockResolvedValue(breakdownResult as any);

    const result = await controller.getAssignmentsBreakdown(studentId, query);

    expect(service.getStudentAssignmentsBreakdown).toHaveBeenCalledWith(
      studentId,
      query,
    );
    expect(result).toBe(breakdownResult);
  });
});

