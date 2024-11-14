require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const INPUT_FILE = path.join(__dirname, 'input_documents.json');
const OUTPUT_FILE = path.join(__dirname, 'documents_with_embeddings.json');

// Function to get embedding for a given text
async function getEmbedding(text) {
  const url = process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT
  
  try {
    const response = await axios.post(
      url,
      {
        input: text,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': OPENAI_API_KEY,
        },
      }
    );
    
    return response.data.data[0].embedding;
  } catch (error) {
    console.error(`Error fetching embedding for text "${text}":`, error.message);
    return null;
  }
}

// Main function to process input file, vectorize, and save
async function vectorizeDocuments() {
  try {
    // Read the input file containing the documents
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const documents = JSON.parse(rawData);
    const updatedDocuments = [];

    // Loop through each document and add the embedding
    for (const doc of documents) {
      const text = doc.text || ''; // Adjust if your field name is different
      const embedding = await getEmbedding(text);
      
      if (embedding) {
        doc.embedding = embedding; // Add embedding to document
      }
      
      updatedDocuments.push(doc);
    }

    // Write updated documents to output JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedDocuments, null, 2));
    console.log(`Embeddings generated and saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error processing documents:', error.message);
  }
}

// Run the function
vectorizeDocuments();
