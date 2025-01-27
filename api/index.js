import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Global cache variables
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    try {
        // Return cached connection if available
        if (cachedClient && cachedDb) {
            console.log('Using cached database connection');
            return { client: cachedClient, db: cachedDb };
        }

        console.log('Creating new MongoDB client...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        const client = new MongoClient(process.env.MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        await client.connect();
        const db = client.db('test');
        
        // Test connection
        await db.command({ ping: 1 });
        console.log('MongoDB connection successful');

        // Cache the connection
        cachedClient = client;
        cachedDb = db;

        return { client: cachedClient, db: cachedDb };
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedClient = null;
        cachedDb = null;
        throw error;
    }
}

export default async function handler(req, res) {
    // Early return for favicon requests
    if (req.url.includes('favicon')) {
        return res.status(204).end();
    }

    // Single CORS setup
    res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    console.log('Request received:', {
        method: req.method,
        path: req.url
    });
    
    try {
        const path = req.url.split('?')[0];

        // Non-DB routes first for quick response
        if (path === '/' || path === '') {
            return res.json({ status: 'API is running' });
        }

        if (path === '/health') {
            return res.json({ status: 'ok' });
        }

        // Use destructured db from connection
        const { db } = await connectToDatabase();
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
                    console.time('today-word-fetch');
                    const today = new Date().toISOString().split('T')[0];
                    console.log('Fetching word for date:', today);
                    
                    const word = await collection.findOne(
                        { date: today },
                        { maxTimeMS: 5000 } // Set maximum execution time
                    );
                    
                    console.timeEnd('today-word-fetch');
                    console.log('Word found:', word ? 'yes' : 'no');
                    
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