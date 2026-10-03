# LWS Prisma ORM Crash Course — Setup & Command Guide

A Next.js 16 + Prisma 6 + PostgreSQL notes app. This README is a learning reference:
every command you need to set up Docker/PostgreSQL, run the project, inspect the
database, and do day-to-day work.

---

## 1. Project facts

| Item | Value |
|---|---|
| Framework | Next.js 16.2.9 (Turbopack), React 19 |
| ORM | Prisma 6.19 (client generated to `generated/prisma`) |
| Database | PostgreSQL 16 (Alpine) in a Docker container |
| Container name | `prisma-course-db` |
| Database name | `prisma_course` |
| DB credentials | user `postgres` / password `postgres` / port `5432` |
| Env file | `.env` (gitignored — never committed) |

---

## 2. One-time setup (fresh machine / after cloning)

### 2.1 Check prerequisites

```bash
docker --version    # docker installed?
docker info         # docker daemon running? (error here = start Docker)
node -v             # node installed (v24 tested)
npm -v
```

### 2.2 Get the PostgreSQL image

```bash
docker pull postgres:16-alpine
```

> **Concept:** an *image* is a blueprint; a *container* is a running instance of it.
> `16` = PostgreSQL major version, `alpine` = small base image.

### 2.3 Create the database container

```bash
docker run -d \
  --name prisma-course-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=prisma_course \
  -p 5432:5432 \
  -v prisma_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine
```

| Flag | Meaning |
|---|---|
| `-d` | run detached (background) |
| `--name` | readable name instead of a random hex ID |
| `-e` | env vars — only used on **first** boot to initialize the DB |
| `-p 5432:5432` | `host:container` port mapping |
| `-v prisma_pgdata:...` | named volume — **data survives container deletion** |
| `--restart unless-stopped` | auto-start on reboot |

### 2.4 Verify it's healthy

```bash
docker ps                                        # should list prisma-course-db, status "Up"
docker logs prisma-course-db                     # look for "database system is ready to accept connections"
docker exec -it prisma-course-db pg_isready -U postgres   # "accepting connections"
```

### 2.5 Create the env file

Create `.env` in the project root with exactly:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prisma_course?schema=public"
```

> Pattern: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
> It must mirror the `-e` flags from step 2.3.
> `.env` is ignored by `.gitignore` (`.env*`), so credentials never reach GitHub.

### 2.6 Install dependencies + generate Prisma client

```bash
npm install            # creates node_modules
npx prisma generate    # builds client into ./generated/prisma
```

> `generated/prisma` is gitignored → you MUST run `prisma generate` after every fresh
> clone and whenever `schema.prisma`'s generator block changes.

### 2.7 Create the tables (migrations)

```bash
npx prisma migrate dev
```

- Reads `prisma/schema.prisma` → writes SQL to `prisma/migrations/` → runs it on the DB.
- Asks for a migration name on first run → type `init`.
- Run this again every time you change the schema.

### 2.8 Run the app

```bash
npm run dev
# → http://localhost:3000
```

---

## 3. Day-to-day commands

### Start working

```bash
docker start prisma-course-db     # if the container isn't running
npm run dev                       # dev server (Turbopack, hot reload)
```

### npm scripts

```bash
npm run dev       # start dev server
npm run build     # production build
npm run start     # serve the production build
npm run lint      # eslint
```

### Prisma

```bash
npx prisma generate          # regenerate client (after schema generator changes / fresh clone)
npx prisma migrate dev       # apply schema changes, create migration
npx prisma migrate deploy    # apply pending migrations without prompting (CI/production)
npx prisma studio            # open DB GUI in browser → http://localhost:5555
npx prisma format            # format schema.prisma
npx prisma validate          # check schema for errors
npx prisma db pull           # introspect existing DB → update schema.prisma
npx prisma db seed           # run seed script (if configured)
```

### Docker lifecycle

```bash
docker ps                                   # running containers
docker ps -a                                # all containers (incl. stopped)
docker stop prisma-course-db                # stop (data safe in volume)
docker start prisma-course-db               # start again
docker restart prisma-course-db             # restart
docker logs -f prisma-course-db             # tail logs (Ctrl+C to exit)
docker exec -it prisma-course-db bash       # shell inside the container
docker rm -f prisma-course-db               # delete container
docker volume rm prisma_pgdata              # delete the data volume (DESTROYS DATA)
docker images                               # list images
docker system df                            # disk usage
```

**Full DB reset** (container + data, then redo 2.3 and 2.7):

```bash
docker rm -f prisma-course-db && docker volume rm prisma_pgdata
```

---

## 4. Visualize the database

### Option A — Prisma Studio (browser GUI, easiest)

```bash
npx prisma studio        # → http://localhost:5555
```

Browse/edit/delete rows of `User`, `Note`, `Tag` point-and-click. Ctrl+C to stop.
Runs alongside `npm run dev` (different port, no conflict).

### Option B — psql inside the container (CLI)

```bash
docker exec -it prisma-course-db psql -U postgres -d prisma_course
```

Inside psql:

```sql
\dt                                   -- list tables
\d "User"                             -- columns of a table
SELECT * FROM "User";
SELECT * FROM "Note";
SELECT * FROM "Tag";
SELECT * FROM "Tag" ORDER BY name;

