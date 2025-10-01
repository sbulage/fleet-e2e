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

// In this file you can write your custom commands and overwrite existing commands.

import 'cypress-file-upload';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';

export const noRowsMessages = ['There are no rows to show.', 'There are no rows which match your search query.']
export const NoAppBundleOrGitRepoPresentMessages = ['No repositories have been added', 'No App Bundles have been created']
export const rancherVersion = Cypress.env('rancher_version');
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|alpha)\/2\.(1[2-9]|[2-9]\d+)(\..*)?$/,
  /^head\/2\.(1[2-9])$/
];
// Generic commands

// Fleet commands

// Add path on "Git Repo:Create"
Cypress.Commands.add('addPathOnGitRepoCreate', (path, index=0) => {
  //Index defaulting to 0, for first input box.
  cy.clickButton('Add Path');
  cy.get(`[data-testid="array-list-box${ index }"] input[placeholder="e.g. /directory/in/your/repo"], [data-testid="array-list-box${ index }"] input[placeholder="e.g. /directory/in/your/repo"]`).type(path);
})

Cypress.Commands.add('gitRepoAuth', (gitOrHelmAuth='Git', gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex ) => {
  cy.contains(`${gitOrHelmAuth} Authentication`).click()

  // Select the Git auth method
  cy.get('ul.vs__dropdown-menu > li > div', { timeout: 15000 }).contains(gitAuthType, { matchCase: false }).should('be.visible').click();
  
  if (helmUrlRegex) {
    cy.typeValue('Helm Repos (URL Regex)', helmUrlRegex, false,  false );
  }

  if (gitAuthType === 'http') {
    cy.typeValue('Username', userOrPublicKey, false,  false );
    cy.typeValue('Password', pwdOrPrivateKey, false,  false );
  }
  
  else if (gitAuthType === 'ssh') {
    // Ugly implementation needed because 'typeValue' does not work here
    cy.get('textarea.no-resize.no-ease').eq(0).focus().clear().type(userOrPublicKey, {log: false}).blur();
    cy.get('textarea.no-resize.no-ease').eq(1).focus().clear().type(pwdOrPrivateKey, {log: false}).blur();
  }

  else if (gitAuthType && gitAuthType !== 'http' && gitAuthType !== 'ssh') {    
      cy.contains(gitAuthType).should('be.visible').click();
    }    
});

Cypress.Commands.add('importYaml', ({ clusterName, yamlFilePath }) => {
  cypressLib.burgerMenuToggle();
  cy.get('div.cluster-name').contains(clusterName).click();
  cy.wait(250);
  cy.get('header').find('button').filter(':has(i.icon-upload)').click();
  cy.get('div.card-container').contains('Import YAML').should('be.visible');

  // Insert file content into the CodeMirror editor
  // We could use File Upload but this has benefit we may modify the content on the fly (not implemented yet)
  cy.readFile(yamlFilePath).then((content) => {
    cy.get('.CodeMirror').then((codeMirrorElement) => {
      const cm = (codeMirrorElement[0] as any).CodeMirror;
      cm.setValue(content);
    });
  })
  cy.clickButton('Import');
  cy.get('div.card-container').contains(/Applied \d+ Resources/).should('be.visible');

  // Check if there is a column with age which contains a number
  // Ideally we would need to wait for Active State for each resource but this column is not present on 2.9
  cy.get('[data-testid^="sortable-cell-"] .live-date').each(($el) => {
    cy.wrap($el).contains(/\d+/, { timeout: 60000 });
  }).then(() => {
    // All elements defined, click Close button
    cy.clickButton('Close');
  });
});

// This new navigation enables access to App Bundles and can be extended to HelmOps too.
Cypress.Commands.add('continuousDeliveryMenuSelection', () => {
  let navToAppBundles = false
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    navToAppBundles = true
  }
  if (navToAppBundles){
    cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
    cy.contains("App Bundles").should('be.visible')
  }
  else {
    cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
    cy.contains("Git Repos").should('be.visible')
  }
});

Cypress.Commands.add('continuousDeliveryWorkspacesMenu', () => {
  cy.get('body', { timeout: 15000 }).then(($body) => {
    if ($body.text().includes('App Bundles')) {
      cy.contains('App Bundles').should('be.visible');
      cy.clickNavMenu(['Workspaces']);
    } else if ($body.text().includes('Git Repos')) {
      cy.contains('Git Repos').should('be.visible');
      cy.clickNavMenu(['Advanced', 'Workspaces']);
    } else {
      throw new Error('Neither "App Bundles" nor "Git Repos" found');
    }
  });
});

Cypress.Commands.add('continuousDeliveryBundlesMenu', () => {
  cy.get('body', { timeout: 15000 }).then(($body) => {
    if ($body.text().includes('App Bundles')) {
      cy.contains('App Bundles').should('be.visible');
      cy.clickNavMenu(['Resources']);
      cy.get('nav').contains(/^Bundles$/).click();
    } else if ($body.text().includes('Git Repos')) {
      cy.contains('Git Repos').should('be.visible');
      cy.clickNavMenu(['Advanced', 'Bundles']);
    } else {
      throw new Error('Neither "App Bundles" nor "Git Repos" found');
    }
  });
});

