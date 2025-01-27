import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const client = new MongoClient(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            tls: true,
            tlsAllowInvalidCertificates: true
        });

        await client.connect();
        console.log('Connected successfully to MongoDB');

        const db = client.db('test');
        const result = await db.command({ ping: 1 });
        console.log('Database ping result:', result);

        const collection = db.collection('words');
        const count = await collection.countDocuments();
        console.log('Number of documents in words collection:', count);

        await client.close();
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

testConnection();