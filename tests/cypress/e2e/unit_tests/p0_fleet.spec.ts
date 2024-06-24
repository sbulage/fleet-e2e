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
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep";
export const clusterName = "imported-0";
export const branch = "main";
export const path  = "nginx"

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test Fleet deployment on PUBLIC repos',  { tags: '@p0' }, () => {
  qase(62,
    it('FLEET-62: Deploy application to local cluster', { tags: '@fleet-62' }, () => {

      const repoName = "local-cluster-fleet-62"
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"

      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
      cy.verifyTableRow(1, 'Service', 'frontend');
      cy.verifyTableRow(3, 'Service', 'redis-master');
      cy.verifyTableRow(5, 'Service', 'redis-slave');
      cy.deleteAllFleetRepos();
    })
  );
});

describe('Test Fleet deployment on PRIVATE repos with HTTP auth', { tags: '@p0' }, () => {

  const gitAuthType = "http"
  const repoTestData: testData[] = [
    {qase_id: 6, provider: 'GitLab',  repoUrl: 'https://gitlab.com/fleetqa/fleet-qa-examples.git'},
    {qase_id: 7, provider: 'Gh',  repoUrl: 'https://github.com/fleetqa/fleet-qa-examples.git'},
    {qase_id: 8, provider: 'Bitbucket', repoUrl: 'https://bitbucket.org/fleetqa-bb/fleet-qa-examples.git'},
    {qase_id: 98, provider: 'Azure',  repoUrl: 'https://dev.azure.com/fleetqateam/fleet-qa-examples/_git/fleet-qa-examples'}
  ]

  repoTestData.forEach(({ qase_id, provider, repoUrl }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test to install "NGINX" app using "HTTP" auth on "${provider}" PRIVATE repository`, { tags: `@fleet-${qase_id}`, retries: 1 }, () => {

        const repoName = `default-cluster-fleet-${qase_id}`
        const userOrPublicKey = Cypress.env(`${provider.toLowerCase()}_private_user`)
        const pwdOrPrivateKey = Cypress.env(`${provider.toLowerCase()}_private_pwd`)

        cy.fleetNamespaceToggle('fleet-default')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
        cy.checkApplicationStatus(appName, clusterName);
        cy.deleteAllFleetRepos();
      })
    );
  });
});

describe('Test Fleet deployment on PRIVATE repos with SSH auth', { tags: '@p0' }, () => {
  
  const gitAuthType = "ssh"
  const userOrPublicKey = Cypress.env("rsa_public_key_qa")
  const pwdOrPrivateKey = Cypress.env("rsa_private_key_qa")
  const repoTestData: testData[] = [
    {qase_id: 2, provider: 'GitLab', repoUrl: 'git@gitlab.com:fleetqa/fleet-qa-examples.git'},
    {qase_id: 3, provider: 'Bitbucket', repoUrl: 'git@bitbucket.org:fleetqa-bb/fleet-qa-examples.git'},
    {qase_id: 4, provider: 'Github', repoUrl: 'git@github.com:fleetqa/fleet-qa-examples.git'},
    {qase_id: 97, provider: 'Azure', repoUrl: 'git@ssh.dev.azure.com:v3/fleetqateam/fleet-qa-examples/fleet-qa-examples'}
  ]
  
  repoTestData.forEach(({ qase_id, provider, repoUrl }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test to install "NGINX" app using "SSH" auth on "${provider}" PRIVATE repository`, { tags: `@fleet-${qase_id}`, retries: 1 }, () => {
        
        const repoName = `default-cluster-fleet-${qase_id}`

        cy.fleetNamespaceToggle('fleet-default')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
        cy.checkApplicationStatus(appName, clusterName);
        cy.deleteAllFleetRepos();
      })
    );
  });
});