// Command add and edit Fleet Git Repository
// TODO: Rename this command name to 'addEditFleetGitRepo'
Cypress.Commands.add('addFleetGitRepo', ({ repoName, repoUrl, branch, path, path2, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, tlsOption, tlsCertificate, keepResources, correctDrift, fleetNamespace='fleet-local', editConfig=false, helmUrlRegex, deployToTarget, allowedTargetNamespace="", local=false }) => {

  cy.continuousDeliveryMenuSelection();

  if (editConfig === true) {
    cy.fleetNamespaceToggle(fleetNamespace);
    // Check 'Error' state only to allowedTargetNamespace test only
    cy.verifyTableRow(0, /Active|Modified|Error/, repoName);
    cy.open3dotsMenu(repoName, 'Edit Config');
    cy.contains(/App Bundle|Git Repo/).should('be.visible');
    cy.clickButton('Next');
  } 

  else {
    cy.clickCreateGitRepo(local);
    cy.typeValue('Name', repoName);

    cy.clickButton('Next');

    cy.typeValue('Repository URL', repoUrl);
    cy.typeValue('Branch Name', branch);
  }

  if (path) {
    cy.addPathOnGitRepoCreate(path);
  }
  if (path2) {
    cy.addPathOnGitRepoCreate(path2, 1);
  }

  cy.clickButton('Next');

  if (deployToTarget) {
    cy.deployToClusterOrClusterGroup(deployToTarget);
  }

  if (allowedTargetNamespace !== "") {
    cy.get('input[placeholder="Optional: Require all resources to be in this namespace"]').type(allowedTargetNamespace);
  }

  cy.clickButton('Next');

  if (gitAuthType) {
    cy.gitRepoAuth(gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex);
  }

  if (tlsOption) {
    cy.contains(`TLS Certificate Verification`).click();
    // Select the TLS option
    cy.get('ul.vs__dropdown-menu > li > div', { timeout: 15000 })
      .contains(tlsOption, { matchCase: false })
      .should('be.visible')
      .click();

    if (tlsOption = 'Specify additional certificates') {
      cy.readFile(tlsCertificate).then((content) => {
        cy.get('textarea[placeholder="Paste in one or more certificates, starting with -----BEGIN CERTIFICATE----"]').type(content);
      });
    }
  }
  // Check the checkbox of keepResources if option 'yes' is given.
  // After checked check-box, `keepResources: true` is set
  // in the GitRepo YAML.
  if (keepResources === 'yes') {
    cy.get('.checkbox-outer-container.check').contains('Always Keep Resources', { matchCase: false }).click();
  }
  if (correctDrift === 'yes') {
    cy.get('.checkbox-outer-container.check').contains('Enable self-healing', { matchCase: false }).click();
  }
});

// Add Helm Op
Cypress.Commands.add('addHelmOp', ({ fleetNamespace='fleet-local', repoName, repoUrl, chart, version, values, deployTo, serviceAccountName, targetNamespace, helmAuth }) => {

  cy.accesMenuSelection('Continuous Delivery', 'Resources', 'Helm Ops');
  cy.fleetNamespaceToggle(fleetNamespace);
  cy.clickButton('Create Helm Op');

    
  cy.typeValue('Name', repoName);
  cy.clickButton('Next');

  cy.typeValue('Repository URL', repoUrl);
  cy.typeValue('Chart', chart);

  if (version) {
    cy.typeValue('Version', version);
  }

  if (values) {
    cy.typeIntoCanvasTermnal(values);
    cy.clickButton('Next');
  }
  
  // TODO: add logic if we want to select specific cluster.
  if (deployTo) {
    cy.contains(deployTo).should('be.visible').click();
    cy.typeValue('Service Account Name', serviceAccountName);
    cy.typeValue('Target Namespace', targetNamespace);
    // Here we do not add click Next as is present in the follosing step
  }

  cy.get('span.controls').contains('Advanced').should('be.visible').click();

  if (helmAuth) {
    // TODO: Add logic
  }

  cy.clickButton('Create');
});

// Deploy To target functionality used in addGitRepo
// TODO: Remove div.labeled-select.create.hoverable, div.labeled-select.edit.hoverable locators, once 2.8 is disabled.
Cypress.Commands.add('deployToClusterOrClusterGroup', (deployToTarget) => {
  cy.get('div.labeled-select.create.hoverable, div.labeled-select.edit.hoverable, [data-testid="fleet-gitrepo-target-cluster"]').first().should('be.visible');
  cy.get('div.labeled-select.create.hoverable, div.labeled-select.edit.hoverable, [data-testid="fleet-gitrepo-target-cluster"]').first().click({ force: true });
  cy.get('ul.vs__dropdown-menu > li').contains(deployToTarget).should("exist").click();

  // TODO: Update this in future with better logic
  // This is specific to Fleet-22 test cases
  if (deployToTarget == "Advanced") {
    cy.get('body').then((body) => {
      if (body.find("div.yaml-editor")) {
        cy.addYamlFile('assets/cluster_selector_with_new_labels.yaml')
      }
    })
  }
});

Cypress.Commands.add('clickCreateGitRepo', (local) => {
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    cy.clickButton('Create App Bundle');
    if (local){
      cy.fleetNamespaceToggle('fleet-local');
    }
    cy.contains('App Bundle: Create').should('be.visible');
    cy.contains('Git Repos').should('be.visible').click();
    cy.wait(1000);
    cy.contains('App Bundle: Create').should('be.visible');
  }
  else {
    if (local){
      cy.fleetNamespaceToggle('fleet-local');
    }
    cy.clickButton('Add Repository');
    cy.contains('Git Repo:').should('be.visible');
  }
});

// 3 dots menu selection
Cypress.Commands.add('open3dotsMenu', (name, selection, checkNotInMenu=false) => {
  // Let cy.filterInSearchBox() operation finish and wait before opening Edit Menu.
  cy.wait(500);
  // Open 3 dots button
  cy.contains('tr.main-row', name).should('exist').within(() => {
    cy.get('.icon.icon-actions').click({ force: true });
    cy.wait(500)
  });

  if (checkNotInMenu === true) {
    cy.get('.list-unstyled.menu > li, [role="menuitem"]').each(($el) => {
        if ($el.text() != selection) {
          cy.log(`Cannot perform action with specified value "${selection}" since it is not present. Current Menu is: "${$el.text()}"`);
          cy.get('ul.list-unstyled.menu, [role="menuitem"]')
            .contains(selection).should('not.exist');
        }
    });

    // Close 3 dots button menu
    cy.get('body').should('exist').click({ force: true });
    cy.wait(250);
  }

  else if (selection) {
    // Open edit config and select option
    cy.get('.list-unstyled.menu > li > span, div.dropdownTarget', { timeout: 15000 }).contains(selection).should('be.visible');
    cy.get('.list-unstyled.menu > li > span, div.dropdownTarget', { timeout: 15000 }).contains(selection).click({ force: true });
    if (selection === 'Force Update') {
      // Wait for the 'Force Update' pop-up box open.
      cy.wait(500);
      cy.get('body', { timeout: 10000 }).then(($body) => {
        if ($body.find('.card-title > h4').text().includes('Force Update')) {
          cy.get('[data-testid="deactivate-driver-confirm"] > span').should('be.visible').click();
        }    
      })
    };
    // Ensure dropdown is not present
    cy.contains('Edit Config').should('not.exist')
  }
});

