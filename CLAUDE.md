# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the E2E automation repository for Fleet (Rancher Continuous Delivery). The repository uses **two distinct test frameworks**:

1. **Go/Ginkgo tests** (`tests/e2e/`) - Infrastructure setup, Rancher installation, and upgrade tests
2. **Cypress/TypeScript tests** (`tests/cypress/`) - UI end-to-end tests for Fleet functionality

## Test Commands

### Go/Ginkgo Tests

All commands must be run from the `tests/` directory:

```bash
# Install dependencies
make deps

# Install Rancher (full setup)
make e2e-install-rancher

# Install only certificates and Rancher (skip K3s)
make e2e-install-only-certs-and-rancher

# No K3s install, just certs and Rancher
make e2e-no-k3s-install-test-rancher

# Upgrade Rancher Manager
make e2e-upgrade-rancher-manager

# Install RKE2 hardened cluster
make e2e-install-rke2-hardened-cluster

# Start Cypress tests
make start-cypress-tests
```

**Run specific Ginkgo tests with labels:**
```bash
# Run from tests/ directory
ginkgo --label-filter install -r -v ./e2e
ginkgo --label-filter upgrade-rancher-manager -r -v ./e2e
```

### Cypress Tests

Cypress tests are run from the `tests/` directory using npx or Docker:

```bash
# Run all tests locally
npx cypress run -C cypress.config.ts cypress/e2e/unit_tests/*.spec.ts

# Run with specific tags using cypress-grep
npx cypress run -C cypress.config.ts --env grepTags="@login" cypress/e2e/unit_tests/*.spec.ts
npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts
npx cypress run -C cypress.config.ts --env grepTags="@fleet-62" cypress/e2e/unit_tests/*.spec.ts

# Open Cypress UI for development
npx cypress open -C cypress.config.ts
```

**Tag System:**
- `@login` - First login and initial Rancher setup tests
- `@p0` - Priority 0 (highest priority) tests
- `@p1` - Priority 1 tests
- `@fleet-<number>` - Individual test IDs (e.g., `@fleet-62`)
- `@smoke` - Smoke tests

Default daily CI runs use tags: `@login`, `@p0`, `@p1`

## Test Structure

### Cypress Test Files (`tests/cypress/e2e/unit_tests/`)

Tests are organized by priority and functionality:
- `first_login_rancher.spec.ts` - Initial Rancher login and setup
- `p0_fleet.spec.ts` - Priority 0 Fleet tests
- `p1_fleet.spec.ts` - Priority 1 Fleet tests
- `p1_2_fleet.spec.ts` - Additional priority 1 tests
- `rbac_fleet.spec.ts` - RBAC/permissions tests
- `hardened_fleet.spec.ts` - RKE2 hardening tests
- `upgrade_fleet.spec.ts` - Upgrade scenario tests (not in daily runs)
- `special_fleet_tests.spec.ts` - AWS clusters, agent scheduling, cluster moves, global settings
- `user.spec.ts` - User management tests

### Go Test Files (`tests/e2e/`)

- `suite_test.go` - Ginkgo test suite setup, BeforeSuite/AfterSuite hooks
- `install_test.go` - K3s and Rancher Manager installation tests
- `only_certs_and_rancher_install_test.go` - Certificates and Rancher installation only
- `upgrade_test.go` - Rancher Manager upgrade tests

### Custom Cypress Commands

All custom commands are defined in `tests/cypress/support/commands.ts` and declared in `tests/cypress/support/e2e.ts`. Key custom commands include:

- **Git Repo Management:** `addFleetGitRepo()`, `checkGitRepoStatus()`, `deleteAllFleetRepos()`
- **Application Management:** `checkApplicationStatus()`, `deleteApplicationDeployment()`, `modifyDeployedApplication()`
- **RBAC:** `createRoleTemplate()`, `assignRoleToUser()`, `deleteUser()`, `createNewUser()`
- **Cluster Management:** `assignClusterLabel()`, `createClusterGroup()`, `moveClusterToWorkspace()`
- **Workspaces:** `createNewFleetWorkspace()`, `continuousDeliveryWorkspacesMenu()`
- **Utilities:** `importYaml()`, `verifyTableRow()`, `filterInSearchBox()`

The repository uses `@rancher-ecp-qa/cypress-library` for shared Cypress utilities.

## Environment Variables

### Ginkgo Tests (defined in `suite_test.go`)

Required:
- `PUBLIC_DNS` - Rancher hostname
- `RANCHER_VERSION` - Format: `{channel}/{version}/{head-version}` (e.g., `stable/2.9.3`, `prime/2.14.0`)
- `RANCHER_PASSWORD` - Admin password
- `INSTALL_K3S_VERSION` - K3s version for downstream clusters

Optional:
- `CLUSTER_NAME` - Cluster name
- `ARCH` - Architecture (amd64, arm64)
- `DS_CLUSTER_COUNT` - Number of downstream clusters
- `RANCHER_UPGRADE` - Upgrade version (same format as RANCHER_VERSION)

### Cypress Tests (passed via Docker in `start-cypress-tests` script)

Required:
- `RANCHER_URL` - Rancher URL
- `RANCHER_USER` - Rancher username
- `RANCHER_PASSWORD` - Rancher password
- `RANCHER_VERSION` - Rancher version

Optional (for various test scenarios):
- `CYPRESS_TAGS` / `GREPTAGS` - Test tags to run
- `QASE_API_TOKEN`, `QASE_MODE`, `QASE_TESTOPS_RUN_ID` - Qase test reporting
- Git provider credentials: `GITLAB_PRIVATE_USER`, `GH_PRIVATE_USER`, `BITBUCKET_PRIVATE_USER`, etc.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - For AWS cluster tests
- `RSA_PRIVATE_KEY_QA`, `RSA_PUBLIC_KEY_QA` - SSH keys for testing
- `UPGRADE` - Set to enable upgrade tests
- `FLEET_APP_VERSION` - Fleet application version
- `CYPRESS_DOCKER` - Docker image for Cypress (defaults in script)
- `SPEC` - Spec pattern to run

## Architecture Overview

### Dual Test Framework Approach

The repository uses two complementary test frameworks:

1. **Ginkgo (Go)** handles infrastructure-level operations:
   - Installing K3s on the local system
   - Installing cert-manager and Rancher Manager via Helm
   - Creating downstream clusters (k3d clusters)
   - Provisioning RKE2 hardened clusters
   - Upgrading Rancher Manager
   - Uses `rancher-sandbox/ele-testhelpers` for kubectl/rancher operations

2. **Cypress (TypeScript)** handles UI-level operations:
   - Fleet UI interactions (Git repos, workspaces, cluster groups)
   - RBAC and user management testing
   - Application deployment and lifecycle testing
   - Verification of Fleet resources and statuses
   - Uses `@rancher-ecp-qa/cypress-library` for shared Cypress utilities

### Test Flow

Typical CI test flow:
1. Ginkgo tests install infrastructure (K3s, Rancher, downstream clusters)
2. Ginkgo tests export kubeconfig and credentials
3. Cypress tests run against the installed Rancher instance
4. Tests execute in priority order: `@login` → `@p0` → `@p1`

### Key Directories

- `tests/e2e/` - Ginkgo test suite
- `tests/cypress/e2e/unit_tests/` - Cypress spec files
- `tests/cypress/support/` - Cypress custom commands and setup
- `tests/cypress/fixtures/` - Test data and fixtures
- `tests/assets/` - Kubernetes manifests and configuration templates
- `tests/scripts/` - Shell scripts for test execution
- `.github/workflows/` - CI workflow definitions for different Rancher versions

### Important Files

- `tests/Makefile` - Build targets and test commands
- `tests/go.mod` - Go dependencies (Ginkgo, ele-testhelpers, qase-ginkgo)
- `tests/package.json` - Node dependencies (Cypress, cypress-grep, qase-reporter)
- `tests/cypress.config.ts` - Cypress configuration with grep plugin and Qase integration
- `tests/.golangci.yaml` - Go linting configuration

## Development Workflow

When making changes:

1. **For Ginkgo tests:** Work in `tests/e2e/`, use Ginkgo's `Describe/It/By` structure
2. **For Cypress tests:** Work in `tests/cypress/`, add custom commands to `support/commands.ts`
3. **Custom commands:** Always declare TypeScript types in `support/e2e.ts` interface
4. **Test tags:** Add appropriate tags to new Cypress tests for CI filtering
5. **Dependencies:** Update `go.mod` for Go deps, `package.json` for Node deps

## Running a Single Test

### Ginkgo
```bash
cd tests
ginkgo --focus="Test Name Pattern" -v ./e2e
```

### Cypress
```bash
cd tests
npx cypress run -C cypress.config.ts --spec cypress/e2e/unit_tests/specific_test.spec.ts
# Or with grep for a specific test within a spec
npx cypress run -C cypress.config.ts --env grep="test name" cypress/e2e/unit_tests/*.spec.ts
```

## CI/CD

The repository has multiple GitHub Actions workflows for different Rancher versions:
- Daily runs: Rancher v2.10-head through v2.14-head and Rancher-head
- Weekly runs: Rancher v2.11-head, v2.10-head  
- Each workflow installs infrastructure via Ginkgo, then runs Cypress tests

Test results are reported to Qase TestOps when `QASE_MODE=testops` and `QASE_API_TOKEN` is provided.
