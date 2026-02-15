// Simple test script to verify WebWatcher functionality
const { storageService } = require('./dist/services/storage');
const { schedulerService } = require('./dist/services/scheduler');

async function testWebWatcher() {
  console.log('🧪 Testing WebWatcher functionality...\n');
  
  try {
    // Test storage
    console.log('✅ Storage Service:');
    const targets = await storageService.getTargets();
    console.log(`   Found ${targets.length} targets`);
    
    const stats = await storageService.getStats();
    console.log(`   Stats: ${stats.totalTargets} total, ${stats.activeTargets} active`);
    
    // Test scheduler status
    console.log('\n✅ Scheduler Service:');
    const status = schedulerService.getStatus();
    console.log(`   Running: ${status.isRunning}, Active targets: ${status.activeTargets}`);
    
    console.log('\n🎉 All systems operational!');
    console.log('\n🚀 To start the WebWatcher application:');
    console.log('   cd /home/ubuntu/.openclaw/workspace/webwatcher');
    console.log('   npm run dev  # or pnpm dev');
    console.log('\n🌐 Then visit http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error testing WebWatcher:', error.message);
  }
}

testWebWatcher();