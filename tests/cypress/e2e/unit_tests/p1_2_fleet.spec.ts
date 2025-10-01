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

import 'cypress/support/commands';
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep"
export const branch = "master"
export const path = "qa-test-apps/nginx-app"
export const repoUrl = "https://github.com/rancher/fleet-test-data/"
export const bannerMessageToAssert = /Matches 2 of 3 existing clusters, including "imported-\d"/
export const key = 'key_env'
export const value = 'value_testing'
export const clusterGroupName = 'cluster-group-env-prod'
export const dsAllClusterList = ['imported-0', 'imported-1', 'imported-2']
export const dsFirstClusterName = dsAllClusterList[0]
export const dsFirstTwoClusterList = dsAllClusterList.slice(0, 2)
export const dsThirdClusterName = dsAllClusterList[2]
export const NoAppBundleOrGitRepoPresentMessages = ['No repositories have been added', 'No App Bundles have been created']
export const rancherVersion = Cypress.env('rancher_version')
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|alpha)\/2\.(1[2-9]|[2-9]\d+)(\..*)?$/,
  /^head\/2\.(1[2-9])$/
];

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test GitRepo Bundle name validation and max character trimming behavior in bundle', { tags: '@p1_2'}, () => {
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

            // Skipping this in 2.10 until this bug is resolved:
            // https://github.com/rancher/dashboard/issues/12444
            // TODO: decide what to do with this upon bug resolution
            if (!/\/2\.10/.test(Cypress.env('rancher_version'))) {
            // Assert errorMessage exists
            cy.get('[data-testid="banner-content"] > span')
              .should('contain', repoName)
              .should('contain', 'RFC 1123')
            }
            
            // Navigate back to GitRepo page
            cy.clickButton('Cancel')
            cy.contains(new RegExp(NoAppBundleOrGitRepoPresentMessages.join('|'))).should('be.visible')
          })
          )
      } else {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo bundle name TRIMMING behavior. GitRepo with "${test_explanation}"`, { tags: `@fleet-${qase_id}` }, () => {
            // Change namespace to fleet-local

            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path, local: true});
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', repoName);

            // Navigate to Bundles
            cy.continuousDeliveryBundlesMenu();

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

describe('Test application deployment based on clusterGroup', { tags: '@p1_2'}, () => {
  const value = 'value_prod'
  let repoName

  beforeEach('Cleanup leftover GitRepo, ClusterGroup or label etc. if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteAllFleetRepos();
    // Remove labels from the clusters.
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )
    cy.deleteClusterGroups();
  })

  const clusterGroup: testData[] = [
    {
      qase_id: 25,
      test_explanation: "install single application to the all defined clusters in the 'clusterGroup'",
    },
    {
      qase_id: 27,
      test_explanation: "install existing application to the third cluster by adding it to the existing 'clusterGroup'",
    },
  ]

  clusterGroup.forEach(({ qase_id, test_explanation }) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          repoName = `default-single-app-cluster-group-${qase_id}`
          if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
            repoName = "default-single-app-cluster-group"
          }

          cy.continuousDeliveryMenuSelection();
          cy.clickNavMenu(['Clusters']);
          cy.contains('.title', 'Clusters').should('be.visible');

          // Assign label to the first 2 clusters i.e. imported-0 and imported-1
          dsFirstTwoClusterList.forEach(
            (dsCluster) => {
              cy.assignClusterLabel(dsCluster, key, value);
            }
          )

          // Create group of cluster consists of same label.
          cy.clickNavMenu(['Cluster Groups']);
          cy.contains('.title', 'Cluster Groups').should('be.visible');
          cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

          // Create a GitRepo targeting cluster group created.
          if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
            cy.clickNavMenu(['Resources']);
            cy.clickNavMenu(['Git Repos']);
            cy.wait(1000);
            cy.clickButton('Add Repository');
            cy.wait(1000);
            cy.clickButton('Edit as YAML');
            cy.addYamlFile('assets/cluster-group-tests/clusterGroup.yaml');
          }
          else {
            cy.clusterCountClusterGroup(clusterGroupName, 2);
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, deployToTarget: clusterGroupName });
          }
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1');

          // Check application status on both clusters i.e. imported-0 and imported-1
          dsFirstTwoClusterList.forEach(
            (dsCluster) => {
              cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
            }
          )

          if (qase_id === 27) {
            cy.accesMenuSelection('Continuous Delivery', 'Clusters');
            cy.contains('.title', 'Clusters').should('be.visible');

            // Add label to the third cluster i.e. imported-2
            cy.assignClusterLabel(dsThirdClusterName, key, value);

            // Check existing clusterGroup for third cluster (imported-2) is added.
            if (!(supported_versions_212_and_above.some(r => r.test(rancherVersion)))) {
              cy.clusterCountClusterGroup(clusterGroupName, 3);
            }

            // Check application is deployed on third cluster i.e. imported-2
            cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

            // Remove label from the third cluster i.e. imported-2
            cy.wait(500);
            cy.accesMenuSelection('Continuous Delivery', 'Clusters');
            cy.removeClusterLabels(dsThirdClusterName, key, value);
          }

          // Remove labels from the All 3 clusters.
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          dsAllClusterList.forEach(
            (dsCluster) => {
              // Adding wait to load page correctly to avoid interference with hamburger-menu.
              cy.wait(500);
              cy.removeClusterLabels(dsCluster, key, value);
            }
          )
          cy.deleteClusterGroups();
        })
      )
    }
  )

  qase(26,
    it("Fleet-26: Test install multiple applications to the all defined clusters in the 'clusterGroup'", { tags: '@fleet-26' }, () => {
      const repoName = 'default-single-app-cluster-group-26'
      const path2 = 'multiple-paths/config'

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Assign label to the first 2 clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create group of cluster consists of same label.
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

      // Create a GitRepo targeting cluster group created.
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.clickNavMenu(['Resources']);
        cy.clickNavMenu(['Git Repos']);
        cy.wait(1000);
        cy.clickButton('Add Repository');
        cy.wait(1000);
        cy.clickButton('Edit as YAML');
        cy.addYamlFile('assets/cluster-group-tests/clusterGroupMultipleApps.yaml');
      }
      else {
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, path2, deployToTarget: clusterGroupName });
      }
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '2 / 2');

      // Check first application status on both clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      dsFirstTwoClusterList.forEach((dsCluster) => {
        // Check second application status on both clusters i.e. imported-0 and imported-1
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.accesMenuSelection(dsCluster, "Storage", "ConfigMaps");
        cy.nameSpaceMenuToggle("test-fleet-mp-config");
        cy.filterInSearchBox("mp-app-config");
        cy.get('td.col-link-detail > span').contains("mp-app-config").click();
      })

      // Remove labels from the clusters i.e. imported-0 and imported-1
      cy.wait(1000);
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )
    })
  )

  qase(28,
    it("Fleet-28: Test remove existing application from cluster-2 by removing it from an existing 'clusterGroup'", { tags: '@fleet-28' }, () => {
      let repoName
      repoName = 'default-single-app-cluster-group-28'
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        repoName = "default-single-app-cluster-group"
      }

      const dsSecondClusterName = dsAllClusterList[1]

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Assign label to the clusters 
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create group of cluster consists of same label.
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

      // Create a GitRepo targeting cluster group created.
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.clickNavMenu(['Resources']);
        cy.clickNavMenu(['Git Repos']);
        cy.wait(1000);
        cy.clickButton('Add Repository');
        cy.wait(1000);
        cy.clickButton('Edit as YAML');
        cy.addYamlFile('assets/cluster-group-tests/clusterGroup.yaml');
      }
      else {
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, deployToTarget: clusterGroupName });
      }
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1');

      // Check first application status on both clusters.
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      // Check application is not installed on third cluster i.e. imported-2
      cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces', false);

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Remove label from the Second cluster i.e. imported-1
      cy.wait(500);
      cy.removeClusterLabels(dsSecondClusterName, key, value);

      // Check application is absent i.e. removed from second cluster i.e. imported-1
      cy.checkApplicationStatus(appName, dsSecondClusterName, 'All Namespaces', false);

      // Check application is available on first cluster i.e. imported-0

      // Remove labels from the clusters.
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )
      // Delete clusterGroups.
      cy.deleteClusterGroups();
    })
  )

  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    console.log({message: "UI for `clusterGroup` option is removed and available only via YAML. So Skipping tests."})
  }
  else {
    qase(29,
    it("Fleet-29: Test install app to new set of clusters from old set of clusters using 'clusterGroup'", { tags: '@fleet-29' }, () => {
      const repoName = 'default-single-app-cluster-group-29'
      const new_key = 'key_third_cluster'
      const new_value = 'value_third_cluster'
      const newClusterGroupName = 'cluster-group-env-third-cluster'

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Check application status on both clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create group of cluster consists of same label.
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

      // Create a GitRepo targeting cluster group created.
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, deployToTarget: clusterGroupName });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1');

      // Check first application status on both clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      // Add label to the third cluster
      cy.continuousDeliveryMenuSelection();
      cy.clickNavMenu(['Clusters']);
      cy.contains('.title', 'Clusters').should('be.visible');
      cy.assignClusterLabel(dsThirdClusterName, new_key, new_value);

      // Create another clusterGroup using third cluster.
      const newBannerMessageToAssert = /Matches 1 of 3 existing clusters: "imported-\d"/
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(newClusterGroupName, new_key, new_value, newBannerMessageToAssert);

      // Update GitRepo with newly created clusterGroup.
      cy.addFleetGitRepo({ repoName, deployToTarget: newClusterGroupName, fleetNamespace: 'fleet-default', editConfig: true });
      cy.clickButton('Save');
      cy.checkGitRepoStatus(repoName, '1 / 1');

      // Check application is present on third cluster i.e. imported-2
      cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

      // Applying Force Update in 2.9 and 2.10 versions only as it doesn't have cluster sync logic
      if (/\/2\.10/.test(Cypress.env('rancher_version')) || /\/2\.9/.test(Cypress.env('rancher_version'))) {
        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        cy.contains('.title', 'Clusters').should('be.visible');
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.filterInSearchBox(dsCluster);
            cy.open3dotsMenu(dsCluster, 'Force Update');
            cy.wait(2000); // It take some time to Update.
            cy.verifyTableRow(0, 'Active');
          }
        )
      }

      // Check application status on first 2 clusters i.e. imported-0 and imported-1
      // Application should be removed from first 2 clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces', false);
        }
      )

      // Remove labels from the clusters i.e. imported-0 and imported-1
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )

      // Remove labels from third cluster i.e. imported-2
      cy.removeClusterLabels(dsThirdClusterName, new_key, new_value);

      // Delete clusterGroups.
      cy.deleteClusterGroups();
    })
    )
  }
});

describe("Test Application deployment based on 'clusterSelector'", { tags: '@p1_2'}, () => {
  const key = 'key_env'
  const value = 'value_testing'
  let gitRepoFile

  beforeEach('Cleanup leftover GitRepo if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteAllFleetRepos();
    // Remove labels from the clusters.
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )
  })

  const clusterSelector: testData[] = [
    {
      qase_id: 9,
      app: 'single-app',
      test_explanation: "single-app to the 2 clusters",
      bundle_count: '1 / 1',
    },
    {
      qase_id: 18,
      app: 'multiple-apps',
      test_explanation: "multiple-apps to the 2 clusters",
      bundle_count: '2 / 2',
    },
    {
      qase_id: 20,
      app: 'single-app',
      test_explanation: "install existing application to the third cluster by adding it to the existing",
      bundle_count: '1 / 1',
    },
  ]

  clusterSelector.forEach(({ qase_id, app, test_explanation, bundle_count }) => {
    qase(qase_id,
      it(`Test install ${test_explanation} using clusterSelector(matchLabels) in GitRepo`, { tags: `@fleet-${qase_id}` }, () => {

        cy.continuousDeliveryMenuSelection();
        cy.clickNavMenu(['Clusters']);
        cy.contains('.title', 'Clusters').should('be.visible');
        // Assign label to the clusters 
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.assignClusterLabel(dsCluster, key, value);
          }
        )

        // Get GitRepo YAML file according to test.
        if (qase_id === 9 || qase_id === 20) {
          gitRepoFile = 'assets/git-repo-single-app-cluster-selector.yaml'
        }
        else if (qase_id === 18){
          gitRepoFile = 'assets/git-repo-multiple-app-cluster-selector.yaml'
        }
        else {
          throw Error("There is not GitRepo file present for given test case.")
        }

        // Create a GitRepo targeting cluster group created from YAML.
        if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
          cy.clickNavMenu(['Resources']);
        }
        cy.clickNavMenu(['Git Repos']);
        cy.wait(1000);

        cy.clickButton('Add Repository');
        // Cypress too fast to click on button.
        cy.wait(1000);
        cy.clickButton('Edit as YAML');
        cy.addYamlFile(gitRepoFile);
        cy.clickButton('Create');
        cy.checkGitRepoStatus(`default-${app}-cluster-selector`, `${bundle_count}`);

        // Check application status on both clusters.
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
          }
        )

        // Add same label on third cluster
        if (qase_id === 20) {
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.contains('.title', 'Clusters').should('be.visible');

          // Add label to the third cluster
          cy.assignClusterLabel(dsThirdClusterName, key, value);

          // Check application deployed to third cluster
          cy.wait(500);
          cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

          // Remove label from the third cluster.
          cy.wait(500);
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.removeClusterLabels(dsThirdClusterName, key, value);
        }

        // Check another application on each cluster.
        // This check is valid for deploy muilple application
        // on cluster selector test only.
        if (qase_id === 18) {
          dsFirstTwoClusterList.forEach((dsCluster) => {
            // Check second application status on both clusters.
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.accesMenuSelection(dsCluster, "Storage", "ConfigMaps");
            cy.nameSpaceMenuToggle("test-fleet-mp-config");
            cy.filterInSearchBox("mp-app-config");
            cy.get('td.col-link-detail > span').contains("mp-app-config").click();
          })
        }

        // Remove labels from the clusters.
        cy.wait(5000);
        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.removeClusterLabels(dsCluster, key, value);
          }
        )
      })
    )
  })

  qase(19,
    it("Fleet-19: Test remove label from cluster-2 to remove application from it when application deployed using clusterSelector(matchLabels)", { tags: '@fleet-19' }, () => {
      const dsSecondClusterName = dsAllClusterList[1]
      gitRepoFile = 'assets/git-repo-multiple-app-cluster-selector.yaml'

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Assign label to the clusters 
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create a GitRepo targeting cluster group created from YAML.
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.clickNavMenu(['Resources']);
      }
      cy.clickNavMenu(['Git Repos']);
      cy.wait(1000);
      cy.clickButton('Add Repository');
      cy.wait(1000);
      cy.clickButton('Edit as YAML');
      cy.addYamlFile(gitRepoFile);
      cy.clickButton('Create');
      cy.checkGitRepoStatus('default-multiple-apps-cluster-selector', '2 / 2');

      // Check first application status on both clusters.
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      // Remove label from the Second cluster i.e. imported-1
      cy.wait(500);
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.removeClusterLabels(dsSecondClusterName, key, value);

      // Check application is absent i.e. removed from second cluster i.e. imported-1
      cy.checkApplicationStatus(appName, dsSecondClusterName, 'All Namespaces', false);

      // Check application is available on first cluster i.e. imported-0
      cy.checkApplicationStatus(appName, dsFirstClusterName, 'All Namespaces');

      // Remove labels from the clusters.
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )
    })
  )
  qase(22,
    it("Fleet-22: Test install app to new set of clusters from old set of clusters", { tags: '@fleet-22' }, () => {
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        console.log({message: "UI for `clusterGroup` option is removed and available only via YAML. So Skipping tests."})
      }
      else {
        const repoName = 'default-multiple-apps-cluster-selector'
        const new_key = 'key_third_cluster'
        const new_value = 'value_third_cluster'

        gitRepoFile = 'assets/git-repo-multiple-app-cluster-selector.yaml'

        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        cy.contains('.title', 'Clusters').should('be.visible');

        // Assign label to the clusters 
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.assignClusterLabel(dsCluster, key, value);
          }
        )

        // Create a GitRepo targeting cluster selector created from YAML.
        if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
          cy.clickNavMenu(['Resources']);
        }
        cy.clickNavMenu(['Git Repos']);
        cy.wait(1000);
        cy.clickButton('Add Repository');
        cy.wait(1000);
        cy.clickButton('Edit as YAML');
        cy.addYamlFile(gitRepoFile);
        cy.clickButton('Create');
        cy.checkGitRepoStatus('default-multiple-apps-cluster-selector', '2 / 2');

        // Check first application status on both clusters.
        dsFirstTwoClusterList.forEach((dsCluster) => {
          cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
        })

        // Add label to the third cluster
        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        cy.contains('.title', 'Clusters').should('be.visible');
        cy.assignClusterLabel(dsThirdClusterName, new_key, new_value);

        // Update GitRepo with newly created clusterGroup.
        cy.addFleetGitRepo({ repoName, deployToTarget: "Advanced", fleetNamespace: 'fleet-default', editConfig: true });
        cy.clickButton('Save');
        cy.checkGitRepoStatus(repoName, '2 / 2');

        // Check application is present on third cluster i.e. imported-2
        cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

        // Applying Force Update in 2.9 and 2.10 versions only as it doesn't have cluster sync logic
        if (/\/2\.10/.test(Cypress.env('rancher_version')) || /\/2\.9/.test(Cypress.env('rancher_version'))) {
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.contains('.title', 'Clusters').should('be.visible');
          dsFirstTwoClusterList.forEach(
            (dsCluster) => {
              cy.filterInSearchBox(dsCluster);
              cy.open3dotsMenu(dsCluster, 'Force Update');
              cy.wait(2000); // It take some time to Update.
              cy.verifyTableRow(0, 'Active');
            }
          )
        }

        // Check application status on first 2 clusters i.e. imported-0 and imported-1
        // Application should be removed from first 2 clusters i.e. imported-0 and imported-1
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces', false);
          }
        )

        // Remove labels from the clusters i.e. imported-0 and imported-1
        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.removeClusterLabels(dsCluster, key, value);
          }
        )

        // Remove labels from third cluster i.e. imported-2
        cy.removeClusterLabels(dsThirdClusterName, new_key, new_value);
      }
    })
  )
});

describe("Test Application deployment based on 'clusterGroupSelector'", { tags: '@p1_2'}, () => {
  const clusterGroupLabelKey = 'cluster_group_selector_env'
  const clusterGroupLabelValue = 'cluster_group_selector_test'
  let clusterGroupSelectorFile

  beforeEach('Cleanup leftover GitRepo if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteAllFleetRepos();
    // Remove labels from the clusters.
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )

    cy.deleteClusterGroups();
  })

  const clusterSelector: testData[] = [
    {
      qase_id: 30,
      app: 'single-app',
      test_explanation: "single-app to the multiple",
      bundle_count: '1 / 1',
    },
    {
      qase_id: 31,
      app: 'multi-apps',
      test_explanation: "multiple-apps to the multiple",
      bundle_count: '2 / 2',
    },
    {
      qase_id: 32,
      app: 'single-app',
      test_explanation: "install existing application to the third cluster by adding it to the existing",
      bundle_count: '1 / 1',
    },
  ]

  clusterSelector.forEach(({ qase_id, app, test_explanation, bundle_count }) => {
    qase(qase_id,
      it(`Fleet-${qase_id}: Test install ${test_explanation}  cluster using "clusterGroupSelector"`, { tags: `@fleet-${qase_id}` }, () => {

        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        cy.contains('.title', 'Clusters').should('be.visible');

        // Assign label to the first 2 clusters i.e. imported-0 and imported-1
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.assignClusterLabel(dsCluster, key, value);
          }
        )

        // Adding explicit wait here till the labels are reflected on Clusters.
        cy.wait(5000);

        // Create group of cluster consists of same label.
        cy.clickNavMenu(['Cluster Groups']);
        cy.contains('.title', 'Cluster Groups').should('be.visible');
        cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert, true, clusterGroupLabelKey, clusterGroupLabelValue);

        // Get GitRepo YAML file according to test.
        if (qase_id === 30 || qase_id === 32) {
          clusterGroupSelectorFile = 'assets/gitrepo-single-app-cluster-group-selector.yaml'
        }
        else if (qase_id === 31){
          clusterGroupSelectorFile = 'assets/gitrepo-multi-app-cluster-group-selector.yaml'
        }
        else {
          throw Error("There is not GitRepo file present for given test case.")
        }

        // Create a GitRepo targeting cluster group created from YAML.
        if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
          cy.clickNavMenu(['Resources']);
        }
        cy.clickNavMenu(['Git Repos']);
        cy.wait(1000);

        cy.clickButton('Add Repository');
        cy.wait(1000);
        cy.clickButton('Edit as YAML');
        cy.addYamlFile(clusterGroupSelectorFile);
        cy.clickButton('Create');
        cy.checkGitRepoStatus(`default-${app}-cluster-group-selector`, `${bundle_count}`);

        // Check application status on both clusters.
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
          }
        )

        // Ensure application is not present on third cluster i.e. imported-2
        // by passing 'present: false' to 'checkApplicationStatus'
        cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces', false);

        // Add same label on third cluster i.e. imported-2
        if (qase_id === 32) {
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.contains('.title', 'Clusters').should('be.visible');

          // Add label to the third cluster i.e. imported-2
          cy.assignClusterLabel(dsThirdClusterName, key, value);

          // Check application deployed to third cluster(imported-2)
          // Along with other 2 clusters (imported-0 and imported-1).
          cy.wait(500);
          cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

          // Remove label from the third cluster.
          cy.wait(500);
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.removeClusterLabels(dsThirdClusterName, key, value);
        }

        // Check another application on each cluster.
        // This check is valid for deploy muilple application
        // on cluster selector test only.
        if (qase_id === 31) {
          dsFirstTwoClusterList.forEach((dsCluster) => {
            // Check second application status on both clusters.
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.accesMenuSelection(dsCluster, "Storage", "ConfigMaps");
            cy.nameSpaceMenuToggle("test-fleet-mp-config");
            cy.filterInSearchBox("mp-app-config");
            cy.get('td.col-link-detail > span').contains("mp-app-config").click();
          })
        }

        // Remove labels from the clusters.
        cy.wait(1000);
        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.removeClusterLabels(dsCluster, key, value);
          }
        )
      })
    )
  })
});

if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))){

  describe('Test namespace deletion when bundle is deleted', { tags: '@p1_2'}, () => {
    
    qase(131,
      it("Fleet-131: Test NAMESPACE will be DELETED after GitRepo is deleted.", { tags: '@fleet-131' }, () => {
        const repoName = 'test-ns-deleted-when-bundle-deleted'
        const namespaceName = 'my-custom-namespace'

        cy.fleetNamespaceToggle('fleet-local');
        cy.clickCreateGitRepo();
        cy.clickButton('Edit as YAML');
        cy.addYamlFile('assets/131-ns-deleted-when-bundle-deleted.yaml');
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

        // Check namespace is created 
        cy.accesMenuSelection('local', 'Projects/Namespaces');
        cy.filterInSearchBox(namespaceName);
        cy.verifyTableRow(0, 'Active', namespaceName);

        // Delete GitRepo
        cy.deleteAllFleetRepos();

        // Check namespace is deleted
        cy.accesMenuSelection('local', 'Projects/Namespaces');
        cy.filterInSearchBox(namespaceName);
        cy.contains(namespaceName).should('not.exist');
      })
    )

    qase(164,
      it("Fleet-164: Test NAMESPACE will be DELETED after main NESTED GitRepo is deleted.", { tags: '@fleet-164' }, () => {
        const repoName = 'test-ns-deleted-with-nested-bundle'
        const repoName2= 'my-gitrepo'
        const namespaceName = 'my-custom-namespace'
        const repoUrl = 'https://github.com/fleetqa/fleet-qa-examples-public'
        const branch = 'main'
        const path = 'bundles-delete-namespaces-nested'

        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
        cy.clickButton('Create');
        // As 2 gitrepos are created, we need to wait for both to be displayed
        // before we can check the status
        cy.wait(2000);
        cy.verifyTableRow(1, 'Active', repoName);
        cy.verifyTableRow(0, 'Active', repoName2);

        // Check namespace is created 
        cy.accesMenuSelection('local', 'Projects/Namespaces');
        cy.filterInSearchBox(namespaceName);
        cy.verifyTableRow(0, 'Active', namespaceName);

        // Go back to the GitRepos and delete only the main one
        cy.continuousDeliveryMenuSelection();
        cy.fleetNamespaceToggle('fleet-local');
        cy.filterInSearchBox(repoName); // this is the main one
        
        // Since whe expeect that the deletion of the main one also
        // deletes the nested one, the 'deleteAll' function will check this
        cy.deleteAll();

        // Check namespace is deleted
        cy.accesMenuSelection('local', 'Projects/Namespaces');
        cy.filterInSearchBox(namespaceName);
        cy.contains(namespaceName, {timeout: 20000 }).should('not.exist');
     })
    )
  })
};

if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))) {
  describe('Test Fleet Resource Count', { tags: '@p1_2'}, () => {
    qase(155,
      it("Fleet-155: Test clusters resource count is correct", { tags: '@fleet-155' }, () => {

        const repoName = 'default-cluster-count-155'
        const branch = "master"
        const path = "simple"
        const repoUrl = "https://github.com/rancher/fleet-examples"
        const timeout = 50000
        let resourceCount = '18 / 18'
        let multipliedResourceCount = true

        if (/\/2\.10/.test(Cypress.env('rancher_version')) || /\/2\.9/.test(Cypress.env('rancher_version'))) {
          resourceCount = '6 / 6'
          multipliedResourceCount = false
        }

        // Get Default Resources from single cluster before GitRepo.
        cy.currentClusterResourceCount(dsFirstClusterName);

        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, '1 / 1', resourceCount, timeout);

        // Get the Resource count from GitRepo and store it.
        cy.gitRepoResourceCountAsInteger(repoName, 'fleet-default');

        // Get Actual Resources from single cluster by subtracting default resources.
        cy.actualResourceOnCluster(dsFirstClusterName);

        // Compare Resource count from GitRepo with Cluster resource.
        cy.compareClusterResourceCount(multipliedResourceCount);

        cy.deleteAllFleetRepos();
      })
    )
  });
}

describe('Test move cluster to newly created workspace and deploy application to it.', { tags: '@p1_2'}, () => {
  qase(51,
    it("Fleet-51: Test move cluster to newly created workspace and deploy application to it.", { tags: '@fleet-51' }, () => {
      const repoName = 'default-cluster-new-workspace-51'
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"
      const flagName = "provisioningv2-fleet-workspace-back-population"
      const newWorkspaceName = "new-fleet-workspace"
      const fleetDefault = "fleet-default"
      let timeout = 30000

      //Version check for 2.12 (head)
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        timeout = 60000
      }

      // Enable cluster can move to another Fleet workspace feature flag.
      cy.enableFeatureFlag(flagName);

      // Create new workspace.
      cy.createNewFleetWorkspace(newWorkspaceName);

      // Switch to 'fleet-default' workspace
      cy.fleetNamespaceToggle(fleetDefault);
      cy.clickNavMenu(['Clusters']);

      // Move first cluster i.e. 'imported-0' to newly created workspace.
      cy.moveClusterToWorkspace(dsFirstClusterName, newWorkspaceName, timeout);

      // Create a GitRepo targeting to cluster available in newly created workspace.
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.fleetNamespaceToggle(newWorkspaceName);
      cy.clickButton('Create');

      // Review below line after all tests passed.
      cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');

      // Delete GitRepo
      // In Fleet Workspace, namespace name similarly treated as namespace.
      cy.deleteAllFleetRepos(newWorkspaceName);

      // Move cluster back to 'fleet-default' workspace
      cy.fleetNamespaceToggle(newWorkspaceName);
      cy.restoreClusterToDefaultWorkspace(dsFirstClusterName, timeout);

      // Delete the newly created workspace
      cy.continuousDeliveryMenuSelection()
      cy.continuousDeliveryWorkspacesMenu()
      cy.filterInSearchBox(newWorkspaceName)
      cy.deleteAll(false);
    })
  )
});


describe('Test no HTML error messages in HelmOps', { tags: '@p1_2' }, () => {

  qase(190,
    it('FLEET-190: Test Faulty Helm Ops display short error message', { tags: '@fleet-190' }, () => { 

      cy.addHelmOp({ 
        fleetNamespace: 'fleet-local', 
        repoName: 'faulty-helm-ops',
        repoUrl: 'https://github.com/rancher',
        chart: 'fleet-examples/tree/master/single-cluster/helm',
      });

      cy.contains('Could not get a chart version: failed to read helm repo from https://github.com/rancher/index.yaml, error code: 404').should('be.visible');      

    })
  );
});

describe('Test Helm app with Custom Values', { tags: '@p1_2' }, () => {
  const configMapName = "test-map"
  const repoTestData: testData[] = [
    {qase_id: 173, message: '`valuesFrom` with empty', path:'qa-test-apps/helm-app/values-from-with-empty-values' },
    {qase_id: 174, message: '`valuesFrom` with NO', path:'qa-test-apps/helm-app/values-from-with-no-values' },
    {qase_id: 175, message: '`valuesFiles` with empty', path: 'qa-test-apps/helm-app/values-files-with-empty-values' },
    {qase_id: 176, message: '`valuesFiles` with NO', path: 'qa-test-apps/helm-app/values-files-with-no-values' }
  ]

  beforeEach('Cleanup leftover GitRepo and ConfigMap if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteConfigMap(configMapName);
    cy.deleteAllFleetRepos();
  })

  repoTestData.forEach(({ qase_id, message, path }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test helm-app using "${message}" values in the fleet.yaml file.`, { tags: `@fleet-${qase_id}`}, () => {
        const repoName = `local-cluster-fleet-${qase_id}`

        // Create ConfigMap before create GitRepo
        if (qase_id === 173 || qase_id === 174) {
          cy.createConfigMap(configMapName);
        }

        // Create GitRepo
        cy.continuousDeliveryMenuSelection();
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', repoName);
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

        // Delete GitRepo
        cy.deleteAllFleetRepos();
      })
    );
  });
});

