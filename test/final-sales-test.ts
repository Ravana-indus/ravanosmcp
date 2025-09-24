import { createDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';

async function testFinalSales() {
  try {
    console.log('Testing ERPNext connection...');
    await erpAuthenticator.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );
    console.log('✅ Authentication successful');

    // Create a new customer
    console.log('\nCreating new customer...');
    const customerResult = await createDocument('Customer', {
      customer_name: `Test Customer ${Date.now()}`,
      customer_type: 'Individual'
    });

    if (customerResult.ok) {
      const customerName = customerResult.data?.name;
      console.log(`✅ Customer created: ${customerName}`);

      // Create a simple item
      console.log('\nCreating test item...');
      const itemResult = await createDocument('Item', {
        item_code: `TEST-ITEM-${Date.now()}`,
        item_name: `Test Item ${Date.now()}`,
        item_group: 'All Item Groups',
        stock_uom: 'Nos',
        is_stock_item: 1,
        standard_rate: 100
      });

      if (itemResult.ok) {
        const itemCode = itemResult.data?.name;
        console.log(`✅ Item created: ${itemCode}`);

        // Create sales order
        console.log('\nCreating sales order...');
        const salesOrderResult = await createDocument('Sales Order', {
          customer: customerName,
          delivery_date: '2025-10-24',
          company: 'Ravanos', // Add company field
          items: [
            {
              item_code: itemCode,
              qty: 1,
              rate: 100,
              warehouse: 'Stores - RO'
            }
          ]
        });

        if (salesOrderResult.ok) {
          console.log(`✅ Sales Order created: ${salesOrderResult.data?.name}`);
          console.log(`✅ Sales Order total: ${salesOrderResult.data?.grand_total}`);
        } else {
          console.log(`❌ Sales Order creation failed: ${salesOrderResult.error?.message}`);
          console.log('Error details:', JSON.stringify(salesOrderResult.error, null, 2));
        }
      } else {
        console.log(`❌ Item creation failed: ${itemResult.error?.message}`);
      }
    } else {
      console.log(`❌ Customer creation failed: ${customerResult.error?.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalSales().catch(console.error);