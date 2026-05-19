---
name: review-test-coverage
description: Analyze test coverage, identify gaps, and suggest areas needing more tests
---

# Review Test Coverage

Use this skill to analyze what Fleet features are tested vs untested, identify coverage gaps, and suggest new tests.

## Test Inventory Commands

### List All Test IDs

```bash
cd tests

# Extract all qase test IDs
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  sed -E 's/.*qase\(([0-9]+).*/\1/' | \
  sort -n | \
  uniq
```

### List All Tests with Descriptions

```bash
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/FLEET-\1: \2/" | \
  sort -t- -k2 -n
```

### Count Tests by Priority

```bash
# Count @p0 tests
grep -rh "@p0" cypress/e2e/unit_tests/*.spec.ts | wc -l

# Count @p1 tests
grep -rh "@p1" cypress/e2e/unit_tests/*.spec.ts | wc -l

# Breakdown by file
for file in cypress/e2e/unit_tests/*.spec.ts; do
  echo "$(basename $file):";
  echo "  @p0: $(grep -c "@p0" "$file" 2>/dev/null || echo 0)";
  echo "  @p1: $(grep -c "@p1" "$file" 2>/dev/null || echo 0)";
done
```

### List Tests by Tag

```bash
# List all @login tests
grep -B 1 "@login" cypress/e2e/unit_tests/*.spec.ts | grep "qase("

# List all @smoke tests
grep -B 1 "@smoke" cypress/e2e/unit_tests/*.spec.ts | grep "qase("

# List all @pr-tests
grep -B 1 "@pr-tests" cypress/e2e/unit_tests/*.spec.ts | grep "qase("
```

## Coverage by Feature Area

### Git Repo Tests

```bash
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  grep -i "git.*repo\|fleet.*repo" | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/FLEET-\1: \2/"
```

**Coverage areas to check**:
- ✓ Public repos (HTTP)
- ✓ Private repos (HTTP auth)
- ✓ Private repos (SSH auth)
- ✓ GitHub, GitLab, Bitbucket, Azure
- ✓ Git repo with paths
- ✓ Git repo status verification
- ? Git repo with submodules
- ? Git repo with LFS
- ? Git repo with webhooks

### Cluster Group Tests

```bash
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  grep -i "cluster.*group" | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/FLEET-\1: \2/"
```

**Coverage areas**:
- ✓ Create cluster group
- ✓ Deploy to cluster group
- ✓ Cluster group label matching
- ? Cluster group deletion with deployments
- ? Nested cluster groups
- ? Cluster group with no matching clusters

### RBAC Tests

```bash
grep -rh "qase(" cypress/e2e/unit_tests/rbac_fleet.spec.ts | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/FLEET-\1: \2/"
```

**Coverage areas**:
- ✓ Create role templates
- ✓ Assign roles to users
- ✓ User permissions verification
- ? Project-level permissions
- ? Workspace-level permissions
- ? Global permissions

### Workspace Tests

```bash
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  grep -i "workspace" | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/FLEET-\1: \2/"
```

**Coverage areas**:
- ✓ Create workspace
- ✓ Move cluster between workspaces
- ✓ Deploy to workspace
- ? Delete workspace with resources
- ? Workspace quotas
- ? Workspace-scoped Git repos

### Application Deployment Tests

```bash
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  grep -i "deploy\|application" | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/FLEET-\1: \2/"
```

**Coverage areas**:
- ✓ Deploy to local cluster
- ✓ Deploy to downstream cluster
- ✓ Verify application status
- ✓ Modify deployed application
- ? Application rollback
- ? Application versioning
- ? Application dependencies

## Identify Coverage Gaps

### Compare with CLAUDE.md Features

Extract features from CLAUDE.md:

```bash
# List custom commands (these are features that should be tested)
grep "^- \*\*" CLAUDE.md | \
  sed 's/- \*\*//' | \
  sed 's/\*\*://'
```

Compare with tested features:

```bash
# Features from commands.ts
grep "Cypress.Commands.add" tests/cypress/support/commands.ts | \
  sed -E "s/.*add\('([^']+)'.*/\1/" | \
  sort > available-commands.txt

# Features tested
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/\2/" | \
  sort > tested-features.txt

# Compare
echo "Commands that might not be well tested:"
comm -13 tested-features.txt available-commands.txt
```

### Find Missing Test IDs

Check for gaps in sequential test numbering:

```bash
cd tests

# Find gaps in test ID sequence
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  sed -E 's/.*qase\(([0-9]+).*/\1/' | \
  sort -n | \
  awk 'NR==1{prev=$1; next} {if($1-prev>1){for(i=prev+1;i<$1;i++){print "Missing: FLEET-" i}} prev=$1}'
```

