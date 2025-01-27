import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testMongoConnection() {
    const uri = process.env.MONGODB_URI;
    console.log('Testing connection to MongoDB Atlas...');
    
    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Successfully connected to MongoDB Atlas!");
        
        const db = client.db('test');
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        const wordsCollection = db.collection('words');
        const count = await wordsCollection.countDocuments();
        console.log(`Words collection has ${count} documents`);
        
    } catch (error) {
        console.error('Connection test failed:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
    } finally {
        await client.close();
    }
}

testMongoConnection();