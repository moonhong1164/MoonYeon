"""홈페이지가 읽는 숫자(site/data/*.json)를 실제 설정·업무일지에서 만든다."""
from __future__ import annotations

import json
from collections import Counter

from . import config, store


def build() -> dict:
    team = config.team()
    emps = config.employees()
    log = store.read_worklog()
    this_month = store.now().strftime("%Y-%m")
    month_rows = [r for r in log if r["at"].startswith(this_month)]
    by_emp = Counter(r["employee"] for r in log if r["status"] == "done")

    stats = {
        "generated_at": store.now().isoformat(timespec="minutes"),
        "business": {k: config.business()[k] for k in ("name", "tagline", "description")},
        "kpi": {
            "employees": len(emps),
            "employees_on_routine": sum(1 for e in emps.values() if e.routines),
            "routines": sum(len(e.routines) for e in emps.values()),
            "skills": len(list(config.SKILLS_DIR.glob("*.md"))),
            "rooms": len(team["rooms"]),
            "worklog_total": len(log),
            "worklog_month": len(month_rows),
            "pending_approvals": len(store.list_outbox()),
        },
        "departments": [
            {**d, "employees": [
                {"id": e.id, "name": e.name, "role": e.role, "web": e.web,
                 "customer_facing": e.customer_facing, "done": by_emp.get(e.id, 0),
                 "routines": [r.cron for r in e.routines]}
                for e in emps.values() if e.department == d["id"]]}
            for d in team["departments"]
        ],
        "rooms": [{"id": r["id"], "name": r["name"]} for r in team["rooms"]],
        "recent": [
            {"at": r["at"], "employee": emps[r["employee"]].name if r["employee"] in emps else r["employee"],
             "task": r["task"][:80], "summary": r["summary"][:160], "status": r["status"]}
            for r in log[-8:]
        ][::-1],
    }
    config.SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    (config.SITE_DATA_DIR / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    return stats