### Tests Without Tags

Find tests missing priority or feature tags:

```bash
# Find tests without @p0 or @p1 tags
grep -rn "it(qase(" cypress/e2e/unit_tests/*.spec.ts | \
  while read line; do
    file=$(echo "$line" | cut -d: -f1)
    linenum=$(echo "$line" | cut -d: -f2)
    testname=$(echo "$line" | sed -E "s/.*qase\([0-9]+, '([^']+)'.*/\1/")
    
    # Check if line has tags
    if ! echo "$line" | grep -q "tags:"; then
      echo "No tags: $file:$linenum - $testname"
    fi
  done
```

## Coverage Analysis Reports

### Generate Coverage Report

```bash
cat > generate-coverage-report.sh << 'EOF'
#!/bin/bash
REPORT_FILE="coverage-report-$(date +%Y%m%d).md"

echo "# Fleet E2E Test Coverage Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Total counts
echo "## Summary" >> $REPORT_FILE
TOTAL_TESTS=$(grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | wc -l)
P0_TESTS=$(grep -rh "@p0" cypress/e2e/unit_tests/*.spec.ts | wc -l)
P1_TESTS=$(grep -rh "@p1" cypress/e2e/unit_tests/*.spec.ts | wc -l)

echo "- Total Tests: $TOTAL_TESTS" >> $REPORT_FILE
echo "- P0 Tests: $P0_TESTS" >> $REPORT_FILE
echo "- P1 Tests: $P1_TESTS" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# By file
echo "## Tests by File" >> $REPORT_FILE
for file in cypress/e2e/unit_tests/*.spec.ts; do
  count=$(grep -c "qase(" "$file" 2>/dev/null || echo 0)
  echo "- $(basename $file): $count tests" >> $REPORT_FILE
done
echo "" >> $REPORT_FILE

# Feature areas
echo "## Feature Coverage" >> $REPORT_FILE
echo "### Git Repos" >> $REPORT_FILE
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  grep -i "git.*repo\|fleet.*repo" | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/- FLEET-\1: \2/" | \
  sort -t- -k2 -n >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### Cluster Groups" >> $REPORT_FILE
grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | \
  grep -i "cluster.*group" | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/- FLEET-\1: \2/" | \
  sort -t- -k2 -n >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### RBAC" >> $REPORT_FILE
grep -rh "qase(" cypress/e2e/unit_tests/rbac_fleet.spec.ts | \
  sed -E "s/.*qase\(([0-9]+), '([^']+)'.*/- FLEET-\1: \2/" | \
  sort -t- -k2 -n >> $REPORT_FILE
echo "" >> $REPORT_FILE

cat $REPORT_FILE
EOF

chmod +x generate-coverage-report.sh
./generate-coverage-report.sh
```

### Coverage Matrix

Create a matrix of features vs test types:

| Feature | Positive | Negative | Edge Case | Performance |
|---------|----------|----------|-----------|-------------|
| Git Repo HTTPS | ✓ | ✓ | ? | ? |
| Git Repo SSH | ✓ | ? | ? | ? |
| Cluster Group | ✓ | ? | ? | ? |
| RBAC | ✓ | ✓ | ? | ? |
| Workspace | ✓ | ? | ? | ? |

### Generate Matrix

```bash
cat > coverage-matrix.sh << 'EOF'
#!/bin/bash

check_tests() {
  local feature="$1"
  local positive=$(grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | grep -i "$feature" | grep -iv "fail\|error\|invalid" | wc -l)
  local negative=$(grep -rh "qase(" cypress/e2e/unit_tests/*.spec.ts | grep -i "$feature" | grep -i "fail\|error\|invalid" | wc -l)
  
  echo "$feature: Positive=$positive, Negative=$negative"
}

check_tests "git.*repo"
check_tests "cluster.*group"
check_tests "rbac\|role\|user"
check_tests "workspace"
check_tests "helm"
check_tests "bundle"
EOF

chmod +x coverage-matrix.sh
./coverage-matrix.sh
```

## Suggest Missing Tests

### Template for Gap Analysis

