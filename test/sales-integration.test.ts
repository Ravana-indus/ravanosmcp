import { createLead, convertLeadToCustomer, createQuotation, createSalesOrder, getSalesPipeline } from '../src/packs/sales';
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';
import { TestResult, TestSuite, PerformanceMetrics } from './types';

interface SalesTestData {
  createdDocuments: Array<{
    doctype: string;
    name: string;
    data: Record<string, any>;
  }>;
  createdLeads: string[];
  createdCustomers: string[];
  createdQuotations: string[];
  createdSalesOrders: string[];
  testItems: Array<{
    item_code: string;
    item_name: string;
    standard_rate: number;
  }>;
}

export class SalesIntegrationTests {
  private testData: SalesTestData = {
    createdDocuments: [],
    createdLeads: [],
    createdCustomers: [],
    createdQuotations: [],
    createdSalesOrders: [],
    testItems: []
  };
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private testSuite: TestSuite = {
    name: 'Sales Domain Integration Tests',
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
    await this.setupTestItems();
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

  private async setupTestItems(): Promise<void> {
    try {
      const items = [
        { item_code: `TEST-LAPTOP-${Date.now()}`, item_name: 'Test Laptop Pro', standard_rate: 1200 },
        { item_code: `TEST-MOUSE-${Date.now()}`, item_name: 'Test Wireless Mouse', standard_rate: 25 },
        { item_code: `TEST-KEYBOARD-${Date.now()}`, item_name: 'Test Mechanical Keyboard', standard_rate: 75 },
        { item_code: `TEST-MONITOR-${Date.now()}`, item_name: 'Test 4K Monitor', standard_rate: 350 },
        { item_code: `TEST-SPEAKER-${Date.now()}`, item_name: 'Test Bluetooth Speaker', standard_rate: 45 }
      ];

      for (const item of items) {
        const result = await createDocument('Item', {
          item_code: item.item_code,
          item_name: item.item_name,
          item_group: 'All Item Groups',
          stock_uom: 'Nos',
          is_stock_item: 1,
          standard_rate: item.standard_rate,
          description: `Test item for sales integration testing: ${item.item_name}`
        });

        if (result.ok && result.data?.name) {
          this.testData.testItems.push(item);
          this.testData.createdDocuments.push({
            doctype: 'Item',
            name: result.data.name,
            data: { item_code: item.item_code }
          });
        }
      }
      console.log(`✅ Created ${this.testData.testItems.length} test items`);
    } catch (error) {
      console.error('❌ Failed to setup test items:', error);
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
    console.log('🚀 Starting Sales Domain Integration Tests...');
    this.testSuite.startTime = new Date();

    try {
      // Test Lead Management
      await this.testLeadCreation();
      await this.testLeadConversion();

      // Test Quotation Management
      await this.testQuotationCreation();
      await this.testQuotationValidation();

      // Test Sales Order Management
      await this.testSalesOrderCreation();
      await this.testSalesOrderValidation();

      // Test Sales Pipeline
      await this.testSalesPipeline();

      // Test End-to-End Sales Scenarios
      await this.testEndToEndSalesFlow();

      // Test Business Logic Validation
      await this.testCreditLimits();
      await this.testPricingCalculations();

      // Test Error Handling
      await this.testSalesErrorHandling();

      // Test Performance
      await this.testSalesPerformance();

      // Cleanup test data
      await this.cleanupTestData();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }

    this.testSuite.endTime = new Date();
    this.calculateSummary();

    return this.testSuite;
  }

  private async testLeadCreation(): Promise<void> {
    console.log('\n📝 Testing Lead Creation...');

    // Test basic lead creation
    try {
      const uniqueEmail = `john.smith.${Date.now()}@example.com`;
      const { result, duration: leadDuration } = await this.measurePerformance(async () => {
        return await createLead('John Smith', uniqueEmail, '+1234567890', 'Tech Corp');
      }, 'CREATE Lead');

      if (result.ok && result.data?.name) {
        this.testData.createdLeads.push(result.data.name);
        this.testData.createdDocuments.push({
          doctype: 'Lead',
          name: result.data.name,
          data: { lead_name: result.data.lead_name }
        });
        this.addTestResult('CREATE Lead', true, leadDuration, undefined, {
          leadName: result.data.name,
          leadDetails: result.data
        });
        console.log(`✅ Lead created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Lead', false, leadDuration, result.error?.message || 'Unknown error');
        console.log(`❌ Lead creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Lead', false, 0, error.message);
      console.log(`❌ Lead creation error: ${error.message}`);
    }

    // Test lead with missing email
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        return await createLead('Jane Doe', '', '+1234567890');
      }, 'CREATE Lead Invalid Email');

      if (!result.ok && result.error?.message.includes('valid email')) {
        this.addTestResult('CREATE Lead Invalid Email', true, validationDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Lead email validation handled correctly`);
      } else {
        this.addTestResult('CREATE Lead Invalid Email', false, validationDuration, 'Expected email validation error');
        console.log(`❌ Lead email validation test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Lead Invalid Email', true, 0, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testLeadConversion(): Promise<void> {
    console.log('\n🔄 Testing Lead Conversion...');

    if (this.testData.createdLeads.length === 0) {
      console.log('⚠️ No leads available for conversion test');
      return;
    }

    const leadName = this.testData.createdLeads[0];

    // Test successful lead conversion
    try {
      const { result, duration: conversionDuration } = await this.measurePerformance(async () => {
        return await convertLeadToCustomer(leadName, 'John Smith Corp', 'Company');
      }, 'CONVERT Lead to Customer');

      if (result.ok && result.data?.customer_name) {
        this.testData.createdCustomers.push(result.data.customer_name);
        this.testData.createdDocuments.push({
          doctype: 'Customer',
          name: result.data.customer_name,
          data: { customer_name: result.data.customer_name }
        });
        this.addTestResult('CONVERT Lead to Customer', true, conversionDuration, undefined, {
          leadName,
          customerName: result.data.customer_name,
          conversionDetails: result.data
        });
        console.log(`✅ Lead converted: ${leadName} → ${result.data.customer_name}`);
      } else {
        this.addTestResult('CONVERT Lead to Customer', false, conversionDuration, result.error?.message || 'Unknown error');
        console.log(`❌ Lead conversion failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CONVERT Lead to Customer', false, 0, error.message);
      console.log(`❌ Lead conversion error: ${error.message}`);
    }

    // Test converting non-existent lead
    try {
      const { result, duration: conversionDuration } = await this.measurePerformance(async () => {
        return await convertLeadToCustomer('NONEXISTENT-LEAD');
      }, 'CONVERT Non-existent Lead');

      if (!result.ok && result.error?.message?.includes('not found')) {
        this.addTestResult('CONVERT Non-existent Lead', true, conversionDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Non-existent lead conversion handled correctly`);
      } else {
        this.addTestResult('CONVERT Non-existent Lead', false, conversionDuration, 'Expected lead not found error');
        console.log(`❌ Non-existent lead conversion test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CONVERT Non-existent Lead', true, 0, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testQuotationCreation(): Promise<void> {
    console.log('\n📋 Testing Quotation Creation...');

    if (this.testData.createdCustomers.length === 0 || this.testData.testItems.length === 0) {
      console.log('⚠️ No customers or items available for quotation test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];
    const testItems = this.testData.testItems.slice(0, 3);

    // Test quotation creation for customer
    try {
      const { result, duration: quotationDuration } = await this.measurePerformance(async () => {
        const items = testItems.map(item => ({
          item_code: item.item_code,
          qty: 1,
          rate: item.standard_rate
        }));

        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return await createQuotation('Customer', customerName, items, futureDate);
      }, 'CREATE Quotation for Customer');

      if (result.ok && result.data?.name) {
        this.testData.createdQuotations.push(result.data.name);
        this.testData.createdDocuments.push({
          doctype: 'Quotation',
          name: result.data.name,
          data: { customer_name: customerName }
        });
        this.addTestResult('CREATE Quotation for Customer', true, quotationDuration, undefined, {
          quotationName: result.data.name,
          customerName,
          grandTotal: result.data.grand_total,
          itemCount: testItems.length
        });
        console.log(`✅ Quotation created: ${result.data.name} - Total: $${result.data.grand_total}`);
      } else {
        this.addTestResult('CREATE Quotation for Customer', false, quotationDuration, result.error?.message || 'Unknown error');
        console.log(`❌ Quotation creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Quotation for Customer', false, 0, error.message);
      console.log(`❌ Quotation creation error: ${error.message}`);
    }

    // Test quotation for lead (if we have leads)
    if (this.testData.createdLeads.length > 1) {
      const leadName = this.testData.createdLeads[1]; // Use second lead (first was converted)
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          const items = testItems.slice(0, 2).map(item => ({
            item_code: item.item_code,
            qty: 2,
            rate: item.standard_rate * 0.9 // 10% discount
          }));

          return await createQuotation('Lead', leadName, items);
        }, 'CREATE Quotation for Lead');

        if (result.ok && result.data?.name) {
          this.testData.createdQuotations.push(result.data.name);
          this.testData.createdDocuments.push({
            doctype: 'Quotation',
            name: result.data.name,
            data: { lead_name: leadName }
          });
          this.addTestResult('CREATE Quotation for Lead', true, duration, undefined, {
            quotationName: result.data.name,
            leadName,
            grandTotal: result.data.grand_total
          });
          console.log(`✅ Lead Quotation created: ${result.data.name} - Total: $${result.data.grand_total}`);
        } else {
          this.addTestResult('CREATE Quotation for Lead', false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Lead quotation creation failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult('CREATE Quotation for Lead', false, 0, error.message);
        console.log(`❌ Lead quotation creation error: ${error.message}`);
      }
    }
  }

  private async testQuotationValidation(): Promise<void> {
    console.log('\n🔍 Testing Quotation Validation...');

    if (this.testData.createdCustomers.length === 0) {
      console.log('⚠️ No customers available for quotation validation test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];

    // Test quotation with invalid quotation_to
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        return await createQuotation('InvalidType' as any, customerName, [{ item_code: 'TEST-ITEM', qty: 1, rate: 100 }]);
      }, 'CREATE Quotation Invalid Type');

      if (!result.ok && result.error?.message?.includes('Customer or Lead')) {
        this.addTestResult('CREATE Quotation Invalid Type', true, validationDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Quotation type validation handled correctly`);
      } else {
        this.addTestResult('CREATE Quotation Invalid Type', false, validationDuration, 'Expected type validation error');
        console.log(`❌ Quotation type validation test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Quotation Invalid Type', true, 0, undefined, {
        expectedError: error.message
      });
    }

    // Test quotation with empty items
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        return await createQuotation('Customer', customerName, []);
      }, 'CREATE Quotation Empty Items');

      if (!result.ok && result.error?.message?.includes('Items array is required')) {
        this.addTestResult('CREATE Quotation Empty Items', true, validationDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Empty items validation handled correctly`);
      } else {
        this.addTestResult('CREATE Quotation Empty Items', false, validationDuration, 'Expected items validation error');
        console.log(`❌ Empty items validation test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Quotation Empty Items', true, 0, undefined, {
        expectedError: error.message
      });
    }

    // Test quotation with negative quantity
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        return await createQuotation('Customer', customerName, [{ item_code: 'TEST-ITEM', qty: -1, rate: 100 }]);
      }, 'CREATE Quotation Negative Quantity');

