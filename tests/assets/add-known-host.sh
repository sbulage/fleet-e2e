#!/bin/bash

set -euo pipefail

export KNOWN_HOSTS=$(ssh-keyscan -H github.com 2>/dev/null)

# renovate: datasource=github-releases depName=mikefarah/yq
YQ_VERSION="4.52.5"
# renovate: datasource=github-releases depName=mikefarah/yq digestVersion="4.52.5"
YQ_SHA256="c529c33e6b545d95e39445c37f673e31ca110c3ca9310b47ccea78f9190b061e"

# Get yq tool and install it
echo "Downloading yq tool and installing it"
wget -q "https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_amd64.tar.gz" -O yq.tar.gz
echo "${YQ_SHA256}  yq.tar.gz" | sha256sum -c -
tar -xzf yq.tar.gz ./yq_linux_amd64
mv yq_linux_amd64 /usr/bin/yq
chmod +x /usr/bin/yq
rm -f yq.tar.gz

echo "Adding private key"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host.yaml

echo "Adding known host key"
yq eval ".stringData.known_hosts = strenv(KNOWN_HOSTS)" -i assets/known-host.yaml

echo "Adding private key to missmatched yaml"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host-missmatch.yaml
