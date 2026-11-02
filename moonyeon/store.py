"""업무일지(worklog)와 승인 대기함(outbox)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from . import config


def now() -> datetime:
    return datetime.now(ZoneInfo(config.business().get("timezone", "Asia/Seoul")))


# ── 업무일지 ──────────────────────────────────────────────
def log_work(employee_id: str, task: str, summary: str, *, status: str = "done",
             output_path: str | None = None, trigger: str = "manual") -> dict:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "at": now().isoformat(timespec="seconds"),
        "employee": employee_id,
        "trigger": trigger,
        "task": task,
        "status": status,
        "summary": summary[:500],
        "output": output_path,
    }
    with open(config.WORKLOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def read_worklog(limit: int | None = None) -> list[dict]:
    if not config.WORKLOG_PATH.exists():
        return []
    with open(config.WORKLOG_PATH, encoding="utf-8") as f:
        rows = [json.loads(line) for line in f if line.strip()]
    return rows[-limit:] if limit else rows


# ── 승인 대기함: 고객·외부로 나가는 초안은 사장 승인 전까지 여기 머문다 ──
def add_to_outbox(employee_id: str, task: str, draft: str) -> str:
    config.OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
    item_id = uuid.uuid4().hex[:6]
    item = {"id": item_id, "employee": employee_id, "task": task, "draft": draft,
            "status": "pending", "created_at": now().isoformat(timespec="seconds")}
    _outbox_path(item_id).write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
    return item_id


def _outbox_path(item_id: str) -> Path:
    return config.OUTBOX_DIR / f"{item_id}.json"


def list_outbox(status: str = "pending") -> list[dict]:
    if not config.OUTBOX_DIR.exists():
        return []
    items = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(config.OUTBOX_DIR.glob("*.json"))]
    return [i for i in items if i["status"] == status]


def decide_outbox(item_id: str, approved: bool) -> dict:
    path = _outbox_path(item_id)
    if not path.exists():
        raise KeyError(item_id)
    item = json.loads(path.read_text(encoding="utf-8"))
    item["status"] = "approved" if approved else "rejected"
    item["decided_at"] = now().isoformat(timespec="seconds")
    path.write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
    log_work(item["employee"], f"승인 대기 {item_id}", f"사장 {'승인' if approved else '반려'}",
             status=item["status"], trigger="owner")
    return item