-- relations: every note with its author and tags
SELECT n.title, u.name, array_agg(t.name)
FROM "Note" n
JOIN "User" u ON u.id = n."userId"
LEFT JOIN "_NoteToTag" nt ON nt."A" = n.id
LEFT JOIN "Tag" t ON t.id = nt."B"
GROUP BY n.title, u.name;

\q                                    -- quit
```

> **Note:** Prisma model names become quoted PascalCase table names — always write
> `"User"`, not `user`.

One-liner (non-interactive):

```bash
docker exec prisma-course-db psql -U postgres -d prisma_course -c 'SELECT * FROM "User";'
```

### Option C — GUI client (DBeaver / pgAdmin / TablePlus)

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `prisma_course` |
| User | `postgres` |
| Password | `postgres` |
| SSL | disable |

---

## 5. Git

```bash
git status
git add -A
git commit -m "your message"
git push                    # pushes main → origin (navinxqz/base-prisma)

git remote -v               # origin = your repo, upstream = course repo
git fetch upstream          # fetch updates from the original course repo
```

Committed: source code. Ignored: `.env`, `node_modules/`, `.next/`, `generated/prisma/`.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE` on port 3000 | another process on 3000 | `ss -ltn \| grep 3000`, kill it or use `npm run dev -- -p 3001` |
| `EADDRINUSE` on 5432 | another postgres/Docker container | `ss -ltn \| grep 5432` → free it, or map `-p 5433:5432` and update `.env` |
| `password authentication failed` | `.env` ≠ container `-e` values | make them match (step 2.3 vs 2.5) |
| `relation "User" does not exist` | migrations never ran | `npx prisma migrate dev` |
| Prisma client import error | `generated/prisma` missing | `npx prisma generate` |
| `Cannot find module 'dotenv'` | partial install | `npm install` |
| `docker: Cannot connect to the Docker daemon` | daemon not running | start Docker (`sudo systemctl start docker` on Linux) |
| Container exits immediately | bad init env vars | `docker logs prisma-course-db`, then recreate it |
| `Token not found` stack trace in console | user not logged in | **expected noise**, not an error |

---

## 7. Concepts cheat sheet

```
image      = recipe (postgres:16-alpine)
container  = running instance of an image (prisma-course-db)
volume     = persistent data outside the container (prisma_pgdata)
port map   = host 5432 → container 5432
.env       = how the app finds the DB (DATABASE_URL)
migrations = versioned SQL generated from schema.prisma
prisma generate = compiles schema.prisma → typed client code
studio     = GUI to look at rows (port 5555)
```