// Verify textvalues in table giving the row number
// More items can be added with new ".and"
Cypress.Commands.add('verifyTableRow', (rowNumber, expectedText1, expectedText2, timeout=60000) => {
  // Adding small wait to give time for things to settle a bit
  // Could not find a better way to wait, but can be improved
  cy.wait(1000)
  // Ensure table is loaded and visible
  cy.contains('tr.main-row[data-testid="sortable-table-0-row"]').should('not.be.empty', { timeout: 25000 });
  cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-${rowNumber}-row"]`, { timeout: timeout }).should(($row) => {
    // Replace whitespaces by a space and trim the string for both expected texts
    const text = $row.text().replace(/\s+/g, ' ').trim();

    // Check if expectedTextX is a regular expression or a string and perform the assertion
    if (expectedText1) {
      // If expectedText1 is provided, perform the check
      if (expectedText1 instanceof RegExp) {
        expect(text).to.match(expectedText1);
      } else {
        expect(text).to.include(expectedText1);
      }
    }

    if (expectedText2) {
      // If expectedText2 is provided, perform the check
      if (expectedText2 instanceof RegExp) {
        expect(text).to.match(expectedText2);
      } else {
        expect(text).to.include(expectedText2);
      }
    }
  });
});

// Namespace Toggle
Cypress.Commands.add('nameSpaceMenuToggle', (namespaceName) => {
  cy.get('.top > .ns-filter').should('be.visible');

  // For some reason I don't understand, click force doesn't work
  // in 2.10 an onwards, but it is mandatory for earlier versions
  // To be improved in the future
  const old_versions = ["latest/devel/2.7", "latest/devel/2.8", "latest/devel/2.9"];

  if (old_versions.includes(rancherVersion)) {
    cy.log('Rancher version is: ' + rancherVersion , 'Clicking WITH force:true');
    cy.get('.top > .ns-filter').click({ force: true });
  }
  else  {
    cy.log('Rancher version is: ' + rancherVersion, 'Clicking WITHOUT force:true');
    cy.get('.top > .ns-filter').click();
  }
  cy.get('div.ns-item').contains(namespaceName).scrollIntoView()
  cy.get('div.ns-item').contains(namespaceName).click()
  cy.get('div.ns-dropdown.ns-open > i.icon.icon-chevron-up').click({ force: true });
})

// Command to filter text in searchbox
Cypress.Commands.add('filterInSearchBox', (filterText) => {
  cy.get('input.input-sm.search-box').should('be.visible');
  // Added 1/2 seconds of wait, as element is hidden after it gets visible.
  cy.wait(500);
  cy.get('input.input-sm.search-box').clear().type(filterText);
  cy.wait(250); // Adding 1/4 second to ensure next action is executed more reliably
});

// Go to specific Sub Menu from Access Menu
Cypress.Commands.add('accesMenuSelection', (firstAccessMenu='Continuous Delivery',secondAccessMenu, clickOption) => {
  // added wait of 500ms to make time for CSS transitions to resolve (addresses tests flakiness)
  // unfortunately there's no "easy" way of waiting for transitions and 500ms is quick and does the trick
  cypressLib.burgerMenuToggle( {animationDistanceThreshold: 10} );
  cy.wait(750);

  cy.contains(firstAccessMenu).should('be.visible');
  cypressLib.accesMenu(firstAccessMenu);
  if (secondAccessMenu) {
    cy.contains(secondAccessMenu).should('be.visible');
    cypressLib.accesMenu(secondAccessMenu);
  };
  if (clickOption) {
    // Regexp added for exact match,
    // (to avoid problems CronJobs vs Jobs for insatance)
    cy.get('nav.side-nav').contains(new RegExp("^" + clickOption + "$", "g")).should('be.visible').click();
  };
  // Ensure some title exist to proof the menu is loaded
  cy.get('div.title').last().should('exist').and('not.be.empty');
});

// Fleet namespace toggle
Cypress.Commands.add('fleetNamespaceToggle', (toggleOption='local') => {
  cy.get('.vs__selected-options')
  .contains('fleet-')
  .click({force: true});
cy.contains(toggleOption).should('be.visible').click({force: true});
});

// Command to delete all rows if check box and delete button are present
// Note: This function may be substituted by 'cypressLib.deleteAllResources' 
// when hardcoded texts present can be parameterized
Cypress.Commands.add('deleteAll', (fleetCheck=true) => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('Delete')) {
      cy.wait(250) // Add small wait to give time for things to settle
      cy.get('[width="30"] > .checkbox-outer-container.check', { timeout: 50000 }).click();
      cy.get('.btn').contains('Delete').click({ctrlKey: true});
      if (fleetCheck === true) {
        cy.contains(new RegExp(NoAppBundleOrGitRepoPresentMessages.join('|')), { timeout: 20000 }).should('be.visible')
      } else {
        cy.get('td > span, td.text-center > span', { timeout: 25000 }).invoke('text').should('be.oneOf', noRowsMessages)
      }
    };
  });
});

// Command to delete all repos pressent in Fleet local and default
Cypress.Commands.add('deleteAllFleetRepos', (namespaceName) => {
  cy.continuousDeliveryMenuSelection();
  cy.fleetNamespaceToggle('fleet-local')
  cy.deleteAll();
  cy.fleetNamespaceToggle('fleet-default')
  cy.deleteAll();

  // Delete all repos from newly created workspace if any.
  if (namespaceName) {
    cy.fleetNamespaceToggle(namespaceName);
    cy.deleteAll();
  }
});

// Check Git repo deployment status
Cypress.Commands.add('checkGitRepoStatus', (repoName, bundles, resources, timeout=30000) => {
  cy.verifyTableRow(0, 'Active', repoName);
  cy.contains(repoName).click()
  cy.get('.primaryheader > h1, h1 > span.resource-name.masthead-resource-title').contains(repoName).should('be.visible')
  cy.log(`Checking ${bundles} Bundles and Resources`)
  if (bundles) {
    cy.get('div.fleet-status', { timeout: timeout }).eq(0).contains(` ${bundles} Bundles ready `, { timeout: timeout }).should('be.visible')
  }
  // Ensure this check is performed only for tests in 'fleet-local' namespace.
  if (resources) {
      cy.get('div.fleet-status', { timeout: timeout }).eq(1).contains(` ${resources} Resources ready `, { timeout: timeout }).should('be.visible')
  } else {
    // On downstream clusters (v2.9+), resources are affected by cluster count.
    // Avoid specifying 'resources' for tests in 'fleet-default' to allow automatic verification.
    // This checks for the presence of a matching "X / X Resources ready" pattern.
    cy.get('div.fleet-status', { timeout: timeout }).eq(1).should(($div) => {
      // Replace whitespaces by a space and trim the string
      const text = $div.text().replace(/\s+/g, ' ').trim();
      // Perform the match check within .should callback as .then breaks retry ability
      expect(text).to.match(/.*([1-9]\d*) \/ \1 Resources ready/);
    });
  }
});

