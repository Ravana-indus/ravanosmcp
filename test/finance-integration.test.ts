import { createSalesInvoice, recordPayment, getOutstandingInvoices, createExpenseClaim } from '../src/packs/finance';
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';
import { TestResult, TestSuite, PerformanceMetrics } from './types';

interface FinanceTestData {
  customers: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
  items: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
  employees: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
  salesInvoices: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
    total: number;
  }>;
  paymentEntries: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
  expenseClaims: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
  journalEntries: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
  accounts: Array<{
    name: string;
    docName: string;
    data: Record<string, any>;
  }>;
}

interface FinanceOperations {
  // Basic Finance Operations
  createSalesInvoice: (customer: string, dueDate: string, company: string, items: any[]) => Promise<any>;
  recordPayment: (paymentType: string, partyType: string, party: string, paidAmount: number, receivedAmount: number, references: any[]) => Promise<any>;
  getOutstandingInvoices: (customer?: string, company?: string) => Promise<any>;
  createExpenseClaim: (employee: string, expenseApprover: string, expenses: any[]) => Promise<any>;

  // Extended Finance Operations for comprehensive testing
  createJournalEntry: (voucherType: string, postingDate: string, accounts: any[]) => Promise<any>;
  createPaymentEntry: (paymentType: string, partyType: string, party: string, paidFrom: string, paidTo: string, paidAmount: number, references?: any[]) => Promise<any>;
  createAccount: (accountName: string, parentAccount: string, accountType: string, company?: string) => Promise<any>;
  getGeneralLedger: (filters?: any) => Promise<any>;
  getTrialBalance: (company?: string, fiscalYear?: string) => Promise<any>;
  getBalanceSheet: (company?: string, fiscalYear?: string) => Promise<any>;
  getProfitLoss: (company?: string, fiscalYear?: string) => Promise<any>;
  createBankReconciliation: (bankAccount: string, fromDate: string, toDate: string, transactions: any[]) => Promise<any>;
  closeAccountingPeriod: (company: string, fiscalYear: string) => Promise<any>;
}

export class FinanceIntegrationTests {
  private testData: FinanceTestData = {
    customers: [],
    items: [],
    employees: [],
    salesInvoices: [],
    paymentEntries: [],
    expenseClaims: [],
    journalEntries: [],
    accounts: []
  };
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private testSuite: TestSuite = {
    name: 'Finance Domain Integration Tests',
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

  // Extended Finance Operations
  private async createJournalEntry(voucherType: string, postingDate: string, accounts: any[]): Promise<any> {
    return await createDocument('Journal Entry', {
      voucher_type: voucherType,
      posting_date: postingDate,
      accounts: accounts,
      user_remark: 'Test Journal Entry',
      company: 'Test Company'
    });
  }

  private async createPaymentEntry(paymentType: string, partyType: string, party: string, paidFrom: string, paidTo: string, paidAmount: number, references?: any[]): Promise<any> {
    const paymentData: any = {
      payment_type: paymentType,
      party_type: partyType,
      party: party,
      paid_from: paidFrom,
      paid_to: paidTo,
      paid_amount: paidAmount,
      received_amount: paidAmount,
      posting_date: new Date().toISOString().split('T')[0]
    };

    if (references && references.length > 0) {
      paymentData.references = references;
    }

    return await createDocument('Payment Entry', paymentData);
  }

  private async createAccount(accountName: string, parentAccount: string, accountType: string, company?: string): Promise<any> {
    const accountData: any = {
      account_name: accountName,
      parent_account: parentAccount,
      account_type: accountType,
      is_group: 0
    };

    if (company) {
      accountData.company = company;
    }

    return await createDocument('Account', accountData);
  }

  private async getGeneralLedger(filters?: any): Promise<any> {
    const defaultFilters: any = {
      docstatus: 1,
      voucher_type: ['!=', 'Period Closing Voucher']
    };

    if (filters) {
      Object.assign(defaultFilters, filters);
    }

    return await listDocuments('General Ledger', defaultFilters, ['name', 'posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no'], 100);
  }

  private async getTrialBalance(company?: string, fiscalYear?: string): Promise<any> {
    const filters: any = {};

    if (company) filters.company = company;
    if (fiscalYear) filters.fiscal_year = fiscalYear;

    return await listDocuments('Trial Balance', filters, ['name', 'account', 'debit', 'credit', 'company'], 50);
  }

  private async getBalanceSheet(company?: string, fiscalYear?: string): Promise<any> {
    const filters: any = {};

    if (company) filters.company = company;
    if (fiscalYear) filters.fiscal_year = fiscalYear;

    return await listDocuments('Balance Sheet', filters, ['name', 'account', 'balance'], 50);
  }

  private async getProfitLoss(company?: string, fiscalYear?: string): Promise<any> {
    const filters: any = {};

    if (company) filters.company = company;
    if (fiscalYear) filters.fiscal_year = fiscalYear;

    return await listDocuments('Profit and Loss', filters, ['name', 'account', 'amount'], 50);
  }

  private async createBankReconciliation(bankAccount: string, fromDate: string, toDate: string, transactions: any[]): Promise<any> {
    return await createDocument('Bank Reconciliation', {
      bank_account: bankAccount,
      from_date: fromDate,
      to_date: toDate,
      transactions: transactions,
      company: 'Test Company'
    });
  }

  private async closeAccountingPeriod(company: string, fiscalYear: string): Promise<any> {
    return await createDocument('Period Closing Voucher', {
      company: company,
      fiscal_year: fiscalYear,
      closing_date: new Date().toISOString().split('T')[0],
      remarks: 'Test Period Closing'
    });
  }

  async runAllTests(): Promise<TestSuite> {
    console.log('🚀 Starting Finance Domain Integration Tests...');
    this.testSuite.startTime = new Date();

    try {
      // Setup test data
      await this.setupTestData();

      // Test Core Finance Operations
      await this.testSalesInvoiceOperations();
      await this.testPaymentEntryOperations();
      await this.testExpenseClaimOperations();
      await this.testOutstandingInvoiceOperations();

      // Test Advanced Finance Operations
      await this.testJournalEntryOperations();
      await this.testGeneralLedgerOperations();
      await this.testAccountManagement();
      await this.testFinancialReporting();
      await this.testBankReconciliation();
      await this.testPeriodClosing();

      // Test Finance Scenarios
      await this.testDoubleEntryBookkeeping();
      await this.testPaymentProcessing();
      await this.testMultiCurrencyTransactions();
      await this.testTaxCalculations();

      // Test Error Handling
      await this.testFinanceErrorHandling();
      await this.testFinanceValidationErrors();
      await this.testFinancePermissionErrors();

      // Performance Testing
      await this.testFinancePerformance();

      // Cleanup test data
      await this.cleanupTestData();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }

    this.testSuite.endTime = new Date();
    this.calculateSummary();

    return this.testSuite;
  }

  private async setupTestData(): Promise<void> {
    console.log('\n🔧 Setting up test data...');

    // Create test customer
    try {
      const customerName = this.generateUniqueName('Test Customer');
      const result = await createDocument('Customer', {
        customer_name: customerName,
        customer_type: 'Company',
        territory: 'All Territories',
        customer_group: 'All Customer Groups'
      });

      if (result.ok && result.data?.name) {
        this.testData.customers.push({
          name: customerName,
          docName: result.data.name,
          data: { customer_name: customerName }
        });
      }
    } catch (error) {
      console.log('⚠️ Customer creation failed:', error);
    }

    // Create test item
    try {
      const itemCode = this.generateUniqueName('TEST-ITEM');
      const result = await createDocument('Item', {
        item_code: itemCode,
        item_name: `Test Item ${itemCode}`,
        item_group: 'All Item Groups',
        stock_uom: 'Nos',
        is_stock_item: 1,
        standard_rate: 100
      });

      if (result.ok && result.data?.name) {
        this.testData.items.push({
          name: itemCode,
          docName: result.data.name,
          data: { item_code: itemCode }
        });
      }
    } catch (error) {
      console.log('⚠️ Item creation failed:', error);
    }

    // Create test employee
    try {
      const employeeName = this.generateUniqueName('Test Employee');
      const result = await createDocument('Employee', {
        first_name: 'Test',
        last_name: 'Employee',
        employee: employeeName,
        status: 'Active',
        date_of_joining: new Date().toISOString().split('T')[0]
      });

      if (result.ok && result.data?.name) {
        this.testData.employees.push({
          name: employeeName,
          docName: result.data.name,
          data: { employee: employeeName }
        });
      }
    } catch (error) {
      console.log('⚠️ Employee creation failed:', error);
    }
  }

  private async testSalesInvoiceOperations(): Promise<void> {
    console.log('\n🧾 Testing Sales Invoice Operations...');

    if (this.testData.customers.length === 0 || this.testData.items.length === 0) {
      console.log('⚠️ No test customers or items available, skipping sales invoice tests');
      return;
    }

    // Test successful sales invoice creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const customer = this.testData.customers[0];
        const item = this.testData.items[0];

        return await createSalesInvoice(
          customer.docName,
          this.getFutureDate(30),
          'Test Company',
          [{ item_code: item.name, qty: 2, rate: 150 }]
        );
      }, 'CREATE Sales Invoice');

