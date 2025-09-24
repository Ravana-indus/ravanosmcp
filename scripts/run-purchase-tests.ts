import { createPurchaseRequest, createPurchaseOrder, receivePurchaseOrder } from '../src/packs/purchase';
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';
import { TestResult, PerformanceMetrics, TestSuite, TestReport } from './types';

interface TestContext {
  supplierName: string;
  supplierNames: string[];
  itemCodes: string[];
  companyName: string;
  testDocuments: any[];
}

interface PurchaseTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
  documentNames?: string[];
}

interface PurchaseTestSuite {
  name: string;
  startTime: Date;
  endTime: Date;
  results: PurchaseTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
    averageResponseTime: number;
  };
}

class PurchaseIntegrationTester {
  private testResults: PurchaseTestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private createdDocuments: any[] = [];
  private context: TestContext = {
    supplierName: '',
    supplierNames: [],
    itemCodes: [],
    companyName: 'RavanOS',
    testDocuments: []
  };

  async initialize(): Promise<boolean> {
    try {
      console.log('🔑 Connecting to ERPNext...');

      const authResult = await erpAuthenticator.connect(
        process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
        process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
        process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
      );

      if (!authResult.ok) {
        throw new Error(`Authentication failed: ${authResult.error?.message}`);
      }

      console.log('✅ Successfully connected to ERPNext');

      // Check available modules
      await this.checkAvailableModules();

      // Create test data
      await this.setupTestData();

      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return false;
    }
  }

  private async checkAvailableModules(): Promise<void> {
    console.log('🔍 Checking available ERPNext modules...');

    const purchaseDoctypes = [
      'Purchase Order',
      'Purchase Invoice',
      'Purchase Receipt',
      'Purchase Request',
      'Request for Quotation',
      'Supplier Quotation'
    ];

    const availableDoctypes: string[] = [];
    const missingDoctypes: string[] = [];

    for (const doctype of purchaseDoctypes) {
      try {
        const result = await getDocument(doctype, '__check__', ['name']);
        // If we get here, the doctype exists (even if the specific document doesn't)
        availableDoctypes.push(doctype);
      } catch (error) {
        missingDoctypes.push(doctype);
      }
    }

    console.log(`✅ Available purchase doctypes: ${availableDoctypes.join(', ') || 'None'}`);
    if (missingDoctypes.length > 0) {
      console.log(`⚠️  Missing purchase doctypes: ${missingDoctypes.join(', ')}`);
      console.log('   Tests for missing doctypes will be skipped.');
    }
  }

  private async setupTestData(): Promise<void> {
    console.log('📋 Setting up test data...');

    // Create suppliers
    const suppliers = [
      { supplier_name: 'Test Supplier Corp', supplier_group: 'Local', supplier_type: 'Company', country: 'United States' },
      { supplier_name: 'Global Supplier Ltd', supplier_group: 'International', supplier_type: 'Company', country: 'Canada' },
      { supplier_name: 'Premium Supplier Inc', supplier_group: 'Premium', supplier_type: 'Company', country: 'Germany' }
    ];

    for (const supplier of suppliers) {
      const result = await createDocument('Supplier', supplier);
      if (result.ok) {
        this.context.supplierNames.push(result.data!.name);
        if (!this.context.supplierName) {
          this.context.supplierName = result.data!.name;
        }
        this.createdDocuments.push({ doctype: 'Supplier', name: result.data!.name });
      }
    }

    // Create items
    const items = [
      { item_code: 'TEST-ITEM-001', item_name: 'Test Laptop', item_group: 'Products', standard_rate: 1000, is_stock_item: 1 },
      { item_code: 'TEST-ITEM-002', item_name: 'Test Monitor', item_group: 'Products', standard_rate: 300, is_stock_item: 1 },
      { item_code: 'TEST-ITEM-003', item_name: 'Test Keyboard', item_group: 'Products', standard_rate: 50, is_stock_item: 1 },
      { item_code: 'TEST-ITEM-004', item_name: 'Test Mouse', item_group: 'Products', standard_rate: 25, is_stock_item: 1 }
    ];

    for (const item of items) {
      const result = await createDocument('Item', item);
      if (result.ok) {
        this.context.itemCodes.push(result.data!.name);
        this.createdDocuments.push({ doctype: 'Item', name: result.data!.name });
      }
    }

    console.log(`✅ Created ${this.context.supplierNames.length} suppliers and ${this.context.itemCodes.length} items`);
  }

