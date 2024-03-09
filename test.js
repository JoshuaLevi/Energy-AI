import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SECRET_KEY || 'your secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Correctly define and initialize the model variable here
const model = new ChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.ENGINE_NAME,
});



const detailPatterns = {
    weight: /(\d+)\s*kg/i, // Captures "X kg"
    height: /(\d+)\s*cm/i, // Captures "X cm"
    time: /(\d+)\s*(hours?|minutes?)/i, // Captures "X hour(s)" or "X minute(s)"
    // Extend with more patterns as needed
};

app.post('/ask-fitness-bot', async (req, res) => {
    const userQuestion = req.body.question.trim();
    if (!req.session.userDetails) {
        req.session.userDetails = {};
    }

    // Extract and store details
    Object.keys(detailPatterns).forEach(key => {
        const match = userQuestion.match(detailPatterns[key]);
        if (match) {
            req.session.userDetails[key] = match[1] + (match[2] ? " " + match[2] : "");
        }
    });

    let prompt = `You are a fitness bot. Let's dive into this conversation: ${userQuestion}`;
    if (Object.keys(req.session.userDetails).length > 0) {
        prompt = `Given the user details: ${JSON.stringify(req.session.userDetails)}. ${prompt}`;
    }

    try {
        const response = await model.invoke(prompt); // Adjust to your model invocation method
        req.session.history = userQuestion + "\nBot: " + response.content;
        res.json({ answer: response.content });
    } catch (error) {
        console.error('Error communicating with fitness bot:', error);
        res.status(500).send('An error occurred while trying to fetch an answer.');
    }
});



app.post('/clear-history', (req, res) => {
    req.session.history = ""; // Clear the session history
    res.send('Chat history cleared successfully.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Fitness bot is ready at http://localhost:${PORT}`);
});