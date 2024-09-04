#!/bin/bash
set -x

echo -e "Ensuring replicas is 5"
sed -i 's/replicas: ..*/replicas: 5/g' $PWD/fleet-qa-examples-public/disable-polling/nginx.yaml

echo -e "Commiting and pushing if needed "
cd $PWD/fleet-qa-examples-public/disable-polling
git add nginx.yaml

if ! git diff --quiet origin/main; 
    then
        echo "Changes detected from original repo. Changing replicas to 5"
        git commit -m 'Ensuring initial number of replicas is 5'
        git push -u origin main
    else
        echo -e "Nothing to push, done"
fi 
