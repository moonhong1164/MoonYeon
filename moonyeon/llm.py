"""Claude 호출 래퍼.

- 어려운 일은 adaptive thinking + effort 로 깊이를 조절한다.
- 자료 조사가 필요한 직원은 웹 검색(server tool)을 쓴다.
- 안전 분류기가 거절하면 서버 측 fallback 으로 다른 모델이 이어 받는다.
"""
from __future__ import annotations

import json
from typing import Any

import anthropic

from . import config

WEB_TOOLS = [
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 8},
    {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 5},
]

_client: anthropic.Anthropic | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


class RefusedError(RuntimeError):
    pass


def _text(content: list[Any]) -> str:
    return "\n".join(b.text for b in content if getattr(b, "type", None) == "text").strip()


def ask(
    system: str,
    prompt: str,
    *,
    effort: str = "medium",
    web: bool = False,
    output_schema: dict | None = None,
    max_tokens: int = 64000,
) -> str:
    """한 번의 업무 요청을 보내고 최종 텍스트를 돌려준다."""
    messages: list[dict] = [{"role": "user", "content": prompt}]
    output_config: dict = {"effort": effort}
    if output_schema is not None:
        output_config["format"] = {"type": "json_schema", "schema": output_schema}

    params: dict[str, Any] = dict(
        model=config.model(),
        max_tokens=max_tokens,
        system=system,
        thinking={"type": "adaptive"},
        output_config=output_config,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if web:
        params["tools"] = WEB_TOOLS

    # 웹 검색이 길어지면 서버가 pause_turn 으로 끊어서 돌려준다. 이어서 계속 요청한다.
    for _ in range(6):
        with client().beta.messages.stream(messages=messages, **params) as stream:
            response = stream.get_final_message()
        if response.stop_reason == "pause_turn":
            messages.append({"role": "assistant", "content": response.content})
            continue
        break

    if response.stop_reason == "refusal":
        raise RefusedError("모델이 이 요청을 거절했습니다. 지시 내용을 바꿔 다시 시도해 주세요.")
    text = _text(response.content)
    if response.stop_reason == "max_tokens":
        text += "\n\n(⚠️ 분량 제한으로 결과가 잘렸어요. 일을 더 작게 나눠 주세요.)"
    return text


def ask_json(system: str, prompt: str, schema: dict, *, effort: str = "low") -> dict:
    return json.loads(ask(system, prompt, effort=effort, output_schema=schema, max_tokens=16000))
