from pathlib import Path
import tomllib

import pytest


pytestmark = pytest.mark.no_db


ROOT = Path(__file__).resolve().parents[1]
CODEX_DIR = ROOT / ".codex"
AGENTS_DIR = CODEX_DIR / "agents"

EXPECTED_AGENTS = {
    "market_researcher", "strategy", "business_development", "marketing", "product_manager",
    "ui_ux", "architect", "planner", "engineer", "qa",
    "reviewer", "security_reviewer", "ops", "analyst", "doc_gardener",
    "gtm_lead", "release_council",
}

FORBIDDEN_CUSTOM_NAMES = {"default", "worker", "explorer"}

ALLOWED_MODELS = {
    "gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna",
}

WRITABLE_AGENTS = {"engineer", "qa", "doc_gardener"}
READ_ONLY_AGENTS = EXPECTED_AGENTS - WRITABLE_AGENTS


def load_toml(path: Path) -> dict:
    with path.open("rb") as handle:
        return tomllib.load(handle)


def test_project_config_enables_bounded_multi_agent_work():
    agents = load_toml(CODEX_DIR / "config.toml")["agents"]

    assert agents["enabled"] is True
    assert 1 <= agents["max_concurrent_threads_per_session"] <= 3
    assert agents["default_subagent_model"] == "gpt-5.6-terra"
    assert agents["default_subagent_reasoning_effort"] == "medium"


def test_custom_agents_have_valid_unique_identity_and_models():
    configs = [load_toml(path) for path in sorted(AGENTS_DIR.glob("*.toml"))]
    names = [config["name"] for config in configs]

    assert set(names) == EXPECTED_AGENTS
    assert set(names).isdisjoint(FORBIDDEN_CUSTOM_NAMES)
    assert len(names) == len(set(names))
    for config in configs:
        assert config["description"].strip()
        assert config["developer_instructions"].strip()
        assert config["model"] in ALLOWED_MODELS
        assert config["model_reasoning_effort"] in {
            "low", "medium", "high", "xhigh", "max", "ultra",
        }


def test_read_only_roles_cannot_modify_the_workspace():
    configs = {
        config["name"]: config
        for config in (load_toml(path) for path in sorted(AGENTS_DIR.glob("*.toml")))
    }
    for name in READ_ONLY_AGENTS:
        assert configs[name]["sandbox_mode"] == "read-only"
    assert {
        name for name, config in configs.items()
        if config["sandbox_mode"] == "workspace-write"
    } == WRITABLE_AGENTS


def test_astra_is_escalation_only():
    astra_agents = [
        config["name"]
        for config in (load_toml(path) for path in sorted(AGENTS_DIR.glob("*.toml")))
        if config["model"] == "gpt-6-astra"
    ]
    assert astra_agents == ["release_council"]


def test_xhigh_is_reserved_for_security_and_release_escalation():
    xhigh_agents = {
        config["name"]
        for config in (load_toml(path) for path in sorted(AGENTS_DIR.glob("*.toml")))
        if config["model_reasoning_effort"] == "xhigh"
    }
    assert xhigh_agents == {"security_reviewer", "release_council"}


def test_agents_map_points_to_codex_native_configuration():
    agents_md = (ROOT / "AGENTS.md").read_text(encoding="utf-8")

    assert ".codex/agents/*.toml" in agents_md
    assert "release_council" in agents_md
    assert "S0 직접 처리" in agents_md
    assert "하위 에이전트 없음" in agents_md
    assert "호출해야 할 때" in agents_md
    assert "호출하지 않을 때" in agents_md
    assert "동작 변경이면 `qa`" in agents_md
    assert "낮은 위험이면 별도 reviewer는 생략" in agents_md
    assert "보안 트리거가 있을 때만 `security_reviewer`" in agents_md
    assert "실제 배포가 범위일 때만 `ops`" in agents_md
    assert "부모가 명시하지 않는 한 다른 하위 에이전트를 만들지 않는다" in agents_md


def test_harness_docs_use_project_venv_and_conditional_routing():
    harness_doc = (ROOT / "docs" / "CODEX_HARNESS.md").read_text(encoding="utf-8")

    assert ".venv/bin/python -m pytest" in harness_doc
    assert "python3 -m pytest" not in harness_doc
    assert "필요한 역할만 선택" in harness_doc


def test_service_lifecycle_has_gates_parallel_tracks_and_feedback_loops():
    agents_md = (ROOT / "AGENTS.md").read_text(encoding="utf-8")

    required_terms = {
        "Opportunity Gate",
        "Product and Business",
        "Solution Gate",
        "Build–Verify Loop",
        "QA ──fail──→ Coding fix",
        "GTM 병렬 트랙",
        "Release Readiness",
        "Staged Release",
        "Measure / Learn",
    }
    assert required_terms.issubset(set(term for term in required_terms if term in agents_md))


def test_design_architecture_gtm_and_release_ownership_are_explicit():
    configs = {
        config["name"]: config
        for config in (load_toml(path) for path in sorted(AGENTS_DIR.glob("*.toml")))
    }

    ui_instructions = configs["ui_ux"]["developer_instructions"]
    assert all(term in ui_instructions for term in ("tokens", "components", "interaction contracts"))

    architect_instructions = configs["architect"]["developer_instructions"]
    assert all(term in architect_instructions for term in ("boundaries", "data ownership", "rollback"))

    gtm_instructions = configs["gtm_lead"]["developer_instructions"]
    assert all(term in gtm_instructions for term in ("positioning", "channels", "guardrails"))

    ops_instructions = configs["ops"]["developer_instructions"]
    assert all(term in ops_instructions for term in ("versioned artifact", "rollback path", "post-release smoke"))


def test_qa_fix_retest_and_post_release_learning_are_required():
    configs = {
        config["name"]: config
        for config in (load_toml(path) for path in sorted(AGENTS_DIR.glob("*.toml")))
    }

    qa_instructions = configs["qa"]["developer_instructions"]
    assert all(term in qa_instructions for term in ("defect packet", "Re-run affected checks"))

    analyst_instructions = configs["analyst"]["developer_instructions"]
    assert all(term in analyst_instructions for term in ("baseline", "observation window", "rollback"))
