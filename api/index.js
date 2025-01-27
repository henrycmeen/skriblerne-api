import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Global cache variables
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    try {
        // Return cached connection if available
        if (cachedClient && cachedDb) {
            console.log('[DEBUG] Using cached database connection');
            return { client: cachedClient, db: cachedDb };
        }

        console.log('[DEBUG] Creating new MongoDB client...');
        if (!process.env.MONGODB_URI) {
            console.error('[DEBUG] MONGODB_URI is missing');
            throw new Error('MONGODB_URI is not defined');
        }

        console.log('[DEBUG] MongoDB URI pattern:', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        
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

        console.log('[DEBUG] Attempting to connect...');
        await client.connect();
        const db = client.db('test');
        
        console.log('[DEBUG] Testing connection with ping...');
        await db.command({ ping: 1 });
        console.log('[DEBUG] MongoDB connection successful');

        cachedClient = client;
        cachedDb = db;
        return { client: cachedClient, db: cachedDb };
    } catch (error) {
        console.error('[DEBUG] MongoDB connection error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        cachedClient = null;
        cachedDb = null;
        throw error;
    }
}

// And update the today endpoint with more logging
case '/api/word/today':
    if (req.method === 'GET') {
        console.log('[DEBUG] Starting /api/word/today request');
        console.time('today-word-fetch');
        
        const today = new Date().toISOString().split('T')[0];
        console.log('[DEBUG] Searching for word with date:', today);
        
        const word = await collection.findOne(
            { date: today },
            { 
                maxTimeMS: 5000,
                projection: { _id: 0, word: 1, date: 1 }
            }
        );
        
        console.timeEnd('today-word-fetch');
        console.log('[DEBUG] Word search result:', word);
        
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