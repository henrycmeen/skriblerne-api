import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Global cache variables
let cachedClient = null;
let cachedDb = null;

// Remove global cache (it doesn't work in serverless) and optimize connection
let dbPromise;

async function connectToDatabase() {
    try {
        if (!dbPromise) {
            console.log('[DEBUG] Initializing database connection...');
            const client = new MongoClient(process.env.MONGODB_URI, {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: true,
                    deprecationErrors: true,
                },
                connectTimeoutMS: 3000,
                socketTimeoutMS: 3000
            });

            dbPromise = client.connect()
                .then(client => {
                    console.log('[DEBUG] Connected to MongoDB');
                    return client.db('test');
                });
        }

        const db = await dbPromise;
        return db;
    } catch (error) {
        console.error('[DEBUG] Connection error:', error);
        dbPromise = null;
        throw error;
    }
}

// Optimize the today endpoint
case '/api/word/today':
    if (req.method === 'GET') {
        console.time('total-request');
        const db = await connectToDatabase();
        const collection = db.collection('words');
        
        const today = new Date().toISOString().split('T')[0];
        console.log('[DEBUG] Querying for date:', today);
        
        const word = await collection.findOne(
            { date: today },
            { 
                maxTimeMS: 3000,
                projection: { _id: 0, word: 1, date: 1 }
            }
        );
        
        console.timeEnd('total-request');
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