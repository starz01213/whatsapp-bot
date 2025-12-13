#!/usr/bin/env node

/**
 * WhatsApp Linking Bot - Quick Setup Helper
 * Validates configuration and tests the linking system
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('\n🔐 WhatsApp Linking Bot - Setup Helper\n');
console.log('=' .repeat(50) + '\n');

// 1. Check if .env file exists
console.log('📋 Checking configuration...');
const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found');
  console.log('\n📝 Creating .env template...\n');
  
  const envTemplate = `# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=whatsapp:+14155552671

# Bot Configuration
PORT=3000
NODE_ENV=development
ADMIN_PASSWORD=your_secure_admin_password

# Database
DB_PATH=./data/bot.db

# Optional Settings
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ .env template created at: ' + envPath);
  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Edit .env with your Twilio credentials');
  console.log('   2. Set a strong ADMIN_PASSWORD (min 8 characters)');
  console.log('   3. Get credentials from: https://console.twilio.com\n');
} else {
  console.log('✅ .env file found\n');
}

// 2. Check dependencies
console.log('📦 Checking dependencies...');
try {
  const packageJson = require(path.join(process.cwd(), 'package.json'));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const requiredDeps = [
    'express',
    'twilio',
    'sqlite3',
    'qrcode',
    'dotenv'
  ];

  let allInstalled = true;
  requiredDeps.forEach(dep => {
    if (deps[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - NOT INSTALLED`);
      allInstalled = false;
    }
  });

  if (!allInstalled) {
    console.log('\n⚠️  Missing dependencies detected');
    console.log('Run: npm install\n');
  } else {
    console.log('\n✅ All dependencies installed\n');
  }
} catch (error) {
  console.log('❌ Error checking dependencies:', error.message, '\n');
}

// 3. Check file structure
console.log('📁 Checking file structure...');
const requiredFiles = [
  'src/server.js',
  'src/services/linkingService.js',
  'src/handlers/linkingHandler.js',
  'src/database/db.js',
  'linking-dashboard.html',
  'LINKING_GUIDE.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n✅ All files present\n');
} else {
  console.log('\n⚠️  Some files are missing\n');
}

// 4. Create data directory
console.log('📂 Checking data directory...');
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory\n');
} else {
  console.log('✅ Data directory exists\n');
}

// 5. Check uploads directory
console.log('📂 Checking uploads directory...');
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created uploads directory\n');
} else {
  console.log('✅ Uploads directory exists\n');
}

// 6. Summary
console.log('\n' + '='.repeat(50));
console.log('📝 NEXT STEPS:\n');

console.log('1. Edit your .env file with Twilio credentials:');
console.log('   - Get SID & Token from: https://console.twilio.com');
console.log('   - Get WhatsApp number from: WhatsApp Sandbox settings');
console.log('   - Set a strong ADMIN_PASSWORD\n');

console.log('2. Install dependencies (if not done):');
console.log('   npm install\n');

console.log('3. Start the server:');
console.log('   npm start\n');

console.log('4. Access the linking dashboard:');
console.log('   Open: linking-dashboard.html in your browser\n');

console.log('5. Configure Twilio webhook:');
console.log('   - Go to Twilio Console');
console.log('   - Messaging > Settings > WhatsApp Sandbox');
console.log('   - Webhook URL: https://your-domain.com/webhook/incoming-message\n');

console.log('📚 For detailed guide, see: LINKING_GUIDE.md\n');

console.log('🚀 You\'re all set! Start linking accounts now!\n');
console.log('='.repeat(50) + '\n');

// 7. Quick API test (if server is running)
function testServer() {
  console.log('🧪 Testing API connectivity...');
  
  const req = http.get('http://localhost:3000/health', (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Server is running and responsive\n');
    } else {
      console.log('⚠️  Server responded with status:', res.statusCode, '\n');
    }
  }).on('error', (e) => {
    console.log('ℹ️  Server is not running yet (start it with: npm start)\n');
  });

  req.setTimeout(2000);
}

setTimeout(testServer, 500);
