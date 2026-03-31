// mongodbExample.js
// Minimal MongoDB Atlas example for Node.js
// App type: User Profile
//
// 1. Reads MONGODB_URI from environment or config file
// 2. Connects to MongoDB Atlas
// 3. Inserts 10 user profile documents with timestamps
// 4. Reads and prints 5 most recent profiles
// 5. Reads and prints one profile by _id
// 6. Closes the connection
//
// Usage:
//   1. Install dependencies: npm install mongodb dotenv
//   2. Set MONGODB_URI in .env or config.json
//   3. Run: node mongodbExample.js

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

// Try to get MongoDB URI from environment, else fallback to config.json
const uri = process.env.MONGODB_URI || (() => {
  try {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    return config.MONGODB_URI;
  } catch {
    return undefined;
  }
})();

if (!uri) {
  console.error('❌ No MongoDB URI found. Set MONGODB_URI in .env or config.json');
  process.exit(1);
}

// Use a realistic database and collection name for user profiles
const dbName = 'testApp';
const collectionName = 'userProfiles';

async function main() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected!');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Insert 10 user profiles with different timestamps
    const now = Date.now();
    const users = Array.from({ length: 10 }, (_, i) => ({
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      fullName: `User ${i + 1} Example`,
      createdAt: new Date(now - i * 1000 * 60 * 60), // Each user 1 hour apart
      bio: `This is user ${i + 1}'s profile.`
    }));
    const insertResult = await collection.insertMany(users);
    console.log(`Inserted ${insertResult.insertedCount} user profiles.`);

    // Find 5 most recent profiles by createdAt
    console.log('\n5 most recent user profiles:');
    const recent = await collection.find().sort({ createdAt: -1 }).limit(5).toArray();
    recent.forEach((doc, idx) => {
      console.log(`\nProfile #${idx + 1}:`, doc);
    });

    // Find one profile by _id
    const oneId = recent[0]._id;
    console.log(`\nFetching profile by _id: ${oneId}`);
    const oneProfile = await collection.findOne({ _id: oneId });
    console.log('Found profile:', oneProfile);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

main();

// ---
// Install and run:
// npm install mongodb dotenv
// node mongodbExample.js
//
// Set your MongoDB URI in a .env file:
// MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=testApp
// Or in config.json: { "MONGODB_URI": "mongodb+srv://..." }
