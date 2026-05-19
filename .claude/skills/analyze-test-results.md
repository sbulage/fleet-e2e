---
name: analyze-test-results
description: Analyze test results, reports, and identify patterns in test failures
---

# Analyze Test Results

Use this skill to analyze test results, understand failure patterns, and work with test reports.

## Test Report Locations

### Cypress Reports

```bash
# Mochawesome HTML reports
tests/cypress/reports/html/index.html

# Mochawesome JSON data
tests/cypress/reports/html/.jsons/*.json

# Screenshots (on failure)
tests/cypress/screenshots/

# Videos (all tests)
tests/cypress/videos/

# Qase TestOps run ID
tests/cypress/e2e/unit_tests/QASE_TESTOPS_RUN_ID.txt
```

### Ginkgo Reports

Ginkgo outputs to console. To save:

```bash
cd tests
ginkgo -v ./e2e 2>&1 | tee ginkgo-output.log
```

## View HTML Reports

### Mochawesome Report

```bash
cd tests

# Open in browser
xdg-open cypress/reports/html/index.html  # Linux
open cypress/reports/html/index.html      # macOS
start cypress/reports/html/index.html     # Windows

# Or use Python HTTP server
cd cypress/reports/html
python3 -m http.server 8000
# Then open: http://localhost:8000
```

The report shows:
- Total pass/fail/pending counts
- Duration per test
- Screenshots on failure  
- Error messages and stack traces

### Qase TestOps

If Qase integration is enabled:

```bash
# Get run ID
cat tests/cypress/e2e/unit_tests/QASE_TESTOPS_RUN_ID.txt

# View in browser
# https://app.qase.io/run/FLEET/{run-id}
```

## Analyze Failure Patterns

### Extract Failed Test Names

```bash
cd tests

# From Cypress JSON reports
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | select(.state == "failed") | .title' | \
  sort | uniq
```

### Count Test Results

```bash
# Parse JSON report
cat cypress/reports/html/.jsons/*.json | \
  jq '.stats | {passes, failures, pending, skipped, duration}'

# Example output:
# {
#   "passes": 45,
#   "failures": 3,
#   "pending": 0,
#   "skipped": 2,
#   "duration": 180000
# }
```

### Group Failures by Spec File

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[] | select(.stats.failures > 0) | "\(.file): \(.stats.failures) failures"'
```

### Extract Error Messages

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | select(.state == "failed") | {title, error: .err.message}'
```

## Common Failure Analysis

### Timeout Failures

**Find all timeout errors**:

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         select(.err.message | contains("timeout")) | 
         .title'
```

**Pattern**: If multiple tests timeout on same action, likely infrastructure issue (slow API, network)

**Action**: 
- Check if Rancher is overloaded
- Increase timeout values
- Check for network issues

### Element Not Found

**Find selector errors**:

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         select(.err.message | contains("Expected to find element")) | 
         {title, error: .err.message}'
```

**Pattern**: UI changed or version-specific differences

**Action**:
- Check if test runs on different Rancher version
- Verify selectors in latest UI
- Add version-specific logic

### Authentication Failures

**Find auth errors**:

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         select(.err.message | contains("401") or contains("403") or contains("login")) | 
         .title'
```

**Action**:
- Verify credentials in environment
- Check session persistence
- Verify login command works

## Test Duration Analysis

### Find Slowest Tests

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         select(.duration != null) | 
         {title, duration} | 
         "\(.duration)ms - \(.title)"' | \
  sort -rn | \
  head -10
```

### Calculate Average Test Duration

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq '.results[].suites[].tests[] | .duration' | \
  awk '{sum+=$1; count++} END {print "Average: " sum/count "ms"}'
```

### Tests Taking Over 2 Minutes

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         select(.duration > 120000) | 
         "\(.title): \(.duration/1000)s"'
```

## Screenshot Analysis

### List All Failure Screenshots

```bash
cd tests
find cypress/screenshots -name "*.png" -type f -mtime -1 | sort
```

### View Screenshot

```bash
# Open specific screenshot
xdg-open "cypress/screenshots/p0_fleet.spec.ts/Test Fleet -- fails.png"

# Open all screenshots from a test
xdg-open cypress/screenshots/p0_fleet.spec.ts/*.png
```

### Organize Screenshots by Test

```bash
# Group by spec file
ls -1 cypress/screenshots/*/*.png | sed 's/\/.*//g' | sort | uniq -c
```

## Video Analysis

### Find Test Videos

