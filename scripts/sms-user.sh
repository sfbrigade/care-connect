#!/bin/bash
# Dev helper: inspect / enroll / unenroll a user's SMS notification state.
# Runs the Node script inside the server container.
#
#   scripts/sms-user.sh check     <email>
#   scripts/sms-user.sh enroll    <email> [phoneNumber]
#   scripts/sms-user.sh unenroll  <email>
set -e
docker compose exec -T server node server/scripts/sms-user.mjs "$@"
