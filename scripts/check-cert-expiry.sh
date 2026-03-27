#!/usr/bin/env bash

set -euo pipefail

CERT_DIR="${1:-certs}"
WARN_DAYS="${CERT_WARN_DAYS:-30}"
WARN_SECONDS=$((WARN_DAYS * 24 * 60 * 60))

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl is required but not installed."
  exit 1
fi

if [[ ! -d "$CERT_DIR" ]]; then
  echo "ERROR: certificate directory not found: $CERT_DIR"
  exit 1
fi

shopt -s nullglob
cert_files=("$CERT_DIR"/*.pem)

if [[ ${#cert_files[@]} -eq 0 ]]; then
  echo "No .pem certificate files found in $CERT_DIR"
  exit 0
fi

exit_code=0
processed=0

echo "Checking certificate expiry in $CERT_DIR (warning threshold: $WARN_DAYS days)"

for cert in "${cert_files[@]}"; do
  if [[ "$cert" == *-key.pem ]]; then
    continue
  fi

  if ! openssl x509 -in "$cert" -noout >/dev/null 2>&1; then
    echo "SKIP: $cert is not a valid X.509 certificate"
    continue
  fi

  processed=$((processed + 1))
  end_date="$(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2-)"
  fingerprint="$(openssl x509 -in "$cert" -noout -fingerprint -sha256 | cut -d= -f2-)"

  if openssl x509 -in "$cert" -noout -checkend "$WARN_SECONDS" >/dev/null 2>&1; then
    status="OK"
  else
    status="EXPIRING_SOON_OR_EXPIRED"
    exit_code=1
  fi

  echo "- $cert"
  echo "  Status: $status"
  echo "  Expires: $end_date"
  echo "  SHA256: $fingerprint"

done

if [[ $processed -eq 0 ]]; then
  echo "No valid certificate files processed in $CERT_DIR"
fi

exit "$exit_code"