// Check deployed application status (present or not)
Cypress.Commands.add('checkApplicationStatus', (appName, clusterName='local', appNamespace='Only User Namespaces', present=true, firstNav='Workloads', resourceToCheck='Pods') => {

  cy.accesMenuSelection(clusterName, firstNav, resourceToCheck);
  cy.nameSpaceMenuToggle(appNamespace);
  cy.filterInSearchBox(appName);
  if (present === true) {
    cy.contains('tr.main-row[data-testid="sortable-table-0-row"]').should('not.be.empty', { timeout: 25000 });
    cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-0-row"]`)
      .children({ timeout: 60000 })
      .should('contain.text', appName);
  }
  else {
    cy.get('td > span, td.text-center > span').invoke('text').should('be.oneOf', noRowsMessages)
  }
});

// Delete the leftover applications
Cypress.Commands.add('deleteApplicationDeployment', (clusterName='local') => {
  cy.accesMenuSelection(clusterName, 'Workloads', 'Deployments');
  cy.wait(500);
  cy.nameSpaceMenuToggle("Only User Namespaces");
  cy.wait(500);
  cy.deleteAll(false);
});

// Modify given application
Cypress.Commands.add('modifyDeployedApplication', (appName, clusterName='local') => {
  // Wait added to mitigate problems unfolding burger menu 2.11 onwards
  // TODO: remove or rework when possible
  cy.wait(2000);
  cypressLib.burgerMenuToggle();
  cypressLib.accesMenu(clusterName);
  cy.clickNavMenu(['Workloads', 'Deployments']);
  // Modify deployment of given application
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    cy.get('[data-testid="button-group-child-0"]').then(($button) => {
      if ($button.hasClass('bg-disabled')){
        $button.trigger('click');
      }
    })
    cy.filterInSearchBox(appName);
    cy.contains(appName).click();
    cy.get('div.plus-minus.text-right > .value').should('be.visible').contains('1');
    cy.get('div.plus-minus.text-right > .btn > .icon-plus').should('be.visible').click();
    cy.get('div.plus-minus.text-right > .value').should('be.visible').contains('2');
    cy.clickNavMenu(['Deployments']);
  }
  else {
    cy.wait(500);
    cy.get('#trigger').click({ force: true });
    cy.contains('Scale').should('be.visible');
    // TODO: Add logic to increase resource count to given no.
    cy.get('.icon-plus').click();
    cy.get('#trigger > .icon.icon-chevron-up').click({ force: true });
  }
});

// Create Role Template (User & Authentication)
Cypress.Commands.add('createRoleTemplate', ({roleType='Global', roleName, newUserDefault='no', rules}) => {

  // // Access to user & authentication menu and create desired role template
  cy.accesMenuSelection('Users & Authentication', 'Role Templates');
  cy.clickButton(`Create ${roleType}`);
  cy.contains('.title', ': Create').should('be.visible');

  // Add role name
  cy.typeValue('Name', roleName);

  // Add new user default
  if (newUserDefault === 'yes') {
    cy.get('span[aria-label="Yes: Default role for new users"]').click();
  }
  
    // Addition of resources and verbs linked to resources
    // Each rule is an object with 2 keys: resource and verbs
    rules.forEach((rule: { resource: string, verbs: string[] }, i) => {
      // Iterate over Resource cells and add 1 resource
      cy.get(`input.vs__search`).eq(2 * i + 1).click();
      cy.contains(rule.resource, { matchCase: false }).should("exist").click();
      cy.clickButton("Add Resource");

        rule.verbs.forEach((verb) => {
          cy.get(`input.vs__search`).eq(2 * i).click();
          cy.get(`ul.vs__dropdown-menu > li`).contains(verb).should("exist").click();
        });
    });

  // "Hack" to get the button to be clickable
  cy.get('button.role-link').last().click()
  cy.clickButton("Create");
  cy.contains('Grant Resources').should('not.exist');
})

// Create command to assign role based on user name
Cypress.Commands.add('assignRoleToUser', (userName, roleName) => {
  cy.accesMenuSelection('Users & Authentication');
  cy.contains('.title', 'Users').should('be.visible');
  cy.filterInSearchBox(userName);
  cy.open3dotsMenu(userName, 'Edit Config');
  cy.get(`span[aria-label='${roleName}'], div[class='checkbox-section checkbox-section--custom'] span[role='checkbox']`).scrollIntoView();
  cy.get(`span[aria-label='${roleName}'], div[class='checkbox-section checkbox-section--custom'] span[role='checkbox']`).should('be.visible').click();

  cy.clickButton('Save');
  // Sortering by Age so first row is the desired user
  // cy.contains('Age').should('be.visible').click();
  // Temporary fix by filtering the userName
  cy.filterInSearchBox(userName);
  // Verifying name only given in 2.9 there is only icon
  cy.verifyTableRow(0, userName, '');
})

// Delete created user
Cypress.Commands.add('deleteUser', (userName) => {
  // Delete user
  cy.accesMenuSelection('Users & Authentication');
  cy.contains('.title', 'Users').should('be.visible');
  cy.filterInSearchBox(userName);
  cy.wait(250); // Add small wait to allow typing to conclude
  cy.deleteAll(false);
})

// Delete all users. Admin user will stay
Cypress.Commands.add('deleteAllUsers', (userName) => {
  // Delete all users (Admin one will stay as cannot be deleted)
  cy.accesMenuSelection('Users & Authentication');
  cy.contains('.title', 'Users').should('be.visible');
  cy.get('div.fixed-header-actions > div > button').then(($button) => {
    if ($button.text().match('Delete')) {
      cy.wait(250) // Add small wait to give time for things to settle
      cy.get('[width="30"] > .checkbox-outer-container.check', { timeout: 50000 }).click();
      cy.get('.btn').contains('Delete').click({ctrlKey: true});
    }
    else {
      cy.log('No users to delete');
    }
  });
});

// Delete created role
Cypress.Commands.add('deleteRole', (roleName, roleTypeTemplate) => {
  cy.accesMenuSelection('Users & Authentication', 'Role Templates');
  cy.contains('.title', 'Role Templates').should('be.visible');
  
  // Filter role by it's name and roleTypeTemplate.
  cy.get(`section[id="${roleTypeTemplate}"]`).within(() => {
    cy.get("input[placeholder='Filter']").should('exist').clear({ force: true}).type(roleName)
    // Check all filtered rows
    cy.get(' th:nth-child(1)').should('be.visible').click();
    // Delete role
    cy.get('.btn').contains('Delete').click({ctrlKey: true});
  })

  // Verify that there are no rows
  cy.contains('There are no rows which match your search query.', { timeout: 2000 }).should('be.visible');
})

