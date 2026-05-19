---
name: run-tests-locally
description: Guide for running Fleet E2E tests locally with proper setup and configuration
---

# Run Tests Locally

Use this skill to set up and run Fleet E2E tests on your local machine.

## Prerequisites

### Required Tools

```bash
# Go (for Ginkgo tests)
go version  # Should be 1.24+

# Node.js (for Cypress tests)
node --version  # Should be 18+
npm --version

# Kubectl
kubectl version --client

# Helm
helm version

# k3d (for downstream clusters)
k3d --version

# Docker
docker --version
```

### Install Missing Tools

```bash
# Go
# Download from https://go.dev/dl/

# Node.js
# Download from https://nodejs.org/

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# k3d
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Docker
# Follow: https://docs.docker.com/engine/install/
```

## Setup Steps

### 1. Clone and Navigate

```bash
git clone https://github.com/rancher/fleet-e2e.git
cd fleet-e2e/tests
```

### 2. Install Dependencies

**Ginkgo dependencies:**
```bash
cd tests
make deps
```

This will:
- Install Ginkgo CLI tool
- Download Go module dependencies

**Cypress dependencies:**
```bash
cd tests
npm install
```

This will install:
- Cypress
- cypress-grep plugin
- cypress-qase-reporter
- @rancher-ecp-qa/cypress-library
- Other required packages

### 3. Set Environment Variables

Create a `.env` file or export variables:

```bash
# Required for Ginkgo tests
export PUBLIC_DNS="rancher.local.example"
export RANCHER_VERSION="stable/2.14.0"
export RANCHER_PASSWORD="admin"
export INSTALL_K3S_VERSION="v1.28.0+k3s1"

# Optional for Ginkgo tests
export CLUSTER_NAME="local"
export ARCH="amd64"
export DS_CLUSTER_COUNT="2"

# Required for Cypress tests
export RANCHER_URL="https://rancher.local.example"
export RANCHER_USER="admin"
export RANCHER_PASSWORD="admin"

# Optional for Cypress private repo tests
export GH_PRIVATE_USER="your-github-user"
export GH_PRIVATE_PWD="your-github-token"
export GITLAB_PRIVATE_USER="your-gitlab-user"
export GITLAB_PRIVATE_PWD="your-gitlab-token"

# Optional for Qase reporting
export QASE_API_TOKEN="your-qase-token"
export QASE_MODE="off"  # or "testops"
```

### 4. Configure Hosts (if using .local domain)

```bash
# Add to /etc/hosts
echo "127.0.0.1 rancher.local.example" | sudo tee -a /etc/hosts
```

## Running Ginkgo Tests

### Full Installation

```bash
cd tests
make e2e-install-rancher
```

This will:
1. Install K3s on your local machine
2. Install cert-manager
3. Install Rancher Manager
4. Create downstream k3d clusters (if DS_CLUSTER_COUNT set)

**⚠️ Warning**: This installs K3s directly on your system!

### Install Only Certs and Rancher

```bash
cd tests
make e2e-install-only-certs-and-rancher
```

This skips K3s installation (assumes you already have a K8s cluster).

### Install RKE2 Hardened Cluster

```bash
cd tests
make e2e-install-rke2-hardened-cluster
```

### Run Specific Test with Label

```bash
cd tests
ginkgo --label-filter install -r -v ./e2e
ginkgo --label-filter upgrade-rancher-manager -r -v ./e2e
```

### Run Single Test by Focus

```bash
cd tests
ginkgo --focus="Install Rancher Manager" -v ./e2e
```

### Run with Verbose Output

```bash
cd tests
ginkgo -v -vv ./e2e
```

### Run Upgrade Tests

```bash
cd tests
export RANCHER_UPGRADE="stable/2.14.1"
make e2e-upgrade-rancher-manager
```

## Running Cypress Tests

### Run All Tests

```bash
cd tests
npx cypress run -C cypress.config.ts cypress/e2e/unit_tests/*.spec.ts
```

### Run with Specific Tags

```bash
cd tests

# Login tests only
npx cypress run -C cypress.config.ts --env grepTags="@login" cypress/e2e/unit_tests/*.spec.ts

# P0 tests only
npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts

# Specific test by ID
npx cypress run -C cypress.config.ts --env grepTags="@fleet-62" cypress/e2e/unit_tests/*.spec.ts

# Multiple tags (AND)
npx cypress run -C cypress.config.ts --env grepTags="@p0+@pr-tests" cypress/e2e/unit_tests/*.spec.ts

# Multiple tags (OR)
npx cypress run -C cypress.config.ts --env grepTags="@p0 @p1" cypress/e2e/unit_tests/*.spec.ts
```

### Run Specific Test File

```bash
cd tests
npx cypress run -C cypress.config.ts --spec cypress/e2e/unit_tests/p0_fleet.spec.ts
```

### Run with Grep (by test name)

```bash
cd tests
npx cypress run -C cypress.config.ts --env grep="Deploy application to local cluster" cypress/e2e/unit_tests/*.spec.ts
```

### Open Cypress UI

```bash
cd tests
npx cypress open -C cypress.config.ts
```

Then:
1. Select E2E Testing
2. Choose browser (Chrome recommended)
3. Select test file to run
4. Watch test execute in real browser

### Run in Headed Mode (see browser)

```bash
cd tests
npx cypress run -C cypress.config.ts --headed --spec cypress/e2e/unit_tests/p0_fleet.spec.ts
```

### Run with Browser Selection

