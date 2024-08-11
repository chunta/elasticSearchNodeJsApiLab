const { Client } = require('@elastic/elasticsearch');
const express = require('express');
const client = new Client({ node: 'http://localhost:9200' });
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

const defaultIndex = 'myindex';

// Check if index exists, and create if it does not
async function ensureIndexExists() {
  try {
    const { body: exists } = await client.indices.exists({ index: defaultIndex });
    if (!exists) {
      // Create index if it does not exist
      const { body: createResponse } = await client.indices.create({
        index: defaultIndex,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              content: { type: 'text' }
            }
          }
        }
      });
      console.log('Index created:', createResponse);
    } else {
      console.log('Index already exists');
    }
  } catch (error) {
    console.error('Error ensuring index exists:', error);
  }
}

// Ensure the index exists before starting the server
ensureIndexExists();

// Add a document
app.post('/add-document', async (req, res) => {
  try {
    const { document } = req.body;
    if (!document) {
      return res.status(400).send({ success: false, error: 'Index name and document are required' });
    }

    const response = await client.index({
      index: defaultIndex,
      body: document
    });
    res.status(200).send({ success: true, data: response });
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// Search for documents
app.get('/search', async (req, res) => {
  const { searchTerm } = req.query;

  if (!searchTerm) {
    return res.status(400).send({ success: false, error: 'Search term is required' });
  }

  try {
    const response = await client.search({
      index: defaultIndex,
      body: {
        query: {
          multi_match: {
            query: searchTerm,
            fields: ['title', 'content'],  // Fields to search in
            fuzziness: 'AUTO'              // Allow for fuzziness in the search term
          }
        }
      }
    });

    // Log the response to check its structure
    console.log('Elasticsearch response:', response.hits);

    // Check if hits are available
    if (response && response.hits) {
      res.status(200).send({ success: true, data: response.hits });
    } else {
      res.status(500).send({ success: false, error: 'Unexpected response structure' });
    }
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});