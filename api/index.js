import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Remove express import as it's not needed for Vercel serverless functions
// Remove duplicate imports and keep only what we need
import { MongoClient } from 'mongodb';

// Global cached connection
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI);
    cachedDb = client.db('test');
    return cachedDb;
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        return res.status(204).end();
    }

    try {
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        
        const path = req.url.split('?')[0];
        
        // Quick health check without DB connection
        if (path === '/health') {
            return res.json({ status: 'ok' });
        }
        
        const db = await connectToDatabase();
        const collection = db.collection('words');

        if (path.includes('/word/today')) {
            const today = new Date().toISOString().split('T')[0];
            const word = await collection.findOne({ date: today });
            return res.json(word || { word: 'Ingen ord i dag' });
        }
        
        if (path.includes('/word/random')) {
            const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
            return res.json(words[0] || { word: 'Ingen ord funnet' });
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
}