  private async measurePerformance<T>(operation: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;

    this.performanceMetrics.push({
      operation,
      duration,
      timestamp: new Date(),
      success: true
    });

    return { result, duration };
  }

  private addTestResult(testName: string, passed: boolean, duration: number, error?: string, details?: Record<string, any>, documentNames?: string[]): void {
    this.testResults.push({
      testName,
      passed,
      duration,
      error,
      details,
      documentNames
    });
  }

  // Test Purchase Request creation
  async testPurchaseRequestCreation(): Promise<void> {
    console.log('\n📝 Testing Purchase Request creation...');

    try {
      const { result, duration } = await this.measurePerformance('createPurchaseRequest', () =>
        createPurchaseRequest(
          this.context.companyName,
          '2025-09-24',
          [
            { item_code: this.context.itemCodes[0], qty: 5 },
            { item_code: this.context.itemCodes[1], qty: 10 }
          ],
          'High',
          '2025-10-01'
        )
      );

      if (result.ok) {
        this.addTestResult('Purchase Request Creation', true, duration, undefined, {
          prName: result.data?.name,
          itemCount: result.data?.total_items,
          priority: result.data?.priority
        });
        this.createdDocuments.push({ doctype: 'Purchase Request', name: result.data!.name });
        console.log(`✅ Purchase Request created: ${result.data?.name}`);
      } else {
        // Check if the error is due to missing doctype
        if (result.error?.message?.includes('No module named') || result.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          this.addTestResult('Purchase Request Creation', false, duration, 'Purchase Request module not available in this ERPNext instance');
          console.log(`⚠️  Purchase Request module not available - skipping this test`);
        } else {
          this.addTestResult('Purchase Request Creation', false, duration, result.error?.message);
          console.log(`❌ Purchase Request creation failed: ${result.error?.message}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('No module named') || errorMsg.includes('doctype you\'re trying to open might be deleted')) {
        this.addTestResult('Purchase Request Creation', false, 0, 'Purchase Request module not available in this ERPNext instance');
        console.log(`⚠️  Purchase Request module not available - skipping this test`);
      } else {
        this.addTestResult('Purchase Request Creation', false, 0, errorMsg);
        console.log(`❌ Purchase Request creation failed: ${errorMsg}`);
      }
    }
  }

  // Test Purchase Order creation
  async testPurchaseOrderCreation(): Promise<void> {
    console.log('\n📋 Testing Purchase Order creation...');

    try {
      const { result, duration } = await this.measurePerformance('createPurchaseOrder', () =>
        createPurchaseOrder(
          this.context.supplierName,
          this.context.companyName,
          '2025-09-24',
          [
            { item_code: this.context.itemCodes[0], qty: 3, rate: 950 },
            { item_code: this.context.itemCodes[1], qty: 5, rate: 280 }
          ],
          '2025-10-15',
          'Net 30 days'
        )
      );

      if (result.ok) {
        this.addTestResult('Purchase Order Creation', true, duration, undefined, {
          poName: result.data?.name,
          grandTotal: result.data?.grand_total,
          supplier: result.data?.supplier
        });
        this.createdDocuments.push({ doctype: 'Purchase Order', name: result.data!.name });
        console.log(`✅ Purchase Order created: ${result.data?.name} (Total: $${result.data?.grand_total})`);
      } else {
        // Check if the error is due to missing doctype
        if (result.error?.message?.includes('No module named') || result.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          this.addTestResult('Purchase Order Creation', false, duration, 'Purchase Order module not available in this ERPNext instance');
          console.log(`⚠️  Purchase Order module not available - skipping this test`);
        } else {
          this.addTestResult('Purchase Order Creation', false, duration, result.error?.message);
          console.log(`❌ Purchase Order creation failed: ${result.error?.message}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('No module named') || errorMsg.includes('doctype you\'re trying to open might be deleted')) {
        this.addTestResult('Purchase Order Creation', false, 0, 'Purchase Order module not available in this ERPNext instance');
        console.log(`⚠️  Purchase Order module not available - skipping this test`);
      } else {
        this.addTestResult('Purchase Order Creation', false, 0, errorMsg);
        console.log(`❌ Purchase Order creation failed: ${errorMsg}`);
      }
    }
  }

  // Test Purchase Receipt creation
  async testPurchaseReceiptCreation(): Promise<void> {
    console.log('\n📦 Testing Purchase Receipt creation...');

    try {
      const { result, duration } = await this.measurePerformance('receivePurchaseOrder', () =>
        receivePurchaseOrder(
          this.context.supplierName,
          this.createdDocuments.find(d => d.doctype === 'Purchase Order')?.name || '',
          [
            { item_code: this.context.itemCodes[0], qty: 3, received_qty: 3 },
            { item_code: this.context.itemCodes[1], qty: 5, received_qty: 5 }
          ]
        )
      );

      if (result.ok) {
        this.addTestResult('Purchase Receipt Creation', true, duration, undefined, {
          receiptName: result.data?.name,
          totalReceivedItems: result.data?.total_received_items,
          supplier: result.data?.supplier
        });
        this.createdDocuments.push({ doctype: 'Purchase Receipt', name: result.data!.name });
        console.log(`✅ Purchase Receipt created: ${result.data?.name}`);
      } else {
        this.addTestResult('Purchase Receipt Creation', false, duration, result.error?.message);
        console.log(`❌ Purchase Receipt creation failed: ${result.error?.message}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Purchase Receipt Creation', false, 0, errorMsg);
      console.log(`❌ Purchase Receipt creation failed: ${errorMsg}`);
    }
  }

  // Test Purchase Invoice creation
  async testPurchaseInvoiceCreation(): Promise<void> {
    console.log('\n🧾 Testing Purchase Invoice creation...');

    try {
      const { result, duration } = await this.measurePerformance('createPurchaseInvoice', () =>
        createDocument('Purchase Invoice', {
          supplier: this.context.supplierName,
          company: this.context.companyName,
          transaction_date: '2025-09-24',
          due_date: '2025-10-24',
          items: [
            { item_code: this.context.itemCodes[0], qty: 3, rate: 950 },
            { item_code: this.context.itemCodes[1], qty: 5, rate: 280 }
          ]
        })
      );

      if (result.ok) {
        this.addTestResult('Purchase Invoice Creation', true, duration, undefined, {
          invoiceName: result.data?.name,
          supplier: this.context.supplierName
        });
        this.createdDocuments.push({ doctype: 'Purchase Invoice', name: result.data!.name });
        console.log(`✅ Purchase Invoice created: ${result.data?.name}`);
      } else {
      // Check if the error is due to missing doctype
        if (result.error?.message?.includes('No module named') || result.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          this.addTestResult('Purchase Invoice Creation', false, duration, 'Purchase Invoice module not available in this ERPNext instance');
          console.log(`⚠️  Purchase Invoice module not available - skipping this test`);
        } else {
          this.addTestResult('Purchase Invoice Creation', false, duration, result.error?.message);
          console.log(`❌ Purchase Invoice creation failed: ${result.error?.message}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('No module named') || errorMsg.includes('doctype you\'re trying to open might be deleted')) {
        this.addTestResult('Purchase Invoice Creation', false, 0, 'Purchase Invoice module not available in this ERPNext instance');
        console.log(`⚠️  Purchase Invoice module not available - skipping this test`);
      } else {
        this.addTestResult('Purchase Invoice Creation', false, 0, errorMsg);
        console.log(`❌ Purchase Invoice creation failed: ${errorMsg}`);
      }
    }
  }

  // Test Request for Quotation creation
  async testRequestForQuotation(): Promise<void> {
    console.log('\n💰 Testing Request for Quotation creation...');

    try {
      const { result, duration } = await this.measurePerformance('createRequestForQuotation', () =>
        createDocument('Request for Quotation', {
          company: this.context.companyName,
          transaction_date: '2025-09-24',
          message: 'Please quote for the following items',
          suppliers: [
            { supplier: this.context.supplierNames[0] },
            { supplier: this.context.supplierNames[1] }
          ],
          items: [
            { item_code: this.context.itemCodes[0], qty: 10 },
            { item_code: this.context.itemCodes[2], qty: 20 }
          ]
        })
      );

      if (result.ok) {
        this.addTestResult('Request for Quotation Creation', true, duration, undefined, {
          rfqName: result.data?.name,
          supplierCount: 2,
          itemCount: 2
        });
        this.createdDocuments.push({ doctype: 'Request for Quotation', name: result.data!.name });
        console.log(`✅ Request for Quotation created: ${result.data?.name}`);
      } else {
      // Check if the error is due to missing doctype
        if (result.error?.message?.includes('No module named') || result.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          this.addTestResult('Request for Quotation Creation', false, duration, 'Request for Quotation module not available in this ERPNext instance');
          console.log(`⚠️  Request for Quotation module not available - skipping this test`);
        } else {
          this.addTestResult('Request for Quotation Creation', false, duration, result.error?.message);
          console.log(`❌ Request for Quotation creation failed: ${result.error?.message}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('No module named') || errorMsg.includes('doctype you\'re trying to open might be deleted')) {
        this.addTestResult('Request for Quotation Creation', false, 0, 'Request for Quotation module not available in this ERPNext instance');
        console.log(`⚠️  Request for Quotation module not available - skipping this test`);
      } else {
        this.addTestResult('Request for Quotation Creation', false, 0, errorMsg);
        console.log(`❌ Request for Quotation creation failed: ${errorMsg}`);
      }
    }
  }

  // Test Supplier Quotation creation
  async testSupplierQuotation(): Promise<void> {
    console.log('\n📑 Testing Supplier Quotation creation...');

    try {
      const { result, duration } = await this.measurePerformance('createSupplierQuotation', () =>
        createDocument('Supplier Quotation', {
          supplier: this.context.supplierName,
          company: this.context.companyName,
          transaction_date: '2025-09-24',
          valid_till: '2025-10-24',
          items: [
            { item_code: this.context.itemCodes[0], qty: 10, rate: 920 },
            { item_code: this.context.itemCodes[1], qty: 15, rate: 275 }
          ]
        })
      );

      if (result.ok) {
        this.addTestResult('Supplier Quotation Creation', true, duration, undefined, {
          quotationName: result.data?.name,
          supplier: this.context.supplierName
        });
        this.createdDocuments.push({ doctype: 'Supplier Quotation', name: result.data!.name });
        console.log(`✅ Supplier Quotation created: ${result.data?.name}`);
      } else {
      // Check if the error is due to missing doctype
        if (result.error?.message?.includes('No module named') || result.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          this.addTestResult('Supplier Quotation Creation', false, duration, 'Supplier Quotation module not available in this ERPNext instance');
          console.log(`⚠️  Supplier Quotation module not available - skipping this test`);
        } else {
          this.addTestResult('Supplier Quotation Creation', false, duration, result.error?.message);
          console.log(`❌ Supplier Quotation creation failed: ${result.error?.message}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('No module named') || errorMsg.includes('doctype you\'re trying to open might be deleted')) {
        this.addTestResult('Supplier Quotation Creation', false, 0, 'Supplier Quotation module not available in this ERPNext instance');
        console.log(`⚠️  Supplier Quotation module not available - skipping this test`);
      } else {
        this.addTestResult('Supplier Quotation Creation', false, 0, errorMsg);
        console.log(`❌ Supplier Quotation creation failed: ${errorMsg}`);
      }
    }
  }

  // Test Purchase Order management (update and read)
  async testPurchaseOrderManagement(): Promise<void> {
    console.log('\n🔧 Testing Purchase Order management...');

    try {
      // Create a PO to manage
      const createResult = await createPurchaseOrder(
        this.context.supplierName,
        this.context.companyName,
        '2025-09-24',
        [
          { item_code: this.context.itemCodes[0], qty: 2, rate: 900 }
        ]
      );

      if (!createResult.ok) {
        throw new Error(`Failed to create PO for management test: ${createResult.error?.message}`);
      }

      const poName = createResult.data!.name;
      this.createdDocuments.push({ doctype: 'Purchase Order', name: poName });

      // Test reading the PO
      const { result: readResult, duration: readDuration } = await this.measurePerformance('getPurchaseOrder', () =>
        getDocument('Purchase Order', poName)
      );

      if (readResult.ok) {
        this.addTestResult('Purchase Order Read', true, readDuration, undefined, {
          poName,
          fieldCount: Object.keys(readResult.data!.doc).length
        });
        console.log(`✅ Purchase Order read successfully: ${poName}`);
      } else {
        this.addTestResult('Purchase Order Read', false, readDuration, readResult.error?.message);
        console.log(`❌ Purchase Order read failed: ${readResult.error?.message}`);
      }

      // Test updating the PO
      const { result: updateResult, duration: updateDuration } = await this.measurePerformance('updatePurchaseOrder', () =>
        updateDocument('Purchase Order', poName, {
          terms: 'Updated terms for testing',
          schedule_date: '2025-10-20'
        })
      );

      if (updateResult.ok) {
        this.addTestResult('Purchase Order Update', true, updateDuration, undefined, {
          poName,
          updatedFields: ['terms', 'schedule_date']
        });
        console.log(`✅ Purchase Order updated successfully: ${poName}`);
      } else {
        this.addTestResult('Purchase Order Update', false, updateDuration, updateResult.error?.message);
        console.log(`❌ Purchase Order update failed: ${updateResult.error?.message}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Purchase Order Management', false, 0, errorMsg);
      console.log(`❌ Purchase Order management test failed: ${errorMsg}`);
    }
  }

  // Test error handling scenarios
  async testErrorHandling(): Promise<void> {
    console.log('\n🚨 Testing error handling scenarios...');

    // Test with invalid supplier
    try {
      const { result, duration } = await this.measurePerformance('invalidSupplierTest', () =>
        createPurchaseOrder(
          'INVALID_SUPPLIER',
          this.context.companyName,
          '2025-09-24',
          [{ item_code: this.context.itemCodes[0], qty: 1, rate: 100 }]
        )
      );

      if (result.ok) {
        this.addTestResult('Invalid Supplier Error Handling', false, duration, 'Should have failed with invalid supplier');
      } else {
        this.addTestResult('Invalid Supplier Error Handling', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Invalid supplier error handling working correctly');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Invalid Supplier Error Handling', true, 0, undefined, { caughtException: errorMsg });
      console.log('✅ Invalid supplier error handling working correctly (exception caught)');
    }

    // Test with invalid item
    try {
      const { result, duration } = await this.measurePerformance('invalidItemTest', () =>
        createPurchaseOrder(
          this.context.supplierName,
          this.context.companyName,
          '2025-09-24',
          [{ item_code: 'INVALID_ITEM', qty: 1, rate: 100 }]
        )
      );

      if (result.ok) {
        this.addTestResult('Invalid Item Error Handling', false, duration, 'Should have failed with invalid item');
      } else {
        this.addTestResult('Invalid Item Error Handling', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Invalid item error handling working correctly');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Invalid Item Error Handling', true, 0, undefined, { caughtException: errorMsg });
      console.log('✅ Invalid item error handling working correctly (exception caught)');
    }

    // Test with negative quantity
    try {
      const { result, duration } = await this.measurePerformance('negativeQuantityTest', () =>
        createPurchaseOrder(
          this.context.supplierName,
          this.context.companyName,
          '2025-09-24',
          [{ item_code: this.context.itemCodes[0], qty: -1, rate: 100 }]
        )
      );

      if (result.ok) {
        this.addTestResult('Negative Quantity Error Handling', false, duration, 'Should have failed with negative quantity');
      } else {
        this.addTestResult('Negative Quantity Error Handling', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Negative quantity error handling working correctly');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Negative Quantity Error Handling', true, 0, undefined, { caughtException: errorMsg });
      console.log('✅ Negative quantity error handling working correctly (exception caught)');
    }
  }

  // Test supplier quotation comparison
  async testSupplierQuotationComparison(): Promise<void> {
    console.log('\n⚖️ Testing supplier quotation comparison...');

    try {
      // Create RFQ
      const rfqResult = await createDocument('Request for Quotation', {
        company: this.context.companyName,
        transaction_date: '2025-09-24',
        suppliers: [
          { supplier: this.context.supplierNames[0] },
          { supplier: this.context.supplierNames[1] }
        ],
        items: [
          { item_code: this.context.itemCodes[0], qty: 10 },
          { item_code: this.context.itemCodes[1], qty: 5 }
        ]
      });

      if (!rfqResult.ok) {
        throw new Error(`Failed to create RFQ: ${rfqResult.error?.message}`);
      }

      const rfqName = rfqResult.data!.name;
      this.createdDocuments.push({ doctype: 'Request for Quotation', name: rfqName });

      // Create supplier quotations from different suppliers
      const quotations = [];
      for (let i = 0; i < 2; i++) {
        const quoteResult = await createDocument('Supplier Quotation', {
          supplier: this.context.supplierNames[i],
          company: this.context.companyName,
          transaction_date: '2025-09-24',
          valid_till: '2025-10-24',
          items: [
            { item_code: this.context.itemCodes[0], qty: 10, rate: 950 - (i * 50) },
            { item_code: this.context.itemCodes[1], qty: 5, rate: 280 - (i * 20) }
          ]
        });

        if (quoteResult.ok) {
          quotations.push({
            supplier: this.context.supplierNames[i],
            name: quoteResult.data!.name,
            totalAmount: 10 * (950 - (i * 50)) + 5 * (280 - (i * 20))
          });
          this.createdDocuments.push({ doctype: 'Supplier Quotation', name: quoteResult.data!.name });
        }
      }

      // Simulate comparison logic
      const bestQuote = quotations.reduce((best, current) =>
        current.totalAmount < best.totalAmount ? current : best
      );

      this.addTestResult('Supplier Quotation Comparison', true, 0, undefined, {
        rfqName,
        quotationsReceived: quotations.length,
        bestSupplier: bestQuote.supplier,
        bestAmount: bestQuote.totalAmount
      });

      console.log(`✅ Supplier quotation comparison completed. Best quote: ${bestQuote.supplier} ($${bestQuote.totalAmount})`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Supplier Quotation Comparison', false, 0, errorMsg);
      console.log(`❌ Supplier quotation comparison failed: ${errorMsg}`);
    }
  }

  // Test purchase approval workflows
  async testPurchaseApprovalWorkflows(): Promise<void> {
    console.log('\n📋 Testing purchase approval workflows...');

    try {
      // Create a high-value purchase order that might require approval
      const { result, duration } = await this.measurePerformance('highValuePurchaseOrder', () =>
        createPurchaseOrder(
          this.context.supplierName,
          this.context.companyName,
          '2025-09-24',
          [
            { item_code: this.context.itemCodes[0], qty: 10, rate: 950 }, // $9,500
            { item_code: this.context.itemCodes[1], qty: 20, rate: 280 }  // $5,600
          ],
          '2025-10-15',
          'Requires approval due to high value'
        )
      );

      if (result.ok) {
        this.addTestResult('High Value Purchase Order Creation', true, duration, undefined, {
          poName: result.data?.name,
          grandTotal: result.data?.grand_total,
          requiresApproval: result.data?.grand_total > 10000
        });
        this.createdDocuments.push({ doctype: 'Purchase Order', name: result.data!.name });
        console.log(`✅ High value purchase order created: ${result.data?.name} (Total: $${result.data?.grand_total})`);

        // Test workflow status check
        const { result: workflowResult, duration: workflowDuration } = await this.measurePerformance('checkWorkflowStatus', () =>
          getDocument('Purchase Order', result.data!.name, ['workflow_state', 'docstatus'])
        );

        if (workflowResult.ok) {
          const workflowState = workflowResult.data?.doc?.workflow_state;
          const docStatus = workflowResult.data?.doc?.docstatus;

          this.addTestResult('Purchase Order Workflow Status', true, workflowDuration, undefined, {
            poName: result.data!.name,
            workflowState,
            docStatus
          });

          console.log(`✅ Workflow status retrieved: ${workflowState || 'Not set'}, Doc Status: ${docStatus}`);
        } else {
          this.addTestResult('Purchase Order Workflow Status', false, workflowDuration, workflowResult.error?.message);
          console.log(`❌ Failed to retrieve workflow status: ${workflowResult.error?.message}`);
        }

      } else {
        this.addTestResult('High Value Purchase Order Creation', false, duration, result.error?.message);
        console.log(`❌ High value purchase order creation failed: ${result.error?.message}`);
      }

      // Test purchase order submission (simulating approval process)
      const poForApproval = await createPurchaseOrder(
        this.context.supplierName,
        this.context.companyName,
        '2025-09-24',
        [
          { item_code: this.context.itemCodes[2], qty: 5, rate: 50 }
        ]
      );

      if (poForApproval.ok) {
        this.createdDocuments.push({ doctype: 'Purchase Order', name: poForApproval.data!.name });

        const { result: submitResult, duration: submitDuration } = await this.measurePerformance('submitPurchaseOrder', () =>
          updateDocument('Purchase Order', poForApproval.data!.name, {
            docstatus: 1, // Submit for approval
            workflow_state: 'Pending Approval'
          })
        );

        if (submitResult.ok) {
          this.addTestResult('Purchase Order Submission', true, submitDuration, undefined, {
            poName: poForApproval.data!.name,
            status: 'Submitted for Approval'
          });
          console.log(`✅ Purchase order submitted for approval: ${poForApproval.data!.name}`);
        } else {
          this.addTestResult('Purchase Order Submission', false, submitDuration, submitResult.error?.message);
          console.log(`❌ Purchase order submission failed: ${submitResult.error?.message}`);
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('Purchase Approval Workflow', false, 0, errorMsg);
      console.log(`❌ Purchase approval workflow test failed: ${errorMsg}`);
    }
  }

  // Test end-to-end purchase process
  async testEndToEndPurchaseProcess(): Promise<void> {
    console.log('\n🔄 Testing end-to-end purchase process...');

    try {
      const processStartTime = Date.now();
      const processDocuments: string[] = [];
      let processSteps = 0;
      let skippedSteps = 0;

      // Step 1: Create Purchase Request (optional - skip if not available)
      try {
        const prResult = await createPurchaseRequest(
          this.context.companyName,
          '2025-09-24',
          [
            { item_code: this.context.itemCodes[0], qty: 2 },
            { item_code: this.context.itemCodes[1], qty: 3 }
          ],
          'High',
          '2025-10-01'
        );

        if (prResult.ok) {
          processDocuments.push(prResult.data!.name);
          this.createdDocuments.push({ doctype: 'Purchase Request', name: prResult.data!.name });
          processSteps++;
          console.log(`   📝 PR: ${prResult.data!.name}`);
        } else {
          console.log(`   ⚠️  Skipping Purchase Request: ${prResult.error?.message}`);
          skippedSteps++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('No module named') || errorMsg.includes('doctype you\'re trying to open might be deleted')) {
          console.log(`   ⚠️  Skipping Purchase Request: Module not available`);
          skippedSteps++;
        } else {
          throw new Error(`Purchase Request failed: ${errorMsg}`);
        }
      }

      // Step 2: Create Purchase Order
      const poResult = await createPurchaseOrder(
        this.context.supplierName,
        this.context.companyName,
        '2025-09-24',
        [
          { item_code: this.context.itemCodes[0], qty: 2, rate: 950 },
          { item_code: this.context.itemCodes[1], qty: 3, rate: 280 }
        ],
        '2025-10-15'
      );

      if (!poResult.ok) {
        if (poResult.error?.message?.includes('No module named') || poResult.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          throw new Error('Purchase Order module not available - cannot continue end-to-end test');
        }
        throw new Error(`Purchase Order failed: ${poResult.error?.message}`);
      }

      processDocuments.push(poResult.data!.name);
      this.createdDocuments.push({ doctype: 'Purchase Order', name: poResult.data!.name });
      processSteps++;
      console.log(`   📋 PO: ${poResult.data!.name}`);

      // Step 3: Create Purchase Receipt
      const receiptResult = await receivePurchaseOrder(
        this.context.supplierName,
        poResult.data!.name,
        [
          { item_code: this.context.itemCodes[0], qty: 2, received_qty: 2 },
          { item_code: this.context.itemCodes[1], qty: 3, received_qty: 3 }
        ]
      );

      if (!receiptResult.ok) throw new Error(`Purchase Receipt failed: ${receiptResult.error?.message}`);
      processDocuments.push(receiptResult.data!.name);
      this.createdDocuments.push({ doctype: 'Purchase Receipt', name: receiptResult.data!.name });
      processSteps++;
      console.log(`   📦 Receipt: ${receiptResult.data!.name}`);

      // Step 4: Create Purchase Invoice
      const invoiceResult = await createDocument('Purchase Invoice', {
        supplier: this.context.supplierName,
        company: this.context.companyName,
        transaction_date: '2025-09-24',
        items: [
          { item_code: this.context.itemCodes[0], qty: 2, rate: 950 },
          { item_code: this.context.itemCodes[1], qty: 3, rate: 280 }
        ]
      });

      if (!invoiceResult.ok) {
        if (invoiceResult.error?.message?.includes('No module named') || invoiceResult.error?.message?.includes('doctype you\'re trying to open might be deleted')) {
          console.log(`   ⚠️  Skipping Purchase Invoice: Module not available`);
          skippedSteps++;
        } else {
          throw new Error(`Purchase Invoice failed: ${invoiceResult.error?.message}`);
        }
      } else {
        processDocuments.push(invoiceResult.data!.name);
        this.createdDocuments.push({ doctype: 'Purchase Invoice', name: invoiceResult.data!.name });
        processSteps++;
        console.log(`   🧾 Invoice: ${invoiceResult.data!.name}`);
      }

      const totalDuration = Date.now() - processStartTime;

      this.addTestResult('End-to-End Purchase Process', true, totalDuration, undefined, {
        processSteps,
        skippedSteps,
        documentsCreated: processDocuments,
        totalAmount: 2 * 950 + 3 * 280
      });

      console.log(`✅ End-to-end purchase process completed in ${totalDuration}ms (${processSteps} steps, ${skippedSteps} skipped)`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addTestResult('End-to-End Purchase Process', false, 0, errorMsg);
      console.log(`❌ End-to-end purchase process failed: ${errorMsg}`);
    }
  }

  // Generate test report
  private generateReport(): TestReport {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const averageResponseTime = this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    const testSuite: PurchaseTestSuite = {
      name: 'Purchase Domain Integration Tests',
      startTime: new Date(Date.now() - 600000), // Approximate start time
      endTime: new Date(),
      results: this.testResults,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate,
        averageResponseTime
      }
    };

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze performance
    const slowOperations = this.performanceMetrics.filter(m => m.duration > 3000);
    if (slowOperations.length > 0) {
      issues.push(`${slowOperations.length} operations took longer than 3 seconds`);
      recommendations.push('Consider optimizing slow operations and investigating API response times');
    }

    // Analyze error rates
    const errorRate = (failedTests / totalTests) * 100;
    if (errorRate > 10) {
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      recommendations.push('Investigate error patterns and improve error handling');
    }

    // Analyze success rate
    if (successRate < 95) {
      issues.push(`Success rate below target: ${successRate.toFixed(1)}%`);
      recommendations.push('Review test scenarios and improve implementation');
    }

    return {
      testSuite: testSuite as TestSuite,
      performanceMetrics: this.performanceMetrics,
      issues,
      recommendations
    };
  }

  // Cleanup test data
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');

    const deletePromises = this.createdDocuments.reverse().map(async (doc) => {
      try {
        const result = await deleteDocument(doc.doctype, doc.name);
        if (result.ok) {
          console.log(`✅ Deleted ${doc.doctype}: ${doc.name}`);
        } else {
          console.log(`⚠️  Failed to delete ${doc.doctype}: ${doc.name} - ${result.error?.message}`);
        }
      } catch (error) {
        console.log(`⚠️  Error deleting ${doc.doctype}: ${doc.name} - ${error}`);
      }
    });

    await Promise.all(deletePromises);
    console.log('🧹 Cleanup completed');
  }

  // Run all tests
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Purchase Domain Integration Tests...');

    const initialized = await this.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize test environment');
    }

    try {
      // Run all test methods
      await this.testPurchaseRequestCreation();
      await this.testPurchaseOrderCreation();
      await this.testPurchaseReceiptCreation();
      await this.testPurchaseInvoiceCreation();
      await this.testRequestForQuotation();
      await this.testSupplierQuotation();
      await this.testPurchaseOrderManagement();
      await this.testErrorHandling();
      await this.testSupplierQuotationComparison();
      await this.testPurchaseApprovalWorkflows();
      await this.testEndToEndPurchaseProcess();

      // Generate report
      const report = this.generateReport();

      // Display results
      this.displayResults(report);

      return report;
    } finally {
      await this.cleanup();
    }
  }

  private displayResults(report: TestReport): void {
    console.log('\n📊 Purchase Domain Integration Test Results');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${report.testSuite.summary.total}`);
    console.log(`Passed: ${report.testSuite.summary.passed} ✅`);
    console.log(`Failed: ${report.testSuite.summary.failed} ❌`);
    console.log(`Success Rate: ${report.testSuite.summary.successRate.toFixed(1)}%`);
    console.log(`Average Response Time: ${report.testSuite.summary.averageResponseTime.toFixed(0)}ms`);

    if (report.issues.length > 0) {
      console.log('\n⚠️  Issues Identified:');
      report.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }

    // Save detailed results
    const fs = require('fs');
    const path = require('path');

    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const reportPath = path.join(resultsDir, 'purchase-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new PurchaseIntegrationTester();

  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 Purchase Domain Integration Tests Completed!');
      console.log(`Success Rate: ${report.testSuite.summary.successRate.toFixed(1)}%`);

      if (report.testSuite.summary.successRate >= 95) {
        console.log('✅ Tests passed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Some tests failed. Please review the report.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { PurchaseIntegrationTester };