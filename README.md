# AeroRescue database project

A disaster-relief coordination interface with a React frontend and a Spring Boot backend that connects to Oracle Database through JDBC.

## Project layout

- `frontend/` — React and Vite interface
- `backend/` — Spring Boot REST API and Oracle JDBC connection
- `database/` — Oracle schema and supplemental SQL scripts
- `.env.example` — sample local database settings (copy to `.env` and edit locally)

## Requirements

- Node.js 20 or newer and npm
- Java 17 or newer
- Maven 3.9 or newer
- Oracle Database (XE/Free or another Oracle instance)

## Configure the database

1. Run `database/Part3_SQL_Implementation.sql` and then `database/Part3_SQL_Supplement.sql` in an existing Oracle schema. The implementation script creates the project tables, sequence, views, and database routines; it does not create a database user or load sample personal records.
2. Copy `.env.example` to `.env` in the project root.
3. Set `DB_USER`, `DB_PASSWORD`, and `DB_URL` in `.env` for your Oracle schema. Keep `.env` private; Git ignores it.

The local sample JDBC URL is `jdbc:oracle:thin:@localhost:1521/XEPDB1`.

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

The repository includes a multi-stage `Dockerfile` and `render.yaml` for a single-service Render demo. In Render, create a Blueprint from this repository and provide `DB_URL`, `DB_USER`, and `DB_PASSWORD` when prompted. Set those values to a hosted Oracle database and allow the Render service's outbound IP ranges in the database network ACL. Never commit real credentials.

Render's free web services can spin down when idle and take time to wake up; Render says free instances are for testing and hobby projects rather than production. See [Render's free service limits](https://render.com/docs/free).

## API endpoints

- `GET /api/health` — verifies the Oracle connection
- `GET /api/stats` — dashboard counts
- `GET /api/camps` — relief camp capacity
- `GET /api/victims` — registered victims
- `POST /api/victims` — register a victim