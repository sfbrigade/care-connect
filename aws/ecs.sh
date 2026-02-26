#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only) [$1]: " BASE_NAME
BASE_NAME=${BASE_NAME:-$1}
read -p "Image URL [$2]: " IMAGE_URL
IMAGE_URL=${IMAGE_URL:-$2}
read -p "Session Secret [$3]: " SESSION_SECRET
SESSION_SECRET=${SESSION_SECRET:-$3}

aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-ecs --template-body file://./ecs.json --parameters ParameterKey=BaseName,ParameterValue=$BASE_NAME ParameterKey=ImageURL,ParameterValue=$IMAGE_URL ParameterKey=SessionSecret,ParameterValue=$SESSION_SECRET --output text
