---
name: add-cypress-command
description: Add new custom Cypress commands to the repository following existing patterns
---

# Add Cypress Command

Use this skill to add new custom Cypress commands to the Fleet E2E test suite.

## File Locations

Custom commands are stored in TWO files:

1. **Implementation**: `tests/cypress/support/commands.ts` - The actual command implementation
2. **Type Declaration**: `tests/cypress/support/e2e.ts` - TypeScript interface declaration

BOTH files must be updated when adding a new command.

## Implementation Pattern (commands.ts)

Add commands at the end of `tests/cypress/support/commands.ts`:

```typescript
Cypress.Commands.add('commandName', (param1, param2, optionalParam?) => {
  // Command implementation
  cy.get('selector').should('be.visible');
  // Return chainable element if needed
});
```

### Command Implementation Guidelines

1. **Use descriptive parameter names**: `repoName`, `clusterName`, not `name1`, `name2`
2. **Add optional parameters last**: Use `param?` for optional params with defaults
3. **Chain Cypress commands**: Use `cy.` for all Cypress operations
4. **Return chainable**: Commands should return Cypress chainable objects
5. **Use existing commands**: Build on top of existing custom commands
6. **Add comments**: Brief comment explaining what the command does

### Example Command Implementation

```typescript
// Check if Git repo has specific status
Cypress.Commands.add('checkGitRepoStatus', (repoName, bundles?, resources?, options?) => {
  const { timeout = 120000, repoStatus = 'Active' } = options || {};
  
  cy.contains('Git Repos').should('be.visible').click();
  cy.filterInSearchBox(repoName);
  
  if (bundles) {
    cy.verifyTableRow(0, repoName, bundles, timeout);
  }
  
  if (resources) {
    cy.get('td').contains(resources, { timeout }).should('be.visible');
  }
  
  cy.get('td').contains(repoStatus, { timeout }).should('be.visible');
});
```

## Type Declaration Pattern (e2e.ts)

Add the type declaration in the `Cypress.Chainable` interface in `tests/cypress/support/e2e.ts`:

```typescript
declare global {
  namespace Cypress {
    interface Chainable {
      // Existing commands...
      
      // Add your new command with full type signature
      commandName(param1: string, param2: string, optionalParam?: boolean): Chainable<Element>;
    }
  }
}
```

### Type Declaration Guidelines

1. **Match parameter names**: Use same names as implementation
2. **Specify types**: Use TypeScript types (string, number, boolean, object)
3. **Mark optional params**: Use `?` for optional parameters
4. **Return Chainable<Element>**: All commands should return this type
5. **Add in alphabetical order**: Keep the interface organized
6. **Use object types for complex params**: Define inline or as separate type

### Example Complex Type

```typescript
interface Chainable {
  addFleetGitRepo(options: {
    repoName: string;
    repoUrl?: string;
    branch?: string;
    path?: string;
    gitAuthType?: string;
    userOrPublicKey?: string;
    pwdOrPrivateKey?: string;
    local?: boolean;
  }): Chainable<Element>;
}
```

## Common Command Patterns

### Navigation Commands

```typescript
Cypress.Commands.add('navigateToPage', (section, subsection?) => {
  cy.burgerMenuToggle();
  cy.contains(section).click();
  if (subsection) {
    cy.contains(subsection).click();
  }
});
```

### Verification Commands

```typescript
Cypress.Commands.add('verifyElementStatus', (name, expectedStatus, timeout = 60000) => {
  cy.contains(name).should('be.visible');
  cy.get('td').contains(expectedStatus, { timeout }).should('be.visible');
});
```

### CRUD Commands

```typescript
Cypress.Commands.add('createResource', (resourceName, config?) => {
  cy.clickButton('Create');
  cy.typeValue('Name', resourceName);
  
  if (config) {
    // Apply additional config
  }
  
  cy.clickButton('Save');
  cy.contains(resourceName).should('be.visible');
});

Cypress.Commands.add('deleteResource', (resourceName) => {
  cy.filterInSearchBox(resourceName);
  cy.open3dotsMenu(resourceName, 'Delete');
  cy.clickButton('Delete');
});
```

### Cleanup Commands

```typescript
Cypress.Commands.add('deleteAllResources', () => {
  cy.visit('/resource-page');
  cy.wait(500);
  
  // Check if there are resources to delete
  cy.get('body').then($body => {
    if (!$body.text().includes('There are no rows to show')) {
      cy.deleteAll();
    }
  });
});
```

## Using Library Commands

Build on top of `@rancher-ecp-qa/cypress-library` commands:

