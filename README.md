# Test App - MERN Stack

A full-stack web application built with React, Tailwind CSS, Node.js, Express, and MongoDB.

## Project Structure

```
test-app/
├── client/          # React frontend with Tailwind CSS
│   ├── src/
│   ├── public/
│   └── package.json
├── server/          # Express backend with MongoDB
│   ├── config/
│   ├── models/
│   ├── routes/
│   └── package.json
└── README.md
```

## Technologies Used

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd test-app
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   
   Create a `.env` file in the `server` directory:
   ```bash
   cd ../server
   cp .env.example .env
   ```
   
   Edit `.env` and configure your MongoDB connection:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/test-app
   NODE_ENV=development
   ```

### Running the Application

#### Development Mode

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server will run on http://localhost:5000

2. **Start the frontend** (in a new terminal)
   ```bash
   cd client
   npm run dev
   ```
   Client will run on http://localhost:3000

#### Production Mode

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Start the server**
   ```bash
   cd server
   npm start
   ```

## API Endpoints

- `GET /api` - Welcome message
- `GET /api/health` - Health check

## Features

- ✅ React with Vite for fast development
- ✅ Tailwind CSS for styling
- ✅ Express REST API
- ✅ MongoDB integration with Mongoose
- ✅ CORS enabled
- ✅ Environment variable configuration
- ✅ Hot module replacement (HMR)
- ✅ Proxy configuration for API calls

## Development Tips

- The client is configured to proxy API requests to `http://localhost:5000`
- Use `npm run dev` in both client and server directories for development
- MongoDB must be running before starting the server
- Check `.env.example` for required environment variables

## Project Commands

### Client
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server
```bash
npm start        # Start server
npm run dev      # Start with nodemon (auto-reload)
```

## License

ISC
