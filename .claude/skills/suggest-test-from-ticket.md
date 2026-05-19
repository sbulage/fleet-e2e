---
name: suggest-test-from-ticket
description: Analyze QA tickets and suggest automated test implementations using existing custom commands
---

# Suggest Test from Ticket

Use this skill when given a QA ticket, bug report, or feature request to suggest automated test implementation.

## Core Principle

**ALWAYS use existing custom commands.** Do NOT reinvent the wheel by creating new implementations of existing functionality.

## Process

### 1. Analyze the Ticket

Read the ticket and identify:
- **What is being tested**: Feature, bug fix, regression, integration
- **Test scope**: UI, API, infrastructure, end-to-end
- **Test type**: Positive case, negative case, edge case, performance
- **Preconditions**: What setup is needed
- **Expected outcome**: What should happen

### 2. Check Existing Commands

Before suggesting ANY implementation, review existing custom commands in:
- `tests/cypress/support/commands.ts` - All custom Cypress commands
- `tests/e2e/suite_test.go` - Ginkgo helper functions

**Available Cypress Commands** (check current list):
- Git Repo: `addFleetGitRepo`, `checkGitRepoStatus`, `deleteAllFleetRepos`
- Application: `checkApplicationStatus`, `deleteApplicationDeployment`, `modifyDeployedApplication`
- Cluster: `assignClusterLabel`, `createClusterGroup`, `moveClusterToWorkspace`
- RBAC: `createRoleTemplate`, `assignRoleToUser`, `createNewUser`, `deleteUser`
- Workspace: `createNewFleetWorkspace`, `continuousDeliveryWorkspacesMenu`
- Navigation: `continuousDeliveryMenuSelection`, `fleetNamespaceToggle`
- Utilities: `importYaml`, `verifyTableRow`, `filterInSearchBox`

**Available Ginkgo Helpers**:
- `RunHelmCmdWithRetry` - Helm operations with retry
- `kubectl.Run` - kubectl commands
- `rancher.GetToken` - Get Rancher API token
- `tools.SetTimeout` - Timeout with multiplier

### 3. Map Ticket to Commands

Identify which existing commands accomplish the ticket requirements:

**Example Ticket**: "Test that GitRepo with SSH authentication deploys nginx to local cluster"

**Mapping**:
1. ✅ Create repo with SSH auth → `addFleetGitRepo({ gitAuthType: 'ssh', ... })`
2. ✅ Check repo status → `checkGitRepoStatus(repoName, '1 / 1', '6 / 6')`
3. ✅ Verify app deployed → `checkApplicationStatus('nginx', 'local')`
4. ✅ Cleanup → `deleteAllFleetRepos()`

### 4. Suggest Test Implementation

Provide complete test using existing commands:

```typescript
it(qase(123, 'FLEET-123: Test GitRepo SSH auth deploys nginx'), { tags: '@fleet-123' }, () => {
  const repoName = 'ssh-auth-test';
  const repoUrl = 'git@github.com:rancher/fleet-examples.git';
  const publicKey = Cypress.expose('rsa_public_key_qa');
  const privateKey = Cypress.expose('rsa_private_key_qa');

  cy.addFleetGitRepo({
    repoName,
    repoUrl,
    branch: 'master',
    path: 'simple',
    gitAuthType: 'ssh',
    userOrPublicKey: publicKey,
    pwdOrPrivateKey: privateKey,
    local: true
  });

  cy.clickButton('Create');
  cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
  cy.checkApplicationStatus('nginx', 'local');
  cy.deleteAllFleetRepos();
});
```

### 5. Identify Gaps (If Any)

If ticket requires functionality not covered by existing commands, note it:

**Missing**: "Need to verify bundle modification timestamp"
**Suggestion**: "Could add `checkBundleTimestamp(bundleName, expectedAge)` command in separate PR"

But for the ticket implementation, use workaround with existing commands:

```typescript
// Temporary workaround using existing commands
cy.continuousDeliveryBundlesMenu();
cy.filterInSearchBox(bundleName);
cy.get('[data-testid="sortable-cell-0-0"]').should('contain', bundleName);
```

## Examples

### Example 1: Feature Test

**Ticket**: "Verify Fleet can deploy Helm chart to cluster group with 2 clusters"

