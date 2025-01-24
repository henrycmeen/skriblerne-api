import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'config';

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
    if (req.method === 'GET' && req.url === '/api/word/today') {
        // Your existing MongoDB logic for getting today's word
    }
    
    if (req.method === 'GET' && req.url === '/api/word/random') {
        // Your existing MongoDB logic for random word
    }
    
    if (req.method === 'POST' && req.url === '/api/word') {
        // Your existing MongoDB logic for adding words
    }
}