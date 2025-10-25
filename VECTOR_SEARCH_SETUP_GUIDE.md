# MongoDB Atlas Vector Search Setup & RAG Implementation Guide

## Overview
This guide explains how to set up MongoDB Atlas Vector Search with your UniAIChat system using Gemini embeddings and LangChain.js for RAG (Retrieval Augmented Generation).

## Architecture Flow

\`\`\`
Student Question
    ↓
[1] Generate Embedding (Gemini API)
    ↓
[2] Vector Search in MongoDB Atlas
    ↓
[3] Retrieve Top-K Similar Documents
    ↓
[4] Build Context from Retrieved Docs
    ↓
[5] Generate Answer with Gemini (using context)
    ↓
Response with Sources
\`\`\`

## Step 1: Create MongoDB Atlas Vector Search Index

### Prerequisites
- MongoDB Atlas account with a cluster
- Database: `bannu_uni_cs_ai-chat`
- Collection: `vectordocuments`

### Create the Index

1. **Go to MongoDB Atlas Dashboard**
   - Navigate to your cluster
   - Click on "Search" tab
   - Click "Create Search Index"

2. **Choose Index Type**
   - Select "JSON Editor"

3. **Paste the Index Configuration**

\`\`\`json

{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 768,
        "similarity": "cosine"
      },
      "content": {
        "type": "string"
      },
      "metadata": {
        "type": "document",
        "fields": {
          "type": {
            "type": "string"
          },
          "semester": {
            "type": "string"
          },
          "className": {
            "type": "string"
          },
          "subject": {
            "type": "string"
          },
          "date": {
            "type": "date"
          }
        }
      }
    }
  }
}
\`\`\`

4. **Name the Index**
   - Name: `vector_search_index`
   - Click "Create Search Index"
   - Wait for index to build (usually 1-2 minutes)

## Step 2: Environment Variables

Add these to your `.env` file:

\`\`\`env
# Gemini API (Free tier from AI Studio)
GEMINI_API_KEY=......................

# MongoDB
MONGO_URI=.............

# Server
PORT=5000
NODE_ENV=development
\`\`\`

## Step 3: How Vector Search Works

### 3.1 Text to Vector Conversion
\`\`\`
Input: "What are my classes tomorrow?"
    ↓
Gemini Embedding API
    ↓
768-dimensional vector: [0.123, -0.456, 0.789, ...]
\`\`\`

### 3.2 Vector Search Query
\`\`\`
Query Vector: [0.123, -0.456, 0.789, ...]
    ↓
MongoDB Atlas Vector Search
    ↓
Cosine Similarity Calculation
    ↓
Top 5 Most Similar Documents
\`\`\`

### 3.3 Document Retrieval
\`\`\`
Retrieved Documents:
1. "Class: Operating Systems, Time: 09:00 AM" (Score: 0.95)
2. "Class: Database Systems, Time: 10:30 AM" (Score: 0.87)
3. "Class: Web Development, Time: 02:00 PM" (Score: 0.82)
...
\`\`\`

### 3.4 Context Building
\`\`\`
Context = Combine all retrieved documents
    ↓
Pass to Gemini with system prompt
    ↓
Gemini generates answer using context
\`\`\`

## Step 4: API Endpoints

### Ingest Documents
\`\`\`bash
POST /api/vector-search/ingest/all
Authorization: Bearer <token>
\`\`\`

Ingests all schedules, events, results, and general info into vector database.

### Search Documents
\`\`\`bash
POST /api/vector-search/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "What are my classes tomorrow?",
  "filters": {
    "semester": "4",
    "className": "A"
  },
  "topK": 5
}
\`\`\`

### Generate RAG Answer
\`\`\`bash
POST /api/vector-search/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "What are my classes tomorrow?",
  "filters": {
    "semester": "4"
  }
}
\`\`\`


### Get Statistics
\`\`\`bash
GET /api/vector-search/stats
Authorization: Bearer <token>
\`\`\`

## Step 5: Using Gemini Free API

### Limitations
- **Rate Limit**: 15 requests per minute
- **Daily Limit**: 1,500 requests per day
- **Model**: `embedding-001` (768 dimensions)
- **Batch Size**: Process 1 document at a time

### Best Practices
- Cache embeddings when possible
- Batch ingestion during off-peak hours
- Use memory store fallback for high traffic

### Getting Free API Key
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Click "Get API Key"
3. Create new API key
4. Copy and add to `.env`

## Step 6: RAG Flow in Chat

### Hybrid Approach
\`\`\`
Student Message
    ↓
Try RAG First (Vector Search)
    ↓
If documents found → Use RAG answer
    ↓
If no documents → Fallback to Intent-based handlers
\`\`\`

### Example Flow
\`\`\`
User: "What are my classes tomorrow?"
    ↓
Generate embedding for query
    ↓
Search vector DB for similar documents
    ↓
Found 3 relevant class schedules
    ↓
Build context from schedules
    ↓
Gemini generates: "Your classes tomorrow are..."
    ↓
Return answer with source documents
\`\`\`

## Step 7: Document Ingestion

### Automatic Ingestion
\`\`\`javascript
// In your chat controller or startup script
import DocumentIngestionHelper from "./utils/documentIngestionHelper.js"

// Ingest all documents
await DocumentIngestionHelper.ingestAllDocuments()
\`\`\`

### What Gets Ingested
- **Schedules**: Classes, exams, assignments, quizzes, tests
- **Events**: University events and announcements
- **Results**: Student grades and academic results
- **General Info**: Policies, fees, notices

### Document Format
Each document is split into chunks (1000 chars with 200 char overlap) and embedded:

\`\`\`
Schedule: Operating Systems
Subject: Operating Systems
Type: class
Class: A
Semester: 4
Date: 2024-01-15
Time: 09:00 AM - 10:30 AM
Room: Lab-101
Teacher: Dr. Ahmed
\`\`\`

## Step 8: Troubleshooting

### Issue: "Vector search index not found"
**Solution**: 
- Verify index is created in MongoDB Atlas
- Wait 2-3 minutes for index to build
- Check index name is `vector_search_index`

### Issue: "Invalid embedding dimension"
**Solution**:
- Ensure using `embedding-001` model (768 dimensions)
- Check Gemini API key is valid
- Verify API key has embedding permissions

### Issue: "Rate limit exceeded"
**Solution**:
- Use memory store fallback
- Implement caching
- Batch ingestion during off-peak hours
- Consider upgrading Gemini API plan

### Issue: "No relevant documents found"
**Solution**:
- Ensure documents are ingested first
- Check metadata filters are correct
- Try broader search query
- Fallback to intent-based handlers

## Step 9: Performance Optimization

### Caching
\`\`\`javascript
// Cache embeddings to reduce API calls
const embeddingCache = new Map()

async function getCachedEmbedding(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)
  }
  const embedding = await generateEmbedding(text)
  embeddingCache.set(text, embedding)
  return embedding
}
\`\`\`

### Batch Processing
\`\`\`javascript
// Process multiple documents in batches
async function ingestBatch(documents, batchSize = 5) {
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize)
    await Promise.all(batch.map(doc => ingestDocument(doc)))
    await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limit
  }
}
\`\`\`

### Memory Store Fallback
\`\`\`javascript
// Use in-memory store when MongoDB vector search is unavailable
if (mongoDBUnavailable) {
  advancedRAGService.useMemoryStore = true
}
\`\`\`

## Step 10: Monitoring

### Check Vector Database Stats
\`\`\`bash
GET /api/vector-search/stats
\`\`\`

Response:
\`\`\`json
{
  "totalDocuments": 1250,
  "byType": {
    "schedule": 450,
    "event": 200,
    "result": 350,
    "general_info": 250
  }
}
\`\`\`

### Monitor Ingestion
\`\`\`javascript
// Check logs for ingestion progress
[DocumentIngestion] Starting full database ingestion...
[DocumentIngestion] Ingested 450 schedules
[DocumentIngestion] Ingested 200 events
[DocumentIngestion] Ingested 350 results
[DocumentIngestion] Ingested 250 general info items
[DocumentIngestion] Total ingested: 1250 documents
\`\`\`

## Summary

Your RAG system now:
1. ✅ Converts text to 768-dimensional vectors using Gemini
2. ✅ Stores vectors in MongoDB Atlas with metadata
3. ✅ Searches using cosine similarity
4. ✅ Retrieves relevant documents
5. ✅ Generates context-aware answers
6. ✅ Falls back to intent-based handlers
7. ✅ Provides source attribution

This provides intelligent, context-aware responses to student queries!
