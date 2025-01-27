// Remove unnecessary imports
import { MongoClient } from 'mongodb';

// Global connection cache
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!cachedClient) {
        cachedClient = new MongoClient(process.env.MONGODB_URI, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
            ssl: true,
            tls: true,
            tlsAllowInvalidCertificates: true,
            useNewUrlParser: true
        });
    }

    try {
        await cachedClient.connect();
        cachedDb = cachedClient.db('test');
        
        // Verify connection
        await cachedDb.command({ ping: 1 });
        console.log('Connected to MongoDB');
        
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedClient = null;
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
        
        // Health check without DB
        if (path === '/health') {
            return res.json({ status: 'ok' });
        }

        // Connect to DB with better error handling
        const db = await connectToDatabase();
        const collection = db.collection('words');

        if (path === '/word/today') {
            const today = new Date().toISOString().split('T')[0];
            console.log('Fetching word for date:', today);
            const word = await collection.findOne({ date: today });
            console.log('Found word:', word);
            return res.json(word || { word: 'Ingen ord i dag' });
        }
        
        if (path === '/word/random') {
            const words = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
            return res.json(words[0] || { word: 'Ingen ord funnet' });
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