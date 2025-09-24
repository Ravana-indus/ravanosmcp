#!/usr/bin/env node

/**
 * ERPNext Authentication Performance Test
 *
 * Tests performance metrics for authentication functionality
 */

import * as dotenv from 'dotenv';
import { erpAuthenticator } from '../src/core/auth';

dotenv.config();

interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

class PerformanceTester {
  private metrics: PerformanceMetric[] = [];

  private async measureOperation(operation: string, fn: () => Promise<any>): Promise<PerformanceMetric> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      await fn();
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        success: true,
        timestamp
      };
      this.metrics.push(metric);
      return metric;
    } catch (error) {
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        success: false,
        timestamp
      };
      this.metrics.push(metric);
      return metric;
    }
  }

  async runPerformanceTest() {
    console.log('🚀 Starting Performance Test...');

    // Warm up
    console.log('Warm up...');
    await this.measureOperation('Warm-up', async () => {
      const { ERPNextAuthenticator } = await import('../src/core/auth');
      const tempAuth = new ERPNextAuthenticator();
      await tempAuth.connect(
        process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
        process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
        process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
      );
    });

    // Test authentication performance
    console.log('\n📊 Testing Authentication Performance...');
    for (let i = 1; i <= 5; i++) {
      const { ERPNextAuthenticator } = await import('../src/core/auth');
      const auth = new ERPNextAuthenticator();
      await this.measureOperation(`Authentication ${i}`, async () => {
        await auth.connect(
          process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
          process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
          process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
        );
      });
    }

    // Setup for whoami tests
    const { ERPNextAuthenticator } = await import('../src/core/auth');
    const mainAuth = new ERPNextAuthenticator();
    await mainAuth.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );

    // Test whoami performance
    console.log('\n📊 Testing Whoami Performance...');
    for (let i = 1; i <= 10; i++) {
      await this.measureOperation(`Whoami ${i}`, async () => {
        await mainAuth.whoami();
      });
    }

    // Test concurrent requests
    console.log('\n📊 Testing Concurrent Requests...');
    const concurrentStart = Date.now();
    const concurrentPromises = [];
    for (let i = 1; i <= 20; i++) {
      concurrentPromises.push(
        this.measureOperation(`Concurrent ${i}`, async () => {
          await mainAuth.whoami();
        })
      );
    }
    await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStart;

    this.generateReport(concurrentDuration);
  }

  generateReport(concurrentDuration: number) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Performance Test Report');
    console.log('='.repeat(80));

    // Authentication metrics
    const authMetrics = this.metrics.filter(m => m.operation.startsWith('Authentication'));
    const authSuccess = authMetrics.filter(m => m.success);
    const authAvgTime = authSuccess.reduce((sum, m) => sum + m.duration, 0) / authSuccess.length;

    console.log('\n🔐 Authentication Performance:');
    console.log(`   Total attempts: ${authMetrics.length}`);
    console.log(`   Successful: ${authSuccess.length}`);
    console.log(`   Success rate: ${((authSuccess.length / authMetrics.length) * 100).toFixed(1)}%`);
    console.log(`   Average time: ${authAvgTime.toFixed(1)}ms`);
    console.log(`   Min time: ${Math.min(...authSuccess.map(m => m.duration))}ms`);
    console.log(`   Max time: ${Math.max(...authSuccess.map(m => m.duration))}ms`);

    // Whoami metrics
    const whoamiMetrics = this.metrics.filter(m => m.operation.startsWith('Whoami'));
    const whoamiSuccess = whoamiMetrics.filter(m => m.success);
    const whoamiAvgTime = whoamiSuccess.reduce((sum, m) => sum + m.duration, 0) / whoamiSuccess.length;

    console.log('\n👤 Whoami Performance:');
    console.log(`   Total attempts: ${whoamiMetrics.length}`);
    console.log(`   Successful: ${whoamiSuccess.length}`);
    console.log(`   Success rate: ${((whoamiSuccess.length / whoamiMetrics.length) * 100).toFixed(1)}%`);
    console.log(`   Average time: ${whoamiAvgTime.toFixed(1)}ms`);
    console.log(`   Min time: ${Math.min(...whoamiSuccess.map(m => m.duration))}ms`);
    console.log(`   Max time: ${Math.max(...whoamiSuccess.map(m => m.duration))}ms`);

    // Concurrent metrics
    const concurrentMetrics = this.metrics.filter(m => m.operation.startsWith('Concurrent'));
    const concurrentSuccess = concurrentMetrics.filter(m => m.success);
    const concurrentAvgTime = concurrentSuccess.reduce((sum, m) => sum + m.duration, 0) / concurrentSuccess.length;

    console.log('\n🔄 Concurrent Requests Performance:');
    console.log(`   Total concurrent requests: ${concurrentMetrics.length}`);
    console.log(`   Successful: ${concurrentSuccess.length}`);
    console.log(`   Success rate: ${((concurrentSuccess.length / concurrentMetrics.length) * 100).toFixed(1)}%`);
    console.log(`   Total batch time: ${concurrentDuration}ms`);
    console.log(`   Average individual time: ${concurrentAvgTime.toFixed(1)}ms`);
    console.log(`   Requests per second: ${(concurrentSuccess.length / (concurrentDuration / 1000)).toFixed(1)}`);

    // Overall metrics
    const totalOperations = this.metrics.length;
    const totalSuccess = this.metrics.filter(m => m.success).length;
    const overallSuccessRate = (totalSuccess / totalOperations) * 100;

    console.log('\n📈 Overall Performance:');
    console.log(`   Total operations: ${totalOperations}`);
    console.log(`   Total successful: ${totalSuccess}`);
    console.log(`   Overall success rate: ${overallSuccessRate.toFixed(1)}%`);

    console.log('\n' + '='.repeat(80));
  }
}

// Run performance test
const tester = new PerformanceTester();
tester.runPerformanceTest().catch(console.error);