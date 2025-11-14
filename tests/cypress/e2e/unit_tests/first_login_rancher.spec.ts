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

import * as cypressLib from '@rancher-ecp-qa/cypress-library';
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const rancherVersion = Cypress.env('rancher_version');
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|prime-alpha|prime-rc|alpha)\/2\.(1[2-9]|\d{2,})(\..*)?$/,
  /^head\/2\.(1[2-9]|\d{3,})$/
];

Cypress.config();
describe('First login on Rancher', { tags: '@login' }, () => {
  qase(120,
    it('Log in and accept terms and conditions', { tags: '@fleet-120' },  () => {
      cypressLib.firstLogin();
    })
  );

  qase(114,
    it('Check ready state of local cluster after Rancher login', { tags: '@fleet-114' }, () => {
      cy.login();
      cy.visit('/');
      cypressLib.burgerMenuToggle();
      cypressLib.accesMenu('Continuous Delivery');
      cy.contains('Dashboard').should('be.visible');
      cypressLib.accesMenu('Clusters');
      cy.fleetNamespaceToggle('fleet-local');
      cy.verifyTableRow(0, 'Active', ' ' );
      // In 2.12 forth column contains Bundle Ready count
      // Check Bundle Ready count should not be '0'
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.get("td[data-testid='sortable-cell-0-4']", { timeout: 300000 }).should("not.contain", '0');
      }
      else {
        cy.get("td[data-testid='sortable-cell-0-2']", { timeout: 300000 }).should("not.contain", '0');
      }
    })
  );
});

// Upgrade Fleet from chart to latest when this is not the default one.
describe('Upgrade Fleet via UI', { tags: '@upgrade-fleet-chart' }, () => {
  qase(189,
    it('Upgrade Fleet chart to latest', () => {
      cy.login();
      cy.visit('/');
      cy.allowRancherPreReleaseVersions();
      cy.upgradeFleet();
    })
  );
})
