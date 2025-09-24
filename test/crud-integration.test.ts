import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';
import { TestResult, TestSuite, PerformanceMetrics } from './types';

interface TestData {
  customerName?: string;
  itemName?: string;
  userName?: string;
  createdDocuments: Array<{
    doctype: string;
    name: string;
    data: Record<string, any>;
  }>;
}

export class CRUDIntegrationTests {
  private testData: TestData = {
    createdDocuments: []
  };
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private testSuite: TestSuite = {
    name: 'CRUD Operations Integration Tests',
    startTime: new Date(),
    endTime: new Date(),
    results: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      successRate: 0,
      averageResponseTime: 0
    }
  };

  constructor() {
    // Don't call async setup in constructor
  }

  async initialize(): Promise<void> {
    await this.setupAuth();
  }

  private async setupAuth(): Promise<void> {
    try {
      await erpAuthenticator.connect(
        process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
        process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
        process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
      );
      console.log('✅ Authentication setup successful');
    } catch (error) {
      console.error('❌ Authentication setup failed:', error);
      throw error;
    }
  }

  private async measurePerformance<T>(operation: () => Promise<T>, operationName: string): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    const duration = endTime - startTime;

    this.performanceMetrics.push({
      operation: operationName,
      duration,
      timestamp: new Date(),
      success: true
    });

    return { result, duration };
  }

  private addTestResult(testName: string, passed: boolean, duration: number, error?: string, details?: Record<string, any>): void {
    const result: TestResult = {
      testName,
      passed,
      duration,
      error,
      details,
      timestamp: new Date()
    };

    this.testResults.push(result);
    this.testSuite.results.push(result);
  }

  private generateUniqueName(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  }

  async runAllTests(): Promise<TestSuite> {
    console.log('🚀 Starting CRUD Operations Integration Tests...');
    this.testSuite.startTime = new Date();

    try {
      // Test CREATE operations
      await this.testCreateOperations();

      // Test READ operations
      await this.testReadOperations();

      // Test UPDATE operations
      await this.testUpdateOperations();

      // Test DELETE operations
      await this.testDeleteOperations();

      // Test error handling
      await this.testErrorHandling();

      // Test performance
      await this.testPerformance();

      // Cleanup test data
      await this.cleanupTestData();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }

    this.testSuite.endTime = new Date();
    this.calculateSummary();

    return this.testSuite;
  }

  private async testCreateOperations(): Promise<void> {
    console.log('\n📝 Testing CREATE Operations...');

    // Test Customer creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const customerName = this.generateUniqueName('Test Customer');
        this.testData.customerName = customerName;

        return await createDocument('Customer', {
          customer_name: customerName,
          customer_type: 'Company',
          territory: 'All Territories',
          customer_group: 'All Customer Groups'
        });
      }, 'CREATE Customer');

      if (result.ok && result.data?.name) {
        this.testData.createdDocuments.push({
          doctype: 'Customer',
          name: result.data.name,
          data: { customer_name: this.testData.customerName }
        });
        this.addTestResult('CREATE Customer', true, duration, undefined, {
          documentName: result.data.name,
          customerName: this.testData.customerName
        });
        console.log(`✅ Customer created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Customer', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Customer creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Customer', false, 0, error.message);
      console.log(`❌ Customer creation error: ${error.message}`);
    }

    // Test Item creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const itemCode = this.generateUniqueName('TEST-ITEM');
        this.testData.itemName = itemCode;

        return await createDocument('Item', {
          item_code: itemCode,
          item_name: `Test Item ${itemCode}`,
          item_group: 'All Item Groups',
          stock_uom: 'Nos',
          is_stock_item: 1,
          standard_rate: 100
        });
      }, 'CREATE Item');

      if (result.ok && result.data?.name) {
        this.testData.createdDocuments.push({
          doctype: 'Item',
          name: result.data.name,
          data: { item_code: this.testData.itemName }
        });
        this.addTestResult('CREATE Item', true, duration, undefined, {
          documentName: result.data.name,
          itemCode: this.testData.itemName
        });
        console.log(`✅ Item created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Item', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Item creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Item', false, 0, error.message);
      console.log(`❌ Item creation error: ${error.message}`);
    }

    // Test User creation (if permissions allow)
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const email = `test-${Date.now()}@example.com`;
        this.testData.userName = email;

        return await createDocument('User', {
          email: email,
          first_name: 'Test',
          last_name: 'User',
          role: 'System Manager'
        });
      }, 'CREATE User');

      if (result.ok && result.data?.name) {
        this.testData.createdDocuments.push({
          doctype: 'User',
          name: result.data.name,
          data: { email: this.testData.userName }
        });
        this.addTestResult('CREATE User', true, duration, undefined, {
          documentName: result.data.name,
          email: this.testData.userName
        });
        console.log(`✅ User created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE User', false, duration, result.error?.message || 'Unknown error');
        console.log(`⚠️ User creation failed (may be due to permissions): ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE User', false, 0, error.message);
      console.log(`⚠️ User creation error (may be due to permissions): ${error.message}`);
    }
  }

  private async testReadOperations(): Promise<void> {
    console.log('\n📖 Testing READ Operations...');

    if (this.testData.createdDocuments.length === 0) {
      console.log('⚠️ No documents created yet, skipping READ tests');
      return;
    }

    // Test reading single document
    const testDoc = this.testData.createdDocuments[0];
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getDocument(testDoc.doctype, testDoc.name);
      }, 'READ Single Document');

      if (result.ok && result.data?.doc) {
        this.addTestResult('READ Single Document', true, duration, undefined, {
          doctype: testDoc.doctype,
          name: testDoc.name,
          fieldCount: Object.keys(result.data.doc).length
        });
        console.log(`✅ Document read: ${testDoc.doctype}/${testDoc.name}`);
      } else {
        this.addTestResult('READ Single Document', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Document read failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('READ Single Document', false, 0, error.message);
      console.log(`❌ Document read error: ${error.message}`);
    }

    // Test reading with field filtering
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getDocument(testDoc.doctype, testDoc.name, ['name', 'customer_name', 'customer_type']);
      }, 'READ with Field Filter');

      if (result.ok && result.data?.doc) {
        const fields = Object.keys(result.data.doc);
        this.addTestResult('READ with Field Filter', true, duration, undefined, {
          doctype: testDoc.doctype,
          name: testDoc.name,
          returnedFields: fields,
          expectedFields: ['name', 'customer_name', 'customer_type']
        });
        console.log(`✅ Document read with field filter: ${fields.join(', ')}`);
      } else {
        this.addTestResult('READ with Field Filter', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Document read with field filter failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('READ with Field Filter', false, 0, error.message);
      console.log(`❌ Document read with field filter error: ${error.message}`);
    }

    // Test listing documents
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Customer', { customer_type: 'Company' }, ['name', 'customer_name'], 10);
      }, 'LIST Documents');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Documents', true, duration, undefined, {
          doctype: 'Customer',
          count: result.data.docs.length,
          filters: { customer_type: 'Company' }
        });
        console.log(`✅ Documents listed: ${result.data.docs.length} customers`);
      } else {
        this.addTestResult('LIST Documents', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Documents listing failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('LIST Documents', false, 0, error.message);
      console.log(`❌ Documents listing error: ${error.message}`);
    }
  }

  private async testUpdateOperations(): Promise<void> {
    console.log('\n🔄 Testing UPDATE Operations...');

    if (this.testData.createdDocuments.length === 0) {
      console.log('⚠️ No documents created yet, skipping UPDATE tests');
      return;
    }

    // Test updating document
    const testDoc = this.testData.createdDocuments[0];
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await updateDocument(testDoc.doctype, testDoc.name, {
          territory: 'Updated Territory',
          customer_group: 'Updated Group'
        });
      }, 'UPDATE Document');

      if (result.ok && result.data?.name) {
        this.addTestResult('UPDATE Document', true, duration, undefined, {
          doctype: testDoc.doctype,
          name: testDoc.name,
          updatedFields: ['territory', 'customer_group']
        });
        console.log(`✅ Document updated: ${testDoc.doctype}/${testDoc.name}`);
      } else {
        this.addTestResult('UPDATE Document', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Document update failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('UPDATE Document', false, 0, error.message);
      console.log(`❌ Document update error: ${error.message}`);
    }

    // Test validation error handling
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await updateDocument(testDoc.doctype, testDoc.name, {
          customer_name: '' // Should fail validation
        });
      }, 'UPDATE Validation Error');

      if (!result.ok) {
        this.addTestResult('UPDATE Validation Error', true, duration, undefined, {
          expectedError: result.error?.message,
          doctype: testDoc.doctype,
          name: testDoc.name
        });
        console.log(`✅ Update validation error handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('UPDATE Validation Error', false, duration, 'Expected validation error but update succeeded');
        console.log(`❌ Update validation error test failed - should have failed validation`);
      }
    } catch (error: any) {
      this.addTestResult('UPDATE Validation Error', true, duration, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Update validation error handled correctly: ${error.message}`);
    }
  }

  private async testDeleteOperations(): Promise<void> {
    console.log('\n🗑️ Testing DELETE Operations...');

    if (this.testData.createdDocuments.length === 0) {
      console.log('⚠️ No documents created yet, skipping DELETE tests');
      return;
    }

    // Test deleting document
    const testDoc = this.testData.createdDocuments[this.testData.createdDocuments.length - 1];
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await deleteDocument(testDoc.doctype, testDoc.name);
      }, 'DELETE Document');

      if (result.ok) {
        // Remove from created documents list
        this.testData.createdDocuments = this.testData.createdDocuments.filter(
          doc => !(doc.doctype === testDoc.doctype && doc.name === testDoc.name)
        );

        this.addTestResult('DELETE Document', true, duration, undefined, {
          doctype: testDoc.doctype,
          name: testDoc.name
        });
        console.log(`✅ Document deleted: ${testDoc.doctype}/${testDoc.name}`);
      } else {
        this.addTestResult('DELETE Document', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Document deletion failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('DELETE Document', false, 0, error.message);
      console.log(`❌ Document deletion error: ${error.message}`);
    }

    // Test deleting non-existent document
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await deleteDocument('Customer', 'NONEXISTENT-DOC');
      }, 'DELETE Non-existent Document');

      if (!result.ok) {
        this.addTestResult('DELETE Non-existent Document', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Delete non-existent document handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('DELETE Non-existent Document', false, duration, 'Expected error but delete succeeded');
        console.log(`❌ Delete non-existent document test failed - should have failed`);
      }
    } catch (error: any) {
      this.addTestResult('DELETE Non-existent Document', true, duration, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Delete non-existent document handled correctly: ${error.message}`);
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Error Handling...');

    // Test invalid DocType
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await createDocument('InvalidDocType', { field: 'value' });
      }, 'CREATE Invalid DocType');

      if (!result.ok) {
        this.addTestResult('CREATE Invalid DocType', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Invalid DocType handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('CREATE Invalid DocType', false, duration, 'Expected error but create succeeded');
        console.log(`❌ Invalid DocType test failed - should have failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Invalid DocType', true, duration, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Invalid DocType handled correctly: ${error.message}`);
    }

    // Test getting non-existent document
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getDocument('Customer', 'NONEXISTENT-CUST');
      }, 'READ Non-existent Document');

      if (!result.ok) {
        this.addTestResult('READ Non-existent Document', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Non-existent document read handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('READ Non-existent Document', false, duration, 'Expected error but read succeeded');
        console.log(`❌ Non-existent document read test failed - should have failed`);
      }
    } catch (error: any) {
      this.addTestResult('READ Non-existent Document', true, duration, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Non-existent document read handled correctly: ${error.message}`);
    }

    // Test updating non-existent document
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await updateDocument('Customer', 'NONEXISTENT-CUST', { field: 'value' });
      }, 'UPDATE Non-existent Document');

      if (!result.ok) {
        this.addTestResult('UPDATE Non-existent Document', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Non-existent document update handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('UPDATE Non-existent Document', false, duration, 'Expected error but update succeeded');
        console.log(`❌ Non-existent document update test failed - should have failed`);
      }
    } catch (error: any) {
      this.addTestResult('UPDATE Non-existent Document', true, duration, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Non-existent document update handled correctly: ${error.message}`);
    }
  }

  private async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');

    // Test multiple rapid operations
    const operations = [];
    const operationCount = 5;

    for (let i = 0; i < operationCount; i++) {
      operations.push(this.measurePerformance(async () => {
        return await listDocuments('Customer', {}, ['name'], 5);
      }, `LIST Performance ${i + 1}`));
    }

    try {
      const results = await Promise.all(operations);
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const avgDuration = totalDuration / operationCount;

      this.addTestResult('Performance Test', true, avgDuration, undefined, {
        operationCount,
        totalDuration,
        averageDuration: avgDuration,
        individualDurations: results.map(r => r.duration)
      });

      console.log(`✅ Performance test completed: ${operationCount} operations in ${totalDuration}ms (avg: ${avgDuration}ms)`);
    } catch (error: any) {
      this.addTestResult('Performance Test', false, 0, error.message);
      console.log(`❌ Performance test failed: ${error.message}`);
    }
  }

  private async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');

    let cleanupCount = 0;
    let cleanupErrors = 0;

    for (const doc of this.testData.createdDocuments) {
      try {
        const result = await deleteDocument(doc.doctype, doc.name);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup ${doc.doctype}/${doc.name}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up ${doc.doctype}/${doc.name}: ${error.message}`);
      }
    }

    this.addTestResult('Cleanup Test Data', cleanupErrors === 0, 0,
      cleanupErrors > 0 ? `${cleanupErrors} cleanup errors occurred` : undefined,
      { cleaned: cleanupCount, errors: cleanupErrors }
    );

    console.log(`✅ Cleanup completed: ${cleanupCount} documents cleaned, ${cleanupErrors} errors`);
    this.testData.createdDocuments = [];
  }

  private calculateSummary(): void {
    const total = this.testSuite.results.length;
    const passed = this.testSuite.results.filter(r => r.passed).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    const totalDuration = this.testSuite.results.reduce((sum, r) => sum + r.duration, 0);
    const avgResponseTime = total > 0 ? totalDuration / total : 0;

    this.testSuite.summary = {
      total,
      passed,
      failed,
      skipped: 0,
      successRate,
      averageResponseTime: avgResponseTime
    };
  }

  getTestResults(): TestResult[] {
    return this.testResults;
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMetrics;
  }

  generateReport(): string {
    const { summary } = this.testSuite;
    const duration = this.testSuite.endTime.getTime() - this.testSuite.startTime.getTime();

    let report = `
🧪 CRUD Operations Integration Test Report
===========================================

Test Suite: ${this.testSuite.name}
Duration: ${duration}ms
Timestamp: ${this.testSuite.startTime.toISOString()}

📊 Summary
----------
Total Tests: ${summary.total}
Passed: ${summary.passed} ✅
Failed: ${summary.failed} ❌
Success Rate: ${summary.successRate.toFixed(2)}%
Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms

📝 Test Results
---------------
`;

    this.testSuite.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const error = result.error ? ` - ${result.error}` : '';
      report += `${status} ${result.testName} (${result.duration}ms)${error}\n`;
    });

    report += `
⚡ Performance Metrics
----------------------
`;

    const metricsByOperation = this.performanceMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);

    Object.entries(metricsByOperation).forEach(([operation, metrics]) => {
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      const successRate = (metrics.filter(m => m.success).length / metrics.length) * 100;
      report += `${operation}: ${avgDuration.toFixed(2)}ms avg (${successRate.toFixed(2)}% success)\n`;
    });

    if (summary.failed > 0) {
      report += `
❌ Failed Tests
--------------
`;
      this.testSuite.results.filter(r => !r.passed).forEach(result => {
        report += `- ${result.testName}: ${result.error}\n`;
      });
    }

    report += `
🔍 Issues and Limitations
------------------------
`;

    // Analyze common issues
    const errorCounts = this.testSuite.results
      .filter(r => !r.passed && r.error)
      .reduce((acc, result) => {
        const error = result.error || 'Unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    Object.entries(errorCounts).forEach(([error, count]) => {
      report += `- ${error}: ${count} occurrence(s)\n`;
    });

    return report;
  }
}

// Export the test class and run tests if this file is executed directly
if (require.main === module) {
  async function runTests() {
    const tester = new CRUDIntegrationTests();
    const testSuite = await tester.runAllTests();
    console.log(tester.generateReport());
  }

  runTests().catch(console.error);
}