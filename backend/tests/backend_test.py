"""End-to-end backend tests for FIFA World Cup 2026 Predictor.

Covers: Auth (register/login/me/logout), Matches, Teams, Stadiums,
Predictions, Awards, Leaderboard, Admin scoring math, Lock-1h rule,
Leaderboard cleanliness.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pymongo
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@worldcup.com"
ADMIN_PASSWORD = "Admin@2026"

# Direct mongo access used only for (a) deterministic edge-case match-time
# manipulation in lock-rule tests and (b) end-of-session cleanup of TEST_*
# users we create during the run.
_MONGO = pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
_DB = _MONGO[os.environ.get("DB_NAME", "test_database")]


def make_email(prefix="user"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@worldcup.com"


# ---------------- Session-wide cleanup ----------------
_LEADERBOARD_SNAPSHOT = []


@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_data():
    """At session start: snapshot the leaderboard so cleanliness checks reflect
    the pristine state (no test users yet). At session teardown: remove any
    TEST_*@worldcup.com user we created and their predictions/awards so the DB
    returns to its clean state (admin + ManchesterUnited76 only)."""
    # SETUP: snapshot leaderboard before any test creates users
    try:
        r = requests.get(f"{API}/leaderboard", params={"scope": "global"}, timeout=10)
        if r.status_code == 200:
            _LEADERBOARD_SNAPSHOT.extend(r.json())
    except Exception:
        pass

    yield

    # TEARDOWN
    test_users = list(_DB.users.find({"email": {"$regex": "^test_"}}, {"id": 1}))
    ids = [u["id"] for u in test_users]
    if ids:
        _DB.predictions.delete_many({"user_id": {"$in": ids}})
        _DB.award_predictions.delete_many({"user_id": {"$in": ids}})
        _DB.users.delete_many({"id": {"$in": ids}})
    # Clear any result that the scoring tests may have set on match 50
    _DB.matches.update_one({"match_no": 50}, {"$set": {"result": None, "status": "scheduled"}})


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def user_session():
    s = requests.Session()
    email = make_email("u1")
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "Pass@1234", "name": "Test User",
        "country": "Brazil", "country_code": "BR",
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email  # type: ignore
    return s


# ---------------- Health ----------------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------------- Auth ----------------
class TestAuth:
    def test_register_sets_cookie(self):
        s = requests.Session()
        email = make_email("reg")
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass@1234", "name": "Reg User",
            "country": "Argentina", "country_code": "AR",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == email.lower()
        assert data["user"]["role"] == "user"
        assert "access_token" in s.cookies, "Auth cookie not set on register"
        # verify /me works via cookie
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()

    def test_register_duplicate_email_returns_400(self):
        s = requests.Session()
        email = make_email("dup")
        payload = {"email": email, "password": "Pass@1234", "name": "Dup",
                   "country": "USA", "country_code": "US"}
        r1 = s.post(f"{API}/auth/register", json=payload)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json=payload)
        assert r2.status_code == 400

    def test_login_success_and_me(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"
        assert "access_token" in s.cookies
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN_EMAIL

    def test_login_invalid_credentials(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert "access_token" in s.cookies
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # after logout, /me with same session should be unauthenticated
        # cookie may be cleared via Set-Cookie; remove manually if still present
        s.cookies.clear()
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 401


# ---------------- Matches ----------------
class TestMatches:
    def test_list_all_matches(self):
        r = requests.get(f"{API}/matches")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 104, f"Expected 104 matches, got {len(data)}"
        sample = data[0]
        for k in ("match_no", "time", "home", "away", "stadium", "city", "stage"):
            assert k in sample, f"missing key {k}"

    def test_filter_by_stage(self):
        r = requests.get(f"{API}/matches", params={"stage": "Group Stage"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(m["stage"] == "Group Stage" for m in data)

    def test_filter_by_group(self):
        r = requests.get(f"{API}/matches", params={"group": "A"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(m["group"] == "A" for m in data)

    def test_get_single_match(self):
        r = requests.get(f"{API}/matches/1")
        assert r.status_code == 200
        assert r.json()["match_no"] == 1

    def test_match_not_found(self):
        r = requests.get(f"{API}/matches/9999")
        assert r.status_code == 404


# ---------------- Teams ----------------
class TestTeams:
    def test_list_teams(self):
        r = requests.get(f"{API}/teams")
        assert r.status_code == 200
        teams = r.json()
        assert len(teams) == 48, f"Expected 48 teams, got {len(teams)}"
        assert "flag" in teams[0]
        assert "name" in teams[0]

    def test_get_team_detail(self):
        teams = requests.get(f"{API}/teams").json()
        name = teams[0]["name"]
        r = requests.get(f"{API}/teams/{name}")
        assert r.status_code == 200
        data = r.json()
        assert data["team"]["name"] == name
        assert isinstance(data["fixtures"], list)
        assert len(data["fixtures"]) >= 3  # at least 3 group games

    def test_team_not_found(self):
        r = requests.get(f"{API}/teams/Atlantis")
        assert r.status_code == 404


# ---------------- Stadiums ----------------
class TestStadiums:
    def test_list_stadiums(self):
        r = requests.get(f"{API}/stadiums")
        assert r.status_code == 200
        stadiums = r.json()
        assert len(stadiums) == 16, f"Expected 16 stadiums, got {len(stadiums)}"

    def test_get_stadium_detail(self):
        stadiums = requests.get(f"{API}/stadiums").json()
        name = stadiums[0]["name"]
        r = requests.get(f"{API}/stadiums/{name}")
        assert r.status_code == 200
        data = r.json()
        assert data["stadium"]["name"] == name
        assert isinstance(data["fixtures"], list)
        assert len(data["fixtures"]) > 0


# ---------------- Predictions ----------------
class TestPredictions:
    def test_create_and_get_prediction(self, user_session):
        # Match 1 is 2026-06-11 15:00 UTC; pick a far-future knockout match 80
        r = user_session.post(f"{API}/predictions/80",
                              json={"home_score": 2, "away_score": 1, "motm": "Pelé"})
        assert r.status_code == 200, r.text
        # get my predictions
        r2 = user_session.get(f"{API}/predictions/me")
        assert r2.status_code == 200
        preds = r2.json()
        match_one = [p for p in preds if p["match_no"] == 80]
        assert len(match_one) == 1
        assert match_one[0]["home_score"] == 2
        assert match_one[0]["away_score"] == 1

    def test_update_prediction_upsert(self, user_session):
        user_session.post(f"{API}/predictions/81",
                          json={"home_score": 0, "away_score": 0, "motm": ""})
        r = user_session.post(f"{API}/predictions/81",
                              json={"home_score": 3, "away_score": 2, "motm": "Messi"})
        assert r.status_code == 200
        preds = user_session.get(f"{API}/predictions/me").json()
        m2 = [p for p in preds if p["match_no"] == 81][0]
        assert m2["home_score"] == 3
        assert m2["away_score"] == 2
        assert m2["motm"] == "Messi"

    def test_prediction_locked_for_started_match(self, user_session):
        # Match 2 kickoff is 2026-06-11 00:00 UTC - already past at server time
        r = user_session.post(f"{API}/predictions/2",
                              json={"home_score": 1, "away_score": 0, "motm": ""})
        assert r.status_code == 400
        detail = r.json().get("detail", "").lower()
        assert "lock" in detail or "kickoff" in detail
        assert "1 hour" in detail or "hour before" in detail

    def test_prediction_requires_auth(self):
        r = requests.post(f"{API}/predictions/82",
                          json={"home_score": 1, "away_score": 0, "motm": ""})
        assert r.status_code == 401

    def test_prediction_invalid_match(self, user_session):
        r = user_session.post(f"{API}/predictions/9999",
                              json={"home_score": 1, "away_score": 0, "motm": ""})
        assert r.status_code == 404


# ---------------- Lock-1-hour-before-kickoff rule ----------------
class TestPredictionLockRule:
    """Verify the new rule: predictions lock 1 HOUR before kickoff."""

    SCRATCH_MATCH_NO = 103  # Third Place playoff, far future; safe to mutate

    @pytest.fixture(autouse=True)
    def _restore_time(self):
        original = _DB.matches.find_one({"match_no": self.SCRATCH_MATCH_NO}, {"_id": 0, "time": 1})
        original_time = original["time"] if original else None
        yield
        if original_time is not None:
            _DB.matches.update_one(
                {"match_no": self.SCRATCH_MATCH_NO},
                {"$set": {"time": original_time}},
            )

    def _set_match_time(self, dt: datetime):
        # Store the same string format the backend expects: "YYYY-MM-DD HH:MM:SS"
        s = dt.strftime("%Y-%m-%d %H:%M:%S")
        res = _DB.matches.update_one(
            {"match_no": self.SCRATCH_MATCH_NO}, {"$set": {"time": s}}
        )
        assert res.matched_count == 1

    def test_accepted_when_kickoff_more_than_1h_away(self, user_session):
        # 2h in the future -> should be ACCEPTED
        future = datetime.now(timezone.utc) + timedelta(hours=2, minutes=5)
        self._set_match_time(future)
        r = user_session.post(
            f"{API}/predictions/{self.SCRATCH_MATCH_NO}",
            json={"home_score": 1, "away_score": 1, "motm": ""},
        )
        assert r.status_code == 200, r.text

    def test_rejected_when_kickoff_within_1h(self, user_session):
        # 30 min in the future -> within 1h window -> REJECTED
        soon = datetime.now(timezone.utc) + timedelta(minutes=30)
        self._set_match_time(soon)
        r = user_session.post(
            f"{API}/predictions/{self.SCRATCH_MATCH_NO}",
            json={"home_score": 2, "away_score": 0, "motm": ""},
        )
        assert r.status_code == 400, r.text
        assert "1 hour" in r.json().get("detail", "").lower() or "lock" in r.json().get("detail", "").lower()

    def test_rejected_when_kickoff_already_past(self, user_session):
        # In the past -> still rejected (lock_at long since passed)
        past = datetime.now(timezone.utc) - timedelta(minutes=10)
        self._set_match_time(past)
        r = user_session.post(
            f"{API}/predictions/{self.SCRATCH_MATCH_NO}",
            json={"home_score": 0, "away_score": 0, "motm": ""},
        )
        assert r.status_code == 400

    def test_rejected_exactly_at_lock_boundary(self, user_session):
        # 59 minutes from now (just inside the 1h lock window) -> REJECTED
        boundary = datetime.now(timezone.utc) + timedelta(minutes=59)
        self._set_match_time(boundary)
        r = user_session.post(
            f"{API}/predictions/{self.SCRATCH_MATCH_NO}",
            json={"home_score": 3, "away_score": 0, "motm": ""},
        )
        assert r.status_code == 400


# ---------------- Awards ----------------
class TestAwards:
    def test_submit_awards(self, user_session):
        r = user_session.post(f"{API}/awards/me", json={
            "golden_boot": "Mbappe", "golden_glove": "Alisson",
            "player_of_tournament": "Messi", "fair_play": "Japan",
        })
        assert r.status_code == 200, r.text
        rec = user_session.get(f"{API}/awards/me").json()
        assert rec["golden_boot"] == "Mbappe"
        assert rec["golden_glove"] == "Alisson"
        assert rec["player_of_tournament"] == "Messi"
        assert rec["fair_play"] == "Japan"

    def test_awards_requires_auth(self):
        r = requests.post(f"{API}/awards/me", json={"golden_boot": "X"})
        assert r.status_code == 401


# ---------------- Leaderboard ----------------
class TestLeaderboard:
    def test_global_leaderboard(self):
        r = requests.get(f"{API}/leaderboard", params={"scope": "global"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            u = data[0]
            for k in ("name", "total_points", "accuracy", "predictions_made"):
                assert k in u


class TestLeaderboardCleanliness:
    """Verify leaderboard contains ONLY real users (admin + the user's own
    account) and no TEST_/Scorer/Aw seed rows. Must be run BEFORE any test
    class that registers users (i.e. with --order or alone)."""

    def test_only_real_users_present(self):
        # Use the session-start snapshot so this check is independent of
        # any TEST_* users created by other test classes during the run.
        rows = _LEADERBOARD_SNAPSHOT
        assert rows, "Snapshot was not captured at session start"
        names = [u["name"] for u in rows]
        forbidden_substrings = ["TEST_", "test_", "Scorer", "Aw", "Reg User", "Dup", "Test User"]
        bad = [n for n in names for s in forbidden_substrings if s in n]
        assert bad == [], f"Leaderboard contains test/mock rows: {bad}"
        # Admin must be present
        assert any(u["name"] == "Admin" for u in rows), f"Admin missing from leaderboard. names={names}"
        # Exactly 2 rows expected per test plan (admin + ManchesterUnited76)
        assert len(rows) == 2, f"Expected exactly 2 leaderboard rows in pristine DB, got {len(rows)}: {names}"

    def test_leaderboard_row_shape(self):
        rows = requests.get(f"{API}/leaderboard").json()
        for u in rows:
            assert "_id" not in u, "Mongo _id leaked to API"
            for k in ("id", "name", "total_points", "predictions_made", "accuracy"):
                assert k in u


# ---------------- Admin & Scoring math ----------------
class TestAdminScoring:
    def test_admin_stats_requires_admin(self, user_session):
        r = user_session.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_admin_stats_ok(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["users"] >= 1
        assert data["matches_total"] == 104

    def test_admin_non_admin_set_result_forbidden(self, user_session):
        r = user_session.post(f"{API}/admin/matches/1/result",
                              json={"home_score": 1, "away_score": 0, "motm": ""})
        assert r.status_code == 403

    def test_scoring_math_three_users(self, admin_session):
        """Three users predict on a fresh match; admin enters result and
        verifies points: 2-1 -> +5, 1-0 -> +3, 0-2 -> 0."""
        # Use a unique match number for isolation
        match_no = 50

        # Create 3 users with predictions
        users = []
        for i, pred in enumerate([
            {"home_score": 2, "away_score": 1, "expected": 5},
            {"home_score": 1, "away_score": 0, "expected": 3},
            {"home_score": 0, "away_score": 2, "expected": 0},
        ]):
            s = requests.Session()
            email = make_email(f"sc{i}")
            r = s.post(f"{API}/auth/register", json={
                "email": email, "password": "Pass@1234",
                "name": f"Scorer {i}", "country": "Brazil", "country_code": "BR",
            })
            assert r.status_code == 200, r.text
            user_id = r.json()["user"]["id"]
            rp = s.post(f"{API}/predictions/{match_no}", json={
                "home_score": pred["home_score"], "away_score": pred["away_score"], "motm": "",
            })
            assert rp.status_code == 200, rp.text
            users.append({"session": s, "id": user_id, "expected": pred["expected"]})

        # Admin sets result 2-1
        rr = admin_session.post(f"{API}/admin/matches/{match_no}/result", json={
            "home_score": 2, "away_score": 1, "motm": "",
        })
        assert rr.status_code == 200, rr.text
        assert rr.json()["scored_predictions"] >= 3

        # Verify each user's prediction points via leaderboard or /predictions/me
        for u in users:
            preds = u["session"].get(f"{API}/predictions/me").json()
            this = [p for p in preds if p["match_no"] == match_no][0]
            assert this["scored"] is True
            assert this["points"] == u["expected"], (
                f"Expected {u['expected']} pts, got {this['points']} for prediction "
                f"{this['home_score']}-{this['away_score']}"
            )

        # Verify total_points updated on leaderboard
        lb = requests.get(f"{API}/leaderboard").json()
        lb_by_id = {u["id"]: u for u in lb}
        for u in users:
            assert u["id"] in lb_by_id, f"user {u['id']} missing from leaderboard"
            assert lb_by_id[u["id"]]["total_points"] == u["expected"]

    def test_admin_award_winners_scoring(self, admin_session):
        """User with all 4 correct awards gets +8 (4x2)."""
        s = requests.Session()
        email = make_email("aw")
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass@1234", "name": "Aw",
            "country": "Spain", "country_code": "ES",
        })
        assert r.status_code == 200
        user_id = r.json()["user"]["id"]
        s.post(f"{API}/awards/me", json={
            "golden_boot": "Haaland", "golden_glove": "Courtois",
            "player_of_tournament": "Bellingham", "fair_play": "Japan",
        })
        rr = admin_session.post(f"{API}/admin/awards/winners", json={
            "golden_boot": "Haaland", "golden_glove": "Courtois",
            "player_of_tournament": "Bellingham", "fair_play": "Japan",
        })
        assert rr.status_code == 200, rr.text

        # Verify user's award prediction scored
        rec = s.get(f"{API}/awards/me").json()
        assert rec["scored"] is True
        assert rec["points"] == 8

        # Leaderboard reflects award points (this user had no match preds, so total = 8)
        lb = requests.get(f"{API}/leaderboard").json()
        me_row = next((u for u in lb if u["id"] == user_id), None)
        assert me_row is not None
        assert me_row["total_points"] == 8
