import { execFileSync } from 'node:child_process';
import type { Reporter, TestCase } from '@playwright/test/reporter';

/**
 * Updates the reports after every run of the suite (playwright.config.ts):
 * the result workbooks of the modules (reports/e2e/<NN-module>.xlsx), the
 * chain workbook (reports/e2e-chains/e2e-journeys.xlsx) and the summary
 * (reports/summary/simrs-run-summary.xlsx, sheet Ringkasan with the
 * screenshots), each from the newest result of every test in all results
 * files. It runs in onExit, after the JSON reporter has written the results
 * of this run, and only when a test case or a chain ran. QA_SUMMARY=0 turns
 * it off.
 */
export default class SummaryReporter implements Reporter {
  private ran = false;

  onTestEnd(test: TestCase): void {
    if (/^(TC-APP\d{3}-\d{3}|E2E-\d{3}) /.test(test.title)) this.ran = true;
  }

  async onExit(): Promise<void> {
    if (!this.ran || process.env.QA_SUMMARY === '0') return;
    console.log('\nMemperbarui laporan (workbook hasil, rantai E2E, ringkasan)...');
    for (const script of ['build-e2e-workbook', 'build-e2e-chains', 'build-run-summary']) {
      try {
        execFileSync('npx', ['tsx', `scripts/qa/${script}.ts`], { stdio: 'inherit' });
      } catch (e) {
        console.error(`Laporan tidak diperbarui: ${script} gagal (${(e as Error).message.split('\n')[0]})`);
        return;
      }
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
