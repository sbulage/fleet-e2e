// Check the Cypress tags
// Implemented but not used yet
export const isCypressTag = (tag: string) => {
  return (new RegExp(tag)).test(Cypress.expose("cypress_tags"));
}

// Check the K8s version
export const isK8sVersion = (version: string) => {
  version = version.toLowerCase();
  return (new RegExp(version)).test(Cypress.expose("k8s_version"));
}

// Check Rancher Manager version
export const isRancherManagerVersion = (version: string) => {
  return (new RegExp(version)).test(Cypress.expose("rancher_version"));
}
