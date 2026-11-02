"""Bounded native Codex metadata probe; never starts a thread or model turn.

This is a read-only adapter, not an IncludedHost. A successful account/limit
read does not attest billing enforcement and cannot unlock run_discussion.
"""

import json
import math
import os
from pathlib import Path
import re
import selectors
import subprocess
import tempfile
import time

from .policy import utc_now


class ProbeError(RuntimeError):
    """Sanitized failure code, without server output or account identifiers."""


READ_REQUESTS = {
    "initialize": {"clientInfo": {"name": "executive_preflight", "version": "1.0"}},
    "account/read": {"refreshToken": False},
    "account/rateLimits/read": {},
    "model/list": {"limit": 100, "includeHidden": False},
}


class MetadataSession:
    """One private stdio process, a fixed read allowlist and one total deadline."""

    def __init__(self, command: list[str], root: Path, scratch: Path, timeout: float):
        self.deadline = time.monotonic() + timeout
        self.stderr = tempfile.TemporaryFile(dir=scratch)
        try:
            self.process = subprocess.Popen(command, cwd=root, stdin=subprocess.PIPE,
                                            stdout=subprocess.PIPE, stderr=self.stderr)
        except OSError:
            self.stderr.close()
            raise ProbeError("native_cli_start_failed") from None
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ)
        self.buffer = b""
        self.serial = 0
        self.observed_bytes = 0
        self.warnings = set()
        self.fatal_read_only = False

    def _send(self, message: dict) -> None:
        if time.monotonic() >= self.deadline:
            raise ProbeError("native_metadata_timeout")
        try:
            self.process.stdin.write(json.dumps(message).encode() + b"\n")
            self.process.stdin.flush()
        except (BrokenPipeError, OSError):
            raise ProbeError("native_process_exited") from None

    def _receive(self) -> dict:
        # Buffered messages must not outlive the same total request budget.
        if time.monotonic() >= self.deadline:
            raise ProbeError("native_metadata_timeout")
        while b"\n" not in self.buffer:
            remaining = self.deadline - time.monotonic()
            if remaining <= 0 or not self.selector.select(remaining):
                raise ProbeError("native_metadata_timeout")
            chunk = os.read(self.process.stdout.fileno(), 65536)
            if not chunk:
                raise ProbeError("native_process_exited")
            self.observed_bytes += len(chunk)
            if self.observed_bytes > 1_000_000:
                raise ProbeError("native_metadata_output_limit")
            self.buffer += chunk
        line, self.buffer = self.buffer.split(b"\n", 1)
        try:
            value = json.loads(line)
        except (ValueError, UnicodeDecodeError):
            raise ProbeError("native_metadata_invalid_json") from None
        if not isinstance(value, dict):
            raise ProbeError("native_metadata_invalid_response")
        return value

    def read(self, method: str) -> dict:
        if method not in READ_REQUESTS:
            raise ProbeError("native_method_not_allowed")
        self.serial += 1
        self._send({"id": self.serial, "method": method, "params": READ_REQUESTS[method]})
        while True:
            response = self._receive()
            # A server request (including token refresh) is never acted on.
            if "method" in response and "id" in response:
                raise ProbeError("native_server_request_not_allowed")
            if response.get("method") == "configWarning":
                self._classify(json.dumps(response.get("params", {})))
            if response.get("id") != self.serial:
                continue
            if "error" in response:
                raise ProbeError("native_metadata_rpc_error")
            if not isinstance(response.get("result"), dict):
                raise ProbeError("native_metadata_invalid_response")
            if method == "initialize":
                self._send({"method": "initialized", "params": {}})
            return response["result"]

    def _classify(self, text: str) -> None:
        if "Read-only file system" in text:
            self.warnings.add("read_only_filesystem")
        if any(line.strip().startswith("Error:") and "Read-only file system" in line
               for line in text.splitlines()):
            self.fatal_read_only = True
        if "until project trusted" in text or "as trusted project" in text:
            self.warnings.add("project_config_untrusted")

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.terminate()
        try:
            self.process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=2)
        self.selector.close()
        self.process.stdin.close()
        self.process.stdout.close()
        self.stderr.seek(0)
        self._classify(self.stderr.read(65536).decode(errors="replace"))
        self.stderr.close()


