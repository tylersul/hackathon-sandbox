require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const readline = require('readline-sync');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Load environment variables
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

// Home route to render the form
app.get('/', (req, res) => {
    res.render('index');
});

// Route to handle form submission
app.post('/analyze', async (req, res) => {
    const text = req.body.text;
    const url = process.env.AZURE_OPENAI_API_ENDPOINT
    const messages = [
      {
        role: 'system',
        content: 'You are an assistant that performs sentiment analysis.',
      },
      {
        role: 'user',
        content: `Analyze the sentiment of the following text and provide the results in JSON format with fields "sentiment" (positive, neutral, negative), "score" (between -1 and 1), and "confidence" (between 0 and 1).\n\nText: "${text}"`,
      },
    ];
  
    try {
      const response = await axios.post(
        url,
        {
          messages: messages,
          max_tokens: 100,
          temperature: 0,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
        }
      );
  
      const completion = response.data.choices[0].message.content.trim();
  
      // Clean the response from any Markdown formatting
      const cleanedCompletion = completion.replace(/```json|```/g, '').trim();
      let sentimentData;
  
      try {
        sentimentData = JSON.parse(cleanedCompletion);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError.message);
        return res.render('result', { error: 'Unable to parse response from OpenAI.' });
      }
  
      // Render the result page with sentiment data
      res.render('result', { result: sentimentData, text: text, error: null});
    } catch (error) {
      console.error('Error fetching sentiment analysis:', error.response ? error.response.data : error.message);
      res.render('result', { error: 'Error fetching sentiment analysis from OpenAI.' });
    }
  });

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });