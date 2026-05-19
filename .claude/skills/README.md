# Fleet E2E Test Automation Skills

This directory contains skills for writing and maintaining automation code in the Fleet E2E test repository.

## Available Skills

### Core Test Writing Skills

#### 1. /write-cypress-test
**Purpose**: Write new Cypress UI test specifications

**When to use**:
- Adding new Fleet UI test cases
- Creating test specs for new features
- Writing integration tests for Fleet functionality

**Key features**:
- Lists all available custom Cypress commands
- Provides test structure patterns with qase integration
- Explains tag system (@p0, @p1, @fleet-{id})
- Shows environment variable usage
- Includes TypeScript type safety examples

---

#### 2. /add-cypress-command
**Purpose**: Add new custom Cypress commands to the test library

**When to use**:
- Creating reusable Cypress commands
- Adding common test operations
- Building new UI interaction helpers

**Key features**:
- Shows where to add implementations (commands.ts) and type declarations (e2e.ts)
- Provides command implementation patterns (navigation, verification, CRUD, cleanup)
- Explains parameter patterns (options object vs individual params)
- Includes template examples for common command types
- Shows how to build on existing library commands

---

#### 3. /write-ginkgo-test *(Lower Priority)*
**Purpose**: Write new Ginkgo/Go tests for infrastructure and Rancher operations

**When to use**:
- Adding infrastructure setup tests
- Creating Rancher installation/upgrade tests
- Writing cluster provisioning tests

**Key features**:
- Documents available helper functions (kubectl, rancher, tools packages)
- Shows Ginkgo test patterns and structure
- Provides examples for common operations (Helm installs, k3d clusters, API calls)

---

### Test Analysis & Debugging Skills

#### 4. /debug-cypress-test
**Purpose**: Debug failing Cypress tests and troubleshoot common issues

**When to use**:
- Tests failing locally or in CI
- Flaky test investigation
- Understanding test failures

**Key features**:
- Common failure patterns (timeouts, element not found, race conditions)
- Debugging techniques (headed mode, screenshots, intercepts)
- Environment-specific issues
- Memory and performance debugging

---

#### 5. /troubleshoot-ci-failures
**Purpose**: Debug and resolve GitHub Actions CI-specific test failures

**When to use**:
- Tests pass locally but fail in CI
- CI environment issues
- Investigating GitHub Actions failures

**Key features**:
- CI vs local environment differences
- Using gh CLI to access CI logs and artifacts
- Common CI-only failures (timeouts, resource limits, permissions)
- CI workflow debugging techniques
- Flaky test detection in CI

---

#### 6. /analyze-test-results
**Purpose**: Analyze test results, reports, and identify patterns in test failures

**When to use**:
- Reviewing test run results
- Identifying failure patterns
- Generating reports for team

**Key features**:
- Parse Mochawesome and Qase reports
- Extract failure patterns and statistics
- Find flaky tests
- Compare test runs
- Generate summary reports

---

### Test Management Skills

#### 7. /suggest-test-from-ticket
**Purpose**: Analyze QA tickets and suggest automated test implementations using existing custom commands

**When to use**:
- Given a QA ticket, bug report, or feature request
- Need to implement automated test for ticket
- Want test suggestion using existing commands

