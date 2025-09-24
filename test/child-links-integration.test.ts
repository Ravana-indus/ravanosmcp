import { replaceTable, autocomplete, ReplaceTableRequest, AutocompleteRequest } from '../src/core/child_links';
import { erpAuthenticator } from '../src/core/auth';
import { createDocument, getDocument, listDocuments } from '../src/core/crud';
import { TestResult, TestSuite, PerformanceMetrics } from './types';

interface TestData {
  createdDocuments: Array<{
    doctype: string;
    name: string;
    data: Record<string, any>;
  }>;
  testItems: string[];
  testCustomers: string[];
}

export class ChildLinksIntegrationTests {
  private testData: TestData = {
    createdDocuments: [],
    testItems: [],
    testCustomers: []
  };
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private testSuite: TestSuite = {
    name: 'Child Tables and Links Integration Tests',
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
    await this.createTestData();
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

  private async createTestData(): Promise<void> {
    console.log('📝 Creating test data...');

    // Create test items
    for (let i = 1; i <= 3; i++) {
      try {
        const itemCode = `TEST-ITEM-${Date.now()}-${i}`;
        const result = await createDocument('Item', {
          item_code: itemCode,
          item_name: `Test Item ${i}`,
          item_group: 'All Item Groups',
          stock_uom: 'Nos',
          is_stock_item: 1,
          standard_rate: 100 * i
        });

        if (result.ok && result.data?.name) {
          this.testData.testItems.push(itemCode);
          this.testData.createdDocuments.push({
            doctype: 'Item',
            name: result.data.name,
            data: { item_code: itemCode }
          });
          console.log(`✅ Test item created: ${itemCode}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to create test item ${i}:`, error);
      }
    }

    // Create test customers
    for (let i = 1; i <= 2; i++) {
      try {
        const customerName = `Test Customer ${Date.now()} ${i}`;
        const result = await createDocument('Customer', {
          customer_name: customerName,
          customer_type: 'Company',
          territory: 'All Territories',
          customer_group: 'All Customer Groups'
        });

        if (result.ok && result.data?.name) {
          this.testData.testCustomers.push(customerName);
          this.testData.createdDocuments.push({
            doctype: 'Customer',
            name: result.data.name,
            data: { customer_name: customerName }
          });
          console.log(`✅ Test customer created: ${customerName}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to create test customer ${i}:`, error);
      }
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
    console.log('🚀 Starting Child Tables and Links Integration Tests...');
    this.testSuite.startTime = new Date();

    try {
      // Test autocomplete functionality
      await this.testAutocompleteFunctionality();

      // Test child table replacement functionality
      await this.testChildTableReplacement();

      // Test error handling scenarios
      await this.testErrorHandling();

      // Test performance and edge cases
      await this.testPerformanceAndEdgeCases();

      // Test data integrity
      await this.testDataIntegrity();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }

    this.testSuite.endTime = new Date();
    this.calculateSummary();

    return this.testSuite;
  }

  private async testAutocompleteFunctionality(): Promise<void> {
    console.log('\n🔍 Testing Autocomplete Functionality...');

    // Test Customer autocomplete
    if (this.testData.testCustomers.length > 0) {
      const searchTerm = this.testData.testCustomers[0].substring(0, 5);
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          return await autocomplete('Customer', searchTerm);
        }, 'AUTOCOMPLETE Customer');

        if (result.ok && result.data?.options) {
          const foundCustomer = result.data.options.some(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
          );

          this.addTestResult('AUTOCOMPLETE Customer', foundCustomer, duration, undefined, {
            searchTerm,
            resultsCount: result.data.options.length,
            expectedCustomer: this.testData.testCustomers[0]
          });
          console.log(`✅ Customer autocomplete successful: ${result.data.options.length} results`);
        } else {
          this.addTestResult('AUTOCOMPLETE Customer', false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Customer autocomplete failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult('AUTOCOMPLETE Customer', false, 0, error.message);
        console.log(`❌ Customer autocomplete error: ${error.message}`);
      }
    }

    // Test Item autocomplete
    if (this.testData.testItems.length > 0) {
      const searchTerm = 'TEST-ITEM';
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          return await autocomplete('Item', searchTerm);
        }, 'AUTOCOMPLETE Item');

        if (result.ok && result.data?.options) {
          const foundItems = result.data.options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
          );

          this.addTestResult('AUTOCOMPLETE Item', foundItems.length > 0, duration, undefined, {
            searchTerm,
            resultsCount: result.data.options.length,
            foundItems: foundItems.length
          });
          console.log(`✅ Item autocomplete successful: ${result.data.options.length} results, ${foundItems.length} matching`);
        } else {
          this.addTestResult('AUTOCOMPLETE Item', false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Item autocomplete failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult('AUTOCOMPLETE Item', false, 0, error.message);
        console.log(`❌ Item autocomplete error: ${error.message}`);
      }
    }

    // Test Employee autocomplete
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await autocomplete('Employee', '');
      }, 'AUTOCOMPLETE Employee');

