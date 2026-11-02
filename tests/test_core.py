import json
from datetime import datetime

import pytest

from moonyeon import config, employee, scheduler, stats, store


@pytest.fixture(autouse=True)
def tmp_data(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.setattr(config, "INBOX_DIR", tmp_path / "inbox")
    monkeypatch.setattr(config, "OUTPUT_DIR", tmp_path / "outputs")
    monkeypatch.setattr(config, "OUTBOX_DIR", tmp_path / "outbox")
    monkeypatch.setattr(config, "WORKLOG_PATH", tmp_path / "worklog.jsonl")
    monkeypatch.setattr(config, "SITE_DATA_DIR", tmp_path / "site")
    monkeypatch.setattr(config, "ROOT", tmp_path)


def test_cron():
    mon_0900 = datetime(2026, 11, 2, 9, 0)  # 월요일
    assert scheduler.cron_matches("0 9 * * 1-5", mon_0900)
    assert not scheduler.cron_matches("0 9 * * 0", mon_0900)
    assert scheduler.cron_matches("0 8,9 * * *", mon_0900)
    assert scheduler.cron_matches("*/15 * * * *", mon_0900)
    assert scheduler.cron_matches("0 9 * * 7", datetime(2026, 11, 1, 9, 0))  # 일요일


def test_every_employee_has_skill_and_valid_room():
    rooms = {r["id"] for r in config.team()["rooms"]}
    depts = {d["id"] for d in config.team()["departments"]}
    for e in config.employees().values():
        assert (config.SKILLS_DIR / f"{e.skill}.md").exists(), e.id
        assert e.room in rooms and e.department in depts
        assert e.next is None or e.next in config.employees()
        for r in e.routines:
            assert len(r.cron.split()) == 5


def test_run_chain_outbox_and_stats(monkeypatch):
    calls = []
    monkeypatch.setattr(employee.llm, "ask", lambda system, prompt, **kw: calls.append(prompt) or f"결과 {len(calls)}")
    results = employee.run("blog-writer", "오늘 글 써 줘")
    assert [r.employee_id for r in results] == ["blog-writer", "blog-reviewer"]
    assert "결과 1" in calls[1]  # 검수관이 원고를 받음
    assert results[0].outbox_id is None and results[1].outbox_id  # 검수 통과본만 승인 대기
    item = store.decide_outbox(results[1].outbox_id, approved=True)
    assert item["status"] == "approved"
    s = stats.build()
    assert s["kpi"]["worklog_total"] == 3 and s["kpi"]["pending_approvals"] == 0
    assert json.loads((config.SITE_DATA_DIR / "stats.json").read_text())["kpi"]["employees"] == len(config.employees())
