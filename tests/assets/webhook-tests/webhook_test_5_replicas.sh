#!/bin/bash
set -exo pipefail

# Set the environment variables
REPO_OWNER="fleetqa"
REPO_NAME="webhook-github-test"
FILE="deployment.yaml"

echo -e "Ensuring replicas is 5"
sed -i 's/replicas: ..*/replicas: 5/g' $PWD/$REPO_NAME/$FILE

echo -e "Commiting and pushing if needed "
cd $PWD/$REPO_NAME
git add $FILE

if ! git diff --quiet origin/main; 
    then
        echo "Changes detected from original repo. Changing replicas to 5"
        git commit -m 'Ensuring number of replicas is 5'
        git push -u origin main
        echo "Commit pushed to $REPO_NAME/$FILE"
        exit 0
    else
        echo -e "Nothing to push, done"
fi 
