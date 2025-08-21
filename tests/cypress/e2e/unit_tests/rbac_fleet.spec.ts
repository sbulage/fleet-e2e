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

// General constants
export const uiPassword    = "rancherpassword"
export const roleTypeTemplate = "Global"
// Gitrepos constants
export const repoName = "fleet-local-simple-chart"
export const branch = "master"
export const path = "simple-chart"
export const repoUrl = "https://github.com/rancher/fleet-test-data"
export const repoNameDefault = "fleet-default-nginx"
export const pathDefault = "qa-test-apps/nginx-app"
// Custom roles constants
export const customRoleName_1 = "gitrepo-list-fleetworkspaces-bundles-all-role"
export const customRoleName_2 = "gitrepo-list-create-fleetworkspaces-bundles-all-role"
export const customRoleName_3 = "gitrepo-list-create-update-get-fleetworkspaces-bundles-all-role"
export const customRoleName_4 = "gitrepo-list-delete-fleetworkspaces-bundles-all-role"
export const customRoleName_5 = "fleetworkspace-list-create-gitrepo-bundles-all-role"
export const customRoleName_6 = "fleetworkspace-all-except-delete-gitrepo-bundles-all-role"
export const customRoleName_7 = "fleetworkspace-list-delete-gitrepo-bundles-all-role"
export const rancherVersion = Cypress.env('rancher_version');
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|alpha)\/2\.(1[2-9]|[2-9]\d+)(\..*)?$/,
  /^head\/2\.(1[2-9])$/
];

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllUsers();
  cy.deleteRole('-role', roleTypeTemplate.toUpperCase());
});

