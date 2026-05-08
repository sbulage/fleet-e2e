#!/bin/bash
# This script is used to install git, helm 4, and GitHub CLI.

set -euo pipefail

# Versions
HELM_VERSION="v4.1.3"

# Checksums
HELM_SUM_amd64="02ce9722d541238f81459938b84cf47df2fdf1187493b4bfb2346754d82a4700"

# Install git
sudo zypper -n install --no-recommends git

# Install GitHub CLI (gh)
echo "Installing GitHub CLI..."
if ! command -v gh &> /dev/null; then
  # Add official GitHub CLI repository for openSUSE/SLES
  sudo zypper -n addrepo https://cli.github.com/packages/rpm/gh-cli.repo
  sudo zypper -n --gpg-auto-import-keys refresh
  sudo zypper -n install --no-recommends gh
  echo "GitHub CLI installed: $(gh --version | head -n1)"
else
  echo "GitHub CLI already installed: $(gh --version | head -n1)"
fi

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
