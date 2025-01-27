import express from 'express';
import { MongoClient } from 'mongodb';

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
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            clientPromise = client.connect().catch(err => {
                console.error('Failed to connect:', err);
                clientPromise = null;
                throw err;
            });
        }
        const client = await clientPromise;
        console.log('MongoDB connection successful');
        return client;
    } catch (error) {
        console.error('Detailed MongoDB connection error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

export default async function handler(req, res) {
    // Set a longer timeout for the response
    res.setTimeout(30000); // 30 seconds

    // Early return for favicon requests
    if (req.url.includes('favicon')) {
        return res.status(204).end();
    }

    // Enable CORS - Updated with specific origin
    res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

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

        // Handle non-database routes first
        if (path === '/' || path === '') {
            return res.json({ status: 'API is running' });
        }

        if (path === '/health') {
            return res.json({ status: 'ok' });
        }

        // Database operations
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
                    if (!req.body || !req.body.word) {
                        return res.status(400).json({ error: 'Word is required' });
                    }
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