```markdown
## Test Coverage Gaps

### High Priority (Core Features)

**Missing**: Git repo with invalid URL
**Why**: Should verify error handling for user input
**Suggested Test**: 
- Spec: p1_fleet.spec.ts
- Priority: @p1
- Test: Create Git repo with malformed URL, verify error message

**Missing**: Cluster group with no matching clusters
**Why**: Edge case that users might encounter
**Suggested Test**:
- Spec: p1_2_fleet.spec.ts
- Priority: @p1
- Test: Create cluster group with label that matches no clusters

### Medium Priority (Extended Features)

**Missing**: Git repo deletion with active deployments
**Why**: Should test cleanup behavior
**Suggested Test**:
- Spec: p1_fleet.spec.ts
- Priority: @p1
- Test: Deploy app, delete Git repo, verify cleanup

### Low Priority (Edge Cases)

**Missing**: Workspace with special characters in name
**Why**: Test input validation
**Suggested Test**:
- Spec: special_fleet_tests.spec.ts
- Priority: @p2 (if we had it)
- Test: Create workspace with unicode/special chars
```

## Coverage Metrics

### Test Distribution Target

Good test distribution:
- **@login**: 1-2 tests (initial setup)
- **@p0**: 30-40% of tests (critical path)
- **@p1**: 50-60% of tests (important features)
- **@p2**: 10-20% of tests (edge cases, if needed)

### Calculate Current Distribution

```bash
cd tests

TOTAL=$(grep -rh "it(qase(" cypress/e2e/unit_tests/*.spec.ts | wc -l)
P0=$(grep -rh "@p0" cypress/e2e/unit_tests/*.spec.ts | wc -l)
P1=$(grep -rh "@p1" cypress/e2e/unit_tests/*.spec.ts | wc -l)

echo "Total: $TOTAL"
echo "P0: $P0 ($(echo "scale=1; $P0*100/$TOTAL" | bc)%)"
echo "P1: $P1 ($(echo "scale=1; $P1*100/$TOTAL" | bc)%)"
```

## Automated Coverage Checking

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check if new test has proper tags
git diff --cached --name-only | grep "\.spec\.ts$" | while read file; do
  # Check for tests without tags
  git diff --cached "$file" | grep "+.*it(qase(" | while read line; do
    if ! echo "$line" | grep -q "tags:"; then
      echo "Warning: New test in $file missing tags"
    fi
  done
done
```

## Prioritizing Coverage Improvements

### Priority 1: Core User Flows
- Git repo CRUD operations
- Basic deployment workflows
- Cluster management

### Priority 2: Error Handling
- Invalid inputs
- Network failures
- Permission errors

### Priority 3: Edge Cases
- Special characters
- Boundary values
- Concurrent operations

### Priority 4: Performance
- Large-scale deployments
- Many clusters
- Resource limits

## Coverage Review Checklist

Use when reviewing test coverage:

- [ ] All custom commands have at least one test
- [ ] Each feature has positive test
- [ ] Critical features have negative tests
- [ ] Error paths are tested
- [ ] All Rancher versions are covered
- [ ] Tests have appropriate tags
- [ ] Tests are in correct spec files
- [ ] No duplicate test IDs
- [ ] Test descriptions are clear
- [ ] Cleanup is performed in tests

## Finding Untested Commands

```bash
# List all custom commands
grep "Cypress.Commands.add" tests/cypress/support/commands.ts | \
  sed -E "s/.*add\('([^']+)'.*/\1/" | \
  sort > all-commands.txt

# List commands used in tests
grep -rh "cy\." cypress/e2e/unit_tests/*.spec.ts | \
  sed -E 's/.*cy\.([a-zA-Z]+).*/\1/' | \
  sort | uniq > used-commands.txt

# Find unused commands
comm -23 all-commands.txt used-commands.txt
```

Note: Some commands might be used indirectly by other commands.

## Continuous Coverage Monitoring

Track coverage over time:

```bash
# Create monthly coverage snapshot
cat > snapshot-coverage.sh << 'EOF'
#!/bin/bash
SNAPSHOT_DIR="coverage-snapshots"
mkdir -p $SNAPSHOT_DIR

DATE=$(date +%Y-%m)
SNAPSHOT_FILE="$SNAPSHOT_DIR/coverage-$DATE.txt"

echo "Coverage Snapshot - $DATE" > $SNAPSHOT_FILE
echo "Total Tests: $(grep -rh 'qase(' cypress/e2e/unit_tests/*.spec.ts | wc -l)" >> $SNAPSHOT_FILE
echo "P0 Tests: $(grep -rh '@p0' cypress/e2e/unit_tests/*.spec.ts | wc -l)" >> $SNAPSHOT_FILE
echo "P1 Tests: $(grep -rh '@p1' cypress/e2e/unit_tests/*.spec.ts | wc -l)" >> $SNAPSHOT_FILE

echo "Snapshot saved to $SNAPSHOT_FILE"
EOF

chmod +x snapshot-coverage.sh
./snapshot-coverage.sh
```
