# Runbook: ethscan.org explorer shows stale blocks

Server: `crypto@142.132.144.181`
Data dir: `/home/crypto/ethscan.org/erigon-data` (on `/home`, RAID5 `md3` over 4× NVMe)
Stack: `erigon3` (EL) + `prysm6` (CL) + `otterscan-api` + `otterscan-frontend` + `nginx`

## 1. How to recognize the problem

- ethscan.org's "Latest Blocks" timestamps are hours old.
- `eth_blockNumber` returns a stale value (compare against any public mainnet node).
- `eth_syncing` is **not** `false` and shows `Execution` < `Headers`.
- `prysm6` logs say `"Called fork choice updated with optimistic block"` (CL is producing FCUs but EL can't validate fast enough).

## 2. Quick diagnosis (5 commands)

```bash
ssh crypto@142.132.144.181
# 1. Compare head to chain tip
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","id":1}' http://localhost:8545 \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["result"]; print(d if d is False else {s["stage_name"]:int(s["block_number"],16) for s in d["stages"]})'

# 2. Execution rate (look for `blk/s=` and `DONE in=...`)
docker logs --since 10m erigon3 2>&1 | grep -E 'Execution\] (DONE|serial executed)' | tail -20

# 3. Are payloads validating or only "optimistic"?
docker logs --since 1m prysm6 2>&1 | grep -E 'optimistic|VALID' | tail -5

# 4. System pressure
docker stats --no-stream erigon3   # cgroup-real memory (not erigon's [mem] line)
vmstat 2 3                          # bi (reads) vs wa (iowait)

# 5. Is RPC being hammered from outside?
docker logs --since 1m erigon3 2>&1 | grep -oE 'method=[a-zA-Z_]+' | sort | uniq -c | sort -rn
```

## 3. Known root causes, in order of probability

### A. Erigon at chain tip is intrinsically slow on this version

This was the cause of the **2026-05-21 incident** (see §4). v3.3.0 ran the trie-computation phase of every execution cycle as a separate ~1-minute commit, advancing only 1–2 blocks per cycle. Mainnet produces ~5 blocks/min, so it fell further behind every minute.

**Tell:**
- Execution log lines like `[4/6 Execution] DONE in=1m9s block=...`, repeatedly, with `blk/s=0.02–0.05` and `tdur=10ms` (actual EVM is fast — the time is in commit / trie).
- Disk reads on `md3` are sustained (700+ MB/s in `vmstat bi`), but `wa` (iowait) is ~1% and CPU is ~2 cores.

**Fix:** upgrade Erigon. v3.4.x has "Reduced impact on ChainTip performance" as a major release feature. **3.4 is a drop-in upgrade — no data migration or re-sync.** v3.4.0+ also lets you shrink chaindata 4× via `seg step-rebase` (see §5).

### B. Long-running prune / commitment compaction

On v3.4 after a migration or under load, Erigon may pause execution for a snapshot prune that takes 15–25 min. Frontend looks stalled the entire time.

**Tell:**
- `[snapshots] prune index name=commitment pruned values=...` lines.
- `[4/6 Execution Prune] pruning table periodic progress table=ChangeSets3 ...` lines.
- High CPU (45–80%), no `Execution] DONE` lines.

**Fix:** wait. Don't restart — restarting resets the prune progress.

### C. `eth_blockNumber` stuck even though Execution stage is ahead

`eth_blockNumber` returns the canonical FCU head, not the highest executed block. If prysm has only sent optimistic FCUs (because EL was slow), `latest` won't move until the EL successfully validates a fresh payload.

**Tell:**
- `eth_syncing` shows `Execution >> latest`.
- prysm logs show `optimistic block` rather than `VALID`.

**Fix:** none directly — fix the underlying execution slowness (A) and the next FCU will be VALID.

### D. Memory limit (`-m 70g`) too tight

Erigon's internal `[mem] memory stats RSS=...` line **counts mmap'd snapshot pages**, which differs from cgroup accounting. Always compare against `docker stats --no-stream erigon3`. False alarm if cgroup says 16 GiB while erigon says 70 GiB — that's normal.

But if `docker stats` itself approaches 70 GiB:
- Raise `-m` in `run-erigon.sh` (host has 125 GiB).
- Or restart erigon (will OOM-kill itself otherwise).

### E. md3 readahead set wrong (one-time fix, already applied)

Linux flags software-RAID arrays as rotational even when all members are NVMe. The default readahead jumps to 3 MB, which causes huge wasted read traffic for MDBX's small random reads.

```bash
cat /sys/block/md3/queue/rotational      # should be 0
cat /sys/block/md3/queue/read_ahead_kb   # should be 256
```

If those drift back (e.g. after reboot), restore via:

```bash
docker run --rm --privileged -v /sys:/sys alpine sh -c '
  echo 0 > /sys/block/md3/queue/rotational
  echo 256 > /sys/block/md3/queue/read_ahead_kb'
```

To make persistent, add a udev rule or systemd unit (not currently done).

### F. RPC abuse — historically suspected, never observed in practice

Searches in the logs for `trace_replayTransaction` / `ots_traceTransaction` often dominate, but on `2026-05-21` a `DOCKER-USER` DROP on `enp7s0` caught **0 packets** — the trace traffic was all from otterscan-api forwarding legitimate browser requests. Don't be misled by the volume in logs. Even so, since `2026-05-21` 8545/8546 are bound to loopback, so this can no longer be an external problem.

## 4. The 2026-05-21 incident — what was actually done

Order matters; the dead ends are listed because they look promising and aren't.

1. **Confirmed stall:** frontend at block 25,138,610 from 3.5 h prior. `eth_blockNumber` stuck at that value for hours.
2. **Disproved RPC abuse (dead end):** added `iptables -I DOCKER-USER -p tcp -i enp7s0 --dport 8545 -j DROP` via a `--privileged` sidecar. After 2 min the rule had matched **0 packets** — the trace calls in logs were all from otterscan-api itself, not the wider internet.
3. **Found readahead misconfig (minor win, kept):**
   - `/sys/block/md3/queue/rotational = 1` (Linux quirk on RAID5-of-NVMe).
   - `/sys/block/md3/queue/read_ahead_kb = 3072`.
   - Fixed to `0` and `256`. Read bandwidth dropped 700 → 550 MB/s, but **execution cycle time barely moved** — disk wasn't the bottleneck.
4. **Identified Erigon-version bottleneck:** cycle pattern (`DONE in=1m+`, `tdur=10ms`, only 1–2 blocks per cycle) matched known slow-tip-sync behavior of v3.3.0.
5. **Upgraded Erigon v3.3.0 → v3.4.1:**
   - Backed up `run-erigon.sh` → `run-erigon.sh.pre-v3.4.1`.
   - `sed`'d image tag to `erigontech/erigon:v3.4.1`.
   - Discovered `--user $(id -u):$(id -g)` no longer worked with v3.4 because data dir was root-owned (the original container must have been started via `sudo` once). Changed to `--user 0:0`.
   - Restart applied migrations `db_schema_version5` + `reset_stage_txn_lookup`. **First execution cycle did 337 blocks in 65 s** (vs. 1–2 blocks/65 s on v3.3.0).
   - Then a one-time **19-minute prune** (`[4/6 Execution] prune done in=19m17s`). Frontend was unreachable during this window — be patient.
   - After prune, execution sustained **7–15 blk/s** until caught up. `eth_syncing` → `false`.
6. **Locked down public RPC** (incident-independent hardening):
   - Backed up `run-erigon.sh` → `run-erigon.sh.pre-lockdown` and `docker-compose.yml` → `docker-compose.yml.pre-lockdown`.
   - Port mappings now:
     - `127.0.0.1:8545:8545` — nginx loopback only
     - `127.0.0.1:8546:8546` — nginx loopback only
     - `172.17.0.1:8551:8551` — prysm via docker0 gateway only
     - `127.0.0.1:6060:6060`, `127.0.0.1:9090:9090` — metrics/private RPC on loopback
     - `30303` — kept public (P2P; required for peers)
   - Attached `erigon3` to `ethscanorg_otterscan-network` (and kept it on default `bridge` for prysm).
   - Updated `docker-compose.yml`: otterscan-api/frontend now use `http://erigon3:8545` (container DNS) instead of `http://host.docker.internal:8545`.
   - Verified: external `:8545` refused, nginx `/erigon/` still works, prysm engine API still works.
7. **Shrunk chaindata via `seg step-rebase`** (see §5).

## 5. Erigon chaindata rebase (chaindata size reduction)

v3.4 supports rebasing the MDBX step size from the legacy `1,562,500` to `390,625`, shrinking chaindata ~4×.

**Caveats discovered the hard way:**
- Tool is **interactive**: prompts `Proceed with these changes? [y/N]`. Use `echo y | docker run -i ...`.
- Tool **deletes** the existing `chaindata` directory and a list of `.torrent` files. Erigon will rebuild indices from snapshot files on next start.
- "Takes ~10 seconds" in the release notes is the **rebase tool's own runtime only**, not the full restart. Subsequent OtterSync (rebuilding stage indices from snapshots) takes substantially longer — minutes to tens of minutes — during which the explorer returns `eth_blockNumber=0x0`.

**Procedure (~ minutes of downtime):**

```bash
ssh crypto@142.132.144.181
docker stop -t 60 erigon3 && docker rm erigon3
echo y | docker run --rm -i --user 0:0 \
  -v /home/crypto/ethscan.org/erigon-data:/root/.local/share/erigon \
  erigontech/erigon:v3.4.1 \
  seg step-rebase --datadir=/root/.local/share/erigon --new-step-size=390625
/home/crypto/ethscan.org/run-erigon.sh
docker network connect ethscanorg_otterscan-network erigon3
# wait until eth_blockNumber > 0:
until [ "$(curl -s -X POST -H 'Content-Type: application/json' \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
        http://localhost:8545 | grep -o '0x[0-9a-f]*')" != '0x0' ]; do sleep 15; done
```

Confirm new step size in startup log: `erigondb settings step_size=390625 steps_in_frozen_file=256`.

## 6. Useful one-liners

```bash
# What's hitting erigon RPC? (source IPs visible via docker bridge)
docker exec erigon3 sh -c 'cat /proc/net/tcp /proc/net/tcp6 2>/dev/null' \
  | awk '$2 ~ /:2161$/ {print $3}' | sort | uniq -c | sort -rn
# (0x2161 = 8545)

# Execution rate over last 10 min
docker logs --since 10m erigon3 2>&1 \
  | grep 'serial executed' | awk -F'blk/s=' '{print $2}' | awk '{print $1}'

# Which container is on which network
docker inspect erigon3 --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# Re-attach erigon to otterscan network after recreate
docker network connect ethscanorg_otterscan-network erigon3

# nginx still proxies to erigon (loopback bind)?
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
  https://ethscan.org/erigon/
```

## 7. Server-side files modified / created

- `/home/crypto/ethscan.org/run-erigon.sh` — image tag, `--user 0:0`, locked port bindings.
- `/home/crypto/ethscan.org/run-erigon.sh.pre-v3.4.1` — pre-upgrade backup.
- `/home/crypto/ethscan.org/run-erigon.sh.pre-lockdown` — pre-port-lockdown backup.
- `/home/crypto/ethscan.org/docker-compose.yml` — ERIGON_URL points to `erigon3:8545`.
- `/home/crypto/ethscan.org/docker-compose.yml.pre-lockdown` — backup.
- `/etc/nginx/sites-available/ethscan.org` — unchanged. `proxy_pass http://127.0.0.1:8545;` still works because erigon now binds to `127.0.0.1:8545`.

## 8. If it stalls again — first-pass checklist

1. Run the 5 quick-diagnosis commands in §2.
2. If you see "optimistic block" in prysm and `Execution << Headers` in erigon: it's a tip-sync stall. Check version with `docker inspect erigon3 --format '{{.Config.Image}}'`. If < v3.4, plan an upgrade (§3.A). If already on v3.4+, check the prune state (§3.B) — wait it out, don't restart mid-prune.
3. If you see lots of `[snapshots] prune` lines and high CPU: do nothing, wait.
4. If `docker stats` shows MEM near the `-m` limit: raise it in `run-erigon.sh` and restart.
5. Restarting Erigon **does** historically clear transient stalls. If you must restart:
   - `docker stop -t 60 erigon3 && docker rm erigon3 && /home/crypto/ethscan.org/run-erigon.sh && docker network connect ethscanorg_otterscan-network erigon3`
   - Re-attaching to `ethscanorg_otterscan-network` is **required** every time the container is recreated (it's not in the run script — `docker run` only attaches to the default bridge). Otherwise otterscan-api can't resolve `erigon3`.
6. Update this runbook with anything new you learn.
