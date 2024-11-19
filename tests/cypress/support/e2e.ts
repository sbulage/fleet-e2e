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

import './commands';

declare global {
  // In Cypress functions should be declared with 'namespace'
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      // Functions declared in commands.ts
      open3dotsMenu(name: string, selection?: string, checkNotInMenu?: boolean): Chainable<Element>;
      addPathOnGitRepoCreate(path: string, index?: number): Chainable<Element>;
      gitRepoAuth(AuthType: string, userOrPublicKey?: string, pwdOrPrivateKey?: string, gitOrHelmAuth?: string, helmUrlRegex?: string): Chainable<Element>;
      addFleetGitRepo(repoName: string, repoUrl?: string, branch?: string, path?: string, path2?: string, fleetNamespace?: string, editConfig?: boolean, helmUrlRegex?: string, deployToTarget?: string, tlsOption?: string, tlsCertificate?: string ): Chainable<Element>;
      fleetNamespaceToggle(toggleOption: string): Chainable<Element>;
      verifyTableRow(rowNumber: number, expectedText1?: string|RegExp, expectedText2?: string|RegExp): Chainable<Element>;
      nameSpaceMenuToggle(namespaceName: string): Chainable<Element>;
      accesMenuSelection(firstAccessMenu: string, secondAccessMenu?: string, clickOption?: string): Chainable<Element>;
      filterInSearchBox(filterText: string): Chainable<Element>;
      deleteAll(fleetCheck?: boolean): Chainable<Element>;
      deleteAllFleetRepos(): Chainable<Element>;
      checkGitRepoStatus(repoName: string, bundles?: string, resources?: string): Chainable<Element>;
      checkApplicationStatus(appName: string, clusterName?: string, appNamespace?: string, present?: boolean): Chainable<Element>;
      deleteApplicationDeployment(clusterName?: string): Chainable<Element>;
      modifyDeployedApplication(appName: string, clusterName?: string): Chainable<Element>;
      createRoleTemplate(roleType: string, roleName: string, newUserDefault?: string['yes'|'no'], rules?: string[]): Chainable<Element>;
      assignRoleToUser(userName: string, roleName: string): Chainable<Element>;
      deleteUser(userName: string): Chainable<Element>;
      deleteAllUsers(): Chainable<Element>;
      deleteRole(roleName: string, roleTypeTemplate: string): Chainable<Element>;
      importYaml(clusterName: string, yamlFilePath: string): Chainable<Element>;
      allowRancherPreReleaseVersions(): Chainable<Element>;
      upgradeFleet(): Chainable<Element>;
      assignClusterLabel(clusterName: string, key: string, value: string): Chainable<Element>;
      createClusterGroup(clusterGroupName: string, key: string, value: string, bannerMessageToAssert: string|RegExp, assignClusterGroupLabel?: boolean, clusterGroupLabelKey?: string, clusterGroupLabelValue?: string): Chainable<Element>;
      deleteClusterGroups(): Chainable<Element>;
      deployToClusterOrClusterGroup(deployToTarget: string): Chainable<Element>;
      removeClusterLabels(clusterName: string, key: string, value: string): Chainable<Element>;
      clusterCountClusterGroup(clusterGroupName: string, clusterCount: number): Chainable<Element>;
      addYamlFile(yamlFilePath: string): Chainable<Element>;
      verifyJobDeleted(repoName: string, verifyJobDeletedEvent?: boolean ): Chainable<Element>;
    }
  }
}

// TODO handle redirection errors better?
// we see a lot of 'error navigation cancelled' uncaught exceptions that don't actually break anything; ignore them here
Cypress.on('uncaught:exception', (err, runnable, promise) => {
  // returning false here prevents Cypress from failing the test
  if (err.message.includes('navigation guard')) {
    return false;
  }
  if (err.message.includes('on cross-origin object')) {
    return false;
  }
  if (promise) {
    return false;
  }
});

require('cypress-dark');
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('cy-verify-downloads').addCustomCommand();
require('cypress-plugin-tab');
require('@rancher-ecp-qa/cypress-library');
import registerCypressGrep from '@cypress/grep'
registerCypressGrep()
