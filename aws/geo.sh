#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only): " BASE_NAME

aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-geo --template-body file://./geo.json --parameters ParameterKey=BaseName,ParameterValue=$BASE_NAME --output text

# wait for completion
aws cloudformation wait stack-create-complete --stack-name ${BASE_NAME}-geo --output text

# output the access key id
echo "Access Key ID:"
aws cloudformation describe-stacks --stack-name ${BASE_NAME}-geo --query 'Stacks[0].Outputs[?OutputKey==`LocationUserAccessKeyId`].OutputValue' --output text 

# output the secret access key
SECRET_ARN=`aws cloudformation describe-stacks --stack-name ${BASE_NAME}-geo --query 'Stacks[0].Outputs[?OutputKey==\`LocationUserSecretAccessKeyARN\`].OutputValue' --output text`
echo "Secret Access Key:"
aws secretsmanager get-secret-value --query 'SecretString' --output text --secret-id $SECRET_ARN
