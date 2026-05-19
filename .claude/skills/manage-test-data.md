---
name: manage-test-data
description: Create, update, and manage test fixtures, YAML files, and test data
---

# Manage Test Data

Use this skill to create and manage test data files, fixtures, and YAML manifests for Fleet E2E tests.

## Test Data Locations

```
tests/
├── assets/              # Kubernetes manifests and config templates
│   ├── local-kubeconfig-skel.yaml
│   ├── local-kubeconfig-token-skel.yaml
│   └── ... (other K8s resources)
│
├── cypress/
│   └── fixtures/        # Test fixtures (JSON, YAML, etc.)
│       └── ... (test data files)
│
└── scripts/             # Test execution scripts
```

## Creating Test Fixtures

### JSON Fixtures

Used for API payloads, mock data, test configurations:

```typescript
// tests/cypress/fixtures/git-repo-config.json
{
  "repoName": "test-repo",
  "repoUrl": "https://github.com/rancher/fleet-examples",
  "branch": "master",
  "paths": ["simple", "helm"]
}
```

**Using in tests**:

```typescript
it('test with fixture data', () => {
  cy.fixture('git-repo-config').then((config) => {
    cy.addFleetGitRepo({
      repoName: config.repoName,
      repoUrl: config.repoUrl,
      branch: config.branch,
      path: config.paths[0]
    });
  });
});
```

### YAML Fixtures

Used for Kubernetes resources:

```yaml
# tests/cypress/fixtures/test-gitrepo.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: test-repo
  namespace: fleet-local
spec:
  repo: https://github.com/rancher/fleet-examples
  branch: master
  paths:
  - simple
```

**Using in tests**:

```typescript
it('test with YAML fixture', () => {
  cy.addFleetRepoFromYaml('cypress/fixtures/test-gitrepo.yaml', 'fleet-local');
});
```

## Test Data Patterns

### Pattern 1: Data Arrays for Parameterized Tests

```typescript
// At top of spec file
const gitProviders = [
  {
    qase_id: 6,
    provider: 'GitLab',
    repoUrl: 'https://gitlab.com/fleetqa/fleet-qa-examples.git',
    userEnv: 'gitlab_private_user',
    pwdEnv: 'gitlab_private_pwd'
  },
  {
    qase_id: 7,
    provider: 'Gh',
    repoUrl: 'https://github.com/fleetqa/fleet-qa-examples.git',
    userEnv: 'gh_private_user',
    pwdEnv: 'gh_private_pwd'
  },
  {
    qase_id: 8,
    provider: 'Bitbucket',
    repoUrl: 'https://bitbucket.org/fleetqa-bb/fleet-qa-examples.git',
    userEnv: 'bitbucket_private_user',
    pwdEnv: 'bitbucket_private_pwd'
  }
];

gitProviders.forEach(({ qase_id, provider, repoUrl, userEnv, pwdEnv }) => {
  it(qase(qase_id, `FLEET-${qase_id}: Test ${provider} repo`), () => {
    const user = Cypress.expose(userEnv);
    const pwd = Cypress.expose(pwdEnv);
    
    cy.addFleetGitRepo({ repoName: `test-${provider}`, repoUrl, gitAuthType: 'http', userOrPublicKey: user, pwdOrPrivateKey: pwd });
  });
});
```

### Pattern 2: Shared Constants

```typescript
// tests/cypress/support/commands.ts (already exists)
export const noRowsMessages = [
  'There are no rows to show.', 
  'There are no rows which match your search query.'
];

export const NoAppBundleOrGitRepoPresentMessages = [
  'No Git Repos have been added', 
  'No repositories have been added', 
  'No App Bundles have been created'
];

// Using in tests
import { noRowsMessages } from 'cypress/support/commands';

cy.get('td > span').invoke('text').should('be.oneOf', noRowsMessages);
```

### Pattern 3: Test Data Builders

```typescript
// tests/cypress/support/test-data-builder.ts
export class GitRepoBuilder {
  private repo = {
    repoName: '',
    repoUrl: 'https://github.com/rancher/fleet-examples',
    branch: 'master',
    path: 'simple',
    local: false
  };

  withName(name: string) {
    this.repo.repoName = name;
    return this;
  }

  withUrl(url: string) {
    this.repo.repoUrl = url;
    return this;
  }

  withPath(path: string) {
    this.repo.path = path;
    return this;
  }

  forLocalCluster() {
    this.repo.local = true;
    return this;
  }

  build() {
    return this.repo;
  }
}

// Using in tests
import { GitRepoBuilder } from 'cypress/support/test-data-builder';

const repo = new GitRepoBuilder()
  .withName('my-test-repo')
  .withPath('helm')
  .forLocalCluster()
  .build();

cy.addFleetGitRepo(repo);
```