// Allow to select pre-release versions
Cypress.Commands.add('allowRancherPreReleaseVersions', () => {
  // Using visit here instead of clicking in prefs to avoid issues in CI
  cy.visit('/prefs')
  cy.contains('Include Prerelease Versions', {timeout: 15000}).should('exist').click({ force: true });
  cy.screenshot('Screenshot Pre-release versions activated');
  cy.wait(500);
  cy.visit('/c/local/explorer')
  cy.wait(500);
  cy.get('h6').contains('Cluster').should('be.visible')
});

// Upgrade Fleet to latest version when is not set to default in UI.
Cypress.Commands.add('upgradeFleet', () => {

  // Refresh the Rancher repository
  cy.visit('c/local/apps/catalog.cattle.io.clusterrepo');
  cy.get('h1', { timeout: 20000 }).contains('Repositories').should('be.visible');
  cy.verifyTableRow(1, 'Active', 'Rancher');
  cy.open3dotsMenu('Rancher', 'Refresh');
  cy.verifyTableRow(1, 'Active', 'Rancher');
  
  // Update Fleet
  cy.visit('c/local/apps/catalog.cattle.io.app');
  cy.get('h1', { timeout: 20000 }).contains('Installed Apps').should('be.visible')
  cy.nameSpaceMenuToggle('cattle-fleet-system');
  cy.verifyTableRow(0, 'Deployed', 'fleet');
  cy.filterInSearchBox('fleet');
  cy.open3dotsMenu('fleet', 'Edit/Upgrade');
  cy.contains('Loading...', { timeout: 20000 }).should('not.exist');
  cy.get('#vs1__combobox').click();
  cy.wait(250);
  cy.get('ul.vs__dropdown-menu > li').first().click();
  cy.clickButton('Next');
  cy.clickButton(/Upgrade|Update/);
  cy.contains('Updating...', { timeout: 20000 }).should('not.exist');
  cy.contains('SUCCESS: helm upgrade', { timeout: 60000 }).should('be.visible');
  cy.screenshot('Screenshot Fleet upgraded');
});

// Add label to the imported cluster(s)
Cypress.Commands.add('assignClusterLabel', (clusterName, key, value) => {
  cy.clickNavMenu(['Clusters']);
  cy.filterInSearchBox(clusterName);
  cy.open3dotsMenu(clusterName, 'Edit Config');
  cy.clickButton('Add Label');
  cy.get('div[class="row"] div[class="key-value"] input[placeholder="e.g. foo"]').last().type(key);
  cy.get('div[class="row"] div[class="key-value"] textarea[placeholder="e.g. bar"]').last().type(value);
  cy.wait(500);
  cy.clickButton('Save');
  cy.contains('Save').should('not.exist');
  // Navigate back to all clusters page.
  cy.clickNavMenu(['Clusters']);

  // Below block will ensure cluster Label is added if not added,
  // it will re-add it.
  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.get('td.col-link-detail > span').contains(clusterName).click();
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    cy.get('div.labels > .key-value > .heading > span.count').then($spanLabelCount => {
      const labelCount = parseInt($spanLabelCount.text().trim());
      if (labelCount === 2) {
        cy.log("Cluster Label is Added successfully.")
      } 
      else {
        cy.assignClusterLabel(clusterName, key, value)
      }
    })
  }
  cy.clickNavMenu(['Clusters']);
})

// Create clusterGroup based on label assigned to the cluster
Cypress.Commands.add('createClusterGroup', (clusterGroupName, key, value, bannerMessageToAssert, assignClusterGroupLabel=false, clusterGroupLabelKey, clusterGroupLabelValue) => {
  cy.fleetNamespaceToggle('fleet-default');
  cy.wait(1000);
  cy.clickButton('Create');
  cy.get('input[placeholder="A unique name"]').type(clusterGroupName);
  cy.clickButton('Add Rule');
  cy.get('[data-testid="input-match-expression-key-control-0"]').focus().type(key);
  cy.get('[data-testid="input-match-expression-values-control-0"]').type(value);
  cy.contains(bannerMessageToAssert).should('be.visible');
  if (assignClusterGroupLabel === true) {
    cy.clickButton('Add Label');
    cy.get('[data-testid="input-kv-item-key-0"]').focus().type(clusterGroupLabelKey);
    cy.get('[data-testid="value-multiline"]').type(clusterGroupLabelValue);
    cy.wait(500);
  }
  cy.clickButton('Create');
  cy.filterInSearchBox(clusterGroupName);
  cy.verifyTableRow(0, 'Active', clusterGroupName);
})

// Show cluster count in the clusterGroup
Cypress.Commands.add('clusterCountClusterGroup', (clusterGroupName, clusterCount) => {
  // Navigate to Clusters page when other navigation is present.
  cy.get('body').then((body) => {
    if (body.find('.title').text().includes('Cluster Groups')) {
      return true
    }
    else {
      cy.accesMenuSelection('Continuous Delivery', 'Cluster Groups');
    }
  })
cy.contains('.title', 'Cluster Groups').should('be.visible');
cy.fleetNamespaceToggle('fleet-default');
cy.get('td.col-link-detail > span').contains(clusterGroupName).click();
cy.get('.details').contains(`Clusters Ready: ${clusterCount} of ${clusterCount}`);

// Navigate back to all clusters page.
cy.clickNavMenu(['Clusters']);
})

// Delete Cluster Group
Cypress.Commands.add('deleteClusterGroups', () => {
  cy.accesMenuSelection('Continuous Delivery', 'Cluster Groups');
  cy.fleetNamespaceToggle('fleet-default');
  cy.deleteAll(false);
})

