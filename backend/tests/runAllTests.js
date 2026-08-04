const runUnitTests = require('./unit/signalManager.test');
const runLifecycleTests = require('./integration/lifecycle.test');
const runFxDeskProRecoveryTests = require('./integration/fxDeskProRecovery.test');
const runSimultaneousTests = require('./integration/simultaneousEvents.test');
const runDashboardApiTests = require('./integration/dashboardApi.test');
const runOutcomeSyncTests = require('./integration/outcomeSync.test');
const runFailureTests = require('./integration/failureScenarios.test');
const runHighVolumeStressTest = require('./stress/highVolume.test');

const main = async () => {
  console.log('====================================================');
  console.log('    ANALYTICS BACKEND PRODUCTION TEST RUNNER        ');
  console.log('====================================================\n');

  const startTime = Date.now();
  const suites = [];

  // Execute Test Suites
  suites.push(runUnitTests());
  suites.push(runLifecycleTests());
  suites.push(runFxDeskProRecoveryTests());
  suites.push(runSimultaneousTests());
  suites.push(runDashboardApiTests());
  suites.push(runOutcomeSyncTests());
  suites.push(await runFailureTests());
  suites.push(runHighVolumeStressTest());

  const totalTimeMs = Date.now() - startTime;

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  console.log('----------------------------------------------------');
  console.log('TEST SUITE RESULTS SUMMARY');
  console.log('----------------------------------------------------');

  suites.forEach((suite) => {
    totalPassed += suite.passed;
    totalFailed += suite.failed;

    const statusBadge = suite.failed === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(`${statusBadge} | ${suite.name}`);
    console.log(`       Passed: ${suite.passed}, Failed: ${suite.failed}`);

    if (suite.metrics && Object.keys(suite.metrics).length > 0) {
      console.log('       Metrics:', JSON.stringify(suite.metrics));
    }

    if (suite.errors.length > 0) {
      suite.errors.forEach((err) => console.log(`       ⚠️ Error: ${err}`));
    }
    console.log('');
  });

  const totalTests = totalPassed + totalFailed + totalSkipped;

  console.log('====================================================');
  console.log('MASTER EXECUTION SUMMARY');
  console.log('====================================================');
  console.log(`Total Test Suites : ${suites.length}`);
  console.log(`Total Tests Run   : ${totalTests}`);
  console.log(`Passed            : ${totalPassed}`);
  console.log(`Failed            : ${totalFailed}`);
  console.log(`Skipped           : ${totalSkipped}`);
  console.log(`Total Duration    : ${totalTimeMs}ms`);
  console.log('====================================================\n');

  if (totalFailed > 0) {
    console.error('❌ TEST RUN FAILED. Returning exit code 1.');
    process.exit(1);
  } else {
    console.log('✅ ALL TEST SUITES PASSED CLEANLY. Ready for deployment!');
    process.exit(0);
  }
};

main();
