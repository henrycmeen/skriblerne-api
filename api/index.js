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

export default async function handler(req, res) {
    try {
        const client = await connectToDatabase();
        const db = client.db('ordbank');
        const collection = db.collection('words');

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const path = req.url.split('?')[0];

        // Rest of your route handlers remain the same
        if (req.method === 'GET' && path === '/api/words') {
            const words = await collection.find().toArray();
            return res.json(words);
        }

        if (req.method === 'POST' && path === '/api/word') {
            const { word } = req.body;
            const result = await collection.insertOne({
                word: word.toUpperCase(),
                date: new Date().toISOString().split('T')[0]
            });
            return res.json(result);
        }

        if (req.method === 'GET' && path === '/api/word/today') {
            const today = new Date().toISOString().split('T')[0];
            const word = await collection.findOne({ date: today });
            return res.json(word || { word: 'Ingen ord i dag' });
        }

        if (req.method === 'GET' && path === '/api/word/random') {
            const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
            return res.json(words[0] || { word: 'Ingen ord funnet' });
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
    // Remove client.close() as we're now caching the connection
}