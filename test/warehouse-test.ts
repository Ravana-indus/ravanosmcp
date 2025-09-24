import { createDocument, listDocuments } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';

async function testWarehouses() {
  try {
    console.log('Testing ERPNext connection...');
    await erpAuthenticator.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );
    console.log('✅ Authentication successful');

    // List available warehouses
    console.log('Listing available warehouses...');
    const warehouseResult = await listDocuments('Warehouse', {}, ['name', 'warehouse_name'], 10);
    if (warehouseResult.ok && warehouseResult.data) {
      console.log(`✅ Found ${warehouseResult.data.docs.length} warehouses:`);
      warehouseResult.data.docs.forEach((wh: any) => {
        console.log(`  - ${wh.name}: ${wh.warehouse_name}`);
      });
    } else {
      console.log(`❌ Warehouse listing failed: ${warehouseResult.error?.message}`);
    }

    // Test sales order with warehouse
    console.log('\nTesting Sales Order with warehouse...');
    const salesOrderResult = await createDocument('Sales Order', {
      customer: 'John Smith Corp - 1',
      delivery_date: '2025-10-24',
      items: [
        {
          item_code: 'TEST-LAPTOP-1758722848693',
          qty: 1,
          rate: 800,
          warehouse: 'Stores - RO' // Use correct warehouse name
        }
      ]
    });

    if (salesOrderResult.ok) {
      console.log(`✅ Sales Order created: ${salesOrderResult.data?.name}`);
    } else {
      console.log(`❌ Sales Order creation failed: ${salesOrderResult.error?.message}`);
      console.log('Error details:', JSON.stringify(salesOrderResult.error, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWarehouses().catch(console.error);