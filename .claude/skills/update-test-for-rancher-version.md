---
name: update-test-for-rancher-version
description: Update tests to handle Rancher version-specific UI changes and differences
---

# Update Test for Rancher Version

Use this skill when tests fail due to Rancher version differences or when updating tests to support new/old Rancher versions.

## Common Version Changes

Rancher UI changes between versions. Tests must handle these differences.

## Check Rancher Version in Tests

### Using Cypress.expose()

```typescript
const rancherVersion = Cypress.expose('rancher_version');

// Check specific version
if (/\/2\.11/.test(rancherVersion)) {
  // 2.11-specific behavior
}

if (/\/2\.14/.test(rancherVersion)) {
  // 2.14-specific behavior
}
```

### Using Helper Constants

Available in `commands.ts`:

```typescript
import { supported_versions_212_and_above } from 'cypress/support/commands';

if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
  // For 2.12 and above
} else {
  // For 2.11 and below
}
```

## Real Examples from Codebase

### Example 1: Navigation Menu Changes

**Issue**: "App Bundles" introduced in 2.12, older versions use "Git Repos"

**Solution**: (from `continuousDeliveryMenuSelection` command)

```typescript
Cypress.Commands.add('continuousDeliveryMenuSelection', () => {
  let navToAppBundles = false;
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    navToAppBundles = true;
  }
  
  if (navToAppBundles){
    cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
    cy.contains("App Bundles").should('be.visible');
  } else {
    cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
    cy.contains("Git Repos").should('be.visible');
  }
});
```

### Example 2: UI Element Selector Changes

**Issue**: Scaler UI changed between versions

**Solution**: (from `modifyDeployedApplication` command)

```typescript
if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
  // New UI (2.12+)
  cy.get('div.scaler > .value').contains('1').should('be.visible');
  cy.get('div.scaler > button.increase').should('be.visible').click();
  cy.get('div.scaler > .value').contains('2').should('be.visible');
} else {
  // Old UI (2.11 and below)
  cy.wait(500);
  cy.get('#trigger').click({ force: true });
  cy.contains('Scale').should('be.visible');
  cy.get('.icon-plus').click();
  cy.get('#trigger > .icon.icon-chevron-up').click({ force: true });
}
```

### Example 3: Different Selectors per Version Range

**Solution**: (from same command, more granular version checking)

```typescript
if (/\/2\.11/.test(Cypress.expose('rancher_version')) || 
    /\/2\.12/.test(Cypress.expose('rancher_version')) || 
    /\/2\.13/.test(Cypress.expose('rancher_version'))) {
  // Specific behavior for 2.11-2.13
  cy.get('div.plus-minus.text-right > .value').should('be.visible').contains('1');
  cy.get('div.plus-minus.text-right > .btn > .icon-plus').should('be.visible').click();
  cy.get('div.plus-minus.text-right > .value').should('be.visible').contains('2');
} else {
  // Behavior for 2.14+
  cy.get('div.scaler > .value').contains('1').should('be.visible');
  cy.get('div.scaler > button.increase').should('be.visible').click();
  cy.get('div.scaler > .value').contains('2').should('be.visible');
}
```

## Strategies for Version Handling

### 1. Feature Detection (Preferred)

Instead of version checking, detect if element exists:

```typescript
cy.get('body').then($body => {
  if ($body.text().includes('App Bundles')) {
    // New UI
    cy.contains('App Bundles').click();
  } else {
    // Old UI
    cy.contains('Git Repos').click();
  }
});
```

**Pros**: 
- More resilient to version changes
- Works even if version string is wrong

**Cons**: 
- Slower (has to wait for element)
- May not work for all cases

### 2. Version String Matching (Common)

Use regex to match version pattern:

```typescript
const version = Cypress.expose('rancher_version');

if (/\/2\.(1[4-9]|[2-9]\d+)/.test(version)) {
  // 2.14 and above
} else if (/\/2\.1[2-3]/.test(version)) {
  // 2.12-2.13
} else {
  // 2.11 and below
}
```

### 3. Version-Specific Test Skip

Skip tests that don't apply to certain versions:

```typescript
it('test only for 2.14+', () => {
  const version = Cypress.expose('rancher_version');
  
  if (!/\/2\.(1[4-9]|[2-9]\d+)/.test(version)) {
    cy.log('Skipping - test requires Rancher 2.14+');
    this.skip();
    return;
  }
  
  // Test implementation
});
```

Or use conditional describe:

```typescript
if (!/\/2\.11/.test(Cypress.expose('rancher_version'))) {
  it(qase(191, 'FLEET-191: Test only for 2.12+'), { tags: '@fleet-191' }, () => {
    // Test implementation
  });
}
```

## Common Version-Specific Issues

### Menu Navigation Changes

**Symptoms**: 
- Can't find menu item
- Navigation fails

**Debug**:
```typescript
// Log available menu items
cy.get('nav').then($nav => {
  cy.log($nav.text());
});
```

**Fix**: Add version check for different navigation paths

### Selector Changes

**Symptoms**:
- Element not found
- Wrong element clicked

**Debug**:
```typescript
// Log element attributes
cy.get('button').each($btn => {
  cy.log(`Button: ${$btn.text()} - ${$btn.attr('data-testid')}`);
});
```

