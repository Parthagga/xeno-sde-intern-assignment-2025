#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Mini CRM Platform...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion);

// Install root dependencies
console.log('\n📦 Installing root dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Root dependencies installed');
} catch (error) {
  console.error('❌ Failed to install root dependencies');
  process.exit(1);
}

// Install server dependencies
console.log('\n📦 Installing server dependencies...');
try {
  execSync('cd server && npm install', { stdio: 'inherit' });
  console.log('✅ Server dependencies installed');
} catch (error) {
  console.error('❌ Failed to install server dependencies');
  process.exit(1);
}

// Install client dependencies
console.log('\n📦 Installing client dependencies...');
try {
  execSync('cd client && npm install', { stdio: 'inherit' });
  console.log('✅ Client dependencies installed');
} catch (error) {
  console.error('❌ Failed to install client dependencies');
  process.exit(1);
}

// Check for environment files
console.log('\n🔧 Checking environment configuration...');

const serverEnvPath = path.join(__dirname, 'server', '.env');
const clientEnvPath = path.join(__dirname, 'client', '.env.local');

if (!fs.existsSync(serverEnvPath)) {
  console.log('⚠️  Server .env file not found. Please copy server/env.example to server/.env and configure it.');
} else {
  console.log('✅ Server .env file found');
}

if (!fs.existsSync(clientEnvPath)) {
  console.log('⚠️  Client .env.local file not found. Please create client/.env.local with your configuration.');
} else {
  console.log('✅ Client .env.local file found');
}

// Check for database
console.log('\n🗄️  Database setup reminder:');
console.log('   1. Make sure MySQL is running');
console.log('   2. Create database: CREATE DATABASE mini_crm;');
console.log('   3. Import schema: mysql -u root -p mini_crm < server/database/schema.sql');

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Configure environment variables (see README.md)');
console.log('   2. Set up MySQL database');
console.log('   3. Configure Google OAuth credentials');
console.log('   4. Add OpenAI API key');
console.log('   5. Run: npm run dev');
console.log('\n🌐 Access the application at:');
console.log('   Frontend: http://localhost:3000');
console.log('   Backend:  http://localhost:5000');
console.log('   API Docs: http://localhost:5000/api-docs');