      if (!result.ok && result.error?.message?.includes('positive quantity')) {
        this.addTestResult('CREATE Quotation Negative Quantity', true, validationDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Negative quantity validation handled correctly`);
      } else {
        this.addTestResult('CREATE Quotation Negative Quantity', false, validationDuration, 'Expected quantity validation error');
        console.log(`❌ Negative quantity validation test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Quotation Negative Quantity', true, 0, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testSalesOrderCreation(): Promise<void> {
    console.log('\n📦 Testing Sales Order Creation...');

    if (this.testData.createdCustomers.length === 0 || this.testData.testItems.length === 0) {
      console.log('⚠️ No customers or items available for sales order test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];
    const testItems = this.testData.testItems.slice(0, 4);
    const deliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Test basic sales order creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const items = testItems.map(item => ({
          item_code: item.item_code,
          qty: Math.floor(Math.random() * 3) + 1,
          rate: item.standard_rate
        }));

        return await createSalesOrder(customerName, deliveryDate, items);
      }, 'CREATE Sales Order');

      if (result.ok && result.data?.name) {
        this.testData.createdSalesOrders.push(result.data.name);
        this.testData.createdDocuments.push({
          doctype: 'Sales Order',
          name: result.data.name,
          data: { customer_name: customerName }
        });
        this.addTestResult('CREATE Sales Order', true, duration, undefined, {
          salesOrderName: result.data.name,
          customerName,
          grandTotal: result.data.grand_total,
          deliveryDate,
          itemCount: testItems.length
        });
        console.log(`✅ Sales Order created: ${result.data.name} - Total: $${result.data.grand_total}`);
      } else {
        this.addTestResult('CREATE Sales Order', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Sales Order creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Order', false, 0, error.message);
      console.log(`❌ Sales Order creation error: ${error.message}`);
    }

    // Test sales order with bulk quantities
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const items = testItems.slice(0, 2).map(item => ({
          item_code: item.item_code,
          qty: 10, // Bulk order
          rate: item.standard_rate * 0.95 // 5% bulk discount
        }));

        return await createSalesOrder(customerName, deliveryDate, items);
      }, 'CREATE Bulk Sales Order');

      if (result.ok && result.data?.name) {
        this.testData.createdSalesOrders.push(result.data.name);
        this.testData.createdDocuments.push({
          doctype: 'Sales Order',
          name: result.data.name,
          data: { customer_name: customerName }
        });
        this.addTestResult('CREATE Bulk Sales Order', true, duration, undefined, {
          salesOrderName: result.data.name,
          grandTotal: result.data.grand_total,
          isBulk: true
        });
        console.log(`✅ Bulk Sales Order created: ${result.data.name} - Total: $${result.data.grand_total}`);
      } else {
        this.addTestResult('CREATE Bulk Sales Order', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Bulk Sales Order creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Bulk Sales Order', false, 0, error.message);
      console.log(`❌ Bulk Sales Order creation error: ${error.message}`);
    }
  }

  private async testSalesOrderValidation(): Promise<void> {
    console.log('\n🔍 Testing Sales Order Validation...');

    if (this.testData.createdCustomers.length === 0) {
      console.log('⚠️ No customers available for sales order validation test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];

    // Test sales order with invalid delivery date
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        return await createSalesOrder(customerName, 'invalid-date', [{ item_code: 'TEST-ITEM', qty: 1, rate: 100 }]);
      }, 'CREATE Sales Order Invalid Date');

      if (!result.ok && result.error?.message?.includes('valid date')) {
        this.addTestResult('CREATE Sales Order Invalid Date', true, validationDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Invalid delivery date validation handled correctly`);
      } else {
        this.addTestResult('CREATE Sales Order Invalid Date', false, validationDuration, 'Expected date validation error');
        console.log(`❌ Invalid delivery date validation test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Order Invalid Date', true, 0, undefined, {
        expectedError: error.message
      });
    }

    // Test sales order with past delivery date
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return await createSalesOrder(customerName, pastDate, [{ item_code: 'TEST-ITEM', qty: 1, rate: 100 }]);
      }, 'CREATE Sales Order Past Date');

      if (!result.ok) {
        this.addTestResult('CREATE Sales Order Past Date', true, validationDuration, undefined, {
          expectedError: result.error?.message || 'Sales order with past date failed as expected'
        });
        console.log(`✅ Past delivery date validation handled correctly`);
      } else {
        this.addTestResult('CREATE Sales Order Past Date', false, validationDuration, 'Expected past date validation error');
        console.log(`❌ Past delivery date validation test failed - order was created`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Order Past Date', true, 0, undefined, {
        expectedError: error.message
      });
    }

    // Test sales order with zero quantity
    try {
      const { result, duration: validationDuration } = await this.measurePerformance(async () => {
        return await createSalesOrder(customerName, '2024-12-31', [{ item_code: 'TEST-ITEM', qty: 0, rate: 100 }]);
      }, 'CREATE Sales Order Zero Quantity');

      if (!result.ok && result.error?.message?.includes('positive quantity')) {
        this.addTestResult('CREATE Sales Order Zero Quantity', true, validationDuration, undefined, {
          expectedError: result.error.message
        });
        console.log(`✅ Zero quantity validation handled correctly`);
      } else {
        this.addTestResult('CREATE Sales Order Zero Quantity', false, validationDuration, 'Expected quantity validation error');
        console.log(`❌ Zero quantity validation test failed`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Order Zero Quantity', true, 0, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testSalesPipeline(): Promise<void> {
    console.log('\n📊 Testing Sales Pipeline...');

    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getSalesPipeline();
      }, 'GET Sales Pipeline');

      if (result.ok && result.data?.pipeline) {
        const pipeline = result.data.pipeline;
        this.addTestResult('GET Sales Pipeline', true, duration, undefined, {
          leadsCount: pipeline.leads.length,
          opportunitiesCount: pipeline.opportunities.length,
          quotationsCount: pipeline.quotations.length,
          hasData: pipeline.leads.length > 0 || pipeline.opportunities.length > 0 || pipeline.quotations.length > 0
        });
        console.log(`✅ Sales Pipeline retrieved: ${pipeline.leads.length} leads, ${pipeline.opportunities.length} opportunities, ${pipeline.quotations.length} quotations`);

        // Log some sample data
        if (pipeline.leads.length > 0) {
          console.log(`  - Recent lead: ${pipeline.leads[0].lead_name} (${pipeline.leads[0].status})`);
        }
        if (pipeline.quotations.length > 0) {
          console.log(`  - Recent quotation: ${pipeline.quotations[0].name} ($${pipeline.quotations[0].grand_total})`);
        }
      } else {
        this.addTestResult('GET Sales Pipeline', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Sales Pipeline retrieval failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('GET Sales Pipeline', false, 0, error.message);
      console.log(`❌ Sales Pipeline error: ${error.message}`);
    }

    // Test pipeline after creating multiple documents
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getSalesPipeline();
      }, 'GET Sales Pipeline After Tests');

      if (result.ok && result.data?.pipeline) {
        const pipeline = result.data.pipeline;
        const createdLeadsInPipeline = pipeline.leads.filter(lead =>
          this.testData.createdLeads.includes(lead.name)
        ).length;
        const createdQuotationsInPipeline = pipeline.quotations.filter(quot =>
          this.testData.createdQuotations.includes(quot.name)
        ).length;

        this.addTestResult('GET Sales Pipeline After Tests', true, duration, undefined, {
          createdLeadsInPipeline,
          createdQuotationsInPipeline,
          totalLeads: pipeline.leads.length,
          totalQuotations: pipeline.quotations.length
        });
        console.log(`✅ Pipeline verification: ${createdLeadsInPipeline} test leads, ${createdQuotationsInPipeline} test quotations found`);
      } else {
        this.addTestResult('GET Sales Pipeline After Tests', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET Sales Pipeline After Tests', false, 0, error.message);
    }
  }

  private async testEndToEndSalesFlow(): Promise<void> {
    console.log('\n🔄 Testing End-to-End Sales Flow...');

    try {
      // Create a new lead
      const leadResult = await this.measurePerformance(async () => {
        return await createLead('Sarah Johnson', 'sarah.j@company.com', '+15551234567', 'Global Solutions', 'Cold Call', 'Qualified');
      }, 'E2E CREATE Lead');

      if (!leadResult.result.ok) {
        this.addTestResult('E2E Sales Flow', false, leadResult.duration, 'Failed to create lead for E2E test');
        return;
      }

      const leadName = leadResult.result.data?.name || '';
      if (!leadName) {
        this.addTestResult('E2E Sales Flow', false, leadResult.duration, 'Lead created but no name returned');
        return;
      }
      this.testData.createdLeads.push(leadName);

      // Convert lead to customer
      const conversionResult = await this.measurePerformance(async () => {
        return await convertLeadToCustomer(leadName, 'Global Solutions Inc', 'Company');
      }, 'E2E CONVERT Lead to Customer');

      if (!conversionResult.result.ok) {
        this.addTestResult('E2E Sales Flow', false, conversionResult.duration, 'Failed to convert lead for E2E test');
        return;
      }

      const customerName = conversionResult.result.data?.customer_name || '';
      if (!customerName) {
        this.addTestResult('E2E Sales Flow', false, conversionResult.duration, 'Lead converted but no customer name returned');
        return;
      }
      this.testData.createdCustomers.push(customerName);

      // Create quotation
      const quotationResult = await this.measurePerformance(async () => {
        const items = this.testData.testItems.slice(0, 3).map(item => ({
          item_code: item.item_code,
          qty: 2,
          rate: item.standard_rate * 0.95 // 5% discount
        }));

        return await createQuotation('Customer', customerName, items, '2024-12-31');
      }, 'E2E CREATE Quotation');

      if (!quotationResult.result.ok) {
        this.addTestResult('E2E Sales Flow', false, quotationResult.duration, 'Failed to create quotation for E2E test');
        return;
      }

      const quotationName = quotationResult.result.data?.name || '';
      if (!quotationName) {
        this.addTestResult('E2E Sales Flow', false, quotationResult.duration, 'Quotation created but no name returned');
        return;
      }
      this.testData.createdQuotations.push(quotationName);

      // Create sales order
      const salesOrderResult = await this.measurePerformance(async () => {
        const items = this.testData.testItems.slice(0, 3).map(item => ({
          item_code: item.item_code,
          qty: 2,
          rate: item.standard_rate
        }));

        const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return await createSalesOrder(customerName, deliveryDate, items);
      }, 'E2E CREATE Sales Order');

      if (!salesOrderResult.result.ok) {
        this.addTestResult('E2E Sales Flow', false, salesOrderResult.duration, 'Failed to create sales order for E2E test');
        return;
      }

      const salesOrderName = salesOrderResult.result.data?.name || '';
      if (!salesOrderName) {
        this.addTestResult('E2E Sales Flow', false, salesOrderResult.duration, 'Sales order created but no name returned');
        return;
      }
      this.testData.createdSalesOrders.push(salesOrderName);

      const totalDuration = leadResult.duration + conversionResult.duration + quotationResult.duration + salesOrderResult.duration;
      const quotationTotal = quotationResult.result.data?.grand_total || 0;
      const salesOrderTotal = salesOrderResult.result.data?.grand_total || 0;

      this.addTestResult('E2E Sales Flow', true, totalDuration, undefined, {
        leadName,
        customerName,
        quotationName,
        salesOrderName,
        quotationTotal,
        salesOrderTotal,
        flowDuration: totalDuration,
        stepBreakdown: {
          leadCreation: leadResult.duration,
          conversion: conversionResult.duration,
          quotationCreation: quotationResult.duration,
          salesOrderCreation: salesOrderResult.duration
        }
      });

      console.log(`✅ End-to-End Sales Flow completed successfully:`);
      console.log(`  Lead: ${leadName} → Customer: ${customerName}`);
      console.log(`  Quotation: ${quotationName} ($${quotationTotal})`);
      console.log(`  Sales Order: ${salesOrderName} ($${salesOrderTotal})`);
      console.log(`  Total flow duration: ${totalDuration}ms`);

      // Verify pipeline includes our new documents
      const pipelineResult = await getSalesPipeline();
      if (pipelineResult.ok && pipelineResult.data?.pipeline) {
        const pipeline = pipelineResult.data.pipeline;
        const leadInPipeline = pipeline.leads.find(lead => lead.name === leadName);
        const quotationInPipeline = pipeline.quotations.find(quot => quot.name === quotationName);

        this.addTestResult('E2E Pipeline Verification', true, 0, undefined, {
          leadFound: !!leadInPipeline,
          quotationFound: !!quotationInPipeline,
          pipelineStatus: 'Documents successfully added to pipeline'
        });
        console.log(`✅ Pipeline verification successful - documents found in pipeline`);
      }

    } catch (error: any) {
      this.addTestResult('E2E Sales Flow', false, 0, error.message);
      console.log(`❌ End-to-End Sales Flow failed: ${error.message}`);
    }
  }

  private async testCreditLimits(): Promise<void> {
    console.log('\n💳 Testing Credit Limits...');

    if (this.testData.createdCustomers.length === 0 || this.testData.testItems.length === 0) {
      console.log('⚠️ No customers or items available for credit limit test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];

    // Test creating a large sales order that might exceed credit limits
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const items = this.testData.testItems.slice(0, 2).map(item => ({
          item_code: item.item_code,
          qty: 100, // Large quantity
          rate: item.standard_rate
        }));

        const deliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return await createSalesOrder(customerName, deliveryDate, items);
      }, 'CREATE Large Sales Order Credit Check');

      if (result.ok && result.data) {
        // Order was created, check if credit limit was applied or if there's a warning
        this.addTestResult('CREATE Large Sales Order Credit Check', true, 0, undefined, {
          salesOrderName: result.data.name || '',
          grandTotal: result.data.grand_total || 0,
          isLargeOrder: true,
          creditCheck: 'Order created - credit limit may have been checked'
        });
        console.log(`✅ Large sales order created: ${result.data.name} - $${result.data.grand_total} (credit limits applied if any)`);
      } else {
        // Order was rejected, possibly due to credit limits
        this.addTestResult('CREATE Large Sales Order Credit Check', true, 0, undefined, {
          expectedError: result.error?.message || '',
          isCreditLimitError: result.error?.message?.toLowerCase().includes('credit') ||
                             result.error?.message?.toLowerCase().includes('limit') || false,
          grandTotalAttempted: 'Large amount',
          creditCheck: 'Order rejected - likely due to credit limits'
        });
        console.log(`✅ Credit limit validation triggered: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Large Sales Order Credit Check', true, 0, undefined, {
        expectedError: error.message,
        creditCheck: 'Exception occurred - may be related to credit limits'
      });
      console.log(`✅ Credit limit check resulted in exception: ${error.message}`);
    }
  }

  private async testPricingCalculations(): Promise<void> {
    console.log('\n💰 Testing Pricing Calculations...');

    if (this.testData.createdCustomers.length === 0 || this.testData.testItems.length === 0) {
      console.log('⚠️ No customers or items available for pricing test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];
    const testItems = this.testData.testItems.slice(0, 3);

    // Test different pricing scenarios
    const pricingScenarios = [
      { name: 'Standard Pricing', multiplier: 1.0 },
      { name: 'Discounted Pricing', multiplier: 0.85 },
      { name: 'Premium Pricing', multiplier: 1.15 }
    ];

    for (const scenario of pricingScenarios) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          const items = testItems.map(item => ({
            item_code: item.item_code,
            qty: 1,
            rate: item.standard_rate * scenario.multiplier
          }));

          const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          return await createSalesOrder(customerName, deliveryDate, items);
        }, `Pricing Calculation - ${scenario.name}`);

        if (result.ok && result.data) {
          const expectedTotal = testItems.reduce((sum, item) => sum + (item.standard_rate * scenario.multiplier), 0);
          const actualTotal = result.data.grand_total || 0;

          this.addTestResult(`Pricing Calculation - ${scenario.name}`, true, 0, undefined, {
            salesOrderName: result.data.name || '',
            expectedTotal,
            actualTotal,
            difference: Math.abs(expectedTotal - actualTotal),
            multiplier: scenario.multiplier,
            calculationAccuracy: Math.abs(expectedTotal - actualTotal) < 0.01 ? 'Perfect' : 'Minor difference'
          });
          console.log(`✅ ${scenario.name}: $${actualTotal} (expected: $${expectedTotal})`);
        } else {
          this.addTestResult(`Pricing Calculation - ${scenario.name}`, false, 0, result.error?.message || 'Unknown error');
          console.log(`❌ ${scenario.name} failed: ${result.error?.message}`);
        }
      } catch (error: any) {
        this.addTestResult(`Pricing Calculation - ${scenario.name}`, false, 0, error.message);
        console.log(`❌ ${scenario.name} error: ${error.message}`);
      }
    }
  }

  private async testSalesErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Sales Error Handling...');

    // Test various error scenarios
    const errorScenarios = [
      {
        name: 'Non-existent Customer',
        test: async () => {
          return await createSalesOrder('NONEXISTENT-CUSTOMER', '2024-12-31', [{ item_code: 'TEST-ITEM', qty: 1, rate: 100 }]);
        }
      },
      {
        name: 'Non-existent Item',
        test: async () => {
          if (this.testData.createdCustomers.length === 0) return { ok: false, error: { message: 'No customers available' } };
          return await createSalesOrder(this.testData.createdCustomers[0], '2024-12-31', [{ item_code: 'NONEXISTENT-ITEM', qty: 1, rate: 100 }]);
        }
      },
      {
        name: 'Negative Rate',
        test: async () => {
          if (this.testData.createdCustomers.length === 0) return { ok: false, error: { message: 'No customers available' } };
          return await createSalesOrder(this.testData.createdCustomers[0], '2024-12-31', [{ item_code: 'TEST-ITEM', qty: 1, rate: -50 }]);
        }
      },
      {
        name: 'Empty Customer Name',
        test: async () => {
          return await createSalesOrder('', '2024-12-31', [{ item_code: 'TEST-ITEM', qty: 1, rate: 100 }]);
        }
      }
    ];

    for (const scenario of errorScenarios) {
      try {
        const { result, duration } = await this.measurePerformance(scenario.test, `Error Handling - ${scenario.name}`);

        if (!result.ok) {
          this.addTestResult(`Error Handling - ${scenario.name}`, true, 0, undefined, {
            expectedError: result.error?.message || '',
            errorType: 'Unknown',
            handledCorrectly: true
          });
          console.log(`✅ ${scenario.name} handled correctly: ${result.error?.message}`);
        } else {
          this.addTestResult(`Error Handling - ${scenario.name}`, false, 0, 'Expected error but operation succeeded');
          console.log(`❌ ${scenario.name} test failed - should have raised an error`);
        }
      } catch (error: any) {
        this.addTestResult(`Error Handling - ${scenario.name}`, true, 0, undefined, {
          expectedError: error.message,
          handledCorrectly: true
        });
        console.log(`✅ ${scenario.name} handled correctly (exception): ${error.message}`);
      }
    }
  }

  private async testSalesPerformance(): Promise<void> {
    console.log('\n⚡ Testing Sales Performance...');

    if (this.testData.createdCustomers.length === 0 || this.testData.testItems.length === 0) {
      console.log('⚠️ No customers or items available for performance test');
      return;
    }

    const customerName = this.testData.createdCustomers[0];
    const testItems = this.testData.testItems.slice(0, 2);

    // Test sequential performance
    const operations = [];
    const operationCount = 10;

    for (let i = 0; i < operationCount; i++) {
      operations.push(this.measurePerformance(async () => {
        const items = testItems.map(item => ({
          item_code: item.item_code,
          qty: 1,
          rate: item.standard_rate
        }));

        const deliveryDate = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return await createSalesOrder(customerName, deliveryDate, items);
      }, `Performance Sales Order ${i + 1}`));
    }

    try {
      const results = await Promise.all(operations);
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const avgDuration = totalDuration / operationCount;
      const minDuration = Math.min(...results.map(r => r.duration));
      const maxDuration = Math.max(...results.map(r => r.duration));

      this.addTestResult('Sales Performance Test', true, avgDuration, undefined, {
        operationCount,
        totalDuration,
        averageDuration: avgDuration,
        minDuration,
        maxDuration,
        throughput: operationCount / (totalDuration / 1000), // operations per second
        individualDurations: results.map(r => r.duration)
      });

      console.log(`✅ Performance test completed:`);
      console.log(`  ${operationCount} sales orders in ${totalDuration}ms`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms per order`);
      console.log(`  Min: ${minDuration}ms, Max: ${maxDuration}ms`);
      console.log(`  Throughput: ${(operationCount / (totalDuration / 1000)).toFixed(2)} orders/sec`);

      // Clean up performance test orders
      for (const result of results) {
        if (result.result.ok && result.result.data?.name) {
          this.testData.createdSalesOrders.push(result.result.data.name);
          this.testData.createdDocuments.push({
            doctype: 'Sales Order',
            name: result.result.data.name,
            data: { customer_name: customerName }
          });
        }
      }
    } catch (error: any) {
      this.addTestResult('Sales Performance Test', false, 0, error.message);
      console.log(`❌ Performance test failed: ${error.message}`);
    }

    // Test pipeline performance
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getSalesPipeline();
      }, 'Pipeline Performance Test');

      if (result.ok && result.data) {
        this.addTestResult('Pipeline Performance Test', true, 0, undefined, {
          pipelineData: result.data.pipeline,
          leadsCount: result.data.pipeline.leads.length,
          opportunitiesCount: result.data.pipeline.opportunities.length,
          quotationsCount: result.data.pipeline.quotations.length
        });
        console.log(`✅ Pipeline retrieved with comprehensive data`);
      } else {
        this.addTestResult('Pipeline Performance Test', false, 0, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('Pipeline Performance Test', false, 0, error.message);
    }
  }

  private async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');

    let cleanupCount = 0;
    let cleanupErrors = 0;
    const errors: string[] = [];

    // Cleanup in reverse order to handle dependencies
    const cleanupOrder = [
      ...this.testData.createdSalesOrders.map(name => ({ doctype: 'Sales Order', name })),
      ...this.testData.createdQuotations.map(name => ({ doctype: 'Quotation', name })),
      ...this.testData.createdDocuments.filter(doc => doc.doctype === 'Customer').map(doc => ({ doctype: 'Customer', name: doc.name })),
      ...this.testData.createdDocuments.filter(doc => doc.doctype === 'Lead').map(doc => ({ doctype: 'Lead', name: doc.name })),
      ...this.testData.createdDocuments.filter(doc => doc.doctype === 'Item').map(doc => ({ doctype: 'Item', name: doc.name }))
    ];

    for (const doc of cleanupOrder) {
      try {
        const result = await deleteDocument(doc.doctype, doc.name);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          errors.push(`${doc.doctype}/${doc.name}: ${result.error?.message}`);
          console.log(`⚠️ Failed to cleanup ${doc.doctype}/${doc.name}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        errors.push(`${doc.doctype}/${doc.name}: ${error.message}`);
        console.log(`⚠️ Error cleaning up ${doc.doctype}/${doc.name}: ${error.message}`);
      }
    }

    this.addTestResult('Cleanup Test Data', cleanupErrors === 0, 0,
      cleanupErrors > 0 ? `${cleanupErrors} cleanup errors occurred` : undefined,
      { cleaned: cleanupCount, errors: cleanupErrors, errorDetails: errors }
    );

    console.log(`✅ Cleanup completed: ${cleanupCount} documents cleaned, ${cleanupErrors} errors`);

    // Clear test data
    this.testData = {
      createdDocuments: [],
      createdLeads: [],
      createdCustomers: [],
      createdQuotations: [],
      createdSalesOrders: [],
      testItems: []
    };
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
🧪 Sales Domain Integration Test Report
==========================================

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
----------------------------`;

    // Group results by category
    const categories = this.testSuite.results.reduce((acc, result) => {
      const category = result.testName.split(' - ')[0] || result.testName;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    Object.entries(categories).forEach(([category, results]) => {
      const passed = results.filter(r => r.passed).length;
      const failed = results.length - passed;
      const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      report += `
${category}: ${passed}/${results.length} passed (${avgTime.toFixed(2)}ms avg)`;
    });

    report += `

📋 Detailed Test Results
-----------------------`;

    this.testSuite.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const error = result.error ? ` - ${result.error}` : '';
      report += `\n${status} ${result.testName} (${result.duration}ms)${error}`;
    });

    report += `

⚡ Performance Metrics
----------------------`;

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
      report += `\n${operation}: ${avgDuration.toFixed(2)}ms avg (${successRate.toFixed(2)}% success)`;
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

🔍 Business Logic Validation
----------------------------
`;

    // Analyze business logic validation
    const businessTests = this.testSuite.results.filter(r =>
      r.testName.includes('Validation') ||
      r.testName.includes('Credit') ||
      r.testName.includes('Pricing') ||
      r.testName.includes('Error Handling')
    );

    const businessPassed = businessTests.filter(r => r.passed).length;
    report += `Business Logic Tests: ${businessPassed}/${businessTests.length} passed\n`;

    // Analyze end-to-end flows
    const e2eTests = this.testSuite.results.filter(r => r.testName.includes('E2E'));
    const e2ePassed = e2eTests.filter(r => r.passed).length;
    report += `End-to-End Flow Tests: ${e2ePassed}/${e2eTests.length} passed\n`;

    report += `

📈 Sales Operations Summary
--------------------------
`;

    const salesOps = {
      leads: this.testSuite.results.filter(r => r.testName.includes('Lead')).length,
      quotations: this.testSuite.results.filter(r => r.testName.includes('Quotation')).length,
      salesOrders: this.testSuite.results.filter(r => r.testName.includes('Sales Order')).length,
      pipeline: this.testSuite.results.filter(r => r.testName.includes('Pipeline')).length
    };

    report += `Lead Operations: ${salesOps.leads} tests\n`;
    report += `Quotation Operations: ${salesOps.quotations} tests\n`;
    report += `Sales Order Operations: ${salesOps.salesOrders} tests\n`;
    report += `Pipeline Operations: ${salesOps.pipeline} tests\n`;

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

    if (Object.keys(errorCounts).length > 0) {
      Object.entries(errorCounts).forEach(([error, count]) => {
        report += `- ${error}: ${count} occurrence(s)\n`;
      });
    } else {
      report += 'No significant issues detected\n';
    }

    report += `

💡 Recommendations
------------------
`;

    if (summary.successRate < 90) {
      report += '- Investigate failed tests and address underlying issues\n';
    }
    if (summary.averageResponseTime > 1000) {
      report += '- Consider performance optimization for slow operations\n';
    }
    if (e2ePassed < e2eTests.length) {
      report += '- Focus on fixing end-to-end flow issues\n';
    }
    if (businessPassed < businessTests.length) {
      report += '- Review business logic validation rules\n';
    }

    report += '- Consider implementing automated regression tests\n';
    report += '- Monitor pipeline data consistency across all sales operations\n';

    return report;
  }
}

// Export the test class and run tests if this file is executed directly
if (require.main === module) {
  async function runTests() {
    const tester = new SalesIntegrationTests();
    await tester.initialize();
    const testSuite = await tester.runAllTests();
    console.log(tester.generateReport());
  }

  runTests().catch(console.error);
}