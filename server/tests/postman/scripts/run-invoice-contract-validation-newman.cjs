#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../../../..');
const postmanRoot = path.resolve(__dirname, '..');
const snippetsDir = path.join(postmanRoot, 'test-scripts', 'snippets');
const tagsPath = path.join(snippetsDir, 'tags.invoice-contract-validation.json');
const tempCollectionPath = path.join(os.tmpdir(), 'newman.invoice-contract-validation.collection.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  console.error('[invoice-contract-validation] ' + message);
  process.exit(1);
}

function getSnippetExecLines(fileName) {
  const snippetPath = path.join(snippetsDir, fileName);

  if (!fs.existsSync(snippetPath)) {
    fail('Tagged snippet file not found: ' + snippetPath);
  }

  const snippetText = fs.readFileSync(snippetPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = snippetText.split('\n');

  return ['// BEGIN ' + fileName, ...lines, '// END ' + fileName];
}

const authToken = process.env.AUTH_TOKEN;
const serviceCallId = process.env.SERVICE_CALL_ID;

if (!authToken) {
  fail('Missing AUTH_TOKEN. Example: AUTH_TOKEN="<jwt>" npm run test:postman:invoice-contract');
}

if (!serviceCallId) {
  fail('Missing SERVICE_CALL_ID. Example: SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract');
}

const baseUrl = process.env.BASE_URL || 'https://localhost:5000';

const tagConfig = readJson(tagsPath);
const taggedSnippets = Array.isArray(tagConfig.snippets) ? tagConfig.snippets : [];

if (taggedSnippets.length === 0) {
  fail('No tagged snippets found in ' + tagsPath);
}

const schemaV1Path = path.join(repoRoot, 'invoice.schema.v1.json');
const schemaV11Path = path.join(repoRoot, 'invoice.schema.v1.1.json');

if (!fs.existsSync(schemaV1Path) || !fs.existsSync(schemaV11Path)) {
  fail('Invoice schema files are missing at repo root.');
}

const invoiceSchemaV1 = JSON.stringify(readJson(schemaV1Path));
const invoiceSchemaV11 = JSON.stringify(readJson(schemaV11Path));

const execLines = taggedSnippets.flatMap(getSnippetExecLines);

const collection = {
  info: {
    name: 'Invoice Contract Validation (Tagged Snippets)',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'INVOICE_SCHEMA_V1', value: invoiceSchemaV1 },
    { key: 'INVOICE_SCHEMA_V1_1', value: invoiceSchemaV11 }
  ],
  item: [
    {
      name: 'Invoice Pro-Forma Contract Validation',
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: execLines
          }
        }
      ],
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{AUTH_TOKEN}}' }
        ],
        body: {
          mode: 'raw',
          raw: '{}'
        },
        url: {
          raw: '{{BASE_URL}}/api/invoices/from-service-call/{{SERVICE_CALL_ID}}/pro-forma',
          host: ['{{BASE_URL}}'],
          path: ['api', 'invoices', 'from-service-call', '{{SERVICE_CALL_ID}}', 'pro-forma']
        },
        description: 'Runs only invoice contract-validation snippets tagged in snippets/tags.invoice-contract-validation.json'
      }
    }
  ]
};

fs.writeFileSync(tempCollectionPath, JSON.stringify(collection, null, 2) + '\n', 'utf8');

const additionalArgs = process.argv.slice(2);
const args = [
  'newman',
  'run',
  tempCollectionPath,
  '--insecure',
  '--env-var',
  'BASE_URL=' + baseUrl,
  '--env-var',
  'AUTH_TOKEN=' + authToken,
  '--env-var',
  'SERVICE_CALL_ID=' + serviceCallId,
  ...additionalArgs
];

const result = spawnSync('npx', args, { stdio: 'inherit' });

if (result.error) {
  fail('Failed to launch Newman: ' + result.error.message);
}

process.exit(result.status || 1);