describe('Create specified bundles from GitRepo', { tags: '@p1_2' }, () => {
  const repoTestData: testData[] = [
    {
      qase_id: 180,
      test_name: 'Test GitRepo creates bundles specified under bundles: without option: field',
      repoName: 'test-bundle',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/180-gitrepo-create-bundle.yaml',
      bundle_count: '3 / 3',
      resource_count: '12 / 12',
      expectedBundles: [
        "test-bundle-driven-helm",
        "test-bundle-driven-kustomize",
        "test-bundle-driven-simple",
      ],
    },
    {
      qase_id: 181,
      test_name: 'Test GitRepo creates bundles specified under bundles: with option: field',
      repoName: 'test-bundle-dev-prod',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/181-gitrepo-create-dev-prod-bundle.yaml',
      bundle_count: '4 / 4',
      resource_count: '15 / 15',
      expectedBundles: [
        "test-bundle-dev-prod-driven-helm",
        "test-bundle-dev-prod-driven-kustomize-dev",
        "test-bundle-dev-prod-driven-kustomize-prod",
        "test-bundle-dev-prod-driven-simple",
      ],
    },
    {
      qase_id: 182,
      test_name: 'Test update GitRepo by removing prod.yaml from option and verify that prod bundle should not be created.',
      repoName: 'test-bundle-dev',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/182-gitrepo-create-dev-bundle.yaml',
      bundle_count: '3 / 3',
      resource_count: '12 / 12',
      expectedBundles: [
        "test-bundle-dev-driven-helm",
        "test-bundle-dev-driven-kustomize-dev",
        "test-bundle-dev-driven-simple",
      ],
    },
    {
      qase_id: 183,
      test_name: 'Test update GitRepo by adding test.yaml under option and verify that prod bundle should not be created.',
      repoName: 'test-bundle-dev-test',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/183-gitrepo-create-dev-test-bundle.yaml',
      bundle_count: '4 / 4',
      resource_count: '15 / 15',
      expectedBundles: [
        "test-bundle-dev-test-driven-helm",
        "test-bundle-dev-test-driven-kustomize-dev",
        "test-bundle-dev-test-driven-kustomize-test",
        "test-bundle-dev-test-driven-simple",
      ],
    },
  ]

  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    beforeEach('Cleanup leftover GitRepo', () => {
      cy.login();
      cy.visit('/');
      cy.deleteAllFleetRepos();
    })

    repoTestData.forEach(({ qase_id, test_name, repoName, gitrepo_file, bundle_count, resource_count, expectedBundles }) => {
      it(`FLEET-${qase_id}: ${test_name}`, { tags: `@fleet-${qase_id}`}, () => {
        // Create GitRepo
        cy.continuousDeliveryMenuSelection()
        cy.clickCreateGitRepo();
        cy.clickButton('Edit as YAML');
        cy.wait(1000);
        cy.addYamlFile(gitrepo_file);
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, bundle_count, resource_count);
        cy.continuousDeliveryBundlesMenu();
        expectedBundles.forEach((bundle_name: string) => {
          cy.filterInSearchBox(bundle_name);
          cy.verifyTableRow(0, 'Active', bundle_name);
        });

        // Delete GitRepo
        cy.deleteAllFleetRepos();
      })
    });
  }
});

