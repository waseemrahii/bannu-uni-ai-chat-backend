# Vector Search Architecture & RAG Flow

## System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT CHAT INTERFACE                      │
│                                                                 │
│  "What are my classes tomorrow?"                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT CONTROLLER                              │
│  - Receive message                                              │
│  - Authenticate user                                            │
│  - Route to RAG or intent handler                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RAG AI HELPER (Hybrid)                         │
│  - Try RAG first                                                │
│  - If no results → Fallback to intent handlers                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              EMBEDDING SERVICE (Gemini API)                     │
│  - Convert query to 768-dimensional vector                      │
│  - Input: "What are my classes tomorrow?"                       │
│  - Output: [0.123, -0.456, 0.789, ..., 0.234]                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           ADVANCED RAG SERVICE (Multi-Strategy)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Strategy 1: Vector Similarity Search                    │   │
│  │ - Query vector vs stored vectors                        │   │
│  │ - Cosine similarity calculation                         │   │
│  │ - Top-K results (K=5)                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Strategy 2: Keyword Search                              │   │
│  │ - Regex pattern matching                                │   │
│  │ - Case-insensitive search                               │   │
│  │ - Lower relevance score (0.5)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Strategy 3: Metadata Filtering                          │   │
│  │ - Filter by semester, class, subject                    │   │
│  │ - Lowest relevance score (0.3)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Combine & Deduplicate                                   │   │
│  │ - Merge results from all strategies                     │   │
│  │ - Remove duplicates                                     │   │
│  │ - Sort by relevance score                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           MONGODB ATLAS VECTOR SEARCH                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ $search aggregation pipeline:                           │   │
│  │ {                                                        │   │
│  │   $search: {                                             │   │
│  │     cosmosSearch: false,  // MongoDB Atlas              │   │
│  │     vector: [0.123, -0.456, ...],                       │   │
│  │     k: 5,                                                │   │
│  │     path: "embedding"                                    │   │
│  │   }                                                      │   │
│  │ }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Cosine Similarity Calculation:                          │   │
│  │ similarity = (A · B) / (||A|| × ||B||)                  │   │
│  │                                                          │   │
│  │ Returns top 5 documents with scores:                    │   │
│  │ 1. Operating Systems (0.95)                             │   │
│  │ 2. Database Systems (0.87)                              │   │
│  │ 3. Web Development (0.82)                               │   │
│  │ 4. Data Structures (0.78)                               │   │
│  │ 5. Algorithms (0.71)                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              RAG CONTEXT BUILDER                                │
│  - Extract content from retrieved documents                     │
│  - Build context string (max 3000 chars)                        │
│  - Include metadata and relevance scores                        │
│  - Format for LLM consumption                                   │
│                                                                 │
│  Context:                                                       │
│  [Source 1 - schedule]                                          │
│  Schedule: Operating Systems                                    │
│  Time: 09:00 AM - 10:30 AM                                      │
│  Room: Lab-101                                                  │
│  [Relevance: 95.0%]                                             │
│                                                                 │
│  [Source 2 - schedule]                                          │
│  Schedule: Database Systems                                     │
│  Time: 10:30 AM - 12:00 PM                                      │
│  Room: Lab-102                                                  │
│  [Relevance: 87.0%]                                             │
│  ...                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              GEMINI LLM (Answer Generation)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ System Prompt:                                           │   │
│  │ "You are a helpful university assistant. Use the        │   │
│  │  provided context to answer the student's question      │   │
│  │  accurately and helpfully."                             │   │
│  │                                                          │   │
│  │ Context: [Retrieved documents]                          │   │
│  │                                                          │   │
│  │ User Query: "What are my classes tomorrow?"             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Gemini generates answer:                                │   │
│  │ "Your classes tomorrow are:                             │   │
│  │  1. Operating Systems (9:00 AM - 10:30 AM, Lab-101)    │   │
│  │  2. Database Systems (10:30 AM - 12:00 PM, Lab-102)    │   │
│  │  3. Web Development (2:00 PM - 3:30 PM, Lab-103)"      │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE FORMATTER                           │
│  - Answer: Generated response from Gemini                       │
│  - Sources: Retrieved documents with metadata                   │
│  - Retrieved Count: Number of documents used                    │
│  - Key Info: Extracted metadata (dates, subjects, etc.)         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STUDENT RECEIVES ANSWER                        │
│                                                                 │
│  Answer: "Your classes tomorrow are..."                         │
│  Sources: [3 documents with relevance scores]                   │
│  Key Info: Subjects, times, rooms                               │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## Data Flow: Document Ingestion

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│              DATABASE COLLECTIONS                            │
│  - Schedule (450 documents)                                  │
│  - Event (200 documents)                                     │
│  - Result (350 documents)                                    │
│  - GeneralInfo (250 documents)                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│         DOCUMENT INGESTION HELPER                            │
│  - Fetch all documents from collections                      │
│  - Format content (title, subject, date, etc.)               │
│  - Extract metadata (type, semester, class, subject)         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│         TEXT SPLITTER (LangChain)                            │
│  - Split documents into chunks (1000 chars)                  │
│  - Overlap: 200 chars (for context preservation)             │
│  - Separators: \n\n, \n, ., space                            │
│                                                              │
│  Example:                                                    │
│  Document: "Schedule: Operating Systems..."                 │
│  Chunk 1: "Schedule: Operating Systems\nSubject: OS..."     │
│  Chunk 2: "...Time: 09:00 AM - 10:30 AM\nRoom: Lab-101"    │
│  Chunk 3: "...Teacher: Dr. Ahmed"                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│      EMBEDDING SERVICE (Gemini API)                          │
│  - For each chunk, generate embedding                        │
│  - Model: embedding-001                                      │
│  - Dimensions: 768                                           │
│  - Rate limit: 15 requests/minute (free tier)                │
│                                                              │
│  Chunk: "Schedule: Operating Systems..."                     │
│  Embedding: [0.123, -0.456, 0.789, ..., 0.234]              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│      VECTOR DOCUMENT MODEL                                   │
│  - content: Chunk text                                       │
│  - embedding: 768-dimensional vector                         │
│  - metadata: {type, semester, class, subject, date}          │
│  - chunkIndex: Position in original document                 │
│  - totalChunks: Total chunks for this document               │
│  - accessCount: Number of times retrieved                    │
│  - lastAccessed: Last retrieval timestamp                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│      MONGODB ATLAS VECTOR COLLECTION                         │
│  - Store all vector documents                                │
│  - Create vector search index                                │
│  - Index name: vector_search_index                           │
│  - Path: embedding                                           │
│  - Similarity: cosine                                        │
│                                                              │
│  Total Documents: 1,250+ (after ingestion)                   │
│  By Type:                                                    │
│  - schedule: 450+                                            │
│  - event: 200+                                               │
│  - result: 350+                                              │
│  - general_info: 250+                                        │
└──────────────────────────────────────────────────────────────┘
\`\`\`

## Vector Search Query Process

\`\`\`
Query: "What are my classes tomorrow?"
    │
    ├─ Step 1: Generate Query Embedding
    │  Input: "What are my classes tomorrow?"
    │  Output: [0.100, -0.450, 0.800, ..., 0.234]
    │
    ├─ Step 2: Build Search Pipeline
    │  {
    │    $search: {
    │      cosmosSearch: false,
    │      vector: [0.100, -0.450, 0.800, ...],
    │      k: 5,
    │      returnScore: true,
    │      path: "embedding"
    │    }
    │  }
    │
    ├─ Step 3: Calculate Cosine Similarity
    │  For each stored vector:
    │    similarity = (query · stored) / (||query|| × ||stored||)
    │
    │  Results:
    │  - Doc 1: 0.95 (very similar)
    │  - Doc 2: 0.87 (similar)
    │  - Doc 3: 0.82 (somewhat similar)
    │  - Doc 4: 0.78 (somewhat similar)
    │  - Doc 5: 0.71 (slightly similar)
    │
    ├─ Step 4: Apply Metadata Filters
    │  Filter by: semester = "4", className = "A"
    │
    ├─ Step 5: Return Top-K Results
    │  Return top 5 documents with scores
    │
    └─ Step 6: Build Context
       Combine all documents into context string
\`\`\`

## Hybrid Approach: RAG + Intent Handlers

\`\`\`
Student Message
    │
    ├─ Try RAG First
    │  ├─ Generate embedding
    │  ├─ Search vector database
    │  ├─ If documents found (count > 0)
    │  │  └─ Use RAG answer ✓
    │  └─ If no documents found
    │     └─ Continue to fallback
    │
    └─ Fallback to Intent Handlers
       ├─ Detect intent (regex + AI)
       ├─ Route to specific handler
       │  ├─ ClassScheduleHandler
       │  ├─ AssignmentHandler
       │  ├─ ResultHandler
       │  ├─ EventHandler
       │  └─ etc.
       └─ Return intent-based answer
\`\`\`

## Performance Metrics

### Embedding Generation
- **Time**: ~500ms per request (Gemini API)
- **Dimensions**: 768
- **Rate Limit**: 15 requests/minute (free tier)

### Vector Search
- **Time**: ~100-200ms (MongoDB Atlas)
- **Complexity**: O(n) for linear search, O(log n) with index
- **Top-K**: Typically 5 results

### Answer Generation
- **Time**: ~1-2 seconds (Gemini LLM)
- **Model**: gemini-2.0-flash
- **Context Size**: Max 3000 characters

### Total Response Time
- **Average**: 2-3 seconds
- **Breakdown**:
  - Embedding: 500ms
  - Vector Search: 150ms
  - Context Building: 50ms
  - Answer Generation: 1500ms
  - Formatting: 50ms

## Cost Analysis (Free Tier)

### Gemini API
- **Embedding**: 15 requests/minute, 1,500/day
- **Text Generation**: 15 requests/minute, 1,500/day
- **Cost**: Free

### MongoDB Atlas
- **Storage**: 512MB free tier
- **Vector Search**: Included
- **Cost**: Free (with limitations)

### Estimated Usage
- **Per Chat**: 2 API calls (embedding + generation)
- **Daily Capacity**: 750 chats (1,500 requests / 2)
- **Monthly**: ~22,500 chats

## Optimization Strategies

### 1. Caching
\`\`\`javascript
// Cache embeddings to reduce API calls
const cache = new Map()
if (cache.has(text)) return cache.get(text)
const embedding = await generateEmbedding(text)
cache.set(text, embedding)
\`\`\`

### 2. Batch Processing
\`\`\`javascript
// Process multiple documents in batches
for (let i = 0; i < docs.length; i += 5) {
  const batch = docs.slice(i, i + 5)
  await Promise.all(batch.map(ingestDocument))
  await sleep(1000) // Rate limit
}
\`\`\`

### 3. Memory Store Fallback
\`\`\`javascript
// Use in-memory store when API unavailable
if (apiUnavailable) {
  advancedRAGService.useMemoryStore = true
}
\`\`\`

### 4. Context Compression
\`\`\`javascript
// Select only most relevant sentences
const topSentences = sentences
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
\`\`\`

## Monitoring & Debugging

### Check Vector Database Stats
\`\`\`bash
GET /api/vector-search/stats
\`\`\`

### Test Vector Search
\`\`\`bash
POST /api/vector-search/search
{
  "query": "test query",
  "topK": 5
}
\`\`\`

### Monitor Logs
\`\`\`
[RAGService] Ingesting document: schedule
[RAGService] Split into 3 chunks
[RAGService] Saved 3 vector documents
[RAGService] Retrieving documents for query: What are my classes?
[RAGService] Retrieved 5 documents
\`\`\`

## Summary

Your RAG system provides:
1. ✅ Semantic search using vector embeddings
2. ✅ Multi-strategy retrieval (vector + keyword + metadata)
3. ✅ Context-aware answer generation
4. ✅ Source attribution
5. ✅ Fallback to intent handlers
6. ✅ Free tier support with rate limiting
7. ✅ Scalable architecture
