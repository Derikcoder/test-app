# Local Development Certificates

Manual navigation shortcut:

- For the full local HTTPS + Postman testing path, use [../user-manual/setup/postman-local-https-runbook.md](../user-manual/setup/postman-local-https-runbook.md)

This folder stores shared local TLS certificates used by both:

- Backend (Express HTTPS server)
- Frontend (Vite HTTPS dev server)

## Expected Files

- `localhost+1.pem`
- `localhost+1-key.pem`

These names are referenced by default in env files:

- `server/.env` and `server/.env.example`
- `client/.env` and `client/.env.example`

Policy:

- Keep the actual certificate and key files local on each machine
- Configure their locations through environment variables only
- Do not commit raw `.pem`, `.key`, `.p12`, or `.pfx` files to git
- Track only process documentation and certificate inventory metadata in this folder

This is part of the repository-wide Development Rule for secret handling described in `README.md` and `SECURITY.md`.

## Quick Generate (mkcert)

If you use `mkcert`, run this from the repository root:

```bash
mkcert -install
mkcert -key-file certs/localhost+1-key.pem -cert-file certs/localhost+1.pem localhost 127.0.0.1 ::1
```

## If You Already Have Certs

Copy or move your existing local certs into this folder and rename to match:

- `certs/localhost+1.pem`
- `certs/localhost+1-key.pem`

## Notes

- Repository policy (current): do not track raw certificate/key files in git.
- Track process and business-relevant metadata in `certs/CERTIFICATE_INVENTORY.md`.
- Run `npm run certs:check` to check expiry status and fingerprints.
- Do not use local self-signed certificates in production.
- If you use different filenames or paths, update these env vars accordingly:
- Update: `SSL_CERT_FILE`, `SSL_KEY_FILE`
- Update: `VITE_SSL_CERT_FILE`, `VITE_SSL_KEY_FILE`
