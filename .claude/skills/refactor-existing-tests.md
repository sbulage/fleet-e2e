---
name: refactor-existing-tests
description: Improve existing test structure, consolidate duplicated code, and update to use newer custom commands
---

# Refactor Existing Tests

Use this skill for periodic test cleanup and improvement (separate PRs, outside ticket scope).

## When to Refactor

**Good times for refactoring**:
- ✅ Quarterly test maintenance sprints
- ✅ After adding new custom commands
- ✅ When noticing repeated patterns
- ✅ Before major feature additions
- ✅ When tests become hard to maintain

**Bad times**:
- ❌ While implementing feature tickets
- ❌ During urgent bug fixes
- ❌ Right before releases
- ❌ When tests are failing

## Refactoring Patterns

### Pattern 1: Extract Repeated Code to Custom Command

**Before**: Duplicated code in multiple tests

```typescript
// In test 1
cy.visit('/c/local/fleet/fleet.cattle.io.gitrepo');
cy.get('[data-testid="create-button"]').click();
cy.get('input[name="name"]').type(repoName);
cy.get('input[name="url"]').type(repoUrl);
cy.clickButton('Create');

// In test 2
cy.visit('/c/local/fleet/fleet.cattle.io.gitrepo');
cy.get('[data-testid="create-button"]').click();
cy.get('input[name="name"]').type(repoName);
cy.get('input[name="url"]').type(repoUrl);
cy.clickButton('Create');
```

**After**: Using custom command

```typescript
// In both tests
cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
cy.clickButton('Create');
```

**Process**:
1. Identify repeated pattern (used 3+ times)
2. Create custom command in separate PR
3. Update all tests to use new command in another PR

### Pattern 2: Consolidate Similar Tests

**Before**: Multiple tests doing almost the same thing

```typescript
it('test GitHub private repo', () => {
  const repoUrl = 'https://github.com/user/repo.git';
  cy.addFleetGitRepo({ repoName, repoUrl, gitAuthType: 'http', ... });
  cy.checkGitRepoStatus(repoName, '1 / 1');
});

it('test GitLab private repo', () => {
  const repoUrl = 'https://gitlab.com/user/repo.git';
  cy.addFleetGitRepo({ repoName, repoUrl, gitAuthType: 'http', ... });
  cy.checkGitRepoStatus(repoName, '1 / 1');
});

it('test Bitbucket private repo', () => {
  const repoUrl = 'https://bitbucket.org/user/repo.git';
  cy.addFleetGitRepo({ repoName, repoUrl, gitAuthType: 'http', ... });
  cy.checkGitRepoStatus(repoName, '1 / 1');
});
```

**After**: Data-driven test

```typescript
const repoTestData = [
  {qase_id: 6, provider: 'GitLab', repoUrl: 'https://gitlab.com/...'},
  {qase_id: 7, provider: 'Gh', repoUrl: 'https://github.com/...'},
  {qase_id: 8, provider: 'Bitbucket', repoUrl: 'https://bitbucket.org/...'},
];

repoTestData.forEach(({ qase_id, provider, repoUrl }) => {
  it(qase(qase_id, `FLEET-${qase_id}: Test ${provider} private repo`), 
    { tags: `@fleet-${qase_id}` }, () => {
    
    const userOrPublicKey = Cypress.expose(`${provider.toLowerCase()}_private_user`);
    const pwdOrPrivateKey = Cypress.expose(`${provider.toLowerCase()}_private_pwd`);
    
    cy.addFleetGitRepo({ repoName, repoUrl, gitAuthType: 'http', userOrPublicKey, pwdOrPrivateKey });
    cy.checkGitRepoStatus(repoName, '1 / 1');
  });
});
```

### Pattern 3: Replace Hard-Coded Selectors with Custom Commands

**Before**: Direct DOM manipulation

```typescript
cy.get('.search > input').focus().clear().type(repoName);
cy.get('[data-testid="sortable-table-0-row"]').should('contain', repoName);
```

**After**: Using custom command

```typescript
cy.filterInSearchBox(repoName);
cy.verifyTableRow(0, repoName);
```

### Pattern 4: Extract Magic Numbers and Strings

**Before**: Hard-coded values scattered throughout

```typescript
cy.wait(2000);
cy.get('td').contains('Active', { timeout: 120000 });
cy.contains('There are no rows to show.');
```

**After**: Using constants

```typescript
// At top of file or in commands.ts
export const DEFAULT_TIMEOUT = 120000;
export const noRowsMessages = ['There are no rows to show.', 'There are no rows which match your search query.'];

// In test
cy.get('td').contains('Active', { timeout: DEFAULT_TIMEOUT });
cy.get('td > span').invoke('text').should('be.oneOf', noRowsMessages);
```

### Pattern 5: Simplify Complex Conditionals

**Before**: Nested version checks

