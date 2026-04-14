#!/bin/bash
# This script is used to install git and helm 4.

set -euo pipefail

# Versions
HELM_VERSION="v4.1.3"

# Checksums
HELM_SUM_amd64="02ce9722d541238f81459938b84cf47df2fdf1187493b4bfb2346754d82a4700"

# Install git
sudo zypper -n install --no-recommends git

# Download Helm
curl -sSfL \
  "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" \
  -o helm.tar.gz

# Verify checksum
echo "${HELM_SUM_amd64}  helm.tar.gz" | sha256sum -c -

# Extract and install
tar -xzf helm.tar.gz linux-amd64/helm
sudo mv linux-amd64/helm /usr/local/bin/helm

# Cleanup
rm -rf linux-amd64 helm.tar.gz
