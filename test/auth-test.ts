#!/usr/bin/env node

/**
 * ERPNext Authentication Test Script
 *
 * This script tests the ERPNext authentication functionality using the actual
 * testing server credentials to verify connection, authentication, and error handling.
 */

import * as dotenv from 'dotenv';
import { erpAuthenticator } from '../src/core/auth';
import { logger } from '../src/observability/logger';

// Load environment variables
dotenv.config();

// Test configuration
const testConfig = {
  url: process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
  apiKey: process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
  apiSecret: process.env.ERPNEXT_API_SECRET || '7473a669f6f6552',
  invalidApiKey: 'invalid_api_key',
  invalidApiSecret: 'invalid_api_secret',
  timeout: 30000
};

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class AuthenticationTester {
  private results: TestResult[] = [];

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        test: testName,
        success: true,
        duration,
        details: result
      };

      this.results.push(testResult);
      logger.info(`✅ ${testName}`, { duration, details: result });

      return testResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        test: testName,
        success: false,
        duration,
        error: error.message || 'Unknown error'
      };

      this.results.push(testResult);
      logger.error(`❌ ${testName}`, { duration, error: error.message });

      return testResult;
    }
  }

  async testValidAuthentication(): Promise<TestResult> {
    return this.runTest('Valid Authentication', async () => {
      logger.info('Testing valid authentication with provided credentials...');

      const result = await erpAuthenticator.connect(
        testConfig.url,
        testConfig.apiKey,
        testConfig.apiSecret
      );

      if (!result.ok) {
        throw new Error(result.error?.message || 'Authentication failed');
      }

      return {
        connected: erpAuthenticator.isAuthenticated(),
        config: erpAuthenticator.getConfig(),
        response: result
      };
    });
  }

  async testWhoami(): Promise<TestResult> {
    return this.runTest('Whoami Function', async () => {
      if (!erpAuthenticator.isAuthenticated()) {
        throw new Error('Not authenticated. Please run authentication test first.');
      }

      const result = await erpAuthenticator.whoami();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Whoami failed');
      }

      return {
        userInfo: result.data,
        response: result
      };
    });
  }

  async testInvalidCredentials(): Promise<TestResult> {
    return this.runTest('Invalid Credentials Error Handling', async () => {
      logger.info('Testing invalid credentials...');

      // Create a new authenticator instance for this test
      const { ERPNextAuthenticator } = await import('../src/core/auth');
      const testAuthenticator = new ERPNextAuthenticator();

      const result = await testAuthenticator.connect(
        testConfig.url,
        testConfig.invalidApiKey,
        testConfig.invalidApiSecret
      );

      // This should fail, so we expect !result.ok
      if (result.ok) {
        throw new Error('Expected authentication to fail with invalid credentials');
      }

      return {
        expectedError: true,
        error: result.error,
        isConnected: testAuthenticator.isAuthenticated()
      };
    });
  }

  async testMissingCredentials(): Promise<TestResult> {
    return this.runTest('Missing Credentials Error Handling', async () => {
      logger.info('Testing missing credentials...');

      const { ERPNextAuthenticator } = await import('../src/core/auth');
      const testAuthenticator = new ERPNextAuthenticator();

      const result = await testAuthenticator.connect('', '', '');

      // This should fail with missing parameters
      if (result.ok) {
        throw new Error('Expected authentication to fail with missing credentials');
      }

      return {
        expectedError: true,
        error: result.error,
        isConnected: testAuthenticator.isAuthenticated()
      };
    });
  }

  async testConnectionStability(): Promise<TestResult> {
    return this.runTest('Connection Stability (Multiple Requests)', async () => {
      if (!erpAuthenticator.isAuthenticated()) {
        throw new Error('Not authenticated. Please run authentication test first.');
      }

      const requests = [];
      const requestCount = 5;

      // Make multiple whoami requests to test connection stability
      for (let i = 0; i < requestCount; i++) {
        requests.push(erpAuthenticator.whoami());
      }

      const results = await Promise.all(requests);

      const successfulRequests = results.filter(r => r.ok).length;

      if (successfulRequests !== requestCount) {
        throw new Error(`Expected ${requestCount} successful requests, got ${successfulRequests}`);
      }

      return {
        totalRequests: requestCount,
        successfulRequests,
        failedRequests: requestCount - successfulRequests,
        users: results.map(r => r.data?.user).filter(Boolean)
      };
    });
  }

  async runAllTests(): Promise<TestResult[]> {
    logger.info('🚀 Starting ERPNext Authentication Tests');
    logger.info('Configuration:', {
      url: testConfig.url,
      apiKey: testConfig.apiKey ? '[REDACTED]' : undefined,
      apiSecret: testConfig.apiSecret ? '[REDACTED]' : undefined
    });

    // Run all tests
    await this.testValidAuthentication();
    await this.testWhoami();
    await this.testConnectionStability();
    await this.testInvalidCredentials();
    await this.testMissingCredentials();

    return this.results;
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ERPNext Authentication Test Report');
    console.log('='.repeat(80));

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / totalTests;

    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Successful: ${successfulTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Average Duration: ${avgDuration.toFixed(1)}ms`);

    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`\n${index + 1}. ${status} ${result.test}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Status: ${result.success ? 'PASSED' : 'FAILED'}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (result.details) {
        if (result.details.userInfo) {
          console.log(`   User: ${result.details.userInfo.user}`);
          console.log(`   Roles: ${result.details.userInfo.roles.join(', ')}`);
        }
        if (result.details.totalRequests) {
          console.log(`   Requests: ${result.details.successfulRequests}/${result.details.totalRequests}`);
        }
      }
    });

    console.log('\n' + '='.repeat(80));

    if (failedTests === 0) {
      console.log('🎉 All tests passed! Authentication system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the results above.');
    }

    console.log('='.repeat(80));
  }
}

// Main test execution
async function main() {
  try {
    const tester = new AuthenticationTester();

    // Set a timeout for the entire test suite
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test suite timed out')), 60000);
    });

    await Promise.race([
      tester.runAllTests(),
      timeoutPromise
    ]);

    tester.generateReport();

    // Exit with appropriate code
    const allPassed = tester.results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);

  } catch (error: any) {
    logger.error('Test execution failed', { error: error.message });
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

export { AuthenticationTester };