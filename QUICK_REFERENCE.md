# UniAIChat RAG System - Quick Reference

## Essential Commands

\`\`\`bash
# Setup
npm install                    # Install dependencies
npm run seed-database         # Populate database with sample data
npm run ingest-vectors        # Generate embeddings and ingest into vector DB
npm run test-vectors          # Test the entire RAG system
npm run dev                   # Start backend server
\`\`\`

## System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Student Question                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Embedding Service (Gemini API)                  │
│    Converts text to 768-dimensional vectors            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│      MongoDB Atlas Vector Search                        │
│    Finds similar documents using cosine similarity     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         RAG Context Builder                             │
│    Formats retrieved documents as context              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│      Gemini LLM (Text Generation)                       │
│    Generates answer using context                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Context-Aware Answer + Sources                  │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Key Files

| File | Purpose |
|------|---------|
| `services/embeddingService.js` | Generate embeddings using Gemini API |
| `services/ragService.js` | Core RAG logic and vector search |
| `services/advancedRAGService.js` | Multi-strategy retrieval |
| `utils/documentIngestionHelper.js` | Format and ingest documents |
| `utils/ragContextBuilder.js` | Build context from retrieved docs |
| `scripts/seedDatabase.js` | Populate database with sample data |
| `scripts/ingestVectors.js` | Ingest documents into vector DB |
| `scripts/testVectorSearch.js` | Test RAG system |

## Database Collections

| Collection | Purpose | Documents |
|-----------|---------|-----------|
| `schedules` | Classes, exams, assignments, quizzes | 5 sample |
| `events` | University events and announcements | 3 sample |
| `results` | Student grades and results | 3 sample |
| `generalinfos` | Fees, policies, holidays, facilities | 4 sample |
| `vectordocuments` | Embeddings and vectors | Auto-generated |

## Environment Variables

\`\`\`
MONGO_URI              MongoDB connection string
GEMINI_API_KEY         Google Gemini API key
JWT_SECRET             JWT signing secret
PORT                   Server port (default: 5000)
NODE_ENV               Environment (development/production)
\`\`\`

## API Endpoints

\`\`\`
POST /api/chat/message              Send message to AI
POST /api/vector-search/search      Search documents
POST /api/vector-search/answer      Generate RAG answer
GET  /api/vector-search/stats       Get statistics
POST /api/vector-search/ingest/all  Ingest all documents
\`\`\`

## Troubleshooting Checklist

- [ ] MongoDB Atlas cluster is running
- [ ] Vector search index is created and built
- [ ] Gemini API key is valid and has quota
- [ ] Environment variables are set in .env
- [ ] Database has sample data (run seed-database)
- [ ] Vectors are ingested (run ingest-vectors)
- [ ] All tests pass (run test-vectors)

## Performance Metrics

- **Embedding Generation**: ~500ms per document
- **Vector Search**: ~50ms for 3 results
- **LLM Generation**: ~2-3 seconds per answer
- **Total Response Time**: ~3-4 seconds

## Rate Limits (Free Tier)

- Gemini API: 15 requests/minute
- MongoDB Atlas: Depends on cluster tier
- Recommended: Batch operations and cache results
