---
name: write-ginkgo-test
description: Write new Ginkgo test specs using existing helper functions and following repository patterns
---

# Write Ginkgo Test

Use this skill to write new Ginkgo/Go test specifications for infrastructure setup and Rancher operations.

## File Location

All Ginkgo tests MUST be created in: `tests/e2e/`

Existing test files:
- `suite_test.go` - Test suite setup, BeforeSuite, AfterSuite, shared helpers
- `install_test.go` - K3s and Rancher Manager installation
- `only_certs_and_rancher_install_test.go` - Certificates and Rancher only (no K3s)
- `upgrade_test.go` - Rancher Manager upgrade tests

## Test Suite Structure

All tests are part of the `e2e_test` package and use Ginkgo v2.

### Required Imports

```go
import (
    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    "github.com/rancher-sandbox/ele-testhelpers/kubectl"
    "github.com/rancher-sandbox/ele-testhelpers/rancher"
    "github.com/rancher-sandbox/ele-testhelpers/tools"
    . "github.com/rancher-sandbox/qase-ginkgo"
)
```

## Available Helper Functions

### From suite_test.go

#### RunHelmCmdWithRetry
Executes Helm commands with retry logic:

```go
RunHelmCmdWithRetry(s ...string)

// Example
RunHelmCmdWithRetry("install", "rancher", "rancher-latest/rancher",
    "--namespace", "cattle-system",
    "--set", "hostname="+rancherHostname)
```

#### FailWithReport
Custom failure handler that ensures correct line numbers in reports:

```go
FailWithReport(message string, callerSkip ...int)

// Example
if err != nil {
    FailWithReport("Failed to create cluster: " + err.Error(), 1)
}
```

#### makeHTTPPOSTRequest
Make HTTP POST requests to Rancher API:

```go
makeHTTPPOSTRequest(host, endpoint, token, payload string) ([]byte, http.Header, int, error)

// Example
body, header, statusCode, err := makeHTTPPOSTRequest(
    rancherHostname,
    "/v3/users?action=changepassword",
    "",
    payload,
)
```

### From kubectl Package (ele-testhelpers)

#### kubectl.Run
Execute kubectl commands:

```go
kubectl.Run(args ...string) (string, error)

// Examples
kubectl.Run("get", "pods", "-n", "cattle-system")
kubectl.Run("apply", "-f", "manifest.yaml")
kubectl.Run("delete", "namespace", "test-ns")
```

#### kubectl.RunHelmBinaryWithCustomErr
Execute Helm commands:

```go
kubectl.RunHelmBinaryWithCustomErr(s ...string) error

// Example
err := kubectl.RunHelmBinaryWithCustomErr("repo", "add", "rancher-latest",
    "https://releases.rancher.com/server-charts/latest")
```

### From rancher Package (ele-testhelpers)

#### rancher.GetToken
Get Rancher API token:

```go
rancher.GetToken(hostname, username, password string) (string, error)

// Example
token, err := rancher.GetToken(rancherHostname, "admin", rancherPassword)
```

### From tools Package (ele-testhelpers)

#### tools.SetTimeout
Set timeout durations with multiplier:

```go
tools.SetTimeout(duration time.Duration) time.Duration

// Example
Eventually(func() error {
    return kubectl.Run("get", "pods")
}, tools.SetTimeout(2*time.Minute), 10*time.Second).Should(Succeed())
```

#### tools.GetFileFromURL
Download file from URL:

```go
tools.GetFileFromURL(url, fileName string, overwrite bool) error

// Example
err := tools.GetFileFromURL("https://get.k3s.io", "k3s-install.sh", true)
```

## Ginkgo Test Pattern

```go
var _ = Describe("Test Suite Name", Label("label-name"), func() {
    // Setup variables specific to this describe block
    var (
        clusterName string
        namespace   string
    )

    BeforeEach(func() {
        // Setup before each test
        clusterName = "test-cluster"
        namespace = "test-namespace"
    })

    It("Test description", func() {
        By("Step 1 description", func() {
            // First step implementation
            Eventually(func() error {
                return kubectl.Run("get", "pods", "-n", namespace)
            }, tools.SetTimeout(1*time.Minute), 5*time.Second).Should(Succeed())
        })

        By("Step 2 description", func() {
            // Second step implementation
        })
    })

    AfterEach(func() {
        // Cleanup after each test
    })
})
```

## Environment Variables

