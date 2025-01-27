import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Remove express import as it's not needed for Vercel serverless functions
let dbPromise = null;

async function connectToDatabase() {
    try {
        if (dbPromise) {
            return dbPromise;
        }

        console.log('[DEBUG] Creating new MongoDB client...');
        const client = new MongoClient(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            tls: true,
            tlsAllowInvalidCertificates: true,
            serverSelectionTimeoutMS: 8000,    // Increased timeout
            connectTimeoutMS: 8000,            // Increased timeout
            socketTimeoutMS: 8000              // Increased timeout
        });

        // Simpler connection without race condition
        dbPromise = client.connect()
            .then(() => {
                console.log('[DEBUG] Connected to MongoDB');
                return client.db('test');
            });

        const db = await dbPromise;
        // Test connection
        await db.command({ ping: 1 });
        console.log('[DEBUG] Database ping successful');
        
        return db;
    } catch (error) {
        console.error('[DEBUG] Connection error:', error);
        dbPromise = null;
        throw error;
    }
}

export default async function handler(req, res) {
    try {
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        const path = req.url.split('?')[0];
        console.log('[DEBUG] Request path:', path);

        if (path === '/health' || path === '/' || path === '') {
            return res.json({ status: 'ok' });
        }

        const db = await connectToDatabase();
        const collection = db.collection('words');

        switch (path) {
            case '/word/today':
            case '/api/word/today':
                if (req.method === 'GET') {
                    const today = new Date().toISOString().split('T')[0];
                    const word = await collection.findOne(
                        { date: today },
                        { 
                            maxTimeMS: 3000,
                            projection: { _id: 0, word: 1, date: 1 }
                        }
                    );
                    return res.json(word || { word: 'Ingen ord i dag' });
                }
                break;

            case '/word/random':
            case '/api/word/random':
                if (req.method === 'GET') {
                    const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
                    return res.json(words[0] || { word: 'Ingen ord funnet' });
                }
                break;

            default:
                return res.status(404).json({ error: 'Not found', path: path });
        }
    } catch (error) {
        console.error('[DEBUG] Request error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}