#!/usr/bin/env node

const { exec } = require('child_process');

console.log('🐳 Starting Redis with Docker...\n');

// Check if Docker is installed
exec('docker --version', (error) => {
  if (error) {
    console.error('❌ Docker is not installed or not in PATH');
    console.log('\n💡 Install Docker Desktop:');
    console.log('   https://www.docker.com/products/docker-desktop/\n');
    process.exit(1);
  }

  // Check if container already exists
  exec('docker ps -a --filter "name=schedy-redis" --format "{{.Names}}"', (error, stdout) => {
    const containerExists = stdout.trim() === 'schedy-redis';

    if (containerExists) {
      console.log('📦 Redis container already exists. Checking status...');
      
      // Check if container is running
      exec('docker ps --filter "name=schedy-redis" --format "{{.Names}}"', (error, stdout) => {
        const isRunning = stdout.trim() === 'schedy-redis';

        if (isRunning) {
          console.log('✅ Redis container is already running!');
          verifyRedis();
        } else {
          console.log('🔄 Starting existing Redis container...');
          exec('docker start schedy-redis', (error) => {
            if (error) {
              console.error('❌ Failed to start container:', error.message);
              process.exit(1);
            }
            console.log('✅ Redis container started!');
            setTimeout(verifyRedis, 2000);
          });
        }
      });
    } else {
      console.log('📥 Creating new Redis container...');
      
      const dockerCmd = 'docker run -d -p 6379:6379 --name schedy-redis --restart unless-stopped redis:latest';
      
      exec(dockerCmd, (error, stdout) => {
        if (error) {
          console.error('❌ Failed to create container:', error.message);
          process.exit(1);
        }
        
        console.log('✅ Redis container created successfully!');
        console.log('Container ID:', stdout.trim().substring(0, 12));
        setTimeout(verifyRedis, 3000); // Wait 3s for Redis to fully start
      });
    }
  });
});

function verifyRedis() {
  exec('redis-cli ping', (error, stdout) => {
    if (!error && stdout.trim() === 'PONG') {
      console.log('✅ Redis is running and responding!');
      console.log('🚀 Queue functionality is ready.\n');
    } else {
      console.log('⚠️  Waiting for Redis to be fully ready...');
      setTimeout(verifyRedis, 2000);
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Redis Docker check...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping Redis Docker check...');
  process.exit(0);
});

