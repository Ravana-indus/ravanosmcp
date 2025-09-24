import { HRIntegrationTests } from '../test/hr-integration.test';
import * as fs from 'fs';
import * as path from 'path';

async function runHRTests() {
  console.log('🚀 Starting HR Operations Integration Tests');
  console.log('===========================================');

  // Load environment variables
  const testEnvPath = path.join(__dirname, '../.env.test');
  if (fs.existsSync(testEnvPath)) {
    console.log('📝 Loading test environment from .env.test');
    require('dotenv').config({ path: testEnvPath });
  }

  // Also try .env file
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    console.log('📝 Loading environment from .env');
    require('dotenv').config({ path: envPath });
  }

  // Display configuration
  console.log('📋 Configuration:');
  console.log(`   ERPNext URL: ${process.env.ERPNEXT_URL || 'https://demo.ravanos.com'}`);
  console.log(`   API Key: ${process.env.ERPNEXT_API_KEY ? '***' + process.env.ERPNEXT_API_KEY.slice(-4) : 'using default'}`);
  console.log(`   API Secret: ${process.env.ERPNEXT_API_SECRET ? '***' : 'using default'}`);
  console.log('');

  const tester = new HRIntegrationTests();

  try {
    await tester.initialize();

    const testSuite = await tester.runAllTests();
    const report = tester.generateReport();

    console.log(report);

    // Save report to file
    const reportPath = path.join(__dirname, '../test-results/hr-test-report.md');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Test report saved to: ${reportPath}`);

    // Save detailed results as JSON
    const resultsPath = path.join(__dirname, '../test-results/hr-test-results.json');
    const resultsData = {
      testSuite,
      performanceMetrics: tester.getPerformanceMetrics(),
      testData: {
        checkinRecords: testSuite.results.filter(r => r.testName.includes('Check-in')).length,
        checkoutRecords: testSuite.results.filter(r => r.testName.includes('Check-out')).length,
        leaveApplications: testSuite.results.filter(r => r.testName.includes('Leave Application')).length,
        pendingApprovals: testSuite.results.filter(r => r.testName.includes('Pending Approvals')).length,
        documentApprovals: testSuite.results.filter(r => r.testName.includes('Approve Document')).length
      },
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
    console.log(`📊 Detailed results saved to: ${resultsPath}`);

    // Save performance metrics separately
    const metricsPath = path.join(__dirname, '../test-results/hr-performance-metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(tester.getPerformanceMetrics(), null, 2));
    console.log(`📈 Performance metrics saved to: ${metricsPath}`);

    // Exit with appropriate code
    const successRate = testSuite.summary.successRate;
    console.log(`\n🎯 Final Results: ${successRate}% success rate`);

    if (successRate >= 90) {
      console.log('✅ All tests completed successfully!');
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

    // Try to save any partial results
    try {
      const errorReportPath = path.join(__dirname, '../test-results/hr-test-error.log');
      fs.writeFileSync(errorReportPath, `Test execution failed at ${new Date().toISOString()}\n\nError: ${error}\n\nStack: ${(error as Error).stack}`);
      console.log(`📄 Error report saved to: ${errorReportPath}`);
    } catch (saveError) {
      console.error('Failed to save error report:', saveError);
    }

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

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(1);
});

runHRTests();