describe('Test Fleet bundle status for longhorn-crd', { tags: '@p1_2'}, () => {

  qase(139,

    it("Fleet-139: Test CRD's for longhorn application should be in active state not in modified state when correctDrift enabled", { tags: '@fleet-139' }, () => {

      const repoName = 'default-longhorn-crd-bundle-status'
      const path = "qa-test-apps/longhorn-crd"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift: 'yes' });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '66 / 66');

      // Check bundle status of longhorn-crd
      cy.continuousDeliveryBundlesMenu();
      cy.filterInSearchBox(repoName);
      cy.verifyTableRow(0, 'Active', repoName);

      cy.deleteAllFleetRepos();

    })
  )
});

describe('Test non-yaml file into bundle.', { tags: '@p1_2'}, () => {

  qase(87,

    it("Fleet-87: Test .fleetignore ignores content of non-yaml file into bundle.", { tags: '@fleet-87' }, () => {

      const repoName = 'test-resource-ignore'
      const path = "qa-test-apps/fleet-ignore-test"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');

      cy.checkGitRepoStatus(repoName, '1 / 1', '3 / 3');

      dsAllClusterList.forEach(
        (dsCluster) => {
          // Verify only nginx application created on each cluster.
          cy.checkApplicationStatus("nginx-not-to-be-ignore", dsCluster, 'All Namespaces');

          // Verify that No ConfigMaps is created which is present on the path.
          cy.checkApplicationStatus("test-config-map-ignored", dsCluster, 'All Namespaces', false, 'Storage', 'ConfigMaps');
          cy.checkApplicationStatus("config-map-ignored", dsCluster, 'All Namespaces', false, 'Storage', 'ConfigMaps');
        }
      )

      cy.deleteAllFleetRepos();

    })
  )
});
