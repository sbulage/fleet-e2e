<img src="https://www.rancher.com/assets/img/brand-guidelines/project-logos/fleet/logo-horizontal-fleet.svg" width="150" alt="Fleet"> 

# fleet-e2e
Automation Repository for Fleet i.e. Rancher Continuous Delivery.

# CI status

|Lint| Rancher Head | Rancher v2.10-Head | Rancher v2.9-Head | Rancher v2.8-head |
|---|---|---|---|---|
|TBA|[![Rancher-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.11.yaml)|[![Rancher-2.10-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.10.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.10.yaml)|[![Rancher-2.9-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.9.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.9.yaml) |[![Rancher-2.8-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.8.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.8.yaml)
---
# What is Fleet?

- **Cluster engine:** Fleet is a container management and deployment engine designed to offer users more control on the local cluster and constant monitoring through GitOps. Fleet focuses not only on the ability to scale, but it also gives users a high degree of control and visibility to monitor exactly what is installed on the cluster.

- **Deployment management:** Fleet can manage deployments from git of raw Kubernetes YAML, Helm charts, Kustomize, or any combination of the three. Regardless of the source, all resources are dynamically turned into Helm charts, and Helm is used as the engine to deploy all resources in the cluster. As a result, users have a high degree of control, consistency, and auditability.

For information read it here: [Fleet Documentation](https://fleet.rancher.io/)

---

# Test structure
Currently, we divide our tests by priority (`p0`, `p1`,...). Aside of this we have an initial one, `first_login_rancher.spec.ts`, where we do our first connection into Rancher and some inital checkups. Hence our naming structure is:

- `first_login_rancher.spec.ts` 
- `p0_fleet.spec.ts`
- `p1_fleet.spec.ts`

By default, all these spec files will be executed every day in our nightly runs in the different Rancher versions.

# Running tests using Cypress grep
We have implemented tags for more precise selection of tests using a Cypress pluging called [cypress-grep](https://github.com/cypress-io/cypress/tree/develop/npm/grep)

There are several levels of tags. The main ones are in sync with the priority of tests and are tagged as `@login`, `@p0`, `@p1`. A second level allows the test to be selected by its test id; for example: `@fleet-62`

Note: the title can be either at `describe` or `it` level.

By default, daily runs will run test with the tags`@login`, `@p0`, `@p1`

To use locally use the tag `--env grepTags=tag` along with the npx command

For example:
```
npx cypress run -C cypress.config.ts  --env grepTags="@smoke" cypress/e2e/unit_tests/*.spec.ts
``` 




