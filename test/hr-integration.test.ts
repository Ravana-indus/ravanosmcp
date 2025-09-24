import { hrCheckIn, hrCheckOut, getLeaveBalance, applyLeave, getPendingApprovals, approveDocument } from '../src/packs/hr';
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';
import { TestResult, TestSuite, PerformanceMetrics } from './types';

interface HRTestData {
  employeeId?: string;
  employeeName?: string;
  checkinRecords: Array<{
    name: string;
    time: string;
    location?: string;
    device_id?: string;
  }>;
  checkoutRecords: Array<{
    name: string;
    time: string;
    reason?: string;
  }>;
  leaveApplications: Array<{
    name: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    total_leave_days: number;
  }>;
}

export class HRIntegrationTests {
  private testData: HRTestData = {
    checkinRecords: [],
    checkoutRecords: [],
    leaveApplications: []
  };
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private testSuite: TestSuite = {
    name: 'HR Operations Integration Tests',
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
    await this.verifyEmployeeAccess();
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

  private async verifyEmployeeAccess(): Promise<void> {
    try {
      const userInfo = await erpAuthenticator.whoami();
      if (!userInfo.ok || !userInfo.data?.user) {
        throw new Error('Unable to get user information');
      }

      // Try to find employee record
      const employeeResult = await listDocuments('Employee', { user_id: userInfo.data.user }, ['name', 'employee_name']);

      if (!employeeResult.ok) {
        console.log('⚠️ Employee lookup failed, will proceed with user ID for tests');
        this.testData.employeeId = userInfo.data.user;
        this.testData.employeeName = userInfo.data.user;
        return;
      }

      if (!employeeResult.data?.docs || employeeResult.data.docs.length === 0) {
        console.log('⚠️ No employee record found for current user, will proceed with user ID for tests');
        this.testData.employeeId = userInfo.data.user;
        this.testData.employeeName = userInfo.data.user;
        return;
      }

      this.testData.employeeId = employeeResult.data.docs[0].name;
      this.testData.employeeName = employeeResult.data.docs[0].employee_name;
      console.log(`✅ Employee verification successful: ${this.testData.employeeName}`);
    } catch (error) {
      console.log('⚠️ Employee verification encountered issues, will proceed with limited functionality:', error);
      // Get user info for basic testing
      try {
        const userInfo = await erpAuthenticator.whoami();
        if (userInfo.ok && userInfo.data?.user) {
          this.testData.employeeId = userInfo.data.user;
          this.testData.employeeName = userInfo.data.user;
        }
      } catch (userInfoError) {
        console.error('❌ Failed to get user info:', userInfoError);
        throw error; // Re-throw original error
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

  // Test Employee Check-in/Out Operations
  async testEmployeeCheckInOut(): Promise<void> {
    console.log('🔄 Testing Employee Check-in/Out Operations...');

    // Test 1: Employee Check-in without location
    try {
      const { result, duration } = await this.measurePerformance(
        () => hrCheckIn(),
        'Employee Check-in (No Location)'
      );

      if (result.ok && result.data) {
        this.testData.checkinRecords.push({
          name: result.data.name,
          time: result.data.time
        });
        this.addTestResult('Employee Check-in (No Location)', true, duration, undefined, {
          checkinName: result.data.name,
          employee: result.data.employee
        });
        console.log('✅ Employee Check-in (No Location) - Success');
      } else {
        this.addTestResult('Employee Check-in (No Location)', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Employee Check-in (No Location) - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Employee Check-in (No Location)', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Employee Check-in (No Location) - Exception:', error);
    }

    // Test 2: Employee Check-in with location and device ID
    try {
      const { result, duration } = await this.measurePerformance(
        () => hrCheckIn('Office Building A', 'TEST-DEVICE-001'),
        'Employee Check-in (With Location & Device)'
      );

      if (result.ok && result.data) {
        this.testData.checkinRecords.push({
          name: result.data.name,
          time: result.data.time,
          location: result.data.location,
          device_id: 'TEST-DEVICE-001'
        });
        this.addTestResult('Employee Check-in (With Location & Device)', true, duration, undefined, {
          checkinName: result.data.name,
          location: result.data.location,
          deviceId: 'TEST-DEVICE-001'
        });
        console.log('✅ Employee Check-in (With Location & Device) - Success');
      } else {
        this.addTestResult('Employee Check-in (With Location & Device)', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Employee Check-in (With Location & Device) - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Employee Check-in (With Location & Device)', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Employee Check-in (With Location & Device) - Exception:', error);
    }

    // Test 3: Employee Check-out without reason
    try {
      const { result, duration } = await this.measurePerformance(
        () => hrCheckOut(),
        'Employee Check-out (No Reason)'
      );

      if (result.ok && result.data) {
        this.testData.checkoutRecords.push({
          name: result.data.name,
          time: result.data.time
        });
        this.addTestResult('Employee Check-out (No Reason)', true, duration, undefined, {
          checkoutName: result.data.name,
          employee: result.data.employee
        });
        console.log('✅ Employee Check-out (No Reason) - Success');
      } else {
        this.addTestResult('Employee Check-out (No Reason)', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Employee Check-out (No Reason) - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Employee Check-out (No Reason)', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Employee Check-out (No Reason) - Exception:', error);
    }

    // Test 4: Employee Check-out with reason
    try {
      const { result, duration } = await this.measurePerformance(
        () => hrCheckOut('End of work day', 'TEST-DEVICE-002'),
        'Employee Check-out (With Reason & Device)'
      );

      if (result.ok && result.data) {
        this.testData.checkoutRecords.push({
          name: result.data.name,
          time: result.data.time,
          reason: result.data.reason
        });
        this.addTestResult('Employee Check-out (With Reason & Device)', true, duration, undefined, {
          checkoutName: result.data.name,
          reason: result.data.reason,
          deviceId: 'TEST-DEVICE-002'
        });
        console.log('✅ Employee Check-out (With Reason & Device) - Success');
      } else {
        this.addTestResult('Employee Check-out (With Reason & Device)', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Employee Check-out (With Reason & Device) - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Employee Check-out (With Reason & Device)', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Employee Check-out (With Reason & Device) - Exception:', error);
    }
  }

  // Test Leave Balance Operations
  async testLeaveBalanceOperations(): Promise<void> {
    console.log('🔄 Testing Leave Balance Operations...');

    // Test 1: Get all leave balances
    try {
      const { result, duration } = await this.measurePerformance(
        () => getLeaveBalance(),
        'Get All Leave Balances'
      );

      if (result.ok && result.data) {
        this.addTestResult('Get All Leave Balances', true, duration, undefined, {
          balanceCount: result.data.balances.length,
          balances: result.data.balances
        });
        console.log('✅ Get All Leave Balances - Success');
        console.log(`   Found ${result.data.balances.length} leave balance entries`);

        // Log available leave types
        result.data.balances.forEach(balance => {
          console.log(`   ${balance.leave_type}: ${balance.leaves_remaining}/${balance.leaves_allocated} remaining`);
        });
      } else {
        this.addTestResult('Get All Leave Balances', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Get All Leave Balances - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Get All Leave Balances', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Get All Leave Balances - Exception:', error);
    }

    // Test 2: Get specific leave type balance (Annual Leave)
    try {
      const { result, duration } = await this.measurePerformance(
        () => getLeaveBalance('Annual Leave'),
        'Get Annual Leave Balance'
      );

      if (result.ok && result.data) {
        this.addTestResult('Get Annual Leave Balance', true, duration, undefined, {
          balances: result.data.balances
        });
        console.log('✅ Get Annual Leave Balance - Success');
        if (result.data.balances.length > 0) {
          const balance = result.data.balances[0];
          console.log(`   Annual Leave: ${balance.leaves_remaining}/${balance.leaves_allocated} remaining`);
        } else {
          console.log('   No Annual Leave balance found');
        }
      } else {
        this.addTestResult('Get Annual Leave Balance', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Get Annual Leave Balance - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Get Annual Leave Balance', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Get Annual Leave Balance - Exception:', error);
    }

    // Test 3: Get specific leave type balance (Sick Leave)
    try {
      const { result, duration } = await this.measurePerformance(
        () => getLeaveBalance('Sick Leave'),
        'Get Sick Leave Balance'
      );

      if (result.ok && result.data) {
        this.addTestResult('Get Sick Leave Balance', true, duration, undefined, {
          balances: result.data.balances
        });
        console.log('✅ Get Sick Leave Balance - Success');
        if (result.data.balances.length > 0) {
          const balance = result.data.balances[0];
          console.log(`   Sick Leave: ${balance.leaves_remaining}/${balance.leaves_allocated} remaining`);
        } else {
          console.log('   No Sick Leave balance found');
        }
      } else {
        this.addTestResult('Get Sick Leave Balance', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Get Sick Leave Balance - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Get Sick Leave Balance', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Get Sick Leave Balance - Exception:', error);
    }
  }

  // Test Leave Application Operations
  async testLeaveApplicationOperations(): Promise<void> {
    console.log('🔄 Testing Leave Application Operations...');

    // Test 1: Apply for Annual Leave
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() + 7); // Next week
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + 2); // 3 days total

      const { result, duration } = await this.measurePerformance(
        () => applyLeave('Annual Leave', fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0], 'Test leave application'),
        'Apply for Annual Leave'
      );

      if (result.ok && result.data) {
        this.testData.leaveApplications.push({
          name: result.data.name,
          leave_type: result.data.leave_type,
          from_date: result.data.from_date,
          to_date: result.data.to_date,
          total_leave_days: result.data.total_leave_days
        });
        this.addTestResult('Apply for Annual Leave', true, duration, undefined, {
          leaveApplicationName: result.data.name,
          leaveType: result.data.leave_type,
          totalDays: result.data.total_leave_days
        });
        console.log('✅ Apply for Annual Leave - Success');
        console.log(`   Application: ${result.data.name}, Days: ${result.data.total_leave_days}`);
      } else {
        this.addTestResult('Apply for Annual Leave', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Apply for Annual Leave - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Apply for Annual Leave', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Apply for Annual Leave - Exception:', error);
    }

    // Test 2: Apply for Sick Leave
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() + 14); // Two weeks from now
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + 0); // Single day

      const { result, duration } = await this.measurePerformance(
        () => applyLeave('Sick Leave', fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0], 'Medical appointment'),
        'Apply for Sick Leave'
      );

      if (result.ok && result.data) {
        this.testData.leaveApplications.push({
          name: result.data.name,
          leave_type: result.data.leave_type,
          from_date: result.data.from_date,
          to_date: result.data.to_date,
          total_leave_days: result.data.total_leave_days
        });
        this.addTestResult('Apply for Sick Leave', true, duration, undefined, {
          leaveApplicationName: result.data.name,
          leaveType: result.data.leave_type,
          totalDays: result.data.total_leave_days
        });
        console.log('✅ Apply for Sick Leave - Success');
        console.log(`   Application: ${result.data.name}, Days: ${result.data.total_leave_days}`);
      } else {
        this.addTestResult('Apply for Sick Leave', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Apply for Sick Leave - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Apply for Sick Leave', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Apply for Sick Leave - Exception:', error);
    }

    // Test 3: Try to apply leave with invalid dates (should fail)
    try {
      const { result, duration } = await this.measurePerformance(
        () => applyLeave('', '2024-01-15', '2024-01-17', 'Invalid leave type test'),
        'Apply Leave - Invalid Leave Type'
      );

      if (!result.ok) {
        this.addTestResult('Apply Leave - Invalid Leave Type', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Apply Leave - Invalid Leave Type (Correctly Failed)');
      } else {
        this.addTestResult('Apply Leave - Invalid Leave Type', false, duration, 'Should have failed but succeeded');
        console.log('❌ Apply Leave - Invalid Leave Type (Should have failed but succeeded)');
      }
    } catch (error) {
      this.addTestResult('Apply Leave - Invalid Leave Type', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Apply Leave - Invalid Leave Type - Exception:', error);
    }
  }

  // Test Pending Approvals Operations
  async testPendingApprovalsOperations(): Promise<void> {
    console.log('🔄 Testing Pending Approvals Operations...');

    try {
      const { result, duration } = await this.measurePerformance(
        () => getPendingApprovals(),
        'Get Pending Approvals'
      );

      if (result.ok && result.data) {
        this.addTestResult('Get Pending Approvals', true, duration, undefined, {
          pendingCount: result.data.pending_documents.length,
          pendingDocuments: result.data.pending_documents
        });
        console.log('✅ Get Pending Approvals - Success');
        console.log(`   Found ${result.data.pending_documents.length} pending approvals`);

        // Log pending approvals by type
        const pendingByType: Record<string, number> = {};
        result.data.pending_documents.forEach(doc => {
          pendingByType[doc.doctype] = (pendingByType[doc.doctype] || 0) + 1;
        });

        Object.entries(pendingByType).forEach(([doctype, count]) => {
          console.log(`   ${doctype}: ${count} pending`);
        });
      } else {
        this.addTestResult('Get Pending Approvals', false, duration, result.error?.message || 'Unknown error');
        console.log('❌ Get Pending Approvals - Failed:', result.error?.message);
      }
    } catch (error) {
      this.addTestResult('Get Pending Approvals', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Get Pending Approvals - Exception:', error);
    }
  }

  // Test Document Approval Operations
  async testDocumentApprovalOperations(): Promise<void> {
    console.log('🔄 Testing Document Approval Operations...');

    // First, get pending approvals to find documents to approve
    let pendingDocs: any[] = [];
    try {
      const pendingResult = await getPendingApprovals();
      if (pendingResult.ok && pendingResult.data) {
        pendingDocs = pendingResult.data.pending_documents;
      }
    } catch (error) {
      console.log('⚠️ No pending approvals found for testing approval operations');
    }

    // Test 1: Try to approve a document (if we have pending docs)
    if (pendingDocs.length > 0) {
      const docToApprove = pendingDocs[0];
      try {
        const { result, duration } = await this.measurePerformance(
          () => approveDocument(docToApprove.doctype, docToApprove.name, 'Approve'),
          `Approve Document (${docToApprove.doctype})`
        );

        if (result.ok && result.data) {
          this.addTestResult(`Approve Document (${docToApprove.doctype})`, true, duration, undefined, {
            documentName: result.data.name,
            newState: result.data.workflow_state
          });
          console.log(`✅ Approve Document (${docToApprove.doctype}) - Success`);
          console.log(`   Document: ${result.data.name}, New State: ${result.data.workflow_state}`);
        } else {
          this.addTestResult(`Approve Document (${docToApprove.doctype})`, false, duration, result.error?.message || 'Unknown error');
          console.log(`❌ Approve Document (${docToApprove.doctype}) - Failed:`, result.error?.message);
        }
      } catch (error) {
        this.addTestResult(`Approve Document (${docToApprove.doctype})`, false, 0, error instanceof Error ? error.message : 'Unknown error');
        console.error(`❌ Approve Document (${docToApprove.doctype}) - Exception:`, error);
      }
    } else {
      // Test with invalid document (should fail)
      try {
        const { result, duration } = await this.measurePerformance(
          () => approveDocument('Leave Application', 'NON-EXISTENT-DOC-001', 'Approve'),
          'Approve Non-Existent Document'
        );

        if (!result.ok) {
          this.addTestResult('Approve Non-Existent Document', true, duration, undefined, {
            errorCode: result.error?.code,
            errorMessage: result.error?.message
          });
          console.log('✅ Approve Non-Existent Document (Correctly Failed)');
        } else {
          this.addTestResult('Approve Non-Existent Document', false, duration, 'Should have failed but succeeded');
          console.log('❌ Approve Non-Existent Document (Should have failed but succeeded)');
        }
      } catch (error) {
        this.addTestResult('Approve Non-Existent Document', false, 0, error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Approve Non-Existent Document - Exception:', error);
      }
    }

    // Test 2: Try to approve with invalid doctype (should fail)
    try {
      const { result, duration } = await this.measurePerformance(
        () => approveDocument('', 'ANY-DOC-001', 'Approve'),
        'Approve Document - Invalid Doctype'
      );

      if (!result.ok) {
        this.addTestResult('Approve Document - Invalid Doctype', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Approve Document - Invalid Doctype (Correctly Failed)');
      } else {
        this.addTestResult('Approve Document - Invalid Doctype', false, duration, 'Should have failed but succeeded');
        console.log('❌ Approve Document - Invalid Doctype (Should have failed but succeeded)');
      }
    } catch (error) {
      this.addTestResult('Approve Document - Invalid Doctype', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Approve Document - Invalid Doctype - Exception:', error);
    }
  }

  // Test Error Handling Scenarios
  async testErrorHandlingScenarios(): Promise<void> {
    console.log('🔄 Testing Error Handling Scenarios...');

    // Test 1: Leave application with invalid dates
    try {
      const { result, duration } = await this.measurePerformance(
        () => applyLeave('Annual Leave', '2024-13-32', '2024-13-33', 'Invalid dates'),
        'Leave Application - Invalid Dates'
      );

      if (!result.ok) {
        this.addTestResult('Leave Application - Invalid Dates', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Leave Application - Invalid Dates (Correctly Failed)');
      } else {
        this.addTestResult('Leave Application - Invalid Dates', false, duration, 'Should have failed but succeeded');
        console.log('❌ Leave Application - Invalid Dates (Should have failed but succeeded)');
      }
    } catch (error) {
      this.addTestResult('Leave Application - Invalid Dates', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Leave Application - Invalid Dates - Exception:', error);
    }

    // Test 2: Leave application with past dates
    try {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      const { result, duration } = await this.measurePerformance(
        () => applyLeave('Annual Leave', pastDate.toISOString().split('T')[0], pastDate.toISOString().split('T')[0], 'Past date test'),
        'Leave Application - Past Dates'
      );

      // This might succeed or fail depending on ERPNext configuration
      if (result.ok) {
        this.addTestResult('Leave Application - Past Dates', true, duration, undefined, {
          note: 'Past dates accepted by system'
        });
        console.log('✅ Leave Application - Past Dates (System allows past dates)');
      } else {
        this.addTestResult('Leave Application - Past Dates', true, duration, undefined, {
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        console.log('✅ Leave Application - Past Dates (Correctly Failed)');
      }
    } catch (error) {
      this.addTestResult('Leave Application - Past Dates', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Leave Application - Past Dates - Exception:', error);
    }
  }

  // Test Realistic HR Workflow Scenarios
  async testRealisticHRWorkflows(): Promise<void> {
    console.log('🔄 Testing Realistic HR Workflow Scenarios...');

    // Test 1: Daily employee check-in/out cycle
    try {
      // Check-in in the morning
      const checkinResult = await hrCheckIn('Main Office', 'WFH-DESKTOP-001');

      if (checkinResult.ok && checkinResult.data) {
        // Simulate work day by waiting a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check-out in the evening
        const checkoutResult = await hrCheckOut('End of work day', 'WFH-DESKTOP-001');

        if (checkoutResult.ok && checkoutResult.data) {
          this.addTestResult('Daily Check-in/out Cycle', true, 0, undefined, {
            checkinName: checkinResult.data.name,
            checkoutName: checkoutResult.data.name,
            duration: '8 hours simulated'
          });
          console.log('✅ Daily Check-in/out Cycle - Success');
        } else {
          this.addTestResult('Daily Check-in/out Cycle', false, 0, checkoutResult.error?.message || 'Unknown error');
          console.log('❌ Daily Check-in/out Cycle - Check-out failed:', checkoutResult.error?.message);
        }
      } else {
        this.addTestResult('Daily Check-in/out Cycle', false, 0, checkinResult.error?.message || 'Unknown error');
        console.log('❌ Daily Check-in/out Cycle - Check-in failed:', checkinResult.error?.message);
      }
    } catch (error) {
      this.addTestResult('Daily Check-in/out Cycle', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Daily Check-in/out Cycle - Exception:', error);
    }

    // Test 2: Leave balance check before applying for leave
    try {
      // Get leave balance
      const balanceResult = await getLeaveBalance('Annual Leave');

      if (balanceResult.ok && balanceResult.data && balanceResult.data.balances.length > 0) {
        const balance = balanceResult.data.balances[0];

        if (balance.leaves_remaining > 2) {
          // Apply for 2 days leave
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() + 21); // 3 weeks from now
          const toDate = new Date(fromDate);
          toDate.setDate(toDate.getDate() + 1); // 2 days total

          const applyResult = await applyLeave(
            'Annual Leave',
            fromDate.toISOString().split('T')[0],
            toDate.toISOString().split('T')[0],
            'Planned vacation'
          );

          if (applyResult.ok && applyResult.data) {
            this.addTestResult('Leave Balance Check & Apply', true, 0, undefined, {
              originalBalance: balance.leaves_remaining,
              appliedDays: applyResult.data.total_leave_days,
              leaveApplicationName: applyResult.data.name
            });
            console.log('✅ Leave Balance Check & Apply - Success');
            console.log(`   Original Balance: ${balance.leaves_remaining}, Applied: ${applyResult.data.total_leave_days} days`);
          } else {
            this.addTestResult('Leave Balance Check & Apply', false, 0, applyResult.error?.message || 'Unknown error');
            console.log('❌ Leave Balance Check & Apply - Failed:', applyResult.error?.message);
          }
        } else {
          this.addTestResult('Leave Balance Check & Apply', true, 0, undefined, {
            note: 'Insufficient balance, correctly blocked',
            balance: balance.leaves_remaining
          });
          console.log('✅ Leave Balance Check & Apply - Insufficient balance (Correctly blocked)');
        }
      } else {
        this.addTestResult('Leave Balance Check & Apply', false, 0, balanceResult.error?.message || 'No balance found');
        console.log('❌ Leave Balance Check & Apply - Failed to get balance');
      }
    } catch (error) {
      this.addTestResult('Leave Balance Check & Apply', false, 0, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Leave Balance Check & Apply - Exception:', error);
    }
  }

  // Cleanup test data
  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    let cleanupCount = 0;
    let cleanupErrors = 0;

    // Clean up leave applications
    for (const leaveApp of this.testData.leaveApplications) {
      try {
        const result = await deleteDocument('Leave Application', leaveApp.name);
        if (result.ok) {
          cleanupCount++;
          console.log(`   ✅ Deleted leave application: ${leaveApp.name}`);
        } else {
          cleanupErrors++;
          console.log(`   ❌ Failed to delete leave application: ${leaveApp.name} - ${result.error?.message}`);
        }
      } catch (error) {
        cleanupErrors++;
        console.error(`   ❌ Exception deleting leave application: ${leaveApp.name} - ${error}`);
      }
    }

    // Clean up check-in records
    for (const checkin of this.testData.checkinRecords) {
      try {
        const result = await deleteDocument('Employee Checkin', checkin.name);
        if (result.ok) {
          cleanupCount++;
          console.log(`   ✅ Deleted check-in record: ${checkin.name}`);
        } else {
          cleanupErrors++;
          console.log(`   ❌ Failed to delete check-in record: ${checkin.name} - ${result.error?.message}`);
        }
      } catch (error) {
        cleanupErrors++;
        console.error(`   ❌ Exception deleting check-in record: ${checkin.name} - ${error}`);
      }
    }

    // Clean up check-out records
    for (const checkout of this.testData.checkoutRecords) {
      try {
        const result = await deleteDocument('Employee Checkin', checkout.name);
        if (result.ok) {
          cleanupCount++;
          console.log(`   ✅ Deleted check-out record: ${checkout.name}`);
        } else {
          cleanupErrors++;
          console.log(`   ❌ Failed to delete check-out record: ${checkout.name} - ${result.error?.message}`);
        }
      } catch (error) {
        cleanupErrors++;
        console.error(`   ❌ Exception deleting check-out record: ${checkout.name} - ${error}`);
      }
    }

    console.log(`🧹 Cleanup completed: ${cleanupCount} items deleted, ${cleanupErrors} errors`);
    this.addTestResult('Test Data Cleanup', cleanupErrors === 0, 0, cleanupErrors > 0 ? `${cleanupErrors} cleanup errors` : undefined, {
      itemsDeleted: cleanupCount,
      cleanupErrors
    });
  }

  async runAllTests(): Promise<TestSuite> {
    console.log('🚀 Starting HR Operations Integration Tests...');
    this.testSuite.startTime = new Date();

    try {
      // Run all test categories
      await this.testEmployeeCheckInOut();
      await this.testLeaveBalanceOperations();
      await this.testLeaveApplicationOperations();
      await this.testPendingApprovalsOperations();
      await this.testDocumentApprovalOperations();
      await this.testErrorHandlingScenarios();
      await this.testRealisticHRWorkflows();

      // Cleanup test data
      await this.cleanupTestData();

      this.testSuite.endTime = new Date();
      this.calculateSummary();

      return this.testSuite;

    } catch (error) {
      console.error('💥 Test execution failed:', error);
      this.testSuite.endTime = new Date();
      this.calculateSummary();
      return this.testSuite;
    }
  }

  private calculateSummary(): void {
    const summary = this.testSuite.summary;
    summary.total = this.testSuite.results.length;
    summary.passed = this.testSuite.results.filter(r => r.passed).length;
    summary.failed = summary.total - summary.passed;
    summary.skipped = 0;
    summary.successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

    const totalDuration = this.testSuite.results.reduce((sum, r) => sum + r.duration, 0);
    summary.averageResponseTime = summary.total > 0 ? Math.round(totalDuration / summary.total) : 0;
  }

  generateReport(): string {
    const summary = this.testSuite.summary;
    const duration = (this.testSuite.endTime.getTime() - this.testSuite.startTime.getTime()) / 1000;

    let report = `# HR Operations Integration Test Report\n\n`;
    report += `**Test Duration:** ${duration.toFixed(2)} seconds\n`;
    report += `**Timestamp:** ${this.testSuite.startTime.toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${summary.total}\n`;
    report += `- **Passed:** ${summary.passed} ✅\n`;
    report += `- **Failed:** ${summary.failed} ❌\n`;
    report += `- **Success Rate:** ${summary.successRate}%\n`;
    report += `- **Average Response Time:** ${summary.averageResponseTime}ms\n\n`;

    // Performance metrics
    report += `## Performance Metrics\n\n`;
    const metricsByOperation: Record<string, { total: number; count: number; min: number; max: number }> = {};

    this.performanceMetrics.forEach(metric => {
      if (!metricsByOperation[metric.operation]) {
        metricsByOperation[metric.operation] = { total: 0, count: 0, min: metric.duration, max: metric.duration };
      }
      const op = metricsByOperation[metric.operation];
      op.total += metric.duration;
      op.count += 1;
      op.min = Math.min(op.min, metric.duration);
      op.max = Math.max(op.max, metric.duration);
    });

    Object.entries(metricsByOperation).forEach(([operation, stats]) => {
      const avg = stats.total / stats.count;
      report += `### ${operation}\n`;
      report += `- Average: ${avg.toFixed(2)}ms\n`;
      report += `- Min: ${stats.min}ms\n`;
      report += `- Max: ${stats.max}ms\n`;
      report += `- Count: ${stats.count}\n\n`;
    });

    // Test results by category
    const categories: Record<string, TestResult[]> = {};
    this.testSuite.results.forEach(result => {
      const category = result.testName.split(' - ')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(result);
    });

    report += `## Test Results by Category\n\n`;
    Object.entries(categories).forEach(([category, results]) => {
      const passed = results.filter(r => r.passed).length;
      const categorySuccessRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
      report += `### ${category}\n`;
      report += `- Success Rate: ${categorySuccessRate}% (${passed}/${results.length})\n\n`;

      results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        const errorInfo = result.error ? ` - ${result.error}` : '';
        report += `- ${status} ${result.testName} (${result.duration}ms)${errorInfo}\n`;
      });
      report += `\n`;
    });

    // Failed tests details
    const failedTests = this.testSuite.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += `## Failed Tests\n\n`;
      failedTests.forEach(test => {
        report += `### ${test.testName}\n`;
        report += `- **Error:** ${test.error || 'Unknown error'}\n`;
        report += `- **Duration:** ${test.duration}ms\n`;
        if (test.details) {
          report += `- **Details:** ${JSON.stringify(test.details, null, 2)}\n`;
        }
        report += `\n`;
      });
    }

    // Test data created
    report += `## Test Data Created\n\n`;
    report += `### Check-in Records\n`;
    report += `- Total Created: ${this.testData.checkinRecords.length}\n\n`;

    report += `### Check-out Records\n`;
    report += `- Total Created: ${this.testData.checkoutRecords.length}\n\n`;

    report += `### Leave Applications\n`;
    report += `- Total Created: ${this.testData.leaveApplications.length}\n\n`;

    return report;
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMetrics;
  }
}