from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    set_auth_cookie,
    clear_auth_cookie,
    get_current_user,
    get_current_admin,
    generate_reset_token,
)

# --------- DB ---------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# --------- App ---------
app = FastAPI(title="World Cup Predictor API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wc-api")


# ---------- Models ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=50)
    country: str = Field(min_length=2, max_length=60)
    country_code: str = Field(min_length=2, max_length=3)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    country: str
    country_code: str
    role: str
    avatar_url: Optional[str] = None
    total_points: int = 0
    created_at: str


class MatchPredictionIn(BaseModel):
    home_score: int = Field(ge=0, le=20)
    away_score: int = Field(ge=0, le=20)
    motm: str = Field(default="", max_length=80)


class AwardsPredictionIn(BaseModel):
    golden_boot: str = Field(default="", max_length=80)
    golden_glove: str = Field(default="", max_length=80)
    player_of_tournament: str = Field(default="", max_length=80)
    fair_play: str = Field(default="", max_length=80)


class MatchResultIn(BaseModel):
    home_score: int = Field(ge=0, le=20)
    away_score: int = Field(ge=0, le=20)
    motm: str = Field(default="", max_length=80)


class AwardWinnersIn(BaseModel):
    golden_boot: str = ""
    golden_glove: str = ""
    player_of_tournament: str = ""
    fair_play: str = ""


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def user_to_public(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "country": user.get("country", ""),
        "country_code": user.get("country_code", ""),
        "role": user.get("role", "user"),
        "avatar_url": user.get("avatar_url"),
        "total_points": user.get("total_points", 0),
        "created_at": user.get("created_at", ""),
    }


def calc_points(pred: dict, result: dict) -> int:
    pts = 0
    p_home, p_away = pred.get("home_score"), pred.get("away_score")
    r_home, r_away = result.get("home_score"), result.get("away_score")
    if p_home is None or r_home is None:
        return 0
    # winner
    pred_winner = "home" if p_home > p_away else ("away" if p_away > p_home else "draw")
    real_winner = "home" if r_home > r_away else ("away" if r_away > r_home else "draw")
    if pred_winner == real_winner:
        pts += 3
    # exact score bonus
    if p_home == r_home and p_away == r_away:
        pts += 2
    # MOTM
    if pred.get("motm") and result.get("motm") and pred["motm"].strip().lower() == result["motm"].strip().lower():
        pts += 1
    return pts


# ============ Auth Routes ============
@api.post("/auth/register")
async def register(payload: UserCreate, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "country": payload.country.strip(),
        "country_code": payload.country_code.upper().strip(),
        "role": "user",
        "avatar_url": None,
        "total_points": 0,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"user": user_to_public(user), "token": token}


@api.post("/auth/login")
async def login(payload: UserLogin, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user.get("role", "user"))
    set_auth_cookie(response, token)
    return {"user": user_to_public(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request, db)
    return user_to_public(user)


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        # silent success
        return {"ok": True, "message": "If account exists, a reset link was generated"}
    token = generate_reset_token()
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["id"],
        "used": False,
        "expires_at": (datetime.now(timezone.utc).timestamp() + 3600),
        "created_at": now_iso(),
    })
    logger.info(f"[PASSWORD RESET] {email} -> token: {token}")
    return {"ok": True, "reset_token": token}  # return token in response for demo


@api.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if rec["expires_at"] < datetime.now(timezone.utc).timestamp():
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


# ============ Matches ============
@api.get("/matches")
async def list_matches(stage: Optional[str] = None, group: Optional[str] = None):
    q = {}
    if stage:
        q["stage"] = stage
    if group:
        q["group"] = group
    matches = await db.matches.find(q, {"_id": 0}).sort("match_no", 1).to_list(200)
    return matches