Cypress.config();
describe('Test Fleet access with RBAC with custom roles using all verbs for User-Base and Standard User.', { tags: '@rbac' }, () => {

  qase(5,
    it('Test "User-Base" role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but NOT "Clusters" NOR "Clusters Groups"', { tags: '@fleet-5' }, () => {

      const baseUser      = "base-user"
      const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"
      // Create 'base-user' User using "User-Base"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

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
      cy.continuousDeliveryMenuSelection();
      cy.wait(500);
      cy.continuousDeliveryWorkspacesMenu();
      cy.continuousDeliveryBundlesMenu();

      // Ensuring user cannot access Clusters nor Clusters Groups
      cy.accesMenuSelection('Continuous Delivery');
      cy.contains('Clusters').should('not.exist');
      cy.contains('Clusters Groups').should('not.exist');
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
      cy.createNewUser(stduser, uiPassword);
      
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
      cy.continuousDeliveryMenuSelection();
      cy.wait(500)
      cy.continuousDeliveryBundlesMenu();
      cy.continuousDeliveryWorkspacesMenu();
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      
      // Ensuring the user is not able to "edit" or "delete" workspaces.
      cy.open3dotsMenu('fleet-default', 'Delete', true);
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);
    })
  )

  qase(44,
    it('Test "Standard Base" role with custom role to "fleetworkspaces" with all verbs except "delete" can "edit" but can NOT "delete" them', { tags: '@fleet-44' }, () => {
      
      const stduser = "std-user-44"
      const customRoleName = "fleetworskspaces-all-but-delete-role"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(stduser, uiPassword);

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
      cy.continuousDeliveryMenuSelection();
      cy.wait(1000)
      cy.continuousDeliveryBundlesMenu();
      cy.continuousDeliveryWorkspacesMenu();
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.open3dotsMenu('fleet-default', 'Edit Config');
      cy.contains('allowedTargetNamespaces').should('be.visible');
      
      // Ensuring the user is not able to "delete" workspaces. 
      cy.continuousDeliveryWorkspacesMenu();
      cy.open3dotsMenu('fleet-default', 'Delete', true);
    })
  )

  qase(45,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" with ACTIONS "List", "Delete" can "list and delete" but can NOT "edit" them', { tags: '@fleet-45' }, () => {
      
      const stduser = "std-user-45"
      const customRoleName = "fleetworkspaces-list-and-delete-role"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(stduser, uiPassword);

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
      cy.continuousDeliveryMenuSelection();
      cy.continuousDeliveryWorkspacesMenu();
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.contains('Delete').should('be.visible');
    
      // Ensuring the user is NOT able to "edit" workspaces. 
      cy.continuousDeliveryWorkspacesMenu();
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);
    })
  )

  qase(42,
    it('Test "Standard User" role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but NOT "Cluster Registration Tokens" "BundleNamespaceMappings" and "GitRepoRestrictions"', { tags: '@fleet-42' }, () => {

      const baseUser      = "base-user"
      const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"

      // Create 'base-user' User using "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "Standard User", true);

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
      cy.continuousDeliveryMenuSelection();
      cy.wait(500);
      cy.continuousDeliveryWorkspacesMenu();
      cy.continuousDeliveryBundlesMenu();

      // Ensuring user is not able to access "Cluster Registration Tokens",
      // "GitRepoRestrictions', "BundleNamespaceMappings".
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced');
      }
      cy.contains('Cluster Registration Tokens').should('not.exist');
      cy.contains('GitRepoRestrictions').should('not.exist');
      cy.contains('BundleNamespaceMappings').should('not.exist');
    })
  )
});
  
  describe('Test Fleet access with RBAC with "CUSTOM ROLES" and "GITREPOS" using "STANDARD USER"', { tags: '@rbac' }, () => {
    
    before('Deleting leftover Gitrepos preparing needed ones for next tests', () => {
      cy.login();
      cy.deleteAllFleetRepos();

      // Create git repos
      cy.continuousDeliveryMenuSelection();
      cy.wait(500);
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
  
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-default');
      cy.addFleetGitRepo({ repoName: repoNameDefault, repoUrl, branch, path: pathDefault });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoNameDefault, '1 / 1');
    })
    
  qase(46,
    it('Fleet-46: Test "Standard-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List]', { tags: '@fleet-46' }, () => {
      
      const stduser = "std-user-46"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_1,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_1)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);
      
      // CHECKS IN FLEET-DEFAULT
      // Can't "Create", "Edit" nor "Delete"
      cy.continuousDeliveryMenuSelection();
      cy.checkAccessToCreateGitRepoPage();
      // Note: listing is checked implictly here
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      
      // CHECKS IN FLEET-DEFAULT
      // Can't "Create", "Edit" nor "Delete"
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      cy.open3dotsMenu(repoName, 'Delete', true);
    })
  )

  qase(47,
    it('Fleet-47: Test "Standard-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List, Create]', { tags: '@fleet-47' }, () => {
      
      const stduser = "std-user-47"     
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_2,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "create"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_2)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);

      // CHECKS IN FLEET-DEFAULT
      // CAN "Create" repos
      cy.continuousDeliveryMenuSelection();
      cy.clickCreateGitRepo();
      // Can't "Edit" nor "Delete" repos
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      
      // CHECKS IN FLEET-LOCAL
      // Can't "Edit" nor "Delete" repos
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      cy.open3dotsMenu(repoName, 'Delete', true);
    })
  )

  qase(48,
    it('Fleet-48: Test "Standard-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List, Create, Update, Get]', { tags: '@fleet-48' }, () => {
      
      const stduser = "std-user-48"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_3,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "create", "update", "get"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_3)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);
      
      // CHECKS IN FLEET-DEFAULT
      // CAN "Create" and "Edit"
      cy.continuousDeliveryMenuSelection();
      cy.clickCreateGitRepo();
      cy.clickButton('Cancel');
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config');
      cy.clickButton('Cancel');
      // Can't "Delete"
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);

      // CHECKS IN FLEET-LOCAL
      cy.fleetNamespaceToggle('fleet-local');
      // CAN "Edit"
      cy.open3dotsMenu(repoName, 'Edit Config');
      cy.clickButton('Cancel');
      // Can't "Delete"
      cy.open3dotsMenu(repoName, 'Delete', true);
    })
  )

  qase(50,
    it('Fleet-50: Test "Standard-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List, Delete]', { tags: '@fleet-50' }, () => {
      
      const stduser = "std-user-50"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_4,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "delete"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_4)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);

      // CHECKS IN FLEET-DEFAULT
      cy.continuousDeliveryMenuSelection();
      // Can't "Create" repos    
      cy.checkAccessToCreateGitRepoPage();
      cy.fleetNamespaceToggle('fleet-default');
      // Cant't "Edit"
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      // CAN "Delete"
      cy.open3dotsMenu(repoNameDefault, 'Delete');
      cy.clickButton('Cancel');

      // CHECKS IN FLEET-LOCAL
      cy.fleetNamespaceToggle('fleet-local');
      // CAN "Delete"
      cy.open3dotsMenu(repoName, 'Delete');
      cy.clickButton('Cancel');
      // Cant't "Edit"
      cy.open3dotsMenu(repoName, 'Edit Config', true);
    })
  )

});

