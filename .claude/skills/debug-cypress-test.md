---
name: debug-cypress-test
description: Debug failing Cypress tests and troubleshoot common issues
---

# Debug Cypress Test

Use this skill to debug failing Cypress tests and resolve common issues in the Fleet E2E test suite.

## Quick Diagnosis Commands

### Run Test in Headed Mode

```bash
cd tests
npx cypress open -C cypress.config.ts
# Then select the failing test
```

### Run Single Test with Debug

```bash
cd tests
npx cypress run -C cypress.config.ts --spec cypress/e2e/unit_tests/p0_fleet.spec.ts --headed --no-exit
```

### Run Test with Browser Console

```bash
npx cypress open -C cypress.config.ts
# Open DevTools in the Cypress browser window
# Check console for errors
```

## Common Failure Patterns

### 1. Timeout Errors

**Symptom**: `Timed out retrying after 4000ms`

**Common Causes**:
- Element not loading fast enough
- Wrong selector
- Navigation not completing

**Solutions**:

```typescript
// ❌ Bad - uses default 4s timeout
cy.get('.slow-element').should('be.visible');

// ✅ Good - increase timeout
cy.get('.slow-element', { timeout: 30000 }).should('be.visible');

// ✅ Better - use Eventually pattern in existing commands
cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6', { timeout: 180000 });
```

**Debug Steps**:
1. Check if element selector is correct
2. Verify element actually appears in UI
3. Check network tab for slow API calls
4. Increase timeout incrementally

---

### 2. Element Not Found

**Symptom**: `Expected to find element: .selector, but never found it`

**Common Causes**:
- Wrong selector
- Element hidden/not visible
- Page not fully loaded
- Version-specific UI differences

**Solutions**:

```typescript
// ❌ Bad - brittle selector
cy.get('.btn').click();

// ✅ Good - use data-testid
cy.get('[data-testid="create-button"]').click();

// ✅ Better - use existing custom command
cy.clickButton('Create');

// Check if element exists before acting
cy.get('body').then($body => {
  if ($body.find('.optional-element').length > 0) {
    cy.get('.optional-element').click();
  }
});
```

**Debug Steps**:
1. Inspect element in browser DevTools
2. Verify selector matches actual DOM
3. Check if element is in an iframe
4. Check if element is hidden by CSS

---

### 3. Flaky Tests

**Symptom**: Test passes sometimes, fails other times

**Common Causes**:
- Race conditions
- Async operations not awaited
- Network timing issues
- State pollution from previous tests

**Solutions**:

```typescript
// ❌ Bad - race condition
cy.clickButton('Save');
cy.contains('Saved successfully');

// ✅ Good - wait for operation to complete
cy.clickButton('Save');
cy.contains('Saved successfully', { timeout: 10000 }).should('be.visible');

// ❌ Bad - timing issue
cy.visit('/page');
cy.get('.element').click();

// ✅ Good - ensure page loaded
cy.visit('/page');
cy.contains('Page Title').should('be.visible');
cy.get('.element').click();

// Use retries for known flaky tests
it('flaky test', { retries: 1 }, () => {
  // Test implementation
});
```

**Debug Steps**:
1. Run test 10 times locally: `for i in {1..10}; do npx cypress run --spec ...; done`
2. Add `cy.wait()` strategically (temporary, for debugging)
3. Check beforeEach cleanup
4. Add more explicit waits for async operations

---

### 4. Authentication Issues

**Symptom**: `401 Unauthorized` or `403 Forbidden`

**Common Causes**:
- Login failed
- Session expired
- Credentials incorrect

**Solutions**:

```typescript
// Ensure login in beforeEach
beforeEach(() => {
  cy.login();
  cy.visit('/');
});

// Check credentials are set
it('test', () => {
  const user = Cypress.expose('rancher_user');
  const pwd = Cypress.expose('rancher_password');
  
  cy.log(`User: ${user}`); // Don't log password!
  expect(user).to.not.be.undefined;
});

// Manually verify login works
cy.visit('/');
cy.typeValue('Username', 'admin');
cy.typeValue('Password', 'password');
cy.clickButton('Log In');
cy.url().should('not.include', '/login');
```

---

### 5. Network Errors

**Symptom**: `Failed to fetch`, `Network error`, `ECONNREFUSED`

**Common Causes**:
- Rancher not running
- Wrong URL
- CORS issues
- API endpoint changed

**Solutions**:

```bash
# Verify Rancher is accessible
curl -k https://${RANCHER_URL}

# Check environment variables
echo $RANCHER_URL
echo $RANCHER_PASSWORD
```

```typescript
// Verify URL before tests
before(() => {
  const url = Cypress.expose('rancher_url');
  cy.request({
    url: `${url}/dashboard/auth/login`,
    failOnStatusCode: false
  }).then((resp) => {
    expect(resp.status).to.be.oneOf([200, 302]);
  });
});
```

---

### 6. Version-Specific Failures

**Symptom**: Test passes on 2.14 but fails on 2.11

**Common Causes**:
- UI changes between versions
- Different selectors
- Feature not available in older versions

**Solutions**:

