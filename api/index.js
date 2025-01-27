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
        // Update CORS headers to include PUT
        res.setHeader('Access-Control-Allow-Origin', 'https://henrycmeen.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        const path = req.url.split('?')[0];
        console.log('Incoming request path:', path);

        // Connect to DB with better error handling
        const db = await connectToDatabase();
        const collection = db.collection('words');

        // Add new word
        if (path === '/api/words' && req.method === 'POST') {
            const { word, date } = req.body;
            if (!word || !date) {
                return res.status(400).json({ error: 'Word and date are required' });
            }
            const result = await collection.updateOne(
                { date },
                { $set: { word: word.toUpperCase(), date } },
                { upsert: true }
            );
            return res.json({ success: true, result });
        }

        // Update existing word
        if (path.startsWith('/api/words/') && req.method === 'PUT') {
            const date = path.split('/').pop();
            const { word } = req.body;
            if (!word) {
                return res.status(400).json({ error: 'Word is required' });
            }
            const result = await collection.updateOne(
                { date },
                { $set: { word: word.toUpperCase() } }
            );
            return res.json({ success: true, result });
        }

        // List all words
        if (path === '/api/words') {
            const words = await collection.find({}).toArray();
            return res.json(words);
        }

        // Get today's word
        if (path === '/api/word/today') {
            const today = new Date().toISOString().split('T')[0];
            console.log('Searching for date:', today);
            
            // First try exact date string match
            let word = await collection.findOne({ date: today });
            
            // If not found, try with ISODate format
            if (!word) {
                const startOfDay = new Date(today);
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                
                word = await collection.findOne({
                    date: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                });
            }
            
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