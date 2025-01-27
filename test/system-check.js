import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function checkVercelConfig() {
    console.log('\n=== Checking Vercel Configuration ===');
    try {
        const response = await fetch('https://api.vercel.com/v9/projects/skriblerne-api', {
            headers: {
                'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
            }
        });
        const config = await response.json();
        console.log('Node.js Version:', config.nodeVersion);
        console.log('Framework:', config.framework);
        console.log('Build Command:', config.buildCommand || 'Default');
    } catch (error) {
        console.error('Vercel API check failed:', error.message);
    }
}

async function checkMongoDB() {
    console.log('\n=== Checking MongoDB Connection ===');
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('✓ Connection successful');
        
        const db = client.db('test');
        const collection = db.collection('words');
        
        // Test basic operations
        const count = await collection.countDocuments();
        console.log(`✓ Found ${count} documents`);
        
        const sample = await collection.findOne();
        console.log('✓ Sample document:', sample);

        // Test today's word
        const today = new Date().toISOString().split('T')[0];
        const todaysWord = await collection.findOne({ date: today });
        console.log(`✓ Today's word:`, todaysWord || 'No word for today');

    } catch (error) {
        console.error('MongoDB Error:', error.message);
    } finally {
        await client.close();
        console.log('Connection closed');
    }
}

async function checkEnvironment() {
    console.log('\n=== Checking Environment ===');
    const requiredVars = ['MONGODB_URI', 'VERCEL_TOKEN'];
    
    for (const varName of requiredVars) {
        console.log(`${varName}: ${process.env[varName] ? '✓ Set' : '✗ Missing'}`);
    }
}

async function runSystemCheck() {
    console.log('Starting System Check...');
    await checkEnvironment();
    await checkVercelConfig();
    await checkMongoDB();
}

runSystemCheck().catch(console.error);