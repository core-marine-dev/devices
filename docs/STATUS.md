# Devices repo — Working Status (resume here)

> **Living handoff doc ("cuaderno de bitácora").** If a session ends mid-work (AI provider
> limit, context loss, switching agents), a new agent — any provider — reads THIS file to
> continue. Everything authoritative lives in the repo, not in any tool's memory.
>
> **🔄 Maintenance rule (for ANY agent working in this repo):** after every meaningful change —
> a refactor step, a locked decision, a commit, or a shift in what's next — check whether this
> doc is still accurate and, if not, **update it in the same turn**. Do NOT wait for the end of
> the session: limits hit without warning. Keeping "Where we are now", "Next steps" and "HEAD"
> current is the entire purpose of this file.
>
> **Last updated:** 2026-07-29 (END OF SESSION — nmea + norsub track CLOSED, all four packages on npm;
> next = `thelmabiotel-tblive`) · **Branch:** `dev`. **NMEA CMA refactor (slice A–F) +
> STEP 1 (3-level metadata) + STEP 2 (Result pattern) + STEP 3 (timestamp metadata, core-wide) are
> done & green.** Repo was idle 2025-12-15 → 2026-07-08.
>
> **🎉 2026-07-24 — PHASE 1 + PHASE 2 SHIPPED. `@coremarine/nmea-parser@3.0.2` AND
> `@coremarine/nmea-parser-nodered@2.0.1` are LIVE on npm** (PR [#70](https://github.com/core-marine-dev/devices/pull/70)
> merged `dev`→`main` at 10:32 UTC; `main` @ `290a38f`). nmea-parser is the finished CMA reference lib
> **and** its Node-RED wrapper is done + published — both the lib pattern and the wrapper template are
> now proven end-to-end. **NEXT = PHASE 3: `norsub-emru` (lib refactor) then its `-nodered` wrapper.**
> See the paste-ready **"Phase 3 handoff prompt"** at the very end of this doc.
>
> **✅ Branch sync DONE.** `dev` (`a76856b`) already contains the `290a38f` merge commit — nothing to
> do (only the stale local `main` ref is behind; harmless).
>
> # 🎉 SHIPPED 2026-07-30 — SIX PACKAGES LIVE ON npm; nmea + norsub + thelmabiotel are DONE

PR [#75](https://github.com/core-marine-dev/devices/pull/75) (merge `c6d7d5d`) published
`thelmabiotel-tblive@2.0.0`; PR [#76](https://github.com/core-marine-dev/devices/pull/76)
(merge **`ef4480b`**) published the other five. **All five publish workflows green.**
**`dev` == `main` == `ef4480b`, tree clean.**

| package | npm | pairs with |
| --- | --- | --- |
| `@coremarine/nmea-parser` | **5.0.0** | ↔ `nmea-parser-nodered` **5.0.0** |
| `@coremarine/norsub-emru` | **5.0.0** | ↔ `norsub-emru-nodered` **5.0.0** |
| `@coremarine/thelmabiotel-tblive` | **2.0.0** | ↔ `thelmabiotel-tblive-nodered` **2.0.0** |

**✅ Verified against npm, nothing from the workspace:** in an empty temp dir,
`npm i` of the three wrappers resolved each one's library to the **matching major** —
wrapper 5.0.0 → dep `^5.0.0` → library 5.0.0, and 2.0.0 → `^2.0.0` → 2.0.0. The version policy
holds in production, not just in the monorepo.

**➡️ cru's remaining manual step:** refresh the Node-RED flow-library entries for all three
components (each went to a new major). After that these **three devices are DONE**.

**➡️ NEXT DEVICES: the two binary parsers, `septentrio-sbf` and `sbg-ecom`** — still on their legacy
output (`SBFResponse` / `SBGFrameResponse`), neither on `protocol-core`. They are the last two of the
five. Note they extend `BinaryParser`, not `StringParser`, so `raw` is Base64 and the framing is
length-prefixed rather than text-delimited — a different shape of problem from the three text
protocols just finished. `sbg-ecom` also has **zero specs** today.

# 🎉 SHIPPED 2026-07-29 — nmea-parser 4.0.0, norsub-emru 4.0.0, BOTH wrappers 3.0.0 ARE LIVE ON npm
>
> PR [#74](https://github.com/core-marine-dev/devices/pull/74) merged by cru at 12:24 UTC, merge commit
> **`941fd58`**; **`main` @ `941fd58`**. All five workflows green; `npm view` → `nmea-parser 4.0.0`,
> `norsub-emru 4.0.0`, `nmea-parser-nodered 3.0.0`, `norsub-emru-nodered 3.0.0`. **cru's three items are all
> delivered: the two fixes + the msg rename.**
>
> **✅ Verified against the PUBLISHED packages** (empty temp dir, `npm i`, nothing from the workspace —
> `npm ls` shows a lone `nmea-parser@4.0.0` + `norsub-emru@4.0.0`):
> - **Fix 1:** `\x00noise$GPHDT,10.0,T*4\r\n` → a garbage CMA (`id: unknown`) **plus** an `HDT` fully decoded
>   with only the checksum-**format** error — the dropped leading zero still matches, so no corruption claim.
> - **Fix 2:** `$PSXN,20,0,1,2,0*3A` → `PSXN20` / `KONGSBERG SEATEX 15` with all four quality **labels**
>   (`Normal` / `Reduced performance` / `Invalid data`), and `$PSXN,23,...` → `PSXN23` with roll/pitch/heading/
>   heave. `raw` keeps `$PSXN,...` in both.
> - **Inheritance:** the published `norsub-emru` reports garbage and a two-error `PHTRO` with **no source
>   change of its own**.
> - **Published wrapper tarball:** `3.0.0`, dep `^4.0.0`, `node-red.nodes` → `dist/parser.js`, ships exactly
>   `dist/ examples/{2 files} README LICENSE` — **no `_cred.json` and no `.backup`** (the packing leak fix
>   confirmed in production), and the shipped `parser.js` contains `msg.sentences` and **zero**
>   `msg.protocols`.
>
> **➡️ NEXT SESSION = `thelmabiotel-tblive` + its Node-RED wrapper** (cru, end of session 2026-07-29).
> **Nothing about it has been researched or designed yet — deliberately.** Use the paste-ready
> **"Prompt for the NEXT SESSION"** at the very END of this doc; it carries the working method, the proven
> patterns, and the traps. One follow-up that is NOT in this repo: **grep Tracker for `field.type` /
> `'float32'`**.
>
> **🔎 2026-07-30 — tblive is now AUDITED (measured, not assumed): §"thelmabiotel-tblive — MEASURED
> audit".** Read it before designing anything. Headlines: it shares **zero** code with
> `protocol-core`; `protocol` is **missing** from the output while the word `protocol` is already
> taken twice by tblive's own domain (acoustic tag protocols); `metadata.timestamp` already exists
> with a DIFFERENT shape than CMA's; there is **no YAML knowledge base at all**; `firmware` is
> **guessed from field count** and hardcoded `'1.0.2'` elsewhere; and three real bugs
> (`bufferLimit` never enforced, input dropped silently, sentence timestamp built by string
> concatenation → wrong date whenever ms is not zero-padded). **Design still to be converged with
> cru — nothing decided.**
>
> **🔴 2026-07-30 (later) — the three datasheets are now READ, and testing their own examples found
> three MORE bugs, one of them serious.** An **empty `data` field is reported as a real 0.0°
> inclination** with no error (the docs document blank data for ID-only protocols and ship that exact
> example) — a missing measurement is indistinguishable from a perfectly vertical mooring line, in the
> product whose entire job is noticing when a line is not vertical. Also: a `Live Sensor` log (the
> 1.0.2 datasheet's own spelling) is parsed as a **fish detection** with every field shifted; and
> `NaN` leaks into `Field.value`. Plus the real framing insight: **this protocol has no framing at
> all in command mode**, which is why `parse.ts` looks the way it does. See §"What the datasheets
> actually say" and §"The real internal problem, named".

# 🗒️ (previous banner) RELEASE READY — cru's TWO nmea-parser fixes + ALL FOUR packages bumped
>
> **Both of cru's fixes are implemented, and they compose.** (1) **Failed + garbage sentences** — nothing is
> dropped silently any more. (2) **PSXN sentence resolvers** — one wire id (`$PSXN`) split into `PSXN20` /
> `PSXN23`. Specs: **[`docs/CMA.md`](CMA.md)** §"Failed and garbage sentences" + §"Sentence resolvers".
>
> **ALL FOUR PACKAGES GO OUT AS MAJORS** (cru's instruction 2026-07-29). Reason each one *must* be
> republished, verified against npm: every published dep range is caret-pinned to the OLD major, so **none of
> them can resolve `nmea-parser@4.0.0`** — without a republish, downstream users would never receive the fix.
>
> | package | was | now | why a major |
> | --- | --- | --- | --- |
> | `nmea-parser` | 3.2.0 | **4.0.0** | emits CMAs it never emitted before (garbage/failed); `$PSXN` → resolved ids |
> | `nmea-parser-nodered` | 2.0.1 | **3.0.0** | published dep `^3.0.2` cannot resolve 4.0.0; `msg.payload` now carries failed/garbage CMAs |
> | `norsub-emru` | 3.0.0 | **4.0.0** | published dep `^3.2.0` cannot resolve 4.0.0; output inherits both changes |
> | `norsub-emru-nodered` | 2.0.0 | **3.0.0** | published dep `^3.0.0` cannot resolve norsub 4.0.0; `msg.payload` changes |
>
> **No manual dep edits were needed** — all four use `workspace:^`, which packs as `^<in-tree version>`.
> Verified in the packed manifests: wrapper → `^4.0.0`, norsub → `^4.0.0`, norsub wrapper → `^4.0.0`,
> `engines.node >=22` everywhere, **no `protocol-core` leak** anywhere.
>
> **READMEs updated in all four** (new §"Failed and garbage sentences" in each; nmea-parser also gains
> §"Sentence resolvers" + the third extension point `registerResolvers`; both wrappers gain an
> "Upgrading from 2.x"). Two stale claims in `norsub-emru`'s README were corrected — it said checksum-less
> input "is discarded", which is exactly what changed.
>
> **Verified (per package, from its own dir):** core lint+tsc+**15/15**; nmea-parser lint+tsc+**109/109**
> (was 71) + build ESM+CJS+DTS + regeneration idempotent (identical sha256); norsub-emru lint+tsc+**45/45**
> (source untouched — inherits both fixes); nmea wrapper **19/19**; norsub wrapper **34/34**. Repo-wide
> `pnpm lint` clean, `--frozen-lockfile` clean, all five builds clean after the bumps.
>
> **Example flows checked and extended (cru asked, 2026-07-29).** Both shipped flows were already
> correct — every sentence payload in each was re-run through the new parsers and **none** produces an
> unexpected `errors[]`, so nothing was stale (this also answers cru's "I never checked the norsub ones":
> all 8 of its payloads parse clean). They just did not SHOW the new behaviour, and examples ship in the
> tarball — so each gained a **"Failed & garbage sentences"** group (1-char checksum · missing `\r\n` ·
> line noise → a `function` node splitting clean vs flagged debugs). nmea demonstrates the dropped-leading-
> zero case (format error only, data intact); norsub the non-matching case (both errors). **Verified by
> booting real node-red against each shipped flow** (56 / 61 nodes, all instantiated, no unknown types) and
> then driving the new group through that runtime with the debugs swapped for sinks. A PSXN example group
> was deliberately skipped (cru's call — PSXN is covered in the README).
>
> **🐛 2026-07-29 (later) — A SECOND PACKAGING LEAK FOUND AND FIXED while verifying cru's example-flow
> layout edits: node-red writes a `<flowfile>_cred.json` credentials store next to any flow it opens, and
> BOTH wrappers were packing it** (`examples/` shipped 3 files, not 2 — the extra being node-red's encrypted
> credential blob). The repo already **gitignored** these in both wrappers and in `templates/nodered`, but
> `files` overrides `.gitignore` when packing and only excluded `"!**/*.backup"` — the sibling case got the
> git treatment and never the packing one. **Exactly the same class of bug as the `.backup` leak fixed
> 2026-07-24, in the same array, one line away.** Fixed by adding **`"!**/*_cred.json"`** to both wrappers
> AND the template, verified by re-packing with the cruft deliberately left on disk. Nothing sensitive
> leaked today (no example node carries credentials), but it would have the moment one did. No version bump
> needed — both wrappers are unpublished at 3.0.0 in this release. **Lesson for every future wrapper: any
> node-red runtime artefact that gets a `.gitignore` rule needs a `files` exclusion too.**
>
> **cru's example-flow layout edits (2026-07-29) are committed.** Node-RED rewrote both files on deploy so
> the textual diff is total, but comparing the parsed JSON node-by-node with `x`/`y`/`w`/`h` excluded gives
> **zero** differences — same 56 / 61 nodes, every payload, wire, function body and config untouched.
> Re-validated anyway by booting real node-red against both shipped flows and re-driving the new group
> through that runtime.
>
> **✅ THE `msg.protocols` → `msg.sentences` RENAME IS DONE AND FOLDED INTO THIS SAME 3.0.0** (cru's call,
> 2026-07-29): the wrapper was already going out as a major for the `nmea-parser@4.0.0` dep, so the rename
> rides along and users absorb ONE breaking change instead of two consecutive majors. **The two wrappers now
> agree** — the definitions channel takes the library's vocabulary (`addSentences` /
> `getSentencesByProtocol`), leaving `protocol` free for the device-protocol meaning it has in norsub's
> `msg.protocol`. `applyProtocols`/`ProtocolsInput` → `applySentences`/`SentencesInput`, name for name with
> norsub. Behaviour is otherwise identical (same `command`/`content`/`file`, same response grouped by
> protocol name); only the error strings now say `sentences:`. **The YAML schema's own top-level
> `protocols:` key is deliberately untouched** — that belongs to the knowledge format, not the msg API.
> Config dialog, help markdown, README ("Upgrading from 2.x" leads with the rename) and the example flow
> (group → "Sentences API", 3 injects, the debug JSONata) all updated. **3 integration specs added** driving
> REAL node-red: `msg.sentences` GET answered + grouped, the OLD `msg.protocols` **ignored** (passed through
> untouched, never answered), and a SET expanding the parser so a new sentence decodes. **19/19 → 22/22.**
>
> ## 🆕 FIX 2 — PSXN sentence resolvers (2026-07-29)
>
> **cru's problem:** a Kongsberg MGC emits `$PSXN,20,...` and `$PSXN,23,...` — **same id, same field count
> (5)** — so the KB (keyed `id + payload length`) cannot tell them apart. He had patched this in a legacy
> Node-RED flow (`misc/parsers/nmea/flows.json`, ~200 hand-written lines per variant) and wanted it in the
> parser. **Datasheet read and confirmed:** `misc/parsers/nmea/datasheets/mgcr3.pdf` pp. 108-109
> (MGC-D-114/408705/15/O Rev. 15; PSXN20/23 introduced in Rev. 14).
>
> **Solution: a `SentenceResolver` registry** (`nmea-parser/src/resolvers.ts`) running BETWEEN generic parse
> and KB lookup, mirroring `MetadataAggregators` exactly (dev-authored, keyed `${id}:${payloadLength}` on the
> id **as received**, `protected registerResolvers()`). Built-in `'PSXN:5'`. Everything else is then **pure
> data**: `PSXN20`/`PSXN23` are ordinary `nmea.yml` definitions under **`protocol: KONGSBERG SEATEX`,
> `version: '15'`, `standard: false`** (cru chose the name + revision), and a `'PSXN20:5'` aggregator adds the
> quality **`label`**s (`Normal` / `Reduced performance` / `Invalid data`), same shape as GGA's `gps_quality`.
>
> **cru's decisions:** keep the `message_number` field (payload stays aligned 1:1 with the raw CSV — the
> legacy code dropped it) · resolve **regardless** of checksum state · `label`, not `value`, for the quality
> metadata · protocol `KONGSBERG SEATEX` (SXN is the NMEA manufacturer mnemonic for Kongsberg Seatex; the
> datasheet calls PSXN the "Seatex ID") · version `'15'` (the manual revision transcribed from).
>
> **Invariants:** `raw` is **never** rewritten (keeps `$PSXN,...`, so the checksum still verifies) —
> only `id` changes; `metadata.talker` stays `PSXN`; an unknown message number keeps the generic `PSXN`
> rather than inventing a definition.
>
> **🔍 A real finding that ties the two fixes together:** the captured `$PSXN,10,...*7` in cru's flow computes
> to **`07`** — his device **drops the checksum's leading zero**. So fix 1 decodes it fully and reports
> **only** the format error (the value still matches), which is a positive "content is intact" signal. **His
> legacy `Patch to PSXN Checksum` node — which rewrote the checksum to a valid value just to get the sentence
> parsed, destroying the evidence — is now OBSOLETE.**
>
> **Verified end-to-end on real captured sentences:** `$PSXN,20,0,0,0,0*3B` → `PSXN20` /
> `KONGSBERG SEATEX 15`, four `label`s; `$PSXN,23,0.231,0.174,309.56,-0.033*2E` → `PSXN23` with
> `roll/pitch/heading` in `deg` + `heave` in `m`; a 1-char checksum → resolved + decoded + format error only;
> a missing `\r\n` between two PSXN → both resolved, first flagged; message number `99` → generic `PSXN`.
>
> ## FIX 1 — failed + garbage sentences (2026-07-29)
>
> **Nothing the parser receives is dropped silently any more.** Design was
> converged with cru decision-by-decision (D1–D5 + Q1–Q4, all recorded below), then coded. **The CMA contract
> is UNCHANGED** — cru's explicit constraint — the signal is the already-existing optional `errors: string[]`.
> Full spec + the classification table now live in **[`docs/CMA.md`](CMA.md) §"Failed and garbage sentences"**.
>
> **Verified:** core lint+tsc+**15/15**; nmea-parser lint+tsc+**93/93** (was 71) + build ESM+CJS+DTS;
> norsub-emru **45/45** (unchanged source — inherits for free); nmea wrapper **19/19**; norsub wrapper
> **34/34** (one spec updated: garbage is now reported, not `[]`). Proven end-to-end through the BUILT
> `norsub-emru` dist: `binary junk\x01$PNORSUB8,1,2*4$PHTRO,...*4E\r\n` → a garbage CMA, a `PNORSUB8`
> carrying **three** errors (missing end flag + checksum format + mismatch), and a `PHTRO` still fully
> decoded as `GYROCOMPAS1 1.2.0` with a mismatch error.
>
> **⚠️ REQUIRES `nmea-parser` 4.0.0 (MAJOR).** The type is identical, but the parser now emits CMAs it never
> emitted before, so a consumer that assumed every emitted CMA was usable must check `errors` /
> `id === 'unknown'`. **Bumped and committed** — see the release table in the banner above.
>
> **🐛 Latent bug fixed on the way:** `bufferLimit` was stored + validated but **enforced nowhere** — the
> buffer could grow without bound. It is now enforced (over-limit unterminated input is flushed as garbage).
>
> **➡️ ALL THREE of cru's items are now DONE** (the two fixes + the rename, all in PR
> [#74](https://github.com/core-marine-dev/devices/pull/74)). **NEXT after the merge: `thelmabiotel-tblive`**
> — move its extra top-level `mode`/`firmware` keys into `metadata` and adopt the base class, then the two
> binary parsers.

# 🏁 PHASE 3 IS COMPLETE — norsub-emru is DONE, library AND wrapper, both live on npm.
>
> **🎉 2026-07-29 — `@coremarine/norsub-emru-nodered@2.0.0` IS LIVE ON npm.** PR
> [#73](https://github.com/core-marine-dev/devices/pull/73) merged by cru at 08:37 UTC, merge commit
> `6b8900a`; **`main` @ `6b8900a`**. The `norsub-emru-nodered` workflow ran for the **first time ever**
> (green on 22.x + 24.x) and its publish job shipped 2.0.0. Only that workflow fired — nothing else changed.
>
> **✅ Verified against the PUBLISHED package** (empty temp dir, `npm i @coremarine/norsub-emru-nodered`,
> nothing from the workspace): ships `dist/{parser.js,parser.html,icons/}` + `examples/` + README + LICENSE;
> `node-red.nodes` = `{cma-norsub-parser: dist/parser.js}`. Requiring the shipped CJS artifact and driving it
> with a minimal fake `RED` registered `cma-norsub-parser` and turned a real PNORSUB8 into
> `protocol: {NORSUB8, 1.2.0}` with status at **both** metadata levels, `timestamp: [received, parsed]`,
> `msg.protocol` → `{protocol: 'nmea', protocols: ['nmea']}`, and `msg.sentences` correctly absent because it
> was not requested.
>
> **The four CMA-track packages now on npm:** `nmea-parser@3.2.0`, `nmea-parser-nodered@2.0.1`,
> `norsub-emru@3.0.0`, `norsub-emru-nodered@2.0.0`.
>
> **➡️ NEXT SESSION = the nmea-parser work. See the paste-ready prompt at the very END of this doc.** It
> covers cru's three items: (1) whatever changes he wants in nmea-parser, (2) **a fix so FAILED sentences can
> be retrieved** (new, raised 2026-07-29 — needs scoping with him first, see §"Failed sentences" below), and
> (3) the queued **`msg.protocols` → `msg.sentences`** rename in `nmea-parser-nodered`.
>
> **🎉 2026-07-29 — SHIPPED. `@coremarine/norsub-emru@3.0.0` AND `@coremarine/nmea-parser@3.2.0` ARE LIVE
> ON npm.** PR [#72](https://github.com/core-marine-dev/devices/pull/72) merged by cru at 07:38 UTC, merge
> commit `1109ffe`; **`main` @ `1109ffe`**. Both publish jobs succeeded (OIDC + provenance); `npm view` →
> `norsub-emru 3.0.0`, `nmea-parser 3.2.0`. `nmea-parser-nodered` stayed at `2.0.1` (path-filtered,
> untouched — correct). Only the two intended workflows fired; the other four packages never triggered.
> **`norsub-emru` CI went green for the first time since the CMA refactor began.**
>
> **✅ Fresh-install verification with ONLY npm-published packages:** in an empty temp dir,
> `npm i @coremarine/norsub-emru` → `npm ls` shows a lone `@coremarine/norsub-emru@3.0.0` (its `^3.2.0` dep
> resolved), and an ESM run produced `PNORSUB8` → `protocol: {NORSUB8, 1.2.0}`, status at **both** field and
> payload level, `metadata.timestamp: [received, parsed]` (no `sentence`), `PTVG` → `[-0.36, 0.21, 101.8]`,
> and an inherited `$INHDT` → `HDT float64 123.456`. **The whole Phase 3 lib contract is confirmed in
> production.**
>
> **⚠️ OPEN IN TRACKER, NOT HERE (clarified 2026-07-29 — the sweep itself IS fully applied):** zero `float32`
> remains in ANY protocol data file (`nmea.yml`, both `norsub.yml` copies, the generated consts); it survives
> only as a still-valid CMA *type* in `constants.ts`, in the fake-sentence generator's switch, and in test
> fixtures. The loose end is that the sweep shipped as `nmea-parser@3.2.0`, a **minor**, and it did change
> `field.type` in emitted CMAs. Values were never affected — only the `type` label. **Action: grep TRACKER
> for `field.type` / `'float32'`.** Moot for anything released from 4.0.0 on (a major owns the change); the
> only question is whether a Tracker deployment on 3.2.0 was silently affected, and any fix belongs there.
>
> **➡️ NEXT: TASK 3b — the `norsub-emru-nodered` wrapper.** Clone `nmea-parser-nodered` (the proven
> template), node type `cma-norsub-parser`, expose the facade's `protocol` selection in the config UI. The
> ordering constraint is already satisfied: `norsub-emru@3.0.0` is live, so the wrapper's dep range will
> resolve. Paste-ready prompt at the very end of this doc.
>
> **ORDER LOCKED (cru, 2026-07-29): the norsub WRAPPER (3b) comes FIRST, and the further nmea-parser
> changes cru wants come AFTER it.** Do not start the nmea work before 3b is done.
>
> **README/docs: DONE and published** — `packages/norsub-emru/README.md` was rewritten from scratch on
> the 3.0.0 API (the old one documented the removed 2.x `NMEASentence` shape) and verified inside the
> published tarball: no `NMEASentence` / `addProtocols` / top-level `metadata.status` / `received:`/`sample:`
> anywhere. Also fixed its badge, which pointed at a non-existent `core-marine-dev/norsub-emru` repo and a
> `publish.yml` workflow.
>
> **🟡 2026-07-29 (later) — cru's two remaining data decisions APPLIED, and they pull `nmea-parser` into
> this release as `3.2.0`.** (1) **`version: '1.2.0'` on all 12 protocols in `norsub.yml`** (the OEM manual
> revision) — NorSub CMAs no longer say `version: "unknown"`. (2) **`float32` → `float64` swept through
> `nmea.yml` too** (68 fields). That second one changes `nmea-parser`'s OWN published output, so the lib is
> bumped **3.1.0 → 3.2.0** and must be published alongside `norsub-emru@3.0.0`. **The wrapper needs NO
> change** (`^3.0.2` already accepts it; re-verified 19/19 against the changed lib). Detail + the
> semver reasoning: §"2026-07-29 (later) — data decisions" in Done.
>
> **🟢 2026-07-29 — PHASE 3, TASK 3a: the `norsub-emru` LIBRARY REWRITE IS CODE-COMPLETE AND GREEN
> (uncommitted — cru to review).** All 7 steps of the Phase 3 coding prompt are done: package plumbing,
> a NEW SHARED protocols generator, `NorsubNMEAParser extends NMEAParser` (7 aggregators), the
> `NorsubParser implements DeviceParser<string>` facade, a rewritten 45-spec suite, a from-scratch README,
> and full verification. **norsub-emru 45/45 · nmea-parser 71/71 · core 15/15; lint + tsc + build
> (ESM+CJS+DTS) clean repo-wide; `--frozen-lockfile` clean; packed manifest = `3.0.0` /
> `engines.node >=22` / dep `@coremarine/nmea-parser` `^3.1.0` / no `protocol-core` leak.** The CI job
> order was re-verified from a deleted-dist state (`protocol-core:build` → `nmea-parser:build` →
> `norsub-emru:test` → `norsub-emru:build`). **NEXT = cru reviews + commits, then TASK 3b (the
> `norsub-emru-nodered` wrapper).** Detail: the 2026-07-29 entry at the top of §Done.
>
> **🔵 2026-07-28 — PHASE 3 IN PROGRESS: norsub-emru.** Design locked with cru: **composition (device
> facade + protocol parser, one protocol active at a time)**, internal generated-TS knowledge load,
> status metadata at field **and** payload level, and **no sentence timestamp** (datasheet-verified).
> **Prerequisites are DONE & released: `nmea-parser@3.1.0`** (two `protected` extension points) **+
> `DeviceParser<B>` in `protocol-core`**, plus a datasheet-driven **units fix** in the norsub protocol
> data. Wrapper untouched (no change needed). **NEXT: the norsub-emru lib rewrite itself.** Full spec +
> remaining opens: **§"Phase 3 — norsub-emru: locked design (2026-07-28)"**.
>
> **🚀 SHIPPED 2026-07-28 — `@coremarine/nmea-parser@3.1.0` IS LIVE on npm** (PR
> [#71](https://github.com/core-marine-dev/devices/pull/71) merged 10:39 UTC, merge commit `a80c8e4`;
> `npm view` → `latest: 3.1.0`). **Branches are synced: `dev` == `main` == `a80c8e4`, working tree
> clean.** The wrapper stayed at `2.0.1` (untouched, path-filtered — nothing to publish); `norsub-emru`
> CI was red as expected (legacy pre-3.0 API, `publish` blocked by `needs: test`). cru's remaining
> manual step: refresh the Node-RED flow-library entry for the nmea component.
>
> **➡️ NEXT SESSION STARTS HERE: the `norsub-emru` library rewrite — design is fully locked, so it is a
> CODING session.** Use the paste-ready **"Phase 3 coding prompt"** at the very end of this doc.
>
> **Wrapper decisions locked this session (apply to every future `-nodered` wrapper):**
> - **Dev-instance isolation = won't-fix / accepted by design.** Sibling `@coremarine/*-nodered` nodes
>   appearing in the local dev palette is fine; node-red stays a **root** devDep. What matters: the node
>   is in the **CoreMarine** palette category and that category is pinned first via
>   `editorTheme.palette.categories` in `dev-server.mjs` (dev-only; not shippable by a node package).
> - **`engines.node: ">=22"` (major-only), `node-red.version: ">=4.0.0"`.** The node floor is set by
>   the **library's tested targets (two latest LTS: 22 & 24)**, NOT node-red 4's own `>=18.5`. "Runs in
>   node-red 4, but needs node ≥22." Dev is on the latest node-red (`5.0.1`). The **library** was also
>   patched to `engines.node >=22` (was a mistaken `>= 18`) — do the same for every parser lib.
> - **Ship `"!**/*.backup"` in `files`** — node-red writes hidden `.<flow>.backup` files that otherwise
>   leak into the npm tarball.
> - **Keep READMEs current with the API** — both nmea READMEs were rewritten this session; do NOT let a
>   wrapper/lib publish with stale API docs.
>
> **RELEASE PREP DONE (2026-07-13): nmea-parser bumped to `3.0.0`, CI/CD migrated to npm OIDC
> Trusted Publishing across ALL packages, publish-if-version-changed gate, `repository.directory`
> everywhere.** Committed on `dev` (A→B→D→C, HEAD `65bec81`), NOT yet pushed at time of writing →
> then pushed. **NEXT: cru opens PR `dev` → `main`; the merge publishes only nmea-parser 3.0.0
> (every other package's publish job no-ops on the version gate; norsub + wrappers fail test/build
> and are skipped — expected).** After it's live: nmea-parser-nodered wrapper, then norsub-emru code
> refactor.
>
> **Steps 1-6 complete: pnpm, ESLint, docs, dep refresh, security audit, tsconfig fixes.**
> **CMA rollout IN PROGRESS:** `@coremarine/protocol-core` scaffolded (`174e4cc`); **nmea-parser
> refactored onto it (2026-07-10, slice A–F) — the reference implementation, committed & green**
> (lint + tsc + 56/56 tests + build ESM+CJS+DTS). Journey doc: [`docs/NMEA.md`](NMEA.md).
> **STEP 1 DONE: 3-level metadata via dev-authored aggregators** (`src/metadata.ts`, seeded GGA).
> **STEP 2 DONE: no-throw Result pattern** (`Result<T,E>` in core; `parseProtocols`/`addSentences`
> return `Result`; 62/62 tests). **NEXT: after the 3.0.0 release lands on npm, clone the reference
> implementation to the other four parsers — norsub-emru first (it no longer builds; see Open threads).**

## How to use this doc

1. Read this top-to-bottom, then the linked docs. Newer docs win over older ones.
2. Authoritative context (all in-repo, provider-agnostic):
   - Repo rules for agents: [`AGENTS.md`](../AGENTS.md) (≤80 lines, points here)
   - What the repo is / layout / `misc/` convention: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
   - Per-package state + known issues: [`docs/PACKAGES.md`](PACKAGES.md)
   - The target output format: [`docs/CMA.md`](CMA.md)
   - Commands: [`docs/COMMANDS.md`](COMMANDS.md) · Stack/CI: [`docs/TOOLING.md`](TOOLING.md)
   - Code style: [`docs/CodeStyle.md`](CodeStyle.md)
   - pnpm migration (done): [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md)
3. Working method the user (cru) expects: **discuss decisions before coding, one step at a
   time; this repo feeds the Tracker product, so output-format changes are breaking changes.**

## Mission

Refresh the whole monorepo in strokes. **cru's two end goals for the deep refactor:**

- **Goal 1 — same output:** every parser emits the identical CMA shape ([`docs/CMA.md`](CMA.md)),
  regardless of protocol.
- **Goal 2 — same API:** every parser has the same internal/external API — `new X(opts)` →
  `addData(input)` / `parseData(input): CMA[]`. Only the protocol-decode logic differs. This is
  enforced by a shared base class in `@coremarine/protocol-core`.
- **Cross-runtime:** the libraries (not the `-nodered` wrappers) must run on node, deno, bun
  **and** the web — no `node:fs`/`Buffer` in the hot path; input is `string | Uint8Array`.

Strokes:

1. **CMA format rollout** — every parser emits the same output shape ([`docs/CMA.md`](CMA.md)).
   Today only `thelmabiotel-tblive` conforms.
2. ~~**pnpm migration**~~ — ✅ DONE (2026-07-08, `f6444c3`). See
   [`docs/PNPM-MIGRATION.md`](PNPM-MIGRATION.md).
3. ~~**Linter + formatter migration**~~ — ✅ DONE (2026-07-08, `21ad374`). ESLint flat config
   with @stylistic + sonarjs + perfectionist plugins (mirrors Tracker repo).
4. ~~**Documentation**~~ — ✅ DONE (2026-07-08, `055b6d4`). `docs/CodeStyle.md` + AGENTS.md
   code-style section + lint→tsc→test run order codified.
5. ~~**Dependency refresh**~~ — ✅ DONE (2026-07-08, `3bcc0d6`). TypeScript 6.0.3, Vitest 4.x,
   Valibot 1.4.2, @schemasjs/* latest, tsup 8.5.1 (patched), safe dep bumps.
6. ~~**Security audit + fixes**~~ — ✅ DONE (2026-07-08, `b505fc9` + `2d40a86` + `31b52c3`).
   All 27 known vulnerabilities fixed (0 remaining). node-red 4→5, js-yaml bump, pnpm
   overrides for transitive vulns, valibot pinned to 1.4.2 everywhere, rootDir added to
   all per-package tsconfigs (TS 6 requirement).
7. ~~**Result pattern**~~ — ✅ DONE (2026-07-10) in `@coremarine/protocol-core` + nmea-parser;
   `Result<T,E>` no-exceptions-as-control-flow (from Tracker repo). Cloned per parser as they refactor.

## Done

- **2026-07-29 — 🚀 `@coremarine/norsub-emru-nodered@2.0.0` PUBLISHED (PR
  [#73](https://github.com/core-marine-dev/devices/pull/73), merge `6b8900a`) — PHASE 3 CLOSED.** cru merged
  at 08:37 UTC. The wrapper's workflow ran for the **first time in the repo's history** (it had been
  commented out) and went green on 22.x + 24.x before publishing. `npm view` → `2.0.0`.
  - **Verified against the published tarball, nothing from the workspace:** `npm i
    @coremarine/norsub-emru-nodered` in an empty dir ships `dist/{parser.js,parser.html,icons/}` +
    `examples/` + README + LICENSE, with `node-red.nodes` = `{cma-norsub-parser: dist/parser.js}`. Requiring
    the shipped CJS artifact with a minimal fake `RED` registered `cma-norsub-parser` and turned a real
    PNORSUB8 into `protocol: {NORSUB8, 1.2.0}`, status at **both** metadata levels,
    `timestamp: [received, parsed]`, `msg.protocol` → `{protocol: 'nmea', protocols: ['nmea']}`, and
    `msg.sentences` absent because it was not requested.
  - **All four CMA-track packages are now live:** `nmea-parser@3.2.0`, `nmea-parser-nodered@2.0.1`,
    `norsub-emru@3.0.0`, `norsub-emru-nodered@2.0.0`. `dev` == `main` == `6b8900a` plus later docs commits.
- **2026-07-29 — TASK 3b: `norsub-emru-nodered` rebuilt onto the CMA lib (code-complete, green, NOT yet
  committed).** Cloned from `nmea-parser-nodered`, which is the proven template, with the wrapper
  decisions locked 2026-07-24 applied unchanged (TS → tsup → CJS `export = init` + `"module": "preserve"`,
  `copy-assets.mjs`, `dev-server.mjs` with CoreMarine pinned first and no sibling-hiding hack, node-red a
  ROOT devDep, examples shipped via `files`, `"!**/*.backup"`).
  - **Two msg-API decisions taken with cru (2026-07-29).** The facade introduced a SECOND meaning of
    "protocol", and the old msg API already used the plural for something else:
    - **`msg.protocols` → `msg.sentences`** for the sentence DEFINITIONS. cru picked the library's own
      vocabulary (`addSentences` / `getSentencesByProtocol` vs `protocol` / `protocols`). Leaving both as
      `protocol`/`protocols` — two keys one letter apart, both taking a `command` object, meaning unrelated
      things — was rejected as a footgun in a visual editor.
    - **`msg.protocol`** (new) selects the DEVICE protocol, and cru chose it **settable at runtime**, not
      config-only. Documented as discarding the buffer and any unsent sentences. An unknown value is
      refused with an error string listing the valid ones, and the current protocol is kept.
  - **`src/lib.ts`** (zero node-red imports, so it unit-tests against a real `NorsubParser`): `applyMemory`,
    **`applyProtocol`**, **`applySentences`**, `getSentenceInfo`, `getFakeSentence`, `parsePayload`,
    `cleanUndefined`. The three definition/lookup helpers go through the facade's **`parser`** getter;
    `parseData`/`memory`/`bufferLimit` stay on the facade. **`src/parser.ts`** is the thin RED adapter
    (node type `cma-norsub-parser`), passing `config.protocol` to the constructor and reading an optional
    sentences file at setup.
  - **`src/parser.html`**: config dialog gains a **Protocol `<select>`** (one option today; each future
    protocol adds an `<option>`) with a form-tip warning about the state discard. Help markdown rewritten
    for the new msg API, the CMA output, where device status lands, and the `PTVG` decode.
  - **Tests: 34/34** (`node:test` via tsx). `tests/lib.unit.test.ts` (30) covers every handler incl. the
    error-string paths, content-over-file precedence, and a real hot-expand. `tests/wrapper.integration.test.ts`
    (4) boots **real headless node-red** via `RED.init` + the flowFile pattern and asserts a live
    `PNORSUB8 → CMA` with `protocol: {NORSUB8, 1.2.0}`, **status at BOTH metadata levels**,
    `timestamp: received+parsed` with **no** `sentence`, and that unrequested msg keys stay absent.
  - **Legacy dropped:** `Dockerfile`, `docker-compose.yml`, `manual_tests.sh`, `src/parser.js`, and the whole
    `tests/nodered/` tree — which held committed node-red runtime state **and a duplicated stale copy of the
    node itself**. **Four latent bugs fixed on the way:** `main` pointed at a non-existent `index.js`; the
    `test` script globbed `tests/**/*.test.js` when **no `.test.js` file existed**; the publish job had
    `needs: test` **commented out** so it published untested; and the example flow depended on a
    **third-party `yaml` node**, so it broke on import for anyone without that contrib installed.
  - **New example flow, generated then verified** (53 nodes, 7 groups: Flow Errors, Examples, Memory,
    **Protocol**, **Sentences**, Sentence, Fake). Zero third-party node types — the batch/split/YAML-content
    demos use plain `function` nodes. Validated by **booting real node-red against the flow file**: all types
    instantiated, `registry errors: none`. Ships `examples/example-sentences.yml` (`PCMEX`) for the
    hot-expand demo.
  - **CI:** test job **re-enabled** (matrix `[22.x, 24.x]`, dep chain `protocol-core → nmea-parser →
    norsub-emru`, then the wrapper build, then `node:test`) and **`needs: test` restored** on publish. The
    publish job deliberately builds ONLY the wrapper, matching the template — verified empirically that tsup
    keeps `@coremarine/norsub-emru` external, so the dep chain is needed by the tests, not the build.
  - **README rewritten from scratch** (the old one documented the removed `addProtocols` object form),
    including an **"Upgrading from 1.x"** section spelling out every breaking change. Root scripts updated:
    `norsub-emru:nodered:build|test|dev|examples|ci:local`, dropping the docker one.
  - **Verified:** from deleted dists, in exact CI order → deps build, wrapper build, **34/34**. Repo-wide
    `pnpm lint` clean, `tsc --noEmit` clean, `--frozen-lockfile` clean. Packed manifest = `2.0.0`,
    `engines.node >=22`, `node-red.version >=4.0.0`, `main`/`node-red.nodes` → `dist/parser.js`, dep
    `workspace:^` → **`^3.0.0`** (already live on npm, so the ordering constraint is satisfied), `keywords`
    has `node-red`. Tarball = `dist/` (js + html + icons) + `examples/` + README + LICENSE only.
  - **Deliberately NOT done:** the mirror rename in `nmea-parser-nodered` (`msg.protocols` →
    `msg.sentences`). It is a breaking msg-API change for that wrapper, so it belongs with the nmea-parser
    work cru wants next, as its own major. Recorded as rename debt in the top banner.
- **2026-07-29 (later) — data decisions: protocol `version` + the `float64` sweep ⇒ `nmea-parser` 3.2.0
  joins this release.** Both were the open questions raised by the Task 3a session; cru decided both.
  - **`version: '1.2.0'` added to ALL 12 protocols in `norsub.yml`** (both copies — norsub-emru's real KB
    and nmea-parser's test fixture), placed before `standard:` to match `nmea.yml`. cru's call was "apply it
    to all", including the third-party formats (GYROCOMPAS1, Tokimek PTVG, RDI ADCP, SMCA, SMCC) — coherent,
    because the version identifies the **NORSUB OEM Series — OEM MRU User Manual revision they were
    transcribed from**, and that manual documents all of them as formats the eMRU can emit. Verified:
    `PNORSUB8` → `protocol: {name: 'NORSUB8', version: '1.2.0'}`, `HEHDT` → `{GYROCOMPAS1, 1.2.0}`, while an
    inherited `GGA` still reports `{NMEA, 3.1}`. Two hardcoded fixtures in
    `nmea-parser/tests/protocols.test.ts` updated (`version: undefined` → `'1.2.0'`).
  - **`float32` → `float64` swept through `nmea.yml`** (68 fields) as well as the 3 norsub ones, per cru's
    rule "a datasheet float with no stated width → `float64`, the JS default".
  - **⚠️ WHY THIS NEEDS A `nmea-parser` RELEASE — and what it does NOT change.** The earlier norsub-only
    sweep was invisible to nmea-parser because its `protocols/norsub.yml` is **only a test fixture**;
    `nmea.yml` is the real published knowledge base, so sweeping it **changes nmea-parser's own output**.
    Measured, not assumed: `parseValue` does `Number(raw)` and then a **range check** via `TYPE_SCHEMAS`
    (`Float32Schema.is`) — it never truncates precision. So:
    - **`field.value` is unchanged** for every realistic value. `$INHDT,123.456,T` still yields exactly
      `123.456` (a real float32 truncation would have given `123.45600128173828`).
    - **`field.type` changes** `'float32'` → `'float64'` in emitted CMAs. This is the whole behavioural delta.
    - The accepted range **widens** (`Float32Schema` rejects `|x| > 3.4e38`, `Float64Schema` accepts to
      `1.8e308`), so a few pathological inputs now decode instead of becoming `null` — strictly more
      permissive, never less.
  - **Version choice: `3.1.0` → `3.2.0` (MINOR).** Reasoning: a **patch** understates it (real consumer-
    visible output changes), a **major** overstates it (no key added or removed, no value semantics changed,
    range only widened — nothing a consumer reading `value`/`name`/`units` can notice). **The one condition
    that would make it breaking: if Tracker branches on `field.type === 'float32'` anywhere.** If it does,
    make this `4.0.0` instead — it is a one-line change in `packages/nmea-parser/package.json`. cru to
    confirm.
  - **The `nmea-parser-nodered` wrapper needs NO change and NO bump.** Its published dep range is `^3.0.2`,
    which already resolves 3.2.0 (same situation as the 3.1.0 release, which was verified end-to-end with a
    real fresh install + headless node-red on 2026-07-28). Re-verified anyway against the changed lib:
    wrapper build + **19/19** `node:test`, including the real-node-red integration that asserts a live GGA
    → CMA. Bumping it would publish an identical package. It WILL start emitting `type: 'float64'`, which is
    the intended consequence, and its README documents no field types so nothing there went stale.
  - **Docs kept current:** norsub README's sample now shows `version: '1.2.0'` plus a line explaining where
    that version comes from; nmea-parser README's copy-paste YAML example switched to `float64` (the `float32`
    mentions that remain are the list of *valid CMA types*, which is still accurate — the type still exists,
    we just no longer use it in our own data). `docs/PACKAGES.md` nmea-parser row → `3.2.0`.
  - **Re-verified after both changes:** norsub-emru **45/45**, nmea-parser **71/71**, core **15/15**,
    wrapper **19/19**; repo-wide `pnpm lint` clean; `tsc --noEmit` clean in both libs; regeneration a no-op
    beyond the intended data. **Publishing plan: ONE `dev`→`main` merge publishes BOTH
    `nmea-parser@3.2.0` AND `norsub-emru@3.0.0`** (each workflow is path-filtered and version-gated, and
    both packages changed). No ordering problem: norsub-emru depends on `^3.1.0`, which is already live.
- **2026-07-29 — PHASE 3 / TASK 3a: `norsub-emru` library rewritten onto CMA (code-complete, green,
  NOT yet committed).** Everything in the "Phase 3 coding prompt" is implemented. Three of cru's open
  questions were answered this session and applied.
  - **cru's answers (2026-07-29):** (1) **a datasheet "float" with no width → `float64`** (JS numbers are
    doubles; fewer conflicts) ⇒ `HEHDT.heading` + `PHTRO.pitch`/`roll` `float32` → `float64`. (2) **The
    `PRDID` trailing comma in the manual is a typo** — no code change; test the 2-field form without it and
    the 3-field form with it (the comma yields `heading: null`). (3) **A checksum is ALWAYS present** — the
    manual's checksum-less RDI ADCP format is a typo, so the current drop-if-absent behaviour stands, nothing
    to build.
  - **`src/` is new:** `parser.ts` = `NorsubParser implements DeviceParser<string>`, a facade **composing**
    its protocol parser via a factory registry (`Record<NorsubProtocol, (options) => ProtocolParser>`), with
    `protocol` getter/setter, a `protocols` list, and the locked **`parser`** getter for the protocol-specific
    extras (NOT delegated method-by-method). `protocol-nmea.ts` = `NorsubNMEAParser extends NMEAParser`,
    registering the generated definitions with `registerProtocols` and 7 aggregators with
    `registerAggregators`. `metadata.ts` = those aggregators. Nothing throws: an invalid setter value is
    discarded, an invalid constructor `protocol` falls back to the default.
  - **Status placement is exactly the locked 3 rules:** field **and** payload level for the five
    single-`uint32` sentences (`PNORSUB:7`, `PNORSUB2:8`, `PNORSUB6:18`, `PNORSUB7:24`, `PNORSUB8:24`),
    **payload-only** for `PNORSUB7b:25` (verified: `payload.at(-1).metadata` is `undefined` there). Old
    top-level `metadata.status` is gone. `src/status.ts` + `src/utils.ts` survive **unchanged** (both were
    manual-validated on 2026-07-28). Verified a split status decodes identically to the combined one.
  - **`PTVG:3` aggregator built** as cru asked: strips the glued unit letter, `/100` for pitch and roll,
    whitespace-tolerant sign (`- 036` and `-0036` both read as -36), decoded value in FIELD metadata as
    `{ degrees }`. Real parse: `$PTVG,-0036P, 0021R,101.8T*42` → `-0.36 / 0.21 / 101.8`. Non-numeric or
    missing-letter input ⇒ no metadata, never a throw.
  - **No `sentenceTimestamp` override** (datasheet-verified): every sentence carries `received` + `parsed`
    and NO `sentence`; `T1`/`T2` keep their raw `us` values with no metadata. Asserted in the suite.
  - **🆕 SHARED GENERATOR — `scripts/yaml-to-ts.mjs` (root), replacing BOTH per-package `yaml-to-json.js`
    (deleted).** It emits a **typed** const (`export const NAME: ProtocolsFileContent = …` + the import) and
    then reformats the file **through the repo's own ESLint API (`fix: true`)**, so the output is
    byte-identical to `pnpm run format` and regeneration is **idempotent** — which is what finally lets
    `protocols` run on **test** as well as build without dirtying the tree (verified: run twice → identical
    sha256; `git diff` shows only intentional data changes). Both packages now call it with
    `--name`/`--type`/`--type-from`; `js-yaml` went to **root** devDeps (eslint was already there) rather
    than being added per-package, since one script serves both. `**/yaml-to-json.js` dropped from the eslint
    ignores. **`test` now regenerates protocols in nmea-parser too** (cru's open question (c) — yes).
  - **This closed the drift bug for real, and found a second one.** The committed `src/norsub.ts` had been
    hand-adapted, so `norsub-emru:protocols` had never regenerated it; the new generator reproduces it
    byte-for-byte **except** it exposed that the file's `description: '0 - Error\n\n1 - No Error'` did not
    match the YAML, which folds to `'0 - Error\n 1 - No Error'` (a stray space — YAML folds a line break
    inside a double-quoted scalar to a space). Fixed the **YAML** in both copies to a single-line
    `"0 - Error\n1 - No Error"` so intent and output agree.
  - **Typing the generated consts is a real win:** `src/nmea.ts` now carries
    `: ProtocolsFileContent`, so the whole NMEA knowledge base is validated by `tsc` at compile time, not
    only by the runtime `safeParse`. It typechecks clean.
  - **Tests: `tests/index.test.ts` rewritten, 45 specs** (was 2). Covers the facade defaults/options/
    fallback/no-throw setters, `DeviceParser<string>` conformance for BOTH the facade and the protocol
    parser, KB registration + inherited NMEA built-ins, every fake sentence round-tripping, the YAML feed
    through `.parser`, status placement per sentence (`test.each`), all-bits-set/clear, non-PNORSUB
    sentences getting no status, `PTVG`, **`PRDID` 2-field vs 3-field**, timestamps, bad checksum emitted
    with an error, garbage input, and partial-sentence buffering. `tests/status.test.ts` +
    `tests/utils.test.ts` kept as-is.
  - **Plumbing:** version → **3.0.0**, `engines.node` `">= 18"` → `">=22"`, `protocols/norsub.yaml` →
    **`.yml`**, root `norsub-emru:protocols` script added, and **`.github/workflows/norsub-emru.yml` now
    prepends `pnpm run protocol-core:build`** to "Build monorepo deps" in BOTH the test and publish jobs
    (the pre-existing fresh-checkout bug). Re-verified the exact CI order after deleting all three `dist/`
    folders: core build → nmea build → norsub test 45/45 → norsub build.
  - **README rewritten from scratch** on the current API (the old one documented the removed 2.x
    `NMEASentence` shape): install/Node ≥22, `addData`/`parseData`, a REAL parsed `PNORSUB8` CMA sample, the
    `Status` type, a "where status lands" table, `PTVG` decoding, the full API table, protocol selection +
    the `parser` getter, and the extra exports. `docs/PACKAGES.md` + `docs/CMA.md` §Conformance flipped to
    the new state.
  - **⚠️ ONE TEST GAP, deliberate and documented in the suite:** the locked "switching `protocol` discards
    the buffer and undrained sentences" branch **cannot be exercised while `NorsubProtocol` has a single
    member** — there is nothing to switch to. What IS tested: same-protocol assignment preserves the buffer,
    and an invalid protocol falls back. The discard test lands with protocol #2.
  - **🆕 TWO THINGS FOR cru (neither blocks the commit):**
    1. **Every NorSub sentence emits `protocol.version: "unknown"`** because `protocols/norsub.yml` declares
       no `version` for any of its protocols (nmea.yml declares `3.1`). The OEM manual is at **1.2.0** — do
       you want `version: '1.2.0'` on the NORSUB* protocols (and what, if anything, on the third-party
       GYROCOMPAS1 / Tokimek / RDI ADCP / SMCA / SMCC)? It is a data-only change but it **changes CMA
       output**, so it is your call, not mine.
    2. **`nmea.yml` still has `float32` fields** (real NMEA sentences). cru's "unspecified float →
       `float64`" rule was applied ONLY to the norsub data this session — changing nmea.yml would alter the
       published reference lib's output values (float32 rounding → float64 precision), so it was left alone
       deliberately. Flag if you want it swept.
  - **Verified:** norsub-emru lint + `tsc --noEmit` + **45/45** + build ESM+CJS+DTS; nmea-parser **71/71**
    (one fixture updated for float64) + build; core **15/15**; repo-wide `pnpm lint` clean;
    `pnpm install --frozen-lockfile` clean; packed manifest `3.0.0` / `engines.node >=22` / dep
    `@coremarine/nmea-parser` rewritten `workspace:^` → **`^3.1.0`** / **zero** `protocol-core` in the
    manifest or the `dist/*.d.ts` / tarball = dist + README + LICENSE only.
  - **NOT committed** — cru commits when he has reviewed. The pre-existing stray
    `packages/norsub-emru/probe.tmp.ts` (untracked, from an older session) was left untouched.
- **2026-07-28 — 🚀 `@coremarine/nmea-parser@3.1.0` PUBLISHED (PR [#71](https://github.com/core-marine-dev/devices/pull/71),
  merge `a80c8e4`) — the base-library prerequisites for Phase 3 + a datasheet-driven data fix.** Design
  session for norsub-emru first (all decisions in §"Phase 3 — norsub-emru: locked design"), then the
  prerequisites were implemented, verified, released and merged by cru; `npm view` → `latest: 3.1.0`.
  **`dev` == `main` == `a80c8e4`, tree clean.** Two code commits (`fecb500` units fix, `adc327b` 3.1.0)
  plus docs.
  - **`protocol-core`: new `DeviceParser<B>` interface** (`memory`, `bufferLimit`, readonly `buffer`,
    `addData`, `parseData`), `Parser<B> implements DeviceParser<B>`. Required by the composition design:
    `Parser<B>` has protected members, so a facade that COMPOSES protocol parsers is not
    type-assignable to `Parser<string>` even with an identical public surface. Goal 2 ("same API") is now
    a contract, not a side-effect of shared inheritance. Test: an extending parser and a composing
    facade coexist in a `DeviceParser<string>[]` (core **15/15**).
  - **nmea-parser: two additive `protected` extension points** — `registerProtocols` (was `private`) so a
    subclass registers its own bundled generated built-in with no YAML round-trip and no `fs`; and a
    **per-instance aggregator registry** (`MetadataAggregators` + `BUILTIN_METADATA_AGGREGATORS`
    exported, `aggregateMetadata`/`parseSentence` take an optional registry — defaulted, so existing call
    sites are untouched — plus `protected registerAggregators()` merging into the instance copy). Also
    unlocks metadata for sentences fed at runtime via `addSentences`.
  - **New exports for downstream device parsers:** `BUILTIN_METADATA_AGGREGATORS`, types
    `MetadataAggregator`/`MetadataAggregators`, and re-exported core types `DeviceParser`, `DraftCMA`,
    `Field`, `Metadata`, `Value` (core is private, so only what nmea-parser re-exports is reachable).
  - **`packages/nmea-parser/tests/extension.test.ts`** (new, 6 specs) — the executable spec for the seam
    norsub uses; **read it before writing norsub**. nmea-parser **71/71** (was 65).
  - **Data fix (manual-verified):** `PNORSUB6`/`PNORSUB7`/`PNORSUB7b` `T1`/`T2` units `ms` → `us` in 4
    files (norsub-emru YAML + generated `src/norsub.ts`; nmea-parser's byte-identical fixture copy
    `protocols/norsub.yml` + generated `tests/norsub.ts`). Also **validated `norsub-emru/src/status.ts`
    bit-for-bit** against the OEM manual (incl. `STATUS_A` low half / `STATUS_B` high half) — unchanged.
  - **Wrapper untouched and deliberately NOT bumped** (still `2.0.1`): it only uses
    `new NMEAParser({memory})`/`addSentences`/`parseData`, and its published `^3.0.2` range already
    accepts 3.1.0; its workflow is path-filtered so the merge didn't trigger it. Re-verified green
    anyway: build + **19/19** `node:test` incl. real-headless-node-red.
  - Verified: core lint+tsc+15/15+build; nmea lint+tsc+71/71+build ESM+CJS+DTS; `DeviceParser` inlined
    into the published `.d.ts` with **zero** protocol-core refs; packed manifest `3.1.0` /
    `engines.node >=22` / no core leak; `--frozen-lockfile` clean; `dev` CI green (`nmea-parser` 22.x +
    24.x, `protocol-core`). **`norsub-emru` CI red as expected** (legacy pre-3.0 API; `publish` is
    `needs: test`) — and it exposed the pre-existing missing-`protocol-core:build` bug in
    `norsub-emru.yml`, to be fixed with the norsub rewrite where the job can actually go green.
  - **✅ Fresh-install verification with ONLY npm-published packages (2026-07-28), answering cru's
    question "does installing the wrapper pull the new lib?":** in an empty temp dir,
    `npm i @coremarine/nmea-parser-nodered` → `npm ls` shows
    `@coremarine/nmea-parser-nodered@2.0.1 └─ @coremarine/nmea-parser@3.1.0` (declared range `^3.0.2`
    resolves to `3.1.0`). Then booted the **real node-red** headless in that temp dir with a flow
    `inject → cma-nmea-parser → test-sink`: node-red auto-loaded `@coremarine/nmea-parser-nodered`
    (`cma-nmea-parser`, enabled) and a GGA came out as CMA — `id: GGA`,
    `protocol: {NMEA, 3.1}`, `metadata.timestamp: {received, parsed, sentence}`,
    `metadata.payload: {latitude: 48.1173, longitude: 11.5166…}`, `payload[5].metadata: {label: 'GPS fix'}`.
    **So the unchanged wrapper picks up 3.1.0 automatically — no republish needed, nothing to do in the
    Node-RED flow library for the wrapper itself.** (Nit found: the lib's `exports` map does not expose
    `./package.json`, so `require('@coremarine/nmea-parser/package.json')` throws
    `ERR_PACKAGE_PATH_NOT_EXPORTED` — normal for a strict `exports`, harmless, mentioned only so nobody
    is surprised.)
  - **Deliberately NOT done:** mirroring "regenerate `protocols` on **test**" to nmea-parser — the
    generator emits raw `JSON.stringify` while the committed `src/nmea.ts` is eslint-formatted, so a
    `pretest` regeneration would dirty tracked files. Fix the generator (emit typed, lint-clean output)
    during the norsub rewrite, then mirror. **cru's remaining manual step: refresh the Node-RED
    flow-library entry for the nmea component.**
- **2026-07-24 — 🚀 PHASE 1 + PHASE 2 PUBLISHED (cru merged PR [#70](https://github.com/core-marine-dev/devices/pull/70) `dev`→`main`).**
  `@coremarine/nmea-parser@3.0.2` and `@coremarine/nmea-parser-nodered@2.0.1` are **live on npm** (OIDC
  + provenance). Verified post-merge: `npm view` returns both versions; PR merged 10:32 UTC; `main` @
  `290a38f`. The version gate no-op'd every other package; norsub-emru + sbg-ecom test-red stayed
  contained (`needs: test`). This closes the whole nmea-parser track — lib **and** wrapper both in
  production, both serving as the reference/template for the remaining parsers. **`dev` is now behind
  `main` by the merge commit — sync it before Phase 3 (see top banner).** **NEXT = Phase 3: norsub-emru.**
- **2026-07-24 — nmea-parser-nodered wrapper: both open dev-server items resolved (cru).** Committed
  edits to `dev-server.mjs` + `templates/nodered/dev-server.mjs`; `docs/STATUS.md` updated same-turn.
  - **Dev-instance isolation → WON'T-FIX, accepted by design (cru's pragmatic call).** The whole
    `pnpm deploy`-from-isolated-dir direction (validated last session) is **dropped, not implemented** —
    wrappers are a complementary offering and the isolation machinery isn't worth the future-maintenance
    cost. **node-red + mocha + node-red-node-test-helper stay ROOT devDeps** (already the state — last
    session's per-package experiment was already reverted; nothing to change there). Siblings appearing
    in the palette is fine **as long as** our node sits in the **CoreMarine** category and that category
    is **first**. ctx7 recap that informed the call: non-legacy `pnpm deploy` (needs
    `inject-workspace-packages=true`) DOES prune to a clean target via a dedicated lockfile, but the
    setting is workspace-wide (hard-linking, `syncInjectedDepsAfterScripts`) — too heavy for a dev-only
    convenience; `--legacy` avoids the setting but drags the whole root devDep list. Neither adopted.
  - **Palette category order — DONE.** Added `editorTheme.palette.categories: ['CoreMarine', …defaults]`
    to the `RED.init` settings in `dev-server.mjs` (exact key confirmed via ctx7 nodered.org config docs:
    unlisted categories append to the end, so the built-in defaults are listed after CoreMarine to keep
    their normal order). The node already declares `category: "CoreMarine"` in `parser.html`. **Caveat:
    this pins order only in the LOCAL dev-server — palette category order is a per-editor setting, not
    shippable by a node package**; an end user's Node-RED is unaffected.
  - **Removed the `setModuleState` sibling-disable block** from `dev-server.mjs` (from commit `d158f9a`
    "only this node") — now pointless (siblings accepted) and it never reliably worked. Dropped the now-
    unused `ownName` const + `readFileSync` import + stale "ONLY this node" header comment. The fresh
    throwaway `userDir` per run is kept.
  - **Verified live** (no docker): booted `dev-server.mjs` in both `dev` and `examples` modes headless;
    `GET /settings` → `editorTheme.palette.categories.order = ['CoreMarine', …]`; `GET /nodes` →
    `@coremarine/nmea-parser-nodered` (`cma-nmea-parser`) loaded + enabled (the 4 siblings also load +
    enabled, as accepted); examples mode reads the shipped `examples/nmea-parser-examples.json`.
    `dev-server.mjs` lints clean.
  - **Mirrored to `templates/nodered/dev-server.mjs`** (same edits + a `TODO:` note on keeping the
    `CoreMarine` category). **`CONTRIBUTING.md` needed no change** — it made no isolation/sibling claims.
  - **Publish-readiness verified + two fixes (cru, same day).** Before marking the wrapper done, ran
    the exact CI steps locally and inspected `pnpm pack`:
    - **CI `test` job = GREEN locally:** `protocol-core:build` + `nmea-parser:build` → `nmea-parser:nodered:build`
      → `nmea-parser:nodered:test` **19/19** (incl. the real-headless-node-red integration test).
      `pnpm install --frozen-lockfile` clean after the package.json edits.
    - **CI `publish` job:** version-gated (`2.0.0` not on npm → will publish), OIDC configured; packed
      manifest confirms `workspace:^` → `@coremarine/nmea-parser: "^3.0.0"`, **no `protocol-core` leak**.
      ✅ **Ordering constraint SATISFIED:** `npm view @coremarine/nmea-parser@3.0.0` → live (`latest:
      3.0.0`), so **Phase 1 is done** and the wrapper's `^3.0.0` dep resolves. Merging the wrapper is safe.
      Pushed to `origin/dev` (`29f7173`); the `dev` CI run is **GREEN** (Test 22.x + 24.x ✅, Publish
      skipped as it's not `main`). **UPDATE (patches below): the `dev→main` merge now also touches
      `packages/nmea-parser/**`, so it triggers BOTH `nmea-parser.yml` AND `nmea-parser-nodered.yml`
      (path-filtered) → publishes **nmea-parser 3.0.2** AND **wrapper 2.0.1** in one merge; every other
      package still no-ops on its version gate.** **This is Phase 2.**
    - **FIX 1 — stray `.backup` no longer published.** node-red auto-writes a hidden
      `.<flowfile>.backup` beside any flow it opens; `files: ["examples"]` was globbing it into the
      tarball (49 KB). Deleted the 4 stray `*.backup` files repo-wide (all gitignored cruft) and added
      **`"!**/*.backup"`** to the wrapper's `files` array. Re-pack (with a simulated regenerated backup)
      confirms it's excluded. Mirrored to `templates/nodered/package.json`.
    - **FIX 2 — `engines.node` set to `>=22` (major only, cru's locked reasoning).** cru develops
      against the **latest node-red (`5.0.1`)** and publishes as compatible with **node-red `>=4.0.0`**
      (the wrappers use the v4 API, which still works on 5) — `node-red.version` stays **`>=4.0.0`**.
      **The node floor is driven by the LIBRARY, not node-red's floor:** cru guarantees/tests
      `@coremarine/nmea-parser` only on the **two latest LTS (node 22 & 24)**, so the wrapper cannot
      honestly claim node 18 even though node-red 4 runs on ≥18.5. Hence `engines.node: ">=22"` —
      "runs in node-red 4, but requires node ≥22" (node-red 4 supports node up to 22, so a node-red-4
      user on node 22 is fine; older-node users are honestly excluded). **cru prefers major-only in
      `engines.node` (no minor/patch)** → `">=22"`, not `">=22.0.0"`. node-red stays the `latest`
      (5.0.1) devDep. (An earlier `>=18.5` attempt — reasoning from node-red 4's own floor — was
      corrected: the lib's guarantee, not node-red's floor, sets the bar.)
    - **FIX 3 — nmea-parser (LIBRARY) `engines.node` `">= 18"` → `">=22"`, patched to `3.0.1` (cru).**
      The lib's `>= 18` was a legacy/mistake — it's only built & tested on the two latest LTS (22 & 24),
      so 18 was never truly guaranteed. This is the floor the wrapper's `>=22` derives from, so the lib
      must agree. cru's call: correct the metadata and ship a **patch** (`3.0.0` → `3.0.1`) — tightening
      `engines` is arguably breaking, but since it corrects inaccurate metadata (never really supported)
      and `engines` is advisory, a patch is fine. Major-only (`">=22"`). No code/build change (tsup is
      `platform: neutral`, no node-18 target anywhere). Verified: lint + tsc + **65/65** + build
      ESM+CJS+DTS; packed manifest `engines.node >=22` / no protocol-core leak;
      frozen-lockfile clean (workspace deps are links). Dependents (`norsub-emru`, `nmea-parser-nodered`)
      use `workspace:^` / `^3.0.x` → accept the bump unchanged. **(Version later bumped 3.0.1 → 3.0.2
      with the README rewrite — see FIX 4.)**
    - **FIX 4 — READMEs rewritten to the new API + patch bumps (cru).** Both package READMEs still
      documented the **removed** API (lib: `NMEASentence` output, `new NMEAParser()`, `addProtocols({file|
      content|protocols})`; wrapper: a stale "only this node in the palette" dev note). Rewrote them:
      - **`packages/nmea-parser/README.md`** — full rewrite onto the current API: `new NMEAParser({ memory?,
        bufferLimit? })` (memory default true), `addData`/`parseData` → **`CMA[]`** (real GGA sample from a
        live parse, trimmed), `addSentences(yaml): Result<void, NMEAError>` (YAML-string-only; old
        `addProtocols` explicitly called out as removed), the getters, cross-runtime + Node ≥22 note, and
        a full API table. Output/type blocks taken from `docs/CMA.md` + `src/`.
      - **`packages/nmea-parser-nodered/README.md`** — the msg API (`payload`/`memory`/`protocols`/`sentence`/
        `fake` → CMA output) was already current; only fixed the `:dev`/`:examples` palette note to
        "CoreMarine category, pinned first; siblings also show in the monorepo dev instance (harmless)".
      - **Patch bumps for the doc change (cru's instruction):** nmea-parser **3.0.1 → 3.0.2**,
        nmea-parser-nodered **2.0.0 → 2.0.1**. ⚠️ Since 3.0.1 and 2.0.0 were **never published** (only
        nmea-parser 3.0.0 is on npm), these bumps effectively **skip** 3.0.1 / 2.0.0 — the first published
        versions after 3.0.0 will be **3.0.2** (lib) and **2.0.1** (wrapper, its first publish ever).
        Harmless (npm ignores gaps); trivially adjustable pre-merge if cru prefers not to skip.
      - Verified: frozen-lockfile clean; packed manifests = lib `3.0.2` / wrapper `2.0.1`, wrapper dep
        rewritten `workspace:^` → **`^3.0.2`**, `engines.node >=22` on both, no protocol-core leak.
    - **Node-RED flow-library checklist re-confirmed via ctx7** (nodered.org/docs/creating-nodes/packaging):
      `node-red.nodes` map ✅, `keywords` has `node-red` ✅, name/version/description/MIT ✅, repository +
      `repository.directory` + bugs + homepage ✅, README + LICENSE shipped ✅, `examples/` flows ✅,
      `engines.node` ✅. **Wrapper is publish-ready** (gated only on Phase 1).
- **2026-07-23 — dev-isolation investigation: cru's per-package-devDep+catalog idea DISPROVEN
  empirically; `pnpm deploy --legacy` VALIDATED as the real fix (not yet implemented in
  `dev-server.mjs`).** No code committed this session — pure investigation, all experimental edits
  reverted, working tree clean.
  - **Ruled out node-red-node-test-helper as the cause (cru's hunch):** its `package.json` has NO
    dependency on `node-red` (only a `"node-red"` string in `keywords`); `mocha` is its own devDep.
    Not the mechanism.
  - **Ruled out `mocha` removal (cru's other hunch) — NOT SAFE YET:** `norsub-emru-nodered`,
    `thelmabiotel-tblive-nodered`, `sbg-ecom-nodered`, `septentrio-sbf-nodered` still run mocha
    (only `nmea-parser-nodered` uses `node:test` so far). Removing the root devDep would break
    those four until each is refactored in its own turn.
  - **Root cause nailed down precisely** (was previously only "confirmed the walk-up climbs to the
    workspace"): `@node-red/registry/lib/localfilesystem.js` `scanTreeForNodesModules` climbs from
    `coreNodesDir` (wherever `@node-red/nodes` physically sits) **one directory at a time all the
    way to filesystem `/`**, checking `<ancestor>/node_modules` at every level. Because pnpm
    workspaces use **one shared virtual store for the whole workspace** (single lockfile), that walk
    always passes through `node_modules/.pnpm/node_modules/@coremarine/*` — a directory pnpm
    populates with a symlink to **every** workspace package unconditionally (needed for
    `workspace:*`-protocol resolution generally), regardless of which package.json declares
    `node-red`.
  - **Tested cru's fix empirically and it does NOT work:** moved `node-red` out of the root
    `devDependencies` into `packages/nmea-parser-nodered`'s own `devDependencies` (twice — once
    alone, once combined with a `pnpm deploy` test), ran `pnpm install` both times. Result **both
    times**: node-red resolves to the exact same `node_modules/.pnpm/node-red@5.0.1.../` path, and
    `.pnpm/node_modules/@coremarine/*` still lists all 11 sibling packages, unchanged. **Which
    manifest declares node-red is irrelevant** — the shared virtual store is a property of the whole
    workspace, not of any one dependency edge. **pnpm `catalog:` is therefore not needed for this
    fix** (it would only synchronize a version string across manifests that don't affect isolation).
  - **Validated fix: `pnpm --filter <pkg> deploy --legacy <tmp-dir>`, then boot node-red FROM that
    deployed dir** (not from the workspace). `pnpm deploy` builds a fresh, self-contained
    `node_modules` scoped to just that package's own resolved dependency graph — its `.pnpm/
    node_modules/@coremarine/*` contains only `nmea-parser` (the real dep) + itself, never the other
    workspace packages. Since node-red's own files then live entirely inside that isolated tree, the
    `coreNodesDir` walk-up never reaches the shared store at all. **Proved with a probe script**
    (boots `RED.init`/`RED.start` from inside the deployed dir, fresh tmp `userDir`, then
    `RED.nodes.getNodeList()`): output was `MODULES: [ '@coremarine/nmea-parser-nodered' ]` — zero
    siblings — reproduced on **two separate deploys** (node-red only as root devDep; node-red
    duplicated into the wrapper's own devDeps too) with identical results, reinforcing that the
    declaration site doesn't matter.
    - **⚠️ Known wart, not yet resolved:** `--legacy` is required (`ERR_PNPM_DEPLOY_NONINJECTED_
      WORKSPACE` without it — the workspace doesn't set `injectWorkspacePackages: true`), and legacy
      deploy against a shared lockfile drags the **entire root `devDependencies` list** into the
      deploy target (eslint, mocha, tsup, vitest, typescript, chai — ~627 resolved packages) rather
      than just node-red + the wrapper's own deps. Harmless functionally (disposable tmp dir,
      content-addressable store hard-links make repeat deploys fast) but wasteful/not clean. **Not
      investigated:** whether setting `injectWorkspacePackages: true` in `pnpm-workspace.yaml` (then
      deploying WITHOUT `--legacy`) avoids the bloat — check ctx7 for exact semantics/tradeoffs
      before adopting.
  - **Not yet done:** wiring this into `dev-server.mjs` (needs a deploy-then-spawn/require step
    instead of importing `node-red` directly), dropping the `setModuleState` hack, mirroring to
    `templates/nodered/`. See the updated open-item note in "Node-RED wrapper refactor" below and the
    paste-ready resume prompt at the end of this doc.
- **2026-07-22 — nmea-parser-nodered wrapper refactored to TS + new API + node:test (Phase 2, cru).**
  The wrapper is rebuilt as the **template for all future wrappers**; verified green three ways
  (local clean-dist chain, `node:test`, and **act** in a container). NOT yet published (publishes on
  the next `dev`→`main` merge via the OIDC+version gate; `workspace:^` rewrites to `^3.0.0`).
  - **Authoring:** TypeScript → **tsup** → CJS (`export = init` → `module.exports = <fn>`), `platform:
    node`, `@coremarine/nmea-parser` stays **external** (published runtime dep). `copy-assets.mjs`
    copies `parser.html` + `icons/` into `dist/`. `tsconfig` needs `"module": "preserve"` for `export =`.
  - **Architecture:** pure-logic `src/lib.ts` (NO node-red dep — unit-testable) + thin adapter
    `src/parser.ts`. New lib API: `new NMEAParser({ memory })`, `addSentences(yaml)` (handles the
    `Result`; a configured/`msg` `file` path is read in-node via `node:fs`; `content` YAML also
    accepted, precedence content>file), `parseData`→`CMA[]`. Fixed the old `parser()` bug + the
    flow/registerType type name.
  - **Tests (`node:test` via `tsx`, 19/19):** `tests/lib.unit.test.ts` (pure logic w/ a real parser) +
    `tests/wrapper.integration.test.ts` — **boots real headless node-red** (public API + flowFile
    pattern), auto-loads the built node, runs `inject → cma-nmea-parser → sink`, asserts CMA output +
    timestamp metadata. NO `node-red-node-test-helper`.
  - **CI (`nmea-parser-nodered.yml`):** test job re-enabled, matrix `[22.x,24.x]`; builds the dep chain
    first (`protocol-core:build && nmea-parser:build`) then the wrapper (node-red auto-loads
    `dist/parser.js`), then `node:test`; publish job gated on `needs: test` + version. **act-verified:
    Job succeeded.**
  - **Versions:** `engines.node ≥22`, `node-red ≥4`, wrapper bumped **1.2.1 → 2.0.0** (breaking).
  - **Removed:** mocha + vitest test files, `manual_tests.sh`, `Dockerfile`, `docker-compose.yml`,
    `tests/nodered/`. **Added:** `dev-server.mjs` + `nmea-parser:nodered:dev` (local node-red, no
    docker) and `:build`/`:ci:local` root scripts. `@types/node-red` devDep (typed, `@types` were fine
    — the earlier errors were `moduleResolution: node`); dropped `@types/node-red-node-test-helper`.
  - **Manual/visual scripts (file-backed, tour off, palette scoped):** `:dev` edits the **tracked**
    scratch flow `tests/dev.flows.json`; `:examples` edits the committed, shipped example under
    `examples/` (node-red reads/writes the on-disk flow via an **absolute `flowFile`** — verified
    supported — so edits persist; `editorTheme.tours:false` kills the walkthrough). Both disable
    sibling `@coremarine/*-nodered` modules (`setModuleState`) so only this node shows — the "all my
    nodes appear" clutter is a **monorepo-only** artifact (shared workspace node_modules), not a bug.
    **Examples ship in `examples/` (NOT `dist/`)** via `files` and surface in node-red's
    *Import → Examples* (confirmed via ctx7). **cru's original `examples/nmea-parser-examples.json` is
    kept as-is**; a **second tab "NMEA Parser Examples — v3 API (CMA output)"** was appended to the
    SAME file (groups: Parse→CMA[], Memory, Protocols content|file, Sentence, Fake, Flow Errors) as a
    proposal for cru to visually compare/adjust. `parser.html` help documents the new API (protocols
    content/file, CMA[] output). **node-red flow-library checklist verified committed:** keywords has
    `node-red`, `node-red.version >=4`, `engines.node >=22`, examples shipped via `files`, README +
    LICENSE + repository + semver all present.
  - **`templates/nodered/` regenerated to match** (TS + tsup + copy-assets + node:test + dev-server,
    all with `TODO:` markers; near-ready for the NMEA-family, trimmable for binary parsers).
    `templates/nodered.yml` workflow blueprint modernized (OIDC + gate + build chain + node:test,
    was v4/node18/NPM_TOKEN). `CONTRIBUTING.md` "How to create a NodeRED component" rewritten (no
    docker; TS/tsup/node:test/dev-server flow). Templates are eslint-ignored + outside the pnpm
    workspace, so placeholders don't break lint/install. **Phase 2 DONE** except the actual publish.
  - **Example flow finalized (2026-07-22):** single "NMEA Parser Examples" tab (cru's design, legacy
    tab removed, no third-party `yaml` node). Groups: Flow Errors, Examples (single + partial + **batch
    & one-by-one via embedded-data function nodes** — no sample file), Memory API, **Protocols API =
    hot-expand demo** (get; parse PCMEX before; expand via CONTENT embedded YAML + via FILE
    `examples/example-protocol.yml`; parse PCMEX after → shows unknown→decoded), Sentence API, Fake API.
    Ships `examples/example-protocol.yml` (`COREMARINE_EXAMPLE`/`PCMEX`).
  - **✅ BOTH wrapper items CLOSED (2026-07-24) — see the top Done entry for detail:**
    1. **Isolated dev/examples node-red instance → WON'T-FIX, accepted by design (cru).** The
       `pnpm deploy` fix (validated 2026-07-23) was **dropped, not implemented** — not worth the
       future-maintenance cost for a complementary offering. node-red stays a **root** devDep;
       siblings appearing is fine. The `setModuleState` hack was **removed** from `dev-server.mjs`.
       (Historical: the whole isolation investigation — per-package devDep DISPROVEN, `pnpm deploy
       --legacy` validated but heavy — is preserved in the 2026-07-23 Done entry.)
    2. **CoreMarine palette category first → DONE.** `editorTheme.palette.categories: ['CoreMarine',
       …defaults]` added to `dev-server.mjs` `RED.init` (key confirmed via ctx7; verified live).
       Dev-server-only (per-editor setting, not shippable). Mirrored to `templates/nodered/`.
  - **Next: publish wrapper 2.0.0** (dev→main; workspace:^ → ^3.0.0), then **Phase 3 =
    norsub-emru** (lib refactor, then its `-nodered` wrapper cloned from this template).
- **2026-07-22 — git history rewritten to strip AI co-author trailers (cru).** cru uses multiple
  AI agents from different providers and does **not** want any single one credited in authorship.
  Removed the `Co-Authored-By: Claude …` trailer from all **9** commits that carried it (via
  `git filter-branch --msg-filter`; messages-only — content byte-identical, `git diff` empty,
  topology preserved). Force-pushed **both** branches: `origin/dev` `2811a4b→02c3e3a`, `origin/main`
  `d2d8a28→0f0191c`; remote verified 0 trailers. Also set globally in `~/.claude/settings.json`:
  `attribution.commit=""`, `attribution.pr=""`, `attribution.sessionUrl=false`,
  `includeCoAuthoredBy=false` (Claude Code adds no attribution anywhere, all repos, going forward).
  **⚠️ Consequences for the next agent:**
  - **All commit SHAs changed.** Every short hash cited in the Done entries below (`ee08691`,
    `65bec81`, `c39f233`, etc.) is a **pre-rewrite** reference and **no longer resolves** on the
    branches — treat them as historical labels, not lookups. Current tips: `dev` `02c3e3a`,
    `main` `0f0191c`.
  - **Anyone with an existing clone must** `git fetch origin && git reset --hard origin/<branch>`
    before working, or they'll re-push the old history.
  - **GitHub still retains the old SHAs** via the merged PR's `refs/pull/*` + caches (force-push
    can't purge those; would need GH Support or repo recreate). Nothing was on npm, so no pkg impact.
- **2026-07-22 — FIX: nmea-parser CI couldn't resolve the private core in a fresh checkout (cru).**
  After the pnpm fix, running the workflow locally with **`act`** surfaced a *second*, pre-existing
  break: nmea-parser's tests/build import `@coremarine/protocol-core`, whose `package.json`
  `exports`/`main` point **only at `dist/`** — and the workflow built **nothing** before Tests. In a
  fresh checkout the core has no `dist/`, so vitest died with *"Failed to resolve entry for package
  @coremarine/protocol-core"* (4 suites). It only ever passed locally because a prior session left
  `packages/core/dist/` on disk. **This had been red in CI since the 2026-07-10 core refactor** — the
  pnpm bug just failed earlier and hid it. **Fix (Option A, cru): added a `🛠️ Build monorepo deps`
  step running `pnpm run protocol-core:build`** to `nmea-parser.yml` — before Tests in the test job,
  and before Build in the publish job (mirrors the `norsub-emru.yml` "build nmea-parser first"
  pattern). Reproduced + fixed locally (rm core dist → 4 fail; build core → 65/65) and **re-verified
  end-to-end with `act` from a clean checkout: Setup pnpm ✅ → protocol-core build ✅ → 65/65 ✅ →
  nmea build ✅ → job succeeded.** Follow-ups noted for later: (B) a `pretest` hook, or (C) resolve
  the core from source (`exports`→`src`/vitest alias) to drop the build-order dep repo-wide — revisit
  when refactoring norsub. **Local dev gotcha remains:** run `pnpm run protocol-core:build` once
  before `nmea-parser:test` if `packages/core/dist/` is absent.
- **2026-07-22 — FIX: CI red at `Setup pnpm` — pnpm `11.12.0` is a broken release (cru).** The
  `dev`→`main` merge was made and **failed on every library workflow at the `📦 Setup pnpm` step**
  (`pnpm/action-setup@v6`, self-update to the packageManager version): `[ERROR] Cannot use 'in'
  operator to search for 'integrity' in undefined` while parsing the lockfile. Root cause is **not
  our logic** — **pnpm `11.12.0` was deprecated by upstream as broken** (`npm view pnpm@11.12.0
  deprecated` → *"This release is broken. Please upgrade to v11.13.1 or newer."*; `11.13.0` is
  broken too). It was green on 2026-07-13 because npm deprecated/it surfaced afterward. Same bug hit
  the **local** dev env (corepack honors the same field). **Fix: bumped root `package.json`
  `packageManager` `pnpm@11.12.0` → `pnpm@11.15.1`** (current `latest-11`, clean). Lockfile
  unaffected (packageManager doesn't change dep resolution); `--frozen-lockfile` still clean. Verified
  local: pnpm 11.15.1, nmea-parser **65/65** + build ESM+CJS+DTS. **The `nmea-parser@3.0.0` publish
  did NOT happen** (test failed → publish skipped by `needs: test`), so nothing bad shipped — re-merge
  `dev`→`main` after this lands on `dev` and the `dev` run is green.
  - **Lesson / process:** the `test`/`build` jobs run on **every `dev` push** (only `publish` is
    `main`-gated), so **land changes on `dev` and confirm the workflow is green there BEFORE merging
    to `main`**. `act` (nektos/act) is set up for fully-local workflow runs (Docker/podman present).
- **2026-07-22 — CI/CD publish-gating re-audited + release plan phased (cru).** No code change
  (HEAD still `aaa6847`). Audited all 11 workflows: **every publishable package's publish job is
  correctly gated on `github.ref == 'refs/heads/main'` AND a `npm view <name>@<version>`
  version-differs check** (publish steps run only when that exact version is NOT yet on npm), each
  workflow targets **its own** package (no cross-wiring), all on OIDC (`id-token: write`, zero
  `NPM_TOKEN` — the only "NPM_TOKEN" text is a comment); `protocol-core` correctly has no publish
  job (private). **Confirmed the only fully-working action today is `nmea-parser`**; `norsub-emru`
  + `sbg-ecom` test jobs go red on a `main` merge (expected mid-refactor — norsub uses the removed
  API, sbg has no specs) and `needs: test` blocks their publish, so nothing broken ships. cru
  **locked the release into strict phases** (see "Where we are now" + the paste-ready prompt):
  **Phase 1** publish nmea-parser 3.0.0 + verify a fresh install → **Phase 2** (on cru's signal)
  refactor the nmea-parser-nodered wrapper + verify its CI/CD → **Phase 3** (only once nmea-parser
  **and** its wrapper are fully in production) norsub-emru + its wrapper → then tblive, then the
  binary parsers, each with its wrapper. PR message for the `dev`→`main` merge drafted this turn.
- **2026-07-13 — post-release cleanup + safe dep bumps (cru).** HEAD `ee08691`.
  - **`c39f233` — strip private core from published manifests.** New **`.pnpmfile.mjs`** with a
    `beforePacking` hook that deletes `@coremarine/protocol-core` from any packed package's
    dependencies/devDependencies/peerDependencies. Replaces the earlier harmless-but-ugly dangling
    `@coremarine/protocol-core@0.0.0` in nmea-parser's published devDeps. Verified: `pnpm pack`
    manifest now contains **zero** `protocol-core` references. (Stays in the workspace package.json
    for local builds; only the *published* manifest is cleaned.)
  - **`b16b7c0` — fixed `thelmabiotel-tblive` `homepage`** (was `github.com/core-marine-dev/tree/…`,
    missing `/devices`).
  - **`ee08691` — safe dep bumps:** `packageManager` pnpm `11.10.0→11.12.0` (⚠️ **11.12.0 later
    found broken & deprecated upstream → bumped to `11.15.1` on 2026-07-22**, see the top Done entry),
    `@types/node` `26.0.1→26.1.1`, `eslint` `10.6.0→10.7.0`. Verified: nmea 65/65, core 14/14, both
    lint+tsc+build clean, whole-repo `pnpm lint` clean, `--frozen-lockfile` clean.
  - **Deferred deliberately (NOT risk-free — see the CI/CD & versions decisions):**
    - **TypeScript 7** (native Go rewrite, GA 2026-07-08): held at `6.0.3`. TS7 has **no stable
      programmatic API until 7.1** (~Oct 2026); `typescript-eslint@8.63` peers `typescript
      >=4.8.4 <6.1.0` and tsup's dts uses the TS API — both break on 7. `tsc` itself is fine/~10× faster;
      revisit when 7.1 ships and typescript-eslint/tsup add support.
    - **js-yaml 5**: held at 4.x. The workspace **security override** `js-yaml: '>=4.1.1'` pins the
      whole workspace to 4.3.0; bumping nmea-parser to 5 would need to change that override, dragging
      mocha/node-red's transitive js-yaml to v5 too. No CVE on 4.3.0 → no benefit, real risk.
- **2026-07-13 — nmea-parser 3.0.0 release prep + repo-wide CI/CD modernization (cru).** Four
  commits on `dev`, in order A→B→D→C (HEAD `65bec81`):
  - **A `aca7a37` — CI/CD (all 11 workflows).** Bumped `actions/checkout@v4→v7`,
    `actions/setup-node@v4→v6`, `pnpm/action-setup@v4→v6`; node matrix → the two latest LTS lines
    **`[22.x, 24.x]`** (publish job on `24`; Node 26 isn't LTS until 2026-10-28). **Migrated every
    publish job off `NPM_TOKEN` to npm Trusted Publishing (OIDC)** — added `permissions: { id-token:
    write, contents: read }`, dropped the token env; provenance is emitted automatically. **cru
    configured Trusted Publishers on npmjs for ALL packages.** Added a **publish-if-version-changed
    gate**: the publish job runs `npm view <name>@<version>` first and only installs/builds/publishes
    when that exact version is NOT yet on npm (verified empirically: published→exit 0, missing→E404).
    New **`protocol-core.yml`** (test-only; private package, no publish). Node-RED workflows:
    version-bumped + OIDC + gate, **test jobs stay disabled** until each wrapper is refactored.
    `pnpm publish` on pnpm 11.10.0 + Node 24 supports OIDC (regression pnpm#11513 was fixed in
    #11526, we're well past it).
  - **B `37dfde2` — `build` regenerates protocols.** nmea-parser + norsub-emru `build` now runs
    `protocols` before `format && tsup`, so the published dist always carries the latest
    `protocols/*.yml` sentences and every workflow stays uniform (no per-package generate step).
    (Verified generate→format→tsup reproduces the committed `src/nmea.ts` byte-for-byte.)
  - **D `5a5ad0a` — `repository.directory` in every package.json** (all 10 publishable + private
    core got a repository/homepage/bugs block for parity).
  - **C `65bec81` — nmea-parser 3.0.0.** Bumped `2.2.1→3.0.0` (CMA output is breaking). **Moved
    `@coremarine/protocol-core` `dependencies`→`devDependencies`** — it's private/unpublished and
    bundled via tsup `noExternal`, so it must not be a runtime dep (else `npm i` 404s on
    `@coremarine/protocol-core@0.0.0`). **Added `dts: { resolve: [/@coremarine\/protocol-core/] }`**
    to `tsup.config.ts` so the core's TYPES inline into `dist/*.d.ts` too (`noExternal` only inlines
    JS) — the published `.d.ts` now has zero reference to the unpublished core. Verified: `pnpm pack`
    tarball has NO protocol-core in `dependencies`, self-contained types, all 4 dist files.
  - Verified end-to-end: nmea-parser lint+tsc+**65/65**+build ESM+CJS+DTS; core lint+tsc+**14/14**
    +build; all 11 workflow YAMLs parse; `pnpm install --frozen-lockfile` clean. (The published
    `devDependencies` initially still listed `@coremarine/protocol-core@0.0.0` after pnpm's
    `workspace:*` rewrite — now stripped by the `.pnpmfile.mjs` `beforePacking` hook, see the newer
    Done entry above.)
- **2026-07-13 — STEP 3: sentence timestamp metadata (`metadata.timestamp`), core-wide (cru).**
  Every emitted CMA now carries `cma.metadata.timestamp = { received, parsed, sentence? }` (epoch
  ms). **Core** (`@coremarine/protocol-core`): new `ValibotTimestampMetadataSchema` +
  `ValibotSentenceMetadataSchema` (a **loose** object — typed `timestamp` + free-form extras) in
  `src/cma.ts`; **`CMA.metadata` promoted optional → required** (single source of truth — the
  timestamp is not optional because of internal logic). New types `TimestampMetadata`,
  `SentenceMetadata`, and **`DraftCMA`** (= `CMA` minus its metadata timestamp — what a protocol's
  `extractSentences` returns). `Parser.addData` stamps `received` (call time) + `parsed`
  (= `draft.timestamp`) into every sentence — the **only** place a `CMA` gains its timestamp, so the
  required contract can't be violated and no placeholder is needed. New protocol hook
  `protected sentenceTimestamp(draft): Timestamp | undefined` (default: none) supplies the optional
  `sentence`. **nmea-parser**: whole pipeline retyped `CMA` → `DraftCMA`
  (`sentences.ts`/`metadata.ts`); overrides `sentenceTimestamp` to promote the first field-level
  `timestamp` (GGA `utc_position`) → `metadata.timestamp.sentence`; added `NMEASentenceMetadata`
  type. **Decision B (cru): kept the GGA field-level `timestamp` as-is** (it's the source the hook
  promotes — deliberate redundancy, gives field-decoders freedom). Verified: core lint+tsc+14/14
  +build, nmea lint+tsc+**65/65**+build ESM+CJS+DTS; real-run confirms GGA has all three, HDT has
  received+parsed only. Docs: [`docs/CMA.md`](CMA.md) §Timestamp metadata, [`docs/NMEA.md`](NMEA.md)
  §Sentence timestamp. **No `-nodered` wrappers touched; norsub not touched.**
- **2026-07-10 — STEP 2: Result pattern (no throws) in core + nmea-parser.**
  New `packages/core/src/result.ts`: `Result<T,E> = { success:true, value:T } | { success:false,
  error:E }` (bare literals, no `ok`/`err` helpers), exported from `@coremarine/protocol-core`.
  nmea-parser `NMEAError = { kind: 'invalid-yaml' | 'invalid-schema', message }` (`src/types.ts`).
  `parseProtocols(yaml)` now returns `Result<ProtocolsFileContent, NMEAError>` — `yaml.load` wrapped
  in try/catch (→ `invalid-yaml`), `safeParse` miss → `invalid-schema`; the lone `throw` is gone.
  `addSentences(yaml)` returns `Result<void, NMEAError>` (non-string input or a failing
  `parseProtocols` → error; else registers + `{ success:true, value:undefined }`). Constructor loads
  the trusted built-in via `safeParse` (was throwing `.parse`) — never throws. Parse hot-path
  unchanged (already no-throw). Tests updated: `parseProtocols`/`addSentences` invalid-content specs
  now assert `.success === false` (+ `error.kind`). Verified: core lint+tsc+12/12+build,
  nmea-parser lint+tsc+62/62+build ESM+CJS+DTS.
- **2026-07-10 — core setters no longer throw (cru).** `set memory` / `set bufferLimit`
  (`packages/core/src/parser.ts`) now use `BooleanSchema.is` / `NaturalSchema.is` guards: a valid
  assignment is set, an invalid one is **discarded** (current value kept), never thrown — the legacy
  throw-on-bad-assignment behaviour is removed. Test added (13/13 core). Setters can't return a
  `Result`, so discard-and-keep is the no-throw contract.
- **2026-07-10 — protocols renamed `.yaml` → `.yml` + `nmea.yml` expanded (cru), regenerated.**
  `protocols/{nmea,norsub}.yml`; updated the `protocols` generator script and the two tests that
  read norsub by path; regenerated `src/nmea.ts` + `tests/norsub.ts`. 62/62 green.
- **2026-07-10 — STEP 1: 3-level metadata via dev-authored aggregators (nmea-parser).**
  New `packages/nmea-parser/src/metadata.ts`. `type MetadataAggregator = (cma) => { fields?:
  Record<number, Metadata>, payload?: Metadata }`; registry `METADATA_AGGREGATORS` keyed by
  **`${id}:${payloadLength}`** (stable identity, NOT field names); aggregators read fields **by
  index**. `aggregateMetadata(cma)` runs after upgrade — merges `fields[i]` into
  `payload[i].metadata` and `payload` (flat) into `cma.metadata.payload`; **no-ops when no
  aggregator is registered**, so unknown/wrong-length sentences pass through untouched (known-only).
  Wired: `parseSentence = aggregateMetadata(upgradeKnownSentence(parseGenericSentence(raw)))`.
  Seeded **GGA (`GGA:14`)** — resurrects the deleted `nmea-metadata.ts` on the CMA shape: field
  metadata `utc_position`→`{ timestamp }` (hhmmss.ss→epoch ms, UTC, dated today; idx 0) +
  `gps_quality`→`{ label }` (idx 5); payload metadata `{ latitude, longitude }` in decimal degrees
  (idx 1+2, 3+4). Free-form metadata; **core CMA schema unchanged**. Verified: lint clean, tsc
  clean, **62/62 tests** (+6 in `tests/metadata.test.ts`), build ESM+CJS+DTS. Kept the prior
  agent's proposed names (`MetadataAggregator`/`aggregateMetadata`/`METADATA_AGGREGATORS`); quality
  field metadata key is `label` (avoids clashing with the field's own `description`).
- **2026-07-10 — nmea-parser refactored onto `@coremarine/protocol-core` (slice A–F, committed & green).**
  The reference CMA implementation. Output shape changed `NMEASentence` → `CMA` (breaking for
  Tracker — deliberate). Verified: `pnpm lint` clean, `tsc --noEmit` clean, **56/56 tests pass**,
  build emits ESM+CJS+DTS. Zero `node:` imports and zero "frame" in `src/`.
  - **`parser.ts`** — `class NMEAParser extends StringParser` (core owns memory/buffer/drain +
    `addData`/`parseData`). Implements only `extractSentences(buffer) → { sentences: CMA[], remainder }`.
    New single knowledge-feed input `addSentences(yaml: string)` (js-yaml; web-safe — caller reads
    the file). **Constructor is now object-arg `new NMEAParser({ memory?, bufferLimit? })` and
    `memory` DEFAULTS TO `true`** (core default; old NMEA default was `false` — tests needing
    independence pass `{ memory: false }`). Kept renamed extras: `getSentences`,
    `getSentencesByProtocol`, `getSentence`, `getFakeSentenceByID`.
  - **`sentences.ts`** — `parseSentence = upgradeKnownSentence(parseGenericSentence(raw))`. Generic
    parse emits a CMA (all fields `type:'string'`, empty field → `value:null`, `metadata:{checksum,
    standard:false, talker?}`, `protocol:{name:'NMEA', version:'unknown'}`); a **bad checksum is
    emitted WITH a sentence-level error, never dropped** (locked decision 4b). Upgrade looks up the
    KB, filters defs by field count, and applies the **newest** by version (semver-tolerant
    `compareVersions`). Values parsed via core `TYPE_SCHEMAS` (fixes the old Float32/Float64 swap);
    int64/uint64 ride as decimal strings.
  - **Talker/id semantics (my call — flagging; the locked design under-specified proprietary +
    full-id-registered sentences):** upgrade lookup order = `[fullId, strippedId]`; the MATCHED
    definition's id becomes the CMA `id`; `talker` (from `getTalker`) always goes to `metadata`.
    Unmatched → generic with `id = fullId`. This reproduces the old full-id-first behavior exactly
    (`HEHDT`→GYROCOMPAS1 not standard `HDT`; proprietary `PNORSUB8`) and passes every test. **If cru
    wants different talker/id handling, it's a localized change in `upgradeKnownSentence`.**
  - **Knowledge base** is now `Map<id, StoredSentence[]>` (multiple defs per id). `protocols.ts`
    keeps `parseProtocols(yaml)` + `getStoredSentences` (multi-def), **dropped `node:fs`** (no more
    file-path mode).
  - **`schemas.ts`/`types.ts` trimmed** — dropped legacy OUTPUT schemas (`NMEASentenceSchema`,
    `NMEAParsedField*`, local numeric field validators, the file/object arms of the old
    `ProtocolsInputSchema`, `JSONSchemaInputSchema`, `ChecksumSchema`); kept the YAML-input +
    KB + sentence-structure schemas. `MapStoredSentencesSchema` now maps id → array.
  - **Deleted:** `src/nmea-sentences.ts` (stale duplicate — knowledge now flows YAML →
    `yaml-to-json.js` → generated `src/nmea.ts` `PROTOCOLS` only), `src/nmea_protocols_schema.json`
    (unused), and **`src/nmea-metadata.ts`** (GGA lat/long/quality enrichment — DEFERRED; it
    referenced now-deleted types, so it's removed and must be reimplemented on CMA as a follow-up).
- **2026-07-09 — `@coremarine/protocol-core` scaffolded (CMA rollout foundation, uncommitted).**
  New private workspace package `packages/core/` — the shared contract both refactor
  goals build on. Not published (`"private": true`); each parser will bundle it into its own
  `dist` via tsup `noExternal: [/@coremarine\/protocol-core/]`, so published parsers carry no
  runtime dep on it.
  - `src/cma.ts` — canonical CMA valibot schemas (house idiom: `ValibotXSchema` → `ValibotValidator`),
    the definitive format cru locked (see [`docs/CMA.md`](CMA.md) §Locked decisions). Field
    `value` union is `string | number | boolean | null`.
  - `src/schemas.ts` — config schemas (`Boolean`/`Natural`) **plus one field-value validator per
    CMA `Type`** (`Char`, `String`, `Uint8/16/32`, `Int8/16/32`, `Float32/64` from
    `@schemasjs/valibot-numbers`; `Int64`/`Uint64` as decimal strings) and a
    `TYPE_SCHEMAS: Record<Type, Schema<Value>>` lookup for table-driven, identical field
    validation across parsers. This is also the correct single source that fixes NMEA's
    `Float32`/`Float64` swap bug when NMEA is refactored.
  - `src/types.ts` — CMA types **inferred** from the schemas (`ReturnType<typeof …Schema.parse>`),
    plus `Input = string | Uint8Array`, `ParserOptions`, `ExtractedSentences<B>`.
  - `src/parser.ts` — `abstract Parser<B>` owns the whole `memory`/buffer/drain machinery; the
    ONE protocol-specific method is `protected extractSentences(buffer): { sentences, remainder }`.
    Two flavor bases supply buffer mechanics: `StringParser` (NMEA/Norsub/TB Live) and
    `BinaryParser` (Septentrio/SBG, Uint8Array via `DataView`, no Node `Buffer`).
  - `tsup.config.ts` `platform: 'neutral'` (runtime-agnostic). Root proxy scripts added
    (`protocol-core:{lint,format,build,test,test:coverage}` — prefix follows the package name,
    not the folder).
  - **Folder is `packages/core/`; package name is `@coremarine/protocol-core`** (cru's choice —
    short folder, descriptive package name). They intentionally differ.
  - Verified: lint clean, `tsc --noEmit` clean, 5/5 tests pass, build emits ESM+CJS+dts.
- **2026-07-09 — housekeeping (uncommitted):** moved each parser's `docs/` datasheet PDFs out
  of the packages into `misc/datasheets/<package>/` (gitignored; septentrio's nested `4-10-1/`
  folder preserved). No package `docs/` folders remain. These PDFs were untracked, so it's a
  pure filesystem move. See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) `misc/` convention.
- **2026-07-08 — full repo revision + docs reset.** Three exploration passes (packages,
  uncommitted work, tooling/CI) written into `docs/` (was empty); `AGENTS.md` slimmed to a
  ≤80-line index; this STATUS.md created as the handoff log.
- **2026-07-08 — uncommitted-pile triage (was ~46 dirty files, cru's call on categories):**
  - **`misc/` convention adopted** (gitignored, like the Tracker repo): raw sensor data,
    scratch harnesses, drafts and parked work must never be committed. Moved there: the root
    CMA harness (`misc/tests/` — cma.ts draft, SBG corpus, P08-Trident), `misc/todo/`
    (ublox-ubx + vectornav scaffolds, never tracked), sbg-ecom-nodered draft tests + raw
    bin/csv samples (`misc/drafts/`, `misc/data/sbg/`), tblive runtime outputs
    (`misc/data/tblive/`), the unused `receiver` helper node, `drafts.excalidraw.png`, and
    superseded design drafts (`misc/archive/`).
  - **Deleted** 14 untracked npm-generated `package-lock.json` files (packages' test folders,
    templates).
  - **Restored** the root `package-lock.json` (its deletion was uncommitted and unexplained;
    we stay on npm until the pnpm migration). `npm install` then refreshed it (committed with
      the sbg-ecom bump).
  - **Verified then committed** the pre-idle threads: septentrio-sbf test modernization
    (`getFrames()→parseData()`, `ErrorCode→ERROR_CODE`, `Mode→MODE`) — **54/54 tests pass**;
    sbg-ecom dep bump + vitest `include` + example fixes (trailing `}` in template strings —
    also fixed a real one in `example_csv.ts` map keys) — lint + build clean;
    septentrio-sbf-nodered sibling bump `^1.0.1`; tblive-nodered expanded docker flows +
    its previously-untracked docker components mirror.
- **2026-07-08 — pnpm migration (step 1, `f6444c3`):**
  - Root `package.json`: `packageManager: pnpm@11.10.0`, dropped npm `workspaces` + `main`,
    rewrote ~36 proxy scripts to `pnpm --filter @coremarine/<pkg> run <action>`.
  - `.npmrc` (`engine-strict=true`) + `pnpm-workspace.yaml` (`strictDepBuilds: true` +
    `allowBuilds: { esbuild: true }`) — supply-chain hardened (mirrors Tracker repo).
  - 5 tracked `package-lock.json` removed; `package-lock.json` added to `.gitignore`.
  - Sibling deps → `workspace:^` (norsub-emru + all 5 nodered packages).
  - septentrio-sbf `types` hack removed — `gpstime.d.ts` is now a local ambient declaration
    (`declare module 'gpstime'`) included in `tsconfig.json` (no more copying to root
    `node_modules/@types/`).
  - valibot ERESOLVE dep rot fixed: `nmea-parser` `valibot: 1.1.0` → `^1.4.0`; `norsub-emru`
    peer `valibot: 1.1.0` → `>=1.0.0` (valibot 1.4.2 now installs cleanly).
  - 10 CI workflows + 2 templates rewritten: `pnpm/action-setup@v4`, `cache: 'pnpm'`,
    `pnpm install --frozen-lockfile`, `pnpm publish --filter --no-git-checks`.
  - Verified: all 5 builds pass, all 4 test suites with specs pass (nmea 60/60, septentrio
    54/54, tblive 134/134, norsub 8/8; sbg-ecom has no specs — pre-existing).
  - Docs updated: TOOLING, COMMANDS, PNPM-MIGRATION (marked done), CONTRIBUTING, AGENTS.
- **2026-07-08 — ESLint flat config migration (step 2, `21ad374`):**
  - Root `eslint.config.js` with 4 plugins: typescript-eslint, @stylistic, eslint-plugin-sonarjs,
    eslint-plugin-perfectionist (mirrors Tracker repo). House style: no-semi, single-quotes,
    2-space, K&R braces, arrowParens: always. Sonar thresholds: max-lines-per-function 50,
    cyclomatic-complexity 10, cognitive-complexity 15 (tests exempt from max-lines). Import
    ordering: `// built-in` → `// installed` → `// coded` via perfectionist partitionByComment.
  - ts-standard removed; per-package `ts-standard`/`eslintConfig` blocks removed.
  - `lint` = `eslint`, `format` = `eslint --fix`; root `lint`/`lint:fix` scripts added.
  - `.vscode/settings.json` updated: ESLint flat config integration, `source.fixAll.eslint`
    on save, dropped `standard.*` settings.
  - Per-package `tsconfig.json` updated to include `tests/**/*` (for projectService).
  - ~2596 auto-fixable violations fixed (quotes, semicolons, trailing commas, indentation).
  - ~180 non-fixable violations triaged:
    - Mechanical fixes: split multi-statement lines (66), unused vars/imports (25), test
      assertion specificity (20).
    - Complexity violations (max-lines-per-function, cyclomatic-complexity, cognitive-complexity):
      inline-disabled with `-- CMA refactor will address` comments.
    - Sonar findings: `===` type-mismatch (fixed a real type bug in nmea-parser/sentences.ts;
      intentional ones disabled with comments), `Math.random()` in tests (disabled), TODO tags
      (disabled), empty collections (disabled), hardcoded IP (disabled), dead stores (removed).
  - Verified: all 5 builds pass, all 4 test suites pass (nmea 60/60, septentrio 54/54,
    tblive 134/134, norsub 8/8). `pnpm lint` clean across the whole monorepo.
  - Docs updated: TOOLING (linting section), COMMANDS, CONTRIBUTING, AGENTS.
- **2026-07-08 — documentation (step 3, `055b6d4`):**
  - `docs/CodeStyle.md` created — dev explainer with rationale + examples for: formatting,
    import groups, arrow functions, one-statement-per-line, small-function thresholds,
    validation & types (Valibot/SchemasJS), per-package five-file structure, tooling commands,
    inline eslint-disable policy. Adapted from the Tracker repo's CodeStyle.md, tailored for
    Node/monorepo (no Bun built-ins, no Result pattern yet — that's a later track).
  - `AGENTS.md` — added "Code style (enforced)" condensed checklist section (73 lines total,
    under the 80-line cap) + CodeStyle.md added to docs map.
  - `docs/STATUS.md` — updated to reflect step 3 done.
- **2026-07-08 — dependency refresh (step 5, `3bcc0d6`):**
  - **TypeScript 5.9.3 → 6.0.3.** Root `tsconfig.json` replaced the annotated starter template
    with a clean modern config: `moduleResolution: "bundler"`, `moduleDetection: "force"`,
    `types: ["node"]`, `noFallthroughCasesInSwitch`, `noImplicitOverride`. Per-package
    tsconfigs updated. `norsub-emru` needed `override` on `parseData()`.
  - **tsup 8.5.0 → 8.5.1 (patched).** tsup injects `baseUrl: "."` in its DTS build, which TS 6
    deprecated (TS5101). Patched via `pnpm patch` to skip the injection (see
    `patches/tsup@8.5.1.patch`).
  - **Vitest 3.2.4 → 4.1.10** + `@vitest/coverage-v8` 3.2.4 → 4.1.10. Zero code changes needed.
  - **Valibot** — `nmea-parser` `valibot: ^1.4.0` → `1.4.2`; `@valibot/to-json-schema`
    `1.3.0` → `1.7.1`; `@schemasjs/valibot-numbers` → `1.1.1`; `@schemasjs/validator` → `2.0.5`.
  - **Other deps:** `@types/node` 24.8.1 → 26.0.1, `mocha` 11.7.4 → 11.7.6, `chai` 6.2.0 → 6.2.2,
    `deep-equal-in-any-order` 2.1.0 → 2.2.0, `node-red-node-test-helper` 0.3.5 → 0.3.6.
  - Verified: all 5 builds pass, all 4 test suites pass (nmea 60/60, septentrio 54/54,
    tblive 134/134, norsub 8/8), `pnpm lint` clean, `pnpm install --frozen-lockfile` clean.
  - Docs updated: TOOLING, STATUS.
- **2026-07-08 — security audit + vulnerability fixes (step 6, `b505fc9` + `2d40a86` + `31b52c3`):**
  - `pnpm audit` found 27 vulnerabilities (3 critical, 15 high, 9 moderate). Root cause: mostly
    transitive deps through `node-red@4.1.1` (tar, multer, qs, ws, uuid, path-to-regexp,
    jsonata, form-data, ajv) + `esbuild` (via tsup) + `js-yaml` (via mocha/nmea-parser).
  - **node-red 4.1.1 → 5.0.1** — fixed 19 of 27 vulns.
  - **js-yaml 4.1.0 → 4.2.0** in nmea-parser — fixed prototype pollution + quadratic DoS.
  - **pnpm overrides** in `pnpm-workspace.yaml` for remaining transitive vulns:
    `serialize-javascript >=7.0.5`, `diff >=8.0.3`, `js-yaml >=4.1.1`, `jsonata >=2.2.0`,
    `form-data >=4.0.6`, `esbuild >=0.28.1`.
  - **valibot pinned to `1.4.2`** (exact) in all `peerDependencies` — was `>=1.0.0` in root +
    norsub-emru + thelmabiotel-tblive + thelmabiotel-tblive-nodered, allowing older vulnerable
    versions.
  - **rootDir fix** — TS 6 requires explicit `rootDir` when `include` spans multiple dirs
    (`src/` + `tests/`). Added `"rootDir": "."` to all 5 library packages + template.
  - Result: `pnpm audit` reports **0 known vulnerabilities**.
  - GitHub still shows 75 vulns on `main` (default branch) — they'll clear once `dev` is merged
    to `main`.

## thelmabiotel-tblive — MEASURED audit (2026-07-30, nothing designed yet)

Read the package and **ran it** (throwaway `tsx` probes, deleted after; 134/134 vitest green,
`1.0.3`, `engines.node >= 18`). This section is FACTS ONLY — the design is still to be converged
with cru. Where this doc's older one-line notes were wrong, the correction is called out.

**Shape of the library.** `TBLive` is a **standalone class, zero shared code** — no
`protocol-core`, no `Result`, its own local `Type`/`Field`/`Metadata` in `src/types.ts`. Its public
surface is *already* `memory` / `buffer` / `bufferLimit` / `addData(string)` / `parseData(): T[]`,
i.e. `DeviceParser<string>` **by coincidence, not by contract**. ~2.2k lines of `src`, of which
`sample.ts` is 4 copy-pasted ~100-line functions (emitter/receiver × 1.0.1/1.0.2) and `command.ts`
is 863 lines of the same style. **There is NO knowledge base** — no `protocols/*.yml`, nothing for
`scripts/yaml-to-ts.mjs` to generate. Every field name/type/unit/description is hand-written TS.

**Output vs CMA — the real gaps** (`ParsedSentence`, `src/types.ts:33`):

| gap | today | CMA requires |
| --- | --- | --- |
| `protocol` | **absent entirely** | `{ name, version }`, required |
| `mode`, `firmware` | top-level keys | inside `metadata` (locked rule) |
| `metadata` | **optional** (`metadata?`) | always present |
| `metadata.timestamp` | the *sentence's own* time as `{ value, date: ISO }` | the typed `{ received, parsed, sentence? }` block — **direct collision on the same key** |
| payload metadata | mirrored into `metadata[field.name]` (`metadata.angle`, `metadata.snr`, `metadata.temperature`) | flat under `metadata.payload`, and **field names are explicitly never keys** |
| `Field.value` | `number \| string \| boolean` | `… \| null` |
| `Field.type` | local list (no `char`/`int64`/`uint64`, has `float32`) | core's `Type` + core's `TYPE_SCHEMAS` validation |

**Two vocabularies for sentence names:** the internal `SENTENCES_NAME` is camelCase
(`clockRound`, `serialNumber`, `intervals`) while the emitted `id` is snake_case (`clock_round`,
`serial_number`, `log_intervals`), and `sample` splits at parse time into ids `emitter` /
`receiver`. Needs one convention.

**⚠️ `protocol` is ALREADY taken, twice, and both meanings differ from CMA's.** A sample's
field 3 is `protocol` = the *acoustic tag* protocol (`S64K`, `R01M`…), and the `LM=` command
sentence has id **`protocols`** listing the active ones. CMA's `protocol` means the *device wire
format*. Three meanings on one word — the same footgun that forced the `msg.protocols` →
`msg.sentences` rename in the wrappers. **Naming decision for cru.**

**Firmware/version matching — confirmed as the hard part, and worse than "hard": it is mostly
guessed.** There is no protocol *version*, only a device `firmware`, and it is derived
**per sentence from the field count**: 9 → `1.0.1`, 7 → `1.0.2`, 8 → *either* (disambiguated by
sniffing `fields[2]` for the string `'tbr sensor'`), anything else → `firmware: 'unknown'` +
`payload: []`. Every listening/command sentence that carries no version evidence is **hardcoded
`'1.0.2'`** (`listening.ts:10,45,62,77`, most of `command.ts`) — a guess presented as a fact.
`FIRMWARES_AVAILABLE = ['1.0.1','1.0.2','unknown']`. Nothing tracks the firmware learned from an
actual `FV=` sentence and applies it to later ones.

**Three real bugs found, all measured:**
1. **`bufferLimit` is stored, validated, and enforced NOWHERE** — byte-identical to the latent bug
   found in nmea-parser 4.0.0. Measured: `new TBLive({ bufferLimit: 10 })` + 5000 junk chars →
   `buffer.length === 5000`.
2. **Input is dropped silently — the whole nmea 4.0.0 fix has to be redone here.** `'hello world'`
   → `[]` and it **sits on the buffer forever** (never garbage-collected, never reported).
   `'noise$1234567,…\r'` → the `noise` prefix is discarded with no trace. A wrong-field-count sample
   *is* reported (`errors[]`, `payload: []`), so the machinery is half there.
3. **Sentence timestamp is computed by STRING CONCATENATION** (`sample.ts:181`):
   `Number(\`${seconds.raw}${milliseconds.raw}\`)`. Correct only when the device zero-pads to 3
   digits. Measured with `,50,`: `155457933050` → **1974-12-05**, instead of `1554579330050`.
   Should be `seconds * 1000 + ms`. Also, the whole `metadata` block is skipped when *any* field has
   an error (early `return`), so one bad field loses all the good metadata.

**Field type/value disagreements** (cosmetic today, but they are the contract): the
`TB Live serial number` and `emitter` fields declare `type: 'string'` and carry
`value: Number(...)`; ping's `serial number` declares `type: 'uint16'` and carries `1234567`, which
does not fit a uint16. Core's `TYPE_SCHEMAS` will reject these on adoption.

**Corrections to this doc's older notes:** "CMA-shaped, only `mode`/`firmware` extra" **understates
it** — `protocol` is missing, `metadata` is optional, and `metadata.timestamp` means something else.
No wire-format notes for TB-Live exist in `docs/PROTOCOLS.md` (checked). Stray `tango.json` sits at
the package root (a TANGO/IMMS MQTT payload sample, unrelated to tblive).

### Business + physical context (cru, 2026-07-30) — why this device exists

These parsers are the ETL front end of **Tracker**, which ships CMA over RabbitMQ to the
**CoreIntegrity** SaaS, which predicts **mooring-line loss** on FPSOs/FSUs. Sensors are normally
GNSS + motion (MRU/AHRS/gyro/MGC) + occasional wave radar / anemometer. **Mooring-line sensors with
a usable battery life do not exist on the market** (COTS ≈ 5 days; CoreMarine needs ~10 years), so
CoreMarine repurposes **fish-tracking acoustic tags**: their 25-second transmit rate is what buys
the decade of battery.

So the physical chain is: Thelma Biotel **emitters** (acoustic tags, normally implanted in fish;
CoreMarine's are **modified to carry an inclinometer, or an inclinometer + depth sensor**) are
**clamped to each mooring line**; **TB Live receivers** (hydrophones) sit under the FPSO / above the
lines. The emitters keep Thelma's standard sentence and **CoreMarine encodes its own meaning into
the one `data` field**. We only ever talk to the **receiver** — the emitter↔receiver link is not our
concern. cru's own assessment: it is a clever workaround but **an operationally horrible one** — no
ack, noise-sensitive, high uncertainty.

**Frequency:** 15 channels, 63–77 kHz; up to 3 simultaneous. ⚠️ **Conflict to resolve:** cru says the
configured `FC` is the **centre** and it hears centre ±2 kHz (70 → 68/70/72); the 1.0.1 datasheet
§FC says the configured value is the **bottom** and the others are +2/+4 (67 → 67/69/71). Both agree
on 2 kHz spacing. Affects metadata/validation only, never decoding.

### What the datasheets actually say (READ 2026-07-30 — `misc/parsers/thelmabiotel/datasheets/`)

Three PDFs, all of them thin: `receiver-1.0.1.pdf` (16 pp, the only one documenting command mode),
`receiver-1.0.2.pdf` (6 pp, listening printouts + wiring **only** — no command mode at all), and
`emitter-1.0.1.pdf` (3 pp, the CoreMarine-commissioned tag firmware). cru's warning that some of the
documentation only ever existed as now-lost emails is consistent with what is here.

**Sentence inventory, from the docs, with real captures:**

| firmware | sentence | example | fields |
| --- | --- | --- | --- |
| 1.0.1 | detection | `$1000042,1589557202,615,S64K,1285,0,24,69,11\r` | 9 |
| 1.0.1 | log | `$1000042,1589557600,TBR Sensor,297,15,29,69,6\r` | 8 |
| 1.0.2 | detection | `$001129,1551087409,421,OPs,15,2,37,69\r` | 8 |
| 1.0.2 | log | `$001129,1551087600,Live Sensor,280,7,14,69\r` | 7 |

Detection fields: serial · seconds · ms · transmit protocol · transmitter ID · **data** · SNR ·
frequency · (1.0.1 only) strings-sent. Log fields: serial · seconds · log id · temperature
(`(x-50)/10` °C) · avg noise · peak noise · frequency · (1.0.1 only) strings-sent.

**The transmit-protocol table is real, useful, and NOT in the code today** — it bounds both ID and
data per protocol, and is the authority for when `data` is legitimately empty:

| protocol | ID range | data range | note |
| --- | --- | --- | --- |
| R256 / R04K / R64K / R01M | 1-256 / 1-4096 / 1-65536 / 1-1048576 | **NA** | ID-only; R01M extra-strong CRC |
| S256 / S64K | 1-256 / 1-65536 | 0-255 | S64K extra-strong CRC |
| HS256 | 1-256 | 0-65535 | "high resolution data" |
| DS256 | 1-256 | 0-65535 (**0-255 + 0-255**) | "**double** sensor data" |
| OPi / OPs | 1-1048576 / 1-65536 | NA / 0-4095 | shared open network |

**The emitter datasheet confirms CoreMarine's 16-bit encoding, verbatim:** "*the average uses 10 bits
[LSB] … 0~102.3º with 0.1º resolution (0~1023/10) and the std dev uses the remaining 6 bits [MSB] …
0-15.75º with 0.25º resolution (0~63/4). **HS256 encoding with 8bit ID and 16bit payload**.*" That is
exactly `getLineAngle` in `src/utils.ts`. It also gives the 25 s TX rate (`TXmin`/`TXmax` = 25), the
15 s-on / 10 s-silent duty cycle, and — matching the **commented-out** `SERIAL_NUMBERS_RESERVED` in
`constants.ts` — "*Sensor IDs should all be odd numbers and not any of these numbers: 104, 105, 106,
107, 110, 111*".

**⇒ Open question worth real thought:** `HS256` (16-bit, "high resolution") vs `DS256` ("double
sensor data", explicitly 0-255 + 0-255) look like they map 1:1 onto cru's inclinometer (10+6) and
depth sensor (8+8 tilt+depth). If so the *encoding* is discriminated **by the wire protocol field**,
not only by a private emitter-ID list — which changes where the decode can legitimately live.

**Command mode (1.0.1 doc only).** Enter with `LIVECM` (1.0.1) / `TBRC` (1.0.2), exit `EX!`, auto-exit
after ~60 min idle. Getters `SN? UT? FV? FC? LM? LI? HE?`, setters `UT= FC= LM= LI=`, actions
`EX! RR! FS! UF!`. **Every response echoes the request byte-for-byte** (`FC=71` → `FC=71`), so a
response is indistinguishable from a command on the wire. `HE?` dumps the whole API as prose — which
is why `API_TYPICAL_CONTENT_101/102` exist and why the help text contains every other token.
Listening-mode commands: `?` → `SN=000745 ><>`, `(+)` → `ack01`, `(+)TTTTTTTTTC` → `ack02` (Luhn
check digit over the 9 most-significant digits of the timestamp). `UF!` is the undocumented third
mode — bootloader, "may brick the device", so recognise it and stay away.

**Doc-quality evidence, since it constrains what we can promise:** the 1.0.2 doc is titled 1.0.2 but
says its format "is used in standard firmware v1.0.0"; its headline log example says **`Live Sensor`**
while its own capture dump two paragraphs later says **`TBR Sensor`**; the 1.0.1 doc labels log
field 6 "Detection SNR" where the value is plainly the listening frequency (the code already carries
a `TYPO IN DOCS` comment there, and 1.0.2 confirms it is frequency); serial number is "6-digit" in
listening mode and "7-digit" in command mode **in the same document**; `FV?` returns `FV=1.0.1` in
the table and `FV=v1.0.1` in the prose. 1.0.1 says an unset clock counts **seconds since power up**;
1.0.2 says the clock **resets to 1 Jan 2000** on power loss.

### 🐛 Three MORE bugs, found by testing the datasheet's own examples

4. **🔴 THE SERIOUS ONE — an empty `data` field is silently reported as a real 0.0° inclination.**
   The docs state data is blank for ID-only protocols ("`,,` blank for non-data transmit protocols",
   and `R*` rows have data range **NA**), and the 1.0.1 doc ships the literal example
   `$1000042,0000002185,897,R64K,1023,,24,69,9`. Measured: field 5 becomes `value: 0` with
   **no error**, and the aggregator publishes `average: {degrees: 0}, deviation: {degrees: 0}`.
   **A missing measurement is indistinguishable from a mooring line hanging perfectly vertical** —
   in the one product whose job is to notice when a line stops hanging vertically. CMA's
   `value: null` is precisely the fix.
5. **🔴 A `Live Sensor` log is parsed as a fish detection.** The 8-field ambiguity (1.0.1 log vs
   1.0.2 detection) is resolved by sniffing `fields[2]` for the literal `'tbr sensor'`
   (`sample.ts:15`), and the 1.0.2 datasheet's own headline example says `Live Sensor`. Measured on
   `$1000042,1589557600,Live Sensor,297,15,29,69,6\r`: `id: 'emitter'`, firmware claimed `1.0.2`,
   and the fields shift by one so **temperature 297 becomes the transmit protocol, peak noise 29
   becomes an angle of 2.9°, and the frequency 69 becomes the SNR**. It does carry one error
   (`milliseconds … Live Sensor`), so it is at least flagged — but as the wrong sentence type with
   fabricated values.
6. **`NaN` leaks into `Field.value`.** `value: Number(raw)` with a non-numeric raw yields `NaN`,
   which the declared type `number | string | boolean` does not admit and which only *looks* right
   downstream because `JSON.stringify` turns `NaN` into `null`. Any consumer reading the value before
   serialisation gets `NaN`.

Also: **the parser cannot tell epoch time from uptime.** With an unset clock the device sends
seconds-since-power-up, so `metadata.timestamp.date` confidently reports **1970-01-01** (measured:
`raw: '0000002185'` → 2185 s). CMA's **optional** `metadata.timestamp.sentence` is the right home —
omit it when the clock is evidently unset rather than emitting a fake date.

### Decisions taken with cru (2026-07-30) — tblive refactor

- **✅ Frequency range is NOT the parser's business.** cru: the parser "has to parse everything which
  has the TB Live protocol". He would **not** check 63–77 kHz and would **not** raise an error for an
  out-of-range frequency — the receiver's expected main frequency lives in Tracker, so the filter
  lives there. Generalised rule for this package: **the parser reports structural and type problems
  (undecodable input, framing, interference, a non-numeric value in a numeric field); it never judges
  plausibility of an in-range-unknown value.** Expected ranges belong in `description`.
- **⚠️ CONSEQUENCE — declared types must be honestly WIDE, because in the shared core the declared
  type IS a range check.** `nmea-parser/src/sentences.ts:196` `parseValue` ends
  `schema.is(num) ? num : null`, so a value outside its declared type silently becomes `null`. The
  ping serial is declared **`uint16`** today while real serials are 7 digits (`SN=1000045`,
  1.0.1 doc §SN) ⇒ it would become `null`. **Never use a narrow type as a de-facto validator.** The
  same helper gives two of our bug fixes for free: `raw === ''` → `null` (the empty-`data` bug) and
  `Number.isNaN` → `null` (the NaN leak).
- **✅ Command-mode sentences become CMA too** (cru, 2026-07-30). Not only samples/logs — every
  response in the command and listening APIs is emitted as a CMA. **`payload` carries a single
  element** (the response), and **`metadata.mode` states the mode of that sentence**. This settles the
  earlier open question of where `mode` goes: into `metadata`, per-sentence, not as a device-state
  top-level key.
- **✅ Output contract, locked with cru 2026-07-30 (all confirmed by him):**
  - **`protocol: { name: 'TBLive', version: <firmware> }`** — the firmware *is* the wire-format
    version (1.0.1 vs 1.0.2 differ in field counts), so the old top-level `firmware` key **disappears**
    rather than moving into `metadata`. `'unknown'` until there is evidence.
  - **`metadata.mode`** = **which API the sentence belongs to**, not the device state afterwards:
    `listening` | `command` | `update` | `unknown`.
  - **Sentence ids: `emitter` (detection) and `receiver` (log)** — cru's call, and the more coherent
    one: both name **who the sentence is about**. No collision; the 16 ids are unique.
  - **`id` for the two mode-switch sentences names the mode it takes you INTO** (cru, explicitly):
    `LIVECM`/`TBRC` → `id: 'command'`, `EX!` → `id: 'listening'`. Combined with the rule above this
    means **both look self-contradictory, consistently and deliberately**: `id: 'command'` +
    `mode: 'listening'` (a listening-API command that enters command mode) and `id: 'listening'` +
    `mode: 'command'` (a command-API action that resumes listening). cru: *"it tells me what it is
    enabling or doing"*. **Both differ from today, where `mode` always equals `id`.** Do not "fix" this.
  - **Field renames:** `'TB Live serial number'` → **`receiver_serial_number`** (both sentences; kills
    the spaces-and-capitals inconsistency with `noise_average`/`noise_peak`); detection field 3
    `protocol` → **`transmit_protocol`**; the `LM=` sentence id `protocols` → **`listening_mode`**. The
    last two come from the datasheets' own wording, freeing `protocol` for CMA's meaning.
  - **Field 4 of a detection stays `emitter`** (cru's literal words, 2026-07-30 — flagged back to him,
    since it makes `emitter` both a sentence id and a field name).
  - **🔑 SERIAL NUMBERS ARE `string`, NOT NUMERIC** (cru, 2026-07-30) — `receiver_serial_number`, the
    detection's `emitter`, and the ping's serial. **This is a correctness fix, not a preference.**
    Reasons, all from the field: (a) the firmware pads inconsistently — sometimes leading zeros,
    sometimes a `1` prepended — and `Number()` **destroys that evidence** (measured on the datasheet's
    own example: `raw: '001129'` → `value: 1129`); (b) the docs contradict themselves on whether the
    serial is **6 or 7** characters, so the parser must not commit; (c) the team identifies a device by
    its **last three digits**, and Tracker's check is therefore a **string suffix match**, never
    arithmetic. Today's code already declares field 0 as `type: 'string'` and then assigns
    `Number(...)` — the declaration was right and the value was the bug.
    **General rule for this package: identifiers are `string`; only measurements are numeric**
    (`seconds`, `milliseconds`, `temperature`, `snr`, `noise_*`, `frequency`, `sent`, `time`).
    This also dissolves the `uint16`/`uint32` range trap for both serial fields, and stays consistent
    with "no plausibility validation" — the datasheet's ID ranges (1-1048576 for `R01M`/`OPi`) are
    deliberately **not** enforced. A padded serial is data, **not** an `errors[]` entry.
    `metadata.payload.receiver` / `.emitter` are strings too, matching their fields.
  - **The `data` field is NOT decoded here** (cru, 2026-07-30). It stays generic: name **`data`**,
    `uint16` (the emitter datasheet's "16bit payload"), the raw number, **`null` when the transmit
    protocol carries none** — with **no field metadata and no `metadata.payload` mirror**. Tracker
    renames it and adds the angle / tilt+depth interpretation. **The line: the library decodes what
    Thelma's protocol defines; it does not decode what CoreMarine encoded into the opaque `data`
    field.** `snr` and `temperature` keep their decodes because those are Thelma's own documented
    scalings. ⇒ **`getLineAngle` and the `EMITTER_ANGLE_*` constants are DELETED from the library**
    (internal only, never exported from `index.ts`, so no API break).
    **⚠️ OPERATIONAL RISK — Tracker must implement the decode BEFORE this parser reaches production**,
    or `payload[5].metadata` and `metadata.angle` stop arriving and mooring-line inclination silently
    disappears. That is why `TBLIVE-NOTES-FOR-TRACKER.md` exists.
  - **`metadata.payload` deliberately mirrors identity/quality facts** (cru, 2026-07-30): `receiver`,
    `emitter`, `snr`, `temperature` — whichever the sentence has. **He knows it is redundant and wants
    it anyway**, and the reason is operational, not cosmetic: nobody can guarantee which firmware a
    production unit runs, so a **single fixed read path** for the key facts insulates Tracker and the
    supply chain from the field-count/firmware variation. He first said `$root.metadata`, then
    corrected it to **`$root.metadata.payload`**. **No CMA rule change is needed** — this is exactly the
    "device-level metadata MAY be mirrored at payload level" rule already locked 2026-07-28 for the
    NorSub status word; TB Live is now its second instance.
- **📄 `TBLIVE-NOTES-FOR-TRACKER.md` (repo root, temporary, untracked).** The `emitter101`/`emitter102`/
  `receiver101`/`receiver102` docblocks from `sample.ts` — verbatim, verified line-for-line — plus the
  datasheet facts they depend on and the decode helpers. They describe **how to interpret** values,
  which is Tracker's job. cru moves them into Tracker and deletes the file.

### Feedback model — locked with cru 2026-07-30 (same contract as nmea-parser 4.0.0)

cru's explicit requirement: **"not silent errors please, put there, like the garbage sentences"** —
tblive gets the same no-input-dropped model as nmea 4.0.0. The signal is the pre-existing optional
`errors: string[]`, so **the CMA contract still does not change**. But the *classification* rules had
to be derived from scratch, because **TB Live has NO checksum anywhere**: NMEA's key heuristics — "a
`$`-chunk is a sentence attempt only if it has a `*`" and "the checksum still matches, so the payload
is intact" — have no equivalent here. A framing anomaly on TB Live means the field alignment is
genuinely unverifiable. (cru's substitute for a checksum is **fake-sentence filtering in Tracker** —
e.g. an emitter ID that does not correspond to its frequency — not a parser concern.)

| input | result |
| --- | --- |
| `$…\r` with 9 / 8 / 7 fields, all decodable | CMA, no `errors` |
| a field fails its declared type | **full CMA** + `errors` at field and sentence level, that field `value: null` |
| `data` empty on an ID-only protocol | CMA, `value: null`, **no error** — documented behaviour, not a fault |
| `$…\r` with any other field count | **`id: 'unknown'`** + the CSV split kept as **generic string fields** + `Unknown field count: N` (cru: "yes, as nmea" — nmea's `genericField` behaviour; the data stays inspectable rather than `payload: []`) |
| `$…` followed by another `$`, no `\r` | **full CMA** + `Missing end flag` |
| another complete sentence sits **inside** a sentence's extent | **inner sentence emitted decoded; the wrecked outer fragments become GARBAGE** + an error naming the interference. Ordered by position in the buffer. |
| text matching no known token | **garbage**, adjacent junk coalesced into one report |
| pending `$…` / `SN=…` / api dump, no terminator yet | **pending** on the buffer — never an error, still streaming |
| pending chunk exceeds `bufferLimit` | **garbage** + `Buffer limit exceeded`, buffer reset |
| whitespace / `\r\n` between sentences | **ignored** — reporting it is the very noise this avoids |

**⚠️ The interference rule is cru's "salomonic decision", and the reasoning matters — do not
"improve" it into reconstruction.** Real interference is **NOT** a clean insertion of a well-formed
sentence; it arrives as **corrupted bits / weird characters**, so the true boundary of the wrecked
sentence is unknowable and the corner cases are **exponential**. The rule is therefore: **take the
sentence in the middle** (the interloper — it is the one that transmitted intact) and **do not attempt
to recompose the sentence it wrecked**. It happens in both directions: a pong landing inside a
sample/log (cru's old client-side "ping on timeout" made this common; he has since removed it) **and**
samples/logs landing inside a command-mode response. The old code discarded the wrecked sentence
**silently**; now it is reported as garbage.

**🔧 The 8-field ambiguity gets a structural discriminator, not a string sniff.** A 1.0.1 **log** has
8 fields and a 1.0.2 **detection** also has 8, so the count cannot decide. Today `sample.ts:15` tests
field 2 for the literal `'tbr sensor'`, which is fragile: the datasheets use **two spellings**
(`TBR Sensor` in 1.0.1 and in 1.0.2's capture dump, `Live Sensor` in 1.0.2's headline example), and a
miss silently misparses the log as a detection with every field shifted (measured: temperature 297 →
transmit protocol, peak noise 29 → **an angle of 2.9°**, frequency 69 → SNR).

**Rule (cru chose this, 2026-07-30): widen the match to a case-insensitive `sensor`** — covering
`TBR Sensor`, `Live Sensor` and any casing of either. A structural alternative was offered ("field 2
numeric ⇒ detection, non-numeric ⇒ log") and **cru preferred the name match**, which is the better
call for a reason worth recording: with a name match, an 8-field sentence whose field 2 is
**corrupted junk** stays a *detection* carrying a type error on `milliseconds` — honestly reporting
"not recognised as a log" — whereas the structural rule would sweep any non-numeric junk into
`receiver`.

### 🚧 IN PROGRESS — implementation started 2026-07-30 (uncommitted)

**Step 1 + 2 of 5 done, `tsc --noEmit` + `eslint` clean, behaviour verified by hand.** New files sit
**alongside** the legacy ones so the package keeps compiling through the transition; the legacy
`parse.ts` / `sample.ts` / `command.ts` / `listening.ts` / `utils.ts` / `types.ts` come out at the end.

- **`src/definitions.ts` — the typed sentence table.** Replaces ~2.2k lines of hand-written per-
  sentence functions with data: `PROTOCOL_NAME`, `FIRMWARES`, `MODES`, the 17 `SENTENCE_IDS`, the
  field specs (`SAMPLE_FIELDS` per id × firmware, built by composition — 1.0.1 is 1.0.2 **plus** the
  `sent` field), `SAMPLE_SHAPES` (field count → candidate shapes), the `TOKENS` recognition table and
  the error-string builders.
  - **⚠️ 17 ids, not the 16 in the table shown to cru** — that table accidentally omitted `listening`
    (`EX!`). Everything else in it stands.
  - **Four recognition strategies cover all 17 sentences:** `literal` (`EX!`, `RR!`, `ack01\r`,
    `LIVECM`), `delimited` (`$…\r`, `SN=…><>\r`, the help dump), `digits` (`FC=69`, `UT=…`, with
    min/max because serials are 6 **or** 7), `version` (`FV=1.0.2`, and `FV=v1.0.1` because the 1.0.1
    datasheet prints both forms).
  - `TokenSpec.id` is **optional**, because a `$…\r` chunk cannot be named by its token alone — it is
    `emitter` or `receiver`, decided later by field count. An earlier draft used `id: 'emitter'` as a
    placeholder, which made every log look like a detection in the token table; that footgun is gone.
- **`src/tokenizer.ts` — one scanner replacing the 16 `getBoundaries*` functions + ad-hoc
  reconciliation.** `scanBuffer(buffer) → { segments, remainder }`, where a segment is either a
  recognised sentence or a garbage run. Implements the three rules.
  - **🆕 A design refinement that fell out of writing it: rules 2 and 3 are OPPOSITES and need an
    explicit flag to tell apart.** "An enclosing sentence swallows its interior" (the `HE?` help dump,
    which prints the whole API as prose and therefore literally contains `FC=69`, `EX!`, `LIVECM`, …)
    and "a token inside another's extent is interference" (keep the inner, garbage the outer) are the
    same syntactic situation with opposite handling. Resolved with **`TokenSpec.opaque`**, set on
    `api` **only**. Without it the help dump would shred into ~10 bogus sentences.
- **Verified by hand on the datasheets' own examples:** both detection shapes and both log shapes
  segment; `SN=000745><>\r` resolves to `ping` while `SN=1000045` resolves to `serial_number`
  (longest-match-wins); nine command echoes back-to-back with **no terminators at all**
  (`FC=69LM=01LI=03UT=1589561768FV=1.0.2EX!RR!FS!UF!`) segment into nine correct sentences; the help
  dump comes out as **one** `api` sentence; junk coalesces into a single report; blank space between
  sentences is ignored; a truncated `$…` and a truncated `FC=6` are held as `remainder` with no error.
  **The interference case behaves exactly as cru specified:**
  `$1000042,1589557202,615,S64K,ack01\r1285,0,24,69,11\r` →
  garbage `$1000042,1589557202,615,S64K,` + `Interrupted by clock_round`, then a real `clock_round`,
  then garbage `1285,0,24,69,11\r`. Nothing recomposed, nothing dropped.
- **Plumbing:** `@coremarine/protocol-core` added as a **devDependency** (`workspace:*`) and
  `tsup.config.ts` given `noExternal` + `dts.resolve` + `platform: 'neutral'`, copying nmea-parser
  exactly — the core is private and unpublished, so it must be inlined into `dist` and must not appear
  in the packed manifest or the `.d.ts`.
- **`src/sentences.ts` — segments → `DraftCMA`.** Local `parseValue` (empty → `null` with **no**
  error, `NaN` → `null`, out-of-declared-type → `null`), `buildField`, `resolveSample` (field count,
  with the case-insensitive `sensor` tie-break at 8), `unknownSample` (generic string fields, id
  `unknown`), `buildResponse` (the single-element payload for every command/listening response) and
  `buildGarbage`.
- **`src/metadata.ts` — the aggregators.** Field-level metadata for `snr` (weak/regular/strong bands),
  `temperature` (`(raw-50)/10` °C), `listening_mode` (the `LM` table), `log_interval` (the label) and
  `time` (decoded date); plus the `metadata.payload` mirrors cru asked for. Aggregators read fields
  **by index**, never by name. **No interpretation of `data` anywhere** — that is the consumer's.
- **`src/parser.ts` — `TBLiveParser extends StringParser`.** `extractSentences` drives the tokenizer;
  **`bufferLimit` is now actually enforced**; `firmware` is learned (`FV=` explicitly, `LIVECM`/`TBRC`
  implicitly) with an optional constructor pin, and is `unknown` until proven rather than the old
  hardcoded `'1.0.2'`.
  - **🔑 NO `sentenceTimestamp` OVERRIDE — the device time is DATA, never a claim (cru, locked
    2026-07-30).** An earlier draft promoted it to `metadata.timestamp.sentence` when
    `seconds >= 1_000_000_000`; cru rejected the whole idea, threshold included: *"I don't trust on the
    device time because it is not well defined if it is the current timestamp or the uptime and I
    couldn't trust even in my teammates because they don't even record what are the devices with its
    firmware."* `metadata.timestamp.sentence` **asserts** when a sentence happened, and this device
    cannot support that claim — the datasheets disagree about the unset-clock behaviour and nothing on
    the wire says which firmware is answering. Asserting it is exactly how the old parser reported
    **1970-01-01** as a real date. So `metadata.timestamp` is `{ received, parsed }` only, and the
    device's numbers are published as **`metadata.payload.time`** =
    `{ seconds, milliseconds?, total_milliseconds }`. **No ISO date** — that is what made a meaningless
    value look authoritative. `total_milliseconds` is pure arithmetic, offered because composing it is
    easy to get wrong (the old parser CONCATENATED the digits). Deciding whether it is epoch or uptime
    needs deployment knowledge and belongs to Tracker. **Same stance as norsub-emru**, whose `T1`/`T2`
    are a wrapping counter and likewise never become a sentence timestamp.
  - **Empty fields (cru, locked 2026-07-30): ALL empty fields are `null`, with NO error** — not just
    `data`. And **an absent `milliseconds` composes as `000`** in `metadata.payload.time`. The
    substitution stays visible: `payload[2].value` remains `null`, so a consumer can distinguish a
    device that sent nothing from one that sent a genuine zero. Verified: empty ms →
    `{ seconds: 1589557202, total_milliseconds: 1589557202000, milliseconds: 0 }` with
    `payload[2].value === null`.
- **✅ ALL SIX BUGS VERIFIED FIXED, measured on the datasheets' own examples:**
  1. `bufferLimit` — `{ bufferLimit: 10 }` + 5000 chars → one garbage CMA with `Buffer limit
     exceeded`, buffer reset to 0. (Was: buffer grew to 5000, silently.)
  2. nothing dropped — `'hello world'` → a garbage CMA with `Unrecognised input`. (Was: `[]`, and it
     sat on the buffer forever.)
  3. timestamp — `,50,` → `sentence: 1589557202050`. (Was: `155457933050`, i.e. **1974**.)
  4. **the serious one** — `data` empty on an `R64K` detection → **`value: null`, no angle metadata,
     no error**. (Was: `value: 0` publishing `average: 0.0°` — a fabricated vertical mooring line.)
  5. `Live Sensor` → **`id: 'receiver'`**, temperature 297 → 24.7 °C, noise 15/29, all fields aligned.
     (Was: `id: 'emitter'` with peak noise 29 decoded as **an angle of 2.9°**.)
  6. `NaN` — gone; a non-numeric numeric field is `null` **plus** an `Invalid <field>: <raw>` error.
  - Plus: serial padding preserved (`'001129'` stays `'001129'`, was `1129`); firmware learning
    `unknown → 1.0.1` on `LIVECM` → `1.0.2` on `FV=v1.0.2`; interference splits into
    garbage/`clock_round`/garbage exactly as specified.
- **`tsc --noEmit` + `eslint` clean on all five new files. The legacy suite still passes 134/134**,
  because the old `TBLive` class is untouched and still the only thing `index.ts` exports.
- **✅ STEP 5 DONE — THE LIBRARY REFACTOR IS COMPLETE (uncommitted, cru to review).**
  - **`index.ts` now exports `TBLiveParser`.** The legacy implementation is **deleted**:
    `parse.ts`, `sample.ts`, `command.ts`, `listening.ts`, `utils.ts`, the old `types.ts` and
    `schemas.ts`, plus all 7 legacy test files. `constants.ts` was pruned to the two protocol
    knowledge tables that survive (`PROTOCOLS` for `LM=`, `LOG_INTERVALS` for `LI=`); every other
    literal now lives in the sentence table. **~2.2k lines of hand-written parsing replaced by ~800
    lines of table + tokenizer + builders.**
  - **Tests: 83 specs, `tests/index.test.ts`, all green.** Anchored to the **datasheets' own example
    sentences**, not to whatever the implementation happens to do. Includes a **CMA conformance test
    that validates every emitted sentence against core's `CMASchema`**, a check that every id emitted
    is a declared id, and explicit coverage of each locked decision: the 8-field tie-break in five
    variants, `data` never interpreted, `metadata.timestamp` never carrying `sentence`, the `000`
    millisecond substitution, `id`/`mode` being deliberate opposites for `LIVECM`/`EX!`, firmware
    learning from all three evidence sources, out-of-range `FC=99` accepted without error, and every
    row of the feedback table.
  - **Plumbing:** `2.0.0`, `engines.node >=22`, `build` gained the `format` prestep the other packages
    have, `cma` keyword added. **`valibot` moved from `peerDependencies` to `dependencies`** — the
    bundled core needs it at runtime, and nmea-parser already declares it that way; as a peer it would
    have forced consumers to install it themselves.
  - **🔍 CI/CD AUDITED against the proven `nmea-parser.yml` (cru asked, 2026-07-30) — two MORE gaps
    found and closed.** Structurally the two workflows are now identical apart from nmea's extra
    `scripts/**` trigger, which tblive correctly omits (it has no YAML generation step).
    1. **🐛 Nothing triggered on `packages/core/**`.** tblive **bundles** the private
       `@coremarine/protocol-core` into its dist (tsup `noExternal`), so a core change alters what this
       package publishes and can break its tests — yet no tblive job would have run. Added to the path
       filter; the version gate keeps the extra trigger harmless (tests run, publish no-ops unless the
       version changed). **⚠️ `nmea-parser`, `norsub-emru` and both wrappers have the SAME gap** — folded
       into the parked cross-parser work.
    2. **🐛 The coverage thresholds were inert in CI.** They only apply when coverage is collected, and
       the test job ran plain `vitest`. The job now runs `thelmabiotel-tblive:test:coverage`. **Proved it
       actually gates rather than just printing:** with `branches` temporarily raised to 99 the run exits
       **1** (`ERROR: Coverage for branches (96.16%) does not meet global threshold (99%)`), and **0** at
       the real threshold.
  - **Verified end to end from a clean state** (`packages/core/dist` and the package's own `dist`
    deleted, `CI=true`): core build → **259/259 with coverage thresholds enforced** → build clean.
    `vitest` without `--run` exits by itself under `CI=true` (exit 0), matching how every other package
    in this repo is wired. **The version gate will fire:** npm has `1.0.3` as latest and no `2.0.0`.
    **Packed tarball = 7 files / 34.4 kB:** LICENSE, README, `dist/{index.js,index.cjs,index.d.ts,index.d.cts}`,
    `package.json` — and zero `protocol-core` references inside.
  - **🐛 CI fresh-checkout bug found and fixed — the same one norsub had.** `.github/workflows/
    thelmabiotel-tblive.yml` never built `protocol-core`, which tblive now depends on and which
    resolves through its `dist/`. **Verified empirically**: with `packages/core/dist` deleted,
    `thelmabiotel-tblive:test` fails. `pnpm run protocol-core:build` prepended to **both** the test and
    publish jobs, then the exact CI order replayed from a deleted-dist state → core build → **83/83** →
    build clean.
  - **README rewritten from scratch** on the 2.0.0 API, with a real parsed CMA sample, the 17-sentence
    table, the metadata levels, an explicit **"Things this parser deliberately does not do"** section
    (no `data` decode, no plausibility judgement, no time claim), the feedback table, the interference
    worked example, and an **"Upgrading from 1.x"** listing every breaking change — leading with the
    two that can silently corrupt a consumer: **`null` must never be read as zero**, and **the
    inclination decode is gone, so Tracker must implement the bit split**.
  - **📈 COVERAGE PUSH (cru asked, 2026-07-30): 83 → 147 specs, branches 82.3% → 97.9%, statements /
    lines / functions all 100%.** Every file is far past cru's "80% minimum, 90% ideal". Two new
    files: `tests/edge-cases.test.ts` (the awkward inputs) and `tests/internals.test.ts` (guarantees
    for whoever extends the sentence table). **Thresholds now enforced in `vitest.config.ts`**
    (statements/lines/functions 95, branches 90) so it cannot quietly regress; `definitions.ts` and
    `index.ts` joined `constants.ts` in the coverage excludes as pure data / re-exports.
    - **🐛 A REAL DATA-LOSS BUG the coverage work found, in code written the same day.** A sentence
      split **inside its own start flag** was emitted as garbage **and consumed**, destroying it:
      `parseData('SN')` then `parseData('=1000045')` lost the response entirely. `matchLiteral`
      returned `PENDING` for a truncated start, but `matchDelimited` / `matchDigits` / `matchVersion`
      returned `NONE`. **This is not an edge case for this device** — `receiver-1.0.1.pdf` §8.2 states
      a firm **one character per millisecond** limit in listening mode, so split start flags are the
      normal case. Fixed with one shared `startsHere()` helper used by all four matchers. Regression
      tests: four sentences split inside their flags, plus a full stream
      (`$…\r` + `ack01\r` + `FC=69`) fed **one character at a time**, which now decodes to exactly
      three clean sentences.
    - **Dead code removed rather than tested:** `attach()` in `metadata.ts` re-checked
      `field.value === null`, which every caller had already established — provably unreachable.
    - New coverage came from real cases, not padding: empty receiver/emitter serials falling back to
      `unknown`; missing temperature / noise / snr producing **no** metadata rather than a substitute;
      **a value beyond its declared type** (`frequency` 999 in a `uint8`, `UT=9999999999` beyond
      `uint32`) reported as `null` + an error — which is the executable proof that the declared type is
      the range check; `LI=99` and `FV=9.9.9` not guessed and not poisoning the learned firmware;
      unknown field counts of 1, 3 and 10; malformed-vs-pending tokens (`FC=6X` is junk, `SN=12` is
      still arriving); **nested interference** (`$a$b$…` → the wreckage coalesced into ONE report, then
      the good sentence); and 11 degenerate inputs asserted to never throw and to always emit valid CMA.
  - **🆕 TWO NEW APIs (cru asked, 2026-07-30) — `getFakeSentence` + `getSentenceDefinition`, both
    returning `Result`. 252 specs.** `src/fake.ts` and `src/introspect.ts`. The cross-parser fallout is
    parked in §"PARKED — cross-parser API alignment".
    - **`getFakeSentence(id, protocol, options?)` → `Result<string, string[]>`.** `protocol` is a
      **mandatory positional** argument (cru's shape), because the firmware genuinely changes the
      output; `options` is optional and **narrowed by id** through a mapped `FakeOptions` lookup, so
      `getFakeSentence('frequency', …, { snr: 5 })` is a compile error as well as a runtime one.
    - **🔑 DETERMINISTIC, no randomness (cru's idea, and it is better than nmea's).** A pure function of
      its arguments, so a fixture cannot drift between runs — and the defaults are the **datasheets' own
      example sentences**, so `getFakeSentence('emitter', '1.0.1')` returns
      `$1000042,1589557202,615,S64K,1285,0,24,69,11\r`, checkable by eye against `receiver-1.0.1.pdf`
      §8.2.1. nmea generates random values per field type; that difference joins the parked alignment.
    - **The round trip is the acceptance test:** for **all 17 ids × both firmwares**, feeding the
      generated string back through `parseData` yields exactly one CMA with the right `id`, the right
      `protocol.version`, and **no `errors`**. That exercises the table, tokenizer, builders and
      aggregators against each other in one assertion.
    - **Generation is constrained by the parser's own rules**, which is easy to get wrong: the fake log
      identifier must contain `sensor` or an 8-field log resolves as a *detection*; a fake ping serial
      must be 6-7 digits or the token does not match; and the `LM=`/`LI=` defaults must exist in their
      tables or the fixture carries no metadata. All three are asserted.
    - **Errors name the actual mistake** — `Unknown sentence id`, `Unknown protocol`, `Unknown option
      'x' for 'y'`, `Invalid option 'x'`, and `Option 'sent' applies to protocol 1.0.1 only` (that last
      one because `sent` exists in 1.0.1 sentences only, so asking for it on 1.0.2 is reported rather
      than ignored). Several mistakes are reported together.
    - **`getSentenceDefinition(id, protocol?)` → `Result<SentenceDefinition[], string[]>`.**
      **🔑 CMA-SHAPED, cru's call 2026-07-30: `{ id, protocol, payload, mode }` and nothing else.** The
      same keys a parsed sentence has, minus the ones only a real parse can fill (`raw`, `timestamp`,
      `metadata`, `errors`), with `payload` holding field DEFINITIONS
      (`name`/`type`/`units?`/`description?`) instead of decoded values. `mode` sits at the top level
      because a definition has no `metadata` to nest it in, and it is the one key nmea/norsub will not
      need — they have a single API surface.
      - **✅ This CONVERGES tblive with nmea for free, which shrinks the parked alignment work.**
        nmea's `StoredSentence` is already `{ id, protocol: { name, standard?, version? }, payload:
        ProtocolField[], description? }`, and its `ProtocolField` is
        `{ name, type, units?, description? }` — **byte-identical to tblive's `FieldSpec`**. So the
        nmea side needs **no shape change**: only the rename to `getSentenceDefinition` and the move to
        `Result`.
      - **Always an array**, even for one match, so callers need one code path; omitting `protocol`
        returns every version (`emitter` → 1.0.1 with a 9-field payload, 1.0.2 with 8). `payload` is
        **copied**, so a caller cannot corrupt the parser's tables — asserted. A test checks the
        description against a **real parse**, because a definition is only worth having if it is true.
      - **✅ RESOLVED — `description` at BOTH levels carries what the dropped `wire`/`firmwareSpecific`
        objects did, as prose (cru, 2026-07-30).** An earlier draft returned structured `wire`
        (`kind`/`start`/`end`/digit bounds) and `firmwareSpecific`; both were dropped to keep the shape
        CMA-clean, which lost the single least-guessable fact about a **frameless** protocol. cru's fix:
        an **optional `description` at sentence level** (CMA already allows it at both levels)
        **wrapping that information as a string**. Generated as
        `<authored prose> + <how it is recognised> + <what the other firmware does>`:
        - `command @ 1.0.1` → *"…Recognised as the fixed literal `LIVECM`. Firmware 1.0.1 only; firmware
          1.0.2 uses a different form for this sentence."* — so the two entries are no longer
          indistinguishable.
        - `frequency` → *"…Recognised by `FC=` followed by exactly 2 digits. Identical on both documented
          firmwares."* — which also answers the "does the firmware matter here?" question that
          `firmwareSpecific` used to.
        - `emitter @ 1.0.2` → *"…Identified by its 8 fields: firmware 1.0.1 sends 9."*
        - Control characters are **named** (`<CR>`, `<LF>`), never embedded raw — asserted.
        - Descriptions now also carry the datasheets' operational warnings: `reset` **DELETES** all
          stored detections, `upgrade` can **brick** the device, `milliseconds` is not always zero-padded.
        - **Every sentence on every firmware, and every payload field, is asserted to have a
          description** — the field-level assertion immediately caught `milliseconds` having none.
        - Dead code removed rather than tested: `describe()` can never return `undefined` (the wire prose
          alone is never empty), so the optional-assignment guards went.
      - **✅ DECIDED — ONE ENTRY PER FIRMWARE, even when the definition is identical (cru: "keep",
        2026-07-30).** 15 of the 17 ids do not vary by firmware, so omitting `protocol` returns two
        entries differing only in `protocol.version`. The duplication is deliberate: every entry stays
        self-describing, callers need one code path, and each description now ends with *"Identical on
        both documented firmwares"* so the repetition explains itself. **A test asserts it for every
        id — do not collapse it.**
    - Also added `parser.sentenceIds`, and a test that every advertised id is both fakeable and
      describable.
  - **Verified, per package from its own directory:** `eslint .` clean · `tsc --noEmit` clean ·
    **83/83** · `tsup` ESM+CJS+DTS clean. Repo-wide `pnpm lint` clean, `pnpm install
    --frozen-lockfile` clean. **Packed tarball: 7 files, 19.5 kB, `2.0.0`, and ZERO `protocol-core`
    references in `dist/index.js` or `dist/index.d.ts`** (grep count 0 in both) — the private core is
    inlined, as required.
- **❓ OPEN QUESTION FOR cru:** an empty field currently yields `null` with **no error** for *every*
  field, but the docs only license `data` to be empty. An empty `milliseconds` is therefore silently
  `null`. Should a non-`data` empty field carry an error? (It is arguably structural, not a
  plausibility judgement — the transmit-protocol table says which protocols carry data.)
- **NEXT:** (5) the test suite + README; wire `index.ts` to `TBLiveParser`; delete
  `parse.ts`/`sample.ts`/`command.ts`/`listening.ts`/`utils.ts` + the legacy `types.ts`; bump to
  `2.0.0`, `engines.node >=22`; drop the stray `tango.json` and the committed `coverage/`. Then the
  wrapper (full rebuild from the `nmea-parser-nodered` template).

## 🚧 thelmabiotel-tblive-nodered — REBUILT 2026-07-30 (uncommitted; cru is reviewing the examples)

Full rebuild from the `nmea-parser-nodered` / `norsub-emru-nodered` template. **42 tests green** (34
unit + 8 real-headless-node-red), lint + tsc clean, CI order replayed from a deleted-dist state.
**NOT committed: cru wants to check the example flow first.**

- **Node type deliberately UNCHANGED — `cma-thelmabiotel-tblive`.** The other two wrappers use
  `cma-<device>-parser`, but renaming this one would make the node **vanish from every deployed
  flow**, which is not a trade worth making for naming symmetry on hardware that sits on an FPSO for
  years. Recorded in `parser.ts` so nobody "fixes" it later. Flag if cru wants the rename.
- **`src/lib.ts` — the msg API, refactored onto the new parser** (zero node-red imports, so it unit-
  tests against a real `TBLiveParser`): `applyMemory`, **`applyFirmware`**, **`getIds`**,
  **`getDefinition`**, **`getFakeSentence`**, `parsePayload`, `cleanUndefined`. Every handler turns a
  failed `Result` into the error **string** node-red shows the user, so nothing throws and no `null`
  escapes.
  - **`msg.firmware`** replaces norsub's `msg.protocol` as the device selector, because for TB Live
    the firmware *is* the protocol version. **Unlike norsub's protocol switch it does NOT discard the
    buffer** — the firmware changes how a sentence is read, not how the stream is framed. Asserted.
  - **`msg.definition`** (not `msg.sentence` as in the older wrappers) and **no `msg.sentences`
    get/set channel**: TB Live's definitions are compiled in, so a `set` would be half-dead. Accepts a
    bare id or `{ id, protocol? }`.
  - **`msg.ids`** is new — the discovery counterpart to `definition`, so a flow can enumerate what to
    ask about. Together they are the remote-diagnosis story from a flow.
  - **`msg.fake`** must be an OBJECT (`{ id, protocol, options? }`), where norsub's was a bare string,
    because `protocol` is mandatory for generation.
- **`src/parser.ts`** thin RED adapter; **`src/parser.html`** config dialog (a **Firmware** select
  defaulting to "Learn from the stream", plus Memory) with help markdown rewritten for the new msg
  API, the `null`-is-not-zero warning, the interference behaviour and an "Upgrading from 1.x" section.
- **package.json — every item cru listed is done:** version `1.0.0` → **`2.0.0`**, `engines.node`
  `>=18.0.0` → **`>=22`**, `node-red.version` `>=3.0.0` → **`>=4.0.0`**, `main` fixed (it pointed at a
  non-existent `index.js`) → `dist/parser.js`, `files` gained the **`!**/*.backup`** and
  **`!**/*_cred.json`** exclusions, and **the dependency problem is fixed: the stray
  `peerDependencies: { valibot }` is GONE** — valibot is the library's own runtime dependency, and as a
  peer here it would have forced consumers to install it themselves.
- **Legacy dropped:** `Dockerfile`, `docker-compose.yml`, `manual_tests.sh`, `src/parser.js`, and the
  whole `tests/nodered/` tree — which held committed node-red runtime state **including
  `flows_cred.json`**, the exact artefact class behind both earlier packing leaks. Root scripts lost
  `:nodered:docker` and gained `:nodered:lint|build|dev|examples`.
- **Example flow rebuilt: 56 nodes, 9 groups, ONLY built-in node types** (inject / function / debug /
  catch), so it imports with no contrib nodes. Every payload is a datasheet example. Groups: listening
  data · the empty-`data` case · failed and garbage sentences · memory and split sentences · firmware
  learning vs pinning · command-mode responses · diagnostics · fake sentences · parser and output. A
  `function` node splits output three ways — **CLEAN / FLAGGED / RESPONSES** — which is how the flow
  teaches that `errors` must be checked.
  - **Validated by BOOTING real node-red against the shipped file:** all 46 nodes instantiate, **zero
    unknown types**. Then every demo was **driven through that runtime** with the debugs swapped for
    sinks, and **two flaws in the flow I authored were found and fixed**:
    1. `'serial number + ping'` concatenated two `SN=` sentences — but the ping is the *longer match at
       the same offset*, so it demonstrated **interference**, not what its label claimed. Split into two
       honest injects, and the ambiguous pair kept as its own garbage-group example.
    2. The memory group's title now spells out the click order (`fire ON, then 1/2, then 2/2`), because
       firing them out of order shows a *correct* failure that reads like a broken example.
- **CI: test job RE-ENABLED** (it had been commented out with `needs: test` disabled, so the old
  wrapper could publish untested). Matrix 22.x + 24.x, dep chain `protocol-core → thelmabiotel-tblive`
  then the wrapper build, then `node:test`. **Also triggers on `packages/thelmabiotel-tblive/**` and
  `packages/core/**`** — the wrapper's tests run against the real library, which bundles the private
  core, so a change to either could break this package with no job running.
- **Verified:** `pnpm pack` resolves `workspace:^` → **`^2.0.0`** (npm's own `pack` leaves it literal —
  CI publishes with pnpm, so pnpm is what matters); tarball = **8 files / 41.4 kB**
  (`dist/{parser.js,parser.html,icons/}` + `examples/` + README + LICENSE + manifest); **no
  `peerDependencies`**; and the `files` exclusions were re-proved by creating a `_cred.json` and a
  `.backup` next to the example flow and re-packing — **neither leaked**.
- **⚠️ PUBLISH ORDERING:** the packed dep is `^2.0.0` and the library's **2.0.0 is not on npm yet**
  (latest is `1.0.3`). Both publish on the same `dev` → `main` merge and their workflows run in
  parallel, so the wrapper may briefly be on npm before the library it needs. Same constraint as the
  earlier releases — worth watching the two runs on merge.

## 🔗 VERSION POLICY — a library and its wrapper SHARE A MAJOR (locked with cru 2026-07-30)

`<library>@N.x` is always wrapped by `<library>-nodered@N.x`. Read the generation off the major.

| library | version | wrapper | version |
| --- | --- | --- | --- |
| `nmea-parser` | **5.0.0** | `nmea-parser-nodered` | **5.0.0** |
| `norsub-emru` | **5.0.0** | `norsub-emru-nodered` | **5.0.0** |
| `thelmabiotel-tblive` | **2.0.0** | `thelmabiotel-tblive-nodered` | **2.0.0** |

**MAJORS only, not major.minor** — cru accepted the reasoning:
- A library major is **inherently** breaking for its wrapper (the wrapper's whole job is emitting the
  library's output), so the wrapper must go major anyway. Coupling costs nothing; it only stops drift.
- A library **minor** is additive and often needs no wrapper change. This repo already hit that at
  `nmea-parser@3.2.0`, where STATUS recorded *"the wrapper needs NO change and NO bump… bumping it
  would publish an identical package."* Locking minors would force exactly that.
- It breaks the other way too: the tblive wrapper's own new features (`msg.ids`, `msg.definition`, the
  firmware selector) are a wrapper minor that must not drag the library into a pointless release.

**cru accepted the version jumps** (both wrappers 3.0.0 → 5.0.0): *"even if it is a huge jump into the
npm history version (sorry not to sorry)"*.

**🔑 THE MECHANISM, and a correction cru asked about.** He wondered whether to pin the dependency to
`latest`. **`latest` would break the very thing it is meant to guarantee** — a wrapper at 5.x would
happily install a library at 6.x. What already enforces it is **`workspace:^`**, which pnpm packs as
`^<library version>`: resolving inside that major and never the next. Verified in the packed
manifests: `nmea-parser-nodered@5.0.0` → `^5.0.0`, `norsub-emru-nodered@5.0.0` → `^5.0.0`,
`thelmabiotel-tblive-nodered@2.0.0` → `^2.0.0`. (Note `npm pack` leaves `workspace:^` literal — only
**pnpm** rewrites it, and CI publishes with pnpm.)

**🛡️ GUARDED, not just intended.** Each wrapper now has `tests/version.unit.test.ts` asserting that
its major equals the library's, that the dependency is declared `workspace:^`, and that the library is
the one it claims to wrap. **Proved it catches drift:** bumping `nmea-parser` to 6.0.0 alone fails with
`wrapper 5.0.0 and library 6.0.0 must share a major`.

## 🅿️ PARKED — cross-parser API alignment owed to nmea-parser + norsub-emru (+ both wrappers)

**✅ DONE 2026-07-30 — all four packages refactored, released as `nmea-parser@5.0.0`,
`norsub-emru@5.0.0` and both wrappers at `5.0.0`.** Kept below for the reasoning. What shipped:

- **`getSentence(id)` → `getSentenceDefinition(id)` returning `Result<Sentence[], NMEAError>`.** An
  **array**, because the knowledge base holds one definition **per version** of an id and the old call
  silently returned only the newest — an earlier revision could not be inspected at all. A test proves
  it earns the array: adding a second revision of `AAM` returns both `3.1` and `4.0`.
- **`getFakeSentenceByID(id)` → `getFakeSentence(id)` returning `Result<NMEALike, NMEAError>`.**
- **`NMEAError.kind` gained `'invalid-id'` and `'unknown-id'`**, so a malformed id and an unknown one
  are distinguishable — the thing `null` could never express.
- **A shared private `lookup()`** now does the talker-aware resolution both methods needed, instead of
  each duplicating it.
- **Both wrappers: `getSentenceInfo` → `getDefinition`, and the msg key `msg.sentence` →
  `msg.definition`.** `sentence` read like "give me a sentence" while returning a *definition*, one
  word from `msg.fake` which does give you a sentence — the same footgun class as
  `msg.protocols`/`msg.sentences`. Unknown ids now surface the library's error **message** instead of
  a bare `null`.
- **Both example flows updated and re-verified** — injects, labels and debug targets renamed, then
  **driven through real headless node-red** to confirm the new shapes actually arrive: definitions come
  back as arrays with the talker reported, and unknown ids as readable error strings.
- **The `packages/core/**` CI trigger gap is closed in all six workflows**, plus each dependent now
  also triggers on its upstream library. That gap meant a core change could break a package with no
  job running.
- **`null` audit:** these two were the only `null`-returning public APIs in either library. The
  remaining `null` returns are internal helpers (`getTalker`, `decimalDegrees`, `getStatus`, …) where
  `null` means "no value" rather than "failure", so they stay.

Original reasoning follows.

**Why it matters (cru's reason, worth keeping):** these parsers get deployed on a **remote FPSO with
restricted internet access and live there for decades**. A parser that can describe its own sentence
definitions on demand is a diagnostic tool you cannot otherwise get out there. That is what makes the
definition lookup worth keeping rather than dropping.

| API | today | agreed target |
| --- | --- | --- |
| fake sentence | `getFakeSentenceByID(id)` → `NMEALike \| null` | **`getFakeSentence(...)` → `Result`** |
| definition lookup | `getSentence(id)` → `Sentence \| null` | **`getSentenceDefinition(...)` → `Result`** |

- **`getFakeSentence`** — nmea/norsub take **just the id**; tblive takes **`(id, protocol, options?)`**
  (protocol mandatory and positional, options optional and per-id, so tblive's error can name a bad
  *option* rather than only a bad id).
- **`getSentenceDefinition`** — nmea/norsub take **just the id** and return an **array**, because
  several sentences can share an id across protocol versions; tblive takes **`(id, protocol?)`** and
  returns every protocol version of that sentence when the protocol is omitted.
- **`null` is banned from both.** cru: *"I don't want exceptions… I would prefer at least a feedback if
  the input is wrong."* A `null` cannot distinguish an unknown id from a malformed option, which is the
  same silent-failure problem the CMA `errors[]` work removed. **Also audit nmea and norsub for any
  OTHER `null` returns** — cru explicitly asked whether they exist elsewhere; `getSentence` and
  `getFakeSentenceByID` are the two found so far.
- **`getSentence` → `getSentenceDefinition` is a naming fix, not just a rename.** `getSentence` reads
  like "give me a sentence", which is exactly what `getFakeSentence` does — two names one word apart
  meaning opposite things. This is the footgun class that forced `msg.protocols` → `msg.sentences`.
- **Wrapper fallout:** both `-nodered` wrappers expose the definition lookup as `getSentenceInfo`
  (`lib.ts`), so they need the rename too, plus a major each.
- **🐛 ALSO PARKED — a CI gap the tblive audit exposed in the other packages.** `nmea-parser`,
  `norsub-emru` and both wrappers **bundle** the private `protocol-core` into their dists but do **not**
  trigger on `packages/core/**`, so a core change can break them silently until someone touches those
  packages. tblive's workflow now has the trigger; copy it across. Their coverage thresholds (where they
  exist) are likely inert in CI too, for the same reason tblive's were: the test job runs plain `vitest`,
  which does not collect coverage.
- **cru's standing preference driving all of this: explicit names, always.**

### The real internal problem, named

**This protocol has no framing.** Only *some* listening sentences self-delimit (`…\r` for
samples/logs, `><>\r` for the ping, `ack01\r`/`ack02\r`); **command-mode traffic has neither a start
flag nor a terminator** — `FC=69`, `LM=01`, `EX!`, `LIVECM` are bare tokens. So segmentation can only
be done by **matching every known token at every offset**, which is exactly why `parse.ts` is 16
`getBoundaries*` scanners plus hand-written collision reconciliation. The code is not sloppy; the
protocol is. Its ad-hoc rules are really three general ones:

- **(a) longest match wins at the same offset** — `SN=` starts both a ping and a serial-number
  response; special-cased today at `parse.ts:261-268`.
- **(b) an enclosing sentence swallows its interior** — the `HE?` help text literally contains every
  other token; special-cased today with a hardcoded list at `parse.ts:270-298`.
- **(c) half-duplex interleaving** — cru's field observation: send a ping while the device is mid-
  sample and the pong is **injected inside** the sample, corrupting it. Modelled today as
  `interference`, and the corrupted sample is **silently discarded** (`getBoundariesSample` returns
  `incomplete`). Under the 4.0.0 "nothing is dropped silently" rule this **must** instead be emitted
  with the interference reported — which is also a safety win, because today a corrupted mooring-line
  sample simply vanishes.

**Firmware is guessable far better than it is guessed.** Real evidence exists: an explicit `FV=`
sentence; `LIVECM` vs `TBRC` (a definitive 1.0.1/1.0.2 discriminator); and field counts 9/8 for
detections, 8/7 for logs. Everything else has **no** evidence and is currently hardcoded `'1.0.2'`.
A parser that **learns and remembers** the firmware (constructor override, `unknown` until proven)
would be both more accurate and honest. cru's constraint stands: nobody on the team can guarantee
which firmware production units actually run.

**The wrapper `thelmabiotel-tblive-nodered@1.0.0` is the least-evolved of the five.** Plain
`src/parser.js` (no TS, no build, ships `src/` not `dist/`), `main: index.js` which does not exist,
`node-red.version >=3.0.0`, `engines.node >=18.0.0`, `test` = `mocha "tests/**/*.test.js"` with
**zero `.test.js` files**, CI test job commented out, a docker mirror duplicating `src/` under
`tests/nodered/components/`, and **committed node-red runtime state including
`tests/nodered/data/flows_cred.json`** — the exact artefact class behind both packing leaks.
Full rebuild from the `nmea-parser-nodered` template, same as norsub's.

## Where we are now

**HEAD `ee08691` (+ this docs commit), branch `dev`, working tree clean (2026-07-13).** Steps 1-6
complete. Modern stack: pnpm 11.15.1, TypeScript 6.0.3 (TS7 deferred), ESLint 10.7 + sonar +
perfectionist, Vitest 4, Valibot 1.4.2, zero known vulns on `dev` (the 74 dependabot alerts are on
`main`, clear on merge).

**CMA rollout in progress.** `packages/core/` (shared contract) done. **nmea-parser is the finished
reference implementation** — CMA output + 3-level metadata + Result pattern + STEP 3 timestamp
metadata. Core = 14/14, nmea = 65/65, both build clean.

**RELEASE PREP FOR nmea-parser 3.0.0 IS DONE** (see the top Done entry, 4 commits A→B→D→C): every
package's CI/CD is on **npm OIDC Trusted Publishing** with a **publish-if-version-changed gate**,
node LTS `[22.x,24.x]`, `checkout@v7`/`setup-node@v6`/`action-setup@v6`; `build` regenerates
protocols; `repository.directory` everywhere; nmea-parser is `3.0.0` with protocol-core moved to
devDeps + types inlined into the published `.d.ts`. **cru has configured Trusted Publishers on npmjs
for ALL packages.**

**NEXT — the release is PHASED (locked with cru 2026-07-22); do them strictly in order, each fully
in production before the next:**

- ~~**Phase 1 — publish nmea-parser 3.0.x**~~ — ✅ **DONE 2026-07-24: `@coremarine/nmea-parser@3.0.2`
  live on npm** (PR #70). (History: the 2026-07-22 first attempt died at `Setup pnpm` on the broken
  pnpm `11.12.0` → fixed by bumping `packageManager` to `pnpm@11.15.1`; then 3.0.0 published, later
  patched to 3.0.1→3.0.2 for the engines fix + README.)
- ~~**Phase 2 — nmea-parser-nodered wrapper**~~ — ✅ **DONE 2026-07-24: `@coremarine/nmea-parser-nodered@2.0.1`
  live on npm** (PR #70). TS rewrite onto `addSentences`/CMA, `node:test`, OIDC publish, dev-server +
  palette + engines all settled (see the top Done entries + banner).
- ~~**Phase 3 — norsub-emru (lib) then its wrapper**~~ — ✅ **DONE 2026-07-29, both live on npm:**
  `@coremarine/norsub-emru@3.0.0` (PR [#72](https://github.com/core-marine-dev/devices/pull/72), which also
  published `nmea-parser@3.2.0`) and `@coremarine/norsub-emru-nodered@2.0.0` (PR
  [#73](https://github.com/core-marine-dev/devices/pull/73)). See the top banner + the two 2026-07-29 Done
  entries.
- **NEXT (cru, 2026-07-29) — the `nmea-parser` work**, in whatever order he chooses: the changes he has not
  yet specified, the **failed-sentences fix** (§"Failed sentences" — scope it with him first), and the queued
  **`msg.protocols` → `msg.sentences`** rename in `nmea-parser-nodered`. **Then** thelmabiotel-tblive
  (+ wrapper), **then** the binary parsers septentrio-sbf & sbg-ecom (+ wrappers).
  **The paste-ready prompt for all of this is at the very END of this doc.**

### Prompt for the next agent — HISTORICAL (Phase 1/2 era, kept for context only)

> ⚠️ **SUPERSEDED — do not follow.** Phases 1 and 2 are shipped. The live prompt is the
> **"Phase 3 coding prompt"** at the very end of this doc.

> Continue the CoreMarine **devices** monorepo refactor (branch `dev`, HEAD is a `docs(status)`
> commit — run `git log --oneline -10` first). Read **`docs/STATUS.md`** top-to-bottom (esp. the top
> Done entries + Decisions). cru works **one step at a time and wants decisions converged BEFORE
> acting**; verify per package from the package dir (lint → tsc → test → build); update
> `docs/STATUS.md` **same-turn**. **Repo rule: for any npm / pnpm / GitHub-Actions / TypeScript /
> library specifics, fetch current docs with the `ctx7` CLI — do not rely on memory.**
>
> **The release is PHASED (locked 2026-07-22). Do the phases strictly in order — each must be fully
> in production before starting the next.**
>
> **PHASE 1 (current) — publish nmea-parser 3.0.0 & verify a fresh install.** nmea-parser is a
> FINISHED reference implementation and its 3.0.0 release + repo-wide OIDC/version-gated CI/CD are
> DONE and committed on `dev` — **do NOT redo any of it.** CI/CD was re-audited 2026-07-22: every
> package's publish job is correctly gated on `on main` AND `version-differs`, so **only nmea-parser
> 3.0.0 publishes** on the merge (norsub-emru + sbg-ecom test-red is expected mid-refactor and blocks
> nothing). **This step is cru's own: open PR `dev` → `main` and merge** (PR message already drafted —
> see the 2026-07-22 Done entry / ask cru). If you're driving, watch the `nmea-parser` publish job
> succeed (OIDC + provenance), confirm `@coremarine/nmea-parser@3.0.0` is on npm, then **smoke-test a
> fresh install**: in a clean dir `npm i @coremarine/nmea-parser@3.0.0`, import both ESM + CJS, confirm
> types resolve and there is **no** `@coremarine/protocol-core` runtime dep.
>
> **PHASE 2 (ONLY when cru says go, after 3.0.0 is live) — nmea-parser-nodered wrapper.** Bump its
> dep `@coremarine/nmea-parser` → `^3.0.0` (pnpm rewrites `workspace:^` on publish). Its workflow is
> already on OIDC + the version gate, but its **test job is still commented out** and its
> `src/parser.js` calls the **removed old API** (`parser.addProtocols({...})`) — rewrite it to
> `addSentences(yaml)` + CMA output, re-enable the test job (needs the lib's dist built first), bump
> version, verify CI/CD green, publish, smoke-test a fresh install. Trusted Publisher already
> configured on npm.
>
> **PHASE 3 (ONLY once nmea-parser AND its wrapper are fully in production) — norsub-emru, then its
> wrapper.** The lib is the next *code* refactor: §"NMEA refactor — locked design & plan" → Resume
> prompt has the full spec + two open design questions. Its workflow is already modernized (keeps the
> `Build monorepo deps: nmea-parser:build` step since it extends NMEAParser). Timestamp metadata is
> inherited from core; no work there. Then norsub-emru-nodered.
>
> **LATER (same lib-then-wrapper pattern):** thelmabiotel-tblive, then the binary parsers
> septentrio-sbf & sbg-ecom (`BinaryParser`, `Buffer`→`Uint8Array`/`DataView`; septentrio will want a
> `sentenceTimestamp` override for TOW+WNc).

## Node-RED wrapper refactor — locked plan (Phase 2, started 2026-07-22)

> `nmea-parser-nodered` is refactored first and becomes the **template for all future wrappers**
> (`templates/nodered/`). Plan converged with cru after deep investigation (below). Not yet coded.

**Locked decisions (2026-07-22, cru):**
- **Versions:** `engines.node ≥22`, `node-red ≥5` (needs Node 22), CI matrix `[22.x, 24.x]`, drop the
  Node-18 Dockerfile base.
- **Authoring: TypeScript → tsup → CJS** (validated by spike — see below). Node-RED requires CJS;
  tsup `export = init` emits `module.exports = <fn>`, node-red's exact contract. Build = tsup for JS
  **+ copy `parser.html` + icons** (tsup doesn't handle static assets).
- **API migration** (`src/parser.*`): `new NMEAParser({ memory })`; `addProtocols({file,...})` →
  **`addSentences(yaml)` handling the `Result`**; the configured **`file` path is read in-node (fs)**
  and its content passed to `addSentences`; `parseData` → `CMA[]`. Fix the latent `parser()` bug and
  the flow/registerType type name (`cma-nmea-parser`). Surviving getters kept.
- **Architecture:** split into a **pure-logic module (zero node-red deps)** + a **thin RED adapter**.
- **Testing — three layers:**
  1. **Pure-logic unit tests** via **`node:test` + `node:assert`** (no helper). CI backbone.
  2. **Integration** (registration + msg wiring) in CI — **VALIDATED approach (cru chose B): boot
     real node-red headless via its PUBLIC api + the flowFile pattern** (spiked green 2026-07-22):
     write a flow (`inject → cma-nmea-parser → test-sink`) to a temp `flowFile`, `RED.init(http
     server, { httpAdminRoot:false, httpNodeRoot:false, disableEditor:true, userDir:<tmp>,
     logging:{console:{level:'off'}} })`, register a `test-sink` type before `RED.start()`, then
     `await RED.start()`; the wrapper **auto-loads from node_modules** (workspace symlink), the `once`
     inject fires, the sink captures. Confirmed: injected `$GPGGA…\r\n` came out as `payload:[CMA]`
     (`id:GGA`, `protocol:{NMEA,3.1}`, `metadata.timestamp:{received,parsed,sentence}`). Uses only the
     stable public API — no fragile helper/patch. Notes: NMEA sentences need `\r\n` terminators (else
     buffered); boot ≈700ms so **share one runtime across many assertions** (one flow, sink collects an
     array), don't boot-per-test. The `runtime.flows.setFlows` admin API does NOT reliably start nodes
     embedded — use the flowFile-before-start pattern. **A. patch-the-helper is REJECTED** (too brittle
     to maintain).
  3. **Manual visual** via a **`<pkg>:nodered:dev` script that runs the local `node-red` dep** (no
     docker) so the node/icon/wiring can be seen live. Retire `manual_tests.sh`/docker.
- **CI/CD:** re-enable the wrapper test job (runs `node:test`), build lib dist first (monorepo dep),
  matrix `[22,24]`, bump wrapper to a new **major** (breaking API + CMA output), publish via existing
  OIDC + version gate.

**Investigation findings (evidence, 2026-07-22):**
- **`node:test` is fine as the runner** — it drove `node-red-node-test-helper` to `helper.load`;
  mocha fails identically. The runner was never the problem.
- **BLOCKER: `node-red-node-test-helper@0.3.6` (latest, 2024) is incompatible with `node-red@5.x`.**
  It hard-codes ~8 internal node-red file paths (e.g. `@node-red/registry/lib/util`) that node-red 5
  moved/renamed, AND its relative-path hunting is defeated by pnpm's non-flat `node_modules`. Init
  throws (silently swallowed) → `helper.load` crashes on `undefined`. No fixed helper published. This
  is why all `-nodered` test jobs are disabled. A robust patch = rewrite its resolution to
  package-name `require`s (non-trivial) — hence the "boot node-red programmatically" alternative.
- **TS authoring VALIDATED:** a spike (`parser.ts` with `@types/node-red@1.3.5` +
  `@types/node-red-node-test-helper`, `moduleResolution: bundler`, `strict`, `skipLibCheck:false`)
  compiles **0 errors**, and tsup emits node-red-loadable CJS. cru's earlier TS errors were the
  **deprecated `moduleResolution: node`** (TS6 rejects it), not a real `@types` problem. The two
  `@types/*` devDeps were added to the wrapper (uncommitted) during the spike.

## Phase 3 — norsub-emru: locked design (2026-07-28)

> Converged with cru in discussion; **no code written yet**. norsub is, in cru's words, "essentially
> the nmea-parser + feed `norsub.yml` + the status metadata". Everything in `packages/norsub-emru/src`
> today is legacy (positional constructor, `addProtocols`, `override parseData`, `metadata = {status}`).

**LOCKED — architecture: composition, two layers (cru, Open/Closed).** cru expects a hardware
teammate to need a **binary** norsub protocol "soon" (the device supports Custom binary, Atlas,
Ifremer Victor, Simrad EM 3000, TSS1) and wants the upgrade path open *now* while the monorepo
refactor is fresh in mind. **Only ONE protocol is ever active at a time** (the MRU is configured to
emit one), so this is protocol *selection*, not multiplexing.

```
NorsubParser                            ← device facade; what the package exports
  └ active protocol parser, selected by name:
      'nmea' → NorsubNMEAParser extends NMEAParser   ← norsub.yml + status aggregators
      (future) 'tss1' | 'custom-binary' | … extends BinaryParser
```

- The **protocol layer stays a subclass** on purpose: core's contract says `stampTimestamp` is the
  ONLY place a CMA gains `metadata.timestamp`, and status is field/payload metadata owned by the
  aggregator model. A facade decorating finished `CMA[]` would violate both — so decoration happens
  inside the protocol parser, never in the facade.
- Rationale for paying the facade cost now: a future binary protocol is necessarily its own class
  anyway (core `Parser<B>` is parameterised on ONE buffer type), so the only question is what sits in
  front. Facade now ⇒ adding protocol #2 is an **additive minor**; `extends` now ⇒ it's a **major**
  reshape of the exported class. norsub goes to 3.0.0 in this refactor regardless, so now is free.
- Selection API: `new NorsubParser({ protocol?, memory?, bufferLimit? })` (default `'nmea'`, the only
  value today) + a `protocol` getter/setter. Registry = a factory map `Record<NorsubProtocol, (opts)
  => …>`, so protocol #2 = one entry + one class.

**LOCKED — knowledge load is internal + self-contained (cru).** Same as nmea-parser: the `protocols`
script generates a typed TS object from the YAML; the constructor registers it internally. **NOT** via
the public `addSentences(yaml)` — no runtime YAML parse, no `fs`, browser-safe. Also: run `protocols`
on **test** as well as build, and rename `protocols/norsub.yaml` → `.yml` (nmea's were renamed).

**LOCKED — status metadata placement (cru's 3 rules).** Old top-level `metadata.status` is gone.

| sentence | `payload[last].metadata.status` (rule 1: field self-sufficient) | `metadata.payload.status` (rules 2+3) |
| --- | --- | --- |
| `PNORSUB`, `2`, `6`, `7`, `8` (single `status` uint32) | ✅ | ✅ |
| `PNORSUB7b` (`status_a`+`status_b` uint16) | ❌ neither half decodes alone | ✅ (mandatory) |

Rule 3 is cru's **supply-chain/substitutability rule**, worth documenting in `docs/CMA.md` as a
GENERAL CMA rule: *metadata that describes the whole device rather than one field MAY also be mirrored
at payload level even when a single field produced it, so equivalent sentences from different device
variants expose ONE read path* — swapping a norsub7b for a norsub8 then costs Tracker nothing.

**LOCKED — no sentence timestamp in norsub (datasheet-verified 2026-07-28).** Read
`misc/parsers/norsub/datahseets/NORSUB OEM Series - OEM MRU User Manual 1.2.0.pdf`:
- `T1` = "time for valid measurement (**internal clock**)", explicitly "wraps from (2^32-1) to 0";
  `T2` = "delay from T1 to telegram is sent" ⇒ telegram-sent ≈ `T1 + T2`. A free-running counter, NOT
  a wall clock (the MRU clock can be host/NTP-synced, but T1 is the internal counter and wraps).
  Arithmetic agrees: uint32 ms ≈ 49.7 days max, uint32 µs ≈ 71.6 min — an epoch ms needs 41 bits.
- **No other norsub-family sentence carries any time field** (PRDID, PTVG, PSMCA, PSMCC, HEHDT,
  PHTRO, PHINF). ⇒ norsub emits **`received`/`parsed` only**, inherited from core. Nothing to build.
- Per cru's rule (self-contained ⇒ field level, "maybe does not even require metadata"): T1/T2 get
  **no metadata** — value + `units` from the definition already say everything.

**✅ DATA BUG FIXED (2026-07-28) — wrong `units` in the norsub protocol definitions.** Manual: `T1`/`T2`
are **[ms]** for `PNORSUB` + `PNORSUB2` and **[µs]** for `PNORSUB6`, `PNORSUB7`, `PNORSUB7b`,
`PNORSUB8`. Our data said `ms` for PNORSUB6/7/7b (only PNORSUB8 was right) ⇒ 6 values (`time` +
`delay` × 3 sentences) corrected to `us` in **4 files**: `packages/norsub-emru/protocols/norsub.yaml`
+ its generated `src/norsub.ts`, and the byte-identical copy `packages/nmea-parser/protocols/norsub.yml`
+ its generated `tests/norsub.ts` (nmea-parser keeps a copy of the norsub YAML purely as a test
fixture). Verified: `git diff` contains **only** those 24 lines of data; **nmea-parser 65/65 green**.

**Status decode VALIDATED against the manual (2026-07-28) — no change needed.** All 32 bits in
`src/status.ts` match §"NORSUB Status Bits" exactly, and the manual confirms `STATUS_A` = bytes 1+2
(low half) / `STATUS_B` = bytes 3+4 (high half), which is what `utils.ts getUint32(lsb, msb)` assumes.
That logic survives the refactor as-is.

**🐛 Two more norsub-emru breakages found while fixing the data (both hit cru's "regenerate on
test/build" requirement):**
1. **`js-yaml` is not a dependency of norsub-emru**, but `yaml-to-json.js` imports it ⇒ `pnpm run
   norsub-emru:protocols` dies with `ERR_MODULE_NOT_FOUND` under pnpm's strict layout (it only ever
   worked under npm hoisting). Fix in the refactor: add `js-yaml` as a **devDependency** (build-time
   only, never shipped).
2. **The generator's output doesn't match what norsub imports.** `yaml-to-json.js` emits
   `export const PROTOCOLS = …` (untyped), but the committed `src/norsub.ts` is
   `export const NORSUB_SENTENCES: ProtocolsFileContent = …` — i.e. it was hand-adapted, so the
   `protocols` script has **never** actually regenerated it. Decide in the refactor: import
   `PROTOCOLS` like nmea-parser does (uniform, untyped + runtime `safeParse`), or upgrade the shared
   generator to emit a typed const for both packages (one line, gives compile-time checking).

**✅ DATA QUESTIONS RESOLVED with cru (2026-07-28) — two more fixes applied, one deliberately left:**
- **`PSMCA` field 3 `heading` → `heave` — FIXED** (all 4 files). Manual Table 44 says "heading" but
  with unit **m** / ±10 m, while SMCA's own Data list reads "Roll, pitch / **Heave** / Surge, sway" and
  `PSMCC`'s metre field is `heave`. cru: *"probably a typo when I started doing the yaml long time ago,
  fix it"*. Changes `payload[2].name` in CMA output (fine — norsub goes to 3.0.0).
- **`PTVG` fields `float64` → `string` — FIXED** (all 4 files), with the wire format spelled out in each
  `description`. Manual: `$PTVG,abbbbP,accccR,ddd.dT*hh` — the letter is GLUED to the number (`" 021P"`,
  `"- 036R"`, `"101.8T"`) and pitch/roll are the value **×100** (type INT in the manual), so `float64`
  could only ever produce `value: null`. **TODO in the norsub rewrite (cru's call): a `PTVG:3`
  aggregator putting the decoded degrees in FIELD metadata** — strip the trailing letter, `/100` for
  pitch/roll, sign convention `[-]` bow up / `[space]` bow down. `units` were dropped from the field
  definitions (the raw value is not degrees); the decoded metadata carries the real quantity.
- **`PRDID`: the KB handles the two definitions correctly — CORRECTED 2026-07-28 (cru was right).** An
  earlier note in this doc called them "colliding"; that was wrong. Verified empirically (built dist +
  the real `norsub.yaml` through `addSentences`): both definitions register under id `PRDID` (NORSUB
  PRDID = 2 fields `pitch,roll`; RDI ADCP = 3 fields `pitch,roll,heading`) and the field-count filter
  separates them cleanly — `$PRDID,-000.49,-000.14*57` → `NORSUB PRDID`, 2 fields. **Same id + different
  payload length is exactly what the multi-definition KB is for; no change needed.**
  - **The one genuinely open item is empirical, for cru:** the manual's NORSUB PRDID telegram AND its
    example both carry a **trailing comma** before the checksum (`$PRDID,pitch,roll,*CS`,
    `$PRDID,-000.49,-000.14,*61`). A trailing comma = a third, empty payload slot, so such a sentence
    has 3 fields and legitimately matches the 3-field RDI-ADCP definition (verified: values right,
    `heading: null`, protocol labelled "RDI ADCP"). **Does the device actually emit that trailing
    comma?** If it is a doc artifact, nothing to do. If it is real, NORSUB PRDID would need a 3-field
    definition — and THEN it would truly clash with RDI ADCP, separable only by the checksum's presence
    (NorSub has `*CS`, RDI ADCP has none), which would need an optional discriminator flag in the KB
    schema + a tiebreak in `upgradeKnownSentence` (~20 lines + a minor release). Do not build that
    speculatively.
- **⚠️ Behaviour worth a decision (found 2026-07-28, NOT acted on): a sentence with NO checksum is
  silently discarded.** The manual's RDI ADCP format is `$PRDID,sddd.dd, sddd.dd, sddd.dd<CR><LF>` —
  no `*CS` at all — and `parseData` returns **0 sentences with an empty buffer** (not buffered, not
  emitted with an error). A following valid sentence still parses, so nothing is corrupted. The locked
  rule "bad checksum ⇒ emit WITH a sentence-level error, never drop" does not cover "checksum absent".
  Decide deliberately: is a `$…<CR><LF>` without `*CS` a valid sentence (emit with
  `metadata.checksum: null`) or not NMEA at all (keep dropping — current, and the standing
  recommendation)? Matters only if a device is configured to emit a checksum-less protocol.
- **Do not trust the manual's example checksums** — `$PRDID,-000.49,-000.14,*61` actually computes to
  `6F`, and the PNORSUB2 example reuses PNORSUB's `*62`. Recompute when writing test fixtures.
- ~~Nit: `HEHDT`/`PHTRO` are `float32` while everything else is `float64`~~ — RESOLVED 2026-07-29 (cru):
  a datasheet float with no stated width becomes **`float64`**. Applied to those 3 fields AND swept through
  `nmea.yml` (68 fields), which is why `nmea-parser` goes to 3.2.0.

**✅ PREREQUISITES DONE & PUBLISHED (2026-07-28) — `protocol-core` + `nmea-parser@3.1.0` (live on npm,
PR [#71](https://github.com/core-marine-dev/devices/pull/71), merge `a80c8e4`).** Everything norsub
needs from the base library is implemented, green, packed and released; norsub's own rewrite is next.
1. **`DeviceParser<B>` in `protocol-core`** (`src/types.ts`): the shared API contract (`memory`,
   `bufferLimit`, readonly `buffer`, `addData`, `parseData`); `Parser<B> implements DeviceParser<B>`.
   Needed because `Parser<B>` has protected members ⇒ a *composing* facade is NOT type-assignable to
   `Parser<string>` even with an identical public surface. Test proves an extending parser and a
   composing facade coexist in a `DeviceParser<string>[]` (core 15/15).
2. **`NMEAParser.registerProtocols` `private` → `protected`** — a subclass registers its own bundled,
   generated built-in the way `NMEAParser` registers `PROTOCOLS` (no YAML round-trip, no `fs`).
3. **Aggregator registry is now instance-level** — `metadata.ts` exports `MetadataAggregators` +
   `BUILTIN_METADATA_AGGREGATORS`; `aggregateMetadata(sentence, aggregators?)` and
   `parseSentence(raw, definitions, aggregators?)` take it (defaulted, so existing call sites are
   unchanged); `NMEAParser._aggregators` is a per-instance copy of the built-ins plus a
   `protected registerAggregators(...)` (later registration wins on a duplicate key).
4. **Exports for downstream device parsers:** `BUILTIN_METADATA_AGGREGATORS`, types
   `MetadataAggregator` / `MetadataAggregators`, and re-exported core types `DeviceParser`, `DraftCMA`,
   `Field`, `Metadata`, `Value` (core is private/unpublished, so a consumer can only see what
   nmea-parser re-exports).
5. **`tests/extension.test.ts`** (new, 6 specs) is the executable spec for the seam norsub uses: a
   subclass registering proprietary definitions + a status-style aggregator writing BOTH field and
   payload metadata, the built-in GGA aggregator still intact, and a base parser unaffected by the
   subclass registry. **nmea-parser 71/71** (was 65).
6. **Released as `3.1.0`** (additive ⇒ minor) + README §"Extending: device parsers built on NMEA" and
   §"The shared parser contract". Verified: core lint+tsc+15/15+build; nmea lint+tsc+71/71+build
   ESM+CJS+DTS; `DeviceParser` inlined into the published `.d.ts` with **zero** `protocol-core`
   references; packed manifest = `3.1.0`, `engines.node >=22`, no protocol-core leak;
   `--frozen-lockfile` clean.
7. **The wrapper needs NO change** — it uses `new NMEAParser({memory})` / `addSentences` / `parseData`
   only, and its published `^3.0.2` range already accepts 3.1.0. Verified anyway: wrapper build +
   **19/19** node:test (incl. the real-headless-node-red integration) green against the new lib. Left
   at `2.0.1`, unpublished this round (its workflow is path-filtered and won't even trigger); bumping
   it would publish an identical package.

**NOT bundled into this release (deliberate):** mirroring "regenerate `protocols` on **test**" to
nmea-parser. The generator emits raw `JSON.stringify` output while the committed `src/nmea.ts` is
eslint-formatted, so a `pretest` regeneration would dirty tracked files on every test run unless
`format` runs too. Better solved by upgrading the shared generator to emit lint-clean typed output —
which is a norsub-refactor task anyway (see the generator finding above).

**🐛 CI bug to fix in the same pass:** `.github/workflows/norsub-emru.yml` builds `nmea-parser` first
but **not** `protocol-core`, whose `exports` point only at `dist/` ⇒ `nmea-parser:build` dies in a
fresh checkout (same class of bug fixed in `nmea-parser.yml` on 2026-07-22). Prepend
`protocol-core:build`. Also bump norsub's `engines.node` `">= 18"` → `">=22"`.

**LOCKED — switching protocol discards internal state (cru, 2026-07-28).** Changing `protocol` builds a
fresh protocol parser, so the input buffer AND any parsed-but-not-yet-drained CMAs are dropped: half a
sentence in protocol A can never be completed by protocol B.

**LOCKED — the facade exposes the active protocol parser as `parser` (cru, 2026-07-28).** The
protocol-specific extras (`addSentences`, `getSentence`, `getSentencesByProtocol`,
`getFakeSentenceByID`) are reached through it — `norsub.parser.getFakeSentenceByID('PNORSUB8')` — and are
NOT delegated method-by-method (cru's reasoning: the facade's API would balloon as protocols are added,
and most methods would be meaningless for whichever protocol is active). With one protocol in the union
today, `parser` types concretely as `NorsubNMEAParser`, so no narrowing is needed until protocol #2.

**OPEN (need cru) before coding:** (a) does the facade delegate the NMEA-only extras (`addSentences`,
`getSentence*`, `getFakeSentenceByID`) or expose the active parser via a getter — cru leans getter, so
does this doc, name TBD (`parser`); (b) `DeviceParser` interface in core now or when protocol #2 lands
(recommend now); (c) mirror the `protocols`-runs-on-test change to nmea-parser too?; (d) the four open
data questions above.

## Failed sentences — cru's requirement (raised 2026-07-29) — ✅ DESIGNED & IMPLEMENTED same day

> **The behaviour spec lives in [`docs/CMA.md`](CMA.md) §"Failed and garbage sentences"** (classification
> table + rationale). This section records **the decisions and WHY**, so nobody re-litigates them.

**cru's problem, in his words:** a real device sends a checksum with **only 1 character**. The parser's output
was *"just an empty array — for me it is hiding the problem"*. Logging is not the answer either: *"i will have
a huge amount of repetitive logs saying the same error"*. So: **when a sentence can be parsed, emit it WITH
`errors`; when it cannot be parsed at all, still emit something** (`raw` + timestamp + `errors`) so the
operator gets feedback. Two more cases he named: two sentences in a row where the **first lost its `\r\n`**,
and **garbage between sentences**.

**cru's hard constraint: "I do not want to break the CMA contract at all."** So failed/garbage sentences are
made to FIT the existing CMA type — mandatory values become `'unknown'`, nested ones too — and the detection
signal is the **already-existing optional `errors: string[]`**. No new key, no new variant, no new schema.

**Decisions (all cru's, 2026-07-29):**
- **D1 — detection = presence of `errors[]`.** Consistent with locked decision 4b (bad checksum).
- **D2 — garbage sentence = everything mandatory set to `'unknown'`** (`id`, `protocol.name`,
  `protocol.version`, `metadata.checksum`), `payload: []`. *"The important in the garbage sentence is we have
  the raw (to see the garbage) + its timestamp to know when it was parsed + the errors[] telling us is
  garbage."*
- **D3 — a malformed checksum is still checked against the data**, so **two independent errors**: the format
  one (not 2 characters) and the mismatch one. Consequence worth knowing: a device that drops the **leading
  zero** (computes `0x04`, sends `*4`) gets **only** the format error, because `'4'` still compares equal — no
  false corruption claim.
- **D4 — missing `\r\n` ⇒ a regular parsed sentence + a "missing end flag" error.**
- **D5 — the MODEL (`GarbageSentence` + `UNKNOWN`) goes in `protocol-core`; ALL the logic stays in
  nmea-parser.** cru: *"norsub inherits this behaviour for free, because it lives in the nmea parser."*
- **Q1 — a lone `\n` is a MALFORMED terminator** (parsed + error), not a missing one.
- **Q2 — a `$`-chunk with NO `*` is GARBAGE, not a sentence.** cru's reasoning: *"if the `*` character is
  missing, we don't know if there are missing more fields, so it is better to mark as garbage because we
  don't really know how many characters are missing."* This **supersedes** the earlier note that
  checksum-less input should simply be dropped.
- **Q3 — garbage is emitted immediately.** cru: *"imagine we connect to a wrong device which is emitting
  with a binary protocol — emit immediately the discarded input, at least give us some feedback."*
- **Q4 — when the buffer overflows, flush its content as a garbage sentence.** cru: *"as you pointed (i have
  experimented) many binary protocols include the `$` in their sentences"* — so an unterminated chunk could
  grow forever and stay silent. **This also fixed a latent bug: `bufferLimit` was stored and validated but
  enforced NOWHERE.**

**What changed in the code:**
- **`protocol-core`:** `UNKNOWN` constant + the `GarbageSentence` type (model only, no logic — D5).
- **`nmea-parser/src/sentences.ts`:** the old `getUnparsedNMEASentences` **filter chain is gone** — that was
  the bug's root cause: *anything a `.filter()` rejected simply disappeared*. Replaced by **`scanBuffer`**,
  which accounts for **every character** (sentence attempt / garbage / pending tail). Plus `garbageSentence`,
  a checksum-format error, terminator handling for `\r\n` | `\n` | none, `lastIndexOf('*')` for the delimiter,
  and adjacent-garbage **coalescing** (one report per noisy burst, not a flood). Blank space between
  sentences is deliberately **ignored** — reporting it would be the exact noise cru wants to avoid.
- **`nmea-parser/src/parser.ts`:** `extractSentences` maps scanned chunks → CMAs.
- **Tests:** nmea-parser **71 → 93**. Two old specs that asserted the silent-drop behaviour were rewritten to
  assert the new contract; the norsub wrapper's "garbage returns `[]`" spec likewise.
- ⚠️ **Not yet done: the version bump to `4.0.0`** (see the banner) and the READMEs.

## Decisions (locked unless cru says otherwise)

- **CMA format is LOCKED** — [`docs/CMA.md`](CMA.md) §Current draft + §Locked decisions
  (2026-07-09, cru): timestamp = epoch ms only; `protocol` closed with required `version`;
  per-protocol extras go in `metadata` (so tblive's `mode`/`firmware` move there); `Type` uses
  `boolean`. Canonical schema is `packages/core/src/cma.ts`.
- **Terminology: "sentence", not "frame"** — a unit of input data is a *sentence*. Applies to
  all new/refactored code and docs.
- **Field `value` = `string | number | boolean | null`** (2026-07-09): `null` = present-but-empty
  field; **no bigint** — `int64`/`uint64` carried as decimal strings (JSON-safe). No protocol
  currently uses 64-bit ints. Per-`Type` validators + `TYPE_SCHEMAS` lookup live in core.
- **Shared core (Decision A1):** sameness lives in a private, unpublished
  `@coremarine/protocol-core`, bundled into each parser via tsup `noExternal`. Not template-only.
- **Unified API contract:** object-arg constructor `new X({ memory?, bufferLimit? })`,
  `addData(input): void` + `parseData(input?): CMA[]`; input is `string | Uint8Array`. Protocol
  parsers extend `StringParser` or `BinaryParser` and implement only `extractSentences`.
- **Cross-runtime target** (node/deno/bun/web): the one blocker in NMEA is `node:fs`
  (`readProtocolsYAMLFile`, isolate as a node-only path) — `node:crypto` there is already Web
  Crypto (`getRandomValues`), just drop the import. Buffer→Uint8Array work is in the two binary
  parsers (Septentrio/SBG), done last.
- **Docs live in `docs/`, one small doc per concern; `AGENTS.md` stays ≤80 lines** (index only).
- **`misc/` is gitignored** — raw sensor captures and dev helpers are never committed.
- **pnpm migration is done** — no more npm in the repo (except Node-RED Dockerfiles, deferred).
- **ESLint sonar thresholds: strict from day one** (Option A: max-lines-per-function 50,
  cyclomatic-complexity 10, cognitive-complexity 15; tests exempt from max-lines).
- **Valibot pinned to 1.4.2** (exact) in all peerDependencies — no `>=1.0.0` ranges.
- **Metadata has 3 levels (LOCKED 2026-07-10, all DONE for nmea-parser):** sentence (`cma.metadata`:
  `checksum` always, `talker` optional), field (`cma.payload[i].metadata`: 1-field decode), payload
  (`cma.metadata.payload`, flat: aggregated from ≥2 fields). Field/payload metadata is **known-only**
  and **dev-authored**: aggregators registered by **`id + payload length`** (NOT field names — those
  are unofficial), reading fields **by index**. Free-form `Record<string,unknown>`; core CMA schema
  unchanged. Contract = `MetadataAggregator` in `nmea-parser/src/metadata.ts` (see [`docs/NMEA.md`](NMEA.md)).
- **Timestamp metadata (LOCKED 2026-07-13, DONE core + nmea-parser):** every CMA carries
  `cma.metadata.timestamp = { received, parsed, sentence? }` (epoch ms). `received` = `addData` call
  time; `parsed` = decode time (`=== cma.timestamp`); `sentence` = optional, the sentence's own time
  (protocol-supplied). **`addData` parses immediately** (Option B) so received/parsed are ~equal — a
  gap is a built-in lag metric. **CMA is the single source of truth: `metadata` and its `timestamp`
  are REQUIRED, never optional-because-of-internal-logic.** Core owns received/parsed (stamped in
  `addData`, the only place a CMA gets its timestamp); protocols supply `sentence` via the
  `sentenceTimestamp` hook. `extractSentences` returns `DraftCMA` (= CMA minus metadata timestamp) so
  no placeholder is needed. Sentence metadata schema is a **loose** object (typed timestamp +
  free-form extras); field metadata (`payload[i].metadata`) stays free-form `Record`. See
  [`docs/CMA.md`](CMA.md) §Timestamp metadata.
- **Result pattern (LOCKED 2026-07-10, DONE for core + nmea-parser):** parsers **never throw**;
  `Result<T,E> = { success:true, value:T } | { success:false, error:E }` lives in
  `@coremarine/protocol-core` (ported from Tracker `src/core/tracker/src/types.ts`). Every function
  that threw pre-refactor returns a `Result` after; `try/catch` nested only where strictly necessary,
  never propagated. Parse hot-path already never throws (null value / `errors[]`) — stays as-is.
  Each newly-refactored parser adopts the same pattern.
- **CI/CD (LOCKED 2026-07-13, DONE all packages):** publish via **npm OIDC Trusted Publishing** (no
  `NPM_TOKEN`; `permissions: { id-token: write, contents: read }`; provenance automatic). Publish
  job **version-gates** with `npm view <name>@<version>` — only publishes when that exact version is
  NOT on npm, so `dev`→`main` merges no-op unchanged packages. Actions pinned to majors
  `checkout@v7` / `setup-node@v6` / `pnpm/action-setup@v6`; node matrix = the **two latest LTS**
  lines (today `[22.x, 24.x]`; bump to `24+26` after 2026-10-28 when 26 goes LTS). Each lib's `build`
  regenerates its `protocols/*.yml` first, so workflows stay uniform. `protocol-core.yml` is
  test-only (private). Node-RED workflows are modernized but keep their **test jobs disabled** until
  each wrapper is refactored. Bundled private deps (`@coremarine/protocol-core`) go in
  **devDependencies** (not runtime deps), need tsup `dts.resolve` to inline their TYPES, and are
  stripped from the published manifest by `.pnpmfile.mjs` `beforePacking`.
- **Toolchain versions (updated 2026-07-22):** node CI = two latest LTS `[22.x, 24.x]`; pnpm
  `11.15.1` (was `11.12.0` — that release is broken/deprecated upstream; **avoid 11.12.0 & 11.13.0**);
  **TypeScript held at `6.0.3`** (TS7 native rewrite needs 7.1's stable programmatic API before
  typescript-eslint/tsup work — revisit ~Oct 2026); **js-yaml held at 4.x** (workspace security
  override `js-yaml: '>=4.1.1'` pins it; going to 5 would drag mocha/node-red transitive js-yaml).

## NMEA refactor — locked design & plan (IN PROGRESS, started 2026-07-09)

> **State (2026-07-10): slice A–F + STEP 1 (3-level metadata) + STEP 2 (Result pattern) DONE &
> green** (lint + tsc + 62/62 tests + build). nmea-parser is now the complete reference
> implementation. See the Done entries above for what shipped and the one flagged talker/id
> decision. The A–F design below is historical (finished). **The live to-do is the Resume prompt at
> the end of this section: clone the reference to the other four parsers, norsub-emru first.**

First parser onto `@coremarine/protocol-core`. It becomes the reference model for the other
four. **Every decision below is locked with cru.** Output shape changes `NMEASentence` → `CMA`
(breaking for Tracker — deliberate; no PR to `main` until at least NMEA is done).

**Terminology:** "sentence", never "frame". Rename symbols (`getUnparsedNMEAFrames` →
`getUnparsedNMEASentences`, `lastUncompletedFrame` → `lastUncompletedSentence`, etc.). Grep to
confirm zero "frame" remains in `src/`.

**API / contract:**
- `class NMEAParser extends StringParser` (from core). Constructor `({ memory?, bufferLimit? })`.
  Core supplies `addData(string)` / `parseData(string?): CMA[]`. NMEA implements only
  `protected extractSentences(buffer: string): { sentences: CMA[], remainder: string }`.
- **Single knowledge-feed input:** `addSentences(yaml: string): void` — a YAML **string** (works
  on web: `await file.text()`; on node: read the file yourself). Parsed with `js-yaml`
  (isomorphic). DROP the old file-path and pre-parsed-object modes.
- Keep useful NMEA-only extras (`getSentence`, etc.), renamed to sentence terminology.

**Knowledge model:**
- Author in YAML: `protocols/nmea.yaml` = single source of truth. A build step generates
  `src/nmea.ts` (`export const NMEA_PROTOCOLS = {...} as const`) — bundled, web-safe (no runtime
  fs). **Delete the hand-written `src/nmea-sentences.ts`** (it's a stale duplicate; the generated
  `src/nmea.ts`/`PROTOCOLS` is currently dead code — collapse to one source). Update
  `yaml-to-json.js` to emit the typed `.ts`.
- Storage: `Map<id, KnownSentence[]>` — **multiple definitions per id** (same id, different field
  counts across NMEA versions). In YAML, author variants under separate protocol-version blocks
  (same `protocol: NMEA`, different `version`).

**Pipeline (`extractSentences`, per candidate — decision 4a: upgrade inline, one pass):**
1. Split buffer → candidate sentence strings + `remainder` (`lastUncompletedSentence` keeps the
   incomplete tail when `memory` on).
2. `parseGenericSentence(raw)`: verify NMEA format + checksum; split talker off the id → a
   generic CMA sentence:
   - root `raw` = whole sentence; `timestamp` = `Date.now()`; `id` = base id (talker removed);
     `protocol = { name:'NMEA', version:'unknown' }`;
   - `payload` fields = `{ raw: <field slice>, name:'unknown', type:'string', value: <field slice> }`
     (unknown field: `raw === value`; empty field `value: null`);
   - `metadata = { checksum, standard:false, talker? }` (talker key only if present);
   - `errors: [...]` if format/checksum invalid (4b: **emit-with-errors, never drop**).
   - Default unknown strings = `'unknown'`.
3. `upgradeKnownSentence(generic)`: look up id → definitions; keep those whose
   `payload.length === generic field count`; if ≥1 → pick **newest** (compare protocol version,
   semver-tolerant, highest wins; if not comparable, first); apply field name/type/units/
   description; parse each value via core `TYPE_SCHEMAS[type]`; set `protocol = matched {name,
   version}`, `metadata.standard` from the def. **No length match (incl. id known but wrong
   length) → stays generic, no error.**

**CMA mapping specifics:** protocol closed to `{name, version}`; ALL extras → root `metadata`
(same for every parser); legacy field `sample` → `raw`.

**Cross-runtime:** remove `import fs from 'node:fs'` (drop `protocols.ts` file mode) and
`import crypto from 'node:crypto'` in `sentences.ts` (use global `crypto.getRandomValues`).
`yaml-to-json.js` keeps `node:fs` — build-only script, never bundled. Goal: **zero `node:`
imports in `src/`**.

**Build/pkg:** `tsup.config.ts` add `noExternal: [/@coremarine\/protocol-core/]` + `platform:
'neutral'`; add dep `@coremarine/protocol-core: workspace:*`; keep js-yaml/valibot/@schemasjs;
update the `protocols` npm script. Add root proxy scripts if needed.

**Tests:** the existing ~60 specs assert the legacy `NMEASentence` shape — rewrite them to assert
`CMA`. Run order: lint → tsc → test.

### Resume prompt (if this session is interrupted)

> **nmea-parser is DONE — the complete reference implementation** (slice A–F CMA rewrite + STEP 1
> 3-level metadata + STEP 2 Result pattern), committed & green (lint + tsc + 62/62 + build). Do NOT
> redo it. Read [`docs/NMEA.md`](NMEA.md) (the journey/code-map) — it is the spec for the rest.
> **The task now is to clone the reference to the other four parsers**, in cru's order, starting with
> **norsub-emru**. Run `git log --oneline -8` first. cru works one step at a time and wants decisions
> converged before coding — discuss, then implement. Update this doc same-turn.
>
> **norsub-emru (next).** It no longer builds. Today (`packages/norsub-emru/src/parser.ts`) it
> `extends NMEAParser` with the OLD API: positional `super(memory, limit)`, `ProtocolsInputSchema.parse`,
> `this.addProtocols(NORSUB_SENTENCES)`, and an `override parseData` that post-processes every
> `PNORSUB*` sentence through `addStatus` — decoding a status bitfield (`status_a`/`status_b` for
> `…b` variants via the last two fields, else a single `status` from the last field; see
> `src/status.ts` `getStatus`) and attaching it to `sentence.metadata.status` + the last field's
> `metadata`. norsub is otherwise a thin NMEA extension (its own generated `src/norsub.ts` knowledge).
>
> Target shape: `class NorsubParser extends NMEAParser` still works (NMEAParser now extends
> `StringParser`), object-arg constructor `{ memory?, bufferLimit? }`, emit `CMA[]`, adopt `Result`.
> **Converge these design questions with cru BEFORE coding — they aren't settled by the NMEA
> reference:**
> 1. **How a subclass loads its own built-in.** NMEAParser loads `PROTOCOLS` via the **private**
>    `registerProtocols` + `safeParse`. norsub's `NORSUB_SENTENCES` is a generated JS object, not YAML,
>    so `addSentences(yaml)` doesn't fit. Cleanest: make `registerProtocols` **`protected`** so
>    `NorsubParser`'s constructor can register `ProtocolsFileContentSchema.safeParse(NORSUB_SENTENCES)`.
> 2. **How norsub injects its status metadata.** The NMEA `METADATA_AGGREGATORS` registry is a
>    module-level const in `nmea-parser/src/metadata.ts` — not extensible by a subclass, and keyed by
>    exact `${id}:${payloadLength}` (norsub status spans many `PNORSUB*` ids/lengths). Options to
>    discuss: (a) make the registry instance-level / mergeable so a subclass adds aggregators;
>    (b) generalise the key to allow a predicate/prefix (`PNORSUB*`); (c) keep norsub's own light
>    post-process. Prefer folding it into the aggregator model (no `override parseData`) if clean.
>
> Then tblive, then the two binary parsers (septentrio-sbf, sbg-ecom — `BinaryParser`,
> `Buffer`→`Uint8Array`/`DataView`). Each parser's Node-RED wrapper also uses the removed old API
> (`addProtocols`) and is updated alongside its lib (cru: wrappers come after each lib is finished).

## Next steps (in order)

1. ~~**Ship the release in PHASES**~~ — ✅ **ALL PHASES DONE.** Phase 1 (nmea-parser 3.0.0), Phase 2 (its
   wrapper), Phase 3 (norsub-emru + its wrapper), and the 2026-07-29 release of **all four at once**
   (nmea-parser 4.0.0, norsub-emru 4.0.0, both wrappers 3.0.0) are live on npm.
2. **CMA rollout** — format is locked; `@coremarine/protocol-core` is the shared base. Remaining parsers in
   **cru's order** (easiest-first; nmea-parser is the model, norsub-emru the device-facade model):
   1. ~~**nmea-parser**~~ — ✅ **DONE & PUBLISHED (4.0.0)**: the reference implementation.
   2. ~~**norsub-emru**~~ — ✅ **DONE & PUBLISHED (4.0.0)**: device facade composing a protocol parser.
   3. **`thelmabiotel-tblive` (NEXT) + its wrapper** — already CMA-ish; move `mode`/`firmware` into
      `metadata`, adopt the base class. Protocol-version matching is the hard part (least-clean protocol).
      **Nothing has been researched or designed yet — start from scratch with cru.**
   4. **septentrio-sbf** — binary; extend `BinaryParser`, migrate `Buffer`→`Uint8Array`/`DataView`,
      verify/replace the `crc` dep. Mature, well-tested (54/54). Will want a `sentenceTimestamp` override
      for TOW+WNc.
   5. **sbg-ecom** — binary; same Buffer migration; SBG→CMA design exists in `misc/tests/sbg/`. Has **zero
      test specs**.
3. ~~**Result pattern**~~ — ✅ DONE (2026-07-10): `Result<T,E>` in `@coremarine/protocol-core`.
   Each newly-refactored parser adopts it.
4. **Strictness pass** (deferred) — add `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `verbatimModuleSyntax` to root tsconfig (the Tracker repo
   has them; needs ~218 code fixes in the parsers — mostly array access returning `T |
   undefined`).
5. **Not in this repo — grep Tracker for `field.type` / `'float32'`** (see the banner note).

## Open threads / known bugs (report before fixing)

- ~~**`norsub-emru` no longer builds**~~ — RESOLVED 2026-07-29 by the Phase 3 / Task 3a rewrite
  (CMA output, `DeviceParser<string>` facade, 45/45). Uncommitted pending cru's review.
- **`nmea-parser-nodered` wrapper uses the removed old API** — `src/parser.js` calls
  `parser.addProtocols({ file, ... })`, which no longer exists (replaced by `addSentences(yaml)` in
  slice A–F). Broken at runtime like norsub-emru; update each wrapper alongside its refactored lib.
- ~~**DEFERRED: GGA metadata enrichment**~~ — RESOLVED 2026-07-10 (STEP 1): reimplemented in
  `nmea-parser/src/metadata.ts` as the seeded `GGA:14` aggregator (lat/long decimal degrees →
  payload metadata; UTC timestamp + quality label → field metadata).
- ~~`nmea-parser/src/types.ts`: `Float32`/`Float64` types are swapped~~ — RESOLVED by the NMEA
  refactor (values now validate via core `TYPE_SCHEMAS`; the swapped local aliases are gone).
- `sbg-ecom` has **zero test specs** (only fixtures) and its CI test step is commented out.
- `thelmabiotel-tblive-nodered` has a `test` script but **no mocha specs** (`No test files found`).
- **3 of 5** nodered CI workflows still have their test jobs commented out — they publish untested.
  (`nmea-parser-nodered` **3.0.0** and `norsub-emru-nodered` **3.0.0** are DONE: test jobs enabled +
  `node:test`, 22/22 and 34/34. The other three — tblive, sbg-ecom, septentrio — get theirs enabled as
  each wrapper is refactored in turn.)
- nmea-parser ships a committed `legacy/` folder + stray root files (`morenmea.tss`).
- Node-RED docker `Dockerfile`s still use `npm i` inside the container (install the published
  package from the npm registry, not the workspace — unaffected by the pnpm migration, but
  inconsistent).
- `clean_monorepo.sh` only covers the 5 library packages, not the `-nodered` ones.
- P08-Trident harness (`misc/tests/p08trident/`) status unknown — ask cru if still live.


## 📋 Paste-ready prompt for the NEXT SESSION (START HERE — the nmea + norsub track is CLOSED)

> Continue the CoreMarine **devices** monorepo refactor. Branch `dev`, repo
> `/home/klin/Coding/CoreMarine/products/devices`. **Read `docs/STATUS.md` top-to-bottom FIRST** — the
> banner, then the newest §Done entries and §Decisions. Run `git log --oneline -10` before touching
> anything.
>
> **HOW cru WORKS (respect this, it is not optional):** **discuss and converge decisions BEFORE coding, one
> step at a time.** Ask rather than guess; when something is genuinely his call (an output shape, a name, a
> version), put the options to him with a recommendation and let him choose. Output-format changes are
> **breaking changes for Tracker**. Verify **per package, from its own directory**: `lint` → `tsc --noEmit`
> → `test` → `build`. Update **`docs/STATUS.md` in the SAME TURN** as any meaningful change — never save it
> for the end, limits hit without warning. **Commit only when cru asks.** No AI co-author trailer (this repo
> has none — do not add one). **For ANY npm / pnpm / node-red / TypeScript / GitHub-Actions / library
> specifics, fetch current docs with the `ctx7` CLI — never answer from memory.** Code style: no semicolons,
> single quotes, 2-space indent, arrow functions, import groups (`// built-in` → `// installed` → `// coded`),
> functions ≤50 lines / cyclomatic ≤10 / cognitive ≤15 (`docs/CodeStyle.md`).
>
> ### STATE — the whole nmea + norsub track is DONE AND PUBLISHED. Do not redo or "improve" any of it.
>
> `dev` == `main` == `941fd58` plus docs commits, tree clean. **Live on npm:**
>
> | package | version | what it is |
> | --- | --- | --- |
> | `@coremarine/nmea-parser` | **4.0.0** | the CMA reference library |
> | `@coremarine/nmea-parser-nodered` | **3.0.0** | the wrapper TEMPLATE — clone this for every new wrapper |
> | `@coremarine/norsub-emru` | **4.0.0** | device facade composing a protocol parser |
> | `@coremarine/norsub-emru-nodered` | **3.0.0** | its Node-RED node (`cma-norsub-parser`) |
>
> `@coremarine/protocol-core` is the private, unpublished shared base (`DeviceParser<B>`,
> `Parser`/`StringParser`/`BinaryParser`, `Result`, the CMA schemas, `UNKNOWN`, `GarbageSentence`).
> Tests: core **15/15**, nmea-parser **109/109**, norsub-emru **45/45**, nmea wrapper **22/22**, norsub
> wrapper **34/34**. All CI green. Everything shipped 2026-07-29 in PR
> [#74](https://github.com/core-marine-dev/devices/pull/74) was verified against the PUBLISHED packages, not
> the workspace.
>
> **What landed in 4.0.0 that you must know about, because every future parser inherits it** (full specs in
> [`docs/CMA.md`](CMA.md) §"Failed and garbage sentences" and §"Sentence resolvers"):
> - **Nothing is dropped silently.** `scanBuffer` accounts for every character of the buffer. A malformed
>   sentence is decoded as far as possible and carries `errors[]`; undecodable input becomes a *garbage
>   sentence* (a valid CMA, every mandatory value `UNKNOWN`, `payload: []`, the junk in `raw`). The
>   detection signal is the pre-existing optional `errors[]` — **the CMA contract did not change.**
>   `bufferLimit` is now actually enforced (it never was).
> - **Sentence resolvers** — a third `protected` extension point (`registerResolvers`) for formats that
>   carry their real type in a FIELD rather than the id. Built-in: `$PSXN` → `PSXN20` / `PSXN23`.
>
> ### THE WORK — `thelmabiotel-tblive` + its Node-RED wrapper
>
> cru's next target, agreed at the end of the previous session. **NOTHING has been researched, measured or
> designed yet — deliberately.** Do not arrive with a plan built from this doc's one-line description; read
> the actual package first, then converge the design with cru step by step, exactly the way norsub-emru was
> done.
>
> What this doc already believes about it (VERIFY ALL OF IT against the code — these notes are old):
> - It is the **only parser whose output is already CMA-*ish*** — but it is **not** on the base class.
> - It has **extra top-level `mode` / `firmware` keys** that must move into `metadata` (locked CMA rule: no
>   per-protocol keys at the top level).
> - **Protocol-version matching is the hard part** — it was called the least-clean protocol of the five.
> - `engines.node` is still `">= 18"`; tighten to `">=22"` like the others.
> - Its wrapper `thelmabiotel-tblive-nodered` has a `test` script but **no specs at all**, and its CI test
>   job is commented out.
> - Wire format notes may exist in [`docs/PROTOCOLS.md`](PROTOCOLS.md).
>
> **Suggested shape of the session** (cru decides the order, ASK HIM FIRST): (1) read the package and
> REPORT what its current output actually looks like, measured not assumed; (2) converge the CMA mapping
> with cru — especially where `mode`/`firmware` go and how protocol versions are matched; (3) implement the
> library; (4) then the wrapper from the `nmea-parser-nodered` template; (5) release both.
>
> ### PATTERNS TO REUSE (all proven in production — do not reinvent them)
>
> - **Library recipe:** extend `StringParser`/`BinaryParser` from `protocol-core` and implement only
>   `extractSentences`; object-arg constructor `{ memory?, bufferLimit? }`; `addData`/`parseData(): CMA[]`;
>   never throw — return `Result<T,E>`; knowledge authored in `protocols/*.yml` and generated to a typed
>   const by the ONE shared `scripts/yaml-to-ts.mjs` (idempotent, so `protocols` can run on `test`); type
>   the generated const so `tsc` validates the whole knowledge base. Read
>   `packages/nmea-parser/tests/extension.test.ts` — it is the executable spec for the extension seams.
> - **Device facade** (only if the device speaks several protocols): `implements DeviceParser<B>` and
>   COMPOSE protocol parsers via a factory registry, do NOT extend one — see `norsub-emru/src/parser.ts`
>   and the `parser` getter for protocol-specific extras.
> - **Wrapper recipe:** clone `packages/nmea-parser-nodered`. TS → tsup → CJS (`export = init`,
>   `"module": "preserve"`); pure `src/lib.ts` with **zero** node-red imports + a thin `src/parser.ts`
>   adapter; `node:test` unit specs **plus** a real-headless-node-red integration test via `RED.init` + the
>   flowFile pattern (NOT `node-red-node-test-helper` — it breaks on node-red 5 + pnpm); `dev-server.mjs`,
>   no docker; `engines.node ">=22"` + `node-red.version ">=4.0.0"`; node-red stays a ROOT devDep.
>   **msg-API vocabulary is now settled across both wrappers: `msg.sentences` = sentence DEFINITIONS,
>   `msg.protocol` = the device protocol selector. Follow it.**
> - **`files` exclusions are a trap:** node-red writes `<flowfile>_cred.json` and `.<flowfile>.backup` next
>   to any flow it opens, and **`files` overrides `.gitignore` when packing**. Both are excluded in the
>   template now. **Rule: any node-red runtime artefact that earns a `.gitignore` rule needs a `files`
>   exclusion too** — this bit us twice.
> - **Verify example flows by BOOTING real node-red against the flow file** — malformed flow JSON and
>   missing node types only surface at runtime. Keep third-party node types OUT of shipped example flows.
>   Give each flow a group demonstrating failed/garbage sentences (both wrappers have one).
> - **Release mechanics:** land on `dev`, confirm the `dev` CI run is green, THEN open the PR `dev` → `main`;
>   the merge publishes via OIDC + an `npm view` version gate. Isolate the version bump in its own
>   `chore(release):` commit. **A library must be live on npm BEFORE its wrapper publishes**, because
>   `workspace:^` packs as `^<in-tree version>` — and check the PUBLISHED dep ranges of every dependent: a
>   caret range cannot resolve a new major, so each dependent needs republishing or it never receives the
>   change (that is why all four went out together in 4.0.0/3.0.0).
> - **Verify a release against the PUBLISHED tarball** in an empty temp dir with nothing from the workspace.
>
> ### ALSO OPEN (smaller, decide with cru)
>
> - **Not in this repo: grep Tracker for `field.type` / `'float32'`.** The `float32` → `float64` sweep is
>   fully applied here, but it shipped in `nmea-parser@3.2.0` as a **minor** while changing `field.type` in
>   emitted CMAs. Moot from 4.0.0 on (a major owns it); the question is only whether a Tracker deployment on
>   3.2.0 was silently affected.
> - **cru's manual step:** refresh the Node-RED flow-library entries — both wrappers went to a new major.
> - **The norsub protocol-switch test gap.** "Switching `protocol` discards the buffer and undrained
>   sentences" cannot be exercised while `NorsubProtocol` has a single member. It gets its test with
>   protocol #2. A comment in `packages/norsub-emru/tests/index.test.ts` marks the spot.
> - See §"Open threads / known bugs" for the rest (three wrapper CI test jobs still disabled, `sbg-ecom` has
>   zero specs, nmea-parser's committed `legacy/` folder, docker `npm i`, `clean_monorepo.sh` coverage,
>   P08-Trident harness status).
