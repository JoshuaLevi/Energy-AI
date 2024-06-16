import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import { ChatOpenAI } from '@langchain/openai';
import fetch from 'node-fetch';

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
    azureOpenAIApiKey: process.env.AZURE_OPENAIApiKey,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.ENGINE_NAME,
});

// Route to save user details
app.post('/save-user-details', (req, res) => {
    const { location, solarPanels } = req.body;
    req.session.location = location;
    req.session.solarPanels = solarPanels;
    res.json({ success: true, message: 'User details saved successfully.' });
});

app.post('/ask-energy-bot', async (req, res) => {
    const { question } = req.body;
    const location = req.session.location;
    const solarPanels = req.session.solarPanels;

    if (!question) {
        return res.status(400).send('Please ask a question.');
    }

    if (!location || !solarPanels) {
        return res.status(400).send('Please provide your location and the number of solar panels first.');
    }

    try {
        // Fetch weather data
        const weatherResponse = await fetch(`http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`);
        if (!weatherResponse.ok) {
            throw new Error('Failed to fetch weather data');
        }
        const weatherData = await weatherResponse.json();

        // Fetch energy prices data
        const energyResponse = await fetch('https://api.eco-smart.site/api/energy-prices');
        if (!energyResponse.ok) {
            throw new Error('Failed to fetch energy prices');
        }
        const energyData = await energyResponse.json();

        // Calculate estimated solar power generation
        const cloudCover = weatherData.current.cloud;
        const estimatedGeneration = solarPanels * (1 - cloudCover / 100) * 5; // Example calculation

        // Extract relevant energy price data
        const {
            max_price: maxPriceToday,
            min_price: minPriceToday,
            average_price: averagePriceToday,
            high_time: highTimeToday,
            low_time: lowTimeToday
        } = energyData.energy_today;

        const {
            max_price: maxPriceTomorrow,
            min_price: minPriceTomorrow,
            average_price: averagePriceTomorrow,
            high_time: highTimeTomorrow,
            low_time: lowTimeTomorrow
        } = energyData.energy_tomorrow;

        // Create prompt for OpenAI
        const prompt = `
            Je bent een energie adviseur. Je hebt de volgende data:
            Location: ${location}
            Solar Panels: ${solarPanels}
            Estimated Generation: ${estimatedGeneration} kWh
            Weather: ${JSON.stringify(weatherData)}
            Energy Prices Today: 
                - Max Price: ${maxPriceToday}
                - Min Price: ${minPriceToday}
                - Average Price: ${averagePriceToday}
                - High Price Time: ${highTimeToday}
                - Low Price Time: ${lowTimeToday}
            Energy Prices Tomorrow:
                - Max Price: ${maxPriceTomorrow}
                - Min Price: ${minPriceTomorrow}
                - Average Price: ${averagePriceTomorrow}
                - High Price Time: ${highTimeTomorrow}
                - Low Price Time: ${lowTimeTomorrow}
            Geef antwoord op deze vraag door te kijken naar de gegeven informatie en daar een schatting mee te maken wanneer er voorspellingen gevraagd word. ${question}
           
        `;

        // Fetch advice from OpenAI
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!openaiResponse.ok) {
            const errorDetails = await openaiResponse.text();
            throw new Error(`Failed to fetch advice from OpenAI: ${openaiResponse.statusText} - ${errorDetails}`);
        }

        const openaiData = await openaiResponse.json();
        const advice = openaiData.choices[0].message.content;

        req.session.history = (req.session.history || "") + "\nUser: " + question + "\nBot: " + advice;
        res.json({ answer: advice });
    } catch (error) {
        console.error('Error getting advice:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            details: error.response ? await error.response.text() : 'No additional details available'
        });
    }
});

app.post('/clear-history', (req, res) => {
    req.session.history = "";
    req.session.location = null;
    req.session.solarPanels = null;
    res.send('Chat history cleared successfully.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Energy bot is ready at http://localhost:${PORT}`);
});
