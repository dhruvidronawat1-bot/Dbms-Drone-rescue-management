# AeroRescue database project

A disaster-relief coordination interface with a React frontend and a Spring Boot backend that connects to Oracle Database through JDBC.

## Project layout

- `frontend/` — React and Vite interface
- `backend/` — Spring Boot REST API and Oracle JDBC connection
- `database/` — Oracle SQL implementation scripts
- `.env.example` — sample local database settings (copy to `.env` and edit locally)

## Requirements

- Node.js 20 or newer and npm
- Java 17 or newer
- Maven 3.9 or newer
- Oracle Database (XE/Free or another Oracle instance)

## Configure the database

1. Run the SQL scripts in `database/` in an existing Oracle schema, starting with `Part3_SQL_Implementation.sql` and then `Part3_SQL_Supplement.sql`. The scripts define the schema without creating database users or loading sample personal records.
2. Copy `.env.example` to `.env` in the project root.
3. Set `DB_USER`, `DB_PASSWORD`, and `DB_URL` in `.env` to match your Oracle setup. Keep `.env` private; it is ignored by Git.

The default JDBC URL in the sample is `jdbc:oracle:thin:@localhost:1521/XEPDB1`.

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

Open the local URL printed by Vite. Vite forwards `/api` requests to the backend on port 8080. Check the JDBC connection at `http://localhost:8080/api/health`.

## API endpoints

- `GET /api/health` — verifies the Oracle connection
- `GET /api/stats` — dashboard counts
- `GET /api/camps` — relief camp capacity
- `GET /api/victims` — registered victims
- `POST /api/victims` — register a victim