## Managing YAML Manifests

### Creating Test YAML Files

```yaml
# tests/assets/test-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key1: value1
  key2: value2
```

### Programmatic YAML Generation

```typescript
// Using js-yaml package
import * as yaml from 'js-yaml';

it('create GitRepo from generated YAML', () => {
  const gitRepo = {
    apiVersion: 'fleet.cattle.io/v1alpha1',
    kind: 'GitRepo',
    metadata: {
      name: 'generated-repo',
      namespace: 'fleet-local'
    },
    spec: {
      repo: 'https://github.com/rancher/fleet-examples',
      branch: 'master',
      paths: ['simple']
    }
  };

  const yamlContent = yaml.dump(gitRepo);
  const filePath = 'cypress/fixtures/generated-gitrepo.yaml';
  
  cy.writeFile(filePath, yamlContent);
  cy.addFleetRepoFromYaml(filePath, 'fleet-local');
});
```

### YAML Templates with Variables

```yaml
# tests/assets/gitrepo-template.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: {{REPO_NAME}}
  namespace: {{NAMESPACE}}
spec:
  repo: {{REPO_URL}}
  branch: {{BRANCH}}
  paths:
  - {{PATH}}
```

```typescript
// Replace placeholders
it('use YAML template', () => {
  cy.readFile('assets/gitrepo-template.yaml').then((template) => {
    const yaml = template
      .replace('{{REPO_NAME}}', 'my-repo')
      .replace('{{NAMESPACE}}', 'fleet-local')
      .replace('{{REPO_URL}}', 'https://github.com/example/repo')
      .replace('{{BRANCH}}', 'main')
      .replace('{{PATH}}', 'charts');

    cy.writeFile('cypress/fixtures/temp-gitrepo.yaml', yaml);
    cy.addFleetRepoFromYaml('cypress/fixtures/temp-gitrepo.yaml');
  });
});
```

## Test Data Best Practices

### 1. Keep Data Close to Tests

**Good**:
```typescript
// Data specific to one test file
// tests/cypress/e2e/unit_tests/p0_fleet.spec.ts
const testRepos = [
  { name: 'simple-app', path: 'simple' },
  { name: 'helm-app', path: 'helm' }
];
```

**Bad**:
```typescript
// Generic data in separate file that many tests import
// tests/cypress/fixtures/all-test-data.json (becomes unwieldy)
```

### 2. Use Environment Variables for Sensitive Data

```typescript
// ❌ Bad - credentials in fixture
{
  "username": "actual-username",
  "password": "actual-password"
}

// ✅ Good - use Cypress.expose()
const user = Cypress.expose('gh_private_user');
const pwd = Cypress.expose('gh_private_pwd');
```

### 3. Generate Dynamic Test Data

```typescript
// ❌ Bad - static names cause conflicts
const repoName = 'test-repo';

// ✅ Good - unique names
const timestamp = Date.now();
const repoName = `test-repo-${timestamp}`;

// ✅ Better - unique per test
const repoName = `test-repo-${Cypress.currentTest.title.replace(/\s+/g, '-')}`;
```

### 4. Clean Up Test Data

```typescript
beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos(); // Clean state
});

afterEach(() => {
  // Optional: additional cleanup
  cy.deleteAllFleetRepos();
});
```

## Common Test Data Scenarios

### Scenario 1: Test Multiple Git Providers

```typescript
const providers = [
  {
    name: 'GitHub',
    url: 'https://github.com/rancher/fleet-examples.git',
    authType: 'http',
    credentials: {
      user: Cypress.expose('gh_private_user'),
      pwd: Cypress.expose('gh_private_pwd')
    }
  },
  {
    name: 'GitLab',
    url: 'https://gitlab.com/fleetqa/fleet-qa-examples.git',
    authType: 'http',
    credentials: {
      user: Cypress.expose('gitlab_private_user'),
      pwd: Cypress.expose('gitlab_private_pwd')
    }
  }
];

providers.forEach((provider) => {
  it(`tests ${provider.name}`, () => {
    cy.addFleetGitRepo({
      repoName: `test-${provider.name}`,
      repoUrl: provider.url,
      gitAuthType: provider.authType,
      userOrPublicKey: provider.credentials.user,
      pwdOrPrivateKey: provider.credentials.pwd
    });
  });
});
```

### Scenario 2: Test Different Fleet Configurations

