from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth import seed_admin
from app.config import settings
from app.database import engine, Base, async_session
from app.routers import rfis, workspaces, auth, submissions, orgs, admin_db, analytics, admin_audit, admin_backups


MIGRATIONS = [
    "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'private'",
    "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE SET NULL",
    "ALTER TABLE rfis ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE rfis ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ",
    "ALTER TABLE rfis ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ",
    "ALTER TABLE rfis ADD COLUMN IF NOT EXISTS max_responses INTEGER",
    "ALTER TABLE rfis ADD COLUMN IF NOT EXISTS thank_you_message TEXT",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if len(settings.JWT_SECRET) < 32:
        raise RuntimeError("JWT_SECRET must be set to a random string of at least 32 characters")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all never alters existing tables; add columns introduced after first deploy.
        for stmt in MIGRATIONS:
            await conn.execute(text(stmt))
    async with async_session() as db:
        await seed_admin(db)
    yield


app = FastAPI(title="RFI System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3200",
        "https://tosmonline0001.ttu.edu",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(orgs.router)
app.include_router(admin_db.router)
app.include_router(analytics.router)
app.include_router(admin_audit.router)
app.include_router(admin_backups.router)
app.include_router(rfis.router)
app.include_router(workspaces.router)
app.include_router(submissions.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
