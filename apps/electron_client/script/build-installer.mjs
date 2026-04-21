#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const packageJsonPath = join(process.cwd(), 'package.json');
if (!existsSync(packageJsonPath)) {
  console.error('package.json not found in current directory');
  process.exit(1);
}

try {
  // 先执行构建
  console.log('Building electron app...');
  execSync('npm run build', { stdio: 'inherit' });

  // 然后打包安装包
  console.log('Packaging installer...');
  execSync('npm run package', { stdio: 'inherit' });

  console.log('Build and packaging completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
