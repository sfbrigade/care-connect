#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only): " BASE_NAME

aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-nlb --template-body file://./nlb.json --parameters ParameterKey=BaseName,ParameterValue=$BASE_NAME --output text

# wait for completion
aws cloudformation wait stack-create-complete --stack-name ${BASE_NAME}-nlb --output text
