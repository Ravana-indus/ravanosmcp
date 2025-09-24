import { createDocument } from '../src/core/crud.js';
import { erpAuthenticator } from '../src/core/auth.js';

interface DemoDocument {
  doctype: string;
  data: any;
  description: string;
}

const demoDocuments: DemoDocument[] = [
  // Employee record for HR testing
  {
    doctype: 'Employee',
    data: {
      employee_name: 'Test Employee',
      first_name: 'Test',
      last_name: 'Employee',
      employee_number: 'EMP001',
      date_of_birth: '1990-01-01',
      date_of_joining: '2023-01-01',
      department: 'Administration',
      designation: 'Software Developer',
      status: 'Active',
      company: 'Ravanos Demo'
    },
    description: 'Employee record for HR testing'
  },

  // Customer for Sales testing
  {
    doctype: 'Customer',
    data: {
      customer_name: 'Test Customer Corp',
      customer_group: 'Commercial',
      territory: 'All Territories',
      customer_type: 'Company',
      default_currency: 'USD',
      default_price_list: 'Standard Selling'
    },
    description: 'Customer record for Sales testing'
  },

  // Item for Sales and Purchase testing
  {
    doctype: 'Item',
    data: {
      item_code: 'TEST-ITEM-001',
      item_name: 'Test Product',
      item_group: 'Products',
      description: 'Test product for sales and purchase',
      is_stock_item: 1,
      standard_rate: 100,
      valuation_rate: 80
    },
    description: 'Item record for Sales/Purchase testing'
  },

  // Supplier for Purchase testing
  {
    doctype: 'Supplier',
    data: {
      supplier_name: 'Test Supplier Inc',
      supplier_group: 'Local',
      supplier_type: 'Company',
      default_currency: 'USD',
      country: 'United States'
    },
    description: 'Supplier record for Purchase testing'
  },

  // Sales Order for Sales testing
  {
    doctype: 'Sales Order',
    data: {
      customer: 'Test Customer Corp',
      transaction_date: '2025-09-24',
      delivery_date: '2025-10-24',
      currency: 'USD',
      selling_price_list: 'Standard Selling',
      items: [
        {
          item_code: 'TEST-ITEM-001',
          qty: 10,
          rate: 100,
          amount: 1000
        }
      ]
    },
    description: 'Sales Order for testing'
  },

  // Purchase Order for Purchase testing
  {
    doctype: 'Purchase Order',
    data: {
      supplier: 'Test Supplier Inc',
      transaction_date: '2025-09-24',
      schedule_date: '2025-10-24',
      currency: 'USD',
      buying_price_list: 'Standard Buying',
      items: [
        {
          item_code: 'TEST-ITEM-001',
          qty: 5,
          rate: 80,
          amount: 400
        }
      ]
    },
    description: 'Purchase Order for testing'
  },

  // Leave Type for HR testing
  {
    doctype: 'Leave Type',
    data: {
      leave_type_name: 'Test Annual Leave',
      max_leaves_allowed: 24,
      is_carry_forward: 1,
      max_carry_forwarded_leaves: 12,
      include_holidays: 0
    },
    description: 'Leave Type for HR testing'
  },

  // Leave Application for HR testing
  {
    doctype: 'Leave Application',
    data: {
      leave_type: 'Test Annual Leave',
      from_date: '2025-09-25',
      to_date: '2025-09-26',
      half_day: 0,
      employee: 'EMP001',
      leave_approver: 'Administrator'
    },
    description: 'Leave Application for HR testing'
  },

  // Journal Entry for Finance testing
  {
    doctype: 'Journal Entry',
    data: {
      posting_date: '2025-09-24',
      company: 'Ravanos Demo',
      accounts: [
        {
          account: 'Cash - R', // Default cash account
          debit: 1000,
          credit: 0
        },
        {
          account: 'Sales - R', // Default sales account
          debit: 0,
          credit: 1000
        }
      ],
      user_remark: 'Test journal entry for finance testing'
    },
    description: 'Journal Entry for Finance testing'
  },

  // Payment Entry for Finance testing
  {
    doctype: 'Payment Entry',
    data: {
      payment_type: 'Receive',
      posting_date: '2025-09-24',
      company: 'Ravanos Demo',
      party_type: 'Customer',
      party: 'Test Customer Corp',
      paid_amount: 500,
      received_amount: 500,
      reference_no: 'TEST-PAYMENT-001',
      reference_date: '2025-09-24'
    },
    description: 'Payment Entry for Finance testing'
  }
];

async function setupDemoData() {
  console.log('🚀 Starting demo data setup...');

  try {
    // Initialize authentication
    console.log('🔑 Testing authentication...');
    const authResult = await erpAuthenticator.connect(
      process.env.ERPNEXT_URL || 'https://demo.ravanos.com',
      process.env.ERPNEXT_API_KEY || 'a6f82e11cf4a760',
      process.env.ERPNEXT_API_SECRET || '7473a669f6f6552'
    );

    if (!authResult.ok) {
      throw new Error(`Authentication failed: ${authResult.error?.message}`);
    }
    const createdDocuments: any[] = [];
    const failedDocuments: any[] = [];

    console.log(`📋 Creating ${demoDocuments.length} demo documents...`);

    for (const doc of demoDocuments) {
      try {
        console.log(`  📄 Creating ${doc.doctype}: ${doc.description}`);

        // Create the document using the CRUD module
        const result = await createDocument(doc.doctype, doc.data);

        if (result.ok && result.data) {
          createdDocuments.push({
            doctype: doc.doctype,
            name: result.data.name,
            description: doc.description,
            data: result.data
          });
          console.log(`    ✅ Created ${doc.doctype}: ${result.data.name}`);
        } else {
          throw new Error(result.error?.message || 'Unknown error');
        }

      } catch (error) {
        console.error(`    ❌ Failed to create ${doc.doctype}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedDocuments.push({
          doctype: doc.doctype,
          description: doc.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary report
    console.log('\n📊 Demo Data Setup Summary:');
    console.log(`✅ Successfully created: ${createdDocuments.length} documents`);
    console.log(`❌ Failed to create: ${failedDocuments.length} documents`);

    if (createdDocuments.length > 0) {
      console.log('\n📋 Created Documents:');
      createdDocuments.forEach(doc => {
        console.log(`  - ${doc.doctype}: ${doc.name} (${doc.description})`);
      });
    }

    if (failedDocuments.length > 0) {
      console.log('\n❌ Failed Documents:');
      failedDocuments.forEach(doc => {
        console.log(`  - ${doc.doctype}: ${doc.error}`);
      });
    }

    // Save created documents info for testing
    const fs = await import('fs');
    const path = await import('path');

    const demoDataInfo = {
      createdDocuments,
      failedDocuments,
      setupDate: new Date().toISOString(),
      serverUrl: process.env.ERPNEXT_URL || 'https://demo.ravanos.com'
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'test-results', 'demo-data-info.json'),
      JSON.stringify(demoDataInfo, null, 2)
    );

    console.log('\n💾 Demo data information saved to test-results/demo-data-info.json');

    return {
      success: true,
      createdDocuments: createdDocuments.length,
      failedDocuments: failedDocuments.length,
      documents: createdDocuments
    };

  } catch (error) {
    console.error('❌ Demo data setup failed:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      createdDocuments: 0,
      failedDocuments: demoDocuments.length
    };
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDemoData()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Demo data setup completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Demo data setup failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error during demo data setup:', error);
      process.exit(1);
    });
}

export { setupDemoData, demoDocuments };