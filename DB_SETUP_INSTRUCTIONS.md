# MongoDB Atlas Database Setup Instructions

This guide will help you set up a MongoDB Atlas database and connect your application securely.

## 1. Create a MongoDB Atlas Account
- Go to https://www.mongodb.com/cloud/atlas
- Sign up or log in with your credentials

## 2. Create a Cluster
- Click "Build a Cluster" and follow the prompts
- Choose a free or paid tier as needed

## 3. Create an Admin Database User
- In the Atlas dashboard, go to "Database Access"
- Click "Add New Database User"
- Set a username and strong password (save these securely)
- Assign the user the "Atlas Admin" role or custom roles as needed

## 4. Configure Network Access
- Go to "Network Access"
- Click "Add IP Address"
- Add your current IP or 0.0.0.0/0 for development (not recommended for production)

## 5. Get Your Connection String
- In "Clusters", click "Connect" > "Connect your application"
- Copy the connection string (starts with `mongodb+srv://`)
- Replace `<username>` and `<password>` with your admin user credentials

## 6. Configure Your Environment Variables
- Copy `.env.sample` to `.env` in your project root
- Paste your connection string as the value for `MONGODB_URI`
- Example:
  ```env
  MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=testApp
  ```
- Never commit your real `.env` file to version control!

## 7. Test Your Connection
- Run your application or use the provided test script to verify the connection

---
For more details, see the README.md or ask your project maintainer.
