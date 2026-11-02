"""Native transport fixtures use a tiny Python process, never a model service."""

import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

from agent_governance.native_preflight import MetadataSession, ProbeError, probe_native, summarize_metadata


ROOT = Path(__file__).resolve().parents[1]
ACCOUNT = {"account": {"type": "chatgpt", "planType": "free", "email": "private@example.test"}}
LIMITS = {"rateLimits": {"limitId": "codex", "primary": {"usedPercent": 10},
                         "secondary": {"usedPercent": 20}, "credits": {"hasCredits": False}}}
MODELS = {"data": [{"model": "gpt-6.1-sol", "secret": "private-token"}], "nextCursor": None}


class NativePreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="preflight-fixture-")
        self.root = Path(self.temp.name)
        self.calls = self.root / "calls.jsonl"
        self.pid = self.root / "pid"

    def tearDown(self):
        self.temp.cleanup()

    def server(self, mode="success"):
        path = self.root / "fake_codex"
        replies = {"initialize": {"userAgent": "fixture"}, "account/read": ACCOUNT,
                   "account/rateLimits/read": LIMITS, "model/list": MODELS}
        path.write_text(f'''#!{sys.executable}
import json, os, pathlib, sys, time
mode = {mode!r}
pathlib.Path({str(self.pid)!r}).write_text(str(os.getpid()))
replies = json.loads({json.dumps(replies)!r})
if mode == "readonly":
    print("Project-local config disabled until project trusted", file=sys.stderr)
    print("Error: Read-only file system (os error 30) private-token", file=sys.stderr)
    sys.exit(1)
for line in sys.stdin:
    request = json.loads(line)
    with open({str(self.calls)!r}, "a") as out:
        out.write(json.dumps(request) + "\\n")
    if request["method"] == "initialized":
        continue
    if mode == "partial":
        sys.stdout.write('{{"id":'); sys.stdout.flush(); time.sleep(10)
    if mode == "oversized":
        print("x" * 1000001, flush=True); time.sleep(10)
    if mode == "refresh":
        print(json.dumps({{"id": 99, "method": "account/chatgptAuthTokens/refresh"}}), flush=True)
        time.sleep(10)
    if mode == "rpc_error":
        print(json.dumps({{"id": request["id"], "error": {{"message": "private-token"}}}}), flush=True)
        continue
    print(json.dumps({{"id": request["id"], "result": replies[request["method"]]}}), flush=True)
''')
        path.chmod(0o700)
        return str(path)

    def assert_reaped(self):
        if self.pid.exists():
            with self.assertRaises(ProcessLookupError):
                os.kill(int(self.pid.read_text()), 0)

    def test_native_reads_are_allowlisted_and_never_unlock_inference(self):
        report = probe_native(ROOT, executable=self.server())
        requests = [json.loads(line) for line in self.calls.read_text().splitlines()]
        self.assertEqual([r["method"] for r in requests], ["initialize", "initialized",
                         "account/read", "account/rateLimits/read", "model/list"])
        self.assertEqual(requests[2]["params"], {"refreshToken": False})
        self.assertEqual(report["stage"], "billing_enforcement")
        self.assertEqual(report["reason"], "included_only_enforcement_unverified")
        self.assertEqual(report["remaining_observed"], "available")
        self.assertEqual(report["execution"], "blocked")
        self.assertEqual(report["model_calls"], 0)
        self.assertEqual(report["actual_model"], "unknown")
        self.assertNotIn("private", json.dumps(report))
        self.assert_reaped()

    def test_mutating_methods_are_rejected_before_write(self):
        session = MetadataSession([self.server()], ROOT, self.root, 1)
        try:
            for method in ("turn/start", "thread/start", "account/login/start",
                           "account/rateLimitResetCredit/consume", "config/value/write"):
                with self.assertRaisesRegex(ProbeError, "native_method_not_allowed"):
                    session.read(method)
            self.assertFalse(self.calls.exists())
        finally:
            session.close()

    def test_readonly_and_trust_warning_are_separate_from_quota(self):
        report = probe_native(ROOT, executable=self.server("readonly"))
        self.assertEqual(report["stage"], "native_startup")
        self.assertEqual(report["reason"], "native_startup_read_only_filesystem")
        self.assertEqual(report["warnings"], ["project_config_untrusted", "read_only_filesystem"])
        self.assertEqual(report["completed_reads"], [])
        self.assertNotIn("remaining_observed", report)
        self.assertNotIn("private-token", json.dumps(report))
        self.assert_reaped()

    def test_partial_stdout_cannot_hang_past_total_deadline(self):
        started = time.monotonic()
        report = probe_native(ROOT, executable=self.server("partial"), timeout=.15)
        self.assertEqual(report["reason"], "native_metadata_timeout")
        self.assertLess(time.monotonic() - started, 3)
        self.assert_reaped()

    def test_oversized_output_is_bounded(self):
        report = probe_native(ROOT, executable=self.server("oversized"))
        self.assertEqual(report["reason"], "native_metadata_output_limit")
        self.assert_reaped()

    def test_server_token_refresh_request_is_not_executed(self):
        report = probe_native(ROOT, executable=self.server("refresh"))
        self.assertEqual(report["reason"], "native_server_request_not_allowed")
        self.assertEqual(len(self.calls.read_text().splitlines()), 1)
        self.assert_reaped()

    def test_rpc_error_is_redacted_and_not_retried(self):
        report = probe_native(ROOT, executable=self.server("rpc_error"))
        self.assertEqual(report["reason"], "native_metadata_rpc_error")
        self.assertNotIn("private-token", json.dumps(report))
        self.assertEqual(len(self.calls.read_text().splitlines()), 1)

    def test_missing_binary_is_distinct_from_entitlement_failure(self):
        report = probe_native(ROOT, executable=str(self.root / "absent"))
        self.assertEqual(report["reason"], "native_cli_start_failed")
        self.assertEqual(report["stage"], "native_startup")

    def test_invalid_or_exhausted_windows_never_report_available(self):
        for used in (True, -1, 101, "10", float("nan"), float("inf"), None):
            result = summarize_metadata(ACCOUNT, {"rateLimits": {"primary": {"usedPercent": used},
                                       "secondary": {"usedPercent": 5}}}, MODELS)
            self.assertEqual(result["remaining_observed"], "unknown")
        result = summarize_metadata(ACCOUNT, {"rateLimits": {"primary": {"usedPercent": 100}}}, MODELS)
        self.assertEqual(result["remaining_observed"], "exhausted")
        result = summarize_metadata(ACCOUNT, {"rateLimits": {"primary": {"usedPercent": 5},
                                    "rateLimitReachedType": "workspace"}}, MODELS)
        self.assertEqual(result["remaining_observed"], "exhausted")

    def test_catalog_and_plan_are_not_actual_model_or_billing_evidence(self):
        result = summarize_metadata({"account": {"type": "private-token", "planType": "private-token"}},
                                    {}, {"data": [{"model": "private@example.test"}], "nextCursor": "opaque"})
        self.assertEqual(result["auth_mode"], "unknown")
        self.assertEqual(result["plan_type"], "unknown")
        self.assertEqual(result["available_models"], [])
        self.assertFalse(result["model_catalog_complete"])
        self.assertNotIn("private", json.dumps(result))
        malformed = summarize_metadata({"account": {"type": [], "planType": {}}}, {}, {})
        self.assertEqual(malformed["auth_mode"], "unknown")
        self.assertEqual(malformed["plan_type"], "unknown")

    def test_cli_failure_is_nonzero_and_does_not_emit_a_dialogue(self):
        from agent_governance.__main__ import main
        from contextlib import redirect_stdout
        import io
        report = {"execution": "blocked", "actual_model": "unknown", "model_calls": 0}
        output = io.StringIO()
        with patch("sys.argv", ["agent_governance", "--root", str(ROOT), "--preflight", "--topics", "ai"]), \
             patch("agent_governance.native_preflight.probe_native", return_value=report), redirect_stdout(output):
            with self.assertRaises(SystemExit) as error:
                main()
        self.assertEqual(error.exception.code, 2)
        self.assertEqual(json.loads(output.getvalue())["required_roles"], ["strategy", "finance", "ai_lead"])
        self.assertNotIn("events", output.getvalue())


if __name__ == "__main__":
    unittest.main()
