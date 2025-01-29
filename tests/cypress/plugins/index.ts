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

/// <reference types="cypress" />
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  const url = process.env.RANCHER_URL || 'https://localhost:8005';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isFileExist, findFiles } = require('cy-verify-downloads');
  on('task', { isFileExist, findFiles })

  config.baseUrl                  = url.replace(/\/$/, );
  config.env.cache_session        = process.env.CACHE_SESSION || false;
  config.env.cluster              = process.env.CLUSTER_NAME;
  config.env.k8s_version          = process.env.K8S_VERSION_TO_PROVISION;
  config.env.password             = process.env.RANCHER_PASSWORD;
  config.env.rancher_version      = process.env.RANCHER_VERSION;
  config.env.username             = process.env.RANCHER_USER;
  config.env.gitlab_private_user  = process.env.GITLAB_PRIVATE_USER;
  config.env.gitlab_private_pwd   = process.env.GITLAB_PRIVATE_PWD;
  config.env.bitbucket_private_user  = process.env.BITBUCKET_PRIVATE_USER;
  config.env.bitbucket_private_pwd   = process.env.BITBUCKET_PRIVATE_PWD;
  config.env.gh_private_user  = process.env.GH_PRIVATE_USER;
  config.env.gh_private_pwd   = process.env.GH_PRIVATE_PWD;
  config.env.azure_private_user  = process.env.AZURE_PRIVATE_USER;
  config.env.azure_private_pwd   = process.env.AZURE_PRIVATE_PWD;
  config.env.grep = process.env.GREP;
  config.env.grepTags = process.env.GREPTAGS;
  config.env.rsa_private_key_qa  = process.env.RSA_PRIVATE_KEY_QA;
  config.env.rsa_public_key_qa   = process.env.RSA_PUBLIC_KEY_QA;
  config.env.upgrade             = process.env.UPGRADE;
  
  return config;
};
