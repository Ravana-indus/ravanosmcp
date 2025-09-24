#!/usr/bin/env node

/**
 * Simple ERPNext Authentication Test
 *
 * A straightforward test to verify authentication functionality
 */

import * as dotenv from 'dotenv';
import { erpAuthenticator, ERPNextAuthenticator } from '../src/core/auth';

dotenv.config();

async function testAuthentication() {
  console.log('🚀 Testing ERPNext Authentication...');

  // Test 1: Valid Authentication
  console.log('\n1. Testing valid authentication...');
  const startTime = Date.now();

  try {
    const result = await erpAuthenticator.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );

    const duration = Date.now() - startTime;

    if (result.ok) {
      console.log(`✅ Authentication successful (${duration}ms)`);
      console.log(`   Connected: ${erpAuthenticator.isAuthenticated()}`);
      console.log(`   Config:`, erpAuthenticator.getConfig());

      // Test whoami
      console.log('\n2. Testing whoami() function...');
      const whoamiStart = Date.now();
      const whoamiResult = await erpAuthenticator.whoami();
      const whoamiDuration = Date.now() - whoamiStart;

      if (whoamiResult.ok) {
        console.log(`✅ Whoami successful (${whoamiDuration}ms)`);
        console.log(`   User: ${whoamiResult.data.user}`);
        console.log(`   Roles: ${whoamiResult.data.roles.slice(0, 5).join(', ')}... (${whoamiResult.data.roles.length} total)`);
      } else {
        console.log(`❌ Whoami failed: ${whoamiResult.error.message}`);
      }
    } else {
      console.log(`❌ Authentication failed: ${result.error.message}`);
    }
  } catch (error: any) {
    console.log(`❌ Authentication error: ${error.message}`);
  }

  // Test 3: Invalid Credentials
  console.log('\n3. Testing invalid credentials...');
  const invalidStart = Date.now();

  try {
    const invalidAuth = new ERPNextAuthenticator();
    const invalidResult = await invalidAuth.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      'invalid_api_key',
      'invalid_api_secret'
    );

    const invalidDuration = Date.now() - invalidStart;

    if (!invalidResult.ok) {
      console.log(`✅ Invalid credentials properly rejected (${invalidDuration}ms)`);
      console.log(`   Error: ${invalidResult.error.message}`);
      console.log(`   Connected: ${invalidAuth.isAuthenticated()}`);
    } else {
      console.log(`❌ Invalid credentials unexpectedly accepted`);
    }
  } catch (error: any) {
    console.log(`❌ Invalid credentials test error: ${error.message}`);
  }

  // Test 4: Missing Credentials
  console.log('\n4. Testing missing credentials...');
  const missingStart = Date.now();

  try {
    const missingAuth = new ERPNextAuthenticator();
    const missingResult = await missingAuth.connect('', '', '');

    const missingDuration = Date.now() - missingStart;

    if (!missingResult.ok) {
      console.log(`✅ Missing credentials properly rejected (${missingDuration}ms)`);
      console.log(`   Error: ${missingResult.error.message}`);
      console.log(`   Connected: ${missingAuth.isAuthenticated()}`);
    } else {
      console.log(`❌ Missing credentials unexpectedly accepted`);
    }
  } catch (error: any) {
    console.log(`❌ Missing credentials test error: ${error.message}`);
  }

  console.log('\n🎉 Authentication test complete!');
}

// Run the test
testAuthentication().catch(console.error);