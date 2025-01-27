// Remove unnecessary imports
import { MongoClient } from 'mongodb';

// Global cached connection
let cachedDb = null;
let client = null;

async function connectToDatabase() {
    try {
        if (cachedDb) {
            return cachedDb;
        }

        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        cachedDb = client.db('test');
        
        // Test connection
        await cachedDb.command({ ping: 1 });
        return cachedDb;
    } catch (error) {
        console.error('Connection error:', error);
        cachedDb = null;
        if (client) {
            await client.close();
            client = null;
        }
        throw error;
    }
}

export default async function handler(req, res) {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }

    try {
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        const path = req.url.split('?')[0];
        
        // Quick health check without DB connection
        if (path === '/health') {
            return res.json({ status: 'ok' });
        }
        
        const db = await connectToDatabase();
        const collection = db.collection('words');

        if (path === '/word/today') {
            const today = new Date().toISOString().split('T')[0];
            const word = await collection.findOne({ date: today });
            return res.json(word || { word: 'Ingen ord i dag' });
        }
        
        if (path === '/word/random') {
            const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
            return res.json(words[0] || { word: 'Ingen ord funnet' });
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
}