**Analysis**:
- Create cluster group with 2 clusters
- Deploy Git repo with Helm chart to cluster group
- Verify deployment on both clusters

**Suggested Test**:

```typescript
it(qase(200, 'FLEET-200: Deploy Helm chart to cluster group'), { tags: '@fleet-200' }, () => {
  const repoName = 'helm-chart-cluster-group';
  const clusterGroupName = 'test-cluster-group';
  
  // Use existing commands
  cy.createClusterGroup(clusterGroupName, 'env', 'test', /Cluster group .* created/);
  cy.clusterCountClusterGroup(clusterGroupName, 2);
  
  cy.addFleetGitRepo({
    repoName,
    repoUrl: 'https://github.com/rancher/fleet-examples',
    branch: 'master',
    path: 'helm',
    deployToTarget: clusterGroupName
  });
  
  cy.clickButton('Create');
  cy.checkGitRepoStatus(repoName, '2 / 2');
  
  // Verify on both clusters
  cy.checkApplicationStatus('helm-app', 'imported-0');
  cy.checkApplicationStatus('helm-app', 'imported-1');
  
  cy.deleteAllFleetRepos();
  cy.deleteClusterGroups();
});
```

### Example 2: Bug Regression Test

**Ticket**: "Bug: Deleting Git repo doesn't clean up resources on cluster"

**Analysis**:
- Create and deploy Git repo
- Verify resources exist on cluster
- Delete Git repo
- Verify resources are removed

**Suggested Test**:

```typescript
it(qase(201, 'FLEET-201: Regression - Git repo deletion cleans up resources'), { tags: '@fleet-201' }, () => {
  const repoName = 'cleanup-test';
  const appName = 'nginx';
  
  // Deploy app
  cy.addFleetGitRepo({
    repoName,
    repoUrl: 'https://github.com/rancher/fleet-examples',
    branch: 'master',
    path: 'simple',
    local: true
  });
  
  cy.clickButton('Create');
  cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
  cy.checkApplicationStatus(appName, 'local');
  
  // Delete repo
  cy.deleteAllFleetRepos();
  
  // Verify resources cleaned up
  cy.checkApplicationStatus(appName, 'local', 'Only User Namespaces', false);
});
```

### Example 3: RBAC Test

**Ticket**: "Test custom role with GitRepo GET/LIST permissions"

**Analysis**:
- Create custom role template
- Create test user with that role
- Login as test user
- Verify can view repos but not create

**Suggested Test**:

```typescript
it(qase(202, 'FLEET-202: Custom role GitRepo read-only permissions'), { tags: '@fleet-202' }, () => {
  const roleName = 'fleet-readonly';
  const userName = 'testuser';
  const userPassword = 'Test@123';
  
  // Create role with existing command
  cy.createRoleTemplate({
    roleType: 'Global',
    roleName: roleName,
    rules: [
      { resource: 'GitRepo', verbs: ['GET', 'LIST'] }
    ]
  });
  
  // Create user with existing command
  cy.createNewUser(userName, userPassword, roleName);
  
  // Logout and login as test user
  cy.logout();
  cy.login(userName, userPassword);
  
  // Verify can access Git Repos page
  cy.continuousDeliveryMenuSelection();
  cy.contains('Git Repos').should('be.visible');
  
  // Verify cannot create (button should not exist or be disabled)
  cy.checkAccessToCreateGitRepoPage(); // Existing command checks permissions
  
  // Cleanup
  cy.logout();
  cy.login(); // Login as admin
  cy.deleteUser(userName);
  cy.deleteRole(roleName, 'Global');
});
```

### Example 4: Negative Test

**Ticket**: "Test that invalid Git URL shows appropriate error"

**Analysis**:
- Try to create Git repo with invalid URL
- Verify error message appears

**Suggested Test**:

```typescript
it(qase(203, 'FLEET-203: Invalid Git URL shows error'), { tags: '@fleet-203' }, () => {
  const repoName = 'invalid-url-test';
  const invalidUrl = 'not-a-valid-url';
  
  cy.continuousDeliveryMenuSelection();
  cy.clickCreateGitRepo(true);
  cy.typeValue('Name', repoName);
  cy.clickButton('Next');
  cy.typeValue('Repository URL', invalidUrl);
  cy.typeValue('Branch Name', 'main');
  cy.clickButton('Next');
  cy.clickButton('Next');
  cy.clickButton('Create');
  
  // Verify error appears
  cy.contains(/Invalid.*URL|Error.*repository/i).should('be.visible');
  
  // Cleanup - close create dialog
  cy.clickButton('Cancel');
});
```

