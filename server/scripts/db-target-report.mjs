import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const DEFAULT_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/test-app';

const args = process.argv.slice(2);
const targetArgIndex = args.findIndex((arg) => arg === '--target');
const target = targetArgIndex >= 0 ? args[targetArgIndex + 1] : 'local';

if (!['local', 'atlas'].includes(target)) {
  console.error('Usage: node server/scripts/db-target-report.mjs --target <local|atlas>');
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

const collectionNames = [
  'users',
  'fieldserviceagents',
  'customers',
  'servicecalls',
  'quotations',
  'invoices',
  'machines',
];

const run = async () => {
  await mongoose.connect(selectedUri, { serverSelectionTimeoutMS: 10000 });

  const db = mongoose.connection.db;
  const counts = {};
  for (const name of collectionNames) {
    counts[name] = await db.collection(name).countDocuments({});
  }

  const superAdmins = await db.collection('users').find(
    { role: 'superAdmin' },
    { projection: { _id: 1, userName: 1, email: 1, createdAt: 1 } }
  ).sort({ createdAt: 1 }).toArray();

  const ownership = {};
  for (const admin of superAdmins) {
    ownership[String(admin._id)] = {
      userName: admin.userName,
      email: admin.email,
      agents: await db.collection('fieldserviceagents').countDocuments({ createdBy: admin._id }),
      customers: await db.collection('customers').countDocuments({ createdBy: admin._id }),
      servicecalls: await db.collection('servicecalls').countDocuments({ createdBy: admin._id }),
      quotations: await db.collection('quotations').countDocuments({ createdBy: admin._id }),
      invoices: await db.collection('invoices').countDocuments({ createdBy: admin._id }),
      machines: await db.collection('machines').countDocuments({ createdBy: admin._id }),
    };
  }

  const report = {
    target,
    connectedHost: mongoose.connection.host,
    dbName: db.databaseName,
    counts,
    superAdminCount: superAdmins.length,
    superAdmins,
    ownership,
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`DB target report failed: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
