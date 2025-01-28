# Skriblerne API

Backend API for the Skriblerne application, providing word management and retrieval services.

## Overview
This is a serverless API built with Express.js and MongoDB, deployed on Vercel.

## Tech Stack
- Node.js
- Express.js
- MongoDB Atlas
- Vercel for hosting

## API Endpoints
- `GET /api/word/today` - Get today's word
- `GET /api/word/random` - Get a random word
- `GET /api/words` - Get all words
- `POST /api/word` - Add a new word

## Setup
1. Clone the repository
```bash
git clone https://github.com/henrycmeen/skriblerne-api.git
2. Install dependencies
npm install
3. Create .env file with:
MONGODB_URI=your_mongodb_connection_string
PORT=3001

skriblerne-api/
├── api/
│   └── index.js    # Main API logic
├── vercel.json     # Vercel configuration
└── package.json    # Dependencies and scripts


After creating these files, commit them to their respective repositories:

```bash
# For main project
cd /Users/henmee/Documents/GitHub/Skriblerne
git add README.md
git commit -m "Add README documentation"
git push origin main

# For API project
cd /Users/henmee/Documents/GitHub/skriblerne-api
git add README.md
git commit -m "Add README documentation"
git push origin main