// Remove added labels from the cluster(s)
Cypress.Commands.add('removeClusterLabels', (clusterName, key, value) => {
  cy.clickNavMenu(['Clusters']);
  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.open3dotsMenu(clusterName, 'Edit Config');
  cy.contains('.title', 'Cluster:').should('be.visible');
  cy.get('div.labels div.row div.key-value div.kv-container').invoke('attr', 'aria-rowcount').then((count) => {
    if (Number(count) > 0) {
      cy.get('div[class="row"] div[class="key-value"] button.role-link').first().click();
    }
    else {
      cy.log("There is no new label for remove.");
    }
  });

  cy.wait(500);
  cy.clickButton('Save');
  cy.contains('Save').should('not.exist');
  // Navigate back to all clusters page.
  cy.clickNavMenu(['Clusters']);

  // Ensure label is removed.
  cy.wait(500);
  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.get('td.col-link-detail > span').contains(clusterName).click();
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    cy.get('div.labels > .key-value > .heading > span.count').then($spanLabelCount => {
      const labelCount = parseInt($spanLabelCount.text().trim());
      if (labelCount === 1) {
        cy.log("Cluster Label get removed successfully.")
      } 
      else {
        cy.removeClusterLabels(clusterName, key, value)
      }
    })
  } 
  else {
    cy.get('div.tags > span').then(($el) =>{
      if ($el.length === 2) {
        cy.log("Cluster Label get removed successfully.")
      }
      else {
        cy.removeClusterLabels(clusterName, key, value)
      }
    })
  }
  // Navigate back to all clusters page.
  cy.clickNavMenu(['Clusters']);
})

// Insert file content into the CodeMirror editor
Cypress.Commands.add('addYamlFile', (yamlFilePath) => {
  cy.readFile(yamlFilePath).then((content) => {
    cy.get('.CodeMirror').then((codeMirrorElement) => {
      const cm = (codeMirrorElement[0]).CodeMirror;
      cm.setValue(content);
    });
  })
})

// Command to ensure job is deleted
Cypress.Commands.add('verifyJobDeleted', (repoName, verifyJobDeletedEvent = true) => {
  // Optional. This is to t verify event on Repo status page
  // To be executed there or after cy.checkGitRepoStatus() function;
  if (verifyJobDeletedEvent) {
    cy.get('ul[role="tablist"]').contains('Recent Events').click();
    cy.get('section#events table tr.main-row')
      // .eq(0)
      .contains('job deletion triggered because job succeeded', { timeout: 20000 })
      .should('be.visible');
  };

  // Confirm job disappears
  cy.accesMenuSelection('local', 'Workloads', 'Jobs');
  cy.nameSpaceMenuToggle('All Namespaces');
  cy.filterInSearchBox(repoName);
  cy.get('table > tbody > tr').contains('There are no rows which match your search query.').should('be.visible');
});

// Simulate typing on the canvas terminal
Cypress.Commands.add('typeIntoCanvasTermnal', (textToType) => {
    // Simulate typing on the canvas terminal
    cy.get('canvas').then(($canvas) => {
      const canvas = $canvas[0];
      const rect = canvas.getBoundingClientRect();
    
      // Simulate a click on the canvas
      cy.wrap(canvas)
        .trigger('mousedown', { clientX: rect.left + 10, clientY: rect.top + 10 })
        .trigger('mouseup', { clientX: rect.left + 10, clientY: rect.top + 10 });
    
      // Simulate typing on the canvas
      cy.wrap(canvas)
        .trigger('keydown', { key: 'k' })
        .type(textToType);
    });
});

Cypress.Commands.add('checkGitRepoAfterUpgrade', (repoName, fleetNamespace='fleet-local') => {
  cy.continuousDeliveryMenuSelection();
  cy.fleetNamespaceToggle(fleetNamespace);
  cy.filterInSearchBox(repoName);
  cy.verifyTableRow(0, /Active|Modified/, repoName);
});

Cypress.Commands.add('currentClusterResourceCount', (clusterName) => {
  cy.accesMenuSelection('Continuous Delivery', 'Clusters');
  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.verifyTableRow(0, 'Active', clusterName);
  cy.get('td.col-link-detail > span').contains(clusterName).click();
  cy.get("div[primary-color-var='--sizzle-success'] div[class='data compact'] > h1")
  .invoke('text')
  .then((clusterResourceCountText) => {
    // Convert to integer
    const clusterCurrentResourceCount = parseInt(clusterResourceCountText.trim(), 10);
    cy.log("Resource count on each cluster is: " + clusterCurrentResourceCount);
    cy.wrap(clusterCurrentResourceCount).as('clusterCurrentResourceCount');
  })
})

Cypress.Commands.add('gitRepoResourceCountAsInteger', (repoName, fleetNamespace='fleet-local') => {
  cy.continuousDeliveryMenuSelection();
  cy.fleetNamespaceToggle(fleetNamespace);
  cy.verifyTableRow(0, 'Active', repoName);
  cy.contains(repoName).click()
  cy.get('.primaryheader > h1, h1 > span.resource-name.masthead-resource-title').contains(repoName).should('be.visible')

  cy.get("div[data-testid='gitrepo-deployment-summary'] div[class='count'], div[data-testid='resource-deployment-summary'] div[class=count]")
  .invoke('text')
  .then((gitRepoResourceCountText) => {
    const gitRepoTotalResourceCount = parseInt(gitRepoResourceCountText.trim(), 10);
    cy.log("GitRepo Resource count is: " + gitRepoTotalResourceCount);
    cy.wrap(gitRepoTotalResourceCount).as('gitRepoTotalResourceCount');
  })
})

Cypress.Commands.add('actualResourceOnCluster', (clusterName) => {
// Get Cluster Resources before GitRepo created.
  cy.accesMenuSelection('Continuous Delivery', 'Clusters');
  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.verifyTableRow(0, 'Active', clusterName);
  cy.get('td.col-link-detail > span').contains(clusterName).click();
  // Get resources from the cluster page after GitRepo install.
  cy.get("div[primary-color-var='--sizzle-success'] div[class='data compact'] > h1")
  .invoke('text')
  .then((clusterResourceCountText) => {
    const resourceCountOnCluster = parseInt(clusterResourceCountText.trim(), 10);
    cy.log("Resource count on each cluster is: " + resourceCountOnCluster);
    cy.get('@clusterCurrentResourceCount').then((clusterCurrentResourceCount) => {
      // Remove default 6/7 resources from Total resources available
      // on single cluster after GitRepo install it's resources.
      const actualResourceOnCluster = resourceCountOnCluster - clusterCurrentResourceCount;
      cy.wrap(actualResourceOnCluster).as('actualResourceOnCluster');
    })
  })
})

Cypress.Commands.add('compareClusterResourceCount', (multipliedResourceCount=true) => {
  // Get the stored 'gitRepoResourceCount' value and
  // Multipy 'actualResourceOnCluster' 3 times because 3 clusters.
  // Compare final result with the 'gitRepoTotalResourceCount'.
  cy.get('@actualResourceOnCluster').then((actualResourceOnCluster) => {
    cy.get('@gitRepoTotalResourceCount').then((gitRepoTotalResourceCount) => {
      // When 'sameResourceEachCluster' is true then each cluster has 
      // 'actualResourceOnCluster' is equal to 'gitRepoResourceCount'
      if (multipliedResourceCount) {
        expect(gitRepoTotalResourceCount).to.equal(actualResourceOnCluster * 3);
      }
      else {
        expect(gitRepoTotalResourceCount).to.equal(actualResourceOnCluster);
      }
    })
  })
})