@api.get("/matches/{match_no}")
async def get_match(match_no: int):
    m = await db.matches.find_one({"match_no": match_no}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


# ============ Predictions ============
@api.get("/predictions/me")
async def my_predictions(request: Request):
    user = await get_current_user(request, db)
    preds = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return preds


@api.post("/predictions/{match_no}")
async def submit_prediction(match_no: int, payload: MatchPredictionIn, request: Request):
    user = await get_current_user(request, db)
    match = await db.matches.find_one({"match_no": match_no})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    # lock if kickoff passed
    try:
        kickoff = datetime.fromisoformat(match["time"])
        if kickoff.tzinfo is None:
            kickoff = kickoff.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= kickoff:
            raise HTTPException(status_code=400, detail="Match already started; predictions locked")
    except (ValueError, KeyError):
        pass
    doc = {
        "user_id": user["id"],
        "match_no": match_no,
        "home_score": payload.home_score,
        "away_score": payload.away_score,
        "motm": payload.motm.strip(),
        "updated_at": now_iso(),
        "points": 0,
        "scored": False,
    }
    await db.predictions.update_one(
        {"user_id": user["id"], "match_no": match_no},
        {"$set": doc, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


# ============ Awards ============
@api.get("/awards/me")
async def my_awards(request: Request):
    user = await get_current_user(request, db)
    rec = await db.award_predictions.find_one({"user_id": user["id"]}, {"_id": 0})
    return rec or {}


@api.post("/awards/me")
async def submit_awards(payload: AwardsPredictionIn, request: Request):
    user = await get_current_user(request, db)
    # lock awards: if any match started -> locked? user said before first match begins
    first_match = await db.matches.find_one({}, sort=[("match_no", 1)])
    if first_match:
        try:
            kickoff = datetime.fromisoformat(first_match["time"])
            if kickoff.tzinfo is None:
                kickoff = kickoff.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) >= kickoff:
                raise HTTPException(status_code=400, detail="Awards locked: first match started")
        except (ValueError, KeyError):
            pass
    doc = {
        "user_id": user["id"],
        **payload.model_dump(),
        "updated_at": now_iso(),
        "points": 0,
        "scored": False,
    }
    await db.award_predictions.update_one(
        {"user_id": user["id"]},
        {"$set": doc, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.get("/awards/winners")
async def get_award_winners():
    rec = await db.award_winners.find_one({"_id": "winners"}, {"_id": 0})
    return rec or {}


# ============ Teams & Stadiums ============
@api.get("/teams")
async def list_teams():
    return await db.teams.find({}, {"_id": 0}).sort("name", 1).to_list(100)


@api.get("/teams/{name}")
async def get_team(name: str):
    team = await db.teams.find_one({"name": name}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    fixtures = await db.matches.find(
        {"$or": [{"home": name}, {"away": name}]}, {"_id": 0}
    ).sort("match_no", 1).to_list(100)
    return {"team": team, "fixtures": fixtures}


@api.get("/stadiums")
async def list_stadiums():
    return await db.stadiums.find({}, {"_id": 0}).sort("name", 1).to_list(50)


@api.get("/stadiums/{name}")
async def get_stadium(name: str):
    s = await db.stadiums.find_one({"name": name}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Stadium not found")
    fixtures = await db.matches.find({"stadium": name}, {"_id": 0}).sort("match_no", 1).to_list(100)
    return {"stadium": s, "fixtures": fixtures}


# ============ Leaderboard ============
@api.get("/leaderboard")
async def leaderboard(scope: Literal["global", "country", "weekly"] = "global", country: Optional[str] = None):
    match_q = {}
    if scope == "country" and country:
        match_q["country_code"] = country.upper()
    pipeline = []
    if match_q:
        pipeline.append({"$match": match_q})
    pipeline += [
        {"$sort": {"total_points": -1, "name": 1}},
        {"$limit": 100},
        {"$lookup": {
            "from": "predictions",
            "let": {"uid": "$id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$user_id", "$$uid"]}}},
                {"$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "scored": {"$sum": {"$cond": ["$scored", 1, 0]}},
                    "correct": {"$sum": {"$cond": [{"$and": ["$scored", {"$gt": ["$points", 0]}]}, 1, 0]}},
                }},
            ],
            "as": "pred_stats",
        }},
        {"$addFields": {
            "predictions_made": {"$ifNull": [{"$arrayElemAt": ["$pred_stats.total", 0]}, 0]},
            "scored_count": {"$ifNull": [{"$arrayElemAt": ["$pred_stats.scored", 0]}, 0]},
            "correct_count": {"$ifNull": [{"$arrayElemAt": ["$pred_stats.correct", 0]}, 0]},
        }},
        {"$addFields": {
            "accuracy": {"$cond": [
                {"$gt": ["$scored_count", 0]},
                {"$round": [{"$multiply": [{"$divide": ["$correct_count", "$scored_count"]}, 100]}, 1]},
                0.0,
            ]},
        }},
        {"$project": {
            "_id": 0, "id": 1, "name": 1, "country": 1, "country_code": 1,
            "total_points": 1, "avatar_url": 1, "predictions_made": 1, "accuracy": 1,
        }},
    ]
    return await db.users.aggregate(pipeline).to_list(100)


# ============ Admin ============
@api.get("/admin/users")
async def admin_users(request: Request):
    await get_current_admin(request, db)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@api.post("/admin/matches/{match_no}/result")
async def admin_set_result(match_no: int, payload: MatchResultIn, request: Request):
    await get_current_admin(request, db)
    match = await db.matches.find_one({"match_no": match_no})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    result = {
        "home_score": payload.home_score,
        "away_score": payload.away_score,
        "motm": payload.motm.strip(),
        "finalized_at": now_iso(),
    }
    await db.matches.update_one({"match_no": match_no}, {"$set": {"result": result, "status": "finished"}})
    # score predictions
    preds = await db.predictions.find({"match_no": match_no}).to_list(100000)
    if not preds:
        return {"ok": True, "scored_predictions": 0}

    from pymongo import UpdateOne
    # 1) Bulk update predictions
    pred_ops = []
    user_ids = set()
    for p in preds:
        pts = calc_points(p, result)
        pred_ops.append(UpdateOne({"_id": p["_id"]}, {"$set": {"points": pts, "scored": True}}))
        user_ids.add(p["user_id"])
    if pred_ops:
        await db.predictions.bulk_write(pred_ops, ordered=False)

    user_ids = list(user_ids)
    # 2) Single aggregation: total scored match points per affected user
    totals = await db.predictions.aggregate([
        {"$match": {"user_id": {"$in": user_ids}, "scored": True}},
        {"$group": {"_id": "$user_id", "total": {"$sum": "$points"}}},
    ]).to_list(len(user_ids))
    match_totals = {row["_id"]: row["total"] for row in totals}
    # 3) One query for all award points
    award_rows = await db.award_predictions.find(
        {"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "points": 1}
    ).to_list(len(user_ids))
    award_totals = {row["user_id"]: row.get("points", 0) for row in award_rows}
    # 4) Bulk update users
    user_ops = [
        UpdateOne({"id": uid}, {"$set": {"total_points": match_totals.get(uid, 0) + award_totals.get(uid, 0)}})
        for uid in user_ids
    ]
    if user_ops:
        await db.users.bulk_write(user_ops, ordered=False)
    return {"ok": True, "scored_predictions": len(preds)}


@api.post("/admin/awards/winners")
async def admin_set_award_winners(payload: AwardWinnersIn, request: Request):
    await get_current_admin(request, db)
    winners = payload.model_dump()
    await db.award_winners.update_one(
        {"_id": "winners"},
        {"$set": {**winners, "finalized_at": now_iso()}},
        upsert=True,
    )
    # score award predictions
    preds = await db.award_predictions.find({}).to_list(100000)
    if not preds:
        return {"ok": True, "scored": 0}

    fields = ["golden_boot", "golden_glove", "player_of_tournament", "fair_play"]
    points_map = {"golden_boot": 2, "golden_glove": 2, "player_of_tournament": 2, "fair_play": 2}

    from pymongo import UpdateOne
    # 1) Compute & bulk-update award predictions
    award_ops = []
    user_award_pts = {}
    user_ids = set()
    for p in preds:
        pts = 0
        for f in fields:
            if p.get(f) and winners.get(f) and p[f].strip().lower() == winners[f].strip().lower():
                pts += points_map[f]
        award_ops.append(UpdateOne({"_id": p["_id"]}, {"$set": {"points": pts, "scored": True}}))
        user_award_pts[p["user_id"]] = pts
        user_ids.add(p["user_id"])
    if award_ops:
        await db.award_predictions.bulk_write(award_ops, ordered=False)

    user_ids = list(user_ids)
    # 2) Single aggregation of match totals
    totals = await db.predictions.aggregate([
        {"$match": {"user_id": {"$in": user_ids}, "scored": True}},
        {"$group": {"_id": "$user_id", "total": {"$sum": "$points"}}},
    ]).to_list(len(user_ids))
    match_totals = {row["_id"]: row["total"] for row in totals}
    # 3) Bulk update users
    user_ops = [
        UpdateOne({"id": uid}, {"$set": {"total_points": match_totals.get(uid, 0) + user_award_pts.get(uid, 0)}})
        for uid in user_ids
    ]
    if user_ops:
        await db.users.bulk_write(user_ops, ordered=False)
    return {"ok": True, "scored": len(preds)}


@api.get("/admin/stats")
async def admin_stats(request: Request):
    await get_current_admin(request, db)
    return {
        "users": await db.users.count_documents({}),
        "predictions": await db.predictions.count_documents({}),
        "award_predictions": await db.award_predictions.count_documents({}),
        "matches_finished": await db.matches.count_documents({"status": "finished"}),
        "matches_total": await db.matches.count_documents({}),
    }


@api.get("/")
async def root():
    return {"ok": True, "service": "World Cup Predictor"}


app.include_router(api)

# ----- CORS (allow cookies; allow_origins must NOT be '*' when credentials true). Use regex to permit any origin & still send cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------- Startup ---------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.predictions.create_index([("user_id", 1), ("match_no", 1)], unique=True)
    await db.matches.create_index("match_no", unique=True)
    await db.teams.create_index("name", unique=True)
    await db.stadiums.create_index("name", unique=True)

    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@worldcup.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "country": "FIFA",
            "country_code": "WC",
            "role": "admin",
            "avatar_url": None,
            "total_points": 0,
            "created_at": now_iso(),
        })
        logger.info(f"Admin user seeded: {admin_email}")

    # seed matches / teams / stadiums if empty
    if await db.matches.count_documents({}) == 0:
        seed_path = ROOT_DIR / "matches_seed.json"
        if seed_path.exists():
            with open(seed_path) as f:
                matches = json.load(f)
            for m in matches:
                m["status"] = "scheduled"
                m["result"] = None
            await db.matches.insert_many(matches)
            logger.info(f"Seeded {len(matches)} matches")

            # derive teams (group stage only) and stadiums
            group_matches = [m for m in matches if m["stage"] == "Group Stage"]
            teams_seen = {}
            for m in group_matches:
                for side in (m["home"], m["away"]):
                    if side not in teams_seen:
                        teams_seen[side] = {"name": side, "group": m["group"]}
            from team_meta import TEAM_META
            team_docs = []
            for name, base in teams_seen.items():
                meta = TEAM_META.get(name, {})
                team_docs.append({
                    "name": name,
                    "group": base["group"],
                    "country_code": meta.get("code", "UN"),
                    "flag": meta.get("flag", f"https://flagcdn.com/w320/un.png"),
                    "fifa_rank": meta.get("rank", 0),
                    "coach": meta.get("coach", "TBA"),
                })
            await db.teams.insert_many(team_docs)
            logger.info(f"Seeded {len(team_docs)} teams")

            from stadium_meta import STADIUM_META
            stadiums_seen = {}
            for m in matches:
                if m["stadium"] not in stadiums_seen:
                    stadiums_seen[m["stadium"]] = m["city"]
            stadium_docs = []
            for name, city in stadiums_seen.items():
                meta = STADIUM_META.get(name, {})
                stadium_docs.append({
                    "name": name,
                    "city": city,
                    "capacity": meta.get("capacity", "TBA"),
                    "image": meta.get("image", "https://images.unsplash.com/photo-1557174949-3b1f5b2e8fac"),
                    "country": meta.get("country", "USA"),
                    "opened": meta.get("opened", ""),
                })
            await db.stadiums.insert_many(stadium_docs)
            logger.info(f"Seeded {len(stadium_docs)} stadiums")


@app.on_event("shutdown")
async def shutdown():
    client.close()
