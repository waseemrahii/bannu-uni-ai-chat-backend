# RAG (Retrieval Augmented Generation) Implementation Guide

## Overview

This guide explains the complete RAG system implementation for the University AI Chat application. The system uses MongoDB Atlas Vector Search, Gemini embeddings, and LangChain.js to provide context-aware AI responses.

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    Student Query                            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Hybrid RAG Processing                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Vector Similarity Search (Semantic)              │   │
│  │ 2. Keyword Search (BM25-like)                       │   │
│  │ 3. Metadata Filtering                               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│         Retrieved Documents (Top 5)                         │
│  - Ranked by relevance score                               │
│  - Deduplicated                                            │
│  - Compressed for context                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│         Context Building & Compression                      │
│  - Select most relevant sentences                          │
│  - Build system prompt with context                        │
│  - Limit context to 3000 characters                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│         Gemini LLM Generation                              │
│  - Generate answer using context                           │
│  - Ensure accuracy and relevance                           │
│  - Format response clearly                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│         Response with Sources                              │
│  - AI-generated answer                                     │
│  - Source documents with relevance scores                  │
│  - Key information extracted                               │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Setup Instructions

### 1. MongoDB Atlas Vector Search Index

Create a vector search index in MongoDB Atlas:

\`\`\`json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.type"
    },
    {
      "type": "filter",
      "path": "metadata.semester"
    },
    {
      "type": "filter",
      "path": "metadata.className"
    },
    {
      "type": "filter",
      "path": "metadata.subject"
    }
  ]
}
\`\`\`

**Steps:**
1. Go to MongoDB Atlas → Your Cluster → Collections
2. Select your database and collection
3. Click "Search" tab → "Create Search Index"
4. Choose "JSON Editor"
5. Paste the configuration above
6. Name it: `vector_search_index`
7. Click "Create Index"

### 2. Environment Variables

Add these to your `.env` file:

\`\`\`env
# Existing variables
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
GEMINI_API_KEY=AIzaSy...

# New RAG variables (optional)
RAG_ENABLED=true
RAG_TOP_K=5
RAG_CONTEXT_LENGTH=3000
RAG_USE_MEMORY_STORE=false
\`\`\`

### 3. Install Dependencies

The required packages are already in `package.json`:
- `@google/generative-ai` - Gemini API
- `langchain` - Text splitting and utilities
- `mongoose` - MongoDB ODM

### 4. Ingest Documents

Run the ingestion script to populate the vector database:

\`\`\`bash
npm run ingest-vectors
\`\`\`

This will:
- Connect to MongoDB
- Fetch all schedules, events, results, and general info
- Split documents into chunks
- Generate embeddings for each chunk
- Store in MongoDB Atlas Vector Search

## API Endpoints

### Vector Search Management

#### Ingest All Documents
\`\`\`
POST /api/vector-search/ingest/all
Authorization: Bearer <admin-token>
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "message": "Documents ingested successfully",
  "data": {
    "schedules": 45,
    "events": 12,
    "results": 89,
    "generalInfo": 5,
    "total": 151
  }
}
\`\`\`

#### Ingest Specific Type
\`\`\`
POST /api/vector-search/ingest/:type
Authorization: Bearer <admin-token>

Types: schedules, events, results, general-info
\`\`\`

#### Get Statistics
\`\`\`
GET /api/vector-search/stats
Authorization: Bearer <admin-token>
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "totalDocuments": 151,
    "byType": [
      { "_id": "schedule", "count": 45, "avgAccessCount": 2.3 },
      { "_id": "event", "count": 12, "avgAccessCount": 1.1 }
    ]
  }
}
\`\`\`

#### Search Documents
\`\`\`
POST /api/vector-search/search
Authorization: Bearer <user-token>

Body:
{
  "query": "What are my classes tomorrow?",
  "filters": {
    "semester": "4",
    "className": "A"
  },
  "topK": 5
}
\`\`\`

#### Generate RAG Answer
\`\`\`
POST /api/vector-search/answer
Authorization: Bearer <user-token>

Body:
{
  "query": "What are my classes tomorrow?",
  "filters": {
    "semester": "4"
  }
}
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "answer": "Based on your schedule, you have...",
    "sources": [
      {
        "content": "Class: Data Structures...",
        "type": "schedule",
        "score": 0.92
      }
    ],
    "retrievedCount": 3
  }
}
\`\`\`

#### Clear Vector Database
\`\`\`
DELETE /api/vector-search/clear
Authorization: Bearer <admin-token>
\`\`\`

## How RAG Works

### 1. Document Ingestion

When you run `npm run ingest-vectors`:

\`\`\`javascript
// Documents are split into chunks
const chunks = await textSplitter.splitText(content)

// Each chunk is embedded
for (const chunk of chunks) {
  const embedding = await embeddingService.generateEmbedding(chunk)
  // Store in MongoDB with metadata
}
\`\`\`

### 2. Query Processing

When a student asks a question:

\`\`\`javascript
// 1. Generate embedding for query
const queryEmbedding = await embeddingService.generateEmbedding(query)

// 2. Search using multiple strategies
const results = await advancedRAGService.retrieveWithMultipleStrategies(
  query,
  filters,
  topK
)

// 3. Build context from results
const context = RAGContextBuilder.buildContext(results)

// 4. Generate answer with context
const answer = await model.generateContent({
  systemInstruction: buildSystemPrompt(context),
  contents: [{ role: "user", parts: [{ text: query }] }]
})
\`\`\`

### 3. Retrieval Strategies

The system uses three complementary strategies:

**Vector Similarity Search:**
- Converts query to embedding
- Finds semantically similar documents
- Uses cosine similarity scoring
- Best for understanding intent

**Keyword Search:**
- Splits query into keywords
- Finds documents containing keywords
- Uses regex matching
- Best for exact matches

**Metadata Filtering:**
- Filters by type, semester, subject, etc.
- Combines with other strategies
- Ensures context-relevant results

### 4. Context Compression

Retrieved documents are compressed to:
- Select most relevant sentences
- Limit to 3000 characters
- Maintain key information
- Reduce token usage

## Data Models

### VectorDocument Schema

\`\`\`javascript
{
  content: String,              // Original text chunk
  embedding: [Number],          // 768-dimensional vector
  metadata: {
    type: String,               // schedule, event, result, etc.
    semester: String,
    className: String,
    subject: String,
    date: Date,
    sourceId: ObjectId,         // Reference to original document
    sourceCollection: String
  },
  chunkIndex: Number,           // Position in original document
  totalChunks: Number,          // Total chunks for this document
  accessCount: Number,          // Relevance tracking
  lastAccessed: Date,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

## Performance Optimization

### 1. Caching
- Frequently accessed documents are tracked
- `accessCount` helps identify popular content
- Consider implementing Redis caching for embeddings

### 2. Batch Processing
- Ingest documents in batches
- Use `generateBatchEmbeddings()` for multiple texts
- Reduces API calls to Gemini

### 3. Context Compression
- Limit context to 3000 characters
- Select most relevant sentences
- Reduces token usage and costs

### 4. Indexing
- MongoDB indexes on metadata fields
- Faster filtering by semester, class, subject
- Compound indexes for common queries

## Troubleshooting

### Issue: "Vector search not available"
**Solution:** Ensure MongoDB Atlas Vector Search index is created and active

### Issue: "Invalid embedding dimension"
**Solution:** Gemini embedding-001 model returns 768 dimensions. Verify model version.

### Issue: "No relevant documents found"
**Solution:** 
- Check if documents are ingested: `GET /api/vector-search/stats`
- Verify metadata filters match your data
- Try broader search without filters

### Issue: "Slow response times"
**Solution:**
- Reduce `topK` parameter
- Compress context more aggressively
- Check MongoDB connection performance
- Consider using memory store for testing

## Advanced Usage

### Custom Metadata Filtering

\`\`\`javascript
const filters = {
  type: 'schedule',
  semester: '4',
  className: 'A',
  subject: 'Data Structures'
}

const results = await advancedRAGService.retrieveWithMultipleStrategies(
  query,
  filters,
  5
)
\`\`\`

### Reranking Results

\`\`\`javascript
const results = await advancedRAGService.retrieveWithMultipleStrategies(query)
const reranked = await advancedRAGService.rerankResults(query, results)
\`\`\`

### Memory Store (Testing)

\`\`\`javascript
// Use in-memory store instead of MongoDB
advancedRAGService.useMemoryStore = true

// Useful for testing without MongoDB Atlas
\`\`\`

## Cost Optimization

### Gemini API Costs
- Embedding API: ~$0.02 per 1M tokens
- Generation API: ~$0.075 per 1M input tokens

### Optimization Tips
1. Batch embed documents during ingestion
2. Cache embeddings in Redis
3. Compress context before generation
4. Reuse embeddings for similar queries
5. Monitor `accessCount` to identify unused documents

## Next Steps

1. **Implement Caching:** Add Redis for embedding cache
2. **Add Reranking:** Use LLM to rerank results
3. **Feedback Loop:** Track which sources were helpful
4. **Analytics:** Monitor query patterns and performance
5. **Fine-tuning:** Adjust chunk size and overlap based on results

## Support

For issues or questions:
1. Check MongoDB Atlas Vector Search documentation
2. Review Gemini API documentation
3. Check LangChain.js documentation
4. Review logs in console for detailed error messages
