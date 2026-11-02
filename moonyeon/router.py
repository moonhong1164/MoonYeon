"""비서실장: 사장의 한 줄 지시를 직원별 단계로 나눈다."""
from __future__ import annotations

from dataclasses import dataclass

from . import config, llm

PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "ack": {"type": "string", "description": "사장에게 보낼 '시작했어요: A → B → C (약 N분)' 형식의 한 줄"},
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "employee": {"type": "string"},
                    "task": {"type": "string"},
                },
                "required": ["employee", "task"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["ack", "steps"],
    "additionalProperties": False,
}


@dataclass
class Step:
    employee: str
    task: str


@dataclass
class Plan:
    ack: str
    steps: list[Step]


def roster_text(room: str | None = None) -> str:
    lines = []
    for e in config.employees().values():
        mark = " (이 방 담당)" if room and e.room == room else ""
        lines.append(f"- {e.id}: {e.name} — {e.role}{mark}")
    return "\n".join(lines)


def plan(instruction: str, room: str | None = None) -> Plan:
    system = (
        f"당신은 '{config.business()['name']}'의 비서실장입니다. 사장의 지시를 아래 직원들에게 나눠 맡깁니다.\n"
        "앞 단계 결과가 있어야 하는 일은 뒤 단계로 둡니다(예: 분석이 끝나야 답변 작성). "
        "각 단계의 task 는 그 직원이 바로 일할 수 있게 구체적으로 씁니다. "
        "직원 id 는 아래 목록에 있는 것만 씁니다. 단계는 1~5개.\n\n[직원 목록]\n" + roster_text(room)
    )
    data = llm.ask_json(system, f"[사장 지시]\n{instruction}", PLAN_SCHEMA, effort="low")
    known = config.employees()
    steps = [Step(s["employee"], s["task"]) for s in data["steps"] if s["employee"] in known]
    if not steps:
        steps = [Step("chief", instruction)]
    return Plan(data["ack"], steps)
