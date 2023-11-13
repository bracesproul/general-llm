# Arxiv RAG

## Introduction
Arxiv RAG is a web application and API designed for generating notes and answering questions on Arxiv papers using Large Language Models (LLMs). This project leverages the Unstructured API for parsing and chunking PDFs and Supabase for the PostgreSQL database and querying embeddings.

## Setup

### Prerequisites
- Docker
- Node.js
- Yarn package manager
- Supabase account

### Environment Configuration
Create a `.env.development.local` file in the root directory with the following content:

```shell
UNSTRUCTURED_API_KEY=<YOUR_API_KEY>
SUPABASE_PRIVATE_KEY=<YOUR_API_KEY>
SUPABASE_URL=<YOUR_URL>
```

### Starting Unstructured with Docker

Start a local instance of Unstructured with the following Docker command:

```shell
docker run -p 8000:8000 -d --rm --name unstructured-api quay.io/unstructured-io/unstructured-api:latest --port 8000 --host 0.0.0.0
```

### Database Setup in Supabase

Execute the following SQL commands in your Supabase project to set up the required database structure:

```sql
-- Enable the pgvector extension
create extension vector;

-- Create tables for storing Arxiv papers, embeddings, and question answering data
CREATE TABLE arxiv_papers (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  paper TEXT,
  arxiv_url TEXT,
  notes JSONB[],
  name TEXT
);

CREATE TABLE arxiv_embeddings (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  content TEXT,
  embedding TEXT,
  metadata JSONB
);

CREATE TABLE arxiv_question_answering (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  question TEXT,
  answer TEXT,
  followup_questions TEXT[],
  context TEXT
);

-- Create a function for document matching
create function match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  embedding jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    (embedding::text)::jsonb as embedding,
    1 - (arxiv_embeddings.embedding <=> query_embedding) as similarity
  from arxiv_embeddings
  where metadata @> filter
  order by arxiv_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

### Supabase Type Generation

Add your project ID to the Supabase generate types script in package.json:

```json
{
  "gen:supabase:types": "touch ./src/generated.ts && supabase gen types typescript --schema public > ./src/generated.ts --project-id <YOUR_PROJECT_ID>"
}
```

## Running the Application

### Build the API Server

```shell
yarn build
```

### Start the API Server

```shell
yarn start
```

### Start the Web Server

```shell
yarn dev:web
```