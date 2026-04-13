#!/usr/bin/env bash
#
# Upload the custom vocabulary file to S3 and create/update the AWS Transcribe
# vocabulary. The vocabulary improves transcription accuracy for domain-specific
# terms (law enforcement, drugs, SF streets, medical abbreviations).
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - IAM permissions: s3:PutObject, transcribe:CreateVocabulary,
#     transcribe:UpdateVocabulary, transcribe:GetVocabulary
#
# Usage:
#   ./scripts/update-transcribe-vocabulary.sh
#
# Environment variables (reads from server/.env if present):
#   AWS_TRANSCRIBE_ACCESS_KEY_ID     - IAM access key
#   AWS_TRANSCRIBE_SECRET_ACCESS_KEY - IAM secret key
#   AWS_TRANSCRIBE_REGION            - AWS region (default: us-west-2)
#   AWS_TRANSCRIBE_VOCABULARY_NAME   - Vocabulary name (default: care-connect-vocabulary)
#   AWS_S3_BUCKET                    - S3 bucket for vocabulary file upload
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VOCAB_FILE="$ROOT_DIR/server/static-data/transcribe-vocabulary.txt"
ENV_FILE="$ROOT_DIR/server/.env"

# Load env vars from server/.env if it exists
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Configuration
REGION="${AWS_TRANSCRIBE_REGION:-us-west-2}"
VOCAB_NAME="${AWS_TRANSCRIBE_VOCABULARY_NAME:-care-connect-vocabulary}"
S3_BUCKET="${AWS_S3_BUCKET:?AWS_S3_BUCKET is required}"
S3_KEY="transcribe-vocabulary/${VOCAB_NAME}.txt"
S3_URI="s3://${S3_BUCKET}/${S3_KEY}"

# Use Transcribe-specific credentials if available, otherwise fall back to default AWS config
if [ -n "${AWS_TRANSCRIBE_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_TRANSCRIBE_SECRET_ACCESS_KEY:-}" ]; then
  export AWS_ACCESS_KEY_ID="$AWS_TRANSCRIBE_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$AWS_TRANSCRIBE_SECRET_ACCESS_KEY"
fi

if [ ! -f "$VOCAB_FILE" ]; then
  echo "Error: Vocabulary file not found at $VOCAB_FILE"
  exit 1
fi

# Strip comment lines (starting with #) before uploading
CLEAN_FILE=$(mktemp)
trap 'rm -f "$CLEAN_FILE"' EXIT
grep -v '^#' "$VOCAB_FILE" > "$CLEAN_FILE"

echo "Uploading vocabulary file to $S3_URI..."
aws s3 cp "$CLEAN_FILE" "$S3_URI" --region "$REGION" --quiet
echo "Upload complete."

# Check if vocabulary already exists
echo "Checking if vocabulary '$VOCAB_NAME' exists..."
VOCAB_STATUS=$(aws transcribe get-vocabulary \
  --vocabulary-name "$VOCAB_NAME" \
  --region "$REGION" \
  --query 'VocabularyState' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$VOCAB_STATUS" = "NOT_FOUND" ]; then
  echo "Creating vocabulary '$VOCAB_NAME'..."
  aws transcribe create-vocabulary \
    --vocabulary-name "$VOCAB_NAME" \
    --language-code en-US \
    --vocabulary-file-uri "$S3_URI" \
    --region "$REGION" \
    --output text --query 'VocabularyState'
else
  echo "Updating vocabulary '$VOCAB_NAME' (current status: $VOCAB_STATUS)..."
  aws transcribe update-vocabulary \
    --vocabulary-name "$VOCAB_NAME" \
    --language-code en-US \
    --vocabulary-file-uri "$S3_URI" \
    --region "$REGION" \
    --output text --query 'VocabularyState'
fi

# Wait for vocabulary to become READY
echo "Waiting for vocabulary to become READY..."
while true; do
  STATUS=$(aws transcribe get-vocabulary \
    --vocabulary-name "$VOCAB_NAME" \
    --region "$REGION" \
    --query 'VocabularyState' \
    --output text)

  case "$STATUS" in
    READY)
      echo "Vocabulary '$VOCAB_NAME' is READY."
      exit 0
      ;;
    FAILED)
      echo "Error: Vocabulary creation/update FAILED."
      aws transcribe get-vocabulary \
        --vocabulary-name "$VOCAB_NAME" \
        --region "$REGION" \
        --query 'FailureReason' \
        --output text
      exit 1
      ;;
    PENDING)
      printf "."
      sleep 5
      ;;
    *)
      echo "Unexpected status: $STATUS"
      sleep 5
      ;;
  esac
done
