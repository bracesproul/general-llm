# Arxiv RAG

Preform RAG over Arxiv papers.

## Usage

Create a `.env.development.local` file in the root directory with the following content:

```shell
UNSTRUCTURED_API_KEY=<YOUR_API_KEY>
SUPABASE_PRIVATE_KEY=<YOUR_API_KEY>
SUPABASE_URL=<YOUR_URL>
```

Start a local instance of Unstructured with Docker:

```shell
docker run -p 8000:8000 -d --rm --name unstructured-api quay.io/unstructured-io/unstructured-api:latest --port 8000 --host 0.0.0.0
```

Create the following tables in Supabase:

```sql
TODO
```

Add your project ID to the Supabase generate types script:

```json
{
  "gen:supabase:types": "touch ./src/generated.ts && supabase gen types typescript --schema public > ./src/generated.ts --project-id <YOUR_PROJECT_ID>"
}
```

Build the API server:

```shell
yarn build
```

Start the API server:

```shell
yarn start:dist
```

Start the web server:

```shell
yarn dev:web
```