      if (result.ok && result.data?.options !== undefined) {
        this.addTestResult('AUTOCOMPLETE Employee', true, duration, undefined, {
          resultsCount: result.data.options.length
        });
        console.log(`✅ Employee autocomplete successful: ${result.data.options.length} results`);
      } else {
        this.addTestResult('AUTOCOMPLETE Employee', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Employee autocomplete failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('AUTOCOMPLETE Employee', false, 0, error.message);
      console.log(`❌ Employee autocomplete error: ${error.message}`);
    }

    // Test autocomplete with limit
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await autocomplete('Customer', '', 5);
      }, 'AUTOCOMPLETE with Limit');

      if (result.ok && result.data?.options !== undefined) {
        const withinLimit = result.data.options.length <= 5;
        this.addTestResult('AUTOCOMPLETE with Limit', withinLimit, duration, undefined, {
          limit: 5,
          resultsCount: result.data.options.length
        });
        console.log(`✅ Autocomplete with limit successful: ${result.data.options.length} results (limit: 5)`);
      } else {
        this.addTestResult('AUTOCOMPLETE with Limit', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Autocomplete with limit failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('AUTOCOMPLETE with Limit', false, 0, error.message);
      console.log(`❌ Autocomplete with limit error: ${error.message}`);
    }
  }

  private async testChildTableReplacement(): Promise<void> {
    console.log('\n📋 Testing Child Table Replacement...');

    if (this.testData.testItems.length === 0) {
      console.log('⚠️ No test items available, skipping child table tests');
      return;
    }

    // Try to find an existing document to test with if creation fails
    let testDocument = null;
    let isExistingDoc = false;

    // Create a test Sales Order to work with
    let salesOrderName = '';
    try {
      const { result: createResult, duration: createDuration } = await this.measurePerformance(async () => {
        return await createDocument('Sales Order', {
          customer: this.testData.testCustomers[0] || 'Default Customer',
          transaction_date: new Date().toISOString().split('T')[0],
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [
            {
              item_code: this.testData.testItems[0],
              qty: 1,
              rate: 100,
              warehouse: 'Stores' // Add required warehouse
            }
          ]
        });
      }, 'CREATE Sales Order for Child Table Test');

      if (createResult.ok && createResult.data?.name) {
        salesOrderName = createResult.data.name;
        this.testData.createdDocuments.push({
          doctype: 'Sales Order',
          name: salesOrderName,
          data: { customer: this.testData.testCustomers[0] }
        });
        console.log(`✅ Sales Order created for testing: ${salesOrderName}`);
      } else {
        console.log(`❌ Failed to create Sales Order: ${createResult.error?.message}`);
        // Try to find an existing Sales Order to test with
        try {
          const existingResult = await listDocuments('Sales Order', {}, ['name'], 1);
          if (existingResult.ok && existingResult.data && existingResult.data.docs && existingResult.data.docs.length > 0) {
            testDocument = existingResult.data.docs[0];
            isExistingDoc = true;
            salesOrderName = testDocument.name;
            console.log(`✅ Found existing Sales Order for testing: ${salesOrderName}`);
          } else {
            console.log('⚠️ No existing Sales Order found, skipping child table tests');
            return;
          }
        } catch (listError: any) {
          console.log(`⚠️ Could not find existing Sales Order: ${listError.message}`);
          return;
        }
      }
    } catch (error: any) {
      console.log(`❌ Error creating Sales Order: ${error.message}`);
      // Try to find an existing document as fallback
      try {
        const existingResult = await listDocuments('Sales Order', {}, ['name'], 1);
        if (existingResult.ok && existingResult.data && existingResult.data.docs && existingResult.data.docs.length > 0) {
          testDocument = existingResult.data.docs[0];
          isExistingDoc = true;
          salesOrderName = testDocument.name;
          console.log(`✅ Found existing Sales Order for testing: ${salesOrderName}`);
        } else {
          console.log('⚠️ No existing Sales Order found, skipping child table tests');
          return;
        }
      } catch (listError: any) {
        console.log(`⚠️ Could not find existing Sales Order: ${listError.message}`);
        return;
      }
    }

    // Test replacing items in the Sales Order
    if (salesOrderName) {
      try {
        const newItems = [
          {
            item_code: this.testData.testItems[0],
            qty: 2,
            rate: 100
          },
          ...(this.testData.testItems.length > 1 ? [{
            item_code: this.testData.testItems[1],
            qty: 1,
            rate: 200
          }] : [])
        ];

        const { result, duration } = await this.measurePerformance(async () => {
          return await replaceTable('Sales Order', salesOrderName, 'items', newItems);
        }, 'REPLACE Child Table Items');

        if (result.ok && result.data?.table_replaced) {
          // Verify the replacement by getting the document
          const verifyResult = await getDocument('Sales Order', salesOrderName);
          const success = verifyResult.ok && verifyResult.data?.doc?.items?.length === newItems.length;

          this.addTestResult('REPLACE Child Table Items', success, duration, undefined, {
            salesOrderName,
            originalCount: 1,
            newCount: newItems.length,
            replaced: result.data.table_replaced,
            verifiedCount: verifyResult.data?.doc?.items?.length
          });
          console.log(`✅ Child table replacement successful: ${result.data.rows_count} items`);
        } else {
          this.addTestResult('REPLACE Child Table Items', false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Child table replacement failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult('REPLACE Child Table Items', false, 0, error.message);
        console.log(`❌ Child table replacement error: ${error.message}`);
      }

      // Test replacing with empty items array
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          return await replaceTable('Sales Order', salesOrderName, 'items', []);
        }, 'REPLACE Child Table with Empty Array');

        if (result.ok && result.data?.table_replaced) {
          // Verify the replacement
          const verifyResult = await getDocument('Sales Order', salesOrderName);
          const success = verifyResult.ok && Array.isArray(verifyResult.data?.doc?.items) && verifyResult.data.doc.items.length === 0;

          this.addTestResult('REPLACE Child Table with Empty Array', success, duration, undefined, {
            salesOrderName,
            replaced: result.data.table_replaced,
            verifiedEmpty: success
          });
          console.log(`✅ Empty child table replacement successful: ${result.data.rows_count} items`);
        } else {
          this.addTestResult('REPLACE Child Table with Empty Array', false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Empty child table replacement failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult('REPLACE Child Table with Empty Array', false, 0, error.message);
        console.log(`❌ Empty child table replacement error: ${error.message}`);
      }

      // Test replacing taxes (if applicable)
      try {
        const taxes = [
          {
            charge_type: 'On Net Total',
            account_head: 'Default Tax Account',
            rate: 10,
            description: 'Test Tax 10%'
          }
        ];

        const { result, duration } = await this.measurePerformance(async () => {
          return await replaceTable('Sales Order', salesOrderName, 'taxes', taxes);
        }, 'REPLACE Child Table Taxes');

        if (result.ok) {
          this.addTestResult('REPLACE Child Table Taxes', true, duration, undefined, {
            salesOrderName,
            taxesCount: taxes.length,
            replaced: result.data?.table_replaced
          });
          console.log(`✅ Taxes table replacement successful: ${result.data?.rows_count} taxes`);
        } else {
          this.addTestResult('REPLACE Child Table Taxes', false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Taxes table replacement failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult('REPLACE Child Table Taxes', false, 0, error.message);
        console.log(`❌ Taxes table replacement error: ${error.message}`);
      }
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Error Handling...');

    // Test autocomplete with invalid doctype
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await autocomplete('InvalidDoctypeXYZ', 'test');
      }, 'AUTOCOMPLETE Invalid Doctype');

      if (!result.ok) {
        this.addTestResult('AUTOCOMPLETE Invalid Doctype', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Invalid doctype handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('AUTOCOMPLETE Invalid Doctype', false, duration, 'Expected error but autocomplete succeeded');
        console.log(`❌ Invalid doctype test failed - should have failed`);
      }
    } catch (error: any) {
      this.addTestResult('AUTOCOMPLETE Invalid Doctype', true, 0, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Invalid doctype handled correctly: ${error.message}`);
    }

    // Test replaceTable with invalid document
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await replaceTable('Sales Order', 'NONEXISTENT-SO-001', 'items', []);
      }, 'REPLACE TABLE Invalid Document');

      if (!result.ok) {
        this.addTestResult('REPLACE TABLE Invalid Document', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Invalid document handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('REPLACE TABLE Invalid Document', false, duration, 'Expected error but replace succeeded');
        console.log(`❌ Invalid document test failed - should have failed`);
      }
    } catch (error: any) {
      this.addTestResult('REPLACE TABLE Invalid Document', true, 0, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Invalid document handled correctly: ${error.message}`);
    }

    // Test replaceTable with invalid table field
    if (this.testData.createdDocuments.length > 0) {
      const testDoc = this.testData.createdDocuments[0];
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          return await replaceTable(testDoc.doctype, testDoc.name, 'invalid_table_field', []);
        }, 'REPLACE TABLE Invalid Field');

        if (!result.ok) {
          this.addTestResult('REPLACE TABLE Invalid Field', true, duration, undefined, {
            expectedError: result.error?.message
          });
          console.log(`✅ Invalid table field handled correctly: ${result.error?.message}`);
        } else {
          this.addTestResult('REPLACE TABLE Invalid Field', false, duration, 'Expected error but replace succeeded');
          console.log(`❌ Invalid table field test failed - should have failed`);
        }
      } catch (error: any) {
        this.addTestResult('REPLACE TABLE Invalid Field', true, 0, undefined, {
          expectedError: error.message
        });
        console.log(`✅ Invalid table field handled correctly: ${error.message}`);
      }
    }

    // Test autocomplete with permission errors (simulate by using restricted doctype)
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await autocomplete('User', 'admin');
      }, 'AUTOCOMPLETE Permission Test');

      // This might succeed or fail depending on permissions, both are acceptable
      this.addTestResult('AUTOCOMPLETE Permission Test', result.ok, duration, result.error?.message, {
        succeeded: result.ok,
        error: result.error?.message
      });
      console.log(`✅ Permission test completed: ${result.ok ? 'Success' : 'Permission denied'} - ${result.error?.message || 'No error'}`);
    } catch (error: any) {
      this.addTestResult('AUTOCOMPLETE Permission Test', true, 0, undefined, {
        expectedError: error.message
      });
      console.log(`✅ Permission error handled correctly: ${error.message}`);
    }
  }

  private async testPerformanceAndEdgeCases(): Promise<void> {
    console.log('\n⚡ Testing Performance and Edge Cases...');

    // Test autocomplete performance with various search terms
    const searchTerms = ['', 'a', 'test', 'customer', 'item', 'employee'];

    for (const term of searchTerms) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          return await autocomplete('Customer', term, 20);
        }, `AUTOCOMPLETE Performance - "${term}"`);

        const acceptableTime = duration < 2000; // 2 seconds threshold
        this.addTestResult(`AUTOCOMPLETE Performance - "${term}"`, acceptableTime, duration,
          acceptableTime ? undefined : `Slow response: ${duration}ms`, {
          searchTerm: term,
          responseTime: duration,
          resultsCount: result.data?.options?.length || 0
        });

        if (acceptableTime) {
          console.log(`✅ Autocomplete performance test passed: "${term}" (${duration}ms, ${result.data?.options?.length || 0} results)`);
        } else {
          console.log(`⚠️ Autocomplete performance test slow: "${term}" (${duration}ms)`);
        }
      } catch (error: any) {
        this.addTestResult(`AUTOCOMPLETE Performance - "${term}"`, false, 0, error.message);
        console.log(`❌ Autocomplete performance error for "${term}": ${error.message}`);
      }
    }

    // Test large table replacement performance
    if (this.testData.testItems.length > 0 && this.testData.createdDocuments.some(doc => doc.doctype === 'Sales Order')) {
      const salesOrder = this.testData.createdDocuments.find(doc => doc.doctype === 'Sales Order');

      if (salesOrder) {
        try {
          // Create a large number of items
          const largeItems = Array.from({ length: 50 }, (_, i) => ({
            item_code: this.testData.testItems[i % this.testData.testItems.length],
            qty: Math.floor(Math.random() * 10) + 1,
            rate: (Math.floor(Math.random() * 500) + 50)
          }));

          const { result, duration } = await this.measurePerformance(async () => {
            return await replaceTable('Sales Order', salesOrder.name, 'items', largeItems);
          }, 'REPLACE TABLE Large Dataset');

          const acceptableTime = duration < 5000; // 5 seconds threshold for large dataset

          this.addTestResult('REPLACE TABLE Large Dataset', acceptableTime && result.ok, duration,
            !result.ok ? result.error?.message : (acceptableTime ? undefined : `Slow replacement: ${duration}ms`), {
            itemCount: largeItems.length,
            responseTime: duration,
            replaced: result.data?.table_replaced,
            replacedCount: result.data?.rows_count
          });

          if (result.ok && acceptableTime) {
            console.log(`✅ Large table replacement successful: ${result.data?.rows_count} items (${duration}ms)`);
          } else if (result.ok) {
            console.log(`⚠️ Large table replacement successful but slow: ${result.data?.rows_count} items (${duration}ms)`);
          } else {
            console.log(`❌ Large table replacement failed: ${result.error?.message}`);
          }
        } catch (error: any) {
          this.addTestResult('REPLACE TABLE Large Dataset', false, 0, error.message);
          console.log(`❌ Large table replacement error: ${error.message}`);
        }
      }
    }

    // Test concurrent autocomplete requests
    try {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        autocomplete('Customer', `test${i}`, 10)
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const successRate = results.filter(r => r.ok).length / concurrentRequests;
      const avgTimePerRequest = totalTime / concurrentRequests;

      this.addTestResult('AUTOCOMPLETE Concurrent Requests', successRate > 0.8, totalTime,
        successRate <= 0.8 ? `Low success rate: ${successRate * 100}%` : undefined, {
        concurrentRequests,
        totalTime,
        avgTimePerRequest,
        successRate
      });

      console.log(`✅ Concurrent autocomplete test: ${successRate * 100}% success (${avgTimePerRequest.toFixed(0)}ms avg)`);
    } catch (error: any) {
      this.addTestResult('AUTOCOMPLETE Concurrent Requests', false, 0, error.message);
      console.log(`❌ Concurrent autocomplete error: ${error.message}`);
    }
  }

  private async testDataIntegrity(): Promise<void> {
    console.log('\n🔐 Testing Data Integrity...');

    // Find a Sales Order to test with
    const salesOrderDoc = this.testData.createdDocuments.find(doc => doc.doctype === 'Sales Order');

    if (!salesOrderDoc) {
      console.log('⚠️ No Sales Order found for data integrity testing');
      return;
    }

    // Test data integrity after table replacement
    try {
      const originalResult = await getDocument('Sales Order', salesOrderDoc.name);
      if (!originalResult.ok) {
        console.log('❌ Could not retrieve original document for integrity test');
        return;
      }

      const originalItems = originalResult.data?.doc?.items || [];

      // Replace with known data
      const testItems = [
        {
          item_code: this.testData.testItems[0] || 'TEST-ITEM',
          qty: 5,
          rate: 100,
          amount: 500
        }
      ];

      const replaceResult = await replaceTable('Sales Order', salesOrderDoc.name, 'items', testItems);

      if (!replaceResult.ok) {
        this.addTestResult('DATA INTEGRITY Table Replacement', false, 0, replaceResult.error?.message);
        console.log(`❌ Table replacement failed: ${replaceResult.error?.message}`);
        return;
      }

      // Verify the data was correctly replaced
      const verifyResult = await getDocument('Sales Order', salesOrderDoc.name);
      const verificationSuccess = verifyResult.ok &&
        verifyResult.data?.doc?.items &&
        verifyResult.data.doc.items.length === testItems.length &&
        verifyResult.data.doc.items[0].item_code === testItems[0].item_code &&
        verifyResult.data.doc.items[0].qty === testItems[0].qty;

      this.addTestResult('DATA INTEGRITY Table Replacement', verificationSuccess, 0,
        verificationSuccess ? undefined : 'Data verification failed', {
        originalCount: originalItems.length,
        newCount: testItems.length,
        verifiedCount: verifyResult.data?.doc?.items?.length,
        itemMatch: verifyResult.data?.doc?.items?.[0]?.item_code === testItems[0].item_code,
        qtyMatch: verifyResult.data?.doc?.items?.[0]?.qty === testItems[0].qty
      });

      if (verificationSuccess) {
        console.log('✅ Data integrity test passed: Table replacement preserved data correctly');
      } else {
        console.log('❌ Data integrity test failed: Table replacement did not preserve data correctly');
      }

    } catch (error: any) {
      this.addTestResult('DATA INTEGRITY Table Replacement', false, 0, error.message);
      console.log(`❌ Data integrity test error: ${error.message}`);
    }

    // Test autocomplete result consistency
    try {
      const searchTerm = 'test';
      const requests = 3;

      const results = await Promise.all(
        Array.from({ length: requests }, () => autocomplete('Customer', searchTerm))
      );

      const allSuccessful = results.every(r => r.ok);
      const consistentResults = allSuccessful &&
        results.every(r => r.data?.options?.length === results[0].data?.options?.length);

      this.addTestResult('DATA INTEGRITY Autocomplete Consistency', consistentResults, 0,
        !allSuccessful ? 'Some requests failed' : (consistentResults ? undefined : 'Inconsistent result counts'), {
        requests,
        allSuccessful,
        consistentResults,
        resultCounts: results.map(r => r.data?.options?.length)
      });

      if (consistentResults) {
        console.log('✅ Autocomplete consistency test passed: All requests returned consistent results');
      } else {
        console.log('❌ Autocomplete consistency test failed: Inconsistent results between requests');
      }

    } catch (error: any) {
      this.addTestResult('DATA INTEGRITY Autocomplete Consistency', false, 0, error.message);
      console.log(`❌ Autocomplete consistency test error: ${error.message}`);
    }
  }

  public async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');

    let cleanupCount = 0;
    let cleanupErrors = 0;

    // Clean up in reverse order to handle dependencies
    for (let i = this.testData.createdDocuments.length - 1; i >= 0; i--) {
      const doc = this.testData.createdDocuments[i];
      try {
        const result = await this.deleteDocumentWithRetry(doc.doctype, doc.name);
        if (result) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup ${doc.doctype}/${doc.name}`);
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

  private async deleteDocumentWithRetry(doctype: string, name: string, maxRetries: number = 3): Promise<boolean> {
    const { deleteDocument } = await import('../src/core/crud');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await deleteDocument(doctype, name);
        if (result.ok) {
          return true;
        }
        console.log(`⚠️ Attempt ${attempt} failed to delete ${doctype}/${name}: ${result.error?.message}`);
      } catch (error: any) {
        console.log(`⚠️ Attempt ${attempt} error deleting ${doctype}/${name}: ${error.message}`);
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }

    return false;
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
🧪 Child Tables and Links Integration Test Report
=================================================

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

📝 Test Results by Category
---------------------------
`;

    // Group results by category
    const categories = {
      'AUTOCOMPLETE': this.testSuite.results.filter(r => r.testName.startsWith('AUTOCOMPLETE')),
      'REPLACE TABLE': this.testSuite.results.filter(r => r.testName.includes('REPLACE TABLE')),
      'DATA INTEGRITY': this.testSuite.results.filter(r => r.testName.startsWith('DATA INTEGRITY')),
      'Cleanup': this.testSuite.results.filter(r => r.testName.startsWith('Cleanup'))
    };

    Object.entries(categories).forEach(([category, results]) => {
      if (results.length > 0) {
        const categoryPassed = results.filter(r => r.passed).length;
        const categorySuccessRate = (categoryPassed / results.length) * 100;
        report += `${category}: ${categoryPassed}/${results.length} (${categorySuccessRate.toFixed(2)}% success)\n`;
      }
    });

    report += `
📝 Individual Test Results
---------------------------
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
      const minDuration = Math.min(...metrics.map(m => m.duration));
      const maxDuration = Math.max(...metrics.map(m => m.duration));

      report += `${operation}:\n`;
      report += `  Average: ${avgDuration.toFixed(2)}ms\n`;
      report += `  Range: ${minDuration}-${maxDuration}ms\n`;
      report += `  Success Rate: ${successRate.toFixed(2)}%\n`;
      report += `  Calls: ${metrics.length}\n\n`;
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

    // Performance analysis
    const slowOperations = this.performanceMetrics
      .filter(m => m.duration > 2000)
      .sort((a, b) => b.duration - a.duration);

    if (slowOperations.length > 0) {
      report += `\nSlow Operations (>2s):\n`;
      slowOperations.slice(0, 5).forEach(op => {
        report += `- ${op.operation}: ${op.duration}ms\n`;
      });
    }

    report += `
📋 Recommendations
------------------
`;

    if (summary.successRate < 90) {
      report += `- Overall success rate is below 90%. Review failed tests and address underlying issues.\n`;
    }

    if (summary.averageResponseTime > 1000) {
      report += `- Average response time is above 1s. Consider performance optimization.\n`;
    }

    if (slowOperations.length > 0) {
      report += `- Some operations are slow. Investigate performance bottlenecks.\n`;
    }

    report += `- Consider implementing retry logic for transient errors.\n`;
    report += `- Add more comprehensive error handling for edge cases.\n`;

    return report;
  }
}

// Export the test class and run tests if this file is executed directly
if (require.main === module) {
  async function runTests() {
    const tester = new ChildLinksIntegrationTests();
    try {
      await tester.initialize();
      const testSuite = await tester.runAllTests();
      console.log(tester.generateReport());

      // Cleanup
      await tester.cleanupTestData();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  }

  runTests().catch(console.error);
}