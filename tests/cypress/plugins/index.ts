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
  config.expose.cache_session        = process.env.CACHE_SESSION || false;
  config.expose.cluster              = process.env.CLUSTER_NAME;
  config.expose.k8s_version          = process.env.K8S_VERSION_TO_PROVISION;
  config.expose.password             = process.env.RANCHER_PASSWORD;
  config.expose.rancher_version      = process.env.RANCHER_VERSION;
  config.expose.username             = process.env.RANCHER_USER;
  config.expose.gitlab_private_user  = process.env.GITLAB_PRIVATE_USER;
  config.expose.gitlab_private_pwd   = process.env.GITLAB_PRIVATE_PWD;
  config.expose.bitbucket_private_user  = process.env.BITBUCKET_PRIVATE_USER;
  config.expose.bitbucket_private_pwd   = process.env.BITBUCKET_PRIVATE_PWD;
  config.expose.gh_private_user  = process.env.GH_PRIVATE_USER;
  config.expose.gh_private_pwd   = process.env.GH_PRIVATE_PWD;
  config.expose.azure_private_user  = process.env.AZURE_PRIVATE_USER;
  config.expose.azure_private_pwd   = process.env.AZURE_PRIVATE_PWD;
  config.expose.grep = process.env.GREP;
  config.expose.grepTags = process.env.GREPTAGS;
  config.expose.rsa_private_key_qa  = process.env.RSA_PRIVATE_KEY_QA;
  config.expose.rsa_public_key_qa   = process.env.RSA_PUBLIC_KEY_QA;
  config.expose.upgrade             = process.env.UPGRADE;
  config.expose.fleet_app_version   = process.env.FLEET_APP_VERSION;
  config.expose.k8s_version_upgrade_ds_cluster_to = process.env.K8S_VERSION_UPGRADE_DS_CLUSTER_TO
  config.expose.aws_access_key_id = process.env.AWS_ACCESS_KEY_ID;
  config.expose.aws_secret_access_key = process.env.AWS_SECRET_ACCESS_KEY;
  config.expose.gh_app_id = process.env.GH_APP_ID;
  config.expose.gh_app_installation_id = process.env.GH_APP_INSTALLATION_ID;
  config.expose.gh_app_private_key = process.env.GH_APP_PRIVATE_KEY;
  
  return config;
};
