import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('======================================================');
console.log('  🚀 Starting ApexFinance Pro (Backend + Frontend)');
console.log('======================================================');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 node_modules not found. Installing dependencies...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const install = spawn(npmCmd, ['install'], {
    stdio: 'inherit',
    cwd: __dirname,
  });

  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully.');
      launchServers();
    } else {
      console.error('❌ Failed to install dependencies. Exit code:', code);
      process.exit(code);
    }
  });
} else {
  launchServers();
}

function launchServers() {
  console.log('⚡ Starting Express API on :5000 & Vite Client on :5174...');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const proc = spawn(
    npxCmd,
    [
      'concurrently',
      '--kill-others',
      '-n',
      'SERVER,CLIENT',
      '-c',
      'cyan.bold,magenta.bold',
      'node server/index.js',
      'vite --open',
    ],
    {
      stdio: 'inherit',
      cwd: __dirname,
    }
  );

  proc.on('close', (code) => {
    process.exit(code);
  });
}