**Key features**:
- **ALWAYS uses existing custom commands** (doesn't reinvent the wheel)
- Maps ticket requirements to available commands
- Suggests complete test implementation
- Identifies gaps if functionality is missing
- Separates ticket implementation from command refactoring

**Important**: This is for periodic test analysis, NOT for every test creation!

---

#### 8. /review-test-coverage
**Purpose**: Analyze test coverage, identify gaps, and suggest areas needing more tests

**When to use**:
- Quarterly test coverage reviews
- Planning new test priorities
- Identifying untested features

**Key features**:
- List all tests by ID, priority, feature area
- Find coverage gaps and missing test IDs
- Generate coverage reports and matrices
- Suggest missing tests
- Track coverage metrics over time

---

#### 9. /update-test-for-rancher-version
**Purpose**: Update tests to handle Rancher version-specific UI changes and differences

**When to use**:
- Tests fail on specific Rancher versions
- Updating tests for new Rancher release
- Adding version-specific logic

**Key features**:
- Real examples from codebase (continuousDeliveryMenuSelection, modifyDeployedApplication)
- Version checking patterns and helpers
- Feature detection vs version checking
- Migrating tests to new versions

---

### Test Maintenance Skills

#### 10. /refactor-existing-tests
**Purpose**: Improve existing test structure, consolidate duplicated code, and update to use newer custom commands

**When to use**:
- Periodic test cleanup (separate PRs, not ticket scope!)
- After adding new custom commands
- Quarterly maintenance sprints

**Key features**:
- Refactoring patterns (extract to command, consolidate tests, remove duplication)
- Anti-patterns to avoid
- Refactoring checklist and strategies
- How to measure refactoring success
- Refactoring schedule (quarterly focus areas)

**Important**: For periodic cleanup, NOT during feature development!

---

#### 11. /run-tests-locally
**Purpose**: Guide for running Fleet E2E tests locally with proper setup and configuration

**When to use**:
- Setting up local test environment
- Running tests on your machine
- Developing new tests locally

**Key features**:
- Prerequisites and tool installation
- Setup steps (dependencies, environment variables)
- Running Ginkgo and Cypress tests
- Common development workflows
- Troubleshooting local issues

---

#### 12. /manage-test-data
**Purpose**: Create, update, and manage test fixtures, YAML files, and test data

**When to use**:
- Creating test fixtures (JSON, YAML)
- Managing test YAML manifests
- Organizing test data

**Key features**:
- Test data locations and organization
- Creating fixtures (JSON, YAML, programmatic)
- Test data patterns (arrays, builders, templates)
- YAML manifest management
- Best practices for test data

---

## Quick Reference

### For Writing New Tests

```bash
# Start with suggesting test from ticket
/suggest-test-from-ticket

# Then write the test
/write-cypress-test

# If need new command (separate PR)
/add-cypress-command
```

### For Debugging

```bash
# Local debugging
/debug-cypress-test

# CI issues
/troubleshoot-ci-failures

# Analyzing results
/analyze-test-results
```

### For Maintenance

```bash
# Coverage review
/review-test-coverage

# Refactoring (quarterly)
/refactor-existing-tests

# Version updates
/update-test-for-rancher-version
```

## Common Rules Across All Skills

All skills follow these principles:

1. ✅ **Use existing functions** - Don't recreate functionality
2. ✅ **Respect file locations** - Put code in the correct files
3. ✅ **No indentation changes** - Don't suggest indentation changes to existing code unless asked
4. ✅ **Follow patterns** - Match the style of existing code
5. ✅ **Type safety** - Use proper TypeScript/Go types

## File Structure Reference

### Cypress Tests
- **Test specs**: `tests/cypress/e2e/unit_tests/*.spec.ts`
- **Custom commands**: `tests/cypress/support/commands.ts`
- **Type declarations**: `tests/cypress/support/e2e.ts`
- **Fixtures**: `tests/cypress/fixtures/`
- **Config**: `tests/cypress.config.ts`

### Ginkgo Tests *(Lower Priority)*
- **Test files**: `tests/e2e/*.go`
- **Suite setup**: `tests/e2e/suite_test.go`
- **Config**: `tests/go.mod`
- **Makefile**: `tests/Makefile`

### Test Data
- **K8s manifests**: `tests/assets/`
- **Scripts**: `tests/scripts/`

## Skill Invocation Tips

- **Start with the skill**: Always invoke the relevant skill before asking Claude to work
- **Be specific**: Provide details about what you want to do
- **Reference existing tests**: Mention similar tests as examples
- **Ask for explanations**: Skills provide context, so ask "why" if something is unclear
- **Separate concerns**: Use refactor-existing-tests for cleanup, not during feature work
- **Use suggest-test-from-ticket**: For analyzing tickets and getting test suggestions

## Priority Levels

**Highest Priority** (Daily Use):
1. write-cypress-test
2. suggest-test-from-ticket
3. debug-cypress-test
4. add-cypress-command

**Medium Priority** (Weekly/As Needed):
5. troubleshoot-ci-failures
6. analyze-test-results
7. run-tests-locally
8. update-test-for-rancher-version

**Lower Priority** (Periodic/Quarterly):
9. review-test-coverage
10. refactor-existing-tests
11. manage-test-data
12. write-ginkgo-test

## Getting Help

If you're unsure which skill to use:
1. For new tests → `/suggest-test-from-ticket` or `/write-cypress-test`
2. For debugging → `/debug-cypress-test` or `/troubleshoot-ci-failures`
3. For maintenance → `/refactor-existing-tests` or `/review-test-coverage`
4. For setup → `/run-tests-locally`

Remember: Skills are tools to help you work more efficiently. Don't hesitate to ask Claude for clarification!
