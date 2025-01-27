import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Single connection promise with optimized settings
// Single connection promise
let clientPromise;

async function connectToDatabase() {
    try {
        if (!clientPromise) {
            console.log('Creating new MongoDB client...');
            if (!process.env.MONGODB_URI) {
                throw new Error('MONGODB_URI is not defined');
            }
            const client = new MongoClient(process.env.MONGODB_URI, {
                maxPoolSize: 1,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000
            });
            clientPromise = client.connect();
        }
        const client = await clientPromise;
        console.log('MongoDB connection successful');
        return client;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    console.log('Request received:', {
        method: req.method,
        path: req.url
    });
    
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const path = req.url.split('?')[0];

        // Root path handler
        if (path === '/' || path === '') {
            return res.json({ status: 'API is running' });
        }

        // Health check endpoint
        if (path === '/health') {
            return res.json({ status: 'ok' });
        }

        const client = await connectToDatabase();
        const db = client.db('test');
        const collection = db.collection('words');

        switch (path) {
            case '/api/test-mongo':
                if (req.method === 'GET') {
                    const count = await collection.countDocuments();
                    return res.json({ status: 'success', documentCount: count });
                }
                break;

            case '/api/words':
                if (req.method === 'GET') {
                    const words = await collection.find().toArray();
                    return res.json(words);
                }
                break;

            case '/api/word':
                if (req.method === 'POST') {
                    const { word } = req.body;
                    const result = await collection.insertOne({
                        word: word.toUpperCase(),
                        date: new Date().toISOString().split('T')[0]
                    });
                    return res.json(result);
                }
                break;

            case '/api/word/today':
                if (req.method === 'GET') {
                    const today = new Date().toISOString().split('T')[0];
                    const word = await collection.findOne({ date: today });
                    return res.json(word || { word: 'Ingen ord i dag' });
                }
                break;

            case '/api/word/random':
                if (req.method === 'GET') {
                    const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
                    return res.json(words[0] || { word: 'Ingen ord funnet' });
                }
                break;
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}