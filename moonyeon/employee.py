"""AI 직원 한 명이 일 하나를 처리하는 과정."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from . import config, llm, store

MAX_INPUT_CHARS = 200_000


@dataclass
class Result:
    employee_id: str
    task: str
    text: str
    output_path: Path
    outbox_id: str | None = None


def load_skill(name: str) -> str:
    path = config.SKILLS_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def system_prompt(emp: config.Employee) -> str:
    biz = config.business()
    rules = "\n".join(f"- {r}" for r in biz["house_rules"])
    return f"""당신은 '{biz['name']}'의 AI 직원 '{emp.name}'입니다.
회사 소개: {biz['description']}
당신의 역할: {emp.role}

[회사 규칙 — 반드시 지킴]
{rules}

[업무 지침서]
{load_skill(emp.skill)}

결과는 한국어로, {biz['owner_title']}이 휴대폰에서 바로 읽을 수 있게 씁니다."""


def gather_inputs(emp: config.Employee) -> str:
    """data/inbox/<이름>/ 에 넣어 둔 파일(주문 CSV, 댓글, 메일 등)을 읽어 붙인다."""
    parts: list[str] = []
    for name in emp.inputs:
        folder = config.INBOX_DIR / name
        files = sorted(p for p in folder.glob("*") if p.is_file() and not p.name.startswith(".")) if folder.exists() else []
        if not files:
            parts.append(f"[inbox/{name}] 비어 있음 — 새 자료 없음")
            continue
        for p in files:
            parts.append(f"[inbox/{name}/{p.name}]\n{p.read_text(encoding='utf-8', errors='replace')}")
    text = "\n\n".join(parts)
    if len(text) > MAX_INPUT_CHARS:
        raise ValueError(
            f"inbox 자료가 너무 큽니다({len(text):,}자). 파일을 나눠서 여러 번 맡겨 주세요."
        )
    return text


def _save_output(emp: config.Employee, task: str, text: str) -> Path:
    ts = store.now()
    folder = config.OUTPUT_DIR / ts.strftime("%Y-%m-%d")
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{ts.strftime('%H%M%S')}-{emp.id}.md"
    path.write_text(f"# {emp.name} — {ts:%Y-%m-%d %H:%M}\n\n> 지시: {task}\n\n{text}\n", encoding="utf-8")
    return path


def run(employee_id: str, task: str, *, extra_context: str = "", trigger: str = "manual",
        follow_chain: bool = True) -> list[Result]:
    """직원에게 일을 맡긴다. `next`가 있으면 다음 직원(예: 검수관)에게 결과를 넘긴다."""
    emp = config.get_employee(employee_id)
    prompt_parts = [f"[지시]\n{task}"]
    if emp.id in ("chief", "journal"):
        recent = store.read_worklog(limit=80)
        pending = store.list_outbox()
        log_lines = "\n".join(
            f"{r['at']} {r['employee']} {r['status']}: {r['task']} → {r['summary']}" for r in recent)
        prompt_parts.append("[최근 업무일지]\n" + (log_lines or "(없음)"))
        prompt_parts.append(f"[승인 대기 {len(pending)}건]\n" + "\n".join(
            f"{p['id']} {p['employee']}: {p['task']}" for p in pending))
    inputs = gather_inputs(emp)
    if inputs:
        prompt_parts.append(f"[받은 자료]\n{inputs}")
    if extra_context:
        prompt_parts.append(f"[앞 단계 결과]\n{extra_context}")

    try:
        text = llm.ask(system_prompt(emp), "\n\n".join(prompt_parts), effort=emp.effort, web=emp.web)
    except Exception as exc:  # 실패도 업무일지에 남긴다
        store.log_work(emp.id, task, f"실패: {exc}", status="failed", trigger=trigger)
        raise

    path = _save_output(emp, task, text)
    outbox_id = store.add_to_outbox(emp.id, task, text) if emp.customer_facing else None
    first_line = text.splitlines()[0] if text else ""
    store.log_work(emp.id, task, first_line, output_path=str(path.relative_to(config.ROOT)), trigger=trigger)
    results = [Result(emp.id, task, text, path, outbox_id)]

    if follow_chain and emp.next:
        results += run(emp.next, f"'{emp.name}'의 결과물을 검토해 줘.", extra_context=text,
                       trigger=f"chain:{emp.id}")
    return results
