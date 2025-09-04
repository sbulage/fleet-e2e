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

Cypress.config();
describe('Test Hardened Fleet deployment on PUBLIC repos',  { tags: '@hardening-tests' }, () => {
  qase(128,
    it('FLEET-128: Deploy application to LOCAL cluster is NOT possible', { tags: '@fleet-62' }, () => {

      const repoName = "local-cluster-error"
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
      // Adding check validate "Edit as Yaml" works
      cy.clickButton('Edit as YAML');
      cy.contains('apiVersion: fleet.cattle.io/v1alpha1').should('be.visible');
      cy.clickButton('Create')
      cy.checkGitRepoStatus(repoName, '0 / 1', '3 / 6');
      cy.verifyTableRow(0, 'Error', 'local-cluster-error-simple');
      cy.contains('NotReady(1) [Cluster fleet-local/local];').should('be.visible');
      cy.deleteAllFleetRepos();
    })
  );

  qase(185,
    it('FLEET-185: Deploy application to DOWNSTREAM clusters IS possible', { tags: '@fleet-185' }, () => {

      const repoName = "downstream-clusters-ok"
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: false });
      // Adding check validate "Edit as Yaml" works
      cy.clickButton('Edit as YAML');
      cy.contains('apiVersion: fleet.cattle.io/v1alpha1').should('be.visible');
      cy.clickButton('Create')
      cy.wait(2000);
      cy.checkGitRepoStatus(repoName, '1 / 1', '18 / 18');
      cy.verifyTableRow(0, 'Active', 'downstream-clusters-ok-simple');
    })
  );

});