Access environment variables using `os.Getenv()`. Common variables are defined in BeforeSuite in `suite_test.go`:

Available variables:
- `rancherHostname` - from `PUBLIC_DNS`
- `rancherVersion` - from `RANCHER_VERSION`
- `rancherPassword` - from `RANCHER_PASSWORD`
- `k8sDownstreamVersion` - from `INSTALL_K3S_VERSION`
- `clusterName` - from `CLUSTER_NAME`
- `dsClusterCountStr` - from `DS_CLUSTER_COUNT`
- `rancherUpgrade` - from `RANCHER_UPGRADE`
- `arch` - from `ARCH`

### Adding New Environment Variables

1. Define variable in suite_test.go's `var` block:
```go
var (
    myNewVariable string
)
```

2. Initialize in BeforeSuite:
```go
var _ = BeforeSuite(func() {
    myNewVariable = os.Getenv("MY_NEW_VARIABLE")
})
```

## Using Labels for Test Selection

Labels allow selective test execution via `ginkgo --label-filter`:

```go
// Single label
var _ = Describe("Install Tests", Label("install"), func() {
    // Tests
})

// Multiple labels
var _ = Describe("Upgrade Tests", Label("upgrade-rancher-manager", "upgrade"), func() {
    // Tests
})
```

Run tests by label:
```bash
ginkgo --label-filter install -r -v ./e2e
ginkgo --label-filter upgrade-rancher-manager -r -v ./e2e
```

## Common Patterns

### Waiting for Resources with Eventually

```go
Eventually(func() error {
    status, err := kubectl.Run("get", "deployment", "rancher", "-n", "cattle-system")
    if err != nil {
        return err
    }
    if !strings.Contains(status, "Available") {
        return fmt.Errorf("deployment not ready")
    }
    return nil
}, tools.SetTimeout(5*time.Minute), 30*time.Second).Should(Succeed())
```

### Installing Helm Charts

```go
By("Installing cert-manager", func() {
    RunHelmCmdWithRetry("repo", "add", "jetstack",
        "https://charts.jetstack.io")
    RunHelmCmdWithRetry("repo", "update")
    
    RunHelmCmdWithRetry("install", "cert-manager", "jetstack/cert-manager",
        "--namespace", "cert-manager",
        "--create-namespace",
        "--set", "installCRDs=true",
        "--wait")
})
```

### Running Shell Commands

```go
By("Installing K3s", func() {
    installCmd := exec.Command("sh", "k3s-install.sh")
    
    count := 1
    Eventually(func() error {
        out, err := installCmd.CombinedOutput()
        GinkgoWriter.Printf("K3s installation loop %d:\n%s\n", count, out)
        count++
        return err
    }, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(Succeed())
})
```

### Creating k3d Clusters

```go
By("Creating downstream cluster", func() {
    clusterName := "downstream-1"
    
    // Create k3d cluster
    cmd := exec.Command("k3d", "cluster", "create", clusterName,
        "--image", "rancher/k3s:"+k8sDownstreamVersion,
        "--api-port", "6443",
        "--agents", "1",
        "--wait")
    
    out, err := cmd.CombinedOutput()
    GinkgoWriter.Printf("k3d output:\n%s\n", out)
    Expect(err).To(Not(HaveOccurred()))
})
```

### Making Rancher API Calls

```go
By("Setting Rancher password", func() {
    payload := `{
        "newPassword": "` + rancherPassword + `"
    }`
    
    body, _, statusCode, err := makeHTTPPOSTRequest(
        rancherHostname,
        "/v3/users?action=changepassword",
        "",
        payload,
    )
    
    Expect(err).To(Not(HaveOccurred()))
    Expect(statusCode).To(Equal(http.StatusOK))
})
```

### Working with JSON Responses

```go
type ClusterResponse struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

By("Getting cluster information", func() {
    body, _, statusCode, err := makeHTTPPOSTRequest(
        rancherHostname,
        "/v3/clusters",
        token,
        "",
    )
    
    Expect(err).To(Not(HaveOccurred()))
    Expect(statusCode).To(Equal(http.StatusOK))
    
    var cluster ClusterResponse
    err = json.Unmarshal(body, &cluster)
    Expect(err).To(Not(HaveOccurred()))
    
    GinkgoWriter.Printf("Cluster ID: %s\n", cluster.ID)
})
```

## Code Style Rules