```typescript
const version = Cypress.expose('rancher_version');
if (version.includes('2.14') || version.includes('2.15') || version.includes('2.16')) {
  if (version.includes('head') || version.includes('alpha')) {
    // New UI
  } else {
    // Stable UI
  }
} else {
  // Old UI
}
```

**After**: Clear version check

```typescript
if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
  // New UI (2.12+)
} else {
  // Old UI
}
```

### Pattern 6: Remove Obsolete Code

**Before**: Code for unsupported versions

```typescript
const version = Cypress.expose('rancher_version');

if (/\/2\.7/.test(version)) {
  // Very old UI (2.7 is EOL)
  cy.get('#old-menu').click();
} else if (/\/2\.11/.test(version)) {
  // Old UI
  cy.get('.menu-v2').click();
} else {
  // New UI
  cy.get('.menu-v3').click();
}
```

**After**: Remove EOL version code

```typescript
if (/\/2\.11/.test(Cypress.expose('rancher_version'))) {
  // Old UI (2.11 - still supported weekly)
  cy.get('.menu-v2').click();
} else {
  // New UI (2.12+)
  cy.get('.menu-v3').click();
}
```

## Refactoring Checklist

Before refactoring:
- [ ] Create new branch for refactoring
- [ ] Run all tests to ensure they pass
- [ ] Document what you're refactoring and why
- [ ] Keep changes focused (one pattern at a time)

During refactoring:
- [ ] **DO NOT change test behavior** - only structure
- [ ] **DO NOT modify indentation** of unchanged code
- [ ] Update tests incrementally (file by file)
- [ ] Run tests after each change
- [ ] Commit frequently with clear messages

After refactoring:
- [ ] Run full test suite on all supported versions
- [ ] Compare test results before/after
- [ ] Update documentation if needed
- [ ] Create PR with clear description

## Refactoring Strategies

### Strategy 1: One File at a Time

```bash
# Refactor one spec file
git checkout -b refactor/improve-p0-fleet-tests

# Make changes to single file
# tests/cypress/e2e/unit_tests/p0_fleet.spec.ts

# Test just that file
npx cypress run -C cypress.config.ts --spec cypress/e2e/unit_tests/p0_fleet.spec.ts

# Commit
git add tests/cypress/e2e/unit_tests/p0_fleet.spec.ts
git commit -m "refactor: extract repeated code in p0_fleet.spec.ts"

# Continue with next file
```

### Strategy 2: One Pattern at a Time

```bash
# Refactor all instances of one pattern across files
git checkout -b refactor/use-filterInSearchBox-command

# Find all instances
grep -rn "\.search > input" cypress/e2e/unit_tests/*.spec.ts

# Replace with custom command
# ... make changes ...

# Test all affected files
npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts

# Commit
git commit -m "refactor: replace direct search input with filterInSearchBox command"
```

### Strategy 3: Create Command First, Update Tests Later

```bash
# PR 1: Add new custom command
git checkout -b feat/add-new-command
# Add command to commands.ts and e2e.ts
# Test command works
git commit -m "feat: add checkBundleStatus custom command"

# PR 2: Update tests to use new command
git checkout -b refactor/use-checkBundleStatus
# Update tests
git commit -m "refactor: use checkBundleStatus instead of manual checks"
```

## Common Refactoring Opportunities

### Opportunity 1: Repeated beforeEach Cleanup

**Pattern**:
```typescript
// In multiple spec files
beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});
```

**Consider**: Is this needed in all tests? Can we make it more specific?

```typescript
// More targeted
beforeEach(() => {
  cy.login();
  cy.visit('/');
});

afterEach(() => {
  // Only cleanup if test created resources
  cy.deleteAllFleetRepos();
});
```

### Opportunity 2: Hardcoded Waits

**Find**: `cy.wait(number)`

```bash
grep -rn "cy.wait([0-9]" cypress/e2e/unit_tests/*.spec.ts
```

**Replace** with proper waits:

```typescript
// ❌ Bad
cy.clickButton('Create');
cy.wait(5000);
cy.contains('Created');

// ✅ Good
cy.clickButton('Create');
cy.contains('Created', { timeout: 10000 }).should('be.visible');
```

### Opportunity 3: Inconsistent Naming

**Find**: Different names for same concept

```typescript
// Some tests use:
const repoName = 'test-repo';

// Others use:
const gitRepoName = 'test-repo';

// Others use:
const name = 'test-repo';
```

**Standardize**:

```typescript
// Use consistent naming across all tests
const repoName = 'test-repo';
```

### Opportunity 4: Unused Variables

```bash
# Find potential unused variables (manual review needed)
grep -rn "const.*=" cypress/e2e/unit_tests/*.spec.ts | \
  grep -v "Cypress.expose" | \
  head -20
```

### Opportunity 5: Commented Out Code

```bash
# Find commented code
grep -rn "^[ ]*\/\/" cypress/e2e/unit_tests/*.spec.ts | grep -v "Copyright"
```

