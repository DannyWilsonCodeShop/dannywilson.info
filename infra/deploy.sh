#!/bin/bash
set -e

REGION="us-east-1"
STACK_NAME="FamilyChoresBackend"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/template.yaml" \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --no-fail-on-empty-changeset

echo ""
echo "📋 Getting stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs')
echo "$OUTPUTS" | python3 -c "
import json, sys
outputs = json.load(sys.stdin)
for o in outputs:
    print(f\"  {o['OutputKey']}: {o['OutputValue']}\")
"

echo ""
echo "📦 Packaging and updating Lambda functions..."

# Package dailySms
cd "$SCRIPT_DIR/lambda"
cp dailySms.mjs index.mjs
zip -q dailySms.zip index.mjs
aws lambda update-function-code \
  --function-name FamilyChores-DailySms \
  --zip-file fileb://dailySms.zip \
  --region "$REGION" > /dev/null
aws lambda update-function-configuration \
  --function-name FamilyChores-DailySms \
  --handler index.handler \
  --runtime nodejs20.x \
  --region "$REGION" > /dev/null 2>&1 || true
rm index.mjs dailySms.zip
echo "  ✅ DailySms updated"

# Package completion
cp completion.mjs index.mjs
zip -q completion.zip index.mjs
aws lambda update-function-code \
  --function-name FamilyChores-Completion \
  --zip-file fileb://completion.zip \
  --region "$REGION" > /dev/null
aws lambda update-function-configuration \
  --function-name FamilyChores-Completion \
  --handler index.handler \
  --runtime nodejs20.x \
  --region "$REGION" > /dev/null 2>&1 || true
rm index.mjs completion.zip
echo "  ✅ Completion updated"

# Package points
cp points.mjs index.mjs
zip -q points.zip index.mjs
aws lambda update-function-code \
  --function-name FamilyChores-Points \
  --zip-file fileb://points.zip \
  --region "$REGION" > /dev/null
aws lambda update-function-configuration \
  --function-name FamilyChores-Points \
  --handler index.handler \
  --runtime nodejs20.x \
  --region "$REGION" > /dev/null 2>&1 || true
rm index.mjs points.zip
echo "  ✅ Points updated"

echo ""
echo "👤 Creating Cognito users..."
USER_POOL_ID=$(echo "$OUTPUTS" | python3 -c "import json,sys; print([o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='UserPoolId'][0])")

create_user() {
  local name=$1
  local phone=$2
  local password=$3
  
  # Check if user exists first
  if aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$name" --region "$REGION" 2>/dev/null; then
    echo "  User $name already exists"
  else
    aws cognito-idp admin-create-user \
      --user-pool-id "$USER_POOL_ID" \
      --username "$name" \
      --user-attributes Name=phone_number,Value="$phone" Name=phone_number_verified,Value=true Name=name,Value="$name" \
      --temporary-password "Chores1" \
      --message-action SUPPRESS \
      --region "$REGION" > /dev/null
    
    # Set permanent password
    aws cognito-idp admin-set-user-password \
      --user-pool-id "$USER_POOL_ID" \
      --username "$name" \
      --password "$password" \
      --permanent \
      --region "$REGION" > /dev/null
    
    echo "  ✅ Created user: $name ($phone)"
  fi
}

create_user "Danny" "+14048037330" "danny1"
create_user "Courtnee" "+14048037877" "courtnee1"
create_user "Olivia" "+14708333224" "olivia1"
create_user "Shane" "+16789842089" "shane1"
create_user "Austin" "+14044932795" "austin1"

echo ""
echo "📧 Verifying SES email identity..."
aws ses verify-email-identity --email-address "dwilson1919@gmail.com" --region "$REGION" 2>/dev/null || true
echo "  ⚠️  Check dwilson1919@gmail.com for a verification email from AWS and click the link!"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔑 User Credentials (username / password):"
echo "  Danny:    Danny / danny1"
echo "  Courtnee: Courtnee / courtnee1"
echo "  Olivia:   Olivia / olivia1"
echo "  Shane:    Shane / shane1"
echo "  Austin:   Austin / austin1"
echo ""

API_ENDPOINT=$(echo "$OUTPUTS" | python3 -c "import json,sys; print([o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='ApiEndpoint'][0])")
CLIENT_ID=$(echo "$OUTPUTS" | python3 -c "import json,sys; print([o['OutputValue'] for o in json.load(sys.stdin) if o['OutputKey']=='UserPoolClientId'][0])")

echo "🌐 Frontend Config (update in chores.html):"
echo "  API_ENDPOINT: $API_ENDPOINT"
echo "  USER_POOL_ID: $USER_POOL_ID"
echo "  CLIENT_ID: $CLIENT_ID"
echo "  REGION: $REGION"
