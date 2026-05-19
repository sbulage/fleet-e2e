---
name: write-cypress-test
description: Write new Cypress test specs using existing custom commands and following repository patterns
---

# Write Cypress Test

Use this skill to write new Cypress test specifications in the Fleet E2E test suite.

## File Location

All Cypress test specs MUST be created in: `tests/cypress/e2e/unit_tests/`

## Existing Custom Commands

ALWAYS use existing custom commands instead of recreating functionality. Available commands include:

### Git Repo Management
- `cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey, local })` - Add Fleet Git repository
- `cy.checkGitRepoStatus(repoName, bundles, resources, options)` - Verify repo status
- `cy.deleteAllFleetRepos(namespaceName)` - Delete all Fleet repos
- `cy.gitRepoAuth(gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex)` - Configure authentication
- `cy.addFleetRepoFromYaml(yamlFilePath, fleetNamespace)` - Add repo from YAML file

### Application Management
- `cy.checkApplicationStatus(appName, clusterName, appNamespace, present, firstNav, resourceToCheck)` - Check app status
- `cy.deleteApplicationDeployment(clusterName)` - Delete application deployment
- `cy.modifyDeployedApplication(appName, clusterName)` - Modify deployed app

### Cluster & Workspace Management
- `cy.assignClusterLabel(clusterName, key, value)` - Assign labels to clusters
- `cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert)` - Create cluster groups
- `cy.deleteClusterGroups()` - Delete all cluster groups
- `cy.moveClusterToWorkspace(clusterName, workspaceName, timeout, restore)` - Move cluster between workspaces
- `cy.createNewFleetWorkspace(newWorkspaceName)` - Create new workspace

### RBAC & Users
- `cy.createRoleTemplate(roleType, roleName, newUserDefault, rules)` - Create role template
- `cy.assignRoleToUser(userName, roleName)` - Assign role to user
- `cy.createNewUser(username, password, role, uncheckStandardUser)` - Create new user
- `cy.deleteUser(userName)` - Delete user
- `cy.deleteAllUsers()` - Delete all users
- `cy.deleteRole(roleName, roleTypeTemplate)` - Delete role

### Navigation & UI Utilities
- `cy.fleetNamespaceToggle(toggleOption)` - Switch Fleet namespace
- `cy.continuousDeliveryMenuSelection()` - Navigate to Continuous Delivery menu
- `cy.continuousDeliveryWorkspacesMenu()` - Navigate to workspaces
- `cy.filterInSearchBox(filterText)` - Filter in search box
- `cy.verifyTableRow(rowNumber, expectedText1, expectedText2, timeout)` - Verify table row content
- `cy.nameSpaceMenuToggle(namespaceName)` - Toggle namespace menu

### YAML & Kubernetes Resources
- `cy.importYaml({ clusterName, yamlFilePath })` - Import YAML into cluster
- `cy.createConfigMap(configMapName)` - Create ConfigMap
- `cy.deleteConfigMap(configMapName, clusterName)` - Delete ConfigMap

### Library Commands (from @rancher-ecp-qa/cypress-library)
- `cy.login()` - Login to Rancher
- `cy.clickButton(buttonText)` - Click button by text
- `cy.typeValue(label, value)` - Type value into labeled field
- `cy.burgerMenuToggle()` - Toggle burger menu

## Test Structure Pattern

```typescript
/*
Copyright © 2023 - 2026 SUSE LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import 'cypress/support/commands';

// Constants at the top
export const constantName = "value";

// beforeEach hook for common setup
beforeEach(() => {
  cy.login();
  cy.visit('/');
  // Add any common cleanup
});

// Describe block with tags
describe('Test Description', { tags: ['@p0', '@pr-tests'] }, () => {
  
  // Test with qase integration and tags
  it(qase(123, 'FLEET-123: Test description'), { tags: '@fleet-123' }, () => {
    // Test implementation using custom commands
  });

});
```

## Required Patterns

1. **Always include copyright header** at the top of new files
2. **Import commands**: `import 'cypress/support/commands';`
3. **Use qase() wrapper**: `it(qase(ID, 'FLEET-ID: Description'), { tags: '@fleet-ID' }, () => {})`
4. **Add tags**: Include priority tags (`@p0`, `@p1`) and test ID tags (`@fleet-123`)
5. **Use beforeEach**: For login and cleanup operations
6. **Use Cypress.expose()**: For environment variables (e.g., `Cypress.expose('rancher_version')`)

## Tag System

- `@login` - First login tests
- `@p0` - Priority 0 (highest)
- `@p1` - Priority 1
- `@pr-tests` - Run on PR validation
- `@smoke` - Smoke tests
- `@fleet-{number}` - Individual test ID

## Environment Variables

Access environment variables using `Cypress.expose('variable_name')`:

Common variables:
- `rancher_version` - Rancher version
- `rancher_url` - Rancher URL
- `rancher_user` - Rancher username
- `rancher_password` - Rancher password
- `gitlab_private_user`, `gh_private_user`, etc. - Git provider credentials
- `rsa_private_key_qa`, `rsa_public_key_qa` - SSH keys

## TypeScript Type Safety

When using test data arrays, define the type:

```typescript
type testData = {
  qase_id: number;
  provider: string;
  repoUrl: string;
}

const repoTestData: testData[] = [
  {qase_id: 6, provider: 'GitLab', repoUrl: 'https://...'},
];

repoTestData.forEach(({ qase_id, provider, repoUrl }) => {
  it(qase(qase_id, `FLEET-${qase_id}: Description`), { tags: `@fleet-${qase_id}` }, () => {
    // Test implementation
  });
});
```

## Code Style Rules

1. **DO NOT suggest indentation changes** to existing code unless explicitly asked
2. **DO NOT modify existing functions** - use them as-is
3. **Follow existing patterns** - match the style of similar tests
4. **Use 2-space indentation** for new code
5. **Use arrow functions** for callbacks
6. **Use template literals** for strings with variables
7. **Keep test files organized** by functionality, not alphabetically

## Naming Conventions

- Test files: `{priority}_fleet.spec.ts` or `{functionality}_fleet.spec.ts`
- Repo names in tests: `{cluster}-fleet-{qase_id}` (e.g., `local-cluster-fleet-62`)
- Constants: `camelCase`
- Variables: `camelCase`

## Version-Specific Tests

Check Rancher version when needed:

```typescript
if (!/\/2\.11/.test(Cypress.expose('rancher_version'))) {
  // Run test only for versions newer than 2.11
}

// Or use the helper constant
import { supported_versions_212_and_above } from 'cypress/support/commands';

if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
  // Run test for 2.12 and above
}
```

## When Writing Tests

1. **Check existing commands first** - Don't reinvent the wheel
2. **Use descriptive test names** - Include FLEET-ID and clear description
3. **Add cleanup** - Use `deleteAllFleetRepos()`, `deleteAllUsers()`, etc. in beforeEach/afterEach
4. **Add retries for flaky tests**: `{ retries: 1 }` in test options
5. **Use proper timeouts** - Custom commands have defaults, override if needed
6. **Test positive and negative cases** - Not just happy path
7. **Verify state changes** - Don't just create, also verify with check commands

## DO NOT

- ❌ Create new custom commands in test spec files (add them to `commands.ts` instead)
- ❌ Modify indentation of existing code
- ❌ Use `cy.get()` directly when a custom command exists
- ❌ Hard-code credentials (use `Cypress.expose()`)
- ❌ Skip cleanup in beforeEach/afterEach
- ❌ Forget to add tags for CI filtering
- ❌ Create tests without qase() wrapper
