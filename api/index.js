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

// Global promise for the database connection
let clientPromise;

// Initialize the connection
if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
}

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db('test');
        const collection = db.collection('words');

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Add timeout handling
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), 8000)
        );

        const path = req.url.split('?')[0];

        let operationPromise;
        if (req.method === 'GET' && path === '/api/words') {
            operationPromise = collection.find().toArray();
        } else if (req.method === 'POST' && path === '/api/word') {
            const { word } = req.body;
            operationPromise = collection.insertOne({
                word: word.toUpperCase(),
                date: new Date().toISOString().split('T')[0]
            });
        } else if (req.method === 'GET' && path === '/api/word/today') {
            const today = new Date().toISOString().split('T')[0];
            operationPromise = collection.findOne({ date: today });
        } else if (req.method === 'GET' && path === '/api/word/random') {
            operationPromise = collection.aggregate([{ $sample: { size: 1 } }]).toArray()
                .then(results => results[0] || { word: 'Ingen ord funnet' });
        } else {
            return res.status(404).json({ error: 'Not found' });
        }

        const result = await Promise.race([operationPromise, timeoutPromise]);
        return res.json(result);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: error.message,
            type: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}