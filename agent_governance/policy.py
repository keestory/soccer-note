"""Fail closed before any host invocation; evidence is supplied by a trusted host.

This module never reads keys or turns user-supplied JSON into an entitlement.
Only a provider-enforced included-only host adapter may attest a live call.
There is intentionally no repository implementation of that adapter yet.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


class CostBlocked(RuntimeError):
    """No inference was started by the guarded call."""


@dataclass(frozen=True)
class Entitlement:
    verified_at: datetime
    expires_at: datetime
    auth_mode: str
    actual_model: str
    available_models: tuple[str, ...]
    allowance: str
    remaining: str
    paid_fallback_disabled: bool
    purchased_credits_disabled: bool
    included_only_enforced: bool
    cloud: bool
    source: str


def require_included(evidence: Entitlement | None, now: datetime) -> str:
    if evidence is None:
        raise CostBlocked("entitlement_unknown")
    if now.tzinfo is None or evidence.verified_at.tzinfo is None or evidence.expires_at.tzinfo is None:
        raise CostBlocked("verification_time_unknown")
    if not evidence.verified_at <= now < evidence.expires_at:
        raise CostBlocked("entitlement_stale_or_future")
    if now - evidence.verified_at > timedelta(minutes=5):
        raise CostBlocked("entitlement_stale")
    if evidence.auth_mode not in {"chatgpt_included", "hosted_included"}:
        raise CostBlocked("api_or_unknown_auth_blocked")
    if evidence.allowance not in {"free", "subscription_included"} or evidence.remaining != "available":
        raise CostBlocked("included_allowance_unknown_or_exhausted")
    if not all(value is True for value in (evidence.paid_fallback_disabled,
                evidence.purchased_credits_disabled, evidence.included_only_enforced, evidence.cloud)):
        raise CostBlocked("no_charge_or_cloud_guarantee_missing")
    if not evidence.source.strip():
        raise CostBlocked("verification_source_missing")
    if not evidence.actual_model or evidence.actual_model == "unknown":
        raise CostBlocked("actual_model_unknown")
    if evidence.actual_model not in evidence.available_models:
        raise CostBlocked("model_unavailable")
    return evidence.actual_model


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
