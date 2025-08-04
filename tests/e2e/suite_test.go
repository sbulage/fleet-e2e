/*
Copyright © 2023 - 2025 SUSE LLC

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

package e2e_test

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/rancher-sandbox/ele-testhelpers/kubectl"
	"github.com/rancher-sandbox/ele-testhelpers/tools"
	. "github.com/rancher-sandbox/qase-ginkgo"
)

const (
	ciTokenYaml         = "../assets/local-kubeconfig-token-skel.yaml"
	localKubeconfigYaml = "../assets/local-kubeconfig-skel.yaml"
	userName            = "root"
	userPassword        = "r0s@pwd1"
	vmNameRoot          = "node"
)

var (
	arch                      string
	clusterName               string
	dsClusterCountStr         string
	k8sDownstreamVersion      string
	rancherChannel            string
	rancherHeadVersion        string
	rancherHostname           string
	rancherUpgrade            string
	rancherVersion            string
	rancherPassword           string
	rancherUpgradeChannel     string
	rancherUpgradeHeadVersion string
	rancherUpgradeVersion     string
	testCaseID                int64
)

/**
 * Execute RunHelmBinaryWithCustomErr within a loop with timeout
 * @param s options to pass to RunHelmBinaryWithCustomErr command
 * @returns Nothing, the function will fail through Ginkgo in case of issue
 */
func RunHelmCmdWithRetry(s ...string) {
	Eventually(func() error {
		return kubectl.RunHelmBinaryWithCustomErr(s...)
	}, tools.SetTimeout(2*time.Minute), 20*time.Second).Should(Not(HaveOccurred()))
}

func FailWithReport(message string, callerSkip ...int) {
	// Ensures the correct line numbers are reported
	Fail(message, callerSkip[0]+1)
}

func makeHTTPPOSTRequest(host, endpoint, token, payload string) ([]byte, http.Header, int, error) {
	url := fmt.Sprintf("https://%s%s", host, endpoint)

	req, err := http.NewRequest("POST", url, strings.NewReader(payload))
	if err != nil {
		return nil, nil, 0, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	// Use token if provided, otherwise use auth from payload
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
		Timeout: time.Second * 15,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, 0, err
	}

	return body, resp.Header, resp.StatusCode, nil
}

func TestE2E(t *testing.T) {
	RegisterFailHandler(FailWithReport)
	RunSpecs(t, "Fleet End-To-End Test Suite")
}

var _ = BeforeSuite(func() {
	arch = os.Getenv("ARCH")
	clusterName = os.Getenv("CLUSTER_NAME")
	rancherHostname = os.Getenv("PUBLIC_DNS")
	// We will use the same version for downstream and upstream clusters
	k8sDownstreamVersion = os.Getenv("INSTALL_K3S_VERSION")
	rancherVersion = os.Getenv("RANCHER_VERSION")
	dsClusterCountStr = os.Getenv("DS_CLUSTER_COUNT")
	rancherUpgrade = os.Getenv("RANCHER_UPGRADE")
	rancherPassword = os.Getenv("RANCHER_PASSWORD")

	// Convert k3s version to a tag usable by k3d
	k8sDownstreamVersion = strings.Replace(k8sDownstreamVersion, "+", "-", 1)

	// Extract Rancher Manager channel/version to install
	if rancherVersion != "" {
		// Split rancherVersion and reset it
		s := strings.Split(rancherVersion, "/")
		rancherVersion = ""

		// Get needed informations
		rancherChannel = s[0]
		if len(s) > 1 {
			rancherVersion = s[1]
		}
		if len(s) > 2 {
			rancherHeadVersion = s[2]
		}
	}

	// Extract Rancher Manager channel/version to upgrade
	if rancherUpgrade != "" {
		// Split rancherUpgrade and reset it
		s := strings.Split(rancherUpgrade, "/")

		// Get needed informations
		rancherUpgradeChannel = s[0]
		if len(s) > 1 {
			rancherUpgradeVersion = s[1]
		}
		if len(s) > 2 {
			rancherUpgradeHeadVersion = s[2]
		}
	}
})

var _ = ReportBeforeEach(func(report SpecReport) {
	// Reset case ID
	testCaseID = -1
})

var _ = ReportAfterEach(func(report SpecReport) {
	// Add result in Qase if asked
	Qase(testCaseID, report)
})
