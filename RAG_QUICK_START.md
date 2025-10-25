# Complete UniAIChat RAG System Setup Guide

## Overview
This guide walks you through setting up the complete RAG (Retrieval Augmented Generation) system for your University AI Chat application.

## Prerequisites
- Node.js v18+ installed
- MongoDB Atlas account with a cluster
- Gemini API key (free tier available)
- Environment variables configured in `.env`

## Step-by-Step Setup

### Step 1: Install Dependencies
\`\`\`bash
npm install
\`\`\`

### Step 2: Verify Environment Variables
Check your `.env` file has these variables:
\`\`\`
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=development
\`\`\`

### Step 3: Create MongoDB Vector Search Index

1. Go to MongoDB Atlas → Your Cluster → Search
2. Click "Create Search Index"
3. Choose "JSON Editor"
4. Paste this configuration:

\`\`\`json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "content": {
        "type": "string"
      },
      "metadata": {
        "type": "document"
      }
    }
  }
}
\`\`\`

5. Name it: `vector_search_index`
6. Click "Create Index" and wait for it to build (2-5 minutes)

### Step 4: Seed Sample Data
\`\`\`bash
npm run seed-database
\`\`\`

This will:
- Clear existing data
- Add sample schedules (classes, assignments, exams, quizzes)
- Add sample events
- Add sample student results
- Add general university information

Expected output:
\`\`\`
[Seed] ✓ Seeded 5 schedules
[Seed] ✓ Seeded 3 events
[Seed] ✓ Seeded 3 results
[Seed] ✓ Seeded 4 general info items
\`\`\`

### Step 5: Ingest Documents into Vector Database
\`\`\`bash
npm run ingest-vectors
\`\`\`

This will:
- Connect to MongoDB
- Read all documents from collections
- Generate embeddings using Gemini API
- Store embeddings in MongoDB Atlas Vector Search

Expected output:
\`\`\`
[DocumentIngestion] Ingested 5 schedules
[DocumentIngestion] Ingested 3 events
[DocumentIngestion] Ingested 3 results
[DocumentIngestion] Ingested 4 general info items
[DocumentIngestion] Total ingested: 15 documents
\`\`\`

### Step 6: Test Vector Search
\`\`\`bash
npm run test-vectors
\`\`\`

This will:
- Test embedding generation
- Test vector search retrieval
- Test RAG answer generation
- Test advanced multi-strategy retrieval
- Display database statistics

Expected output:
\`\`\`
[Test] ✓ Generated embedding with 768 dimensions
[Test] ✓ Found 3 relevant documents
[Test] ✓ Generated RAG answer
[Test] ✓ Retrieved 3 documents using multiple strategies
[Test] ✓ Total documents: 15
[Test] ✓ All tests passed!
\`\`\`

### Step 7: Start the Backend Server
\`\`\`bash
npm run dev
\`\`\`

The server will start on `http://localhost:5000`

## How RAG Works in Your System

### Architecture Flow
\`\`\`
Student Question
    ↓
Convert to Embedding (Gemini API)
    ↓
Vector Search in MongoDB Atlas
    ↓
Retrieve Top 3 Similar Documents
    ↓
Build Context from Retrieved Documents
    ↓
Send to Gemini LLM with Context
    ↓
Generate Context-Aware Answer
    ↓
Return Answer + Source Attribution
\`\`\`

### Example Query Flow

**Student asks:** "What are my classes tomorrow?"

1. **Embedding Generation**: Question converted to 768-dimensional vector
2. **Vector Search**: MongoDB finds similar schedule documents
3. **Context Building**: Retrieved schedules formatted as context
4. **LLM Generation**: Gemini generates answer using context
5. **Response**: "Your classes tomorrow are: OS at 9 AM, DS at 11 AM"

## API Endpoints for RAG

### Chat with RAG
\`\`\`bash
POST /api/chat/message
Content-Type: application/json

{
  "message": "What are my classes tomorrow?"
}
\`\`\`

### Vector Search Endpoints
\`\`\`bash
# Ingest documents via API
POST /api/vector-search/ingest/all

# Search documents
POST /api/vector-search/search
{
  "query": "class schedule"
}

# Get statistics
GET /api/vector-search/stats

# Generate RAG answer
POST /api/vector-search/answer
{
  "question": "What are my classes tomorrow?"
}
\`\`\`

## Troubleshooting

### Issue: "Vector search index not found"
**Solution**: Wait 5 minutes for the index to build in MongoDB Atlas

### Issue: "Embedding generation failed"
**Solution**: Check your Gemini API key and rate limits (15 req/min on free tier)

### Issue: "No documents found"
**Solution**: Run `npm run seed-database` then `npm run ingest-vectors`

### Issue: "Connection timeout"
**Solution**: Check MongoDB URI in .env and ensure IP whitelist includes your IP

## Performance Tips

1. **Batch Ingestion**: Ingest documents in batches of 100 for better performance
2. **Caching**: Embeddings are cached to reduce API calls
3. **Rate Limiting**: Free Gemini tier has 15 req/min limit
4. **Vector Dimension**: Using 768 dimensions for good accuracy/performance balance

## Next Steps

1. Add more sample data to your database
2. Customize the RAG context builder for your use case
3. Implement user feedback to improve answer quality
4. Monitor vector search performance and adjust parameters
5. Deploy to production with proper error handling

## Support

For issues or questions:
1. Check the logs in console
2. Review MongoDB Atlas Search documentation
3. Check Gemini API documentation
4. Review LangChain.js documentation
