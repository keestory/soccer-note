"""Real proposal/challenge rounds through a host adapter, never synthetic votes."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Protocol

from .catalog import load_catalog, select_roles
from .policy import CostBlocked, Entitlement, require_included, utc_now


@dataclass(frozen=True)
class Review:
    proposal: str
    counterargument: str
    evidence: tuple[str, ...]
    unresolved: str
    next_action: str
    veto: bool = False
    actual_model: str | None = None
    participant: str = "unknown"


@dataclass(frozen=True)
class Invocation:
    role: dict
    instructions: str
    phase: str
    brief: str
    source_commit: str
    actual_model: str
    previous: tuple[dict, ...]


class IncludedHost(Protocol):
    """Adapter must enforce included-only usage during every call, not just check it."""

    def entitlement(self) -> Entitlement | None: ...
    def invoke(self, request: Invocation) -> Review: ...


def _valid_review(response: object) -> bool:
    if not isinstance(response, Review):
        return False
    fields = (response.proposal, response.counterargument, response.unresolved,
              response.next_action, response.participant)
    return (all(isinstance(value, str) and value.strip() for value in fields)
            and isinstance(response.evidence, tuple) and bool(response.evidence)
            and all(isinstance(value, str) and value.strip() for value in response.evidence)
            and type(response.veto) is bool)


@dataclass
class Discussion:
    status: str
    required_roles: list[str]
    events: list[dict] = field(default_factory=list)
    reason: str | None = None
    decision: str | None = None


def run_discussion(root: Path, topics: list[str], brief: str, source_commit: str,
                   host: IncludedHost | None = None, clock: Callable = utc_now) -> Discussion:
    import tomllib

    roles = select_roles(load_catalog(root), topics)
    result = Discussion("not_applicable" if not roles else "blocked", [r["id"] for r in roles])
    if not roles:
        return result
    if host is None:
        result.reason = "verified_included_host_unavailable"
        return result
    if not brief.strip() or not source_commit.strip():
        raise ValueError("brief and source commit are required")
    for phase in ("proposal", "challenge"):
        # Each challenge sees all proposals, not just one fixed opposing role.
        previous = tuple(result.events)
        for role in roles:
            try:
                model = require_included(host.entitlement(), clock())
            except CostBlocked as error:
                result.reason = str(error)
                return result
            except Exception:
                result.reason = "entitlement_read_failed"
                return result
            with (root / ".codex/agents" / role["file"]).open("rb") as stream:
                instructions = tomllib.load(stream)["developer_instructions"]
            request = Invocation(role, instructions, phase, brief, source_commit, model, previous)
            try:
                response = host.invoke(request)
            except Exception:
                # A request may already have run. Never retry uncertain execution.
                result.status = "uncertain"
                result.reason = "host_invocation_failed_no_retry"
                return result
            if not _valid_review(response):
                result.status = "incomplete"
                result.reason = "invalid_review_no_consensus"
                return result
            if response.actual_model != model:
                result.status = "uncertain"
                result.reason = "actual_model_unknown_or_changed_no_retry"
                return result
            result.events.append({
                "id": f"E{len(result.events) + 1:03}", "phase": phase,
                "role": role["id"], "alias": role["alias"],
                "observed_at": clock().isoformat(), "spoken_at": None,
                "source_commit": source_commit,
                "preferred_model": role["preferred_model"], "actual_model": model,
                "participant": response.participant,
                "proposal": response.proposal, "counterargument": response.counterargument,
                "evidence": response.evidence, "unresolved": response.unresolved,
                "next_action": response.next_action, "veto": response.veto,
            })
            if response.veto:
                result.status = "vetoed"
                result.reason = f"{role['office']}_review_veto"
                return result
    # All reviews received is not consensus, user approval, or permission to deploy.
    result.status = "awaiting_ceo_decision"
    return result
