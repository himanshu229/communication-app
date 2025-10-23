#!/bin/bash

# Create SSL certificates for development
echo "Creating SSL certificates for development..."

# Create certs directory
mkdir -p certs

# Generate private key
openssl genrsa -out certs/key.pem 2048

# Generate certificate signing request
openssl req -new -key certs/key.pem -out certs/csr.pem -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in certs/csr.pem -signkey certs/key.pem -out certs/cert.pem

# Clean up CSR
rm certs/csr.pem

echo "SSL certificates created in certs/ directory"
echo "cert.pem - Certificate file"
echo "key.pem - Private key file"