import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create a cached connection variable
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

// Single connection promise
let clientPromise;

async function connectToDatabase() {
    if (!clientPromise) {
        const client = new MongoClient(process.env.MONGODB_URI, {
            maxPoolSize: 1, // Limit connection pool
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 5000
        });
        clientPromise = client.connect();
    }
    return clientPromise;
}

export default async function handler(req, res) {
    try {
        const path = req.url.split('?')[0];
        
        // Quick health check (no DB connection needed)
        if (req.method === 'GET' && path === '/health') {
            return res.json({ status: 'ok' });
        }

        const client = await connectToDatabase();
        const db = client.db('test');
        const collection = db.collection('words');

        // Rest of your endpoint handlers...
        switch (path) {
            case '/api/test-mongo':
                if (req.method === 'GET') {
                    const count = await collection.countDocuments();
                    return res.json({ status: 'success', documentCount: count });
                }
                break;
            // ... other cases remain the same ...
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}