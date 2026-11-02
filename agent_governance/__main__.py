"""Offline planning only. No CLI switch can enable a paid model or bypass proof."""

import argparse
import json
from pathlib import Path

from .catalog import load_catalog, select_roles


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--topics", nargs="*", default=[])
    args = parser.parse_args()
    try:
        roles = select_roles(load_catalog(args.root), args.topics)
    except (ValueError, KeyError, OSError) as error:
        parser.error(str(error))
    print(json.dumps({
        "mode": "offline_plan", "execution": "blocked" if roles else "not_applicable",
        "reason": "verified_included_host_unavailable" if roles else None,
        "actual_model": "unknown", "model_selection": "inherit", "paid_fallback": False,
        "roles": roles,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
