#!/bin/bash
# Dev helper: inspect / enroll / unenroll a user's SMS notification state.
# Runs the Node script inside the server container.
#   Usage:
#     scripts/sms-user.sh check     <email>
#     scripts/sms-user.sh enroll    <email> [phoneNumber]
#     scripts/sms-user.sh unenroll  <email>

#   check     <email>          Print SMS state + whether they'd receive a RESET
#                              notification right now (the recipient gate).
#   enroll    <email> [phone]  Make them a full RESET recipient (verified,
#                              subscribed to all events, unmuted).
#                              Default phone +15551110001.
#   unenroll  <email>          Clear all SMS state so the enrollment banner shows
#                              again
set -e
docker compose exec -T server node server/scripts/sms-user.mjs "$@"