**Action**: Delete or document why it's commented

## Refactoring Anti-Patterns (DON'T DO)

### ❌ Anti-Pattern 1: Refactor While Fixing Bug

```typescript
// BAD: Mixing refactoring with bug fix
git commit -m "fix: correct Git repo creation and refactor test structure and update selectors and improve naming"

// GOOD: Separate commits
git commit -m "fix: correct Git repo creation timeout"
git commit -m "refactor: extract repeated code to custom command"
```

### ❌ Anti-Pattern 2: Change Test Behavior

```typescript
// BAD: Changing what test verifies during refactor
- cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
+ cy.checkGitRepoStatus(repoName, '1 / 1'); // Removed resource check

// GOOD: Keep same verification
- cy.get('td').contains('1 / 1');
- cy.get('td').contains('6 / 6');
+ cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
```

### ❌ Anti-Pattern 3: Over-Abstraction

```typescript
// BAD: Creating command used only once
Cypress.Commands.add('clickCreateButtonThenTypeRepoNameThenClickNext', (name) => {
  cy.clickButton('Create');
  cy.typeValue('Name', name);
  cy.clickButton('Next');
});

// GOOD: Keep inline if used once, or make more general
cy.clickButton('Create');
cy.typeValue('Name', repoName);
cy.clickButton('Next');
```

### ❌ Anti-Pattern 4: Reformatting Everything

```typescript
// BAD: Changing indentation, spacing, quotes throughout file
// This creates huge diffs and makes review difficult

// GOOD: Only change what needs to change
```

## Measuring Refactoring Success

### Before Refactoring

```bash
# Count lines of code
wc -l cypress/e2e/unit_tests/*.spec.ts

# Count duplicated code
# (manual inspection or use tools)

# Test execution time
time npx cypress run -C cypress.config.ts cypress/e2e/unit_tests/*.spec.ts
```

### After Refactoring

```bash
# Compare metrics
# - Lines of code should reduce (or stay same)
# - Duplicated code should reduce
# - Test execution time should be similar or better
# - All tests should still pass

# Verify no behavior change
diff old-test-results.json new-test-results.json
```

## Refactoring PR Template

```markdown
## Refactoring: [What You're Improving]

### What Changed
- Extracted repeated Git repo creation code to `addFleetGitRepo` command
- Updated 15 tests in p0_fleet.spec.ts and p1_fleet.spec.ts

### Why
- Reduced code duplication (500 lines → 200 lines)
- Makes tests easier to maintain
- New command can be reused in future tests

### Testing
- [x] All tests pass on Rancher 2.14
- [x] All tests pass on Rancher 2.11
- [x] Compared test results before/after (no behavior change)
- [x] Manual review of changed tests

### Checklist
- [x] No test behavior changed
- [x] No indentation changes to unchanged code
- [x] Tests still pass on all supported versions
- [x] Custom command added to e2e.ts type declarations
```

## Automated Refactoring Tools

### Find Repeated Code Blocks

```bash
cat > find-duplicates.sh << 'EOF'
#!/bin/bash

# Find repeated cy command sequences (3+ lines)
# This is a simple heuristic, manual review needed

for file in cypress/e2e/unit_tests/*.spec.ts; do
  echo "Analyzing $file..."
  
  # Extract cy command sequences
  grep "cy\." "$file" | \
    head -20 | \
    sort | \
    uniq -c | \
    sort -rn | \
    awk '$1 > 2 {print "Repeated " $1 " times: " $2}'
done
EOF

chmod +x find-duplicates.sh
./find-duplicates.sh
```

### Check for Unused Imports

```bash
# Find imports that might not be used
for file in cypress/e2e/unit_tests/*.spec.ts; do
  echo "Checking $file"
  grep "^import" "$file" | while read import; do
    symbol=$(echo "$import" | sed -E "s/import .* from '([^']+)'.*/\1/")
    if ! grep -q "$symbol" "$file" | grep -v "^import"; then
      echo "  Potentially unused: $import"
    fi
  done
done
```

## Refactoring Schedule

Suggested quarterly schedule:

**Q1**: Focus on command extraction
- Identify repeated patterns
- Create new commands
- Update tests to use new commands

**Q2**: Focus on consolidation
- Merge similar tests
- Use data-driven approaches
- Remove duplicate code

**Q3**: Focus on cleanup
- Remove obsolete code
- Update for new Rancher versions
- Improve naming

**Q4**: Focus on performance
- Optimize slow tests
- Reduce unnecessary waits
- Improve test execution time

## Best Practices

1. **Small PRs**: One refactoring pattern per PR
2. **Separate concerns**: Don't mix refactoring with features/fixes
3. **Test extensively**: Run on all supported Rancher versions
4. **Document why**: Explain what you're improving
5. **Get review**: Have another QA engineer review
6. **No behavior changes**: Tests should verify same things
7. **Keep working tests**: Don't break passing tests
