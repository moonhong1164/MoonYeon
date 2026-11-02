"""설정 파일(config/*.json)과 경로를 불러온다."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

ROOT = Path(os.environ.get("MOONYEON_HOME", Path(__file__).resolve().parent.parent))
CONFIG_DIR = ROOT / "config"
SKILLS_DIR = ROOT / "skills"
DATA_DIR = ROOT / "data"
INBOX_DIR = DATA_DIR / "inbox"
OUTPUT_DIR = DATA_DIR / "outputs"
OUTBOX_DIR = DATA_DIR / "outbox"
WORKLOG_PATH = DATA_DIR / "worklog.jsonl"
SITE_DATA_DIR = ROOT / "site" / "data"


@dataclass
class Routine:
    cron: str
    task: str


@dataclass
class Employee:
    id: str
    name: str
    department: str
    role: str
    skill: str
    effort: str = "medium"
    web: bool = False
    inputs: list[str] = field(default_factory=list)
    routines: list[Routine] = field(default_factory=list)
    next: str | None = None
    room: str = "main"
    customer_facing: bool = False


def _load_json(name: str) -> dict:
    with open(CONFIG_DIR / name, encoding="utf-8") as f:
        return json.load(f)


@lru_cache
def business() -> dict:
    return _load_json("business.json")


@lru_cache
def team() -> dict:
    return _load_json("employees.json")


@lru_cache
def employees() -> dict[str, Employee]:
    result = {}
    for raw in team()["employees"]:
        raw = dict(raw)
        raw["routines"] = [Routine(**r) for r in raw.get("routines", [])]
        emp = Employee(**raw)
        result[emp.id] = emp
    return result


def get_employee(employee_id: str) -> Employee:
    try:
        return employees()[employee_id]
    except KeyError:
        known = ", ".join(employees())
        raise SystemExit(f"없는 직원입니다: {employee_id} (가능: {known})") from None


def model() -> str:
    return os.environ.get("MOONYEON_MODEL", business()["models"]["default"])
