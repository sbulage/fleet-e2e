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

describe('Test Fleet access with RBAC with "CUSTOM ROLES" and "GITREPOS" using "STANDARD USER"', { tags: '@rbac' }, () => {

  const repoName = "fleet-local-simple-chart"
  const branch = "master"
  const path = "simple-chart"
  const repoUrl = "https://github.com/rancher/fleet-test-data"
  const repoNameDefault = "fleet-default-nginx"
  const pathDefault = "qa-test-apps/nginx-app"
  // Custom roles
  const customRoleName_1 = "gitrepo-list-fleetworkspaces-bundles-all-role"
  const customRoleName_2 = "gitrepo-list-create-fleetworkspaces-bundles-all-role"
  const customRoleName_3 = "gitrepo-list-create-update-get-fleetworkspaces-bundles-all-role"
  const customRoleName_4 = "gitrepo-list-delete-fleetworkspaces-bundles-all-role"
  
  before('Preparing GitRepos', () => {
    cy.login();
    // Create git repos
    cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
    cy.fleetNamespaceToggle('fleet-local');
    cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
    cy.clickButton('Create');
    cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

    cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
    cy.fleetNamespaceToggle('fleet-default');
    cy.addFleetGitRepo({ repoName: repoNameDefault, repoUrl, branch, path: pathDefault });
    cy.clickButton('Create');
    cy.checkGitRepoStatus(repoNameDefault, '1 / 1', '1 / 1');
  })

  before('Preparing Role Templates', () => {
    cy.login();
    // Create Custom Roles
    cy.createRoleTemplate({
      roleType: roleTypeTemplate,
      roleName: customRoleName_1,
      rules: [
        { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        { resource: "gitrepos", verbs: ["list"]},
        { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
      ]
    });

    cy.createRoleTemplate({
      roleType: roleTypeTemplate,
      roleName: customRoleName_2,
      rules: [
        { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        { resource: "gitrepos", verbs: ["list", "create"]},
        { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
      ]
    });

    cy.createRoleTemplate({
      roleType: roleTypeTemplate,
      roleName: customRoleName_3,
      rules: [
        { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        { resource: "gitrepos", verbs: ["list", "create", "update", "get"]},
        { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
      ]
    });
      
    cy.createRoleTemplate({
      roleType: roleTypeTemplate,
      roleName: customRoleName_4,
      rules: [
        { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        { resource: "gitrepos", verbs: ["list", "delete"]},
        { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
      ]
    });
  })

  // Pls note this is anti-pattern: 
  // https://docs.cypress.io/guides/references/best-practices#Using-after-Or-afterEach-Hooks
  // Done here for demonstration. Better to set before if needed.
  after('Deleting Fleet repos, Roles, Users', () => {
    cy.login();
    cy.deleteAllFleetRepos();
    // Delete Standard Users
    const stdusers = ["std-user-46", "std-user-47", "std-user-48", "std-user-50"];
    stdusers.forEach(user => {
      cy.deleteUser(user);
    })
    // Delete Custom Roles
    const customRoles = [customRoleName_1, customRoleName_2, customRoleName_3, customRoleName_4];
    customRoles.forEach(role => {
      cy.deleteRole(role, roleTypeTemplate.toUpperCase());
    })
  })


  qase(46,
    it('Fleet-46: Test "Standard-user" | Custom Role | Fleetworkspaces, Bundles = [ALL] | GitRepos = [List]', { tags: '@fleet-46' }, () => {
      
      const stduser = "std-user-46"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_1)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');
      
      // CHECKS IN FLEET-DEFAULT
      // Can't "Create", "Edit" nor "Delete"
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.get('.btn.role-primary').contains('Add Repository').should('not.exist');
      // Note: listing is checked implictly here
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
      cypressLib.createUser(stduser, uiPassword);

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_2)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');

      // CHECKS IN FLEET-DEFAULT
      // CAN "Create" repos
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.clickButton('Add Repository');
      cy.contains('Git Repo:').should('be.visible');
      // Can't "Edit" nor "Delete" repos
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
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
      cypressLib.createUser(stduser, uiPassword);

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_3)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');
      
      // CHECKS IN FLEET-DEFAULT
      // CAN "Create" and "Edit"
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.clickButton('Add Repository');
      cy.contains('Git Repo:').should('be.visible');
      cy.clickButton('Cancel');
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
      cypressLib.createUser(stduser, uiPassword);

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName_4)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // CAN go to Continuous Delivery Dashboard and "list" gitrepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');

      // CHECKS IN FLEET-DEFAULT
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');       
      // Can't "Create" repos    
      cy.get('.btn.role-primary').contains('Add Repository').should('not.exist');
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
