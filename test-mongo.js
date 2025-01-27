import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        console.log('Attempting to connect to MongoDB...');
        await client.connect();
        console.log('Successfully connected to MongoDB');
        
        const db = client.db('test');
        const collection = db.collection('words');
        
        console.log('Testing database operations...');
        const count = await collection.countDocuments();
        console.log(`Found ${count} documents in collection`);
        
        const sample = await collection.findOne();
        console.log('Sample document:', sample);
    } catch (error) {
        console.error('Connection error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    } finally {
        await client.close();
        console.log('Connection closed');
    }
}

testConnection();