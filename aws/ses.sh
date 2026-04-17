#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only): " BASE_NAME

# create the stack
aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-ses --template-body file://./ses.json --parameters ParameterKey=BaseName,ParameterValue=$BASE_NAME

# wait for completion
aws cloudformation wait stack-create-complete --stack-name ${BASE_NAME}-ses --output text

# output the access key id
echo "Access Key ID:"
aws cloudformation describe-stacks --stack-name ${BASE_NAME}-ses --query 'Stacks[0].Outputs[?OutputKey==`SESUserAccessKeyId`].OutputValue' --output text 

# output the secret access key
SECRET_ARN=`aws cloudformation describe-stacks --stack-name ${BASE_NAME}-ses --query 'Stacks[0].Outputs[?OutputKey==\`SESUserSecretAccessKeyARN\`].OutputValue' --output text`
echo "Secret Access Key:"
aws secretsmanager get-secret-value --query 'SecretString' --output text --secret-id $SECRET_ARN
