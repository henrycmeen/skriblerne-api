// Remove unnecessary imports
import { MongoClient } from 'mongodb';

// Global connection cache
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    try {
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        cachedDb = client.db('test');
        console.log('Connected to MongoDB');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedDb = null;
        throw error;
    }
}

export default async function handler(req, res) {
    try {
        // Update CORS and add Permissions-Policy headers
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Permissions-Policy', 
            'interest-cohort=(), ' +
            'private-state-token-redemption=(), ' +
            'private-state-token-issuance=(), ' +
            'browsing-topics=()'
        );

        // Handle OPTIONS request explicitly
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        const path = req.url.split('?')[0];
        const db = await connectToDatabase();
        const collection = db.collection('words');

        // Core endpoints
        if (path === '/api/words') {
            // GET - List all words
            if (req.method === 'GET') {
                const words = await collection.find({}).toArray();
                return res.json(words);
            }
            
            // POST - Add new word
            if (req.method === 'POST') {
                const { word, date } = req.body;
                if (!word || !date) {
                    return res.status(400).json({ error: 'Word and date are required' });
                }
                try {
                    const result = await collection.updateOne(
                        { date },
                        { $set: { word: word.toUpperCase(), date }},
                        { upsert: true }
                    );
                    return res.json({ success: true, result });
                } catch (error) {
                    console.error('Database error:', error);
                    return res.status(500).json({ error: 'Database error' });
                }
            }
        }

        // Get today's word
        if (path === '/api/word/today') {
            const today = new Date().toISOString().split('T')[0];
            const word = await collection.findOne({ date: today });
            return res.json(word || { word: 'Ingen ord i dag' });
        }

        // Get random word
        if (path === '/api/word/random') {
            const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
            return res.json(words[0] || { word: 'Ingen ord funnet' });
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error('Request error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}