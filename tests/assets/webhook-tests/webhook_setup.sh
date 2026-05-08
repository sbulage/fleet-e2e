#!/bin/bash

set -eo pipefail

# Redirect all output to a log file (excluding sensitive commands)
exec > >(tee -i $PWD/assets/webhook-tests/webhook_setup.log)
exec 2>&1

# Set the environment variables
export REPO_OWNER="fleetqa"
export REPO_NAME="webhook-github-test"
export SECRET_VALUE="webhooksecretvalue"

# Get the external IP of the Google Cloud instance
# Using wget as curl may not be available in minimal GCP environments
export EXTERNAL_IP=$(wget --quiet --header="Metadata-Flavor: Google" -O - \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)
echo "External IP: ${EXTERNAL_IP}"

# Confirm the external IP is not empty
if [ -z "$EXTERNAL_IP" ]; then
  echo "Failed to get external IP"
  exit 1
fi

# Replace placeholder in webhook_ingress.yaml with the actual EXTERNAL_IP
sed -i "s/{{EXTERNAL_IP}}/${EXTERNAL_IP}/g" assets/webhook-tests/webhook_ingress.yaml

# Log the current directory and PATH
echo "Current directory: $(pwd)"
echo "PATH: $PATH"

# Verify gh CLI is available (should be mounted from host)
if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI not found"
  echo "gh CLI should be installed on the host and mounted into the container"
  echo "Please ensure gh is installed on the GCP runner"
  exit 1
fi

echo "Using gh CLI: $(gh --version | head -n1)"

# Set GH_TOKEN from GH_PRIVATE_PWD for gh CLI authentication
# This avoids passing tokens in command-line arguments
# Handle both uppercase (from workflow) and lowercase (from Cypress) variable names
if [ -n "${GH_PRIVATE_PWD}" ]; then
  export GH_TOKEN="${GH_PRIVATE_PWD}"
elif [ -n "${gh_private_pwd}" ]; then
  export GH_TOKEN="${gh_private_pwd}"
else
  echo "Error: GH_PRIVATE_PWD or gh_private_pwd environment variable not set"
  exit 1
fi

# Verify gh CLI authentication
if ! gh auth status &> /dev/null; then
  echo "Error: gh CLI authentication failed"
  exit 1
fi

echo "Successfully authenticated with GitHub CLI"

# Delete any previous webhooks using gh CLI
echo "Deleting existing webhooks..."
gh api "repos/${REPO_OWNER}/${REPO_NAME}/hooks" --jq '.[].id' | while read -r webhook_id; do
  if [ -n "$webhook_id" ]; then
    echo "Deleting webhook ID: $webhook_id"
    gh api --method DELETE "repos/${REPO_OWNER}/${REPO_NAME}/hooks/$webhook_id"
  fi
done

echo "All webhooks deleted."

sleep 3 # Adding a bit of sleep to get things to settle

# Create new webhook with the specific Google External IP using gh CLI
echo "Creating new webhook..."
gh api \
  --method POST \
  "repos/${REPO_OWNER}/${REPO_NAME}/hooks" \
  -f name='web' \
  -F active=true \
  -f events[]='push' \
  -f config[url]="https://${EXTERNAL_IP}.nip.io/" \
  -f config[content_type]='json' \
  -f config[secret]="${SECRET_VALUE}" \
  -f config[insecure_ssl]='1'

echo "Webhook created successfully"
