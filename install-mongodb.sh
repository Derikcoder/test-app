#!/usr/bin/env bash

set -euo pipefail

echo "MongoDB Installation Script"
echo "==========================="
echo

if [[ "${EUID}" -eq 0 ]]; then
    SUDO=""
else
    if ! command -v sudo >/dev/null 2>&1; then
        echo "Error: sudo is required to install MongoDB packages."
        exit 1
    fi
    SUDO="sudo"
fi

# Detect OS metadata.
if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
else
    echo "Error: cannot detect operating system (/etc/os-release missing)."
    exit 1
fi

echo "Detected OS: ${NAME} ${VERSION_ID:-unknown} (${VERSION_CODENAME:-unknown})"
echo

if command -v mongod >/dev/null 2>&1; then
    echo "MongoDB server already installed."
    mongod --version | head -n 1
    echo
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl list-unit-files 2>/dev/null | grep -q '^mongod\.service'; then
            echo "Service unit found: mongod.service"
            echo "Start with: sudo systemctl start mongod"
        else
            echo "No mongod.service unit found. You can still run user-mode mongod from start-dev.sh."
        fi
    fi
    exit 0
fi

if [[ "${ID}" != "ubuntu" && "${ID}" != "debian" ]]; then
    echo "Unsupported OS for this helper: ${NAME}"
    echo "Please install MongoDB manually: https://www.mongodb.com/docs/manual/installation/"
    exit 1
fi

echo "Installing MongoDB Community Server..."

${SUDO} apt-get update
${SUDO} apt-get install -y curl gnupg ca-certificates

# Add MongoDB official key and apt source (8.0).
if [[ ! -f /usr/share/keyrings/mongodb-server-8.0.gpg ]]; then
    curl -fsSL https://pgp.mongodb.com/server-8.0.asc | ${SUDO} gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
fi

if [[ -z "${VERSION_CODENAME:-}" ]]; then
    echo "Error: VERSION_CODENAME is empty; cannot configure apt source."
    exit 1
fi

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/${ID} ${VERSION_CODENAME}/mongodb-org/8.0 multiverse" | ${SUDO} tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null

${SUDO} apt-get update
${SUDO} apt-get install -y mongodb-org

echo
echo "MongoDB installed successfully."

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^mongod\.service'; then
    echo "Enabling and starting mongod.service..."
    ${SUDO} systemctl enable mongod
    ${SUDO} systemctl start mongod
    ${SUDO} systemctl status mongod --no-pager || true
else
    echo "No systemd service detected. start-dev.sh can run mongod in user mode."
fi

echo
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. If needed, verify DB with: mongosh --eval 'db.runCommand({ ping: 1 })'"
