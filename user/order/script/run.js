/**
 * Orchestrator — runs the API suite then the UI suite and prints a combined
 * tally. Usage:  node script/run.js
 */
const { execFileSync } = require('child_process');
const path = require('path');

function run(file) {
  console.log(`\n──────── ${file} ────────`);
  execFileSync('node', [path.join(__dirname, file)], { stdio: 'inherit' });
}

try {
  run('api.spec.js');
  run('ui.spec.js');
  console.log('\nAll suites finished. See report.md and evidence/.');
} catch (e) {
  console.error('A suite failed:', e.message);
  process.exit(1);
}
