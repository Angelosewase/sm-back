// analytics.dto.ts
export interface TimeSeriesItem {
  month: string; // "Jan", "Feb", ...
  students: number;
  teachers: number;
  staff: number;
}

export interface GenderDistributionItem {
  gender: 'male' | 'female' | 'other';
  count: number;
  percentage: string;
}

export interface AnalyticsResponseDto {
  // Time-series (last 3/6/12 months)
  timeSeries: {
    last3Months: TimeSeriesItem[];
    last6Months: TimeSeriesItem[];
    last12Months: TimeSeriesItem[];
  };

  // Overall trend
  trend: {
    change: string; // "+8.7%"
    label: string;  // "Trending up by 8.7% this period"
  };

  // Gender distribution (current academic year)
  genderDistribution: GenderDistributionItem[];
}


export interface RegistrationAnalyticsDto {
  timeSeries: {
    last3Months: TimeSeriesItem[];
    last6Months: TimeSeriesItem[];
    last12Months: TimeSeriesItem[];
  };
  trend: {
    change: string;
    label: string;
  };
  genderDistribution: GenderDistributionItem[];
}