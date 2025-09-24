import { CRUDIntegrationTests } from '../test/crud-integration.test';
import * as fs from 'fs';
import * as path from 'path';

async function runCRUDTests() {
  console.log('🚀 Starting CRUD Operations Integration Tests');
  console.log('============================================');

  // Load environment variables
  const testEnvPath = path.join(__dirname, '../.env.test');
  if (fs.existsSync(testEnvPath)) {
    console.log('📝 Loading test environment from .env.test');
    require('dotenv').config({ path: testEnvPath });
  }

  const tester = new CRUDIntegrationTests();
  await tester.initialize();

  try {
    const testSuite = await tester.runAllTests();
    const report = tester.generateReport();

    console.log(report);

    // Save report to file
    const reportPath = path.join(__dirname, '../test-results/crud-test-report.md');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Test report saved to: ${reportPath}`);

    // Save detailed results as JSON
    const resultsPath = path.join(__dirname, '../test-results/crud-test-results.json');
    const resultsData = {
      testSuite,
      performanceMetrics: tester.getPerformanceMetrics(),
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
    console.log(`📊 Detailed results saved to: ${resultsPath}`);

    // Exit with appropriate code
    const successRate = testSuite.summary.successRate;
    if (successRate >= 90) {
      console.log('✅ Tests completed successfully!');
      process.exit(0);
    } else if (successRate >= 70) {
      console.log('⚠️ Tests completed with some failures');
      process.exit(1);
    } else {
      console.log('❌ Tests completed with significant failures');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

runCRUDTests();