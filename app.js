require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const readline = require('readline-sync');
const { MongoClient } = require('mongodb');


const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Load environment variables
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const mongoUri = process.env.MONGODB_URI;


// Function to perform sentiment analysis
async function getSentimentAnalysis(text) {
    const url = process.env.AZURE_OPENAI_API_ENDPOINT;
    const messages = [
      { role: 'system', content: 'You are an assistant that performs sentiment analysis.' },
      { role: 'user', content: `Analyze the sentiment of the following text and provide the results in JSON format with fields "sentiment" (positive, neutral, negative), "score" (between -1 and 1), and "confidence" (between 0 and 1).\n\nText: "${text}"` },
    ];
  
    const response = await axios.post(
      url,
      { messages: messages, max_tokens: 100, temperature: 0 },
      { headers: { 'Content-Type': 'application/json', 'api-key': apiKey } }
    );
    const completion = response.data.choices[0].message.content.trim();
    return JSON.parse(completion.replace(/```json|```/g, '').trim());
  }
  
// Function to perform summarization
async function getSummary(text) {
const url = process.env.AZURE_OPENAI_API_ENDPOINT;
const messages = [
    { role: 'system', content: 'You are an assistant that summarizes conversations.' },
    { role: 'user', content: `Summarize the following conversation:\n\n"${text}"` },
];

const response = await axios.post(
    url,
    { messages: messages, max_tokens: 100, temperature: 0.5 },
    { headers: { 'Content-Type': 'application/json', 'api-key': apiKey } }
);

return response.data.choices[0].message.content.trim();
}

// Function to create embeddings for query
async function getEmbedding(query) {
    const embed_url = process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT;
  
    try {
      const response = await axios.post(
        embed_url,
        { input: query },
        { headers: { 'Content-Type': 'application/json', 'api-key': apiKey } }
      );
  
      return response.data.data[0].embedding; // Return the embedding vector
    } catch (error) {
      console.error('Error fetching embedding:', error);
      return null;
    }
  }

  // Function to vectorize each document in the MongoDB collection
async function vectorizeCollection() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db('genai'); // replace with your database name
    const collection = db.collection('hackathon'); // replace with your collection name
  
    const documents = await collection.find().toArray();
  
    // Vectorize and update each document
    for (const doc of documents) {
      const text = doc.text || ""; // Assuming each document has a "text" field
      const embeddingVector = await getEmbedding(text);
  
      if (embeddingVector) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { embedding_vector: embeddingVector } }
        );
      }
    }
  
    await client.close();
    return documents.length; // Return the count of vectorized documents
}

// Home route to render the form
app.get('/', (req, res) => {
    res.render('index');
});

// Route to handle form submission
/* app.post('/analyze', async (req, res) => {
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
  });*/

// Route to handle form submission
app.post('/analyze', async (req, res) => {
    const text = req.body.text;
    const action = req.body.action;
    
    try {
        if (action === 'analyze') {
            const sentimentData = await getSentimentAnalysis(text);
            res.render('result', { text: text, result: sentimentData, action: 'analyze', error: null });
        } else if (action === 'summarize') {
            const summary = await getSummary(text);
            res.render('result', { text: text, result: summary, action: 'summarize', error: null });
        } else if (action === 'search') {
            const embeddingVector = await getEmbedding(text);
            res.render('result', { text: text, action: 'search', vector: embeddingVector, error: null });
        } else if (action === 'vectorize_collection') {
            const count = await vectorizeCollection();
            res.render('result', { text: `Vectorized ${count} documents in the collection.`, action: 'vectorize_collection', vector: null, error: null });
        } 
    }
    catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.render('result', { text: text, error: 'Error processing your request', result: null, action: action });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });