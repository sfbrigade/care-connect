#!/bin/bash

read -p "Stack base name (lowercase, letters, numbers, hyphen only) [$1]: " BASE_NAME
BASE_NAME=${BASE_NAME:-$1}
read -p "Image URL [$2]: " IMAGE_URL
IMAGE_URL=${IMAGE_URL:-$2}
read -p "Environment [$3]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-$3}

set -a
source ./.env.$ENVIRONMENT
set +a

echo "ARRESTS_API_KEY: $ARRESTS_API_KEY"
echo "CAPACITY_API_KEY: $CAPACITY_API_KEY"
echo "EMAIL_FORMS_RECIPIENT_OVERRIDE: $EMAIL_FORMS_RECIPIENT_OVERRIDE"
echo "EMAIL_FROM_NAME: $EMAIL_FROM_NAME"
echo "EMAIL_SITE_TITLE: $EMAIL_SITE_TITLE"
echo "EMAIL_SUBJECT_TITLE: $EMAIL_SUBJECT_TITLE"
echo "GEOCODE_RATE_LIMIT_MS: $GEOCODE_RATE_LIMIT_MS"
echo "SESSION_SECRET: $SESSION_SECRET"
echo "AWS_SMS_ORIGINATION_NUMBER: $AWS_SMS_ORIGINATION_NUMBER"
echo "SMTP_REPLY_TO_EMAIL_ADDRESS: $SMTP_REPLY_TO_EMAIL_ADDRESS"
echo "VITE_POSTHOG_KEY: $VITE_POSTHOG_KEY"
echo "VITE_POSTHOG_HOST: $VITE_POSTHOG_HOST"
echo "VITE_SITE_TITLE: $VITE_SITE_TITLE"

read -p "Continue? [y/N]: " CONT
if [[ "$CONT" != "y" ]]; then
    exit 1
fi

aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM --stack-name ${BASE_NAME}-ecs --template-body file://./ecs.json --parameters ParameterKey=ArrestsApiKey,ParameterValue=$ARRESTS_API_KEY ParameterKey=BaseName,ParameterValue=$BASE_NAME ParameterKey=CapacityApiKey,ParameterValue=$CAPACITY_API_KEY "ParameterKey=EmailFormsRecipientOverride,ParameterValue=$EMAIL_FORMS_RECIPIENT_OVERRIDE" "ParameterKey=EmailFromName,ParameterValue=$EMAIL_FROM_NAME" "ParameterKey=EmailSiteTitle,ParameterValue=$EMAIL_SITE_TITLE" "ParameterKey=EmailSubjectTitle,ParameterValue=$EMAIL_SUBJECT_TITLE" ParameterKey=ImageURL,ParameterValue=$IMAGE_URL ParameterKey=SessionSecret,ParameterValue=$SESSION_SECRET ParameterKey=GeocodeRateLimitMs,ParameterValue=$GEOCODE_RATE_LIMIT_MS ParameterKey=SmtpReplyToEmailAddress,ParameterValue=$SMTP_REPLY_TO_EMAIL_ADDRESS ParameterKey=PosthogKey,ParameterValue=$VITE_POSTHOG_KEY ParameterKey=PosthogHost,ParameterValue=$VITE_POSTHOG_HOST "ParameterKey=SiteTitle,ParameterValue=$VITE_SITE_TITLE" "ParameterKey=SmsOriginationNumber,ParameterValue=$AWS_SMS_ORIGINATION_NUMBER" --output text