```typescript
const fleetConfigs = [
  {
    description: 'default namespace',
    namespace: 'fleet-local',
    expectedBehavior: 'deploys to local cluster'
  },
  {
    description: 'custom namespace',
    namespace: 'fleet-default',
    expectedBehavior: 'deploys to downstream clusters'
  }
];

fleetConfigs.forEach((config) => {
  it(`tests ${config.description}`, () => {
    cy.fleetNamespaceToggle(config.namespace);
    // Test implementation
  });
});
```

### Scenario 3: Test Application Manifests

Create test apps in `tests/assets/`:

```yaml
# tests/assets/test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-nginx
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
```

```typescript
it('deploys test application', () => {
  cy.importYaml({
    clusterName: 'local',
    yamlFilePath: 'tests/assets/test-deployment.yaml'
  });
  
  cy.checkApplicationStatus('test-nginx', 'local');
});
```

## Managing Test Fixtures

### Creating Fixtures Programmatically

```typescript
// tests/cypress/support/commands.ts or helper file
export function createGitRepoFixture(name: string, options = {}) {
  const defaults = {
    apiVersion: 'fleet.cattle.io/v1alpha1',
    kind: 'GitRepo',
    metadata: {
      name: name,
      namespace: 'fleet-local'
    },
    spec: {
      repo: 'https://github.com/rancher/fleet-examples',
      branch: 'master',
      paths: ['simple']
    }
  };

  const merged = { ...defaults, ...options };
  return merged;
}

// Using in test
it('creates custom GitRepo', () => {
  const gitRepo = createGitRepoFixture('my-repo', {
    spec: {
      branch: 'develop',
      paths: ['charts']
    }
  });

  const yamlContent = yaml.dump(gitRepo);
  cy.writeFile('cypress/fixtures/custom-gitrepo.yaml', yamlContent);
  cy.addFleetRepoFromYaml('cypress/fixtures/custom-gitrepo.yaml');
});
```

### Fixture Versioning

For version-specific test data:

```
tests/cypress/fixtures/
├── rancher-2.14/
│   └── gitrepo.yaml
├── rancher-2.13/
│   └── gitrepo.yaml
└── rancher-2.11/
    └── gitrepo.yaml
```

```typescript
it('uses version-specific fixture', () => {
  const version = Cypress.expose('rancher_version').match(/2\.(\d+)/)[1];
  const fixturePath = `cypress/fixtures/rancher-2.${version}/gitrepo.yaml`;
  
  cy.addFleetRepoFromYaml(fixturePath);
});
```

## Test Data Organization

### Recommended Structure

```
tests/
├── assets/                          # K8s manifests (for importYaml)
│   ├── deployments/
│   │   ├── nginx-deployment.yaml
│   │   └── redis-deployment.yaml
│   ├── configmaps/
│   │   └── test-configmap.yaml
│   └── fleet/
│       ├── gitrepo-template.yaml
│       └── bundle-template.yaml
│
├── cypress/
│   └── fixtures/                    # Test fixtures (JSON/YAML)
│       ├── providers/
│       │   ├── github-config.json
│       │   ├── gitlab-config.json
│       │   └── bitbucket-config.json
│       └── test-data/
│           ├── cluster-groups.json
│           └── rbac-roles.json
```

### File Naming Conventions

- `test-*.yaml` - Kubernetes test resources
- `*-config.json` - Configuration fixtures
- `*-template.yaml` - Templates with placeholders
- `*-data.json` - Test data arrays

## Cleaning Up Test Files

### Remove Temporary Fixtures

```typescript
afterEach(() => {
  // Clean up generated files
  cy.task('deleteFile', 'cypress/fixtures/temp-gitrepo.yaml');
});
```

Define task in cypress.config.ts:
```typescript
setupNodeEvents(on, config) {
  on('task', {
    deleteFile(filePath) {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return null;
    }
  });
}
```

## Version Control for Test Data

### What to Commit

✅ **Commit**:
- Template files
- Example configurations
- Static test manifests
- Fixture schemas

❌ **Don't commit**:
- Files with credentials
- Generated temporary files
- Large binary files
- Test results/artifacts

### .gitignore

```
# tests/.gitignore
cypress/fixtures/temp-*
cypress/fixtures/generated-*
cypress/videos/*
cypress/screenshots/*
cypress/reports/*
```

## Best Practices Summary

1. **Keep fixtures simple**: One purpose per file
2. **Use builders for complex data**: More maintainable than large JSON
3. **Generate unique names**: Avoid test conflicts
4. **Clean up after tests**: Don't pollute test environment
5. **Version control templates**: Not generated files
6. **Use environment variables**: Never hard-code secrets
7. **Organize by feature**: Not by file type
8. **Document data sources**: Where did this test data come from?
