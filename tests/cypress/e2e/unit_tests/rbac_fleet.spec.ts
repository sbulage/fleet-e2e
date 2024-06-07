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

export const uiPassword    = "rancherpassword"
export const roleTypeTemplate = "Global"

beforeEach(() => {
  cy.login();
  cy.visit('/');
});

Cypress.config();
describe('Test Fleet access with RBAC with custom roles using all verbs for User-Base and Standard User.', { tags: '@rbac' }, () => {

  qase(5,
    it('Test "User-Base" role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but NOT "Clusters" NOR "Clusters Groups"', { tags: '@fleet-5' }, () => {

      const baseUser      = "base-user"
      const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"
      // Create 'base-user' User using "User-Base"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName);

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // Ensuring the user IS able to access "Continuous Delivery" and
      // sub menu "GitRepo", "FleetWorkspaces" and "Bundles".
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500);
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');

      // Ensuring user cannot access Clusters nor Clusters Groups
      cy.accesMenuSelection('Continuous Delivery');
      cy.contains('Clusters').should('not.exist');
      cy.contains('Clusters Groups').should('not.exist');

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(baseUser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

});

describe('Test Fleet access with RBAC with custom roles using Standard User', { tags: '@rbac' }, () => {
  qase(43,
    it('Test "Standard Base" role user with "list" and "create" verbs for "fleetworkspaces" resource. User can NOT "edit" nor "delete" them', { tags: '@fleet-43' }, () => {
      
      const stduser = "std-user-43"
      const customRoleName = "fleetworkspaces-list-and-create-role"

      //  Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);
      
      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["list", "create"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able to "go to Continuous Delivery",
      //"go to Bundles" and "list" and "create" workspaces.
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      
      // Ensuring the user is not able to "edit" or "delete" workspaces.
      cy.open3dotsMenu('fleet-default', 'Delete', true);
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(stduser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

  qase(44,
    it('Test "Standard Base" role with custom role to "fleetworkspaces" with all verbs except "delete" can "edit" but can NOT "delete" them', { tags: '@fleet-44' }, () => {
      
      const stduser = "std-user-44"
      const customRoleName = "fleetworskspaces-all-but-delete-role"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able  to "list", "edit" and "create" workspaces.
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(1000)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.open3dotsMenu('fleet-default', 'Edit Config');
      cy.contains('allowedTargetNamespaces').should('be.visible');
      
      // Ensuring the user is not able to "delete" workspaces. 
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.open3dotsMenu('fleet-default', 'Delete', true);

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(stduser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

  qase(45,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" with ACTIONS "List", "Delete" can "list and delete" but can NOT "edit" them', { tags: '@fleet-45' }, () => {
      
      const stduser = "std-user-45"
      const customRoleName = "fleetworkspaces-list-and-delete-role"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["list", "delete"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able to "go to Continuous Delivery", "list" and "delete" workspaces.
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.contains('Delete').should('be.visible');
    
      // Ensuring the user is NOT able to "edit" workspaces. 
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(stduser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

  qase(42,
    it('Test "Standard User" role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but NOT "Cluster Registration Tokens" "BundleNamespaceMappings" and "GitRepoRestrictions"', { tags: '@fleet-42' }, () => {

      const baseUser      = "base-user"
      const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"

      // Create 'base-user' User using "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(baseUser, uiPassword, "Standard User", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName);

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // Ensuring the user IS able to access "Continuous Delivery" and
      // sub-menu "GitRepo", "FleetWorkspaces" and "Bundles".
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500);
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');

      // Ensuring user is not able to access "Cluster Registration Tokens",
      // "GitRepoRestrictions', "BundleNamespaceMappings".
      cy.accesMenuSelection('Continuous Delivery', 'Advanced');
      cy.contains('Cluster Registration Tokens').should('not.exist');
      cy.contains('GitRepoRestrictions').should('not.exist');
      cy.contains('BundleNamespaceMappings').should('not.exist');

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(baseUser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

});

describe('Test GitRepoRestrictions scenarios for GitRepo applicaiton deployment.', { tags: '@rbac' }, () => {
  qase(39,
    it('Test "GitRepoRestrictions" on non-existent namespace throws error in the UI', { tags: '@fleet-39' }, () => {
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-non-exists-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');
      cy.get('[data-testid="banner-content"] > span').contains('namespaces "iamnotexists" not found');
      cy.clickButton('Cancel');
    })
  )

  qase(40,
    it('Test "GitRepoRestrictions" override "defaultNamespace" in fleet.yaml of application over "allowedTargetNamespace"', { tags: '@fleet-40' }, () => {
      const repoName = 'local-gitreporestrictions-fleet-40'
      const branch = "master"
      const path = "qa-test-apps/nginx-app"
      const repoUrl = "https://github.com/rancher/fleet-test-data/"
      const appName = 'nginx-keep'
      const allowedTargetNamespace = 'allowed-namespace'

      // Create GitRepoRestrictions with allowedTargetNamespace
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-allowed-target-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');

      // Add Fleet repository and create it
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({repoName, repoUrl, branch, path});

      // Type allowed namespace name in the Target Namespace while creating GitRepo.
      // TODO: Add below Target Namespace input field into addFleetGitRepo when required.
      cy.get('input[placeholder="Optional: Require all resources to be in this namespace"]').type(allowedTargetNamespace);
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', repoName);
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify application is created in allowed namespace.
      cy.accesMenuSelection('local', 'Workloads', 'Pods');
      cy.nameSpaceMenuToggle(allowedTargetNamespace);
      cy.filterInSearchBox(appName);
      cy.get('.col-link-detail').contains(appName).should('be.visible');

      // Delete GitRepo
      cy.deleteAllFleetRepos();

      // Deleting GitRepoRestrictions from the fleet-local namespace
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      cy.fleetNamespaceToggle('fleet-local');
      cy.deleteAll(false);
    })
  )
});
