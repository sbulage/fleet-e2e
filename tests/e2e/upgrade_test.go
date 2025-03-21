/*
Copyright © 2022 - 2025 SUSE LLC

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
	"fmt"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/rancher-sandbox/ele-testhelpers/kubectl"
	"github.com/rancher-sandbox/ele-testhelpers/rancher"
	"github.com/rancher-sandbox/ele-testhelpers/tools"
)

var _ = Describe("E2E - Upgrading Rancher Manager", Label("upgrade-rancher-manager"), func() {
	// Create kubectl context
	// Default timeout is too small, so New() cannot be used
	k := &kubectl.Kubectl{
		Namespace:    "",
		PollTimeout:  tools.SetTimeout(300 * time.Second),
		PollInterval: 500 * time.Millisecond,
	}

	It("Upgrades Rancher Manager", func() {
		// Report to Qase
		testCaseID = 52

		// Get before-upgrade Rancher Manager version
		getImageVersion := []string{
			"get", "pod",
			"--namespace", "cattle-system",
			"-l", "app=rancher",
			"-o", "jsonpath={.items[*].status.containerStatuses[*].image}",
		}
		versionBeforeUpgrade, err := kubectl.RunWithoutErr(getImageVersion...)
		Expect(err).To(Not(HaveOccurred()))

		// Get Fleet Version before-upgrade
		getFleetImageVersion := []string{"get", "pod",
		"--namespace", "cattle-fleet-system",
		"-l", "app=fleet-controller",
		"-o", "jsonpath={.items[*].status.containerStatuses[*].image}",
		}

		// Execute the shell command to get version before upgrade
		fleetVersionBeforeUpgrade, err := kubectl.RunWithoutErr(getFleetImageVersion...)

		// Upgrade Rancher Manager
		// NOTE: Don't check the status, we can have false-positive here...
		//       Better to check the rollout after the upgrade, it will fail if the upgrade failed
		_ = rancher.DeployRancherManager(
			rancherHostname,
			rancherUpgradeChannel,
			rancherUpgradeVersion,
			rancherUpgradeHeadVersion,
			"None",
			"None",
		)

		// Wait for Rancher Manager to be restarted
		// NOTE: 1st or 2nd rollout command can sporadically fail, so better to use Eventually here
		Eventually(func() string {
			status, _ := kubectl.RunWithoutErr(
				"rollout",
				"--namespace", "cattle-system",
				"status", "deployment/rancher",
			)
			return status
		}, tools.SetTimeout(4*time.Minute), 10*time.Second).Should(ContainSubstring("successfully rolled out"))

		// Check that all Rancher Manager pods are running
		Eventually(func() error {
			checkList := [][]string{
				{"cattle-system", "app=rancher"},
				{"cattle-fleet-local-system", "app=fleet-agent"},
				{"cattle-system", "app=rancher-webhook"},
			}
			return rancher.CheckPod(k, checkList)
		}, tools.SetTimeout(3*time.Minute), 10*time.Second).Should(Not(HaveOccurred()))

		// Check that all pods are using the same version
		Eventually(func() int {
			out, _ := kubectl.RunWithoutErr(getImageVersion...)
			return len(strings.Fields(out))
		}, tools.SetTimeout(3*time.Minute), 10*time.Second).Should(Equal(1))

		// Get after-upgrade Rancher Manager version
		// and check that it's different to the before-upgrade version
		versionAfterUpgrade, err := kubectl.RunWithoutErr(getImageVersion...)
		Expect(err).To(Not(HaveOccurred()))
		Expect(versionAfterUpgrade).To(Not(Equal(versionBeforeUpgrade)))

		// Function to check if all Fleet pods are updated and running the new version
		Eventually(func(g Gomega) {
			// Check the rollout status of Fleet pods to ensure they are updated
			rolloutStatus, err := kubectl.RunWithoutErr(
					"rollout",
					"--namespace", "cattle-fleet-system",
					"status", "deployment/fleet-controller",
			)
			g.Expect(err).To(Not(HaveOccurred()))
			g.Expect(rolloutStatus).To(ContainSubstring(`deployment "fleet-controller" successfully rolled out`))

			// Get Fleet version after upgrade
			// and check that it's different to the version before upgrade
			fleetVersionAfterUpgrade, err := kubectl.RunWithoutErr(getFleetImageVersion...)

			// Get after-upgrade Fleet version and check that it's different from the before-upgrade version
			// getFleetImageVersion output consists of 3 fleet images,
			// so we're checking 3 images must be present there.
			g.Expect(err).To(Not(HaveOccurred()))
			g.Expect(len(strings.Fields(fleetVersionAfterUpgrade))).To(Equal(3))
			fmt.Println("Current Fleet version after upgrade:", fleetVersionAfterUpgrade) // Debugging output
			g.Expect(fleetVersionAfterUpgrade).To(Not(Equal(fleetVersionBeforeUpgrade)))
	}, tools.SetTimeout(10*time.Minute), 20*time.Second).Should(Succeed())
	})
})