      if (result.ok && result.data?.name) {
        this.testData.salesInvoices.push({
          name: 'Test Sales Invoice',
          docName: result.data.name,
          data: result.data,
          total: result.data.grand_total || 300
        });
        this.addTestResult('CREATE Sales Invoice', true, duration, undefined, {
          documentName: result.data.name,
          customer: result.data.customer,
          total: result.data.grand_total
        });
        console.log(`✅ Sales Invoice created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Sales Invoice', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Sales Invoice creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Invoice', false, 0, error.message);
      console.log(`❌ Sales Invoice creation error: ${error.message}`);
    }

    // Test sales invoice with multiple items
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const customer = this.testData.customers[0];

        const items = [
          { item_code: this.testData.items[0].name, qty: 1, rate: 100 },
          { item_code: this.testData.items[0].name, qty: 2, rate: 200 }
        ];

        return await createSalesInvoice(
          customer.docName,
          this.getFutureDate(30),
          'Test Company',
          items
        );
      }, 'CREATE Sales Invoice Multiple Items');

      if (result.ok && result.data?.name) {
        this.testData.salesInvoices.push({
          name: 'Test Sales Invoice Multi',
          docName: result.data.name,
          data: result.data,
          total: result.data.grand_total || 500
        });
        this.addTestResult('CREATE Sales Invoice Multiple Items', true, duration, undefined, {
          documentName: result.data.name,
          total: result.data.grand_total,
          itemCount: 2
        });
        console.log(`✅ Multi-item Sales Invoice created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Sales Invoice Multiple Items', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Invoice Multiple Items', false, 0, error.message);
    }

