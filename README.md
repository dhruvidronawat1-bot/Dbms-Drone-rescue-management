# AeroRescue database project

A disaster-relief coordination interface with a React frontend and a Spring Boot REST API. The hosted demo uses PostgreSQL through JDBC.

## Project layout

- `frontend/` — React and Vite interface
- `backend/` — Spring Boot API and PostgreSQL JDBC connection
- `database/postgres-schema.sql` — schema for the deployed app, with synthetic demo records
- `database/Part3_SQL_Implementation.sql` and `database/Part3_SQL_Supplement.sql` — original Oracle coursework scripts, preserved as submitted
- `.env.example` — sample local PostgreSQL settings

## Requirements

- Node.js 20 or newer and npm
- Java 17 or newer
- Maven 3.9 or newer
- PostgreSQL database (Neon is an option for the free hosted demo)

## Configure the database

1. Create a PostgreSQL database. Neon offers a free plan with no credit card required.
2. Open the database SQL editor and run `database/postgres-schema.sql`. It creates the tables and view used by the API and inserts synthetic training data only.
3. Set `DB_USER`, `DB_PASSWORD`, and `DB_URL` in Render (or in a private local `.env`). For Neon, set `DB_URL` to `jdbc:postgresql://YOUR_HOST/YOUR_DATABASE?sslmode=require`, using the host and database name from Neon’s connection details. Put the Neon username and password in their matching variables. Keep credentials out of Git and chat.

The Oracle coursework files demonstrate Oracle-specific SQL and PL/SQL. They are preserved and are not the schema to run on Neon.

The local sample JDBC URL is `jdbc:postgresql://localhost:5432/aero_rescue`.

## Run locally

Open two terminals from the project root.

Backend:

```sh
mvn -f backend/pom.xml spring-boot:run
```

Frontend:

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Vite forwards `/api` requests to the backend on port 8080. The API connection check is `http://localhost:8080/api/health`.

## Deploy as a demo

The repository includes a multi-stage `Dockerfile` and `render.yaml` for a single-service Render demo. Create a Blueprint from this repository and provide `DB_URL`, `DB_USER`, and `DB_PASSWORD` when prompted. Use the Neon connection details. Render documents secret prompts in its [Blueprint guide](https://render.com/docs/blueprint-spec). Never commit real credentials.

Render's free web services can spin down when idle. Its free database option expires after 30 days, so Neon is the suggested database for this demo. Render says free services are for testing and hobby projects rather than production; see [Render's free service limits](https://render.com/docs/free).

## API endpoints

- `GET /api/health` — verifies the PostgreSQL connection
- `GET /api/stats` — dashboard counts
- `GET /api/camps` — relief camp capacity
- `GET /api/victims` — registered victims
- `POST /api/victims` — register a victim

