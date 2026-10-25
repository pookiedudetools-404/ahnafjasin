# ahnafjasin
App
# MASTER PROMPT — "PerfCore" Android Performance Module

## ROLE
You are a senior Android systems engineer + kernel tuner + Magisk module developer. You will help me build a **root-only Android performance optimization module** called **PerfCore** with an AI-assisted adaptive tuning engine. Work in phases. Ask no questions unless critical — assume sensible defaults and proceed. Output **copy-paste-ready code, scripts, file structures, and testing checklists** for every step.

## PROJECT VISION
Build the most aggressive, hardware-aware, privacy-clean performance booster for rooted Android phones — focused on **low-end Snapdragon devices**. The goal is to extract maximum smoothness and responsiveness from weak hardware without breaking the device. Offline, lightweight, ad-free, privacy-first. Distributed on GitHub (not Play Store).

## TARGET DEVICE (primary test device)
- **Samsung Galaxy A11**
- SoC: Qualcomm Snapdragon 450 (SDM450), 8× Cortex-A53 @ 1.8 GHz (single cluster — NOT big.LITTLE)
- GPU: Adreno 506
- RAM: 3 GB
- Storage: eMMC
- OS: Android 10–12 (One UI Core, Knox-protected)
- Root: Magisk / KernelSU

## NON-NEGOTIABLE CONSTRAINTS
1. **Root only.** No non-root fallback. Assume Magisk/KernelSU available.
2. **Performance is the only priority.** Battery life, "fairness", background apps — all secondary.
3. **Hardware safety guard:** Never bypass thermal completely. Always keep hard ceiling (CPU ≤ 75°C, GPU ≤ 70°C). Auto-revert to stock if exceeded.
4. **Boot-loop protection:** Every tweak must be revertible. Include watchdog that rolls back to stock profile on 3 failed boots.
5. **Offline only.** No telemetry, no network calls, no analytics.
6. **Lightweight:** APK + module combined < 15 MB.
7. **Solo developer.** Do not over-engineer. Every phase must be shippable and testable.

## ARCHITECTURE (must follow exactly)

```
PerfCore/
├── app/                          # Kotlin + Jetpack Compose dashboard
│   ├── ui/                       # live stats, toggles, profile selector
│   ├── core/                     # root shell wrapper (libsu), device detect
│   ├── ai/                       # TFLite inference wrapper
│   └── data/                     # Room DB (per-app profile memory)
│
├── magisk-module/                # flashed via Magisk / KernelSU
│   ├── module.prop
│   ├── post-fs-data.sh           # early boot: VM, LMK, ZRAM, I/O
│   ├── service.sh                # late boot: CPU/GPU governors, scheduler
│   ├── uninstall.sh              # full revert to stock
│   ├── system.prop
│   └── bin/
│       ├── perfcore-daemon       # Kotlin/Go binary for AI-driven tuning
│       └── watchdog.sh           # boot-loop rollback
│
├── profiles/
│   ├── sdm450_a11.json           # device-specific tuned values
│   ├── sdm439.json
│   └── sdm660.json
│
└── ai-engine/
    ├── model.tflite              # tiny decision model (<2 MB)
    ├── train.py                  # offline training script
    └── dataset/                  # logged features from real device
```

**CPU-specific handling:** Runtime auto-detect via `Build.SOC_MODEL`, `/proc/cpuinfo`, and `ro.board.platform`. Load matching profile JSON. If no match → safe fallback to universal profile. Do NOT ship separate APKs per CPU.

## TUNING SCOPE (full list — implement all in phases)

### CPU
- `scaling_governor = schedutil` (keep), `rate_limit_us = 0`, `pl = 1`
- `sched_min_granularity_ns = 1000000`, `sched_migration_cost_ns = 500000`, `sched_nr_migrate = 32`
- `uclamp_min` boost for foreground task
- **Do NOT offline cores** (A11 cores are identical)

### Memory / LMK
- Detect kernel LMK type: classic (`/sys/module/lowmemorykiller`) vs PSI LMKD
- Classic: `minfree = "1024,2048,4096,6144,8192,10240"`
- PSI: `ro.lmk.psi_partial_stall_ms=50`, `psi_complete_stall_ms=400`, `thrashing_limit=30`
- `swappiness=60`, `dirty_ratio=20`, `dirty_background_ratio=5`, `vfs_cache_pressure=200`, `min_free_kbytes=4096`

### ZRAM
- Use `lz4` algorithm (fast decompress > zstd compression on low-end)
- Size = 50–75% of physical RAM
- Enable if kernel supports it

