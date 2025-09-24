import { createDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';

async function testLeadCreation() {
  try {
    console.log('Testing Lead creation...');
    await erpAuthenticator.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );
    console.log('✅ Authentication successful');

    // Test minimal lead creation
    console.log('Testing minimal Lead creation...');
    const minimalLeadResult = await createDocument('Lead', {
      lead_name: 'Test Lead',
      email_id: 'test@example.com',
      phone: '+1234567890'
    });

    if (minimalLeadResult.ok) {
      console.log(`✅ Minimal Lead created: ${minimalLeadResult.data?.name}`);
    } else {
      console.log(`❌ Minimal Lead creation failed: ${minimalLeadResult.error?.message}`);
      console.log('Error details:', JSON.stringify(minimalLeadResult.error, null, 2));
    }

    // Test lead creation with additional fields
    console.log('Testing full Lead creation...');
    const fullLeadResult = await createDocument('Lead', {
      lead_name: 'John Smith',
      email_id: 'john.smith@example.com',
      phone: '+1234567890',
      company_name: 'Tech Corp',
      source: 'Website',
      status: 'Open'
    });

    if (fullLeadResult.ok) {
      console.log(`✅ Full Lead created: ${fullLeadResult.data?.name}`);
    } else {
      console.log(`❌ Full Lead creation failed: ${fullLeadResult.error?.message}`);
      console.log('Error details:', JSON.stringify(fullLeadResult.error, null, 2));
    }

    // Check if we can list existing leads
    console.log('Testing Lead listing...');
    const listResult = await createDocument('Lead', {
      cmd: 'frappe.client.get_list',
      doctype: 'Lead',
      fields: ['name', 'lead_name', 'email_id', 'status'],
      limit: 5
    });

    console.log('Lead listing result:', JSON.stringify(listResult, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLeadCreation().catch(console.error);