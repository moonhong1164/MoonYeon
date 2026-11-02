"""정해진 시간에 알아서 출근하는 '루틴' 실행기 (외부 라이브러리 없는 작은 cron)."""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Callable

from . import config, employee, store

log = logging.getLogger(__name__)


def _field_matches(expr: str, value: int, lo: int, hi: int) -> bool:
    for part in expr.split(","):
        step = 1
        if "/" in part:
            part, step_s = part.split("/", 1)
            step = int(step_s)
        if part == "*":
            start, end = lo, hi
        elif "-" in part:
            a, b = part.split("-", 1)
            start, end = int(a), int(b)
        else:
            start = end = int(part)
        if start <= value <= end and (value - start) % step == 0:
            return True
    return False


def cron_matches(cron: str, when: datetime) -> bool:
    """'분 시 일 월 요일' 5칸 cron. 요일은 0=일요일(7도 일요일)."""
    minute, hour, dom, month, dow = cron.split()
    weekday = (when.weekday() + 1) % 7  # 월=1 … 일=0
    dow_ok = _field_matches(dow, weekday, 0, 7) or (weekday == 0 and _field_matches(dow, 7, 0, 7))
    return (
        _field_matches(minute, when.minute, 0, 59)
        and _field_matches(hour, when.hour, 0, 23)
        and _field_matches(dom, when.day, 1, 31)
        and _field_matches(month, when.month, 1, 12)
        and dow_ok
    )


def due_routines(when: datetime) -> list[tuple[config.Employee, config.Routine]]:
    return [(e, r) for e in config.employees().values() for r in e.routines if cron_matches(r.cron, when)]


def run_forever(notify: Callable[[str, str], None] | None = None) -> None:
    """1분마다 깨어나 할 일이 있는 직원을 출근시킨다. notify(room, text)로 보고."""
    last_minute = None
    log.info("루틴 실행기 시작 — 루틴 %d개", sum(len(e.routines) for e in config.employees().values()))
    while True:
        now = store.now().replace(second=0, microsecond=0)
        if now != last_minute:
            last_minute = now
            for emp, routine in due_routines(now):
                try:
                    results = employee.run(emp.id, routine.task, trigger=f"routine:{routine.cron}")
                    if notify:
                        for r in results:
                            notify(config.get_employee(r.employee_id).room, format_report(r))
                except Exception as exc:  # 한 직원이 실패해도 나머지는 계속
                    log.exception("루틴 실패: %s", emp.id)
                    if notify:
                        notify(emp.room, f"⚠️ {emp.name} 루틴 실패: {exc}")
        time.sleep(20)


def format_report(r: employee.Result, limit: int = 3500) -> str:
    emp = config.get_employee(r.employee_id)
    body = r.text if len(r.text) <= limit else r.text[:limit] + "\n…(전체는 결과 파일에)"
    tail = f"\n\n📝 승인 대기 #{r.outbox_id} — 보내려면 /approve {r.outbox_id}" if r.outbox_id else ""
    return f"[{emp.name}]\n{body}{tail}"
