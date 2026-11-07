"""Load one canonical file per office and derive topic-specific participants."""

from pathlib import Path
import tomllib


def load_catalog(root: Path) -> dict:
    with (root / "agent_governance/roles.toml").open("rb") as stream:
        contract = tomllib.load(stream)
    roles = contract["roles"]
    if len({r["id"] for r in roles}) != len(roles):
        raise ValueError("duplicate role id")
    if {r["office"] for r in roles} != {"CSO", "CFO", "CMO", "CGO", "CAIO"}:
        raise ValueError("missing or unknown executive office")
    if len({r["office"] for r in roles}) != len(roles):
        raise ValueError("duplicate executive office")
    native = []
    for path in (root / ".codex/agents").glob("*.toml"):
        with path.open("rb") as stream:
            native.append((path.name, tomllib.load(stream)))
    names = [value["name"] for _, value in native]
    if len(names) != len(set(names)):
        raise ValueError("duplicate native agent id")
    for role in roles:
        matches = [(name, agent) for name, agent in native if agent["name"] == role["id"]]
        if len(matches) != 1 or matches[0][0] != role["file"]:
            raise ValueError(f"missing or duplicate native role: {role['id']}")
        agent = matches[0][1]
        if agent.get("sandbox_mode") != "read-only" or not agent.get("developer_instructions"):
            raise ValueError("executive agents require read-only instructions")
        if "model" in agent:
            raise ValueError("executive actual model must inherit; preference is separate")
        if not set(role["required_for"]) <= set(contract["topics"]):
            raise ValueError("unknown routing topic")
    return contract


def select_roles(contract: dict, topics: list[str]) -> list[dict]:
    unknown = set(topics) - set(contract["topics"])
    if unknown:
        raise ValueError("unknown topics: " + ", ".join(sorted(unknown)))
    selected = set(topics)
    return [role for role in contract["roles"] if selected.intersection(role["required_for"])]
