#!/bin/bash

set -exo pipefail
# Set the environment variables
REPO_OWNER="fleetqa"
REPO_NAME="webhook-github-test"
USER_EMAIL="fleet.qa.team@gmail.com"
USER_NAME="fleetqa"
FILE="deployment.yaml"


echo -e "Cloning repo"
if [ ! -d "$PWD/$REPO_NAME" ]; then
  git clone "https://$REPO_OWNER:${GH_PRIVATE_PWD}@github.com/$REPO_OWNER/$REPO_NAME.git" --branch=main "$PWD/$REPO_NAME"

else
  echo "Repo already exists, skipping clone."
fi

echo -e "Confirming repo exist in path"
test -e "$PWD/$REPO_NAME"
if [ $? -ne 0 ]; then
    echo "Error: path $PWD/$REPO_NAME does not exist"
    exit 1
fi

echo -e "Ensuring replicas is 2"
sed -i 's/replicas: ..*/replicas: 2/g' $PWD/$REPO_NAME/$FILE

echo -e "Commiting and pushing if replicas value in repo is not 2 "
cd $PWD/$REPO_NAME
git config user.email "$USER_EMAIL"
git config user.name "$USER_NAME"
git add $FILE

if ! git diff --quiet origin/main; 
    then
        echo "Changes detected from original repo. Changing replicas to 2"
        git commit -m 'Ensuring initial number of replicas is 2'
        git push -u origin main
    else
        echo -e "Nothing to push, done"
fi 
