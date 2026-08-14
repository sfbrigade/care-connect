#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only): " BASE_NAME

# create the stack
aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-sms --template-body file://./sms.json --parameters ParameterKey=BaseName,ParameterValue=$BASE_NAME

# wait for completion
aws cloudformation wait stack-create-complete --stack-name ${BASE_NAME}-sms --output text

# output the access key id
echo "Access Key ID:"
aws cloudformation describe-stacks --stack-name ${BASE_NAME}-sms --query 'Stacks[0].Outputs[?OutputKey==`SMSUserAccessKeyId`].OutputValue' --output text 

# output the secret access key
SECRET_ARN=`aws cloudformation describe-stacks --stack-name ${BASE_NAME}-sms --query 'Stacks[0].Outputs[?OutputKey==\`SMSUserSecretAccessKeyARN\`].OutputValue' --output text`
echo "Secret Access Key:"
aws secretsmanager get-secret-value --query 'SecretString' --output text --secret-id $SECRET_ARN