```typescript
const rancherVersion = Cypress.expose('rancher_version');

// Skip test on specific versions
if (/\/2\.11/.test(rancherVersion)) {
  cy.log('Skipping test - not supported in 2.11');
  this.skip();
}

// Use version-specific logic (from actual codebase)
if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
  // New UI behavior
  cy.get('div.scaler > .value').contains('1').should('be.visible');
  cy.get('div.scaler > button.increase').click();
} else {
  // Old UI behavior
  cy.get('#trigger').click({ force: true });
  cy.contains('Scale').should('be.visible');
  cy.get('.icon-plus').click();
}
```

## Debugging Techniques

### Add Debug Logging

```typescript
// Log variables
cy.log(`Repository name: ${repoName}`);

// Log element state
cy.get('.status').then($el => {
  cy.log(`Status text: ${$el.text()}`);
});

// Use task logger for server logs
cy.task('suiteLog', `Starting test for ${repoName}`);

// Take screenshot at specific point
cy.screenshot('before-failure');
```

### Use Cypress Debugger

```typescript
// Pause test execution
cy.debug();

// Inspect element
cy.get('.element').debug();

// Use browser debugger
cy.pause();
```

### Check Test Artifacts

After test run, check:
- **Screenshots**: `tests/cypress/screenshots/`
- **Videos**: `tests/cypress/videos/`
- **Reports**: `tests/cypress/reports/`

```bash
# View latest screenshot
ls -lt tests/cypress/screenshots/**/*.png | head -1

# Open latest video
ls -lt tests/cypress/videos/*.mp4 | head -1
```

### Enable Debug Logging

```bash
# Run with debug output
DEBUG=cypress:* npx cypress run -C cypress.config.ts --spec ...

# Check network requests
DEBUG=cypress:server:request npx cypress run ...
```

## Environment-Specific Issues

### Local Development

```bash
# Verify environment variables
cd tests
cat .env 2>/dev/null || echo "No .env file"

# Check Rancher is accessible
curl -k https://localhost/dashboard/
```

### CI Environment

```yaml
# Check GitHub Actions logs
# Look for:
- RANCHER_URL value
- Installation success messages
- Network connectivity
```

## Test Data Issues

### Clean State Between Tests

```typescript
beforeEach(() => {
  cy.login();
  cy.visit('/');
  
  // Clean up from previous tests
  cy.deleteAllFleetRepos();
  cy.deleteAllUsers(); // if testing RBAC
  cy.deleteClusterGroups(); // if testing cluster groups
});
```

### Verify Test Prerequisites

```typescript
before(() => {
  // Verify downstream cluster exists
  cy.visit('/c/local/explorer');
  cy.contains('imported-0').should('be.visible');
});

it('test requiring downstream cluster', () => {
  // Test implementation
});
```

## Memory Issues

### Symptom: Browser crashes or "Out of memory"

**Solutions**:

Already configured in `cypress.config.ts`:
```typescript
experimentalMemoryManagement: true,
```

Browser launch args in config:
```typescript
"--js-flags=--max-old-space-size=3500"
"--disable-gpu"
"--no-sandbox"
```

If still having issues:
```bash
# Reduce test concurrency
npx cypress run --spec "tests/cypress/e2e/unit_tests/p0_fleet.spec.ts"
# Run one spec at a time instead of all
```

## Intercepting Network Requests

```typescript
// Intercept and debug API calls
cy.intercept('POST', '**/v1/fleet.cattle.io.gitrepos').as('createRepo');
cy.addFleetGitRepo({ repoName: 'test', repoUrl: 'https://...' });
cy.wait('@createRepo').then((interception) => {
  cy.log('Request:', JSON.stringify(interception.request.body));
  cy.log('Response:', JSON.stringify(interception.response.body));
});
```

## Common Gotchas

### 1. Using cy.wait() incorrectly

```typescript
// ❌ Bad - arbitrary wait
cy.wait(5000);

// ✅ Good - wait for specific condition
cy.contains('Loading...').should('not.exist');

// ✅ Good - wait for intercept
cy.intercept('GET', '**/gitrepos').as('getRepos');
cy.wait('@getRepos');
```

### 2. Not handling async properly

```typescript
// ❌ Bad - accessing value outside chain
let repoName;
cy.get('.repo-name').then($el => {
  repoName = $el.text();
});
cy.log(repoName); // undefined!

// ✅ Good - stay in chain
cy.get('.repo-name').then($el => {
  const repoName = $el.text();
  cy.log(repoName);
});
```

### 3. Not checking element visibility

```typescript
// ❌ Bad - might click hidden element
cy.get('.button').click();

// ✅ Good - ensure visible first
cy.get('.button').should('be.visible').click();
```

## Getting Help

1. **Check test video/screenshot** - Visual proof of what happened
2. **Run in headed mode** - See test execute in real browser
3. **Add cy.pause()** - Pause and inspect manually
4. **Check CI logs** - Full Ginkgo + Cypress output
5. **Compare with passing version** - What changed?

## Useful Debug Snippets

```typescript
// Log all commands
Cypress.on('command:start', (cmd) => {
  console.log(`Command: ${cmd.attributes.name}`);
});

// Catch errors
Cypress.on('fail', (error) => {
  console.error('Test failed:', error.message);
  throw error;
});

// Take screenshot before each command (slow!)
beforeEach(() => {
  let commandIndex = 0;
  Cypress.on('command:start', () => {
    cy.screenshot(`command-${commandIndex++}`);
  });
});
```
