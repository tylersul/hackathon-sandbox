require('dotenv').config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Function to analyze sentiment
async function analyzeSentiment(text) {
    try {
      const response = await axios.post(
        process.env.OPENAI_API_ENDPOINT,
        {
          messages: [
            { role: 'system', content: 'You are a sentiment analysis assistant.' },
            { role: 'user', content: `Analyze the sentiment of this text:\n"${text}"` }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.OPENAI_API_KEY,
          },
        }
      );

      const sentimentAnalysis = response.data.choices[0].message.content.trim();
      return sentimentAnalysis;
    } catch (error) {
      console.error('Error analyzing sentiment:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      }
      return 'Could not analyze sentiment';
    }
}

// Route for command line input testing
app.post('/analyze', async (req, res) => {
    const { text } = req.body;
  
    if (!text) {
      return res.status(400).json({ error: 'Text input is required.' });
    }
  
    const sentiment = await analyzeSentiment(text);
    res.json({ sentiment });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});