```bash
cd tests
npx cypress run -C cypress.config.ts --browser chrome --spec ...
npx cypress run -C cypress.config.ts --browser firefox --spec ...
```

## Using Docker for Cypress

The repo includes a Docker-based test runner:

```bash
cd tests
export CYPRESS_DOCKER="cypress/included:15.13.0"
export SPEC="cypress/e2e/unit_tests/*.spec.ts"
export CYPRESS_TAGS="@p0"

./scripts/start-cypress-tests
```

## Common Local Development Workflows

### 1. Fresh Install and Test

```bash
cd tests

# Install infrastructure
make e2e-install-rancher

# Wait for Rancher to be ready (check logs)
kubectl get pods -n cattle-system -w

# Run Cypress tests
make start-cypress-tests
```

### 2. Test Against Existing Rancher

```bash
cd tests

# Set Rancher details
export RANCHER_URL="https://your-rancher.com"
export RANCHER_USER="admin"
export RANCHER_PASSWORD="yourpassword"

# Run Cypress tests
npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts
```

### 3. Develop New Test

```bash
cd tests

# Open Cypress UI
npx cypress open -C cypress.config.ts

# Edit test file in IDE: tests/cypress/e2e/unit_tests/your_test.spec.ts
# Cypress will auto-reload when you save

# Run specific test to verify
npx cypress run -C cypress.config.ts --spec cypress/e2e/unit_tests/your_test.spec.ts
```

### 4. Debug Failing Test

```bash
cd tests

# Run in headed mode to see what's happening
npx cypress run -C cypress.config.ts --headed --spec cypress/e2e/unit_tests/failing_test.spec.ts

# Or use interactive mode
npx cypress open -C cypress.config.ts
# Then select failing test
```

### 5. Test Multiple Rancher Versions

```bash
cd tests

# Test with 2.13
export RANCHER_VERSION="stable/2.13.0"
make e2e-install-rancher
make start-cypress-tests

# Clean up
k3d cluster delete --all
sudo /usr/local/bin/k3s-uninstall.sh

# Test with 2.14
export RANCHER_VERSION="stable/2.14.0"
make e2e-install-rancher
make start-cypress-tests
```

## Troubleshooting Local Runs

### K3s Installation Issues

```bash
# Check K3s status
sudo systemctl status k3s

# Check K3s logs
sudo journalctl -u k3s -f

# Restart K3s
sudo systemctl restart k3s

# Uninstall K3s
sudo /usr/local/bin/k3s-uninstall.sh
```

### Rancher Not Accessible

```bash
# Check Rancher pods
kubectl get pods -n cattle-system

# Check Rancher logs
kubectl logs -n cattle-system -l app=rancher --tail=100

# Check ingress
kubectl get ingress -n cattle-system

# Port forward (alternative access)
kubectl port-forward -n cattle-system svc/rancher 8443:443
# Then access: https://localhost:8443
```

### k3d Cluster Issues

```bash
# List clusters
k3d cluster list

# Get cluster info
k3d cluster get <cluster-name>

# Delete cluster
k3d cluster delete <cluster-name>

# Delete all clusters
k3d cluster delete --all
```

### Cypress Issues

```bash
# Clear Cypress cache
npx cypress cache clear
npx cypress install

# Verify Cypress installation
npx cypress verify

# Check Cypress info
npx cypress info
```

### Permission Issues

```bash
# Cypress video/screenshot permissions
chmod -R 755 tests/cypress/videos
chmod -R 755 tests/cypress/screenshots

# K3s permissions
sudo chown -R $USER:$USER ~/.kube
```

## Performance Tips

### Speed Up Test Runs

```bash
# Disable video recording
npx cypress run -C cypress.config.ts --spec ... --config video=false

# Run specific tests only
npx cypress run -C cypress.config.ts --env grepTags="@fleet-62" ...

# Use headed mode only when debugging
npx cypress run -C cypress.config.ts --spec ... # Headless is faster
```

### Reduce Resource Usage

```bash
# Limit downstream cluster count
export DS_CLUSTER_COUNT="1"

# Use smaller K3s version
export INSTALL_K3S_VERSION="v1.28.0+k3s1"

# Run fewer tests
npx cypress run -C cypress.config.ts --env grepTags="@p0" ...
```

## Clean Up

### After Testing

```bash
# Delete k3d clusters
k3d cluster delete --all

# Uninstall K3s (if installed)
sudo /usr/local/bin/k3s-uninstall.sh

# Clean Cypress artifacts
rm -rf tests/cypress/videos/*
rm -rf tests/cypress/screenshots/*
rm -rf tests/cypress/reports/*

# Clean npm cache (if needed)
cd tests
rm -rf node_modules
npm cache clean --force
npm install
```

## CI Environment Simulation

To simulate CI environment locally:

```bash
cd tests

# Use Docker for Cypress (like CI)
export CYPRESS_DOCKER="cypress/included:15.13.0"
export SPEC="cypress/e2e/unit_tests/*.spec.ts"
export GREPTAGS="@login @p0 @p1"

./scripts/start-cypress-tests

# Check results
ls -la cypress/reports/
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias fleet-test-p0='cd ~/fleet-e2e/tests && npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts'
alias fleet-test-open='cd ~/fleet-e2e/tests && npx cypress open -C cypress.config.ts'
alias fleet-install='cd ~/fleet-e2e/tests && make e2e-install-rancher'
alias fleet-clean='k3d cluster delete --all && sudo /usr/local/bin/k3s-uninstall.sh 2>/dev/null'
```