1. **DO NOT suggest indentation changes** to existing code unless explicitly asked
2. **Use tabs for indentation** (Go standard)
3. **Use Eventually with timeouts**: Wrap operations that might fail initially
4. **Use By() for test steps**: Makes output readable and organizes test logic
5. **Use GinkgoWriter**: For debug output instead of fmt.Printf
6. **Handle errors explicitly**: Always check and assert on errors
7. **Use descriptive variable names**: `rancherHostname` not `host`

## Assertions

### Gomega Matchers

```go
// Success/failure
Expect(err).To(Not(HaveOccurred()))
Expect(err).To(BeNil())

// String matching
Expect(output).To(ContainSubstring("success"))
Expect(status).To(Equal("Active"))
Expect(result).To(MatchRegexp(`\d+\.\d+\.\d+`))

// Boolean
Expect(isReady).To(BeTrue())
Expect(isEmpty).To(BeFalse())

// Numbers
Expect(count).To(Equal(3))
Expect(value).To(BeNumerically(">", 0))

// Collections
Expect(items).To(HaveLen(5))
Expect(list).To(ContainElement("item"))
Expect(slice).To(BeEmpty())
```

### Eventually vs. Expect

Use `Eventually` for operations that might not succeed immediately:

```go
// Good - waits for condition
Eventually(func() error {
    return kubectl.Run("get", "pod", "test-pod")
}, tools.SetTimeout(1*time.Minute), 5*time.Second).Should(Succeed())

// Bad - might fail if not ready
status, err := kubectl.Run("get", "pod", "test-pod")
Expect(err).To(Not(HaveOccurred()))
```

## File Organization

- Put shared test data structures at the top (constants, structs)
- Use `var _` pattern for Ginkgo blocks
- Group related tests in Describe blocks
- Use BeforeEach/AfterEach for test setup/cleanup
- Use BeforeSuite/AfterSuite for suite-level setup/cleanup (already in suite_test.go)

## DO NOT

- ❌ Modify indentation of existing code
- ❌ Add imports that aren't used
- ❌ Use fmt.Printf (use GinkgoWriter.Printf instead)
- ❌ Hard-code values that should come from environment variables
- ❌ Skip error checking
- ❌ Create long tests without By() blocks
- ❌ Forget to use Eventually for async operations
- ❌ Use arbitrary timeouts (use tools.SetTimeout multiplier)

## Testing Your Code

```bash
# From tests/ directory

# Run all tests
ginkgo -r -v ./e2e

# Run specific label
ginkgo --label-filter install -v ./e2e

# Run with custom timeout multiplier
TIMEOUT_SCALE=2 ginkgo -v ./e2e

# Verbose output
ginkgo -v -vv ./e2e
```

## Example: Complete Test

```go
var _ = Describe("E2E - Create Downstream Cluster", Label("create-cluster"), func() {
    var (
        clusterName string
        token       string
    )

    BeforeEach(func() {
        clusterName = "test-cluster-" + time.Now().Format("150405")
    })

    It("Create and register downstream cluster", func() {
        By("Getting Rancher API token", func() {
            var err error
            token, err = rancher.GetToken(rancherHostname, "admin", rancherPassword)
            Expect(err).To(Not(HaveOccurred()))
            Expect(token).ToNot(BeEmpty())
        })

        By("Creating k3d cluster", func() {
            cmd := exec.Command("k3d", "cluster", "create", clusterName,
                "--image", "rancher/k3s:"+k8sDownstreamVersion,
                "--wait")
            
            out, err := cmd.CombinedOutput()
            GinkgoWriter.Printf("k3d output:\n%s\n", out)
            Expect(err).To(Not(HaveOccurred()))
        })

        By("Waiting for cluster to be ready", func() {
            Eventually(func() error {
                return kubectl.Run("get", "nodes")
            }, tools.SetTimeout(2*time.Minute), 10*time.Second).Should(Succeed())
        })

        By("Verifying cluster health", func() {
            status, err := kubectl.Run("get", "nodes", "-o", "jsonpath={.items[0].status.conditions[?(@.type=='Ready')].status}")
            Expect(err).To(Not(HaveOccurred()))
            Expect(status).To(Equal("True"))
        })
    })

    AfterEach(func() {
        By("Cleaning up test cluster", func() {
            cmd := exec.Command("k3d", "cluster", "delete", clusterName)
            _ = cmd.Run() // Best effort cleanup
        })
    })
})
```
