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
        // Set CORS headers first
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        const path = req.url.split('?')[0];
        console.log('Incoming request path:', path);

        // Connect to DB with better error handling
        const db = await connectToDatabase();
        const collection = db.collection('words');

        // List all words
        if (path === '/api/words') {
            const words = await collection.find({}).toArray();
            return res.json(words);
        }

        // Get today's word
        if (path === '/api/word/today') {
            const today = new Date().toISOString().split('T')[0];
            console.log('Searching for date:', today);
            
            // Match date by starting with the date string
            const word = await collection.findOne({
                date: new RegExp('^' + today)
            });
            console.log('Found word:', word);
            
            return res.json(word || { word: 'Ingen ord i dag' });
        }
        
        // Get random word
        if (path === '/api/word/random') {  // Updated path
            const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
            return res.json(words[0] || { word: 'Ingen ord funnet' });
        }

        // Health check
        if (path === '/api/health') {
            return res.json({ status: 'ok' });
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error('Request error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            message: error.message
        });
    }
}