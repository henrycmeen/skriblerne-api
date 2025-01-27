import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkDate() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('test');
        const collection = db.collection('words');
        
        const date = "2025-01-27";
        const word = await collection.findOne({ date: date });
        
        console.log(`Checking word for date ${date}:`);
        console.log(word || 'No word found for this date');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkDate();