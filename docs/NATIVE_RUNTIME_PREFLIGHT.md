# Native runtime preflight — 2026-11-02

## Result and scope

The native metadata adapter is implemented in `agent_governance/native_preflight.py`.
It can initialize an existing Codex CLI and read account type, quota windows and
the model catalog. It cannot start threads/turns, log in, refresh external tokens,
consume credits or change configuration. No paid API or new credential is required
by this design. It is **not yet an inference adapter**.

The real cloud run at **2026-11-02 09:24:48 UTC** exited with code **2**:

```json
{
  "stage": "native_startup",
  "reason": "native_startup_read_only_filesystem",
  "execution": "blocked",
  "completed_reads": [],
  "model_calls": 0,
  "actual_model": "unknown"
}
```

No five-role discussion or independent model review ran. The proposal/challenge
tests and native protocol tests use synthetic fixtures, not actual participants.
Discoverability, store compliance and competitive benchmarking are not applicable
to this internal metadata adapter; it changes no public product flow.

## Exact startup failure

CLI version: `0.163.0`. A filesystem-only trace of the cloud subprocess observed:

```text
open("/home/agent/.codex/installation_id", O_RDWR|O_CREAT|...) = -1 EROFS
```

The CLI needs a writable installation-state file before accepting `initialize`.
The trace also saw a failed PATH-alias chmod under `.codex/tmp/arg0-linux`; this
is an earlier warning. No file contents, auth tokens or account identifiers were
traced or published. The host-managed home is outside the writable workspace.

Supplying private `/tmp` paths for **both** `sqlite_home` and `log_dir` did not
relocate `installation_id`. The public [installation-state implementation](https://github.com/openai/codex/blob/main/codex-rs/core/src/installation_id.rs)
opens that file read/write, and the [app-server startup](https://github.com/openai/codex/blob/main/codex-rs/app-server/src/lib.rs)
calls it before starting its transport. These moving upstream sources corroborate
the observed syscall; they are not a claim that the installed binary was built
from today's `main`.

The project-untrusted warning is separate: project config/hooks/exec policies
may remain disabled after startup is repaired. No trust, credential, mount,
global config, sandbox or network permissions were changed. The diagnostic did
not access a Mac or an unrelated project.

## Automated checks and boundaries

```sh
python3 -m agent_governance --preflight --topics strategy revenue acquisition growth ai
python3 -m unittest discover -s tests -p 'test_*preflight.py'
```

The preflight has a 20-second total metadata deadline, bounds stdout at 1 MB,
reaps the process, deletes its private temporary state/logs and returns only
allowlisted metadata. Raw account data and server error text are not printed.
It permits only `initialize`, `account/read` with `refreshToken=false`,
`account/rateLimits/read` and `model/list`, plus the `initialized` notification.
Any server request, including token refresh, ends the probe without replying
with credentials. Errors are not retried automatically in the same run.

`execution=blocked` always returns nonzero (2). Even a successful read does
**not** manufacture an `Entitlement`: account plan/model availability/quota
percentages alone do not establish enforced no-additional-charge execution.
`available_models` is distinct from `actual_model`, which stays `unknown` until
a real invocation can be observed. No CLI flag or JSON file unlocks execution.

## External prerequisites and next action

1. **Host runtime repair:** the existing cloud executor must provide a supported
   writable installation-state location, or a working already-authorized hosted
   metadata/runtime interface. The current CLI cannot move that file with the
   documented SQLite/log options. Repository code cannot repair this read-only
   host mount within its current permissions. A new paid API is not the solution.
2. **Existing-account billing evidence:** after metadata reads work, verify the
   account's included/free allowance and provider-enforced stop at its limit,
   including no purchased-credit fallback or overage. The existing native
   collaboration tool catalog exposes models but no account-specific billing
   enforcement metadata; its availability alone is insufficient evidence.
3. **Inference connection:** only a host that enforces those bounds may implement
   `IncludedHost`. Keep native trust unchanged until its required approval exists.
   Then run five proposals and five challenges, record real participants/models
   and dissent, and leave final judgment to the coordinating agent.

Billing evidence remains **unobserved**, not denied or exhausted. Startup is a
reproduced environment failure, not an inferred quota failure. The next owner is
the cloud runtime provider/administrator for item 1, followed by the coordinating
agent for account reads and the guarded connection. No upgrade or credential
expansion is requested.

Official references: [app-server read protocol](https://learn.chatgpt.com/docs/app-server),
[local state-path options](https://learn.chatgpt.com/docs/config-file/config-reference),
[included usage and credits](https://learn.chatgpt.com/docs/pricing), and
[workspace overage behavior](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-usage-and-cost).
The latter documents why account-specific overage settings matter; it does not
establish which plan or settings this account has.
