import { createDocument, listDocuments } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';

async function testConnection() {
  try {
    console.log('Testing ERPNext connection...');
    await erpAuthenticator.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );
    console.log('✅ Authentication successful');

    // Test basic document creation
    console.log('Testing Customer creation...');
    const customerResult = await createDocument('Customer', {
      customer_name: `Test Customer ${Date.now()}`,
      customer_type: 'Individual',
      territory: 'All Territories',
      customer_group: 'All Customer Groups'
    });

    if (customerResult.ok) {
      console.log(`✅ Customer created: ${customerResult.data?.name}`);
    } else {
      console.log(`❌ Customer creation failed: ${customerResult.error?.message}`);
    }

    // Test listing existing customers
    console.log('Testing Customer listing...');
    const listResult = await listDocuments('Customer', {}, ['name', 'customer_name'], 5);
    if (listResult.ok && listResult.data) {
      console.log(`✅ Found ${listResult.data.docs.length} customers`);
      if (listResult.data.docs.length > 0) {
        console.log(`  First customer: ${listResult.data.docs[0].customer_name}`);
      }
    } else {
      console.log(`❌ Customer listing failed: ${listResult.error?.message}`);
    }

    // Test basic item creation
    console.log('Testing Item creation...');
    const itemResult = await createDocument('Item', {
      item_code: `TEST-ITEM-${Date.now()}`,
      item_name: `Test Item ${Date.now()}`,
      item_group: 'All Item Groups',
      stock_uom: 'Nos',
      is_stock_item: 1,
      standard_rate: 100
    });

    if (itemResult.ok) {
      console.log(`✅ Item created: ${itemResult.data?.name}`);
    } else {
      console.log(`❌ Item creation failed: ${itemResult.error?.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection().catch(console.error);