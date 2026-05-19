---
name: troubleshoot-ci-failures
description: Debug and resolve GitHub Actions CI-specific test failures
---

# Troubleshoot CI Failures

Use this skill to debug test failures specific to the CI environment (GitHub Actions).

## Quick CI Diagnostics

### View CI Logs

```bash
# List recent workflow runs
gh run list --limit 10

# View specific run
gh run view <run-id>

# View logs for specific job
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>
```

### Check CI Status

```bash
# Check status of latest run
gh run list --limit 1

# Watch current run
gh run watch
```

## CI vs Local Differences

### Environment Differences

| Aspect | CI | Local |
|--------|-----|-------|
| OS | Ubuntu 22.04 (Linux) | Varies |
| Resources | 2 CPU, 7GB RAM | Varies |
| Network | GitHub network | Your network |
| Timing | Can be slower | Usually faster |
| Clean state | Always fresh | May have leftovers |

### Common CI-Only Failures

#### 1. Timeout Issues

**Symptom**: Test passes locally but times out in CI

**Causes**:
- CI is slower (shared resources)
- Network latency
- Resource contention

**Solution**:

```typescript
// Increase timeouts for CI
const timeout = Cypress.env('CI') ? 180000 : 120000;

cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6', { timeout });
```

Or in cypress.config.ts:
```typescript
defaultCommandTimeout: process.env.CI ? 15000 : 10000
```

#### 2. Race Conditions

**Symptom**: Flaky test in CI, passes locally

**Causes**:
- Timing differences
- Different execution speeds
- Async operations

**Solution**:

```typescript
// ❌ Bad - assumes immediate completion
cy.clickButton('Create');
cy.contains('Created successfully');

// ✅ Good - explicit wait
cy.clickButton('Create');
cy.contains('Creating...').should('not.exist');
cy.contains('Created successfully', { timeout: 30000 }).should('be.visible');
```

#### 3. Resource Limits

**Symptom**: Out of memory, disk full, etc.

**CI Resources**:
- Memory: 7GB
- Disk: ~14GB available
- CPU: 2 cores

**Solutions**:

```yaml
# In workflow, increase resources if needed
jobs:
  test:
    runs-on: ubuntu-latest-4-cores  # More resources
```

Or reduce test load:
```bash
# Run tests in smaller batches
npx cypress run --spec "cypress/e2e/unit_tests/p0_fleet.spec.ts"
npx cypress run --spec "cypress/e2e/unit_tests/p1_fleet.spec.ts"
```

## Debugging CI Failures

### Step 1: Reproduce Locally

```bash
# Try to match CI environment
export CI=true
export RANCHER_VERSION="stable/2.14.0"
export PUBLIC_DNS="rancher.localhost"

cd tests
make e2e-install-rancher
npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts
```

### Step 2: Check CI Logs

Look for:

**Ginkgo installation logs**:
```
Installing K3s...
Installing cert-manager...
Installing Rancher Manager...
```

**Cypress test output**:
```
Running: p0_fleet.spec.ts
  ✓ FLEET-62: Deploy application to local cluster (45s)
  ✗ FLEET-6: Test GitLab private repo
    Error: Timed out retrying...
```

**Error messages**:
```
CypressError: Timed out retrying after 120000ms...
NetworkError: Failed to fetch...
AssertionError: expected '0 / 1' to equal '1 / 1'
```

### Step 3: Check Artifacts

Download and inspect:

```bash
gh run download <run-id>

# Check screenshots
ls -la cypress/screenshots/

# Check videos  
ls -la cypress/videos/

# Check test reports
open cypress/reports/html/index.html
```

### Step 4: Compare with Passing Run

```bash
# Find last passing run
gh run list --status success --limit 1

# Compare logs
gh run view <failing-run-id> --log > fail.log
gh run view <passing-run-id> --log > pass.log
diff fail.log pass.log
```

## CI-Specific Issues

