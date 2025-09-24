export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
  timestamp: Date;
  category?: string;
  success?: boolean;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  responseTime?: number;
}

export interface TestSuite {
  name: string;
  startTime: Date;
  endTime: Date;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
    averageResponseTime: number;
  };
}

export interface TestReport {
  testSuite: TestSuite;
  performanceMetrics: PerformanceMetrics[];
  issues: string[];
  recommendations: string[];
}