Cypress.Commands.add('createNewUser', (username, password, role, uncheckStandardUser=false) => {
  cy.contains('Users & Authentication')
    .click();
  cy.contains('.title', 'Users')
    .should('exist');
  cy.clickButton('Create');
  cy.typeValue('Username', username);
  cy.typeValue('New Password', password);
  cy.typeValue('Confirm Password', password);
  if (role) {
    cy.contains(role)
    .click();
  } 
  if (uncheckStandardUser === true) {
    cy.get('body').then((body) => {
      if (body.find('span[aria-label="Standard User"]').length) {
        cy.get('span[aria-label="Standard User"]').scrollIntoView();
        cy.get('span[aria-label="Standard User"]')
          .should('be.visible')        
          .click();
      }
      else if (body.find('div[data-testid="grb-checkbox-user"] > .checkbox-container').length) {
        cy.get('div[data-testid="grb-checkbox-user"] > .checkbox-container').scrollIntoView();
        cy.get('div[data-testid="grb-checkbox-user"] > .checkbox-container')
          .contains('Standard User')
          .should('be.visible')
          .click();
      }
    })    
  }
  cy.getBySel('form-save')
    .contains('Create')
    .click();
  cy.contains(username).should('exist');
})

Cypress.Commands.add('createNewFleetWorkspace', (newWorkspaceName) => {
  // Create new workspace
  cy.continuousDeliveryMenuSelection();
  cy.continuousDeliveryWorkspacesMenu()
  cy.clickButton('Create')
  cy.contains('Workspace:').should('be.visible');
  cy.typeValue('Name', newWorkspaceName);
  cy.clickButton('Create');
  cy.filterInSearchBox(newWorkspaceName)
  cy.verifyTableRow(0, 'Active', newWorkspaceName);
})

Cypress.Commands.add('enableFeatureFlag', (flagName) => {
  // Enable given Feature Flag for the cluster.
  cy.accesMenuSelection("Global Settings", "Feature Flags");
  cy.contains('.title', 'Feature Flags').should('be.visible');

  cy.filterInSearchBox(flagName);
  cy.verifyTableRow(0, 'Disabled', flagName);
  cy.open3dotsMenu(flagName, 'Activate');

  // Activate the Feature Flag
  cy.get('div.card-title')
  .should('be.visible')
  .then(($el) => {
    if ($el.text().includes('Are you sure?')) {
      // Check that 'Are you sure?' is visible before activating.
      cy.checkModalCardTitle('Are you sure?', false);
      cy.clickButton("Activate");
    }
  });

  // Check that 'Are you sure?' is not visible anymore.
  cy.checkModalCardTitle('Are you sure?', false, false);

  // After activation, Rancher pod will restart.
  // Wait for 'Waiting for Restart' to disappear.
  cy.checkModalCardTitle('Waiting for Restart')
})

Cypress.Commands.add('checkModalCardTitle', (expectedText, waitForRestart=true, shouldHaveText=true) => {
  // Pop-up menu comes under <div modal>, when interacting with different
  // dialog boxes. Check the text present/absense on each Modal page Title.
  cy.get('div.card-title')
    .should('be.visible')

  cy.get('div.card-title')
  .invoke('text') // Get the raw text
  .then((text) => {
    // Normalize the text by replacing non-breaking spaces with regular spaces and trimming
    const normalizedText = text.replace(/\u00A0/g, ' ').trim();

    if (shouldHaveText) {
      expect(normalizedText).to.equal(expectedText); 
    } else {
      expect(normalizedText).to.not.equal(expectedText); 
    }

    // Now check for the "Waiting for Restart" condition if waitForRestart is true
    if (waitForRestart) {
      cy.contains(expectedText, { timeout: 180000 }).should('not.exist');
    }
  });
})

Cypress.Commands.add('moveClusterToWorkspace', (clusterName, workspaceName, timeout, restore=false) => {
  // Navigate to Clusters page when other navigation is present.
  cy.get('body').then((body) => {
    if (body.find('.title').text().includes('Clusters')) {
      return true
    }
    else {
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
    }
  })
  if (restore) {
    cy.fleetNamespaceToggle("new-fleet-workspace");
  }

  cy.filterInSearchBox(clusterName);
  cy.verifyTableRow(0, 'Active', clusterName);
  cy.open3dotsMenu(clusterName, 'Change workspace')

  // Check pop-up menu has title and no need to wait for restart Rancher(false).
  cy.checkModalCardTitle('Assign Cluster To…', false);

  cy.get(
    `[data-testid="workspace_options"] .vs__dropdown-toggle, 
    .labeled-select.edit.hoverable [aria-label="Search for option"]`
  ).click();
  cy.contains(workspaceName, { matchCase: false })
    .should('be.visible')
    .click({ force: true });
  cy.clickButton('Apply');

  // It automatically switches to Newly created workspace.
  // We will change the Fleet workspace explicitly to newly created workspace
  cy.wait(500);
  cy.fleetNamespaceToggle(workspaceName);
  cy.clickNavMenu(['Clusters']);
  cy.filterInSearchBox(clusterName);

  // After move, cluster requires around 60seconds to back in Active state.
  cy.wait(timeout);
  cy.verifyTableRow(0, 'Active', clusterName);
})

Cypress.Commands.add('restoreClusterToDefaultWorkspace', (clusterName, timeout, defaultWorkspaceName='fleet-default', restore=true) => {
  cy.moveClusterToWorkspace(clusterName, defaultWorkspaceName, timeout, restore);
})

Cypress.Commands.add('createConfigMap', (configMapName) => {
  cy.accesMenuSelection('local', 'Storage', 'ConfigMaps');
  cy.clickButton('Create');
  cy.clickButton('Edit as YAML');
  cy.addYamlFile('assets/helm-app-test-map-configmap.yaml');
  cy.wait(1000);
  cy.clickButton('Create');
  cy.filterInSearchBox(configMapName);
  cy.verifyTableRow(0, configMapName);
})


