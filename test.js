const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
// Assuming ChatOpenAI is a mockup or placeholder for actual OpenAI API usage
const { ChatOpenAI } = require("@langchain/openai");

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

// Simplified regex for detail extraction (extend these patterns according to your requirements)
const detailPatterns = {
    weight: /(\d+)\s*kg/i,
    height: /(\d+)\s*cm/i,
    activityDuration: /(\d+)\s*(hours?|minutes?)\s*a\s*day/i, // Captures "X hour(s) a day" or "X minute(s) a day"
    activityFrequency: /(\d+)\s*times\s*a\s*week/i, // Captures "X times a week"
    age: /I am (\d+) years old/i,
};

app.post('/ask-fitness-bot', async (req, res) => {
    const userQuestion = req.body.question.trim();
    if (!req.session.userDetails) {
        req.session.userDetails = {};
    }

    // Extract and store details using the updated detailPatterns
    Object.keys(detailPatterns).forEach(key => {
        const match = userQuestion.match(detailPatterns[key]);
        if (match) {
            // For activity duration and frequency, store the full matched string for context
            req.session.userDetails[key] = match[0];
        }
    });

    let prompt = `You are a fitness bot. Given the user details: ${JSON.stringify(req.session.userDetails)}. Let's dive into this conversation: ${userQuestion}`;

    try {
        const response = await model.invoke(prompt); // Ensure this matches your actual model invocation logic
        req.session.history = `${req.session.history}\nUser: ${userQuestion}\nBot: ${response.content}`;
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
