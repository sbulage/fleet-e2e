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

export const branch = "master";
export let upgrade = Cypress.env('upgrade') === 'true'

beforeEach(() => {
  cy.login();
  cy.visit('/');
});

Cypress.config();
describe('Test Fleet deployment on PRIVATE repos with SSH auth', { tags: '@upgrade' }, () => {
  qase(157,
    it(`FLEET-157: Test to install "NGINX" app using "SSH" auth on "GitLab" PRIVATE repository`, { tags: '@fleet-157', retries: 1 }, () => {
      const repoName = 'default-cluster-fleet-157'
      const gitAuthType = "ssh"
      const userOrPublicKey = Cypress.env("rsa_public_key_qa")
      const pwdOrPrivateKey = Cypress.env("rsa_private_key_qa")
      const repoUrl = "git@gitlab.com:fleetqa/fleet-qa-examples.git"
      const appName = "nginx-keep"
      const branch = "main"
      const path  = "nginx"
      const clusterName = "imported-0";

      if (upgrade) {
        cy.checkGitRepoAfterUpgrade(repoName, 'fleet-default');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
        cy.fleetNamespaceToggle('fleet-default')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
        cy.clickButton('Create');
      }
      cy.verifyTableRow(0, 'Active'); // Implicit wait due to https://github.corancher/dashboard/issues/12502
      cy.contains('0/0', { timeout: 20000 }).should('not.exist');
      cy.checkGitRepoStatus(repoName, '1 / 1');
      cy.checkApplicationStatus(appName, clusterName);
    })
  );
});

describe('Test Fleet deployment on PUBLIC repos',  { tags: '@upgrade' }, () => {
  qase(158,
    it('FLEET-158: Deploy application to local cluster', { tags: '@fleet-158' }, () => {
      const path = "simple"
      const repoUrl = 'https://github.com/rancher/fleet-examples'
      const repoName = "local-cluster-fleet-158"
      cy.log("===========================");
      cy.log("Cluster Upgraded: " + upgrade);
      cy.log("===========================");

      if (upgrade) {
        cy.checkGitRepoAfterUpgrade(repoName, 'fleet-local');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
        cy.fleetNamespaceToggle('fleet-local');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        // Adding check validate "Edit as Yaml" works
        cy.clickButton('Edit as YAML');
        cy.contains('apiVersion: fleet.cattle.io/v1alpha1').should('be.visible');
        cy.clickButton('Create')
      }
      cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
      cy.verifyTableRow(1, 'Service', 'frontend');
      cy.verifyTableRow(3, 'Service', 'redis-master');
      cy.verifyTableRow(5, 'Service', 'redis-slave');
    })
  );
});

describe('Test gitrepos with cabundle', { tags: '@upgrade' }, () => {
  qase(159,
    it("Fleet-159 Test cabundle secrets are not created without TLS certificate", { tags: '@fleet-159' }, () => {;
      const repoName = 'default-159-test-cabundle-secrets-not-created'
      const path = "qa-test-apps/nginx-app"
      const repoUrl = "https://github.com/rancher/fleet-test-data/"
      cy.log("===========================");
      cy.log("Cluster Upgraded: " + upgrade);
      cy.log("===========================");

      if (upgrade) {
        cy.checkGitRepoAfterUpgrade(repoName, 'fleet-local');
      }
      else {
          cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
          cy.fleetNamespaceToggle('fleet-local');
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
          cy.clickButton('Create');
          cy.verifyTableRow(0, 'Active', '1/1');
      }
      cy.accesMenuSelection('local', 'Storage', 'Secrets');

      // Confirm cabundle secret is NOT created for the specified gitrepo
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.filterInSearchBox(repoName+'-cabundle');
      cy.contains('There are no rows which match your search query.').should('be.visible');
    })
  );
});

