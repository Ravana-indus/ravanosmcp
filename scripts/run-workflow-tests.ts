import { WorkflowIntegrationTests } from '../test/workflow-integration.test';
import * as fs from 'fs';
import * as path from 'path';

async function runWorkflowTests() {
  console.log('🚀 Starting Workflow Operations Integration Tests');
  console.log('================================================');

  // Load environment variables
  const testEnvPath = path.join(__dirname, '../.env.test');
  if (fs.existsSync(testEnvPath)) {
    console.log('📝 Loading test environment from .env.test');
    require('dotenv').config({ path: testEnvPath });
  }

  // Check for required environment variables
  if (!process.env.ERPNEXT_URL) {
    console.log('📝 Using default ERPNext URL: https://demo.ravanos.com');
    process.env.ERPNEXT_URL = 'https://demo.ravanos.com';
  }

  if (!process.env.ERPNEXT_API_KEY) {
    console.log('📝 Using default ERPNext API Key');
    process.env.ERPNEXT_API_KEY = 'a6f82e11cf4a760';
  }

  if (!process.env.ERPNEXT_API_SECRET) {
    console.log('📝 Using default ERPNext API Secret');
    process.env.ERPNEXT_API_SECRET = '7473a669f6f6552';
  }

  const tester = new WorkflowIntegrationTests();
  await tester.initialize();

  try {
    const testSuite = await tester.runAllTests();
    const report = tester.generateReport();

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(report);

    // Save report to file
    const reportPath = path.join(__dirname, '../test-results/workflow-test-report.md');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Test report saved to: ${reportPath}`);

    // Save detailed results as JSON
    const resultsPath = path.join(__dirname, '../test-results/workflow-test-results.json');
    const resultsData = {
      testSuite,
      performanceMetrics: tester.getPerformanceMetrics(),
      testResults: tester.getTestResults(),
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
    console.log(`📊 Detailed results saved to: ${resultsPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testSuite.summary.total}`);
    console.log(`Passed: ${testSuite.summary.passed}`);
    console.log(`Failed: ${testSuite.summary.failed}`);
    console.log(`Success Rate: ${testSuite.summary.successRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${testSuite.summary.averageResponseTime.toFixed(2)}ms`);

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

runWorkflowTests();