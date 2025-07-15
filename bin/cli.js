#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const EnvironmentSetup = require('./setup.js');

// Get the directory where the package is installed
const packageDir = path.dirname(__dirname);
const serverPath = path.join(packageDir, 'dist', 'server.js');
const serverEnvPath = path.join(packageDir, '.env');
const uiEnvPath = path.join(packageDir, 'ui', '.env');

async function main() {
  console.log('🚀 AI Workflow Utils');
  console.log('=' .repeat(50));

  // Check if this is the first run or if environment files are missing
  const serverEnvExists = fs.existsSync(serverEnvPath);
  const uiEnvExists = fs.existsSync(uiEnvPath);
  
  if (!serverEnvExists || !uiEnvExists) {
    console.log('🔧 First time setup required...');
    console.log('Missing environment configuration files.\n');
    
    const setup = new EnvironmentSetup();
    const setupCompleted = await setup.setupEnvironment();
    
    if (!setupCompleted) {
      console.log('❌ Setup was cancelled or failed.');
      process.exit(1);
    }
    
    const isHealthy = await setup.checkEnvironmentHealth();
    if (!isHealthy) {
      console.log('❌ Configuration is incomplete. Please run setup again.');
      process.exit(1);
    }
  } else {
    // Check if existing configuration is healthy
    const setup = new EnvironmentSetup();
    const isHealthy = await setup.checkEnvironmentHealth();
    
    if (!isHealthy) {
      console.log('⚠️  Configuration issues detected.');
      const reconfigure = await setup.question('Would you like to reconfigure now? (y/N): ');
      
      if (reconfigure.toLowerCase() === 'y' || reconfigure.toLowerCase() === 'yes') {
        const setupCompleted = await setup.setupEnvironment();
        if (!setupCompleted) {
          console.log('❌ Setup was cancelled.');
          process.exit(1);
        }
      } else {
        console.log('⚠️  Continuing with current configuration...');
      }
    }
  }

  // Verify server build exists
  if (!fs.existsSync(serverPath)) {
    console.log('❌ Server build not found. Please run "npm run build" first.');
    process.exit(1);
  }

  console.log('\n🚀 Starting AI Workflow Utils server...');
  console.log(`📁 Package directory: ${packageDir}`);
  console.log(`🖥️  Server path: ${serverPath}`);

  // Start the server
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: packageDir,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  });

  server.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`🛑 Server process exited with code ${code}`);
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.kill('SIGTERM');
  });
}

// Handle async errors
main().catch((error) => {
  console.error('❌ Application failed to start:', error.message);
  process.exit(1);
});
