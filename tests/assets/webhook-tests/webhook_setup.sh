#!/bin/bash

set -exo pipefail

# Redirect all output to a log file
exec > >(tee -i $PWD/assets/webhook-tests/webhook_setup.log)
exec 2>&1

# Set the environment variables
export REPO_OWNER="fleetqa"
export REPO_NAME="webhook-github-test"
export SECRET_VALUE="webhooksecretvalue"
# Get the external IP of the Google Cloud instance
export EXTERNAL_IP=$(wget --quiet --header="Metadata-Flavor: Google" -O - http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip) 
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

# Delete any previous webhook
# 1 - Get all webhooks
webhooks=$(wget --quiet --header="Authorization: Bearer ${GH_PRIVATE_PWD}" \
 -O - https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks)

# 2- Extract webhook IDs and delete each one
echo "$webhooks" | grep -o '"id": *[0-9]*' | awk -F ': ' '{print $2}' | while read webhook_id; do
  echo "Deleting webhook ID: $webhook_id"
  wget --quiet --method=DELETE --header="Authorization: Bearer ${GH_PRIVATE_PWD}" \
  -O - https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks/${webhook_id}
done

echo "All webhooks deleted."

sleep 3 # Adding a bit of sleep to get things to settle

# Create new adhock webhook with the specific Google External IP
wget --quiet \
     --method=POST \
     --header="Authorization: Bearer ${GH_PRIVATE_PWD}" \
     --header="Content-Type: application/json" \
     --body-data='{"name":"web","active":true,"events":["push"],"config":{"url":"https://'"${EXTERNAL_IP}"'.nip.io/","content_type":"json","secret":"'"${SECRET_VALUE}"'","insecure_ssl":"1"}}' \
     -O - https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks
