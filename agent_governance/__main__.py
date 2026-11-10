"""Offline planning or native metadata preflight; neither can start inference."""

import argparse
import json
from pathlib import Path

from .catalog import load_catalog, select_roles


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--topics", nargs="*", default=[])
    parser.add_argument("--preflight", action="store_true", help="Read native account/limits only; no model call")
    args = parser.parse_args()
    try:
        roles = select_roles(load_catalog(args.root), args.topics)
    except (ValueError, KeyError, OSError) as error:
        parser.error(str(error))
    if args.preflight:
        from .native_preflight import probe_native
        report = probe_native(args.root)
        report["required_roles"] = [role["id"] for role in roles]
        print(json.dumps(report, ensure_ascii=False, indent=2))
        raise SystemExit(2 if report["execution"] == "blocked" else 0)
    print(json.dumps({
        "mode": "offline_plan", "execution": "blocked" if roles else "not_applicable",
        "reason": "verified_included_host_unavailable" if roles else None,
        "actual_model": "unknown", "model_selection": "inherit", "paid_fallback": False,
        "roles": roles,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