def _window(value: object) -> dict | None:
    if not isinstance(value, dict):
        return None
    used = value.get("usedPercent")
    if type(used) not in (int, float) or not math.isfinite(used) or not 0 <= used <= 100:
        return None
    return {"used_percent": used}


def summarize_metadata(account: dict, limits: dict, models: dict) -> dict:
    """Project only known safe fields; never echo emails, tokens or free text."""
    details = account.get("account")
    details = details if isinstance(details, dict) else {}
    auth = details.get("type")
    if not isinstance(auth, str) or auth not in {"chatgpt", "chatgptAuthTokens", "apikey", "agentIdentity",
                    "personalAccessToken", "bedrockApiKey"}:
        auth = "unknown"
    plan = details.get("planType")
    if not isinstance(plan, str) or plan not in {"free", "go", "plus", "pro", "team", "business", "enterprise", "edu"}:
        plan = "unknown"
    snapshot = limits.get("rateLimits")
    if not isinstance(snapshot, dict):
        snapshot = {}
    windows = {name: _window(snapshot.get(name)) for name in ("primary", "secondary")}
    valid = [value for value in windows.values() if value is not None]
    # Any malformed present window makes the observation unknown, not available.
    malformed = any(snapshot.get(name) is not None and windows[name] is None for name in windows)
    remaining = "unknown"
    if valid and not malformed:
        remaining = "exhausted" if any(w["used_percent"] >= 100 for w in valid) else "available"
    if snapshot.get("rateLimitReachedType") is not None:
        remaining = "exhausted"
    credits = snapshot.get("credits")
    credits = credits if isinstance(credits, dict) else {}
    catalog = models.get("data")
    catalog = catalog if isinstance(catalog, list) else []
    available = sorted({item["model"] for item in catalog if isinstance(item, dict)
                        and isinstance(item.get("model"), str)
                        and re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,79}", item["model"])})
    return {
        "auth_mode": auth, "plan_type": plan, "remaining_observed": remaining,
        "windows": windows,
        "credits_present": credits.get("hasCredits") if type(credits.get("hasCredits")) is bool else None,
        "available_models": available, "model_catalog_complete": models.get("nextCursor") is None,
    }


def probe_native(root: Path, *, timeout: float = 20, executable: str = "codex") -> dict:
    """Read existing native metadata without changing trust, auth or global paths."""
    if not 0 < timeout <= 60:
        raise ValueError("timeout must be between 0 and 60 seconds")
    report = {
        "mode": "native_readonly_preflight", "observed_at": utc_now().isoformat(),
        "execution": "blocked", "actual_model": "unknown", "model_calls": 0,
        "included_only_enforced": "unknown", "completed_reads": [], "warnings": [],
    }
    session = None
    try:
        with tempfile.TemporaryDirectory(prefix="executive-preflight-", dir="/tmp") as temp:
            scratch = Path(temp)
            command = [executable, "-c", f'sqlite_home="{scratch / "state"}"',
                       "-c", f'log_dir="{scratch / "logs"}"', "app-server", "--stdio"]
            try:
                session = MetadataSession(command, root, scratch, timeout)
                replies = {}
                for method in READ_REQUESTS:
                    replies[method] = session.read(method)
                    report["completed_reads"].append(method)
                report.update(summarize_metadata(replies["account/read"],
                              replies["account/rateLimits/read"], replies["model/list"]))
                report["stage"] = "billing_enforcement"
                report["reason"] = "included_only_enforcement_unverified"
                if report["auth_mode"] not in {"chatgpt", "chatgptAuthTokens"}:
                    report["reason"] = "included_auth_unverified"
                elif report["remaining_observed"] != "available":
                    report["reason"] = "included_allowance_unknown_or_exhausted"
            finally:
                if session is not None:
                    session.close()
                    report["warnings"] = sorted(session.warnings)
    except (ProbeError, OSError) as error:
        report["stage"] = "metadata_read" if report["completed_reads"] else "native_startup"
        report["reason"] = str(error) if isinstance(error, ProbeError) else "runtime_path_unavailable"
        if (session is not None and session.fatal_read_only
                and report["stage"] == "native_startup"
                and report["reason"] == "native_process_exited"):
            report["reason"] = "native_startup_read_only_filesystem"
    return report
