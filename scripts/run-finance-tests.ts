import { FinanceIntegrationTests } from '../test/finance-integration.test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

async function runFinanceTests() {
  console.log('🚀 Starting Finance Domain Integration Tests...');
  console.log('=================================================');

  const tester = new FinanceIntegrationTests();

  try {
    // Initialize test environment
    await tester.initialize();

    // Run all tests
    const testSuite = await tester.runAllTests();

    // Generate report
    const report = tester.generateReport();

    // Output results to console
    console.log(report);

    // Save report to file
    const reportsDir = join(process.cwd(), 'test-reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(reportsDir, `finance-test-report-${timestamp}.txt`);

    writeFileSync(reportFile, report);
    console.log(`\n📄 Test report saved to: ${reportFile}`);

    // Save performance metrics
    const metricsFile = join(reportsDir, `finance-performance-metrics-${timestamp}.json`);
    const metricsData = {
      testSuite,
      performanceMetrics: tester.getPerformanceMetrics(),
      testResults: tester.getTestResults()
    };

    writeFileSync(metricsFile, JSON.stringify(metricsData, null, 2));
    console.log(`📊 Performance metrics saved to: ${metricsFile}`);

    // Return test results for potential CI/CD integration
    const successRate = testSuite.summary.successRate;
    const isSuccess = successRate >= 80; // 80% success threshold

    console.log(`\n🎯 Test Summary:`);
    console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`   Status: ${isSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Threshold: 80%`);

    process.exit(isSuccess ? 0 : 1);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test execution terminated');
  process.exit(1);
});

// Run tests
runFinanceTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});