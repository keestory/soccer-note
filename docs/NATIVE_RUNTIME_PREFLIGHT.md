# Native runtime preflight — 2026-11-02

Latest provenance update: the parent reported a real **hosted-native-assistant-review**
at 2026-11-02 13:15–13:18 UTC; see [the discussion record](EXECUTIVE_AGENT_ROLLOUT.md).
It did not run through this repository CLI, establish actual model/zero billing,
or repair the blocked runtime. Earlier non-execution statements below describe
their recorded diagnostic times.

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

## Recovery investigation — 2026-11-02

The follow-up inspected filesystem metadata and official CLI help without
repeating the failed SQLite/log startup attempts. `statvfs` reports the filesystem
covering `/home/agent/.codex` as read-only; `/workspace` and `/tmp` are writable.
This distinguishes a mount/sandbox boundary from a chmod/ownership mistake.
Changing a repository file cannot repair it.

The [supported environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables)
and [state locations](https://learn.chatgpt.com/docs/config-file/config-advanced)
document a whole-state root and a separate SQLite root. The whole-state root also
selects configuration and authentication. No supported installation-ID-only path
override was found in the reference or installed CLI help. Moving the whole root
is therefore not a demonstrated way to retain this existing authenticated session;
no root environment variable, auth store, credential file or trust setting was
changed or copied.

Installed help also exposes `codex app-server proxy --sock <SOCKET_PATH>` for an
already running server. The default control socket
`/home/agent/.codex/app-server-control/app-server-control.sock` does not exist here.
The read-only daemon-version command returned exit 1 and no JSON metadata, so it
did not establish a running server. No alternate socket/remote endpoint was
supplied by the host. No proxy connection, daemon start/restart, login, token
refresh, private-session read or inference was attempted.

### Recovery handoff for the coordinating host

Use the saved cloud execution configuration and the existing pushed branches;
do not create a duplicate product task or touch unrelated projects. The platform
must supply one of these supported runtime shapes:

1. A cloud executor whose **platform-provisioned Codex state** is writable where
   the installed CLI needs installation/runtime state, with its existing approved
   authentication and managed security policy retained by the platform. The agent
   must not copy credentials or weaken the current sandbox to simulate this.
2. An already authorized native app-server endpoint provided by the cloud host,
   usable through the documented proxy/interface with the same account and no
   additional-charge bounds. A guessed socket or a newly authenticated account
   is not a substitute.

Recreating the same read-only state layout alone is not a verified recovery.
No environment-management/provisioning tool is exposed in this delegated container;
the coordinating host owns this step. No replacement environment was created.

Recovery acceptance: native `initialize`, `account/read` without forced refresh,
`account/rateLimits/read` and `model/list` all complete using existing access.
Then separately verify included/free allowance and enforced no-overage behavior
before connecting inference. Successful metadata reads alone are insufficient.
Five-role discussion and independent model review remain **not executed**.

### Independent code fixes completed while the host is blocked

The probe now distinguishes a PATH-alias read-only **warning** from a fatal
read-only startup **error**. An initialize RPC failure retains its own reason
instead of being overwritten by the warning. The same total deadline is checked
before sending another request and before accepting already buffered replies.
Three regression tests cover these defects; all use a fixture subprocess, not
an LLM or a recovered host. This improves diagnostics without claiming host repair.
