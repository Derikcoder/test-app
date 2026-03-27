# Certificate Inventory

Use this file to track business-relevant certificate metadata without storing private key material in git.

## Inventory Record

- Certificate File: certs/localhost+1.pem
- Purpose: Local HTTPS dev cert for Express and Vite
- Created By: derick
- Created On: 2026-03-25
- Expires On: 2028-06-25 09:42:27 GMT
- SHA256 Fingerprint: DD:65:84:82:88:C4:3B:8E:ED:BC:D5:BD:08:3D:CE:77:86:BD:D1:60:C1:3B:7A:33:DE:F5:E6:85:90:33:9F:65
- Last Verified On: 2026-03-25
- Status: Active
- Notes: Shared root cert path

## How To Update Metadata

1. Get certificate expiry date:
   openssl x509 -in certs/localhost+1.pem -noout -enddate

2. Get SHA256 fingerprint:
   openssl x509 -in certs/localhost+1.pem -noout -fingerprint -sha256

3. Update the inventory fields above after cert creation/rotation.
