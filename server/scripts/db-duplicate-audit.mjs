import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const DEFAULT_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/test-app';

const args = process.argv.slice(2);
const targetArgIndex = args.findIndex((arg) => arg === '--target');
const target = targetArgIndex >= 0 ? args[targetArgIndex + 1] : 'local';

if (!['local', 'atlas'].includes(target)) {
  console.error('Usage: node server/scripts/db-duplicate-audit.mjs --target <local|atlas>');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const localUri = process.env.MONGODB_LOCAL_URI || DEFAULT_LOCAL_MONGO_URI;
const atlasUri = process.env.MONGODB_URI;
const selectedUri = target === 'local' ? localUri : atlasUri;

if (!selectedUri) {
  console.error(`Missing URI for target=${target}.`);
  process.exit(1);
}

const duplicateChecks = [
  { collection: 'users', fields: ['email'] },
  { collection: 'users', fields: ['userName'] },
  { collection: 'fieldserviceagents', fields: ['email'] },
  { collection: 'fieldserviceagents', fields: ['employeeId'] },
  { collection: 'customers', fields: ['email'] },
  { collection: 'customers', fields: ['customerId'] },
  { collection: 'servicecalls', fields: ['callNumber'] },
  { collection: 'quotations', fields: ['quotationNumber'] },
  { collection: 'invoices', fields: ['invoiceNumber'] },
  {
    collection: 'machines',
    fields: ['serviceCategory', 'machineType', 'generatorMakeModel', 'machineModelNumber', 'siteName'],
    requireAllFields: true,
  },
];

const buildPipeline = ({ fields, requireAllFields }) => {
  const match = {};
  for (const field of fields) {
    if (requireAllFields) {
      match[field] = { $exists: true, $nin: [null, ''] };
    } else {
      match[field] = { $exists: true, $nin: [null, ''] };
    }
  }

  const groupId = {};
  for (const field of fields) {
    groupId[field] = `$${field}`;
  }

  return [
    { $match: match },
    {
      $group: {
        _id: groupId,
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ];
};

const run = async () => {
  await mongoose.connect(selectedUri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  const findings = [];
  for (const check of duplicateChecks) {
    const pipeline = buildPipeline(check);
    const duplicates = await db.collection(check.collection).aggregate(pipeline).toArray();
    if (duplicates.length > 0) {
      findings.push({
        collection: check.collection,
        fields: check.fields,
        duplicateGroups: duplicates.length,
        samples: duplicates,
      });
    }
  }

  const report = {
    target,
    connectedHost: mongoose.connection.host,
    dbName: db.databaseName,
    duplicateFindings: findings,
    duplicateCheckCount: duplicateChecks.length,
    hasDuplicates: findings.length > 0,
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`DB duplicate audit failed: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
