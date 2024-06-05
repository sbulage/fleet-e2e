/*
Copyright © 2023 - 2024 SUSE LLC

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

import 'cypress/support/commands';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep"
export const branch = "master"
export const path = "qa-test-apps/nginx-app"
export const repoUrl = "https://github.com/rancher/fleet-test-data/"
export const dsClusterName = 'imported-0'

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test GitRepo Bundle name validation and max character trimming behavior in bundle', { tags: '@p1'}, () => {
  const repoTestData: testData[] = [
    { qase_id: 103,
      repoName: "test-test-test-test-test-test-test-test-test-t",
      test_explanation: "47 characters long is NOT TRIMMED but PATH is added with '-' to 53 characters" },
    { qase_id: 104,
      repoName: "test-test-test-test-test-test-test-test-test-test-test-test",
      test_explanation: "59 characters long is TRIMMED to 53 characters max" },
    { qase_id: 106,
      repoName: "test-test-test-test-123-456-789-0--test-test-test-test",
      test_explanation: "54 characters long is TRIMMED to 53 characters max" },
    { qase_id: 105,
      repoName: "Test.1-repo-local-cluster",
      test_explanation: "INVALID and NORMAL characters" },
    { qase_id: 61,
      repoName: "ryhhskh-123456789+-+abdhg%^/",
      test_explanation: "INVALID and SPECIAL characters" },
  ]

  repoTestData.forEach(
    ({ qase_id, repoName, test_explanation }) => {
      if ((qase_id === 105 || qase_id === 61)) {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo NAME with "${test_explanation}" displays ERROR message and does NOT get created`, { tags: `@fleet-${qase_id}` }, () => {
            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path});
            cy.clickButton('Create');

            // Assert errorMessage exists
            cy.get('[data-testid="banner-content"] > span')
              .should('contain', repoName)
              .should('contain', 'RFC 1123')

            // Navigate back to GitRepo page
            cy.clickButton('Cancel')
            cy.contains('No repositories have been added').should('be.visible')
          })
          )
      } else {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo bundle name TRIMMING behavior. GitRepo with "${test_explanation}"`, { tags: `@fleet-${qase_id}` }, () => {
            // Change namespace to fleet-local
            cy.fleetNamespaceToggle('fleet-local');

            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path});
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', repoName);

            // Navigate to Bundles
            cypressLib.accesMenu("Advanced")
            cypressLib.accesMenu("Bundles")

            // Check bundle name trimed to less than 53 characters
            cy.contains('tr.main-row[data-testid="sortable-table-1-row"]').should('not.be.empty', { timeout: 25000 });
            cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-1-row"]`)
              .children({ timeout: 300000 })
              .should('not.have.text', 'fleet-agent-local')
              .should('not.be.empty')
              .should('include.text', 'test-')
              .should(($ele) => {
                expect($ele).have.length.lessThan(53)
              })
            cy.checkApplicationStatus(appName);
            cy.deleteAllFleetRepos();
          })
        )
      }
    }
  )
});

describe('Test resource behavior after deleting GitRepo using keepResources option', { tags: '@p1'}, () => {
  const keepResourceData: testData[] = [
    { qase_id: 69,
      keepResources: 'yes',
      test_explanation: 'RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted.',
    },
    { qase_id: 70,
      keepResources: 'no',
      test_explanation: 'RESOURCES will NOT be KEPT and  will be DELETED after GitRepo is deleted.',
    },
  ]
  keepResourceData.forEach(
    ({ qase_id, keepResources, test_explanation}) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `local-cluster-fleet-${qase_id}`
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, keepResources });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.checkApplicationStatus(appName);
          cy.deleteAllFleetRepos();
          if (keepResources === 'yes') {
            cy.checkApplicationStatus(appName);
            cy.deleteApplicationDeployment();
          }
        })
      )
    }
  )
});

describe('Test Self-Healing of resource modification when correctDrift option used', { tags: '@p1'}, () => {
  const correctDriftData: testData[] = [
    { qase_id: 76,
      correctDrift: 'yes',
      test_explanation: 'MODIFICATION to resources will be self-healed when correctDrift is set to true in GitRepo.',
    },
    { qase_id: 113,
      correctDrift: 'no',
      test_explanation: 'MODIFICATION to resources will not be self-healed when correctDrift is set to false in GitRepo.',
    },
  ]
  correctDriftData.forEach(
    ({ qase_id, correctDrift, test_explanation}) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `local-cluster-correct-${qase_id}`
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.checkApplicationStatus(appName);

          // Modify deployment count of application
          cy.modifyDeployedApplication(appName);

          if (correctDrift === 'yes') {
            // Resources will be restored, hence count will be 1/1.
            cy.verifyTableRow(0, appName, '1/1');
          } else {
            // Resource count will get increased as resource will not be restored
            cy.verifyTableRow(0, appName, '2/2');
          }
          cy.deleteAllFleetRepos();
        })
      )
    }
  )
});

describe('Test Self-Healing of resource modification when correctDrift option used for exisiting GitRepo', { tags: '@p1'}, () => {
  qase(77,
    it("Fleet-77: Test MODIFICATION to resources will be self-healed when correctDrift is set to true in existing GitRepo.", { tags: '@fleet-77', retries: 1 }, () => {
      const repoName = "local-cluster-correct-77"
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Modify deployment count of application
      cy.modifyDeployedApplication(appName);

      // Resource count will get increased as resource will not be restored
      cy.verifyTableRow(0, appName, '2/2');

      // Update exising GitRepo by enabling 'correctDrift'
      cy.addFleetGitRepo({ repoName, correctDrift: 'yes', editConfig: true });
      cy.clickButton('Save');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Modify deployment count of application
      cy.modifyDeployedApplication(appName);

      // Resources will be restored, hence count will be 1/1.
      cy.verifyTableRow(0, appName, '1/1');

      cy.deleteAllFleetRepos();
    })
  )
});

describe('Test resource behavior after deleting GitRepo using keepResources option for exisiting GitRepo', { tags: '@p1'}, () => {
  qase(71,
    it("Fleet-71: Test RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted when keepResources is set to true in existing GitRepo.", { tags: '@fleet-71' }, () => {
      const repoName = "local-cluster-keep-71"
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Edit existing GitRepo with 'keepResource: true' to prevent
      // application removal after GitRepo delete.
      cy.addFleetGitRepo({ repoName, keepResources: 'yes', editConfig: true });
      cy.clickButton('Save');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Delete GitRepo to check application removed or not.
      cy.deleteAllFleetRepos();

      // Check application still exists after deleting existing GitRepo
      cy.checkApplicationStatus(appName);
      cy.deleteApplicationDeployment();
    })
  )
});

// Perform this test only if rancher_version does not contain "/2.7"
if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('Test local cluster behavior with New workspace', { tags: '@p1'}, () => {
    qase(107,
      it("Fleet-107: Test LOCAL CLUSTER cannot be moved to another workspace as no 'Change workspace' option available..", { tags: '@fleet-107' }, () => {
        cy.accesMenuSelection('Continuous Deliver', 'Clusters');
        cy.fleetNamespaceToggle('fleet-local');
        cy.open3dotsMenu('local', 'Change workspace', true);
      })
    )
  });
}

if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('Imagescan tests', { tags: '@p1'}, () => {
    qase(112,
      it("Fleet-112: Test imagescan app without expected semver range does not break fleet controller", { tags: '@fleet-112' }, () => {;
        const repoName = 'local-cluster-imagescan-112'
        const repoUrl = 'https://github.com/rancher/fleet-test-data'
        const branch = 'master'
        const path = 'imagescans'

        cy.fleetNamespaceToggle('fleet-local');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Error', '1/1');
        cy.accesMenuSelection('local', 'Workloads');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-controller');
        cy.verifyTableRow(0, 'Running', 'fleet-controller')
        cy.deleteAllFleetRepos();
      })
    )
  });
}

// RepoURLRegex is supported on v2.8 but error reporting is not working correctly there
// Ref. https://github.com/rancher/fleet/issues/2462 but it wont be fixed in v2.8
if (/\/2\.9/.test(Cypress.env('rancher_version'))) {
  describe('Private Helm Repository tests (helmRepoURLRegex)', { tags: '@p1'}, () => {

    const repoUrl = 'https://github.com/fleetqa/fleet-qa-examples-public.git'
    const branch = 'main'
    const userOrPublicKey = 'user'
    const pwdOrPrivateKey = 'password'
    const gitOrHelmAuth = 'Helm'
    const gitAuthType = "http"
    let helmUrlRegex

    const privateHelmData: testData[] = [
      { qase_id: 64,
        repoName: "local-private-helm-repo-64",
        path: 'helm-urlregex-repo',
        test_explanation: 'repo',
        helmUrlRegex_matching: '^http.*',
      },
      { qase_id: 65,
        repoName: "local-private-helm-chart-65",
        path: 'helm-urlregex-chart',
        test_explanation: 'chart',
        helmUrlRegex_matching: '^http.*app.*tgz$',
      },
    ]

    // Actually just a preparation step
    it("Prepare the private helm registry", { tags: '@preparation' }, () => {
      cy.importYaml({ clusterName: 'local', yamlFilePath: 'assets/helm-server-with-auth-and-data.yaml' });
      cy.nameSpaceMenuToggle('default');
      // The check doesn't wait for Active state, only its presence
      cy.checkApplicationStatus('nginx-helm-repo');
      // We keep the resources in cluster forever
    });

    privateHelmData.forEach(
      ({qase_id, repoName, path, helmUrlRegex_matching, test_explanation}) => {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test private helm registries for \"helmRepoURLRegex\" matches with \"${test_explanation}\" URL specified in fleet.yaml file`, { tags: `@fleet-${qase_id}` }, () => {;
            // Positive test using matching regex
            helmUrlRegex = helmUrlRegex_matching
            cy.fleetNamespaceToggle('fleet-local');
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex });
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', /([1-9]\d*)\/\1/);
            cy.accesMenuSelection('local', 'Storage', 'ConfigMaps');
            cy.nameSpaceMenuToggle('All Namespaces');
            cy.filterInSearchBox('local-chart-configmap');
            cy.wait(2000);
            cy.get('.col-link-detail').contains('local-chart-configmap').should('be.visible').click({ force: true });
            cy.get('section#data').should('contain', 'sample-cm').and('contain', 'sample-data-inside');
            cy.deleteAllFleetRepos();
            // Negative test using non-matching regex 1234.*
            helmUrlRegex = '1234.*'
            cy.fleetNamespaceToggle('fleet-local');
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex });
            cy.clickButton('Create');
            cy.get('.text-error', { timeout: 120000 }).should('contain', 'code: 401');
            cy.deleteAllFleetRepos();
          })
        )
      })
  });
}

  describe('Test OCI support', { tags: '@p1'}, () => {
    qase(60,
      it("Fleet-60: Test OCI helm chart support on Github Container Registry", { tags: '@fleet-60' }, () => {;
        const repoName = 'default-oci-60'
        const repoUrl = 'https://github.com/rancher/fleet-test-data'
        const branch = 'master'
        const path = 'helm-oci'

        cy.fleetNamespaceToggle('fleet-default');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', /([1-9]\d*)\/\1/);
        cy.accesMenuSelection(dsClusterName, 'Storage', 'ConfigMaps');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-test-configmap');
        cy.get('.col-link-detail').contains('fleet-test-configmap').should('be.visible').click({ force: true });
        cy.get('section#data').should('contain', 'default-name').and('contain', 'value');
        cy.deleteAllFleetRepos();
      })
    )
  
    qase(127,
      it("Fleet-127: Test PRIVATE OCI helm chart support on Github Container Registry", { tags: '@fleet-127' }, () => {;
        const repoName = 'default-oci-127'
        const repoUrl = 'https://github.com/fleetqa/fleet-qa-examples-public'
        const branch = 'main'
        const path = 'helm-oci-auth'
        const gitOrHelmAuth = 'Helm'
        const gitAuthType = "http"
        const userOrPublicKey = Cypress.env("gh_private_user")
        const pwdOrPrivateKey = Cypress.env("gh_private_pwd")
    
        cy.fleetNamespaceToggle('fleet-default');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey});
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', /([1-9]\d*)\/\1/);
        cy.accesMenuSelection(dsClusterName, 'Storage', 'ConfigMaps');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-test-configmap');
        cy.get('.col-link-detail').contains('fleet-test-configmap').should('be.visible').click({ force: true });
        cy.get('section#data').should('contain', 'default-name').and('contain', 'value');
        cy.deleteAllFleetRepos();
      })
    )  
  });

  describe('Test Self-Healing on IMMUTABLE resources when correctDrift is enabled', { tags: '@p1'}, () => {
    const correctDriftTestData: testData[] = [
      { qase_id: 80,
        repoName: "local-cluster-correct-80",
        resourceType: "ConfigMaps",
        resourceName: "mp-app-config",
        resourceLocation: "Storage",
        resourceNamespace: "test-fleet-mp-config",
        dataToAssert: "test, test_key",
      },
      { qase_id: 79,
        repoName: "local-cluster-correct-79",
        resourceType: "Services",
        resourceName: "mp-app-service",
        resourceLocation: "Service Discovery",
        resourceNamespace: "test-fleet-mp-service",
        dataToAssert: "6341 ",
      },
    ]

    correctDriftTestData.forEach(
      ({qase_id, repoName, resourceType, resourceName, resourceLocation, resourceNamespace, dataToAssert}) => {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test IMMUTABLE resource "${resourceType}" will NOT be self-healed when correctDrift is set to true.`, { tags: `@fleet-${qase_id}` }, () => {
            const path = "multiple-paths"

            // Add GitRepo by enabling 'correctDrift'
            cy.fleetNamespaceToggle('fleet-default')
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift: 'yes' });
            cy.clickButton('Create');
            cy.checkGitRepoStatus(repoName, '2 / 2', '2 / 2');
            cy.accesMenuSelection(dsClusterName, resourceLocation, resourceType);
            cy.nameSpaceMenuToggle(resourceNamespace);
            cy.filterInSearchBox(resourceName);
            cy.get('.col-link-detail').contains(resourceName).should('be.visible');
            cy.open3dotsMenu(resourceName, 'Edit Config');

            if (resourceType === 'ConfigMaps') {
              cy.clickButton('Add');
              cy.get('[data-testid="input-kv-item-key-1"]').eq(0).focus().type('test_key');
              cy.get('div.code-mirror.as-text-area').eq(1).click().type("test_data_value");
              cy.clickButton('Add');
            }
            else if (resourceType === 'Services') {
              cy.get("input[type=number]").clear().type("6341");
            }

            else  {
              throw new Error(`Resource "${resourceType}" is invalid  / not implemented yet`);
            }

            cy.wait(500);
            cy.clickButton('Save');
            cy.filterInSearchBox(resourceName);
            cy.verifyTableRow(0, resourceName, dataToAssert);
            // Any mutable resource will reconcile to it's original state immediately
            // But with ConfigMaps and Services it is not because they are immutable i.e.
            // They didn't reconciled when `correctDrift` is used.
            cy.deleteAllFleetRepos();
          })
        )
      }
    )
  });
