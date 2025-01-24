import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB');
        
        const db = client.db('test');  // Changed from 'ordbank' to 'test'
        const collection = db.collection('words');
        
        const count = await collection.countDocuments();
        console.log(`Found ${count} documents in collection`);
        
        const sample = await collection.findOne();
        console.log('Sample document:', sample);
    } catch (error) {
        console.error('Connection error:', error);
    } finally {
        await client.close();
    }
}

testConnection();