### Issue 1: Rancher Installation Fails

**Symptoms**:
```
Error: Rancher pods not ready
timeout waiting for condition
```

**Check**:
```bash
# In CI logs, look for:
kubectl get pods -n cattle-system
kubectl get pods -n cattle-fleet-system
```

**Common causes**:
- Image pull rate limits
- Network issues
- Resource constraints

**Solutions**:
- Add retries to installation
- Increase timeouts
- Check image availability

### Issue 2: Downstream Cluster Creation Fails

**Symptoms**:
```
Error creating k3d cluster
```

**Check**:
```bash
# In CI logs:
k3d cluster list
docker ps
```

**Solutions**:
```yaml
# In workflow, ensure Docker is available
- name: Set up Docker
  uses: docker/setup-buildx-action@v2
```

### Issue 3: Network Connectivity

**Symptoms**:
```
Error: ECONNREFUSED
Failed to connect to rancher.localhost
```

**Check**:
- /etc/hosts configuration
- Service readiness
- Port accessibility

**Solutions**:
```bash
# In CI workflow, ensure proper host setup
echo "127.0.0.1 rancher.localhost" | sudo tee -a /etc/hosts
```

### Issue 4: Permissions

**Symptoms**:
```
Permission denied
EACCES: permission denied
```

**Solutions**:
```yaml
# In workflow
- name: Set permissions
  run: |
    sudo chown -R $USER:$USER ~/.kube
    chmod -R 755 tests/cypress/videos
```

## GitHub Actions Workflow Debugging

### Enable Debug Logging

In workflow file or via GitHub UI:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

Or set secrets:
- `ACTIONS_STEP_DEBUG` = `true`
- `ACTIONS_RUNNER_DEBUG` = `true`

### Add Debug Steps

```yaml
- name: Debug - Environment
  run: |
    echo "Runner OS: $RUNNER_OS"
    echo "Runner Arch: $RUNNER_ARCH"
    echo "PWD: $(pwd)"
    df -h
    free -m
    
- name: Debug - Rancher Status
  if: always()
  run: |
    kubectl get pods -A
    kubectl get nodes
    kubectl describe pods -n cattle-system
    
- name: Debug - Upload Logs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: debug-logs
    path: |
      /var/log/syslog
      ~/.kube/config
      tests/cypress/screenshots/
      tests/cypress/videos/
```

### Matrix Testing

Test multiple configurations:

```yaml
strategy:
  matrix:
    rancher-version: ['2.13.0', '2.14.0']
    k3s-version: ['v1.28.0+k3s1', 'v1.29.0+k3s1']
```

## Comparing CI Environments

### Current CI Workflows

From `.github/workflows/`:

**Daily runs**:
- `ui-rm_head.yaml` - Rancher head
- `ui-rm_head_2.14.yaml` - Rancher 2.14-head
- `ui-rm_head_2.13.yaml` - Rancher 2.13-head
- `ui-rm_head_2.12.yaml` - Rancher 2.12-head

**Weekly runs**:
- `ui-rm_head_2.11.yaml` - Rancher 2.11-head
- `ui-rm_head_2.10.yaml` - Rancher 2.10-head

### Check Specific Workflow

```bash
# View workflow file
cat .github/workflows/ui-rm_head_2.14.yaml

# Check what versions it uses
grep "RANCHER_VERSION\|INSTALL_K3S_VERSION" .github/workflows/*.yaml
```

## Flaky Tests in CI

### Identify Flaky Tests

```bash
# Check multiple runs for same test
gh run list --workflow="ui-rm_head_2.14.yaml" --limit 10 --json conclusion,databaseId

# Download results from multiple runs
for run_id in $(gh run list --limit 5 --json databaseId -q '.[].databaseId'); do
  gh run download $run_id --name cypress-results --dir run-$run_id
done

# Compare which tests failed
for dir in run-*/; do
  echo "$dir:"
  jq -r '.results[].suites[].tests[] | select(.state == "failed") | .title' $dir/.jsons/*.json
done
```