### I/O
- Scheduler: `deadline` (fallback `cfq`)
- `read_ahead_kb = 2048`, `rotational = 0`
- Mount `/data` with `noatime,nodiratime,commit=60`

### GPU (Adreno)
- Path: `/sys/class/kgsl/kgsl-3d0/devfreq/`
- Governor: `msm-adreno-tz` by default; `performance` **only during gaming sessions**
- Never permanently lock max freq

### Thermal
- Increase trip points 5°C above stock (max), never disable
- Reduce thermal daemon polling interval
- Hard ceiling: CPU 75°C, GPU 70°C → auto-revert

### Rendering / System
- `service call SurfaceFlinger 1008 i32 1` (optional toggle, default OFF on A11)
- `stop logd`, `setprop logd.kernel 0`
- `random.read_wakeup_threshold = 1024`, `write_wakeup_threshold = 4096`
- `tcp_congestion_control = cubic`, `tcp_low_latency = 1`
- Binder priority boost for foreground app
- MGLRU + KSM if kernel supports

## AI ENGINE
- **Model:** tiny TFLite MLP or decision tree, <2 MB
- **Inputs:** foreground package, screen state, battery temp, CPU load (2s window), RAM pressure, charging state
- **Outputs:** one of `{GAMING, MULTITASK, IDLE, THERMAL_EMERGENCY}`
- **Inference:** daemon runs every 2 seconds → writes to sysfs
- **Fallback:** rule-based if confidence < 0.7
- **Training:** offline Python script using logged data from A11
- **Per-app memory:** Room DB stores which profile worked best for each package

## ROADMAP (solo dev, 16 weeks)

- **Phase 1 (W1–3):** Magisk module skeleton, boot-loop watchdog, A11 stock sysfs snapshot, backup/restore, minimal tuning test
- **Phase 2 (W4–6):** CPU governor, scheduler, VM, LMK/PSI, ZRAM, I/O — with kernel type detection
- **Phase 3 (W7–9):** GPU devfreq, thermal guard, SurfaceFlinger toggle
- **Phase 4 (W10–12):** AI daemon + TFLite model + data collection pipeline
- **Phase 5 (W13–16):** Dashboard UI, per-app profile memory, stress testing

## OUTPUT FORMAT RULES
For every step I ask about, you must provide:
1. **Exact file path** (e.g. `magisk-module/service.sh`)
2. **Full file content** in a copyable code block
3. **Shell commands** to test that step on the A11 (adb or terminal)
4. **Expected output** so I know it worked
5. **Rollback command** if it breaks
6. **Risks / caveats** specific to SDM450 / One UI Core / Knox

Do not summarize. Do not skip details. Give production-grade content.

## FIRST TASK
Start with **Phase 1, Step 1**: produce the complete Magisk module skeleton with:
- `module.prop`
- `post-fs-data.sh` (safe: only VM + min_free_kbytes)
- `service.sh` (safe: only schedutil rate_limit_us = 0)
- `uninstall.sh` (full revert)
- `bin/watchdog.sh` (boot-loop rollback after 3 failed boots)
- Step-by-step flash + test instructions for Samsung Galaxy A11 with Magisk
- How to snapshot stock values and store them for revert

After I confirm Phase 1 works, I will ask for Phase 2.# PHASE 2 — CORE TUNING (PerfCore)

## CONTEXT
Phase 1 complete. Magisk module skeleton, boot-loop watchdog, A11 stock snapshot, and revert/uninstall all working. Now starting Phase 2: apply the actual performance tuning at CPU, scheduler, memory, ZRAM, and I/O layers.

## HARDWARE TARGET
- Samsung Galaxy A11, Snapdragon 450 (SDM450), 8× Cortex-A53 @ 1.8 GHz (single cluster, NOT big.LITTLE)
- Adreno 506, 3 GB RAM, eMMC storage, Android 10–12 One UI Core, Knox-protected
- Root: Magisk / KernelSU

## PHASE 2 GOALS (implement all, in this order)
1. **Kernel capability detection** — at boot, detect:
   - Kernel version (`uname -r`)
   - LMK type: classic (`/sys/module/lowmemorykiller` exists?) vs PSI LMKD (`/proc/pressure/memory` exists? `ro.lmk.*` props?)
   - Available CPU governors: `cat /sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors`
   - Available I/O schedulers: `cat /sys/block/mmcblk0/queue/scheduler`
   - ZRAM support: `/sys/block/zram0` exists? compression algorithms: `cat /sys/block/zram0/comp_algorithm`
   - Write results to `/data/adb/perfcore/capabilities.json` for the daemon to read