```bash
cd tests
ls -lh cypress/videos/*.mp4
```

### Play Video

```bash
# Play most recent video
vlc $(ls -t cypress/videos/*.mp4 | head -1)

# Play specific test video
vlc cypress/videos/p0_fleet.spec.ts.mp4
```

### Extract Video Thumbnail

```bash
# Requires ffmpeg
ffmpeg -i cypress/videos/p0_fleet.spec.ts.mp4 -ss 00:00:10 -frames:v 1 thumbnail.png
```

## Compare Test Runs

### Save Current Results

```bash
cd tests

# Timestamp results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p cypress/reports/archive
cp -r cypress/reports/html cypress/reports/archive/html_$TIMESTAMP
cp -r cypress/screenshots cypress/reports/archive/screenshots_$TIMESTAMP 2>/dev/null || true
```

### Diff Two Runs

```bash
# Compare pass/fail counts
diff \
  <(cat cypress/reports/archive/html_20260101_100000/.jsons/*.json | jq '.stats') \
  <(cat cypress/reports/archive/html_20260101_110000/.jsons/*.json | jq '.stats')

# Find newly failing tests
comm -13 \
  <(cat run1/.jsons/*.json | jq -r '.results[].suites[].tests[] | select(.state == "failed") | .title' | sort) \
  <(cat run2/.jsons/*.json | jq -r '.results[].suites[].tests[] | select(.state == "failed") | .title' | sort)
```

## CI vs Local Results

### Get CI Test Results

```bash
# Download from GitHub Actions
gh run download <run-id> -n cypress-results

# Or via API
gh api repos/rancher/fleet-e2e/actions/runs/<run-id>/artifacts
```

### Compare CI and Local

```bash
# CI failures
cat ci-results/.jsons/*.json | jq -r '.results[].suites[].tests[] | select(.state == "failed") | .title' | sort > ci-failures.txt

# Local failures  
cat local-results/.jsons/*.json | jq -r '.results[].suites[].tests[] | select(.state == "failed") | .title' | sort > local-failures.txt

# Diff
diff ci-failures.txt local-failures.txt
```

## Flaky Test Detection

### Identify Flaky Tests

Run test multiple times and track results:

```bash
cd tests

# Run same test 10 times
for i in {1..10}; do
  echo "Run $i" >> flaky-test-log.txt
  npx cypress run -C cypress.config.ts \
    --spec cypress/e2e/unit_tests/p0_fleet.spec.ts 2>&1 | \
    grep -E "(passing|failing)" >> flaky-test-log.txt
done

# Analyze results
grep "failing" flaky-test-log.txt | wc -l
# If > 0 and < 10, test is flaky
```

### Track Flaky Test Patterns

```bash
# Create tracking script
cat > track-flaky.sh << 'EOF'
#!/bin/bash
TEST_SPEC=$1
RUNS=${2:-10}
RESULTS_FILE="flaky-results-$(date +%Y%m%d_%H%M%S).json"

echo "{\"spec\": \"$TEST_SPEC\", \"runs\": []}" > $RESULTS_FILE

for i in $(seq 1 $RUNS); do
  echo "Run $i/$RUNS"
  npx cypress run -C cypress.config.ts --spec "$TEST_SPEC" > /dev/null 2>&1
  STATUS=$?
  jq ".runs += [{\"run\": $i, \"passed\": $([ $STATUS -eq 0 ] && echo true || echo false)}]" $RESULTS_FILE > tmp && mv tmp $RESULTS_FILE
done

# Calculate flaky rate
FAILURES=$(jq '[.runs[] | select(.passed == false)] | length' $RESULTS_FILE)
echo "Flaky rate: $FAILURES/$RUNS ($(echo "scale=2; $FAILURES*100/$RUNS" | bc)%)"
EOF

chmod +x track-flaky.sh

# Usage
./track-flaky.sh cypress/e2e/unit_tests/p0_fleet.spec.ts 10
```

## Reporting to Team

### Generate Summary Report

