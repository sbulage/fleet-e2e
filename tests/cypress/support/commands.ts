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

// In this file you can write your custom commands and overwrite existing commands.

import 'cypress-file-upload';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';

// Generic commands

// Fleet commands

// Add path on "Git Repo:Create"
Cypress.Commands.add('addPathOnGitRepoCreate', (path, index=0) => {
  //Index defaulting to 0, for first input box.
  cy.clickButton('Add Path');
  cy.get(`[data-testid="array-list-box${ index }"] input[placeholder="e.g. /directory/in/your/repo"]`).type(path);
})

Cypress.Commands.add('gitRepoAuth', (gitOrHelmAuth='Git', gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex ) => {
  cy.contains(`${gitOrHelmAuth} Authentication`).click()


  // Select the Git auth method
  cy.get('div.option-kind-highlighted', { timeout: 15000 }).contains(gitAuthType, { matchCase: false }).should('be.visible').click();

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
});

Cypress.Commands.add('importYaml', ({ clusterName, yamlFilePath }) => {
  cypressLib.burgerMenuToggle();
  cy.get('div.cluster-name').contains(clusterName).click();
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

// Command add and edit Fleet Git Repository
// TODO: Rename this command name to 'addEditFleetGitRepo'
Cypress.Commands.add('addFleetGitRepo', ({ repoName, repoUrl, branch, path, path2, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, keepResources, correctDrift, fleetNamespace='fleet-local', editConfig=false, helmUrlRegex, deployToTarget }) => {
  cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
  if (editConfig === true) {
    cy.fleetNamespaceToggle(fleetNamespace);
    cy.verifyTableRow(0, /Active|Modified/, repoName);
    cy.open3dotsMenu(repoName, 'Edit Config');
    cy.contains('Git Repo:').should('be.visible');
  } 
  else {
    cy.clickButton('Add Repository');
    cy.contains('Git Repo:').should('be.visible');
    cy.typeValue('Name', repoName);
    cy.typeValue('Repository URL', repoUrl);
    cy.typeValue('Branch Name', branch);
  }
  // Path is not required when git repo contains 1 application folder only.
  if (path) {
    cy.addPathOnGitRepoCreate(path);
  }
  if (path2) {
    cy.addPathOnGitRepoCreate(path2, 1);
  }
  if (gitAuthType) {
    cy.gitRepoAuth(gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex);
  }
  // Check the checkbox of keepResources if option 'yes' is given.
  // After checked check-box, `keepResources: true` is set
  // in the GitRepo YAML.
  if (keepResources === 'yes') {
    cy.get('.checkbox-outer-container.check').contains('Always Keep Resources').click();
  }
  if (correctDrift === 'yes') {
    cy.get('[data-testid="GitRepo-correctDrift-checkbox"] > .checkbox-container > .checkbox-custom').click();
  }
  cy.clickButton('Next');
  cy.get('button.btn').contains('Previous').should('be.visible');
  // Target to any cluster or group or no cluster.
  if (deployToTarget) {
    cy.deployToClusterOrClusterGroup(deployToTarget);
  }
});

// Deploy To target functionality used in addGitRepo
Cypress.Commands.add('deployToClusterOrClusterGroup', (deployToTarget) => {
  cy.get('div.labeled-select.create.hoverable').should('be.visible');
  cy.get('div.labeled-select.create.hoverable').click({ force: true });
  cy.get('ul.vs__dropdown-menu > li').contains(deployToTarget).should("exist").click();
});

// 3 dots menu selection
Cypress.Commands.add('open3dotsMenu', (name, selection, checkNotInMenu=false) => {
  // Open 3 dots button
  cy.contains('tr.main-row', name).should('exist').within(() => {
    cy.get('.icon.icon-actions').click({ force: true });
    cy.wait(250)
  });

  if (checkNotInMenu === true) {
    cy.get('.list-unstyled.menu > li').each(($el) => {
        if ($el.text() != selection) {
        cy.log(`Cannot perform action with specified value "${selection}" since it is not present. Current Menu is: "${$el.text()}"`);
        cy.get('ul.list-unstyled.menu').contains(selection).should('not.exist')
      }        
    });
    // Close 3 dots button menu
    cy.get('.background').should('exist').click({ force: true });
  }
  
  else if (selection) {
    // Open edit config and select option
    cy.get('.list-unstyled.menu > li > span', { timeout: 15000 }).contains(selection).should('be.visible');
    cy.get('.list-unstyled.menu > li > span', { timeout: 15000 }).contains(selection).click({ force: true });
    // Ensure dropdown is not present
    cy.contains('Edit Config').should('not.exist')
  }
});

// Verify textvalues in table giving the row number
// More items can be added with new ".and"
Cypress.Commands.add('verifyTableRow', (rowNumber, expectedText1, expectedText2) => {
  // Adding small wait to give time for things to settle a bit
  // Could not find a better way to wait, but can be improved
  cy.wait(1000)
  // Ensure table is loaded and visible
  cy.contains('tr.main-row[data-testid="sortable-table-0-row"]').should('not.be.empty', { timeout: 25000 });
  cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-${rowNumber}-row"]`, { timeout: 60000 }).should(($row) => {
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
  cy.get('.top > .ns-filter').click({ force: true });
  cy.get('div.ns-item').contains(namespaceName).scrollIntoView()
  cy.get('div.ns-item').contains(namespaceName).click()
  cy.get('div.ns-dropdown.ns-open > i.icon.icon-chevron-up').click({ force: true });
})

// Command to filter text in searchbox
Cypress.Commands.add('filterInSearchBox', (filterText) => {
  cy.get('input.input-sm.search-box').should('be.visible');
  // Added 5 seconds of wait, as element is hidden after it gets visible.
  cy.wait(500);
  cy.get('input.input-sm.search-box').clear().type(filterText);
});

// Go to specific Sub Menu from Access Menu
Cypress.Commands.add('accesMenuSelection', (firstAccessMenu='Continuous Delivery',secondAccessMenu, clickOption) => {
  // added wait of 500ms to make time for CSS transitions to resolve (addresses tests flakiness)
  // unfortunately there's no "easy" way of waiting for transitions and 500ms is quick and does the trick
  cypressLib.burgerMenuToggle( {animationDistanceThreshold: 10} );
  cy.wait(500);

  cy.contains(firstAccessMenu).should('be.visible');
  cypressLib.accesMenu(firstAccessMenu);
  if (secondAccessMenu) {
    cy.contains(secondAccessMenu).should('be.visible');
    cypressLib.accesMenu(secondAccessMenu);
  };
  if (clickOption) {
    cy.get('nav.side-nav').contains(clickOption).should('be.visible').click();
  };
  // Ensure some title exist to proof the menu is loaded
  cy.get('div.title').last().should('exist').and('not.be.empty');
});

// Fleet namespace toggle
Cypress.Commands.add('fleetNamespaceToggle', (toggleOption='local') => {
  cy.contains('fleet-').click();
  cy.contains(toggleOption).should('be.visible').click();
});

// Command to delete all rows if check box and delete button are present
// Note: This function may be substituted by 'cypressLib.deleteAllResources' 
// when hardcoded texts present can be parameterized
Cypress.Commands.add('deleteAll', (fleetCheck=true) => {
  const noRowsMessages = ['There are no rows to show.', 'There are no rows which match your search query.']
  cy.get('body').then(($body) => {
    if ($body.text().includes('Delete')) {
      cy.wait(250) // Add small wait to give time for things to settle
      cy.get('[width="30"] > .checkbox-outer-container.check', { timeout: 50000 }).click();
      cy.get('.btn').contains('Delete').click({ctrlKey: true});
      if (fleetCheck === true) {
        cy.contains('No repositories have been added', { timeout: 20000 }).should('be.visible')
      } else {
        cy.get('td > span, td.text-center > span').invoke('text').should('be.oneOf', noRowsMessages)
      }
    };
  });
});

// Command to delete all repos pressent in Fleet local and default
Cypress.Commands.add('deleteAllFleetRepos', () => {
  cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
  cy.fleetNamespaceToggle('fleet-local')
  cy.deleteAll();
  cy.fleetNamespaceToggle('fleet-default')
  cy.deleteAll();
});

// Check Git repo deployment status
Cypress.Commands.add('checkGitRepoStatus', (repoName, bundles, resources) => {
  cy.verifyTableRow(0, 'Active', repoName);
  cy.contains(repoName).click()
  cy.get('.primaryheader > h1').contains(repoName).should('be.visible')
  cy.log(`Checking ${bundles} Bundles and Resources`)
  if (bundles) {
    cy.get('div.fleet-status', { timeout: 30000 }).eq(0).contains(` ${bundles} Bundles ready `, { timeout: 30000 }).should('be.visible')
  }
  // Ensure this check is performed only for tests in 'fleet-local' namespace.
  if (resources) {
      cy.get('div.fleet-status', { timeout: 30000 }).eq(1).contains(` ${resources} Resources ready `, { timeout: 30000 }).should('be.visible')
  } else {
    // On downstream clusters (v2.9+), resources are affected by cluster count.
    // Avoid specifying 'resources' for tests in 'fleet-default' to allow automatic verification.
    // This checks for the presence of a matching "X / X Resources ready" pattern.
    cy.get('div.fleet-status', { timeout: 30000 }).eq(1).should(($div) => {
      // Replace whitespaces by a space and trim the string
      const text = $div.text().replace(/\s+/g, ' ').trim();
      // Perform the match check within .should callback as .then breaks retry ability
      expect(text).to.match(/.*([1-9]\d*) \/ \1 Resources ready/);
    });
  }
});

// Check deployed application status (present or not)
Cypress.Commands.add('checkApplicationStatus', (appName, clusterName='local', appNamespace='Only User Namespaces') => {
  cy.accesMenuSelection(clusterName, 'Workloads', 'Pods');
  cy.nameSpaceMenuToggle(appNamespace);
  cy.filterInSearchBox(appName);
  cy.contains('tr.main-row[data-testid="sortable-table-0-row"]').should('not.be.empty', { timeout: 25000 });
  cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-0-row"]`)
    .children({ timeout: 60000 })
    .should('contain.text', appName);
});

// Delete the leftover applications
Cypress.Commands.add('deleteApplicationDeployment', (clusterName='local') => {
  cypressLib.burgerMenuToggle();
  cypressLib.accesMenu(clusterName);
  cy.clickNavMenu(['Workloads', 'Deployments']);
  cy.wait(500);
  cy.nameSpaceMenuToggle("Only User Namespaces");
  cy.wait(500);
  cy.deleteAll(false);
});

// Modify given application
Cypress.Commands.add('modifyDeployedApplication', (appName, clusterName='local') => {
  cypressLib.burgerMenuToggle();
  cypressLib.accesMenu(clusterName);
  cy.clickNavMenu(['Workloads', 'Deployments']);
  // Modify deployment of given application
  cy.wait(500);
  cy.get('#trigger').click({ force: true });
  cy.contains('Scale').should('be.visible');
  // TODO: Add logic to increase resource count to given no.
  cy.get('.icon-plus').click();
  cy.get('#trigger > .icon.icon-chevron-up').click({ force: true });
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
  cy.get(`span[aria-label='${roleName}']`).scrollIntoView();
  cy.get(`span[aria-label='${roleName}']`).should('be.visible').click();

  cy.clickButton('Save');
  // Sortering by Age so first row is the desired user
  cy.contains('Age').should('be.visible').click();
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
  cy.filterInSearchBox(clusterName);
  cy.open3dotsMenu(clusterName, 'Edit Config');
  cy.clickButton('Add Label');
  cy.get('div[class="row"] div[class="key-value"] input[placeholder="e.g. foo"]').last().type(key);
  cy.get('div[class="row"] div[class="key-value"] textarea[placeholder="e.g. bar"]').last().type(value);
  cy.wait(500);
  cy.clickButton('Save');
  cy.contains('Save').should('not.exist');
})

// Create clusterGroup based on label assigned to the cluster
Cypress.Commands.add('createClusterGroup', (clusterGroupName, key, value, bannerMessageToAssert) => {
  cy.fleetNamespaceToggle('fleet-default');
  cy.clickButton('Create');
  cy.get('input[placeholder="A unique name"]').type(clusterGroupName);
  cy.clickButton('Add Rule');
  cy.get('[data-testid="input-match-expression-key-control-0"]').focus().type(key);
  cy.get('[data-testid="input-match-expression-values-control-0"]').type(value);
  cy.contains(bannerMessageToAssert).should('be.visible');
  cy.clickButton('Create');
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
})

// Delete Cluster Group
Cypress.Commands.add('deleteClusterGroups', () => {
  cy.accesMenuSelection('Continuous Delivery', 'Cluster Groups');
  cy.fleetNamespaceToggle('fleet-default');
  cy.deleteAll(false);
})

// Remove added labels from the cluster(s)
Cypress.Commands.add('removeClusterLabels', (clusterName, key, value) => {
  // Navigate to Clusters page when other navigation is present.
  cy.get('body').then((body) => {
    if (body.find('.title').text().includes('Clusters')) {
      return true
    }
    else {
      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
    }
  })

  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.open3dotsMenu(clusterName, 'Edit Config');
  cy.get('div[class="row"] div[class="key-value"] button.role-link').first().click();
  cy.wait(500);
  cy.clickButton('Save');
  cy.contains('Save').should('not.exist');

  // Ensure label is removed.
  cy.contains('.title', 'Clusters').should('be.visible');
  cy.filterInSearchBox(clusterName);
  cy.get('td.col-link-detail > span').contains(clusterName).click();
  cy.get('div.tags > span').should("not.contain", `${key} : ${value}`);

  // Navigate back to all clusters page.
  cy.clickNavMenu(['Clusters']);
})