2. **CPU governor tuning** — `schedutil` aggressive:
   - `rate_limit_us = 0`
   - `pl = 1` (if present)
   - Do NOT lock min freq to max (thermal risk)
   - Foreground boost via `uclamp_min` (500–800) — implement as a function that can be called by daemon
3. **Kernel scheduler tunables:**
   - `sched_min_granularity_ns = 1000000`
   - `sched_migration_cost_ns = 500000`
   - `sched_nr_migrate = 32`
   - Guard: skip any tunable that doesn't exist on this kernel
4. **LMK / LMKD tuning** (branch on detected type):
   - **Classic:** `minfree = "1024,2048,4096,6144,8192,10240"`
   - **PSI:** `setprop ro.lmk.psi_partial_stall_ms 50`, `ro.lmk.psi_complete_stall_ms 400`, `ro.lmk.thrashing_limit 30`, `ro.lmk.swap_util_max 80`
5. **VM tuning:**
   - `swappiness=60`, `dirty_ratio=20`, `dirty_background_ratio=5`, `vfs_cache_pressure=200`, `min_free_kbytes=4096`
6. **ZRAM setup:**
   - Algorithm: `lz4` (fallback `lz4hc` → `zstd` → skip if none)
   - Size = 60% of physical RAM (calculate from `MemTotal`)
   - Reinitialize existing zram0 safely
   - Only enable if kernel supports it
7. **I/O tuning:**
   - Scheduler: `deadline` (fallback `cfq` → `noop` → keep stock)
   - `read_ahead_kb = 2048`
   - `rotational = 0`
   - Mount `/data` with `noatime,nodiratime,commit=60` (via `mount -o remount`)
8. **Safe rollout:** every section must:
   - Be **individually toggleable** via a config file (`/data/adb/perfcore/config.json` with flags)
   - Log applied values to `/data/adb/perfcore/applied.log`
   - Have a corresponding revert function in `uninstall.sh`

## FILE STRUCTURE (deliver all files)

```
magisk-module/
├── post-fs-data.sh          # detect caps, apply early (VM, LMK, ZRAM, I/O)
├── service.sh               # late boot (CPU governor, scheduler)
└── bin/
    ├── detect.sh            # capability detection → capabilities.json
    ├── tune-cpu.sh
    ├── tune-sched.sh
    ├── tune-mem.sh          # VM + LMK/LMKD branch
    ├── tune-zram.sh
    ├── tune-io.sh
    └── revert-all.sh        # full stock restore for uninstall
```

## OUTPUT FORMAT (strict)
For each of the 8 goals above, deliver:
1. **File path** (e.g. `magisk-module/bin/tune-mem.sh`)
2. **Full file content** in a copyable code block — production-ready, with logging and error guards
3. **Inline comments** explaining why each value was chosen for SDM450
4. **adb test commands** — exactly how to run it manually on A11 without rebooting (e.g. `adb shell su -c "sh /data/adb/modules/perfcore/bin/tune-mem.sh"`)
5. **Expected output / verification command** (e.g. `cat /sys/module/lowmemorykiller/parameters/minfree`)
6. **Rollback command** for that specific section
7. **Risks** specific to A11 / SDM450 / One UI Core / Knox

## EXTRA REQUIREMENTS
- **Config file** `config.json` must be created at first boot with all flags default `true`, so user can disable any section by editing one file.
- **Logging** must be human-readable: `[2024-xx-xx HH:MM] section=X key=value old=oldvalue new=newvalue status=ok`
- **Knox-safe:** check `getprop ro.config.knox`; if Knox active, skip any property set that Knox may revert (log as `skipped:knox`).
- **Idempotent:** running any tune-*.sh twice must produce identical system state (safe to re-run).
- **No `reboot` calls** inside scripts. Ever.
- **Idle-safe:** do NOT pin min CPU freq high; keep `schedutil` responsive but allow downclocking at idle (thermal + battery preservation is secondary but hardware damage is unacceptable).

## TESTING CHECKLIST (provide at end)
Give me a step-by-step validation plan to run on A11:
- Boot after flashing → confirm no bootloop
- Verify each sysfs value with a `cat` command
- Confirm capabilities.json content is correct
- Measure: cold-start time of 3 heavy apps (before/after), FPS in a 2D game, RAM free at idle
- Stress test: 10-minute gaming session → confirm no thermal emergency and no crash
- Reboot → confirm values persist
- Trigger rollback by manually corrupting one value → confirm watchdog reverts

## START WITH
Goal 1 (`bin/detect.sh`) and Goal 2 (`bin/tune-cpu.sh`). Then wait for my "continue" before producing goals 3–8.

Give me production-grade code, no placeholders, no "TODO".