**Fix**: Use data-testid when available, fallback to version-specific selectors

### API Response Format Changes

**Symptoms**:
- Unexpected data format
- Missing fields

**Debug**:
```typescript
cy.intercept('GET', '**/gitrepos').as('getRepos');
cy.wait('@getRepos').then((interception) => {
  cy.log('Response:', JSON.stringify(interception.response.body));
});
```

**Fix**: Handle both old and new response formats

## Updating Tests Step-by-Step

### Step 1: Identify Version-Specific Failure

```bash
# Run test on different versions
export RANCHER_VERSION="stable/2.14.0"
npx cypress run --spec cypress/e2e/unit_tests/failing_test.spec.ts

export RANCHER_VERSION="stable/2.11.0"
npx cypress run --spec cypress/e2e/unit_tests/failing_test.spec.ts
```

### Step 2: Find Differences

Compare screenshots or use headed mode:

```bash
# Run in headed mode to see differences
npx cypress open -C cypress.config.ts
```

### Step 3: Add Version Check

```typescript
const version = Cypress.expose('rancher_version');

if (/\/2\.14/.test(version)) {
  // New behavior
} else {
  // Old behavior
}
```

### Step 4: Test on All Supported Versions

Test matrix:
- Rancher 2.10-head (weekly)
- Rancher 2.11-head (weekly)
- Rancher 2.12-head (daily)
- Rancher 2.13-head (daily)
- Rancher 2.14-head (daily)
- Rancher-head (daily)

## Version Check Patterns

### Pattern 1: Binary Check (2 versions)

```typescript
if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
  // 2.12+
} else {
  // 2.11 and below
}
```

### Pattern 2: Multi-Version Check

```typescript
if (/\/2\.(1[4-9]|[2-9]\d+)/.test(version)) {
  // 2.14+
} else if (/\/2\.1[2-3]/.test(version)) {
  // 2.12-2.13
} else {
  // 2.11 and below
}
```

### Pattern 3: Specific Version Only

```typescript
if (/\/2\.11/.test(version)) {
  // Only for 2.11
} else {
  // All other versions
}
```

### Pattern 4: Exclude Specific Version

```typescript
if (!/\/2\.11/.test(version)) {
  // All versions except 2.11
}
```

## Helper Functions for Version Checking

Create reusable version checks:

```typescript
// At top of test file
const isVersion = (pattern: string) => {
  return new RegExp(pattern).test(Cypress.expose('rancher_version'));
};

const isVersionOrAbove = (major: number, minor: number) => {
  const version = Cypress.expose('rancher_version');
  const match = version.match(/\/2\.(\d+)/);
  if (!match) return false;
  const currentMinor = parseInt(match[1]);
  return currentMinor >= minor;
};

// Usage
if (isVersion('/2\\.14')) {
  // 2.14 specific
}

if (isVersionOrAbove(2, 12)) {
  // 2.12 and above
}
```

## Best Practices

### ✅ DO:

- Use feature detection when possible
- Add version checks in custom commands (centralized)
- Test on all supported versions before merging
- Document why version check is needed
- Use data-testid attributes (version-stable)

### ❌ DON'T:

- Hard-code version numbers in multiple places
- Assume version format will never change
- Add version checks in every test (centralize in commands)
- Use overly complex version logic
- Forget to update version checks when support drops

## Migrating Tests to New Version

When Rancher updates and breaks tests:

### Option 1: Add Version Logic

Add version-specific code to handle both old and new:

```typescript
if (isVersionOrAbove(2, 14)) {
  // New UI code
} else {
  // Old UI code (still supported)
}
```

### Option 2: Update and Drop Old Support

If old version is EOL, remove old code:

```typescript
// Remove old version support
- if (isVersion('/2\\.11')) {
-   // Old 2.11 code
- } else {
    // New code for 2.12+
- }
```

### Option 3: Skip Test on Old Versions

If feature doesn't exist in old versions:

```typescript
if (!isVersionOrAbove(2, 12)) {
  this.skip();
  return;
}
```

## Real-World Migration Example

**Scenario**: Rancher 2.15 changes "App Bundles" to "Fleet Applications"

**Before**:
```typescript
cy.contains('App Bundles').click();
```

**After** (supporting both):
```typescript
cy.get('body').then($body => {
  if ($body.text().includes('Fleet Applications')) {
    cy.contains('Fleet Applications').click();
  } else {
    cy.contains('App Bundles').click();
  }
});
```

**Or** (if dropping 2.14 support):
```typescript
cy.contains('Fleet Applications').click();
```

## Debugging Version Issues

```typescript
// Add at start of test
it('test name', () => {
  const version = Cypress.expose('rancher_version');
  cy.log(`Testing with Rancher version: ${version}`);
  
  // Take screenshot of menu
  cy.get('nav').screenshot('nav-menu-' + version.replace(/\//g, '-'));
  
  // Test implementation
});
```

## Version Constants Reference

Current CI test matrix (from README.md):

**Daily CI**:
- Rancher Head
- Rancher v2.14-Head
- Rancher v2.13-Head
- Rancher v2.12-Head

**Weekly CI**:
- Rancher v2.11-Head
- Rancher v2.10-Head

**EOL** (no longer tested):
- v2.9-head ✓
- v2.8-head ✓
- v2.7-head ✓
