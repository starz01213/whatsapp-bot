const db = require('../src/database/db');
const { CommodityService } = require('../src/database/services');
const subscriptionService = require('../src/services/subscriptionService');

/**
 * Setup script to initialize the database with sample data
 */
async function setupDatabase() {
  try {
    console.log('🔧 Setting up WhatsApp Bot database...\n');

    // Connect to database
    await db.connect();

    // Add sample commodities
    console.log('📦 Adding sample commodities...');
    const sampleCommodities = [
      {
        name: 'Rice',
        price: 15.99,
        description: 'Premium long-grain white rice, 5kg bag',
        category: 'Grains',
      },
      {
        name: 'Wheat',
        price: 12.50,
        description: 'Whole wheat flour, 1kg pack',
        category: 'Grains',
      },
      {
        name: 'Corn Oil',
        price: 8.99,
        description: 'Pure corn oil for cooking, 1 liter',
        category: 'Oil',
      },
      {
        name: 'Sugar',
        price: 9.99,
        description: 'Refined white sugar, 2kg bag',
        category: 'Sweeteners',
      },
      {
        name: 'Salt',
        price: 2.99,
        description: 'Table salt, 1kg bag',
        category: 'Seasonings',
      },
      {
        name: 'Beans',
        price: 14.50,
        description: 'Mixed legumes and beans, 2kg pack',
        category: 'Legumes',
      },
      {
        name: 'Tomato Paste',
        price: 4.99,
        description: 'Pure tomato paste, 500ml tin',
        category: 'Condiments',
      },
      {
        name: 'Milk Powder',
        price: 11.99,
        description: 'Full-fat milk powder, 400g pack',
        category: 'Dairy',
      },
    ];

    for (const commodity of sampleCommodities) {
      await CommodityService.addCommodity(
        commodity.name,
        commodity.price,
        commodity.description,
        commodity.category
      );
      console.log(`  ✓ Added ${commodity.name}`);
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update .env file with your Twilio credentials');
    console.log('2. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    console.log('3. Run: npm start');
    console.log('\n🚀 Your WhatsApp bot is ready to use!');

    await db.close();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
