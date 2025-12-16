#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const os = require('os');

const platform = os.platform();
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

console.log('🔍 Checking Redis status...');

// Check if Redis is already running
exec('redis-cli ping', (error, stdout) => {
  if (!error && stdout.trim() === 'PONG') {
    console.log('✅ Redis is already running!');
    return;
  }

  console.log('⚠️  Redis is not running. Attempting to start...');

  // Try to start Redis based on platform
  if (isWindows) {
    startRedisWindows();
  } else if (isMac) {
    startRedisMac();
  } else if (isLinux) {
    startRedisLinux();
  } else {
    console.error('❌ Unsupported platform:', platform);
    console.log('💡 Please start Redis manually or use Docker:');
    console.log('   docker run -d -p 6379:6379 --name schedy-redis redis:latest');
    process.exit(1);
  }
});

function startRedisWindows() {
  console.log('🪟 Windows detected. Trying to start Redis...');
  
  // Try WSL2 first
  const wslRedis = spawn('wsl', ['sudo', 'service', 'redis-server', 'start'], {
    stdio: 'inherit',
    shell: true
  });

  wslRedis.on('error', (err) => {
    console.error('❌ Failed to start Redis via WSL2:', err.message);
    console.log('\n💡 Alternative options:');
    console.log('   1. Start Redis manually in WSL2:');
    console.log('      wsl sudo service redis-server start');
    console.log('   2. Use Docker:');
    console.log('      docker run -d -p 6379:6379 --name schedy-redis redis:latest');
    console.log('   3. Install Redis: See REDIS_SETUP.md');
  });

  wslRedis.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis started successfully via WSL2!');
      verifyRedis();
    }
  });
}

function startRedisMac() {
  console.log('🍎 macOS detected. Starting Redis via Homebrew...');
  
  const brewRedis = spawn('brew', ['services', 'start', 'redis'], {
    stdio: 'inherit',
    shell: true
  });

  brewRedis.on('error', (err) => {
    console.error('❌ Failed to start Redis via Homebrew:', err.message);
    console.log('\n💡 Alternative options:');
    console.log('   1. Install Redis: brew install redis');
    console.log('   2. Use Docker:');
    console.log('      docker run -d -p 6379:6379 --name schedy-redis redis:latest');
    console.log('   3. See REDIS_SETUP.md for details');
  });

  brewRedis.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis started successfully!');
      setTimeout(verifyRedis, 2000); // Wait 2s for Redis to fully start
    }
  });
}

function startRedisLinux() {
  console.log('🐧 Linux detected. Starting Redis service...');
  
  const systemdRedis = spawn('sudo', ['systemctl', 'start', 'redis-server'], {
    stdio: 'inherit',
    shell: true
  });

  systemdRedis.on('error', (err) => {
    console.error('❌ Failed to start Redis via systemd:', err.message);
    console.log('\n💡 Alternative options:');
    console.log('   1. Try: sudo service redis-server start');
    console.log('   2. Use Docker:');
    console.log('      docker run -d -p 6379:6379 --name schedy-redis redis:latest');
    console.log('   3. Install Redis: sudo apt install redis-server');
  });

  systemdRedis.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis started successfully!');
      setTimeout(verifyRedis, 2000); // Wait 2s for Redis to fully start
    }
  });
}

function verifyRedis() {
  exec('redis-cli ping', (error, stdout) => {
    if (!error && stdout.trim() === 'PONG') {
      console.log('✅ Redis is running and responding!');
      console.log('🚀 You can now use the queue functionality.\n');
    } else {
      console.log('⚠️  Redis may not be fully started yet.');
      console.log('💡 Run "redis-cli ping" to verify manually.\n');
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Redis check...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping Redis check...');
  process.exit(0);
});