```bash
cat > generate-summary.sh << 'EOF'
#!/bin/bash
REPORT_FILE="test-summary-$(date +%Y%m%d).md"

echo "# Test Run Summary - $(date +%Y-%m-%d)" > $REPORT_FILE
echo "" >> $REPORT_FILE

# Stats
echo "## Overall Results" >> $REPORT_FILE
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.stats | "- **Passed**: \(.passes)\n- **Failed**: \(.failures)\n- **Pending**: \(.pending)\n- **Duration**: \(.duration/1000/60 | floor) minutes"' \
  >> $REPORT_FILE

echo "" >> $REPORT_FILE

# Failures
echo "## Failed Tests" >> $REPORT_FILE
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | select(.state == "failed") | "- [\(.title)](\(.file))"' \
  >> $REPORT_FILE

echo "" >> $REPORT_FILE

# Screenshots
echo "## Failure Screenshots" >> $REPORT_FILE
find cypress/screenshots -name "*.png" -type f 2>/dev/null | \
  sed 's|cypress/screenshots/||' | \
  awk '{print "- " $0}' \
  >> $REPORT_FILE

cat $REPORT_FILE
EOF

chmod +x generate-summary.sh
./generate-summary.sh
```

### Export to CSV

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         [.title, .state, (.duration/1000), .err.message // ""] | 
         @csv' > test-results.csv
```

## Useful Queries

### Tests with Retries

```bash
grep -h "retries:" cypress/e2e/unit_tests/*.spec.ts | \
  grep -B 2 "retries:" | \
  grep "it(qase"
```

### Long-Running Tests (> 1 minute)

```bash
cat cypress/reports/html/.jsons/*.json | \
  jq -r '.results[].suites[].tests[] | 
         select(.duration > 60000) | 
         "\(.title): \(.duration/1000)s"'
```

## Automated Alerting

### Check for Critical Failures

```bash
cat > check-critical.sh << 'EOF'
#!/bin/bash
FAILURES=$(cat cypress/reports/html/.jsons/*.json | jq '.stats.failures')

if [ "$FAILURES" -gt 0 ]; then
  echo "❌ $FAILURES test(s) failed!"
  exit 1
else
  echo "✅ All tests passed!"
  exit 0
fi
EOF

chmod +x check-critical.sh
./check-critical.sh
```

### Slack Notification Example

```bash
cat > notify-slack.sh << 'EOF'
#!/bin/bash
WEBHOOK_URL="your-slack-webhook-url"
FAILURES=$(cat cypress/reports/html/.jsons/*.json | jq '.stats.failures')
PASSES=$(cat cypress/reports/html/.jsons/*.json | jq '.stats.passes')

MESSAGE="Test Results: $PASSES passed, $FAILURES failed"

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$MESSAGE\"}" \
  $WEBHOOK_URL
EOF
```

## Clean Up Old Reports

```bash
# Keep last 10 runs
cd tests/cypress/reports/archive
ls -t | tail -n +11 | xargs rm -rf 2>/dev/null || true

# Clean reports older than 7 days
find cypress/videos -mtime +7 -delete 2>/dev/null || true
find cypress/screenshots -mtime +7 -delete 2>/dev/null || true
```

## Daily Report Template

```bash
cat > daily-report.sh << 'EOF'
#!/bin/bash

echo "========================================"
echo "Fleet E2E Daily Test Report"
echo "Date: $(date +%Y-%m-%d)"
echo "========================================"
echo ""

# Summary
echo "## Summary"
TOTAL=$(jq '.stats.tests' cypress/reports/html/.jsons/*.json)
PASSED=$(jq '.stats.passes' cypress/reports/html/.jsons/*.json)
FAILED=$(jq '.stats.failures' cypress/reports/html/.jsons/*.json)
DURATION=$(jq '.stats.duration / 1000 / 60 | floor' cypress/reports/html/.jsons/*.json)

echo "Total Tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Duration: ${DURATION} minutes"
echo ""

# Failures
if [ "$FAILED" -gt 0 ]; then
  echo "## Failed Tests"
  jq -r '.results[].suites[].tests[] | select(.state == "failed") | "- " + .title' \
    cypress/reports/html/.jsons/*.json
  echo ""
fi

# Slowest tests
echo "## Slowest Tests (Top 5)"
jq -r '.results[].suites[].tests[] | 
       select(.duration != null) | 
       "\(.duration/1000)s - \(.title)"' \
  cypress/reports/html/.jsons/*.json | \
  sort -rn | \
  head -5

echo ""
echo "========================================"
EOF

chmod +x daily-report.sh
./daily-report.sh
```

## Best Practices

1. **Review reports after every run**: Don't let failures accumulate
2. **Track trends over time**: Save historical data
3. **Investigate flaky tests immediately**: They hide real issues
4. **Share results with team**: Regular reports keep everyone informed
5. **Clean up old artifacts**: Don't fill disk with old reports
6. **Use Qase for tracking**: Centralized test management
7. **Document failure patterns**: Help future debugging