### Add Retries for Flaky Tests

```typescript
// In test
it('flaky test', { retries: 2 }, () => {
  // Test that sometimes fails in CI
});
```

Or in cypress.config.ts:
```typescript
retries: {
  runMode: 2,  // CI
  openMode: 0  // Local
}
```

## CI Performance Optimization

### Reduce CI Run Time

**Current bottlenecks**:
1. Rancher installation (~5-10 min)
2. Cypress test execution (~10-20 min)
3. Artifact upload (~2-3 min)

**Optimizations**:

```yaml
# Cache dependencies
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ~/.cache/Cypress
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}

# Parallel test execution
strategy:
  matrix:
    shard: [1, 2, 3, 4]
```

### Disable Video for Faster Runs

```yaml
# In CI workflow
- name: Run Cypress tests
  run: |
    cd tests
    npx cypress run -C cypress.config.ts --config video=false
```

## Handling CI Secrets

### Required Secrets

CI needs these secrets in GitHub repository settings:

```
QASE_API_TOKEN
GH_PRIVATE_USER
GH_PRIVATE_PWD
GITLAB_PRIVATE_USER
GITLAB_PRIVATE_PWD
BITBUCKET_PRIVATE_USER
BITBUCKET_PRIVATE_PWD
AWS_ACCESS_KEY_ID (for AWS cluster tests)
AWS_SECRET_ACCESS_KEY
```

### Check Secret Usage

```yaml
# In workflow
env:
  QASE_API_TOKEN: ${{ secrets.QASE_API_TOKEN }}
  GH_PRIVATE_USER: ${{ secrets.GH_PRIVATE_USER }}
```

### Debug Missing Secrets

```yaml
# Check if secret is set (don't print value!)
- name: Check secrets
  run: |
    if [ -z "${{ secrets.QASE_API_TOKEN }}" ]; then
      echo "QASE_API_TOKEN is not set"
    else
      echo "QASE_API_TOKEN is set"
    fi
```

## CI Failure Patterns

### Pattern 1: All Tests Fail

**Likely cause**: Infrastructure setup failure

**Check**:
- Rancher installation logs
- K3s status
- Pod status

### Pattern 2: First Test Fails, Rest Skip

**Likely cause**: beforeEach hook failure (login issue)

**Check**:
- Login credentials
- Rancher accessibility
- Network connectivity

### Pattern 3: Random Test Fails

**Likely cause**: Flaky test, timing issue

**Check**:
- Test has proper waits
- Resource availability
- Network latency

### Pattern 4: Same Test Fails Consistently

**Likely cause**: Real bug or version incompatibility

**Check**:
- Does it fail locally?
- Is it version-specific?
- Did code change recently?

## Emergency CI Fixes

### Skip Failing Test Temporarily

```typescript
// Add .skip to failing test
it.skip(qase(123, 'FLEET-123: Temporarily skipped'), () => {
  // Test code
});
```

**Create issue immediately to fix properly!**

### Disable Workflow Temporarily

```yaml
# In workflow file
on:
  workflow_dispatch:  # Manual trigger only
  # Commented out automatic triggers
  # schedule:
  #   - cron: '0 2 * * *'
```

### Force Success (Last Resort)

```yaml
# In workflow step
- name: Run tests
  run: make start-cypress-tests
  continue-on-error: true  # Don't fail workflow
```

**Only use during incidents, fix ASAP!**

## Best Practices

1. **Test locally first**: Match CI environment as much as possible
2. **Check logs carefully**: CI logs contain all the information
3. **Use artifacts**: Screenshots/videos show what happened
4. **Compare runs**: Find what changed between passing and failing
5. **Add debug output**: Temporary logging to understand issue
6. **Fix quickly**: Don't let CI stay red
7. **Document**: Note what was wrong and how you fixed it