describe('Test Fleet access with RBAC with "CUSTOM ROLES" and "GITREPOS" using "USER-BASE" user', { tags: '@rbac' }, () => {

  before('Deleting leftover Gitrepos preparing needed ones for next tests', () => {
    cy.login();
    cy.deleteAllFleetRepos();

    // Create git repos
    cy.continuousDeliveryMenuSelection();
    cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
    cy.clickButton('Create');
    cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

    cy.continuousDeliveryMenuSelection();
    cy.fleetNamespaceToggle('fleet-default');
    cy.addFleetGitRepo({ repoName: repoNameDefault, repoUrl, branch, path: pathDefault });
    cy.clickButton('Create');
    cy.checkGitRepoStatus(repoNameDefault, '1 / 1');
  })

  qase(13,
    it('Fleet-13: Test "Base-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List]', { tags: '@fleet-13' }, () => {
      
      const baseUser = "base-user-13"
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_1,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_1)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // CAN go to Continuous Delivery Dashboard/App Bundles page and "list" gitrepos
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.continuousDeliveryMenuSelection();
        cy.fleetNamespaceToggle('fleet-default');
        cy.verifyTableRow(0, 'Active', repoNameDefault);

        cy.fleetNamespaceToggle('fleet-local');
        cy.verifyTableRow(0, 'Active', repoName);
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
        cy.fleetNamespaceToggle('fleet-default');
        cy.get('div.fleet-dashboard-data').should('contain', repoName).and('contain', repoNameDefault);
      }

      // CHECKS IN FLEET-DEFAULT
      // Can't "Create", "Edit" nor "Delete"
      cy.continuousDeliveryMenuSelection();
      cy.checkAccessToCreateGitRepoPage();

      // Note: listing is checked implictly here
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      
      // CHECKS IN FLEET-LOCAL
      // Can't "Create", "Edit" nor "Delete"
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      cy.open3dotsMenu(repoName, 'Delete', true);
    })
  )

  qase(14,
    it('Fleet-14: Test "Base-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List, Create]', { tags: '@fleet-14' }, () => {
      
      const baseUser = "base-user-14"     
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_2,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "create"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_2)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-default');
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);

      // CHECKS IN FLEET-DEFAULT
      // CAN "Create" repos
      cy.continuousDeliveryMenuSelection();
      cy.clickCreateGitRepo();
      // Can't "Edit" nor "Delete" repos
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      
      // CHECKS IN FLEET-LOCAL
      // Can't "Edit" nor "Delete" repos
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      cy.open3dotsMenu(repoName, 'Delete', true);
    })
  )

  qase(15,
    it('Fleet-15: Test "Base-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List, Create, Update, Get]', { tags: '@fleet-15' }, () => {
      
      const baseUser = "base-user-15"     
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_3,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "create", "update", "get"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_3)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-default');
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);
      
      // CHECKS IN FLEET-DEFAULT
      // CAN "Create" and "Edit"
      cy.continuousDeliveryMenuSelection();
      cy.clickCreateGitRepo();
      cy.clickButton('Cancel');
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config');
      cy.clickButton('Cancel');
      // Can't "Delete"
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);

      // CHECKS IN FLEET-LOCAL
      cy.fleetNamespaceToggle('fleet-local');
      // CAN "Edit"
      cy.open3dotsMenu(repoName, 'Edit Config');
      cy.clickButton('Cancel');
      // Can't "Delete"
      cy.open3dotsMenu(repoName, 'Delete', true);
    })
  )

  qase(16,
    it('Fleet-16: Test "Base-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List, Delete]', { tags: '@fleet-16' }, () => {
      
      const baseUser = "base-user-16"     
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_4,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "delete"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_4)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-default');
      cy.verifyTableRow(0, 'Active', repoNameDefault);

      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', repoName);

      // CHECKS IN FLEET-DEFAULT
      cy.continuousDeliveryMenuSelection();
      // Can't "Create" repos    
      cy.checkAccessToCreateGitRepoPage();
      // Cant't "Edit"
      cy.fleetNamespaceToggle('fleet-default');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      // CAN "Delete"
      cy.open3dotsMenu(repoNameDefault, 'Delete');
      cy.clickButton('Cancel');

      // CHECKS IN FLEET-LOCAL
      cy.fleetNamespaceToggle('fleet-local');
      // CAN "Delete"
      cy.open3dotsMenu(repoName, 'Delete');
      cy.clickButton('Cancel');
      // Cant't "Edit"
      cy.open3dotsMenu(repoName, 'Edit Config', true);
    })
  )
});

