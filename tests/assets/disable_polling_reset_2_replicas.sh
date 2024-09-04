#!/bin/bash

set -ex

echo -e "Cloning repo"
git clone "https://fleetqa:${gh_private_pwd}@github.com/fleetqa/fleet-qa-examples-public.git" --branch=main "$PWD/fleet-qa-examples-public"

echo -e "Confirming repo exist in path"
test -e "$PWD/fleet-qa-examples-public/disable-polling"
if [ $? -ne 0 ]; then
    echo "Error: path $PWD/fleet-qa-examples-public/disable-polling does not exist"
    exit 1
fi

echo -e "Ensuring replicas is 2"
sed -i 's/replicas: ..*/replicas: 2/g' $PWD/fleet-qa-examples-public/disable-polling/nginx.yaml

echo -e "Commiting and pushing if replicas value in repo is not 2 "
cd $PWD/fleet-qa-examples-public/disable-polling
git config user.email "fleet.qa.team@gmail.com"
git config user.name "fleetqa"
git add nginx.yaml

if ! git diff --quiet origin/main; 
    then
        echo "Changes detected from original repo. Changing replicas to 2"
        git commit -m 'Ensuring initial number of replicas is 2'
        git push -u origin main
    else
        echo -e "Nothing to push, done"
fi 
