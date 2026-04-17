#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only): " BASE_NAME
read -p "Instance type [db.t4g.small]: " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-db.t4g.small}
read -p "Multi AZ [false]: " MULTI_AZ
MULTI_AZ=${MULTI_AZ:-false}

# create the stack
aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-rds --template-body file://./rds.json --parameters ParameterKey=BaseName,ParameterValue=$BASE_NAME ParameterKey=InstanceType,ParameterValue=$INSTANCE_TYPE ParameterKey=MultiAZ,ParameterValue=$MULTI_AZ

# # wait for completion
aws cloudformation wait stack-create-complete --stack-name ${BASE_NAME}-rds --output text

# output the database endpoint
ENDPOINT=`aws cloudformation describe-stacks --stack-name ${BASE_NAME}-rds --query 'Stacks[0].Outputs[?OutputKey==\`DatabaseEndpoint\`].OutputValue' --output text`
echo "Database Endpoint:"
echo $ENDPOINT

# output the database port
PORT=`aws cloudformation describe-stacks --stack-name ${BASE_NAME}-rds --query 'Stacks[0].Outputs[?OutputKey==\`DatabasePort\`].OutputValue' --output text`
echo "Database Port:"
echo $PORT

# output the master user password
SECRET_ARN=`aws cloudformation describe-stacks --stack-name ${BASE_NAME}-rds --query 'Stacks[0].Outputs[?OutputKey==\`DatabaseMasterUserPasswordSecretArn\`].OutputValue' --output text`
echo "Master User Password:"
PASSWORD=`aws secretsmanager get-secret-value --query 'SecretString' --output text --secret-id $SECRET_ARN | jq -r '.password'`
echo $PASSWORD

# output as a postgres connection string
echo "Postgres Connection String:"
echo "postgresql://${BASE_NAME}:${PASSWORD}@${ENDPOINT}:${PORT}/${BASE_NAME}"
