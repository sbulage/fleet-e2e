#!/bin/bash

set -ex

export KNOWN_HOSTS=$(ssh-keyscan -H github.com 2>/dev/null)

# Get yq tool and install it
echo "Downloading yq tool and installing it"
wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && chmod +x /usr/bin/yq

echo "Adding private key"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host.yaml

echo "Adding known host key"
yq eval ".stringData.known_hosts = strenv(KNOWN_HOSTS)" -i assets/known-host.yaml

echo "Adding private key to missmatched yaml"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host-missmatch.yaml
