import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Single database connection promise
let dbPromise = null;

async function connectToDatabase() {
    try {
        if (dbPromise) {
            return dbPromise;
        }

        console.log('[DEBUG] Creating new MongoDB client...');
        const client = new MongoClient(process.env.MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        // Create and store the promise
        dbPromise = client.connect()
            .then(() => {
                console.log('[DEBUG] Connected to MongoDB');
                return client.db('test');
            })
            .catch(err => {
                console.error('[DEBUG] Connection failed:', err);
                dbPromise = null;
                throw err;
            });

        return dbPromise;
    } catch (error) {
        console.error('[DEBUG] Connection error:', error);
        dbPromise = null;
        throw error;
    }
}

export default async function handler(req, res) {
    // Add timeout safety
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            console.error('[DEBUG] Request timeout');
            res.status(504).json({ error: 'Gateway Timeout' });
        }
    }, 9000); // Set to 9s to ensure we respond before Vercel's 10s limit

    try {
        // CORS headers remain at the top
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
        // Handle preflight
        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }
    
        // Early returns
        if (req.url.includes('favicon')) {
            return res.status(204).end();
        }
    
        const path = req.url.split('?')[0];
        console.log('[DEBUG] Processing request for path:', path);
    
        // Non-DB routes first
        if (path === '/' || path === '') {
            return res.json({ status: 'API is running' });
        }
    
        if (path === '/health') {
            return res.json({ status: 'ok' });
        }
    
        // Database operations
        const db = await connectToDatabase();
        const collection = db.collection('words');
    
        switch (path) {
            case '/api/word/today':
                if (req.method === 'GET') {
                    console.time('word-fetch');
                    const today = new Date().toISOString().split('T')[0];
                    console.log('[DEBUG] Querying for date:', today);
                    
                    const word = await collection.findOne(
                        { date: today },
                        { 
                            maxTimeMS: 3000,
                            projection: { _id: 0, word: 1, date: 1 }
                        }
                    );
                    console.timeEnd('word-fetch');
                    
                    return res.json(word || { word: 'Ingen ord i dag' });
                }
                break;
    
            case '/api/word/random':
                if (req.method === 'GET') {
                    const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
                    return res.json(words[0] || { word: 'Ingen ord funnet' });
                }
                break;
    
            default:
                return res.status(404).json({ error: 'Not found' });
        }
    } catch (error) {
        console.error('[DEBUG] Request error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}