Available library commands:
- `cy.login()` - Login to Rancher
- `cy.clickButton(text)` - Click button by text
- `cy.typeValue(label, value)` - Type into labeled field
- `cy.burgerMenuToggle()` - Toggle navigation menu
- `cy.open3dotsMenu(name, selection)` - Open action menu
- `cy.deleteAll()` - Delete all items in current view

Use these as building blocks for your custom commands.

## Environment Variables

Access environment variables in commands using `Cypress.expose()`:

```typescript
Cypress.Commands.add('loginAsTestUser', () => {
  const username = Cypress.expose('test_user');
  const password = Cypress.expose('test_password');
  
  cy.visit('/login');
  cy.typeValue('Username', username);
  cy.typeValue('Password', password);
  cy.clickButton('Login');
});
```

## Code Style Rules

1. **DO NOT suggest indentation changes** to existing code in commands.ts
2. **Add new commands at the END** of the file
3. **Use 2-space indentation** for new code
4. **Use arrow functions**: `(param) => {}`
5. **Use template literals**: `` `text ${variable}` ``
6. **Use optional chaining**: `options?.timeout`
7. **Use destructuring**: `const { timeout = 60000 } = options || {};`

## Parameter Patterns

### Using Options Object

For commands with many optional parameters, use an options object:

```typescript
Cypress.Commands.add('complexCommand', (requiredParam, options?) => {
  const {
    optional1 = 'default1',
    optional2 = false,
    timeout = 60000
  } = options || {};
  
  // Implementation
});

// Type declaration
complexCommand(requiredParam: string, options?: {
  optional1?: string;
  optional2?: boolean;
  timeout?: number;
}): Chainable<Element>;
```

### Using Individual Parameters

For simple commands with few parameters:

```typescript
Cypress.Commands.add('simpleCommand', (required, optional1?, optional2?) => {
  // Implementation
});

// Type declaration
simpleCommand(required: string, optional1?: string, optional2?: boolean): Chainable<Element>;
```

## Testing Your Command

After adding a command:

1. **Verify TypeScript compilation**: Run `npm run build` or check IDE for errors
2. **Test in a spec file**: Use the command in a test to verify it works
3. **Test optional parameters**: Verify defaults work correctly
4. **Test error cases**: Ensure command handles missing elements gracefully

## DO NOT

- ❌ Modify indentation of existing commands
- ❌ Add commands in the middle of the file (add at the end)
- ❌ Forget to add type declaration in e2e.ts
- ❌ Hard-code values that should be configurable
- ❌ Create commands that duplicate existing functionality
- ❌ Use `any` type in declarations (be specific)
- ❌ Add commands directly in spec files (they belong in commands.ts)

## When to Create a New Command

Create a new command when:
- ✅ The same action sequence is used in multiple tests
- ✅ The action is complex (5+ Cypress commands)
- ✅ The action represents a meaningful user flow
- ✅ The action needs to be reusable across different contexts

Don't create a command when:
- ❌ The action is only used once
- ❌ It's a simple 1-2 command sequence
- ❌ It's too specific to a single test case

## Naming Conventions

- **Verb-first**: `createUser`, `deleteRepo`, `checkStatus`
- **Descriptive**: `navigateToFleetRepos` not `goToPage`
- **Consistent**: Use same verbs as existing commands
  - `create*` - Create resources
  - `delete*` - Delete resources
  - `check*` - Verify status/state
  - `add*` - Add items to existing resources
  - `assign*` - Assign properties/labels
  - `verify*` - Verify UI state

## Example: Adding a Complete Command

1. **Add implementation to commands.ts**:

```typescript
// Verify cluster group has specific cluster count
Cypress.Commands.add('clusterCountClusterGroup', (clusterGroupName, clusterCount) => {
  cy.continuousDeliveryMenuSelection();
  cy.contains('Cluster Groups').click();
  cy.filterInSearchBox(clusterGroupName);
  cy.verifyTableRow(0, clusterGroupName, `${clusterCount} Clusters`);
});
```

2. **Add type declaration to e2e.ts**:

```typescript
declare global {
  namespace Cypress {
    interface Chainable {
      // ... existing commands ...
      clusterCountClusterGroup(clusterGroupName: string, clusterCount: number): Chainable<Element>;
    }
  }
}
```

3. **Use in test**:

```typescript
it('verifies cluster group has correct cluster count', () => {
  cy.createClusterGroup('my-group', 'env', 'prod');
  cy.clusterCountClusterGroup('my-group', 2);
});
```
