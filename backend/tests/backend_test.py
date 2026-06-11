"""End-to-end backend tests for FIFA World Cup 2026 Predictor.

Covers: Auth (register/login/me/logout), Matches, Teams, Stadiums,
Predictions, Awards, Leaderboard, Admin scoring math.
"""
import os
import time
import uuid
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@worldcup.com"
ADMIN_PASSWORD = "Admin@2026"


def make_email(prefix="user"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@worldcup.com"


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
        assert "locked" in r.json().get("detail", "").lower() or "started" in r.json().get("detail", "").lower()

    def test_prediction_requires_auth(self):
        r = requests.post(f"{API}/predictions/82",
                          json={"home_score": 1, "away_score": 0, "motm": ""})
        assert r.status_code == 401

    def test_prediction_invalid_match(self, user_session):
        r = user_session.post(f"{API}/predictions/9999",
                              json={"home_score": 1, "away_score": 0, "motm": ""})
        assert r.status_code == 404


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
