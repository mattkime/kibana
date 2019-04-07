#!/usr/bin/env bash

set -e

function report {
  if [[ -z "$PR_SOURCE_BRANCH" ]]; then
    node src/dev/failed_tests/cli
  else
    echo "Failure issues not created on pull requests"

  fi
}

trap report EXIT

echo "hihihihihi"
echo $PATH
echo ---
echo $(yarn run grunt --version)
echo ---
ls -al $(FORCE_COLOR=0 yarn bin)/grunt

"$(FORCE_COLOR=0 yarn bin)/grunt" functionalTests:ensureAllTestsInCiGroup;

node scripts/build --debug --oss;

export TEST_BROWSER_HEADLESS=1

"$(FORCE_COLOR=0 yarn bin)/grunt" "run:functionalTests_ciGroup${CI_GROUP}";

if [ "$CI_GROUP" == "1" ]; then
  "$(FORCE_COLOR=0 yarn bin)/grunt" run:pluginFunctionalTestsRelease;
fi
