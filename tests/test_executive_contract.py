"""Offline behavioral checks; synthetic fixtures are never actual agent dialogue."""

from dataclasses import replace
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import tomllib
import unittest

from agent_governance.catalog import load_catalog, select_roles
from agent_governance.discussion import Review, run_discussion
from agent_governance.policy import CostBlocked, Entitlement, require_included


ROOT = Path(__file__).resolve().parents[1]
NOW = datetime(2026, 11, 2, 0, 0, tzinfo=timezone.utc)
TOPICS = ["strategy", "revenue", "acquisition", "growth", "ai"]
ROLE_IDS = {"strategy", "finance", "marketing", "growth", "ai_lead"}


def fixture_entitlement(**changes):
    return replace(Entitlement(
        NOW, NOW + timedelta(minutes=2), "hosted_included", "gpt-6.1-sol",
        ("gpt-6.1-sol",), "subscription_included", "available",
        True, True, True, True, "synthetic_test_only"), **changes)


class RecordingHost:
    def __init__(self):
        self.calls = []
        self.proof = fixture_entitlement()
        self.fail = False
        self.veto_role = None
        self.reported_model = "gpt-6.1-sol"

    def entitlement(self):
        return self.proof

    def invoke(self, request):
        self.calls.append(request)
        if self.fail:
            raise RuntimeError("test failure after possible execution")
        return Review("synthetic proposal", "synthetic objection", ("fixture source",),
                      "unknown outcome", "verify fixture", request.role["id"] == self.veto_role,
                      self.reported_model, "synthetic-test-participant")


class RoutingTests(unittest.TestCase):
    def test_module_entrypoint_is_not_a_filename_violation(self):
        from linters.naming_linter import check_file_names
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "__main__.py").write_text("pass\n")
            (root / "Bad-Name.py").write_text("pass\n")
            self.assertEqual([item.file for item in check_file_names(root)], ["Bad-Name.py"])

    def test_declared_native_auto_spawn_stays_disabled_until_runtime_is_verified(self):
        config = tomllib.loads((ROOT / ".codex/config.toml").read_text())
        self.assertIs(config["agents"]["enabled"], False)
        self.assertNotIn("default_subagent_model", config["agents"])

    def test_native_agents_load_once_with_inherited_models(self):
        contract = load_catalog(ROOT)
        self.assertEqual({r["id"] for r in contract["roles"]}, ROLE_IDS)
        self.assertEqual(len([r for r in contract["roles"] if r["office"] == "CMO"]), 1)

    def test_all_topics_include_five_roles_once(self):
        roles = select_roles(load_catalog(ROOT), TOPICS + TOPICS)
        self.assertEqual(len(roles), 5)
        self.assertEqual({r["id"] for r in roles}, ROLE_IDS)

    def test_relevant_reviewers_are_required_without_full_council(self):
        contract = load_catalog(ROOT)
        self.assertEqual({r["id"] for r in select_roles(contract, ["ai"])},
                         {"strategy", "finance", "ai_lead"})
        self.assertEqual({r["id"] for r in select_roles(contract, ["growth"])}, {"finance", "growth"})
        self.assertEqual(select_roles(contract, []), [])
        with self.assertRaises(ValueError):
            select_roles(contract, ["silent_unknown_scope"])

    def test_duplicate_native_id_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            shutil.copytree(ROOT / "agent_governance", root / "agent_governance")
            shutil.copytree(ROOT / ".codex/agents", root / ".codex/agents")
            shutil.copy(root / ".codex/agents/marketing.toml", root / ".codex/agents/cmo-copy.toml")
            with self.assertRaisesRegex(ValueError, "duplicate native"):
                load_catalog(root)

    def test_duplicate_office_is_rejected(self):
        contract = (ROOT / "agent_governance/roles.toml").read_text()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "agent_governance").mkdir()
            (root / "agent_governance/roles.toml").write_text(contract.replace('office = "CGO"', 'office = "CMO"'))
            with self.assertRaises(ValueError):
                load_catalog(root)

    def test_offline_cli_does_not_claim_execution(self):
        result = subprocess.run([sys.executable, "-m", "agent_governance", "--topics", *TOPICS],
                                cwd=ROOT, text=True, capture_output=True, check=True)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["execution"], "blocked")
        self.assertEqual(payload["actual_model"], "unknown")
        self.assertFalse(payload["paid_fallback"])

    def test_existing_entrypoint_routes_offline_and_blocks_model_requests(self):
        plan = subprocess.run([sys.executable, "run.py", "--council-plan", *TOPICS],
                              cwd=ROOT, text=True, capture_output=True, check=True)
        self.assertEqual(len(json.loads(plan.stdout)["roles"]), 5)
        denied = subprocess.run([sys.executable, "run.py", "--agent", "finance", "review"],
                                cwd=ROOT, text=True, capture_output=True)
        self.assertNotEqual(denied.returncode, 0)
        self.assertIn("legacy model execution is blocked", denied.stderr)