Cypress.Commands.add('deleteConfigMap', (configMapName) => {
    cy.accesMenuSelection('local', 'Storage', 'ConfigMaps');
    cy.filterInSearchBox(configMapName);
    cy.wait(1000);
    cy.get('body').then(($body) => {
      const button = $body.find('[data-testid="sortable-table-promptRemove"]');
      if (button.length > 0) {
        cy.wrap(button).should('be.visible').then(() => {
          cy.deleteAll(false);
        });
      } else {
        cy.log("No ConfigMap available for Delete.");
      }
    })
  })

// Command to remove pop-ups if they appear
// Note: this should be MOMENTARY and a bug should be filed
// Remove them once bug is fixed
Cypress.Commands.add('closePopWindow', (windowMessage, retries = 5, delay = 1000) => {
  
  const checkAndClose = (remainingRetries) => {
    if (remainingRetries <= 0) {
      cy.log('No pop-up found after retries.');
      return;
    }

    cy.get('body').then(($body) => {
      if ($body.find('.growl-text-title').text().includes(windowMessage)) {
        cy.log('POP UP WINDOW FOUND. CLOSING IT. PLEASE INVESTIGATE CAUSE');
        cy.get('i.close.hand.icon.icon-close').should('be.visible').click();
      } else {
        cy.wait(delay).then(() => {
          checkAndClose(remainingRetries - 1);
        });
      }
    });
  };

  checkAndClose(retries);
});

Cypress.Commands.add('k8sUpgradeInRancher', (clusterName) => {
  const k8s_version_for_upgrade_ds_cluster = Cypress.env('k8s_version_upgrade_ds_cluster_to');
  const timeout = 420000
  cy.accesMenuSelection('Cluster Management' , 'Clusters');
  cy.wait(500);
  cy.filterInSearchBox(clusterName);
  cy.verifyTableRow(0, 'Active');
  cy.reload()
  cy.filterInSearchBox(clusterName);
  cy.verifyTableRow(0, 'Active'); 
  cy.get('tr.main-row')
    .find('span.cluster-link a')
    .click();

  cy.get('[data-testid="masthead-action-menu"]').should('be.visible').click();
  cy.get('.list-unstyled.menu > li > span, div.dropdownTarget', { timeout: 15000 }).contains('Edit Config').should('be.visible');
  cy.get('.list-unstyled.menu > li > span, div.dropdownTarget', { timeout: 15000 }).contains('Edit Config').click({ force: true });
  // Ensure dropdown is not present
  cy.contains('Edit Config').should('not.exist')

  cy.wait(10000);
  cy.get(
    `[data-testid="cruimported-kubernetesversion"] .vs__dropdown-toggle, 
    .labeled-select.edit.hoverable [aria-label="Search for option"]`
  ).click();
  cy.log(`k8s_version_for_upgrade_ds_cluster: ${k8s_version_for_upgrade_ds_cluster}`);
  expect(k8s_version_for_upgrade_ds_cluster).to.be.a('string');
  cy.contains(k8s_version_for_upgrade_ds_cluster)
    .should('be.visible')
    .and('not.equal', Cypress.env('k8s_version'))
    .click();
  cy.clickButton('Save');
  cy.filterInSearchBox(clusterName);
  cy.verifyTableRow(0, 'Upgrading');
  cy.verifyTableRow(0, 'Active', k8s_version_for_upgrade_ds_cluster, timeout);
})

// Below function will ensure that there is no Access to the Create GitRepos. Used in RBAC tests only.
Cypress.Commands.add('checkAccessToCreateGitRepoPage', () => {
  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    cy.clickButton('Create App Bundle');
    cy.get('[data-testid="subtype-banner-item-fleet.cattle.io.gitrepo"]').should('be.visible').trigger('mouseenter', { force: true });
    cy.contains('You have no permissions to create Git Repos').should('be.visible');
    cy.clickButton('Cancel');
  }
  else {
    cy.get('.btn.role-primary').contains('Add Repository').should('not.exist');
  }
});

// Command to create cloud credential
Cypress.Commands.add('createCloudCredential', (cloudProvider='Amazon', credentialName, accessKey, secretKey, region='eu-central-1') => {
  // Create cloud credential
  cy.accesMenuSelection('Cluster Management', 'Cloud Credentials');
  cy.wait(1000); // Wait to avoid overlaying issue
  cy.clickButton('Create');
  cy.contains('Cloud Credential: Create Amazon').should('be.visible');
  cy.contains(cloudProvider).should('exist').click();
  cy.byLabel('Credential Name').type(credentialName);
  cy.byLabel('Access Key').type(accessKey);
  cy.byLabel('Secret Key').type(secretKey);
  cy.contains('Default Region').should('be.visible').click().then(() => {
    cy.contains(region).should('exist').click();
  });
  cy.clickButton('Create');
  cy.wait(1000);

  // Verify cloud credential is created
  cy.verifyTableRow(0, credentialName, accessKey);
});

// Command to create a cloud cluster via Rancher UI
Cypress.Commands.add('createCloudCluster', (cloudInstanceType, clusterName, subnetId ) => {

  // Note: Currently, the command assumes cloud credential is already created and there is one available. Implement logic to choose different one if multiple present..

  cy.accesMenuSelection('Cluster Management', 'Clusters');
  cy.clickButton('Create');
  cy.wait(1000); // Wait to avoid overlaying issue
  cy.contains('Loading...', { timeout: 20000 }).should('not.exist');
  cy.contains('Cluster: Create').should('be.visible');
  cy.contains(cloudInstanceType).should('be.visible').click();
  cy.byLabel('Cluster Name').type(clusterName);
  cy.contains('VPC/Subnet').should('be.visible').click().then(() => {
    cy.contains(subnetId).should('be.visible').click();
  });

  cy.clickButton('Create');
  cy.wait(2000);

  // Verify cluster is created
  cy.contains('Clusters').should('be.visible');
  cy.get('td.col-cluster-link').contains(clusterName, { timeout: 60000 }).should('be.visible');
  cy.log('Cluster created');

  // Wait until cluster is active
  cy.contains('tr', clusterName).within(() => {
    cy.get('td').eq(1).then(($status) => {
      if ($status.text() !== 'Active') {
        cy.wrap($status, { timeout: 600000 }).should('contain.text', 'Active'); // Wait up to 10 minutes for the cluster to become Active
      }
    });
  });
});

Cypress.Commands.add('deleteDownstreamCluster', (clusterName, deleteOption=false) => {
    
  cy.accesMenuSelection('Cluster Management', 'Clusters');
  cy.filterInSearchBox(clusterName);
  cy.deleteAll(deleteOption);

  }
);
