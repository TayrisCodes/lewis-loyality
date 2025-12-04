#!/usr/bin/env tsx
/**
 * Master Test Script: Run All Tests
 * 
 * Runs all test suites:
 * 1. PaddleOCR Integration Tests
 * 2. Fraud Detection Tests
 * 3. Admin UI API Tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTest(scriptName: string, description: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`Running: ${description}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    const { stdout, stderr } = await execAsync(`npx tsx scripts/${scriptName}`);
    
    if (stdout) {
      console.log(stdout);
    }
    
    if (stderr) {
      console.error(stderr);
    }
    
    log(`\n✅ ${description} completed`, colors.green);
    return true;
  } catch (error: any) {
    log(`\n❌ ${description} failed`, colors.red);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

async function main() {
  log('\n🚀 Starting Complete Test Suite', colors.cyan);
  log('='.repeat(60));
  
  const results = {
    paddleocr: false,
    fraud: false,
    admin: false,
  };
  
  // Run all tests
  results.paddleocr = await runTest('test-paddleocr.ts', 'PaddleOCR Integration Tests');
  results.fraud = await runTest('test-fraud-detection.ts', 'Fraud Detection Tests');
  results.admin = await runTest('test-admin-ui-api.ts', 'Admin UI API Tests');
  
  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('Test Summary', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  log(`\nPaddleOCR Tests: ${results.paddleocr ? '✅ PASS' : '❌ FAIL'}`, results.paddleocr ? colors.green : colors.red);
  log(`Fraud Detection Tests: ${results.fraud ? '✅ PASS' : '❌ FAIL'}`, results.fraud ? colors.green : colors.red);
  log(`Admin UI Tests: ${results.admin ? '✅ PASS' : '❌ FAIL'}`, results.admin ? colors.green : colors.red);
  
  const allPassed = results.paddleocr && results.fraud && results.admin;
  
  if (allPassed) {
    log('\n🎉 All tests passed!', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Review output above.', colors.yellow);
    process.exit(1);
  }
}

main();