class CostGuardTests(unittest.TestCase):
    def test_missing_or_unsafe_proof_never_allows_a_call(self):
        cases = [None, fixture_entitlement(auth_mode="apikey"),
                 fixture_entitlement(allowance="paid"), fixture_entitlement(remaining="unknown"),
                 fixture_entitlement(remaining="exhausted"), fixture_entitlement(actual_model="unknown"),
                 fixture_entitlement(actual_model="unavailable"), fixture_entitlement(source=""),
                 fixture_entitlement(paid_fallback_disabled=False),
                 fixture_entitlement(purchased_credits_disabled=False),
                 fixture_entitlement(included_only_enforced=False), fixture_entitlement(cloud=False),
                 fixture_entitlement(included_only_enforced="false"),
                 fixture_entitlement(verified_at=NOW + timedelta(seconds=1)),
                 fixture_entitlement(expires_at=NOW),
                 fixture_entitlement(verified_at=NOW - timedelta(minutes=6)),
                 fixture_entitlement(verified_at=NOW.replace(tzinfo=None))]
        for proof in cases:
            with self.subTest(proof=proof):
                with self.assertRaises(CostBlocked):
                    require_included(proof, NOW)
                host = RecordingHost()
                host.proof = proof
                report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
                self.assertEqual(report.status, "blocked")
                self.assertEqual(host.calls, [])

    def test_included_and_free_are_distinct_valid_allowances(self):
        for allowance in ("free", "subscription_included"):
            self.assertEqual(require_included(fixture_entitlement(allowance=allowance), NOW), "gpt-6.1-sol")

    def test_missing_live_adapter_is_blocked_not_fake_dialogue(self):
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit")
        self.assertEqual(report.status, "blocked")
        self.assertEqual(report.events, [])
        self.assertEqual(set(report.required_roles), ROLE_IDS)

    def test_quota_rechecked_before_each_call(self):
        host = RecordingHost()
        invoke = host.invoke
        def consume(request):
            reply = invoke(request)
            host.proof = replace(host.proof, remaining="exhausted")
            return reply
        host.invoke = consume
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(len(host.calls), 1)
        self.assertEqual(len(report.events), 1)
        self.assertEqual(report.status, "blocked")

    def test_verification_failure_does_not_invoke(self):
        host = RecordingHost()
        def fail():
            raise RuntimeError("unavailable")
        host.entitlement = fail
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(report.reason, "entitlement_read_failed")
        self.assertEqual(host.calls, [])


class DiscussionTests(unittest.TestCase):
    def test_malformed_review_does_not_become_a_vote_or_trigger_retry(self):
        host = RecordingHost()
        invoke = host.invoke
        def malformed(request):
            return replace(invoke(request), proposal=None)
        host.invoke = malformed
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(report.status, "incomplete")
        self.assertEqual(len(host.calls), 1)
        self.assertEqual(report.events, [])

    def test_five_roles_propose_then_challenge_with_actual_attribution(self):
        host = RecordingHost()
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(len(host.calls), 10)
        self.assertEqual({call.role["id"] for call in host.calls}, ROLE_IDS)
        self.assertTrue(all(len(call.previous) == 5 for call in host.calls[5:]))
        self.assertEqual(report.status, "awaiting_ceo_decision")
        self.assertIsNone(report.decision)
        self.assertTrue(all(event["spoken_at"] is None for event in report.events))
        self.assertTrue(all(event["actual_model"] == "gpt-6.1-sol" for event in report.events))
        cmo = next(event for event in report.events if event["role"] == "marketing")
        self.assertEqual(cmo["preferred_model"], "gpt-6.1-terra")
        self.assertEqual(cmo["participant"], "synthetic-test-participant")

    def test_veto_stops_later_calls_without_creating_consensus(self):
        host = RecordingHost()
        host.veto_role = "finance"
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(report.status, "vetoed")
        self.assertEqual(len(host.calls), 2)
        self.assertIsNone(report.decision)

    def test_uncertain_execution_is_not_retried(self):
        host = RecordingHost()
        host.fail = True
        report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(report.status, "uncertain")
        self.assertEqual(len(host.calls), 1)
        self.assertEqual(report.events, [])

    def test_missing_or_changed_actual_model_stops_without_fallback(self):
        for reported in (None, "gpt-6-astra"):
            host = RecordingHost()
            host.reported_model = reported
            report = run_discussion(ROOT, TOPICS, "fixture", "fixture-commit", host, lambda: NOW)
            self.assertEqual(report.status, "uncertain")
            self.assertEqual(len(host.calls), 1)
            self.assertEqual(report.events, [])

    def test_empty_topics_do_not_invoke(self):
        host = RecordingHost()
        report = run_discussion(ROOT, [], "fixture", "fixture-commit", host, lambda: NOW)
        self.assertEqual(report.status, "not_applicable")
        self.assertEqual(host.calls, [])


if __name__ == "__main__":
    unittest.main()
