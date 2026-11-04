"""명령줄 사용법: python -m moonyeon <명령>

  team                         직원 목록
  run <직원id> "<지시>"        직원에게 바로 일 맡기기
  ask "<지시>"                 비서실장이 나눠서 맡기기 (휴대폰 한 줄 지시와 같음)
  reading <상품> <생년월일> <시각|모름> <남|여> [이름] [질문]
                               유료 풀이 초안 쓰기 (상품: reunion|destiny|life|love|money|newyear)
  chart <생년월일> <시각|모름> <남|여> [이름]
                               풀이용 사주 자료만 보기
  due                          지금 시각에 출근할 루틴 보기
  scheduler                    루틴 실행기만 켜기 (텔레그램 없이)
  bot                          텔레그램 방 + 루틴 실행기 켜기
  outbox                       승인 대기 목록
  approve <번호> / reject <번호>
  stats                        홈페이지 숫자 갱신 (site/data/stats.json)
"""
from __future__ import annotations

import logging
import subprocess
import sys

from . import config, employee, router, scheduler, stats, store


def _print_results(results: list[employee.Result]) -> None:
    for r in results:
        print(scheduler.format_report(r, limit=100_000))
        print(f"\n(저장: {r.output_path})\n")


PRODUCTS = {"reunion": "재회운세", "destiny": "운명의 상대", "life": "평생 사주 정밀 풀이", "love": "연애·궁합 풀이", "money": "재물·직업운 풀이", "newyear": "신년운세"}


def saju_chart(birth: str, time: str, gender: str, name: str = "") -> str:
    """site/saju.js 로 계산한 풀이용 사주 자료 (Node.js 필요)."""
    cmd = ["node", str(config.ROOT / "tools" / "chart.js"), "--birth", birth, "--time", time, "--gender", gender]
    if name:
        cmd += ["--name", name]
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def main(argv: list[str]) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return
    cmd, args = argv[0], argv[1:]

    if cmd == "team":
        for d in config.team()["departments"]:
            print(f"\n{d['no']} {d['name']}")
            for e in config.employees().values():
                if e.department == d["id"]:
                    routines = ", ".join(r.cron for r in e.routines) or "지시할 때만"
                    print(f"  {e.id:<18} {e.name:<14} [{routines}]")
    elif cmd == "run" and len(args) >= 2:
        _print_results(employee.run(args[0], " ".join(args[1:])))
    elif cmd == "ask" and args:
        p = router.plan(" ".join(args))
        print(p.ack)
        context = ""
        for step in p.steps:
            results = employee.run(step.employee, step.task, extra_context=context)
            _print_results(results)
            context = results[-1].text
    elif cmd == "chart" and len(args) >= 3:
        print(saju_chart(*args[:4]))
    elif cmd == "reading" and len(args) >= 4 and args[0] in PRODUCTS:
        product, birth, time, gender = args[:4]
        name = args[4] if len(args) > 4 else ""
        question = " ".join(args[5:]) or "없음"
        task = f"[{PRODUCTS[product]}] 풀이를 써 줘. 고객: {name or '이름 없음'}. 궁금한 점: {question}"
        _print_results(employee.run("reader", task, extra_context=saju_chart(birth, time, gender, name)))
    elif cmd == "due":
        for e, r in scheduler.due_routines(store.now()):
            print(e.id, r.cron, r.task)
    elif cmd == "scheduler":
        scheduler.run_forever(notify=lambda room, text: print(f"[{room}] {text}"))
    elif cmd == "bot":
        from . import telegram
        telegram.serve()
    elif cmd == "outbox":
        for i in store.list_outbox():
            print(f"#{i['id']} {i['employee']}: {i['task']}")
    elif cmd in ("approve", "reject") and args:
        item = store.decide_outbox(args[0], approved=cmd == "approve")
        print(f"#{item['id']} → {item['status']}")
    elif cmd == "stats":
        s = stats.build()
        print(s["kpi"])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