describe('Test Fleet access with RBAC with "CUSTOM ROLES" and "GITREPOS" using "USER-BASE" user', { tags: '@rbac' }, () => {

  qase(10,
    it('Fleet-10: Test "Base-user" | Custom Role | Fleetworkspaces = [List, Create] | Bundles, Gitrepos = [ALL]', { tags: '@fleet-10' }, () => {
      
      const baseUser = "base-user-10"     
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_5,
        rules: [
          { resource: "fleetworkspaces", verbs: ["list", "create"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_5)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // Ensuring the user IS able to "go to Continuous Delivery",
      //"go to Bundles" and "list" and "create" workspaces.
      cy.continuousDeliveryMenuSelection();
      cy.wait(500)
      cy.continuousDeliveryBundlesMenu();
      cy.continuousDeliveryWorkspacesMenu();
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      
      // Ensuring the user is not able to "edit" or "delete" workspaces.
      cy.open3dotsMenu('fleet-default', 'Delete', true);
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);
    })
  )

  qase(11,
    it('Fleet-11: Test "Base-user" | Custom Role | Fleetworkspaces = [All except Delete] | Bundles, Gitrepos = [ALL]', { tags: '@fleet-11' }, () => {
      
      const baseUser = "base-user-11"     
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_6,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_6)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // Ensuring the user IS able  to "list", "edit" and "create" workspaces.
      cy.continuousDeliveryMenuSelection();
      cy.wait(1000)
      cy.continuousDeliveryBundlesMenu();
      cy.continuousDeliveryWorkspacesMenu();
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.open3dotsMenu('fleet-default', 'Edit Config');
      cy.contains('allowedTargetNamespaces').should('be.visible');
      
      // Ensuring the user is not able to "delete" workspaces. 
      cy.continuousDeliveryWorkspacesMenu();
      cy.open3dotsMenu('fleet-default', 'Delete', true);
    })
  )

  qase(12,
    it('Fleet-12: Test "Base-user" | Custom Role | Fleetworkspaces = [List, Delete] | Bundles, Gitrepos = [ALL]', { tags: '@fleet-12' }, () => {
      
      const baseUser = "base-user-12"
      
      // Create "Base User"
      cypressLib.burgerMenuToggle();
      cy.createNewUser(baseUser, uiPassword, "User-Base", true);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName_7,
        rules: [
          { resource: "fleetworkspaces", verbs: ["list", "delete"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // // Assign role to the created user
      cy.assignRoleToUser(baseUser, customRoleName_7)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // Ensuring the user IS able to "go to Continuous Delivery", "list" and "delete" workspaces.
      cy.continuousDeliveryMenuSelection();
      cy.continuousDeliveryWorkspacesMenu();
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.contains('Delete').should('be.visible');
    
      // Ensuring the user is NOT able to "edit" workspaces. 
      cy.continuousDeliveryWorkspacesMenu();
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);
    })
  )
});


describe('Test GitRepoRestrictions scenarios for GitRepo applicaiton deployment.', { tags: '@rbac' }, () => {
  const branch = "master"
  const path = "qa-test-apps/nginx-app"
  const repoUrl = "https://github.com/rancher/fleet-test-data/"
  const appName = 'nginx-keep'
  const allowedTargetNamespace = 'allowed-namespace'

  beforeEach('Cleanup leftover GitRepo if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteAllFleetRepos();
  })

  qase(39,
    it('Test "GitRepoRestrictions" on non-existent namespace throws error in the UI', { tags: '@fleet-39' }, () => {
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
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

      // Create GitRepoRestrictions with allowedTargetNamespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-allowed-target-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');

      // Add Fleet repository and create it
      cy.wait(200);
      cy.addFleetGitRepo({repoName, repoUrl, branch, path, allowedTargetNamespace, local: true});

      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', repoName);
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify application is created in allowed namespace.
      cy.accesMenuSelection('local', 'Workloads', 'Pods');
      cy.nameSpaceMenuToggle(allowedTargetNamespace);
      cy.filterInSearchBox(appName);
      cy.get('.col-link-detail').contains(appName).should('be.visible');

      // Deleting GitRepoRestrictions from the fleet-local namespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.fleetNamespaceToggle('fleet-local');
      cy.deleteAll(false);

      // Delete GitRepo
      cy.deleteAllFleetRepos();
    })
  )

  qase(41,
    it('Test "allowedTargetNamespace" from "GitRepoRestrictions" overrides "defaultNamespace" in fleet.yaml of application on existing GitRepo', { tags: '@fleet-41' }, () => {
      const repoName = 'local-gitreporestrictions-fleet-41'

      // Create GitRepoRestrictions with allowedTargetNamespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-allowed-target-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');

      // Add Fleet repository and create it
      cy.wait(200);
      cy.addFleetGitRepo({repoName, repoUrl, branch, path, local: true});
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Error', repoName);
      cy.get('td.text-error')
        .contains("Empty targetNamespace denied, because allowedTargetNamespaces restriction is present");

      // Edit GitRepo by adding allowed target namespace.
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({repoName, allowedTargetNamespace, editConfig: true})
      cy.clickButton('Save');
      cy.verifyTableRow(0, 'Active', repoName);
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify application is created in allowed namespace.
      cy.accesMenuSelection('local', 'Workloads', 'Pods');
      cy.nameSpaceMenuToggle(allowedTargetNamespace);
      cy.filterInSearchBox(appName);
      cy.get('.col-link-detail').contains(appName).should('be.visible');

      // Deleting GitRepoRestrictions from the fleet-local namespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.fleetNamespaceToggle('fleet-local');
      cy.deleteAll(false);

      // Delete GitRepo
      cy.deleteAllFleetRepos();
    })
  )
});

// Note: to be executed after the above test cases
// to avoid any interference (i.e: if continuous-delivery feature is not correctly enabled.)
// To be replaced into other spec file when required.
describe("Global settings related tests", { tags: '@rbac'}, () => {
  if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))) {
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
        cy.contains('fleet-cleanup-gitrepo-jobs').should('exist');
      })
    )
  };
});