## When Existing Commands Are Not Enough

### Option 1: Workaround with Existing Commands

Use lower-level commands to accomplish the task:

```typescript
// Instead of hypothetical `checkBundleCount(repoName, expectedCount)`
// Use existing commands:
cy.continuousDeliveryBundlesMenu();
cy.filterInSearchBox(repoName);
cy.get('[data-testid="sortable-table-0-row"]').should('have.length', expectedCount);
```

### Option 2: Note for Future Command

Suggest test implementation with workaround, but note:

```typescript
it(qase(204, 'FLEET-204: Test description'), { tags: '@fleet-204' }, () => {
  // TODO: Consider adding `checkBundleCount` custom command in separate PR
  // For now, using direct selectors
  
  cy.continuousDeliveryBundlesMenu();
  cy.filterInSearchBox(repoName);
  cy.get('[data-testid="sortable-table-0-row"]').should('have.length', 2);
});
```

### Option 3: Suggest New Command (Separate from Ticket)

"This ticket can be implemented with existing commands (see above), but we should consider adding `checkBundleCount` command in a separate PR for better reusability."

## Test Structure Checklist

Every suggested test should include:

- ✅ Copyright header
- ✅ `qase()` wrapper with test ID
- ✅ Tags (`@fleet-{id}`, priority tags)
- ✅ Descriptive test name
- ✅ Setup using existing commands
- ✅ Execution using existing commands
- ✅ Verification using existing commands
- ✅ Cleanup using existing commands
- ✅ Comments only where non-obvious

## What NOT to Do

❌ **Don't reinvent existing commands**:
```typescript
// ❌ Bad - reimplementing existing functionality
cy.visit('/c/local/fleet/fleet.cattle.io.gitrepo');
cy.get('[data-testid="create-button"]').click();
cy.get('input[name="name"]').type(repoName);

// ✅ Good - use existing command
cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
```

❌ **Don't suggest creating new commands in the ticket scope**:
```typescript
// ❌ Bad suggestion
"First, add this new command to commands.ts:
Cypress.Commands.add('myNewCommand', () => { ... })

Then use it in the test..."

// ✅ Good suggestion
"Use existing commands for this ticket:
cy.continuousDeliveryMenuSelection();
cy.filterInSearchBox(...);

Note: If this pattern is used frequently, consider adding a 
dedicated command in a separate refactoring PR."
```

❌ **Don't use hard-coded selectors when commands exist**:
```typescript
// ❌ Bad
cy.get('.search > input').type(repoName);

// ✅ Good
cy.filterInSearchBox(repoName);
```

## Output Format

When suggesting a test, provide:

1. **Summary**: What the test does (1-2 sentences)
2. **File Location**: Which spec file it should go in
3. **Test Implementation**: Complete test code using existing commands
4. **Notes**: Any limitations, assumptions, or future improvements
5. **Commands Used**: List of existing commands used (for transparency)

**Example Output**:

```markdown
## Test Suggestion for FLEET-123

**Summary**: Tests that Git repos with SSH authentication can deploy applications to the local cluster.

**File**: `tests/cypress/e2e/unit_tests/p0_fleet.spec.ts`

**Implementation**:
[test code here]

**Commands Used**:
- `addFleetGitRepo` - Creates Git repo with SSH auth
- `checkGitRepoStatus` - Verifies repo active with correct bundle/resource count
- `checkApplicationStatus` - Verifies application deployed to cluster
- `deleteAllFleetRepos` - Cleanup

**Notes**: 
- Uses existing SSH key environment variables (rsa_public_key_qa, rsa_private_key_qa)
- Should run in @p0 or @p1 suite depending on priority
```

## Periodic Command Review (Out of Scope)

Periodically (separate PRs, NOT in ticket scope), review:
- Duplicated patterns that could be commands
- Commands that could be simplified
- Commands that need better parameters
- Commands that are no longer used

This is a **separate** concern from implementing ticket tests.
