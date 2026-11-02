"""휴대폰으로 일 시키는 방: 텔레그램 봇 여러 개(방)를 동시에 돌린다.

보안: TELEGRAM_OWNER_ID(사장 본인 chat id)가 보낸 메시지만 받는다.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request

from . import config, employee, router, scheduler, store

log = logging.getLogger(__name__)
API = "https://api.telegram.org/bot{token}/{method}"

HELP = """사용법
• 그냥 한 줄로 지시 → 비서실장이 나눠서 맡기고 끝나면 보고
• /team — 직원 목록
• /run <직원id> <지시> — 특정 직원에게 바로 맡기기
• /outbox — 승인 대기 목록
• /approve <번호> · /reject <번호> — 고객에게 나갈 초안 승인/반려
• /log — 최근 업무일지"""


class Bot:
    def __init__(self, room_id: str, token: str, owner_id: int):
        self.room_id = room_id
        self.token = token
        self.owner_id = owner_id
        self.offset = 0

    def call(self, method: str, **params) -> dict:
        req = urllib.request.Request(
            API.format(token=self.token, method=method),
            data=json.dumps(params).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=70) as resp:
            return json.loads(resp.read())

    def send(self, text: str, chat_id: int | None = None) -> None:
        for i in range(0, len(text), 4000):  # 텔레그램 메시지 길이 제한
            try:
                self.call("sendMessage", chat_id=chat_id or self.owner_id, text=text[i:i + 4000])
            except urllib.error.URLError:
                log.exception("메시지 전송 실패 (%s)", self.room_id)

    # ── 명령 처리 ───────────────────────────────────────────
    def handle(self, text: str) -> None:
        text = text.strip()
        cmd, _, arg = text.partition(" ")
        if cmd in ("/start", "/help"):
            self.send(HELP)
        elif cmd == "/team":
            self.send("\n".join(f"{e.id} — {e.name}" for e in config.employees().values()))
        elif cmd == "/outbox":
            items = store.list_outbox()
            self.send("\n".join(f"#{i['id']} {i['employee']}: {i['task'][:40]}" for i in items) or "승인 대기 없음")
        elif cmd in ("/approve", "/reject"):
            try:
                item = store.decide_outbox(arg.strip().lstrip("#"), approved=cmd == "/approve")
                verdict = "승인" if item["status"] == "approved" else "반려"
                self.send(f"#{item['id']} {verdict}했어요.\n\n{item['draft'][:3500]}")
            except KeyError:
                self.send("그 번호의 승인 대기 건이 없어요. /outbox 로 확인해 주세요.")
        elif cmd == "/log":
            rows = store.read_worklog(limit=15)
            self.send("\n".join(f"{r['at'][5:16]} {r['employee']}: {r['summary'][:60]}" for r in rows) or "기록 없음")
        elif cmd == "/run":
            emp_id, _, task = arg.partition(" ")
            if emp_id not in config.employees() or not task:
                self.send("형식: /run <직원id> <지시>  (직원id는 /team)")
                return
            self._background(self._run_steps, [router.Step(emp_id, task)], None)
        elif cmd.startswith("/"):
            self.send(HELP)
        else:
            self._background(self._delegate, text)

    def _background(self, fn, *args) -> None:
        threading.Thread(target=fn, args=args, daemon=True).start()

    def _delegate(self, instruction: str) -> None:
        try:
            p = router.plan(instruction, room=self.room_id)
        except Exception as exc:
            self.send(f"⚠️ 지시를 나누다 실패했어요: {exc}")
            return
        self._run_steps(p.steps, p.ack)

    def _run_steps(self, steps: list[router.Step], ack: str | None) -> None:
        started = time.monotonic()
        self.send(ack or "시작했어요: " + " → ".join(config.get_employee(s.employee).name for s in steps))
        context = ""
        for step in steps:
            try:
                results = employee.run(step.employee, step.task, extra_context=context, trigger="telegram")
            except Exception as exc:
                self.send(f"⚠️ {config.get_employee(step.employee).name} 단계에서 멈췄어요: {exc}")
                return
            for r in results:
                self.send(scheduler.format_report(r))
            context = results[-1].text
        minutes = int((time.monotonic() - started) // 60)
        self.send(f"✅ 끝났어요 ({minutes}분). 고객에게는 아무것도 보내지 않았어요. /outbox 에서 승인해 주세요.")

    # ── 메시지 받기 ─────────────────────────────────────────
    def poll_forever(self) -> None:
        log.info("방 '%s' 대기 중", self.room_id)
        while True:
            try:
                data = self.call("getUpdates", offset=self.offset, timeout=60)
            except (urllib.error.URLError, TimeoutError):
                time.sleep(5)
                continue
            for upd in data.get("result", []):
                self.offset = upd["update_id"] + 1
                msg = upd.get("message") or {}
                if msg.get("from", {}).get("id") != self.owner_id:
                    continue  # 사장 외에는 무시
                if msg.get("text"):
                    self.handle(msg["text"])


def build_bots() -> dict[str, Bot]:
    owner = os.environ.get("TELEGRAM_OWNER_ID")
    if not owner:
        raise SystemExit("TELEGRAM_OWNER_ID 환경변수(사장 본인 텔레그램 숫자 id)가 필요합니다.")
    bots = {}
    for room in config.team()["rooms"]:
        token = os.environ.get(room["token_env"])
        if token:
            bots[room["id"]] = Bot(room["id"], token, int(owner))
    if not bots:
        raise SystemExit("텔레그램 봇 토큰이 하나도 없습니다. .env.example 을 참고해 주세요.")
    return bots


def notifier(bots: dict[str, Bot]):
    fallback = bots.get("main") or next(iter(bots.values()))

    def notify(room: str, text: str) -> None:
        bots.get(room, fallback).send(text)
    return notify


def serve(with_scheduler: bool = True) -> None:
    bots = build_bots()
    for bot in bots.values():
        threading.Thread(target=bot.poll_forever, daemon=True).start()
    if with_scheduler:
        scheduler.run_forever(notify=notifier(bots))
    else:
        while True:
            time.sleep(3600)