    // Test sales invoice validation errors
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await createSalesInvoice(
          '', // Empty customer
          'invalid-date',
          '',
          []
        );
      }, 'CREATE Sales Invoice Validation Error');

      if (!result.ok) {
        this.addTestResult('CREATE Sales Invoice Validation Error', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Sales Invoice validation error handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('CREATE Sales Invoice Validation Error', false, duration, 'Expected validation error but creation succeeded');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Sales Invoice Validation Error', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testPaymentEntryOperations(): Promise<void> {
    console.log('\n💰 Testing Payment Entry Operations...');

    if (this.testData.salesInvoices.length === 0) {
      console.log('⚠️ No sales invoices available, skipping payment entry tests');
      return;
    }

    const invoice = this.testData.salesInvoices[0];

    // Test successful payment entry creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await recordPayment(
          'Receive',
          'Customer',
          invoice.data.customer,
          300,
          300,
          [{ reference_doctype: 'Sales Invoice', reference_name: invoice.docName, allocated_amount: 300 }]
        );
      }, 'CREATE Payment Entry');

      if (result.ok && result.data?.name) {
        this.testData.paymentEntries.push({
          name: 'Test Payment Entry',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('CREATE Payment Entry', true, duration, undefined, {
          documentName: result.data.name,
          paymentType: result.data.payment_type,
          amount: result.data.paid_amount
        });
        console.log(`✅ Payment Entry created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Payment Entry', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Payment Entry creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Payment Entry', false, 0, error.message);
      console.log(`❌ Payment Entry creation error: ${error.message}`);
    }

    // Test payment entry with multiple references
    if (this.testData.salesInvoices.length > 1) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          const invoices = this.testData.salesInvoices.slice(0, 2);
          const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

          const references = invoices.map(inv => ({
            reference_doctype: 'Sales Invoice',
            reference_name: inv.docName,
            allocated_amount: inv.total
          }));

          return await recordPayment(
            'Receive',
            'Customer',
            invoices[0].data.customer,
            totalAmount,
            totalAmount,
            references
          );
        }, 'CREATE Payment Entry Multiple References');

        if (result.ok && result.data?.name) {
          this.testData.paymentEntries.push({
            name: 'Test Payment Entry Multi',
            docName: result.data.name,
            data: result.data
          });
          this.addTestResult('CREATE Payment Entry Multiple References', true, duration, undefined, {
            documentName: result.data.name,
            referenceCount: 2,
            totalAmount: result.data.paid_amount
          });
          console.log(`✅ Multi-reference Payment Entry created: ${result.data.name}`);
        } else {
          this.addTestResult('CREATE Payment Entry Multiple References', false, duration, result.error?.message || 'Unknown error');
        }
      } catch (error: any) {
        this.addTestResult('CREATE Payment Entry Multiple References', false, 0, error.message);
      }
    }

    // Test payment entry validation errors
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await recordPayment(
          'Invalid',
          'Customer',
          invoice.data.customer,
          -100,
          -100,
          []
        );
      }, 'CREATE Payment Entry Validation Error');

      if (!result.ok) {
        this.addTestResult('CREATE Payment Entry Validation Error', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Payment Entry validation error handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('CREATE Payment Entry Validation Error', false, duration, 'Expected validation error but creation succeeded');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Payment Entry Validation Error', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testExpenseClaimOperations(): Promise<void> {
    console.log('\n🧾 Testing Expense Claim Operations...');

    if (this.testData.employees.length === 0) {
      console.log('⚠️ No employees available, skipping expense claim tests');
      return;
    }

    const employee = this.testData.employees[0];

    // Test successful expense claim creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const expenses = [
          { expense_date: this.getPastDate(5), expense_type: 'Travel', amount: 150, description: 'Flight to client meeting' },
          { expense_date: this.getPastDate(4), expense_type: 'Meals', amount: 50 },
          { expense_date: this.getPastDate(3), expense_type: 'Transport', amount: 25, description: 'Taxi ride' }
        ];

        return await createExpenseClaim(
          employee.docName,
          employee.docName,
          expenses
        );
      }, 'CREATE Expense Claim');

      if (result.ok && result.data?.name) {
        this.testData.expenseClaims.push({
          name: 'Test Expense Claim',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('CREATE Expense Claim', true, duration, undefined, {
          documentName: result.data.name,
          employee: result.data.employee,
          totalClaimed: result.data.total_claimed_amount,
          expenseCount: result.data.total_expenses
        });
        console.log(`✅ Expense Claim created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Expense Claim', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Expense Claim creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Expense Claim', false, 0, error.message);
      console.log(`❌ Expense Claim creation error: ${error.message}`);
    }

    // Test expense claim with single expense
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const expenses = [
          { expense_date: this.getPastDate(2), expense_type: 'Office Supplies', amount: 75 }
        ];

        return await createExpenseClaim(
          employee.docName,
          employee.docName,
          expenses
        );
      }, 'CREATE Expense Claim Single Expense');

      if (result.ok && result.data?.name) {
        this.testData.expenseClaims.push({
          name: 'Test Expense Claim Single',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('CREATE Expense Claim Single Expense', true, duration, undefined, {
          documentName: result.data.name,
          totalClaimed: result.data.total_claimed_amount,
          expenseCount: result.data.total_expenses
        });
        console.log(`✅ Single Expense Claim created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Expense Claim Single Expense', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Expense Claim Single Expense', false, 0, error.message);
    }

    // Test expense claim validation errors
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await createExpenseClaim(
          '',
          employee.docName,
          []
        );
      }, 'CREATE Expense Claim Validation Error');

      if (!result.ok) {
        this.addTestResult('CREATE Expense Claim Validation Error', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Expense Claim validation error handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('CREATE Expense Claim Validation Error', false, duration, 'Expected validation error but creation succeeded');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Expense Claim Validation Error', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testOutstandingInvoiceOperations(): Promise<void> {
    console.log('\n📋 Testing Outstanding Invoice Operations...');

    // Test getting all outstanding invoices
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getOutstandingInvoices();
      }, 'GET Outstanding Invoices');

      if (result.ok && result.data?.outstanding_invoices) {
        this.addTestResult('GET Outstanding Invoices', true, duration, undefined, {
          invoiceCount: result.data.outstanding_invoices.length,
          totalOutstanding: result.data.outstanding_invoices.reduce((sum: number, inv: any) => sum + inv.outstanding_amount, 0)
        });
        console.log(`✅ Retrieved ${result.data.outstanding_invoices.length} outstanding invoices`);
      } else {
        this.addTestResult('GET Outstanding Invoices', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Outstanding invoices retrieval failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('GET Outstanding Invoices', false, 0, error.message);
      console.log(`❌ Outstanding invoices retrieval error: ${error.message}`);
    }

    // Test getting outstanding invoices by customer
    if (this.testData.customers.length > 0) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          return await getOutstandingInvoices(this.testData.customers[0].docName);
        }, 'GET Outstanding Invoices by Customer');

        if (result.ok && result.data?.outstanding_invoices) {
          this.addTestResult('GET Outstanding Invoices by Customer', true, duration, undefined, {
            customer: this.testData.customers[0].name,
            invoiceCount: result.data.outstanding_invoices.length
          });
          console.log(`✅ Retrieved ${result.data.outstanding_invoices.length} outstanding invoices for customer ${this.testData.customers[0].name}`);
        } else {
          this.addTestResult('GET Outstanding Invoices by Customer', false, duration, result.error?.message || 'Unknown error');
        }
      } catch (error: any) {
        this.addTestResult('GET Outstanding Invoices by Customer', false, 0, error.message);
      }
    }

    // Test getting outstanding invoices by company
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await getOutstandingInvoices(undefined, 'Test Company');
      }, 'GET Outstanding Invoices by Company');

      if (result.ok && result.data?.outstanding_invoices) {
        this.addTestResult('GET Outstanding Invoices by Company', true, duration, undefined, {
          company: 'Test Company',
          invoiceCount: result.data.outstanding_invoices.length
        });
        console.log(`✅ Retrieved ${result.data.outstanding_invoices.length} outstanding invoices for company Test Company`);
      } else {
        this.addTestResult('GET Outstanding Invoices by Company', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET Outstanding Invoices by Company', false, 0, error.message);
    }
  }

  private async testJournalEntryOperations(): Promise<void> {
    console.log('\n📝 Testing Journal Entry Operations...');

    // Test successful journal entry creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'Cash - TC', debit: 1000, credit: 0 },
          { account: 'Sales - TC', debit: 0, credit: 1000 }
        ];

        return await this.createJournalEntry(
          'Journal Entry',
          new Date().toISOString().split('T')[0],
          accounts
        );
      }, 'CREATE Journal Entry');

      if (result.ok && result.data?.name) {
        this.testData.journalEntries.push({
          name: 'Test Journal Entry',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('CREATE Journal Entry', true, duration, undefined, {
          documentName: result.data.name,
          voucherType: 'Journal Entry',
          accountCount: 2
        });
        console.log(`✅ Journal Entry created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Journal Entry', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Journal Entry creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Journal Entry', false, 0, error.message);
      console.log(`❌ Journal Entry creation error: ${error.message}`);
    }

    // Test journal entry with multiple accounts
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'Cash - TC', debit: 2000, credit: 0 },
          { account: 'Accounts Receivable - TC', debit: 500, credit: 0 },
          { account: 'Sales - TC', debit: 0, credit: 2500 }
        ];

        return await this.createJournalEntry(
          'Journal Entry',
          new Date().toISOString().split('T')[0],
          accounts
        );
      }, 'CREATE Journal Entry Multiple Accounts');

      if (result.ok && result.data?.name) {
        this.testData.journalEntries.push({
          name: 'Test Journal Entry Multi',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('CREATE Journal Entry Multiple Accounts', true, duration, undefined, {
          documentName: result.data.name,
          accountCount: 3,
          totalDebit: 2500,
          totalCredit: 2500
        });
        console.log(`✅ Multi-account Journal Entry created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Journal Entry Multiple Accounts', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Journal Entry Multiple Accounts', false, 0, error.message);
    }

    // Test unbalanced journal entry (should fail)
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'Cash - TC', debit: 1000, credit: 0 },
          { account: 'Sales - TC', debit: 0, credit: 500 } // Unbalanced
        ];

        return await this.createJournalEntry(
          'Journal Entry',
          new Date().toISOString().split('T')[0],
          accounts
        );
      }, 'CREATE Journal Entry Unbalanced');

      if (!result.ok) {
        this.addTestResult('CREATE Journal Entry Unbalanced', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Unbalanced journal entry correctly rejected: ${result.error?.message}`);
      } else {
        this.addTestResult('CREATE Journal Entry Unbalanced', false, duration, 'Expected error but journal entry succeeded');
      }
    } catch (error: any) {
      this.addTestResult('CREATE Journal Entry Unbalanced', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testGeneralLedgerOperations(): Promise<void> {
    console.log('\n📊 Testing General Ledger Operations...');

    // Test getting general ledger entries
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.getGeneralLedger();
      }, 'GET General Ledger');

      if (result.ok && result.data?.docs) {
        this.addTestResult('GET General Ledger', true, duration, undefined, {
          entryCount: result.data.docs.length,
          totalDebit: result.data.docs.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0),
          totalCredit: result.data.docs.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0)
        });
        console.log(`✅ Retrieved ${result.data.docs.length} general ledger entries`);
      } else {
        this.addTestResult('GET General Ledger', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ General ledger retrieval failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('GET General Ledger', false, 0, error.message);
      console.log(`❌ General ledger retrieval error: ${error.message}`);
    }

    // Test getting general ledger with filters
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.getGeneralLedger({
          account: 'Cash - TC'
        });
      }, 'GET General Ledger with Filters');

      if (result.ok && result.data?.docs) {
        this.addTestResult('GET General Ledger with Filters', true, duration, undefined, {
          entryCount: result.data.docs.length,
          accountFilter: 'Cash - TC'
        });
        console.log(`✅ Retrieved ${result.data.docs.length} general ledger entries for Cash account`);
      } else {
        this.addTestResult('GET General Ledger with Filters', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET General Ledger with Filters', false, 0, error.message);
    }

    // Test trial balance
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.getTrialBalance();
      }, 'GET Trial Balance');

      if (result.ok && result.data?.docs) {
        this.addTestResult('GET Trial Balance', true, duration, undefined, {
          accountCount: result.data.docs.length,
          totalDebit: result.data.docs.reduce((sum: number, account: any) => sum + (account.debit || 0), 0),
          totalCredit: result.data.docs.reduce((sum: number, account: any) => sum + (account.credit || 0), 0)
        });
        console.log(`✅ Retrieved trial balance with ${result.data.docs.length} accounts`);
      } else {
        this.addTestResult('GET Trial Balance', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET Trial Balance', false, 0, error.message);
    }
  }

  private async testAccountManagement(): Promise<void> {
    console.log('\n🏦 Testing Account Management...');

    // Test creating new account
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accountName = this.generateUniqueName('Test Account');
        return await this.createAccount(
          accountName,
          'Application of Funds (Assets) - Test Company',
          'Asset',
          'Test Company'
        );
      }, 'CREATE Account');

      if (result.ok && result.data?.name) {
        this.testData.accounts.push({
          name: 'Test Account',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('CREATE Account', true, duration, undefined, {
          documentName: result.data.name,
          accountType: 'Asset'
        });
        console.log(`✅ Account created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Account', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Account creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Account', false, 0, error.message);
      console.log(`❌ Account creation error: ${error.message}`);
    }

    // Test listing accounts
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Account', { is_group: 0 }, ['name', 'account_name', 'account_type'], 50);
      }, 'LIST Accounts');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Accounts', true, duration, undefined, {
          accountCount: result.data.docs.length,
          accountTypes: [...new Set(result.data.docs.map((acc: any) => acc.account_type))]
        });
        console.log(`✅ Retrieved ${result.data.docs.length} accounts`);
      } else {
        this.addTestResult('LIST Accounts', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Account listing failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('LIST Accounts', false, 0, error.message);
    }

    // Test updating account
    if (this.testData.accounts.length > 0) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          const account = this.testData.accounts[0];
          return await updateDocument(
            'Account',
            account.docName,
            { disabled: 0 }
          );
        }, 'UPDATE Account');

        if (result.ok && result.data?.name) {
          this.addTestResult('UPDATE Account', true, duration, undefined, {
            documentName: result.data.name,
            updatedField: 'disabled'
          });
          console.log(`✅ Account updated: ${result.data.name}`);
        } else {
          this.addTestResult('UPDATE Account', false, duration, result.error?.message || 'Unknown error');
        }
      } catch (error: any) {
        this.addTestResult('UPDATE Account', false, 0, error.message);
      }
    }
  }

  private async testFinancialReporting(): Promise<void> {
    console.log('\n📈 Testing Financial Reporting...');

    // Test balance sheet
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.getBalanceSheet();
      }, 'GET Balance Sheet');

      if (result.ok && result.data?.docs) {
        this.addTestResult('GET Balance Sheet', true, duration, undefined, {
          accountCount: result.data.docs.length,
          totalBalance: result.data.docs.reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
        });
        console.log(`✅ Retrieved balance sheet with ${result.data.docs.length} accounts`);
      } else {
        this.addTestResult('GET Balance Sheet', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET Balance Sheet', false, 0, error.message);
    }

    // Test profit and loss statement
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.getProfitLoss();
      }, 'GET Profit and Loss');

      if (result.ok && result.data?.docs) {
        this.addTestResult('GET Profit and Loss', true, duration, undefined, {
          accountCount: result.data.docs.length,
          totalAmount: result.data.docs.reduce((sum: number, account: any) => sum + (account.amount || 0), 0)
        });
        console.log(`✅ Retrieved profit and loss statement with ${result.data.docs.length} accounts`);
      } else {
        this.addTestResult('GET Profit and Loss', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET Profit and Loss', false, 0, error.message);
    }

    // Test aged accounts receivable report
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Aged Receivable', {}, ['customer', 'invoice', 'due_date', 'outstanding_amount'], 100);
      }, 'GET Aged Receivable');

      if (result.ok && result.data?.docs) {
        this.addTestResult('GET Aged Receivable', true, duration, undefined, {
          recordCount: result.data.docs.length,
          totalOutstanding: result.data.docs.reduce((sum: number, rec: any) => sum + (rec.outstanding_amount || 0), 0)
        });
        console.log(`✅ Retrieved aged receivable report with ${result.data.docs.length} records`);
      } else {
        this.addTestResult('GET Aged Receivable', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('GET Aged Receivable', false, 0, error.message);
    }
  }

  private async testBankReconciliation(): Promise<void> {
    console.log('\n🏦 Testing Bank Reconciliation...');

    // Test creating bank reconciliation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const transactions = [
          { date: this.getPastDate(10), description: 'Test Transaction 1', amount: 100 },
          { date: this.getPastDate(9), description: 'Test Transaction 2', amount: -50 }
        ];

        return await this.createBankReconciliation(
          'Cash - TC',
          this.getPastDate(30),
          this.getPastDate(1),
          transactions
        );
      }, 'CREATE Bank Reconciliation');

      if (result.ok && result.data?.name) {
        this.addTestResult('CREATE Bank Reconciliation', true, duration, undefined, {
          documentName: result.data.name,
          transactionCount: 2
        });
        console.log(`✅ Bank reconciliation created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Bank Reconciliation', false, duration, result.error?.message || 'Unknown error');
        console.log(`❌ Bank reconciliation creation failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Bank Reconciliation', false, 0, error.message);
    }

    // Test getting bank reconciliation entries
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Bank Reconciliation', {}, ['name', 'bank_account', 'from_date', 'to_date'], 50);
      }, 'LIST Bank Reconciliation');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Bank Reconciliation', true, duration, undefined, {
          reconciliationCount: result.data.docs.length
        });
        console.log(`✅ Retrieved ${result.data.docs.length} bank reconciliation entries`);
      } else {
        this.addTestResult('LIST Bank Reconciliation', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('LIST Bank Reconciliation', false, 0, error.message);
    }
  }

  private async testPeriodClosing(): Promise<void> {
    console.log('\n🔒 Testing Period Closing Procedures...');

    // Test period closing voucher creation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.closeAccountingPeriod(
          'Test Company',
          '2024'
        );
      }, 'CREATE Period Closing');

      if (result.ok && result.data?.name) {
        this.addTestResult('CREATE Period Closing', true, duration, undefined, {
          documentName: result.data.name,
          company: 'Test Company',
          fiscalYear: '2024'
        });
        console.log(`✅ Period closing voucher created: ${result.data.name}`);
      } else {
        this.addTestResult('CREATE Period Closing', false, duration, result.error?.message || 'Unknown error');
        console.log(`⚠️ Period closing failed (may be due to permissions): ${result.error?.message}`);
      }
    } catch (error: any) {
      this.addTestResult('CREATE Period Closing', false, 0, error.message);
      console.log(`⚠️ Period closing error (may be due to permissions): ${error.message}`);
    }

    // Test fiscal year management
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Fiscal Year', {}, ['name', 'year', 'company'], 20);
      }, 'LIST Fiscal Years');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Fiscal Years', true, duration, undefined, {
          fiscalYearCount: result.data.docs.length
        });
        console.log(`✅ Retrieved ${result.data.docs.length} fiscal years`);
      } else {
        this.addTestResult('LIST Fiscal Years', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('LIST Fiscal Years', false, 0, error.message);
    }
  }

  private async testDoubleEntryBookkeeping(): Promise<void> {
    console.log('\n⚖️ Testing Double-Entry Bookkeeping...');

    // Test complex journal entry with multiple accounts
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'Cash - TC', debit: 5000, credit: 0 },
          { account: 'Accounts Receivable - TC', debit: 3000, credit: 0 },
          { account: 'Sales - TC', debit: 0, credit: 7000 },
          { account: 'Cost of Goods Sold - TC', debit: 4000, credit: 0 },
          { account: 'Inventory - TC', debit: 0, credit: 4000 }
        ];

        return await this.createJournalEntry(
          'Journal Entry',
          new Date().toISOString().split('T')[0],
          accounts
        );
      }, 'COMPLEX Double-Entry Journal');

      if (result.ok && result.data?.name) {
        const totalDebit = accounts.reduce((sum, acc) => sum + acc.debit, 0);
        const totalCredit = accounts.reduce((sum, acc) => sum + acc.credit, 0);

        this.testData.journalEntries.push({
          name: 'Complex Double-Entry Journal',
          docName: result.data.name,
          data: result.data
        });

        this.addTestResult('COMPLEX Double-Entry Journal', true, duration, undefined, {
          documentName: result.data.name,
          accountCount: accounts.length,
          totalDebit,
          totalCredit,
          balanced: totalDebit === totalCredit
        });
        console.log(`✅ Complex double-entry journal created: ${result.data.name} (Debit: ${totalDebit}, Credit: ${totalCredit})`);
      } else {
        this.addTestResult('COMPLEX Double-Entry Journal', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('COMPLEX Double-Entry Journal', false, 0, error.message);
    }

    // Test inter-company transfers
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'Cash - TC', debit: 1000, credit: 0 },
          { account: 'Inter-company Receivable - TC', debit: 0, credit: 1000 }
        ];

        return await this.createJournalEntry(
          'Inter Company Journal Entry',
          new Date().toISOString().split('T')[0],
          accounts
        );
      }, 'INTER-COMPANY Transfer');

      if (result.ok && result.data?.name) {
        this.testData.journalEntries.push({
          name: 'Inter-Company Transfer',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('INTER-COMPANY Transfer', true, duration, undefined, {
          documentName: result.data.name,
          transferAmount: 1000
        });
        console.log(`✅ Inter-company transfer created: ${result.data.name}`);
      } else {
        this.addTestResult('INTER-COMPANY Transfer', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('INTER-COMPANY Transfer', false, 0, error.message);
    }
  }

  private async testPaymentProcessing(): Promise<void> {
    console.log('\n💳 Testing Payment Processing...');

    if (this.testData.customers.length === 0) {
      console.log('⚠️ No customers available, skipping payment processing tests');
      return;
    }

    // Test advance payment
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.createPaymentEntry(
          'Receive',
          'Customer',
          this.testData.customers[0].docName,
          'Cash - TC',
          'Customer Advances - TC',
          500
        );
      }, 'ADVANCE Payment');

      if (result.ok && result.data?.name) {
        this.testData.paymentEntries.push({
          name: 'Advance Payment',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('ADVANCE Payment', true, duration, undefined, {
          documentName: result.data.name,
          amount: 500,
          paymentType: 'Advance'
        });
        console.log(`✅ Advance payment created: ${result.data.name}`);
      } else {
        this.addTestResult('ADVANCE Payment', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('ADVANCE Payment', false, 0, error.message);
    }

    // Test supplier payment
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.createPaymentEntry(
          'Pay',
          'Supplier',
          'Test Supplier',
          'Cash - TC',
          'Accounts Payable - TC',
          750
        );
      }, 'SUPPLIER Payment');

      if (result.ok && result.data?.name) {
        this.testData.paymentEntries.push({
          name: 'Supplier Payment',
          docName: result.data.name,
          data: result.data
        });
        this.addTestResult('SUPPLIER Payment', true, duration, undefined, {
          documentName: result.data.name,
          amount: 750,
          paymentType: 'Supplier'
        });
        console.log(`✅ Supplier payment created: ${result.data.name}`);
      } else {
        this.addTestResult('SUPPLIER Payment', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('SUPPLIER Payment', false, 0, error.message);
    }

    // Test payment reconciliation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Payment Reconciliation', {}, ['name', 'payment_entry', 'status'], 50);
      }, 'LIST Payment Reconciliation');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Payment Reconciliation', true, duration, undefined, {
          reconciliationCount: result.data.docs.length
        });
        console.log(`✅ Retrieved ${result.data.docs.length} payment reconciliations`);
      } else {
        this.addTestResult('LIST Payment Reconciliation', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('LIST Payment Reconciliation', false, 0, error.message);
    }
  }

  private async testMultiCurrencyTransactions(): Promise<void> {
    console.log('\n💱 Testing Multi-Currency Transactions...');

    // Test currency exchange rate
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Currency Exchange', {}, ['from_currency', 'to_currency', 'exchange_rate'], 50);
      }, 'LIST Currency Exchange');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Currency Exchange', true, duration, undefined, {
          exchangeRateCount: result.data.docs.length,
          currencies: [...new Set(result.data.docs.map((ex: any) => `${ex.from_currency}/${ex.to_currency}`))]
        });
        console.log(`✅ Retrieved ${result.data.docs.length} currency exchange rates`);
      } else {
        this.addTestResult('LIST Currency Exchange', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('LIST Currency Exchange', false, 0, error.message);
    }

    // Test multi-currency sales invoice
    if (this.testData.customers.length > 0 && this.testData.items.length > 0) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          const customer = this.testData.customers[0];
          const item = this.testData.items[0];

          return await createDocument('Sales Invoice', {
            customer: customer.docName,
            due_date: this.getFutureDate(30),
            company: 'Test Company',
            currency: 'USD',
            conversion_rate: 1.2,
            items: [{ item_code: item.name, qty: 2, rate: 100 }],
            posting_date: new Date().toISOString().split('T')[0]
          });
        }, 'MULTI-CURRENCY Sales Invoice');

        if (result.ok && result.data?.name) {
          this.testData.salesInvoices.push({
            name: 'Multi-Currency Sales Invoice',
            docName: result.data.name,
            data: result.data,
            total: result.data.grand_total || 200
          });
          this.addTestResult('MULTI-CURRENCY Sales Invoice', true, duration, undefined, {
            documentName: result.data.name,
            currency: 'USD',
            conversionRate: 1.2
          });
          console.log(`✅ Multi-currency sales invoice created: ${result.data.name}`);
        } else {
          this.addTestResult('MULTI-CURRENCY Sales Invoice', false, duration, result.error?.message || 'Unknown error');
        }
      } catch (error: any) {
        this.addTestResult('MULTI-CURRENCY Sales Invoice', false, 0, error.message);
      }
    }
  }

  private async testTaxCalculations(): Promise<void> {
    console.log('\n🧾 Testing Tax Calculations...');

    // Test tax templates
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Sales Taxes and Charges Template', {}, ['name', 'tax_rate'], 50);
      }, 'LIST Tax Templates');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Tax Templates', true, duration, undefined, {
          templateCount: result.data.docs.length,
          taxRates: result.data.docs.map((template: any) => template.tax_rate)
        });
        console.log(`✅ Retrieved ${result.data.docs.length} tax templates`);
      } else {
        this.addTestResult('LIST Tax Templates', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('LIST Tax Templates', false, 0, error.message);
    }

    // Test sales invoice with taxes
    if (this.testData.customers.length > 0 && this.testData.items.length > 0) {
      try {
        const { result, duration } = await this.measurePerformance(async () => {
          const customer = this.testData.customers[0];
          const item = this.testData.items[0];

          return await createDocument('Sales Invoice', {
            customer: customer.docName,
            due_date: this.getFutureDate(30),
            company: 'Test Company',
            taxes_and_charges: 'VAT 10% - T',
            items: [{ item_code: item.name, qty: 1, rate: 1000 }],
            posting_date: new Date().toISOString().split('T')[0]
          });
        }, 'TAXABLE Sales Invoice');

        if (result.ok && result.data?.name) {
          this.testData.salesInvoices.push({
            name: 'Taxable Sales Invoice',
            docName: result.data.name,
            data: result.data,
            total: result.data.grand_total || 1100
          });
          this.addTestResult('TAXABLE Sales Invoice', true, duration, undefined, {
            documentName: result.data.name,
            subtotal: 1000,
            taxAmount: 100,
            total: result.data.grand_total
          });
          console.log(`✅ Taxable sales invoice created: ${result.data.name}`);
        } else {
          this.addTestResult('TAXABLE Sales Invoice', false, duration, result.error?.message || 'Unknown error');
        }
      } catch (error: any) {
        this.addTestResult('TAXABLE Sales Invoice', false, 0, error.message);
      }
    }

    // Test tax rules
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await listDocuments('Tax Rule', {}, ['name', 'description'], 50);
      }, 'LIST Tax Rules');

      if (result.ok && result.data?.docs) {
        this.addTestResult('LIST Tax Rules', true, duration, undefined, {
          ruleCount: result.data.docs.length
        });
        console.log(`✅ Retrieved ${result.data.docs.length} tax rules`);
      } else {
        this.addTestResult('LIST Tax Rules', false, duration, result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      this.addTestResult('LIST Tax Rules', false, 0, error.message);
    }
  }

  private async testFinanceErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Finance Error Handling...');

    // Test insufficient funds scenario
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.createPaymentEntry(
          'Pay',
          'Supplier',
          'Test Supplier',
          'Cash - TC',
          'Accounts Payable - TC',
          999999999 // Very large amount
        );
      }, 'INSUFFICIENT Funds');

      if (!result.ok) {
        this.addTestResult('INSUFFICIENT Funds', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Insufficient funds handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('INSUFFICIENT Funds', false, duration, 'Expected error but payment succeeded');
      }
    } catch (error: any) {
      this.addTestResult('INSUFFICIENT Funds', true, duration, undefined, {
        expectedError: error.message
      });
    }

    // Test duplicate payment
    if (this.testData.salesInvoices.length > 0) {
      try {
        const invoice = this.testData.salesInvoices[0];
        const { result, duration } = await this.measurePerformance(async () => {
          return await this.createPaymentEntry(
            'Receive',
            'Customer',
            invoice.data.customer,
            'Cash - TC',
            'Accounts Receivable - TC',
            invoice.total * 2, // Overpayment
            []
          );
        }, 'DUPLICATE Payment');

        if (!result.ok) {
          this.addTestResult('DUPLICATE Payment', true, duration, undefined, {
            expectedError: result.error?.message
          });
          console.log(`✅ Duplicate payment handled correctly: ${result.error?.message}`);
        } else {
          this.addTestResult('DUPLICATE Payment', false, duration, 'Expected error but payment succeeded');
        }
      } catch (error: any) {
        this.addTestResult('DUPLICATE Payment', true, duration, undefined, {
          expectedError: error.message
        });
      }
    }

    // Test invalid account reference
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'INVALID_ACCOUNT', debit: 100, credit: 0 },
          { account: 'Sales - TC', debit: 0, credit: 100 }
        ];

        return await this.createJournalEntry(
          'Journal Entry',
          new Date().toISOString().split('T')[0],
          accounts
        );
      }, 'INVALID Account Reference');

      if (!result.ok) {
        this.addTestResult('INVALID Account Reference', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Invalid account reference handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('INVALID Account Reference', false, duration, 'Expected error but journal entry succeeded');
      }
    } catch (error: any) {
      this.addTestResult('INVALID Account Reference', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testFinanceValidationErrors(): Promise<void> {
    console.log('\n✋ Testing Finance Validation Errors...');

    // Test past date validation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const accounts = [
          { account: 'Cash - TC', debit: 100, credit: 0 },
          { account: 'Sales - TC', debit: 0, credit: 100 }
        ];

        return await this.createJournalEntry(
          'Journal Entry',
          '1900-01-01', // Very old date
          accounts
        );
      }, 'PAST Date Validation');

      if (!result.ok) {
        this.addTestResult('PAST Date Validation', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Past date validation handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('PAST Date Validation', false, duration, 'Expected error but journal entry succeeded');
      }
    } catch (error: any) {
      this.addTestResult('PAST Date Validation', true, duration, undefined, {
        expectedError: error.message
      });
    }

    // Test negative amount validation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.createPaymentEntry(
          'Receive',
          'Customer',
          'Test Customer',
          'Cash - TC',
          'Accounts Receivable - TC',
          -100 // Negative amount
        );
      }, 'NEGATIVE Amount Validation');

      if (!result.ok) {
        this.addTestResult('NEGATIVE Amount Validation', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Negative amount validation handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('NEGATIVE Amount Validation', false, duration, 'Expected error but payment succeeded');
      }
    } catch (error: any) {
      this.addTestResult('NEGATIVE Amount Validation', true, duration, undefined, {
        expectedError: error.message
      });
    }

    // Test zero amount validation
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await this.createPaymentEntry(
          'Receive',
          'Customer',
          'Test Customer',
          'Cash - TC',
          'Accounts Receivable - TC',
          0 // Zero amount
        );
      }, 'ZERO Amount Validation');

      if (!result.ok) {
        this.addTestResult('ZERO Amount Validation', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Zero amount validation handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('ZERO Amount Validation', false, duration, 'Expected error but payment succeeded');
      }
    } catch (error: any) {
      this.addTestResult('ZERO Amount Validation', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testFinancePermissionErrors(): Promise<void> {
    console.log('\n🔒 Testing Finance Permission Errors...');

    // Test creating restricted document
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await createDocument('Journal Entry', {
          voucher_type: 'Period Closing Voucher', // Restricted type
          posting_date: new Date().toISOString().split('T')[0],
          accounts: [],
          company: 'Test Company'
        });
      }, 'RESTRICTED Document Creation');

      if (!result.ok) {
        this.addTestResult('RESTRICTED Document Creation', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Restricted document creation handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('RESTRICTED Document Creation', false, duration, 'Expected error but creation succeeded');
      }
    } catch (error: any) {
      this.addTestResult('RESTRICTED Document Creation', true, duration, undefined, {
        expectedError: error.message
      });
    }

    // Test updating closed period
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await updateDocument(
          'Journal Entry',
          'TEST-JOURNAL-ENTRY',
          { posting_date: '2020-01-01' } // Closed period
        );
      }, 'CLOSED Period Update');

      if (!result.ok) {
        this.addTestResult('CLOSED Period Update', true, duration, undefined, {
          expectedError: result.error?.message
        });
        console.log(`✅ Closed period update handled correctly: ${result.error?.message}`);
      } else {
        this.addTestResult('CLOSED Period Update', false, duration, 'Expected error but update succeeded');
      }
    } catch (error: any) {
      this.addTestResult('CLOSED Period Update', true, duration, undefined, {
        expectedError: error.message
      });
    }
  }

  private async testFinancePerformance(): Promise<void> {
    console.log('\n⚡ Testing Finance Performance...');

    // Test batch journal entries
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const operations = [];
        const operationCount = 10;

        for (let i = 0; i < operationCount; i++) {
          operations.push(this.createJournalEntry(
            'Journal Entry',
            new Date().toISOString().split('T')[0],
            [
              { account: 'Cash - TC', debit: 100, credit: 0 },
              { account: 'Sales - TC', debit: 0, credit: 100 }
            ]
          ));
        }

        const results = await Promise.all(operations);
        const successfulCount = results.filter(r => r.ok).length;

        return { successfulCount, operationCount, results };
      }, 'BATCH Journal Entries');

      if (result.successfulCount > 0) {
        this.addTestResult('BATCH Journal Entries', true, duration, undefined, {
          operationCount: result.operationCount,
          successfulCount: result.successfulCount,
          successRate: (result.successfulCount / result.operationCount) * 100
        });
        console.log(`✅ Batch journal entries: ${result.successfulCount}/${result.operationCount} successful`);
      } else {
        this.addTestResult('BATCH Journal Entries', false, duration, 'No journal entries created successfully');
      }
    } catch (error: any) {
      this.addTestResult('BATCH Journal Entries', false, 0, error.message);
    }

    // Test financial reporting performance
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const operations = [
          this.getTrialBalance(),
          this.getBalanceSheet(),
          this.getProfitLoss(),
          this.getGeneralLedger()
        ];

        const results = await Promise.all(operations);
        const successfulCount = results.filter(r => r.ok).length;

        return { successfulCount, operationCount: operations.length, results };
      }, 'FINANCIAL Reporting Performance');

      if (result.successfulCount > 0) {
        this.addTestResult('FINANCIAL Reporting Performance', true, duration, undefined, {
          operationCount: result.operationCount,
          successfulCount: result.successfulCount,
          averageTimePerReport: duration / result.operationCount
        });
        console.log(`✅ Financial reporting: ${result.successfulCount}/${result.operationCount} reports generated`);
      } else {
        this.addTestResult('FINANCIAL Reporting Performance', false, duration, 'No financial reports generated');
      }
    } catch (error: any) {
      this.addTestResult('FINANCIAL Reporting Performance', false, 0, error.message);
    }

    // Test concurrent payment processing
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const operations = [];
        const operationCount = 5;

        for (let i = 0; i < operationCount; i++) {
          operations.push(this.createPaymentEntry(
            'Receive',
            'Customer',
            'Test Customer',
            'Cash - TC',
            'Accounts Receivable - TC',
            100 + i
          ));
        }

        const results = await Promise.all(operations);
        const successfulCount = results.filter(r => r.ok).length;

        return { successfulCount, operationCount, results };
      }, 'CONCURRENT Payment Processing');

      if (result.successfulCount > 0) {
        this.addTestResult('CONCURRENT Payment Processing', true, duration, undefined, {
          operationCount: result.operationCount,
          successfulCount: result.successfulCount,
          successRate: (result.successfulCount / result.operationCount) * 100
        });
        console.log(`✅ Concurrent payment processing: ${result.successfulCount}/${result.operationCount} successful`);
      } else {
        this.addTestResult('CONCURRENT Payment Processing', false, duration, 'No payments processed successfully');
      }
    } catch (error: any) {
      this.addTestResult('CONCURRENT Payment Processing', false, 0, error.message);
    }
  }

  private async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');

    let cleanupCount = 0;
    let cleanupErrors = 0;

    // Clean up payment entries
    for (const entry of this.testData.paymentEntries) {
      try {
        const result = await deleteDocument('Payment Entry', entry.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup payment entry ${entry.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up payment entry ${entry.docName}: ${error.message}`);
      }
    }

    // Clean up sales invoices
    for (const invoice of this.testData.salesInvoices) {
      try {
        const result = await deleteDocument('Sales Invoice', invoice.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup sales invoice ${invoice.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up sales invoice ${invoice.docName}: ${error.message}`);
      }
    }

    // Clean up expense claims
    for (const claim of this.testData.expenseClaims) {
      try {
        const result = await deleteDocument('Expense Claim', claim.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup expense claim ${claim.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up expense claim ${claim.docName}: ${error.message}`);
      }
    }

    // Clean up journal entries
    for (const entry of this.testData.journalEntries) {
      try {
        const result = await deleteDocument('Journal Entry', entry.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup journal entry ${entry.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up journal entry ${entry.docName}: ${error.message}`);
      }
    }

    // Clean up accounts
    for (const account of this.testData.accounts) {
      try {
        const result = await deleteDocument('Account', account.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup account ${account.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up account ${account.docName}: ${error.message}`);
      }
    }

    // Clean up items
    for (const item of this.testData.items) {
      try {
        const result = await deleteDocument('Item', item.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup item ${item.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up item ${item.docName}: ${error.message}`);
      }
    }

    // Clean up customers
    for (const customer of this.testData.customers) {
      try {
        const result = await deleteDocument('Customer', customer.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup customer ${customer.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up customer ${customer.docName}: ${error.message}`);
      }
    }

    // Clean up employees
    for (const employee of this.testData.employees) {
      try {
        const result = await deleteDocument('Employee', employee.docName);
        if (result.ok) {
          cleanupCount++;
        } else {
          cleanupErrors++;
          console.log(`⚠️ Failed to cleanup employee ${employee.docName}: ${result.error?.message}`);
        }
      } catch (error: any) {
        cleanupErrors++;
        console.log(`⚠️ Error cleaning up employee ${employee.docName}: ${error.message}`);
      }
    }

    this.addTestResult('Cleanup Test Data', cleanupErrors === 0, 0,
      cleanupErrors > 0 ? `${cleanupErrors} cleanup errors occurred` : undefined,
      { cleaned: cleanupCount, errors: cleanupErrors }
    );

    console.log(`✅ Cleanup completed: ${cleanupCount} documents cleaned, ${cleanupErrors} errors`);

    // Clear test data
    this.testData = {
      customers: [],
      items: [],
      employees: [],
      salesInvoices: [],
      paymentEntries: [],
      expenseClaims: [],
      journalEntries: [],
      accounts: []
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
🧪 Finance Domain Integration Test Report
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

📋 Test Categories
------------------
`;

    // Group tests by category
    const categories = this.testSuite.results.reduce((acc, result) => {
      const category = result.testName.split(' ')[0];
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    Object.entries(categories).forEach(([category, tests]) => {
      const passed = tests.filter(t => t.passed).length;
      const failed = tests.length - passed;
      const successRate = tests.length > 0 ? (passed / tests.length) * 100 : 0;
      const avgTime = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;

      report += `${category}: ${passed}/${tests.length} (${successRate.toFixed(2)}% success, ${avgTime.toFixed(2)}ms avg)\n`;
    });

    report += `
📝 Detailed Results
-----------------
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

      report += `${operation}: ${avgDuration.toFixed(2)}ms avg (min: ${minDuration}ms, max: ${maxDuration}ms, ${successRate.toFixed(2)}% success)\n`;
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
🔍 Finance-Specific Issues and Limitations
-----------------------------------------
`;

    // Analyze finance-specific issues
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

    report += `
📈 Business Logic Validation
---------------------------
`;

    // Business logic analysis
    const successfulOperations = this.testSuite.results.filter(r => r.passed);

    // Sales Invoice metrics
    const salesInvoices = successfulOperations.filter(r => r.testName.includes('Sales Invoice'));
    if (salesInvoices.length > 0) {
      const avgAmount = salesInvoices.reduce((sum, r) => sum + (r.details?.total || 0), 0) / salesInvoices.length;
      report += `Sales Invoice Creation: ${salesInvoices.length} successful, avg amount: ${avgAmount.toFixed(2)}\n`;
    }

    // Payment Entry metrics
    const payments = successfulOperations.filter(r => r.testName.includes('Payment'));
    if (payments.length > 0) {
      const avgAmount = payments.reduce((sum, r) => sum + (r.details?.amount || 0), 0) / payments.length;
      report += `Payment Processing: ${payments.length} successful, avg amount: ${avgAmount.toFixed(2)}\n`;
    }

    // Journal Entry metrics
    const journalEntries = successfulOperations.filter(r => r.testName.includes('Journal'));
    if (journalEntries.length > 0) {
      report += `Journal Entry Creation: ${journalEntries.length} successful\n`;
    }

    // Financial reporting metrics
    const reports = successfulOperations.filter(r => r.testName.includes('GET') || r.testName.includes('LIST'));
    if (reports.length > 0) {
      report += `Financial Reporting: ${reports.length} reports generated successfully\n`;
    }

    report += `
🛡️ Accounting Integrity
-----------------------
`;

    // Accounting integrity checks
    const balancedEntries = successfulOperations.filter(r =>
      r.testName.includes('Double-Entry') && r.details?.balanced
    );

    const taxCalculations = successfulOperations.filter(r =>
      r.testName.includes('TAX') || r.testName.includes('Tax')
    );

    const multiCurrency = successfulOperations.filter(r =>
      r.testName.includes('MULTI-CURRENCY') || r.testName.includes('Currency')
    );

    report += `Double-Entry Balancing: ${balancedEntries.length} entries validated\n`;
    report += `Tax Calculations: ${taxCalculations.length} calculations processed\n`;
    report += `Multi-Currency Support: ${multiCurrency.length} transactions processed\n`;

    report += `
🎯 Recommendations
------------------
`;

    // Generate recommendations based on test results
    if (summary.successRate < 95) {
      report += `- Investigate failed tests to improve success rate\n`;
    }

    if (summary.averageResponseTime > 1000) {
      report += `- Consider optimizing slow operations for better performance\n`;
    }

    const slowOperations = Object.entries(metricsByOperation)
      .filter(([_, metrics]) => metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length > 500)
      .map(([op, _]) => op);

    if (slowOperations.length > 0) {
      report += `- Focus on optimizing: ${slowOperations.join(', ')}\n`;
    }

    const frequentErrors = Object.entries(errorCounts)
      .filter(([_, count]) => count > 2)
      .map(([error, _]) => error);

    if (frequentErrors.length > 0) {
      report += `- Address recurring errors: ${frequentErrors.join(', ')}\n`;
    }

    if (taxCalculations.length === 0) {
      report += `- Implement comprehensive tax calculation testing\n`;
    }

    if (multiCurrency.length === 0) {
      report += `- Enhance multi-currency transaction support testing\n`;
    }

    report += `
⏱️ Performance Optimization Suggestions
-----------------------------------
`;

    // Performance recommendations
    if (summary.averageResponseTime > 500) {
      report += `- Implement caching for frequently accessed financial data\n`;
      report += `- Optimize database queries for better performance\n`;
    }

    const batchOperations = successfulOperations.filter(r => r.testName.includes('BATCH') || r.testName.includes('CONCURRENT'));
    if (batchOperations.length === 0) {
      report += `- Consider implementing batch processing for high-volume operations\n`;
    }

    report += `
✅ Test Environment Configuration
-------------------------------
ERPNext URL: ${process.env.ERPNEXT_URL || 'https://demo.ravanos.com'}
Test User: [Connected via API Key]
Test Company: Test Company
Test Currency: USD/Local Currency
`;

    return report;
  }
}

// Helper methods
FinanceIntegrationTests.prototype.getFutureDate = function(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

FinanceIntegrationTests.prototype.getPastDate = function(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// Export the test class and run tests if this file is executed directly
if (require.main === module) {
  async function runTests() {
    const tester = new FinanceIntegrationTests();
    await tester.initialize();
    const testSuite = await tester.runAllTests();
    console.log(tester.generateReport());
  }

  runTests().catch(console.error);
}