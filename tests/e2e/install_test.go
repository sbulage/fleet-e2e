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
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/rancher-sandbox/ele-testhelpers/kubectl"
	"github.com/rancher-sandbox/ele-testhelpers/rancher"
	"github.com/rancher-sandbox/ele-testhelpers/tools"
)

func rolloutDeployment(ns, d string) {
	// NOTE: 1st or 2nd rollout command can sporadically fail, so better to use Eventually here
	Eventually(func() string {
		status, _ := kubectl.Run("rollout", "restart", "deployment/"+d,
			"--namespace", ns)
		return status
	}, tools.SetTimeout(1*time.Minute), 20*time.Second).Should(ContainSubstring("restarted"))

	// Wait for deployment to be restarted
	Eventually(func() string {
		status, _ := kubectl.Run("rollout", "status", "deployment/"+d,
			"--namespace", ns)
		return status
	}, tools.SetTimeout(2*time.Minute), 30*time.Second).Should(ContainSubstring("successfully rolled out"))
}

var _ = Describe("E2E - Install Rancher Manager", Label("install"), func() {
	// Create kubectl context
	// Default timeout is too small, so New() cannot be used
	k := &kubectl.Kubectl{
		Namespace:    "",
		PollTimeout:  tools.SetTimeout(300 * time.Second),
		PollInterval: 500 * time.Millisecond,
	}
	// Define local Kubeconfig file
	localKubeconfig := os.Getenv("HOME") + "/.kube/config"

	type downstreamCluster struct {
		downstreamClusterName   string
		InternalClusterName     string
		InsecureRegistrationCmd string
		kubeconfigPath          string
		apiPort                 int
	}

	// Global variables stored in struct
	var downstreamClusters []downstreamCluster

	It("Install Rancher Manager", func() {
		By("Installing K3s", func() {
			// Get K3s installation script
			fileName := "k3s-install.sh"
			Eventually(func() error {
				return tools.GetFileFromURL("https://get.k3s.io", fileName, true)
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).ShouldNot(HaveOccurred())

			// Set command and arguments
			installCmd := exec.Command("sh", fileName)
			// installCmd.Env = append(os.Environ(), "INSTALL_K3S_EXEC=--disable metrics-server")

			// Retry in case of (sporadic) failure...
			count := 1
			Eventually(func() error {
				// Execute K3s installation
				out, err := installCmd.CombinedOutput()
				GinkgoWriter.Printf("K3s installation loop %d:\n%s\n", count, out)
				count++
				return err
			}, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(BeNil())
		})

		By("Starting K3s", func() {
			err := exec.Command("sudo", "systemctl", "start", "k3s").Run()
			Expect(err).To(Not(HaveOccurred()))

			// Delay few seconds before checking
			time.Sleep(tools.SetTimeout(20 * time.Second))
		})

		By("Waiting for K3s to be started", func() {
			// Wait for all pods to be started
			checkList := [][]string{
				{"kube-system", "app=local-path-provisioner"},
				{"kube-system", "k8s-app=kube-dns"},
				{"kube-system", "app.kubernetes.io/name=traefik"},
				{"kube-system", "svccontroller.k3s.cattle.io/svcname=traefik"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Configuring Kubeconfig file", func() {
			// Copy K3s file in ~/.kube/config
			// NOTE: don't check for error, as it will happen anyway (only K3s or RKE2 is installed at a time)
			file, _ := exec.Command("bash", "-c", "ls /etc/rancher/{k3s,rke2}/{k3s,rke2}.yaml").Output()
			Expect(file).To(Not(BeEmpty()))
			err := tools.CopyFile(strings.Trim(string(file), "\n"), localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			err = os.Setenv("KUBECONFIG", localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			// DEBUG
			GinkgoWriter.Printf("KUBECONFIG environment variable value: %s\n", os.Getenv("KUBECONFIG"))
		})

		By("Installing CertManager", func() {
			RunHelmCmdWithRetry("repo", "add", "jetstack", "https://charts.jetstack.io")
			RunHelmCmdWithRetry("repo", "update")

			// Set flags for cert-manager installation
			flags := []string{
				"upgrade", "--install", "cert-manager", "jetstack/cert-manager",
				"--namespace", "cert-manager",
				"--create-namespace",
				"--set", "installCRDs=true",
				"--wait", "--wait-for-jobs",
			}

			RunHelmCmdWithRetry(flags...)

			checkList := [][]string{
				{"cert-manager", "app.kubernetes.io/component=controller"},
				{"cert-manager", "app.kubernetes.io/component=webhook"},
				{"cert-manager", "app.kubernetes.io/component=cainjector"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Installing Rancher Manager", func() {
			err := rancher.DeployRancherManager(rancherHostname, rancherChannel, rancherVersion, rancherHeadVersion, "none", "none")
			Expect(err).To(Not(HaveOccurred()))

			// Wait for all pods to be started
			checkList := [][]string{
				{"cattle-system", "app=rancher"},
				{"cattle-system", "app=rancher-webhook"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Waiting for fleet", func() {
			// Wait unit the kubectl command return exit code 0
			count := 1
			Eventually(func() error {
				out, err := kubectl.Run("rollout", "status",
					"--namespace", "cattle-fleet-system",
					"deployment", "fleet-controller",
				)
				GinkgoWriter.Printf("Waiting for fleet-controller deployment, loop %d:\n%s\n", count, out)
				count++
				return err
			}, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(Not(HaveOccurred()))

			checkList := [][]string{
				{"cattle-fleet-system", "app=fleet-controller"},
			}
			Eventually(func() error {
				return rancher.CheckPod(k, checkList)
			}, tools.SetTimeout(4*time.Minute), 30*time.Second).Should(BeNil())
		})

		By("Configuring kubectl to use Rancher admin user", func() {
			// Getting internal username for admin
			internalUsername, err := kubectl.Run("get", "user",
				"-o", "jsonpath={.items[?(@.username==\"admin\")].metadata.name}",
			)
			Expect(err).To(Not(HaveOccurred()))
			Expect(internalUsername).To(Not(BeEmpty()))

			// Add token in Rancher Manager
			err = tools.Sed("%ADMIN_USER%", internalUsername, ciTokenYaml)
			Expect(err).To(Not(HaveOccurred()))
			err = kubectl.Apply("default", ciTokenYaml)
			Expect(err).To(Not(HaveOccurred()))

			// Getting Rancher Manager local cluster CA
			// NOTE: loop until the cmd return something, it could take some time
			var rancherCA string
			Eventually(func() error {
				rancherCA, err = kubectl.Run("get", "secret",
					"--namespace", "cattle-system",
					"tls-rancher-ingress",
					"-o", "jsonpath={.data.tls\\.crt}",
				)
				return err
			}, tools.SetTimeout(2*time.Minute), 5*time.Second).Should(Not(HaveOccurred()))

			// Copy skel file for ~/.kube/config
			err = tools.CopyFile(localKubeconfigYaml, localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			// Create kubeconfig for local cluster
			err = tools.Sed("%RANCHER_URL%", rancherHostname, localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))
			err = tools.Sed("%RANCHER_CA%", rancherCA, localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			// Set correct file permissions
			_ = exec.Command("chmod", "0600", localKubeconfig).Run()

			// Remove the "old" kubeconfig file to force the use of the new one
			// NOTE: in fact move it, just to keep it in case of issue
			// Also don't check the returned error, as it will always not equal 0
			_ = exec.Command("bash", "-c", "sudo mv -f /etc/rancher/{k3s,rke2}/{k3s,rke2}.yaml ~/").Run()

			// DEBUG
			GinkgoWriter.Printf("KUBECONFIG environment variable value: %s\n", os.Getenv("KUBECONFIG"))
		})

		By("Create downstream cluster(s) resource for import into rancher", func() {
			dsClusterCount := 1
			if dsClusterCountStr != "" {
				count, err := strconv.Atoi(dsClusterCountStr)
				if err == nil {
					dsClusterCount = count
				}
			}

			// Get API token for Rancher via Rancher API
			login_payload := fmt.Sprintf(`{
				"description": "Artificial UI session for CI",
				"username": "admin",
				"password": "%s"
			}`, rancherPassword)

			response_body_token, _, _, _ := makeHTTPPOSTRequest(rancherHostname, "/v3-public/localProviders/local?action=login", "", login_payload)

			// DEBUG uncomment to see the response
			GinkgoWriter.Printf("Complete response with Rancher API token: %s\n", response_body_token)

			// Extract the token from the response
			var responseData map[string]interface{}
			err := json.Unmarshal(response_body_token, &responseData)
			Expect(err).To(Not(HaveOccurred()))

			token := responseData["token"].(string)
			Expect(token).To(Not(BeEmpty()))

			// DEBUG uncomment to see the extracted token
			GinkgoWriter.Printf("Extracted Rancher API token: %s\n", token)

			for i := 0; i < dsClusterCount; i++ {
				downstreamClusterName := fmt.Sprintf("imported-%d", i)
				internalClusterName := ""
				insecureRegistrationCommand := ""

				// curl -k -u "$TOKEN" -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' "https://$RANCHER_HOSTNAME/v3/clusters" --data '{"type":"cluster","agentEnvVars":[],"labels":{},"annotations":{"rancher.io/imported-cluster-version-management":"system-default"},"importedConfig":{"privateRegistryURL":null},"name":"cluster-to-import"}'
				response_body, _, _, _ := makeHTTPPOSTRequest(rancherHostname, "/v3/clusters", token,
					fmt.Sprintf(`{
						"type": "cluster",
						"agentEnvVars": [],
						"labels": {},
						"annotations": {
							"rancher.io/imported-cluster-version-management": "system-default"
						},
						"importedConfig": {
							"privateRegistryURL": null
						},
						"name": "%s"
					}`, downstreamClusterName))

				// DEBUG uncomment to see the response
				GinkgoWriter.Printf("Complete response with Rancher API token: %s\n", response_body)

				var response map[string]interface{}
				err := json.Unmarshal(response_body, &response)
				Expect(err).To(Not(HaveOccurred()))

				// Get and store internal cluster name from the response
				internalClusterName = response["id"].(string)
				Expect(internalClusterName).Should(ContainSubstring("c-"))

				// DEBUG uncomment to see the internal cluster name
				GinkgoWriter.Printf("Extracted internal cluster name: %s\n", internalClusterName)

				// Get insecureCommand for importing cluster
				// INSECURE_COMMAND=$(kubectl get ClusterRegistrationToken.management.cattle.io -n $INTERNAL_CLUSTER_NAME -o jsonpath='{.items[0].status.insecureCommand}')
				Eventually(func() string {
					insecureRegistrationCommand, _ = kubectl.Run("get", "ClusterRegistrationToken.management.cattle.io",
						"--namespace", internalClusterName,
						"-o", "jsonpath={.items[0].status.insecureCommand}",
					)
					return insecureRegistrationCommand
				}, tools.SetTimeout(2*time.Minute), 10*time.Second).Should(ContainSubstring("curl --insecure"))

				// Fill the struct with the values
				downstreamClusters = append(downstreamClusters, downstreamCluster{
					downstreamClusterName:   downstreamClusterName,
					InternalClusterName:     internalClusterName,
					InsecureRegistrationCmd: insecureRegistrationCommand,
					kubeconfigPath:          os.Getenv("HOME") + "/" + downstreamClusterName + "-kubeconfig.yaml",
					apiPort:                 64430 + i,
				})
			}
			// DEBUG uncomment to see content of the struct
			// fmt.Printf("%#v\n", downstreamClusters)
		})
	})

	It("Provision K3d cluster(s)", func() {
		By("Install k3d binary for downstream cluster provisioning", func() {
			fileName := "k3d-install.sh"
			Eventually(func() error {
				return tools.GetFileFromURL("https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh", fileName, true)
			}, tools.SetTimeout(2*time.Minute), 10*time.Second).ShouldNot(HaveOccurred())

			// Set command and arguments
			installCmd := exec.Command("bash", fileName)
			out, err := installCmd.CombinedOutput()
			GinkgoWriter.Printf("K3d binary installation (stdout):\n%s\n", out)
			Expect(err).To(Not(HaveOccurred()))
		})
		By("Provision downstream K3d cluster(s)", func() {
			for _, cluster := range downstreamClusters {
				// Set KUBECONFIG env for k3d operations
				err := os.Setenv("KUBECONFIG", cluster.kubeconfigPath)
				Expect(err).To(Not(HaveOccurred()))

				// Allows changing k3d flags
				flags := []string{
					"--agents", "0",
					"--servers", "1",
					"--image", "rancher/k3s:" + k8sDownstreamVersion,
					"--api-port", "0.0.0.0:" + strconv.Itoa(cluster.apiPort),
				}
				GinkgoWriter.Printf("downstreamClusterName: %s\n", cluster.downstreamClusterName)
				createCmd := exec.Command("k3d", "cluster", "create", cluster.downstreamClusterName)
				createCmd.Args = append(createCmd.Args, flags...)
				out, err := createCmd.CombinedOutput()
				GinkgoWriter.Printf("Provisioning downstream k3d cluster(s):\n%s\n", out)
				Expect(err).To(Not(HaveOccurred()))
			}
		})
		By("Wait for k3d cluster(s) resources and perform import", func() {
			for _, cluster := range downstreamClusters {
				// Set KUBECONFIG env for k3d operations
				err := os.Setenv("KUBECONFIG", cluster.kubeconfigPath)
				Expect(err).To(Not(HaveOccurred()))

				// Wait until k8s API endpoint of k3d downstream cluster is reachable
				count := 1
				Eventually(func() string {
					k3dApiCheckCmd := exec.Command("curl", "-sk", "--max-time", "5", fmt.Sprintf("https://127.0.0.1:%d", cluster.apiPort))
					out, _ := k3dApiCheckCmd.CombinedOutput()
					GinkgoWriter.Printf("K3d API response for cluster %s, loop %d:\n%s\n", cluster.downstreamClusterName, count, out)
					count++
					return string(out)
				}, tools.SetTimeout(2*time.Minute), 10*time.Second).Should(ContainSubstring("\"message\": \"Unauthorized\""))

				// Wait for all nodes and CRDs
				timeout := "5m"
				_, err = kubectl.Run("wait", "--for=condition=Ready", "--timeout="+timeout, "node", "--all")
				Expect(err).To(Not(HaveOccurred()))
				_, err = kubectl.Run("wait", "--for=condition=Established", "--timeout="+timeout, "crd", "--all")
				Expect(err).To(Not(HaveOccurred()))
				// Run the registration insecure command on downstream cluster
				regCmd := exec.Command("bash", "-c", cluster.InsecureRegistrationCmd)
				out, err := regCmd.CombinedOutput()
				GinkgoWriter.Printf("Registration command output for cluster %s:\n%s\n", cluster.downstreamClusterName, out)
				Expect(err).To(Not(HaveOccurred()))
			}
		})
		By("Wait for downstream k3d cluster(s) to import in Rancher", func() {
			// Set KUBECONFIG variable back to local cluster
			err := os.Setenv("KUBECONFIG", localKubeconfig)
			Expect(err).To(Not(HaveOccurred()))

			for _, cluster := range downstreamClusters {
				count := 1
				Eventually(func() string {
					downstreamClusterStatus, _ := kubectl.Run("get", "clusters.management.cattle.io",
						cluster.InternalClusterName,
						"-o", "jsonpath={.status.conditions[?(@.type==\"Ready\")].status}",
					)
					GinkgoWriter.Printf("Waiting for Active state of %s, loop %d\n", cluster.downstreamClusterName, count)
					count++
					return downstreamClusterStatus
				}, tools.SetTimeout(3*time.Minute), 10*time.Second).Should(ContainSubstring("True"))
			}
		})
	})
})
