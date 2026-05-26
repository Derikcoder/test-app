#!/usr/bin/env bash
set -euo pipefail

cd '/home/derick/React Projects/test-app'

ADMIN_TOKEN=$(cat /tmp/uat_admin_token.txt)
TS=$(date +%s)
AGENT_EMAIL="uat.agent.${TS}@example.com"
CUSTOMER_EMAIL="uat.customer.${TS}@example.com"
NEW_CUSTOMER_PASS='CustomerNew!123'

post_json() {
  local method="$1"
  local url="$2"
  local token="$3"
  local body_file="$4"

  if [[ -n "$token" ]]; then
    curl -k -sS -X "$method" "$url" \
      -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' \
      --data @"$body_file"
  else
    curl -k -sS -X "$method" "$url" \
      -H 'Content-Type: application/json' \
      --data @"$body_file"
  fi
}

assert_not_null() {
  local value="$1"
  local label="$2"
  local payload="$3"
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "UAT step failed: ${label}"
    echo "$payload"
    exit 1
  fi
}

# 0) Create agent profile
cat > /tmp/uat_agent_create.json <<JSON
{
  "firstName": "Uat",
  "lastName": "Agent${TS}",
  "email": "${AGENT_EMAIL}",
  "phoneNumber": "+27110000002",
  "category": "Electrical",
  "skills": []
}
JSON
AGENT_RESP=$(post_json POST https://localhost:5000/api/agents "$ADMIN_TOKEN" /tmp/uat_agent_create.json)
AGENT_ID=$(echo "$AGENT_RESP" | jq -r '._id')
assert_not_null "$AGENT_ID" "create agent profile" "$AGENT_RESP"

# 0b) Provision agent login
cat > /tmp/uat_agent_provision.json <<JSON
{
  "role": "fieldServiceAgent",
  "profileId": "${AGENT_ID}",
  "userName": "uat_agent_${TS}",
  "email": "${AGENT_EMAIL}"
}
JSON
AGENT_PROVISION=$(post_json POST https://localhost:5000/api/auth/admin/provision-user "$ADMIN_TOKEN" /tmp/uat_agent_provision.json)
AGENT_TEMP_KEY=$(echo "$AGENT_PROVISION" | jq -r '.temporaryAccessKey')
assert_not_null "$AGENT_TEMP_KEY" "provision agent login" "$AGENT_PROVISION"

# 1) Create service call
cat > /tmp/uat_service_call_create.json <<JSON
{
  "assignedAgent": "${AGENT_ID}",
  "title": "UAT Service Call ${TS}",
  "description": "Generator service and diagnostics",
  "priority": "medium",
  "serviceType": "electrical",
  "bookingRequest": {
    "contact": {
      "customerType": "private",
      "contactPerson": "UAT Customer ${TS}",
      "contactEmail": "${CUSTOMER_EMAIL}",
      "contactPhone": "+27110000003"
    },
    "administrativeAddress": {
      "streetAddress": "12 Demo Street",
      "suburb": "Testville",
      "cityDistrict": "Cape Town",
      "province": "Western Cape",
      "postalCode": "8000"
    }
  }
}
JSON
SC_RESP=$(post_json POST https://localhost:5000/api/service-calls "$ADMIN_TOKEN" /tmp/uat_service_call_create.json)
SC_ID=$(echo "$SC_RESP" | jq -r '._id')
SC_NUMBER=$(echo "$SC_RESP" | jq -r '.callNumber')
assert_not_null "$SC_ID" "create service call" "$SC_RESP"

# 2) Create quote
cat > /tmp/uat_quote_create.json <<JSON
{
  "title": "UAT Quote ${TS}",
  "description": "Diagnostics + repair",
  "serviceType": "electrical",
  "lineItems": [
    {"description": "Inspection", "quantity": 1, "unitPrice": 1200, "total": 1200},
    {"description": "Minor repair", "quantity": 1, "unitPrice": 800, "total": 800}
  ],
  "labourHours": 2,
  "distanceTravelledKm": 20,
  "travelTimeMinutes": 20,
  "vatRate": 15
}
JSON
QUOTE_RESP=$(post_json POST "https://localhost:5000/api/quotations/from-service-call/${SC_ID}" "$ADMIN_TOKEN" /tmp/uat_quote_create.json)
QUOTE_ID=$(echo "$QUOTE_RESP" | jq -r '._id')
QUOTE_NUMBER=$(echo "$QUOTE_RESP" | jq -r '.quotationNumber')
assert_not_null "$QUOTE_ID" "create quotation from service call" "$QUOTE_RESP"

# 2b) Send quote by email
cat > /tmp/uat_quote_send.json <<JSON
{"channels": ["email"]}
JSON
QUOTE_SEND=$(post_json POST "https://localhost:5000/api/quotations/${QUOTE_ID}/send" "$ADMIN_TOKEN" /tmp/uat_quote_send.json)
QUOTE_SHARE_URL=$(echo "$QUOTE_SEND" | jq -r '.shareUrl')
QUOTE_TOKEN=$(echo "$QUOTE_SHARE_URL" | sed -E 's#^.*/share/([^/]+)/pdf$#\1#')
assert_not_null "$QUOTE_TOKEN" "send quotation" "$QUOTE_SEND"

# 3/4/6) Accept quote from share link token
cat > /tmp/uat_quote_accept.json <<JSON
{"rating": 5, "feedback": "Accepted during UAT"}
JSON
QUOTE_ACCEPT=$(post_json PATCH "https://localhost:5000/api/quotations/share/${QUOTE_TOKEN}/accept" "" /tmp/uat_quote_accept.json)
PORTAL_TEMP_KEY=$(echo "$QUOTE_ACCEPT" | jq -r '.portalUser.temporaryAccessKey')
PORTAL_USERNAME=$(echo "$QUOTE_ACCEPT" | jq -r '.portalUser.userName')
assert_not_null "$PORTAL_TEMP_KEY" "accept quotation via public token" "$QUOTE_ACCEPT"

# 5) Customer login with temporary key, then update profile + set new password
cat > /tmp/uat_customer_login_temp.json <<JSON
{"email": "${CUSTOMER_EMAIL}", "password": "${PORTAL_TEMP_KEY}"}
JSON
CUSTOMER_LOGIN=$(post_json POST https://localhost:5000/api/auth/login "" /tmp/uat_customer_login_temp.json)
CUSTOMER_TOKEN=$(echo "$CUSTOMER_LOGIN" | jq -r '.user.token')
assert_not_null "$CUSTOMER_TOKEN" "customer first login" "$CUSTOMER_LOGIN"

cat > /tmp/uat_customer_profile_update.json <<JSON
{"phoneNumber": "+27119999999", "physicalAddress": "34 Updated Address, Testville", "password": "${NEW_CUSTOMER_PASS}"}
JSON
CUSTOMER_PROFILE_UPDATE=$(post_json PUT https://localhost:5000/api/auth/profile "$CUSTOMER_TOKEN" /tmp/uat_customer_profile_update.json)

# 7) Agent login + create final invoice
cat > /tmp/uat_agent_login.json <<JSON
{"email": "${AGENT_EMAIL}", "password": "${AGENT_TEMP_KEY}"}
JSON
AGENT_LOGIN=$(post_json POST https://localhost:5000/api/auth/login "" /tmp/uat_agent_login.json)
AGENT_TOKEN=$(echo "$AGENT_LOGIN" | jq -r '.user.token')
assert_not_null "$AGENT_TOKEN" "agent login" "$AGENT_LOGIN"

cat > /tmp/uat_empty.json <<JSON
{}
JSON
INVOICE_CREATE=$(post_json POST "https://localhost:5000/api/invoices/from-service-call/${SC_ID}/final" "$AGENT_TOKEN" /tmp/uat_empty.json)
INVOICE_ID=$(echo "$INVOICE_CREATE" | jq -r '.invoice._id')
INVOICE_NUMBER=$(echo "$INVOICE_CREATE" | jq -r '.invoice.invoiceNumber')
assert_not_null "$INVOICE_ID" "create final invoice" "$INVOICE_CREATE"

# 7b) Submit/send invoice by admin owner account
cat > /tmp/uat_invoice_send.json <<JSON
{"channels": ["email"]}
JSON
INVOICE_SEND=$(post_json POST "https://localhost:5000/api/invoices/${INVOICE_ID}/send" "$ADMIN_TOKEN" /tmp/uat_invoice_send.json)

# 8) Customer pays invoice
cat > /tmp/uat_customer_login_new.json <<JSON
{"email": "${CUSTOMER_EMAIL}", "password": "${NEW_CUSTOMER_PASS}"}
JSON
CUSTOMER_LOGIN_NEW=$(post_json POST https://localhost:5000/api/auth/login "" /tmp/uat_customer_login_new.json)
CUSTOMER_TOKEN_NEW=$(echo "$CUSTOMER_LOGIN_NEW" | jq -r '.user.token')
assert_not_null "$CUSTOMER_TOKEN_NEW" "customer login with updated password" "$CUSTOMER_LOGIN_NEW"

CUSTOMER_INV_LIST=$(curl -k -sS https://localhost:5000/api/invoices -H "Authorization: Bearer $CUSTOMER_TOKEN_NEW")
CUSTOMER_INV_ID=$(echo "$CUSTOMER_INV_LIST" | jq -r '.[] | select(.invoiceNumber=="'"${INVOICE_NUMBER}"'") | ._id' | head -n1)
INVOICE_TOTAL=$(echo "$CUSTOMER_INV_LIST" | jq -r '.[] | select(.invoiceNumber=="'"${INVOICE_NUMBER}"'") | .totalAmount' | head -n1)
assert_not_null "$CUSTOMER_INV_ID" "load customer invoice list" "$CUSTOMER_INV_LIST"

cat > /tmp/uat_pay.json <<JSON
{"amount": ${INVOICE_TOTAL}, "method": "eft", "reference": "UAT-PAY-001", "notes": "UAT full settlement"}
JSON
PAY_RESP=$(post_json POST "https://localhost:5000/api/invoices/${CUSTOMER_INV_ID}/payment" "$CUSTOMER_TOKEN_NEW" /tmp/uat_pay.json)

# 9) Admin inspects state changes
SC_STATE=$(curl -k -sS "https://localhost:5000/api/service-calls/${SC_ID}" -H "Authorization: Bearer $ADMIN_TOKEN")
Q_STATE=$(curl -k -sS "https://localhost:5000/api/quotations/${QUOTE_ID}" -H "Authorization: Bearer $ADMIN_TOKEN")
I_STATE=$(curl -k -sS "https://localhost:5000/api/invoices/${INVOICE_ID}" -H "Authorization: Bearer $ADMIN_TOKEN")

# Persist raw response artifacts for troubleshooting
printf '%s' "$AGENT_RESP" > /tmp/uat_agent_resp.json
printf '%s' "$AGENT_PROVISION" > /tmp/uat_agent_provision_resp.json
printf '%s' "$SC_RESP" > /tmp/uat_sc_resp.json
printf '%s' "$QUOTE_RESP" > /tmp/uat_quote_resp.json
printf '%s' "$QUOTE_SEND" > /tmp/uat_quote_send_resp.json
printf '%s' "$QUOTE_ACCEPT" > /tmp/uat_quote_accept_resp.json
printf '%s' "$CUSTOMER_LOGIN" > /tmp/uat_customer_login_temp_resp.json
printf '%s' "$CUSTOMER_PROFILE_UPDATE" > /tmp/uat_customer_profile_update_resp.json
printf '%s' "$AGENT_LOGIN" > /tmp/uat_agent_login_resp.json
printf '%s' "$INVOICE_CREATE" > /tmp/uat_invoice_create_resp.json
printf '%s' "$INVOICE_SEND" > /tmp/uat_invoice_send_resp.json
printf '%s' "$CUSTOMER_LOGIN_NEW" > /tmp/uat_customer_login_new_resp.json
printf '%s' "$CUSTOMER_INV_LIST" > /tmp/uat_customer_invoice_list_resp.json
printf '%s' "$PAY_RESP" > /tmp/uat_payment_resp.json
printf '%s' "$SC_STATE" > /tmp/uat_sc_state_resp.json
printf '%s' "$Q_STATE" > /tmp/uat_q_state_resp.json
printf '%s' "$I_STATE" > /tmp/uat_i_state_resp.json

jq -n \
  --arg adminEmail "$(cat /tmp/uat_admin_email.txt)" \
  --arg agentEmail "$AGENT_EMAIL" \
  --arg customerEmail "$CUSTOMER_EMAIL" \
  --arg serviceCall "$SC_NUMBER" \
  --arg quotation "$QUOTE_NUMBER" \
  --arg invoice "$INVOICE_NUMBER" \
  --arg quoteShareUrl "$QUOTE_SHARE_URL" \
  --arg portalUser "$PORTAL_USERNAME" \
  --argjson quoteSend "$QUOTE_SEND" \
  --argjson quoteAccept "$QUOTE_ACCEPT" \
  --argjson invoiceSend "$INVOICE_SEND" \
  --argjson payResp "$PAY_RESP" \
  --argjson scState "$SC_STATE" \
  --argjson qState "$Q_STATE" \
  --argjson iState "$I_STATE" \
  '{
    actors:{adminEmail:$adminEmail,agentEmail:$agentEmail,customerEmail:$customerEmail,portalUser:$portalUser},
    entities:{serviceCall:$serviceCall,quotation:$quotation,invoice:$invoice,quoteShareUrl:$quoteShareUrl},
    checkpoints:{
      quoteSent:{emailSent:$quoteSend.emailSent,channels:$quoteSend.channels},
      quoteAccepted:{portalAccountCreated:$quoteAccept.portalAccountCreated,message:$quoteAccept.message},
      invoiceSent:{emailSent:$invoiceSend.emailSent,channels:$invoiceSend.channels,message:$invoiceSend.message},
      payment:{invoiceNumber:$payResp.invoiceNumber,paymentStatus:$payResp.paymentStatus,paidAmount:$payResp.paidAmount,balance:$payResp.balance,latestReceipt:($payResp.latestReceipt.receiptNumber // null)}
    },
    finalStates:{
      serviceCallStatus:$scState.status,
      quotationStatus:$qState.status,
      invoicePaymentStatus:$iState.paymentStatus,
      invoiceWorkflowStatus:$iState.workflowStatus
    }
  }' | tee /tmp/uat_flow_result.json
