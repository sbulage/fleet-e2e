/*
Copyright © 2023 - 2025 SUSE LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import 'cypress/support/commands';
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep";
export const clusterName = "imported-0";
export const branch = "main";
export const path  = "nginx"
export const sshString = ["Public key and private key for SSH", "Public key and private key for SSH authentication"]

beforeEach(() => {

  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();

});

describe('Test Fleet on AWS EC2 imported cluster', { tags: '@cloud_ds' }, () => {

    qase(186,
        // Cloud downstream cluster provisioning
        it('Import EC2 cluster into Rancher', () => {

            const cloudProvider = 'Amazon';
            const credentialName = 'qa-fleet-ec2-cloud-cred';
            const clusterName = 'qa-fleet-ec2-cluster';
            const accessKey = Cypress.env('aws_access_key_id');
            const secretKey = Cypress.env('aws_secret_access_key');
            const region = 'eu-central-1';
            const subnetId = 'fleetqa-mmt-subnet-public1-eu-central-1a';
            const cloudInstance = 'Amazon EC2';

            cy.createCloudCredential(cloudProvider, credentialName, accessKey, secretKey, region);
            cy.createCloudCluster(cloudInstance, clusterName, subnetId);
        })
    );

    qase(187,

        it('Add gitrepo and deploy app to EC2 cluster', () => {
            
            const repoName = 'nginx-app';
            const repoUrl = 'https://github.com/rancher/fleet-test-data/';
            const branch = 'master';
            const path = 'qa-test-apps/nginx-app';

            cy.addFleetGitRepo({repoName, repoUrl, branch, path, local: false });
            cy.clickButton('Create');
            cy.wait(45000); // Adding 45 seconds due to slow comunication and size of ec2 cluster
            cy.verifyTableRow(0, 'Active', '4/4');    // 4 clusters means gitrepo was deployed to ec2 cluster
        })
    );

    qase(188,

        it('Delete EC2 cluster', () => {

            const clusterName = 'qa-fleet-ec2-cluster';

            cy.deleteDownstreamCluster(clusterName, false);
        })
    );
});

if (!/\/2\.11/.test(Cypress.env('rancher_version')) && !/\/2\.12/.test(Cypress.env('rancher_version'))) {

describe('Agent Scheduling Customization', { tags: '@special_tests' }, () => {
  qase(200,
    it('FLEET-200: Test agent scheduling customization for PDB and PriorityClass', { tags: '@fleet-200' }, () => {
      // Go to the cluster and edit it as YAML
      cy.accesMenuSelection('Continuous Delivery', 'Clusters ');
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu('local', 'Edit Config');
      cy.clickButton('Edit as YAML');

      // Append the agent scheduling customization
      cy.get('.CodeMirror').then((codeMirrorElement) => {
        const cm = (codeMirrorElement[0] as any).CodeMirror;
        const currentYaml = cm.getValue();
        const snippet = `\
  agentSchedulingCustomization:
    priorityClass:
      value: 888
    podDisruptionBudget:
      minAvailable: "3"`;
        const newYaml = currentYaml.replace(/(\nspec:)/, `$1\n${snippet}`);
        cm.setValue(newYaml);
      });
      cy.clickButton('Save');
      
      // Verify the cluster is still Active
      cy.accesMenuSelection('Continuous Delivery', 'Clusters ');
      cy.fleetNamespaceToggle('fleet-local');
      cy.wait(2000); // Wait to allow time to the status to reach "Wait" before verifying"
      cy.verifyTableRow(0, 'Active', '1');

      // Verify PriorityClass and PodDisruptionBudget
      cy.accesMenuSelection('local', 'Policy', 'Pod Disruption Budgets');
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.verifyTableRow(0, 'fleet-agent', '3');
      cy.accesMenuSelection('local', 'More Resources', 'Scheduling');
      cy.contains('PriorityClasses').click();
      cy.verifyTableRow(0, 'fleet-agent', '888');
    }))
  });
};

// Note: to be executed after the above test cases
// to avoid any interference (i.e: if continuous-delivery feature is not correctly enabled.)
// To be replaced into other spec file when required.
describe("Global settings related tests", { tags: '@special_tests'}, () => {
  
    qase(156,
      it("Fleet-156: Test gitrepoJobsCleanup is disabled when continuous-delivery feature is off", { tags: '@fleet-156' }, () => {

        // Verify is gitrepoJobsCleanup is enabled by default.
        cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.verifyTableRow(0, 'Active', 'fleet-cleanup-gitrepo-jobs');
        
        // Disable continuous-delivery feature flag and wait for restart.
        cy.accesMenuSelection('Global Settings', 'Feature Flags');
        cy.open3dotsMenu('continuous-delivery', 'Deactivate' )
        cy.clickButton('Deactivate');
        cy.contains('Waiting for Restart', { timeout: 180000 }).should('not.exist');
        // Verify is gitrepoJobsCleanup job is not present
        cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
        cy.contains('fleet-cleanup-gitrepo-jobs').should('not.exist');

        // Re-enable continuous-delivery feature flag and wait for restart.
        cy.accesMenuSelection('Global Settings', 'Feature Flags');
        cy.open3dotsMenu('continuous-delivery', 'Activate' )
        cy.clickButton('Activate');
        cy.contains('Waiting for Restart', { timeout: 180000 }).should('not.exist');

        cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-cleanup-gitrepo-jobs');
        cy.verifyTableRow(0, 'Active', 'fleet-cleanup-gitrepo-jobs');

      })
    )
});