if (!/\/2\.8/.test(Cypress.env('rancher_version')) && !/\/2\.9/.test(Cypress.env('rancher_version'))) {
  describe('Test Crontab for Fleet job cleanup is present',  { tags: '@upgrade' }, () => {
    qase(162,
      it('FLEET-162: Test Crontab for Fleet job cleanup is present', { tags: '@fleet-162' }, () => {
        // This test doesnot require upgrade flag as it not creating anything,
        // only checking the existance of Crontab for Fleet cleanup job.

        cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
        cy.filterInSearchBox('fleet-cleanup-gitrepo-jobs');

        // Check Crontab for Fleet Cleanup job present and is Active
        cy.verifyTableRow(0, 'Active', 'fleet-cleanup-gitrepo-jobs');

        // Check Crontab schedule is '@daily'
        cy.verifyTableRow(0, 'fleet-cleanup-gitrepo-jobs', '@daily');
      })
    );
  });
}

describe('Test "fleet-agent" image version on each downstream cluster',  { tags: '@upgrade' }, () => {
  qase(163,
    it('FLEET-163: Test "fleet-agent" image version on each downstream cluster after upgrade ', { tags: '@fleet-163' }, () => {
      const dsAllClusterList = ['imported-0', 'imported-1', 'imported-2']
      cy.log("===========================");
      cy.log("Cluster Upgraded: " + upgrade);
      cy.log("===========================");

      //'fleet_app_version' is before upgrade version.
      // For example 'fleet_app_version' is fleet-105.0.3+up0.11.3, after splitting
      // we get 'fleet_agent_version' is '0.11.3'.
      if (upgrade) {
        const fleetAgentVersionBeforeUpgrade = Cypress.env('fleet_app_version').split('+up')[1];
        cy.log('Fleet Agent image version BEFORE upgrade:' + fleetAgentVersionBeforeUpgrade)

        // Check fleet-agent version of the downstream clusters.
        dsAllClusterList.forEach((dsCluster) => {
          cy.accesMenuSelection(dsCluster, 'Workloads', 'Pods');
          cy.nameSpaceMenuToggle('All Namespaces');
          cy.filterInSearchBox('fleet-agent');
          cy.verifyTableRow(0, 'Running', 'fleet-agent');
          cy.contains('fleet-agent').click();
          cy.wait(500);
          cy.clickButton('Config');

          // We get 'fleetAgentImageAfterUpgrade' is 'rancher/fleet-agent:v0.12.0-alpha.4',
          // after splitting we get 'fleetAgentVersionAfterUpgrade' is '0.12.0-alpha.4'
          // We compare it with 'fleetAgentVersionBeforeUpgrade' which should "NOT" equal.
          cy.get('input[placeholder="e.g. nginx:latest"]')
            .invoke('val')
            .then((fleetAgentImageAfterUpgrade) => {
              if (typeof fleetAgentImageAfterUpgrade === 'string') {
                const fleetAgentVersionAfterUpgrade = fleetAgentImageAfterUpgrade.split(':v')[1];
                cy.log('Fleet Agent image version AFTER upgrade:' + fleetAgentVersionAfterUpgrade)
                cy.wrap(fleetAgentVersionAfterUpgrade)
                  .should('not.eq', fleetAgentVersionBeforeUpgrade)
              }
              else {
                cy.log('"fleetAgentImage" is "undefined" and can be processed further')
              }
            })
        })
      }
      else {
        cy.log("This test has to run After Upgrade only")
      }
    })
  );
});

describe('Test Upgrade Kubernetes version of imported cluster support for fleet',  { tags: '@k8supgrade' }, () => {
  qase(90,
    it('FLEET-90: Test Upgrade Kubernetes version of imported cluster support for fleet', { tags: '@fleet-90' }, () => {
      const dsAllClusterList = ['imported-0','imported-1', 'imported-2']
      if (upgrade) {
        cy.log("K8s Version for all downstream cluster upgraded to given K8s version.")
      }
      else {
        // Upgrade K8s version of downstream cluster.
        dsAllClusterList.forEach((dsCluster) => {
          cy.k8sUpgradeInRancher(dsCluster);
        })
      }
    })
  );
});
