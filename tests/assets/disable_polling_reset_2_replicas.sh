#!/bin/bash

set -ex

echo -e "Cloning repo"
if [ ! -d "$PWD/fleet-qa-examples-public" ]; then
  git clone "https://fleetqa:${gh_private_pwd}@github.com/fleetqa/fleet-qa-examples-public.git" --branch=main "$PWD/fleet-qa-examples-public"
else
  echo "Repo already exists, skipping clone."
fi

sleep 3

echo -e "Confirming repo exist in path"
if [ ! -d "$PWD/fleet-qa-examples-public/disable-polling" ]; then
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

git fetch origin

LOCAL_AHEAD=$(git rev-list origin/main..HEAD --count)
HAS_STAGED=$(git diff --cached --quiet; echo $?)

if [ "$HAS_STAGED" -ne 0 ] || [ "$LOCAL_AHEAD" -gt 0 ]; then
    echo "Changes detected. Committing and pushing replicas to 2"
    if [ "$HAS_STAGED" -ne 0 ]; then
        git commit -m 'Ensuring initial number of replicas is 2'
    fi
    sleep 1
    git push -u origin main
else
    echo -e "Nothing to push, done"
fi
