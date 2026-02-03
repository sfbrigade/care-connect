#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only): " STACK_BASE_NAME
read -p "Domain to configure: " DOMAIN

# create the stack
aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${STACK_BASE_NAME}-vpc --template-body file://./vpc.json --parameters ParameterKey=Domain,ParameterValue=$DOMAIN

# wait for completion
aws cloudformation wait stack-create-complete --stack-name ${STACK_BASE_NAME}-vpc --output text

# print the nameservers for the public hosted zone for the domain
echo "Name Servers:"
aws cloudformation describe-stacks --stack-name ${STACK_BASE_NAME}-vpc --query 'Stacks[0].Outputs[?OutputKey==`PublicHostedZoneNameServers`].OutputValue' --output text 
