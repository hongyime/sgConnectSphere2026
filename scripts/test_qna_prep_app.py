#!/usr/bin/env python3
"""Automated verification suite for ConnectSphere Q&A Prep Web App."""
from collections import Counter
from pathlib import Path
import re
import subprocess
from bs4 import BeautifulSoup


def run_tests():
    html_path = Path("artifacts/final-qna-prep-guide.html")
    assert html_path.exists(), "HTML artifact missing"
    text = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(text, "html.parser")

    # 1. Section anchors
    for a in ["overview", "details", "next-steps"]:
        sec = soup.find("section", id=a)
        assert sec is not None, f"Missing section #{a}"
    print("PASS: All 3 top-level section anchors present (#overview, #details, #next-steps)")

    # 2. SVGs
    svgs = soup.find_all("svg")
    assert len(svgs) == 4, f"Expected 4 SVGs, got {len(svgs)}"
    for i, s in enumerate(svgs):
        assert s.get("viewbox"), f"SVG {i+1} missing viewbox"
        al = s.get("aria-labelledby")
        assert al, f"SVG {i+1} missing aria-labelledby"
        for tid in al.split():
            assert soup.find(id=tid) is not None, f"SVG {i+1} broken aria-labelledby id #{tid}"
    print("PASS: All 4 inline SVGs have valid viewBox and aria-labelledby targets")

    # 3. How to Answer Banner Verification
    hta = soup.find("aside", class_="how-to-answer-banner")
    assert hta is not None, "Missing .how-to-answer-banner"
    hta_text = hta.text
    assert "What it does → Why we chose it → Proof → Boundary" in hta_text, "Missing 4-step answering sequence in How to Answer banner"
    assert "Say This First" in hta_text, "Missing 'Say This First' instruction in banner"
    assert "First 10 Seconds Protocol" in hta_text, "Missing First 10 Seconds Protocol"
    assert "This is [story ID / feature name]. I will show the live behaviour first" in hta_text, "Missing exact 10-second opening formula"
    assert "This feature lets [role] do [business outcome]" in hta_text or "This feature lets" in hta_text, "Missing 5-sentence rehearsable answer template"
    assert "Done" in hta_text and "Partial" in hta_text and "Open defect" in hta_text and "Historical decision" in hta_text, "Missing legend items in banner"
    assert "A venue block can be created over confirmed bookings without being blocked" in hta_text, "Missing venue block precision guidance"

    # Top 3 Critical Examiner Traps & Role Rehearsal
    traps_panel = soup.find("div", class_="examiner-traps-panel")
    assert traps_panel is not None, "Missing .examiner-traps-panel"
    traps_text = traps_panel.text
    assert "Trap 1: Double-Booking Concurrency (Rule B)" in traps_text, "Missing Trap 1 in traps panel"
    assert "E06-S06 / SCRUM-50" in traps_text, "Trap 1 missing E06-S06 citation"
    assert "Trap 2: Operational Safety Review Workflow Split" in traps_text, "Missing Trap 2 in traps panel"
    assert "E08-S03 is Coordinator" in traps_text and "E08-S06" in traps_text, "Trap 2 missing E08-S03 vs E08-S06 split"
    assert "Trap 3: Defect Audit Boundary" in traps_text, "Missing Trap 3 in traps panel"

    role_panel = soup.find("div", class_="role-rehearsal-panel")
    assert role_panel is not None, "Missing .role-rehearsal-panel"
    assert "/organiser/new-request" in role_panel.text, "Role table missing /organiser/new-request"
    assert "/coordinator/queue" in role_panel.text, "Role table missing /coordinator/queue"
    assert "/venue/blockout" in role_panel.text, "Role table missing /venue/blockout"
    assert "/support/technicians" in role_panel.text, "Role table missing /support/technicians"
    assert "/safety/queue" in role_panel.text, "Role table missing /safety/queue"
    assert "/attendee/discover" in role_panel.text, "Role table missing /attendee/discover"
    print("PASS: How to Answer banner, Top 3 Examiner Traps & Mechanical Role Table verified")

    # 4. Top Likely Answers Panel
    top_panel = soup.find("div", class_="top-answers-panel")
    assert top_panel is not None, "Missing .top-answers-panel"
    top_chips = top_panel.find_all("button", class_="top-chip")
    chip_texts = [c.text for c in top_chips]
    expected_topics = ["Safety Review", "Venue Loss", "Booking Race", "Holds", "Attendee Capacity", "Outbox", "Scrum Velocity", "AI Governance", "Four Defects"]
    for exp in expected_topics:
        assert any(exp.lower() in ct.lower() for ct in chip_texts), f"Missing top likely answer chip for '{exp}'"

    # Verify every top likely answer query yields > 0 matches across indexed cards
    for chip in top_chips:
        q = chip.get("data-query").lower()
        clean_q = re.sub(r"[^a-z0-9]", "", q)
        matches = 0
        for card in soup.find_all(["article", "div"], class_=["story-card", "dossier-card", "defect-card", "decision-card", "clarification-card", "protocol-card"]):
            c_text = (card.get("data-alias", "") + " " + card.get("data-search", "") + " " + card.get("data-sid", "") + " " + card.text).lower()
            clean_text = re.sub(r"[^a-z0-9]", "", c_text)
            if q in c_text or (clean_q and clean_q in clean_text):
                matches += 1
        assert matches > 0, f"Chip '{chip.text}' (query='{q}') produced 0 search matches!"
    print(f"PASS: Top Likely Answers panel verified with {len(top_chips)} quick-jump chips (all yielding > 0 matches)")

    # 5. Wording Traps Verification
    # Case count explicit breakdown
    assert "391 functional story cases + 3 cross-cutting DoD/performance cases = 394 workbook cases" in text, "Missing explicit 391 + 3 = 394 case breakdown"
    # Obsolete change request explanation
    assert "When an event completes or is cancelled, the lifecycle service atomically marks its pending change requests Obsolete in the same transaction." in text, "Missing transaction-based obsolete change request explanation"
    assert "Obsolete by system trigger" not in text, "Found obsolete by system trigger (wording trap)"
    # Search performance & offline promise
    assert "instant local search for this static guide" in text, "Missing 'instant local search for this static guide'"
    assert "sub-millisecond" not in text.lower(), "Found 'sub-millisecond' search promise without measurement"
    # Defect radar badge
    assert "Admit honestly · do not count as Done" in text, "Missing 'Admit honestly · do not count as Done' badge"
    assert "Admit Honestly · Pass DoD" not in text, "Found 'Admit Honestly · Pass DoD' (wording trap)"
    print("PASS: All 3 examiner-visible wording traps & defect radar wording verified")

    # 6. GitHub Source and Test Links exist at HEAD
    blob_links = re.findall(r"https://github\.com/hongyime/sgConnectSphere2026/blob/main/([^\s\"\'<>#]+)", text)
    assert len(blob_links) >= 100, f"Expected at least 100 blob/main links, found {len(blob_links)}"
    missing_paths = [p for p in set(blob_links) if not Path(p).exists()]
    assert len(missing_paths) == 0, f"Found {len(missing_paths)} blob/main links pointing to missing paths: {missing_paths}"
    tracked_files = set(Path(p).as_posix() for p in subprocess.check_output(["git", "ls-files"]).decode("utf-8").splitlines())
    untracked_blob_links = [p for p in set(blob_links) if Path(p).as_posix() not in tracked_files]
    assert len(untracked_blob_links) == 0, f"Found blob/main links not tracked in git at HEAD: {untracked_blob_links}"
    print(f"PASS: All {len(set(blob_links))} GitHub blob/main links target existing files tracked at HEAD in Git")

    # 7. Stories Status & Run Evidence
    stories = soup.find_all("article", class_="story-card")
    assert len(stories) == 65, f"Expected 65 stories, got {len(stories)}"

    done_count = 0
    partial_count = 0
    defect_count = 0

    for s in stories:
        sid = s.get("data-sid")
        assert s.find("p", class_="hook-text"), f"{sid}: missing spoken hook"
        status = s.find("span", class_=re.compile(r"badge-(status|defect|partial)"))
        assert status, f"{sid}: missing status badge"
        assert "Known Limitation / Boundary:" in s.text, f"{sid}: missing limitation"

        owner_badge = s.find("span", class_="badge-owner")
        assert owner_badge is not None, f"{sid}: missing owner badge"
        assert "###" not in owner_badge.text, f"{sid}: invalid owner badge: {owner_badge.text}"
        assert len(owner_badge.text.strip()) > 3, f"{sid}: owner badge too short: {owner_badge.text}"

        # Evidence links
        links_container = s.find("div", class_="story-evidence-links")
        assert links_container is not None, f"{sid}: missing story-evidence-links"
        links = links_container.find_all(["a", "span"], class_="ev-link")
        assert len(links) >= 3, f"{sid}: only {len(links)} links, expected at least 3"

        if "✅ Done" in status.text:
            done_count += 1
            # Must have Run Evidence link
            run_link = links_container.find("a", class_="ev-link-run")
            assert run_link is not None, f"{sid}: Done story missing explicit 'ev-link-run' link"
            run_href = run_link.get("href", "")
            m_run = re.search(r"docs/testing/runs/([^#?]+)", run_href)
            assert m_run, f"{sid}: invalid run evidence link format {run_href}"
            run_file_path = Path("docs/testing/runs") / m_run.group(1)
            assert run_file_path.exists(), f"{sid}: linked run evidence file does not exist: {run_file_path}"

            # Assert run record contains runner and commit (reviewer/executor verification per T-65)
            run_content = run_file_path.read_text(encoding="utf-8")
            assert "runner:" in run_content, f"{sid}: run record {run_file_path} missing runner field"
            assert "commit:" in run_content, f"{sid}: run record {run_file_path} missing commit field"

            # Assert reviewer/acceptance evidence present
            pr_link = links_container.find("a", string=re.compile(r"Pull Request #\d+"))
            assert pr_link is not None, f"{sid}: Done story missing Pull Request link"
            owner_badge = s.find("span", class_="badge-owner")
            assert owner_badge and owner_badge.text.strip(), f"{sid}: missing owner badge"
        elif "⚠️ Partial" in status.text:
            partial_count += 1
            assert sid == "E06-S07", f"Unexpected partial story: {sid}"
        elif "🚨 Open Defect" in status.text:
            defect_count += 1
            assert sid in ["E03-S08", "E03-S09", "E03-S10", "E02-S05"], f"Unexpected defect story: {sid}"

        # Level 2 checks
        drawer = s.find("details", class_="story-lineage-drawer")
        assert drawer, f"{sid}: missing lineage drawer"
        ac_header = drawer.find("h4", string=re.compile(r"Given-When-Then Acceptance Criteria"))
        assert ac_header is not None, f"{sid}: missing AC header"
        assert len(ac_header.find_parent("div").text) > 30, f"{sid}: empty acceptance criteria"
        dod_header = drawer.find("h4", string=re.compile(r"Definition of Done Verification Checklist"))
        assert dod_header is not None, f"{sid}: missing DoD checklist header"
        assert len(dod_header.find_parent("div").find_all("li")) > 0, f"{sid}: empty DoD checklist items"
        assert "Technical Slice Architecture" in drawer.text, f"{sid}: missing tech slice"
        assert "All Associated Test Cases" in drawer.text, f"{sid}: missing test cases"

    assert done_count == 60, f"Expected 60 Done stories, got {done_count}"
    assert partial_count == 1, f"Expected 1 Partial story, got {partial_count}"
    assert defect_count == 4, f"Expected 4 Open Defect stories, got {defect_count}"
    print(f"PASS: All 65 stories verified (60 Done with verified run records, 1 Partial E06-S07, 4 Open Defects)")

    # 8. Defects Radar
    defects = soup.find_all("div", class_="defect-card")
    assert len(defects) == 4, f"Expected 4 defect cards, got {len(defects)}"
    for df in defects:
        did = df.find("span", class_="defect-id").text
        assert df.find("p", class_="hook-text"), f"{did}: missing spoken hook"
    assert soup.find("div", id="defect-branch-scrum-153") is not None, "Missing SCRUM-153 branch callout"
    print("PASS: Defects Radar has 4 defect cards with spoken defense hooks + unmerged branch callout")

    # 9. Team Decisions & Customer Clarifications
    decisions = soup.find_all("article", class_="decision-card")
    assert len(decisions) >= 104, f"Expected at least 104 decisions, got {len(decisions)}"
    clarifications = soup.find_all("article", class_="clarification-card")
    assert len(clarifications) >= 136, f"Expected at least 136 clarifications, got {len(clarifications)}"
    print(f"PASS: {len(decisions)} Team Decisions and {len(clarifications)} Customer Clarifications rendered")

    # 10. Dossiers
    dossiers = soup.find_all("article", class_="dossier-card")
    assert len(dossiers) == 12, f"Expected 12 dossiers, got {len(dossiers)}"
    for d in dossiers:
        d_id = d.get("id")
        assert d.find("p", class_="hook-text"), f"{d_id}: missing spoken hook"
    print("PASS: All 12 High-Risk Topic Dossiers present with spoken defense hooks")

    # 11. Alias matching verification
    d1 = soup.find(id="dossier-1")
    d1_alias = d1.get("data-alias", "")
    assert "pr408" in d1_alias and "pr426" in d1_alias, f"Dossier 1 missing individual PR aliases: {d1_alias}"
    d2 = soup.find(id="dossier-2")
    d2_alias = d2.get("data-alias", "")
    assert "pr234" in d2_alias and "pr378" in d2_alias, f"Dossier 2 missing individual PR aliases: {d2_alias}"
    d8 = soup.find(id="dossier-8")
    d8_alias = d8.get("data-alias", "")
    assert "pr355" in d8_alias and "pr367" in d8_alias, f"Dossier 8 missing individual PR aliases: {d8_alias}"
    s_e5s4 = soup.find(id="story-E05-S04")
    assert s_e5s4 is not None
    s_alias = s_e5s4.get("data-alias", "")
    assert "e5s4" in s_alias and "e05s04" in s_alias, f"E05-S04 missing e5s4 alias: {s_alias}"
    print("PASS: Multi-PR and story exact aliases verified (e5s4, pr426, pr367, etc.)")

    # 12. No machine-specific paths
    assert "C:\\Users" not in text, "Found C:\\Users in HTML"
    assert "C:/Users" not in text, "Found C:/Users in HTML"
    assert "Users\\bryan" not in text, "Found local user path in HTML"
    print("PASS: Zero machine-specific paths")

    # 13. Walkthrough.md verification
    wt_path = Path("walkthrough.md")
    assert wt_path.exists(), "Missing walkthrough.md at repository root"
    wt_text = wt_path.read_text(encoding="utf-8")
    assert "What it does → Why we chose it → Proof → Boundary" in wt_text, "walkthrough.md missing 4-step sequence"
    assert "5-Sentence Rehearsable Answer Pattern" in wt_text, "walkthrough.md missing 5-sentence template"
    assert "391 functional story cases + 3 cross-cutting DoD/performance cases = 394 workbook cases" in wt_text, "walkthrough.md missing case count breakdown"
    assert "python scripts/build_qna_prep_data.py" in wt_text, "walkthrough.md missing build instructions"
    assert "python scripts/test_qna_prep_app.py" in wt_text, "walkthrough.md missing test instructions"
    print("PASS: walkthrough.md verified at repository root with all required defense and build guidelines")

    # 14. Hamburger Side Drawer & 7 Views Navigation
    sidebar = soup.find("aside", id="app-sidebar")
    assert sidebar is not None, "Missing #app-sidebar"
    assert sidebar.get("aria-label") == "Main Navigation", "Sidebar missing aria-label='Main Navigation'"
    assert soup.find("button", id="drawer-toggle") is not None, "Missing #drawer-toggle button"
    assert soup.find("div", id="drawer-backdrop") is not None, "Missing #drawer-backdrop"

    expected_views = [
        "view-how-to-answer",
        "view-live-demo",
        "view-slides",
        "view-defects-radar",
        "view-dossiers",
        "view-stories",
        "view-vault",
        "view-architecture",
        "view-runbook",
    ]
    nav_tabs = sidebar.find_all("button", class_="nav-tab")
    tab_views = [t.get("data-view") for t in nav_tabs]
    for ev in expected_views:
        assert ev in tab_views, f"Missing nav tab for view: {ev}"
        assert soup.find("div", id=ev) is not None, f"Missing view panel: #{ev}"
    print(f"PASS: Hamburger side drawer and all {len(expected_views)} focused view panels verified")

    # 15. Contextual Per-Section Search Bars
    story_search = soup.find("input", id="story-search-input")
    assert story_search is not None, "Missing #story-search-input in Stories view"
    assert story_search.find_parent("div", id="view-stories") is not None, "#story-search-input must be inside #view-stories"
    vault_search = soup.find("input", id="vault-search-input")
    assert vault_search is not None, "Missing #vault-search-input in Vault view"
    assert vault_search.find_parent("div", id="view-vault") is not None, "#vault-search-input must be inside #view-vault"
    assert len(soup.find_all("form")) == 0, "No <form> tags permitted (must use custom search inputs)"
    print("PASS: Dedicated contextual search bars verified in Stories and Vault views (zero <form> tags)")

    # 16. ADR & BDR Decision Vault & Story Lineage Badges
    adr_cards = soup.find_all("article", class_="adr-card")
    assert len(adr_cards) == 19, f"Expected 19 ADR cards, got {len(adr_cards)}"
    for i in range(1, 20):
        aid = f"ADR-{i:03d}"
        card = soup.find("article", id=f"adr-{aid}")
        assert card is not None, f"Missing ADR card for {aid}"
        link = card.find("a", href=re.compile(rf"blob/main/docs/adr/{aid}.*\.md$"))
        assert link is not None, f"{aid} missing GitHub link to docs/adr/"

    story_blocks = soup.find_all("div", class_="story-bdr-adr-block")
    assert len(story_blocks) == 65, f"Expected 65 story BDR/ADR lineage blocks, got {len(story_blocks)}"
    for block in story_blocks:
        chips = block.find_all(["a", "span"], class_="chip")
        assert len(chips) >= 1, "Story BDR/ADR lineage block has no chips"
    print(f"PASS: ADR & BDR Vault verified with all 19 ADR cards and 65 story architectural lineage blocks")

    # 17. Defects Radar Git Reconciliation Verification
    recon_banner = soup.find("div", id="defect-branch-scrum-153")
    assert recon_banner is not None, "Missing #defect-branch-scrum-153 banner"
    recon_text = recon_banner.text
    assert "SCRUM-261 was merged to main" in recon_text, "Reconciliation banner missing SCRUM-261 merge facts"
    assert "PR #450" in recon_text and "a8f2d879" in recon_text, "Missing PR #450 commit a8f2d879"
    assert "0027_event_assignment_actor.sql" in recon_text, "Missing migration 0027 citation"
    assert "D-04" in recon_text and "single genuine open defect" in recon_text.lower(), "Missing D-04 single genuine open defect explanation"

    d1_card = soup.find("div", id="defect-d-01")
    assert "SCRUM-261" in d1_card.text, "D-01 card missing SCRUM-261 citation"
    d4_card = soup.find("div", id="defect-d-04")
    assert "Deliberately Withheld" in d4_card.text or "withheld" in d4_card.text.lower(), "D-04 card missing deliberate withhold explanation"
    print("PASS: Defects Radar Git reality & SCRUM-261 HEAD reconciliation verified")

    # 18. Story Cards Explicit data-status & Filter Integrity
    data_status_done = soup.find_all("article", class_="story-card", attrs={"data-status": "done"})
    data_status_partial = soup.find_all("article", class_="story-card", attrs={"data-status": "partial"})
    data_status_defect = soup.find_all("article", class_="story-card", attrs={"data-status": "defect"})
    assert len(data_status_done) == 60, f"Expected 60 data-status='done', got {len(data_status_done)}"
    assert len(data_status_partial) == 1, f"Expected 1 data-status='partial', got {len(data_status_partial)}"
    assert len(data_status_defect) == 4, f"Expected 4 data-status='defect', got {len(data_status_defect)}"
    # Confirm D-01..D-03 never carry data-status='done'
    for sid in ["E03-S08", "E03-S09", "E03-S10", "E02-S05"]:
        sc = soup.find("article", id=f"story-{sid}")
        assert sc.get("data-status") == "defect", f"{sid} must have data-status='defect'"
    print("PASS: Story cards explicit data-status attributes verified (60 done, 1 partial, 4 defect)")

    # 19. 12 Topic Dossiers Quick-Jump Category Chips
    dossier_chips = soup.find_all("button", class_="dossier-filter-chip")
    assert len(dossier_chips) >= 6, f"Expected at least 6 dossier filter chips, got {len(dossier_chips)}"
    dossier_jumps = soup.find_all("button", class_="dossier-jump-chip")
    assert len(dossier_jumps) == 12, f"Expected 12 dossier quick jump buttons, got {len(dossier_jumps)}"
    for d in dossiers:
        assert d.get("data-category"), f"{d.get('id')} missing data-category"
    print("PASS: 12 Topic Dossiers quick-jump category chips and data-category attributes verified")

    # 20. Story BDR & ADR Badges with Informative Summaries
    chip_descs = soup.find_all("span", class_="chip-desc")
    assert len(chip_descs) >= 100, f"Expected at least 100 chip summaries in story cards, got {len(chip_descs)}"
    for cd in chip_descs[:10]:
        assert len(cd.text.strip()) > 3, f"Chip summary too short: '{cd.text}'"
    print(f"PASS: Story BDR & ADR badges verified with {len(chip_descs)} informative summary spans")

    # 21. Section Nesting & View Isolation (No Footer Leaks)
    sec_overview = soup.find("section", id="overview")
    assert sec_overview.find("div", id="view-how-to-answer") is not None
    assert sec_overview.find("div", id="view-runbook") is None, "view-runbook must not be in overview"

    sec_details = soup.find("section", id="details")
    for v in ["view-live-demo", "view-slides", "view-defects-radar", "view-dossiers", "view-stories", "view-vault", "view-architecture"]:
        assert sec_details.find("div", id=v) is not None, f"#{v} missing from section #details"

    sec_next_steps = soup.find("section", id="next-steps")
    runbook_view = sec_next_steps.find("div", id="view-runbook")
    assert runbook_view is not None, "view-runbook must be inside #next-steps"
    assert runbook_view.find("div", class_="team-grid") is not None, ".team-grid must be inside view-runbook"
    print("PASS: Section nesting and view isolation verified (zero footer leakage across views)")

    # 22. Production Credentials Matrix & Sticky Strip Verification
    cred_drawer = soup.find("aside", id="credentials-drawer")
    assert cred_drawer is not None, "Missing #credentials-drawer"
    cred_strip = soup.find("div", id="sticky-credentials-bar")
    assert cred_strip is not None, "Missing #sticky-credentials-bar"

    expected_accounts = [
        ("Aaron", "venue_staff", "aaron.koh.2024@smu.edu.sg"),
        ("Amareet", "event_coordinator", "amareetk.m.2024@smu.edu.sg"),
        ("Ji Ning", "event_organiser", "jining.yee.2024@smu.edu.sg"),
        ("Lexin", "technical_support_staff", "lexin.phun.2024@smu.edu.sg"),
        ("XY", "attendee", "xy.sim.2024@smu.edu.sg"),
        ("Bryan", "safety_officer", "bryanseah234@gmail.com"),
    ]
    for name, role, email in expected_accounts:
        assert email in cred_drawer.text, f"Credentials drawer missing email: {email}"
        assert role in cred_drawer.text, f"Credentials drawer missing role: {role}"
        assert any(c.get("data-copy") == email for c in cred_drawer.find_all(attrs={"data-copy": True})), f"Missing data-copy button for {email}"

    # Verify Password123! in copy buttons
    pw_copy_btns = soup.find_all(attrs={"data-copy": "Password123!"})
    assert len(pw_copy_btns) >= 7, f"Expected at least 7 Password123! copy buttons, got {len(pw_copy_btns)}"

    expected_launch_routes = {
        "Aaron": "/venue/blockout",
        "Amareet": "/coordinator/queue",
        "Ji Ning": "/organiser/new-request",
        "Le Xin": "/support/technicians",
        "Xiang Ying": "/attendee/discover",
        "Bryan": "/safety/queue",
    }
    for card in cred_drawer.find_all("div", class_="cred-account-card"):
        c_name = card.find("span", class_="cred-name").text.strip()
        matches = [k for k in expected_launch_routes if k in c_name]
        assert len(matches) > 0, f"Unknown account card: {c_name}"
        short = matches[0]
        expected_route = expected_launch_routes[short]
        launch_link = card.find("a", class_="cred-launch-link")
        assert launch_link is not None and expected_route in launch_link.get("href", ""), f"Wrong launch route for {short}: expected {expected_route}"
    assert "Ephemeral" in text, "Missing ephemeral testbed accounts notice"
    print("PASS: Production role credentials drawer & sticky bar verified (6 accounts + Password123! copy buttons + verified routes)")

    # 23. 7-Step Live Demonstration Protocol on all 65 Stories
    for s in stories:
        sid = s.get("data-sid")
        proto = s.find("div", class_="story-demo-protocol")
        assert proto is not None, f"{sid}: missing .story-demo-protocol"

        # Check all 7 step panels exist
        for step_idx in range(1, 8):
            panel = proto.find("div", id=f"demo-p{step_idx}-{sid}")
            assert panel is not None, f"{sid}: missing demo panel #demo-p{step_idx}-{sid}"

        # Step 1: Live app demo & navigation path
        p1 = proto.find("div", id=f"demo-p1-{sid}")
        assert "https://sgconnectsphere.vercel.app" in p1.text or p1.find("a", href=re.compile(r"https://sgconnectsphere\.vercel\.app")), f"{sid}: Step 1 missing Vercel app link"
        assert "Navigation Click Path:" in p1.text, f"{sid}: Step 1 missing navigation click path"

        # Step 2: Jira story link
        p2 = proto.find("div", id=f"demo-p2-{sid}")
        assert p2.find("a", href=re.compile(r"theprawnworkspace\.atlassian\.net/browse/SCRUM-")), f"{sid}: Step 2 missing Jira link"
        assert "PO Acceptance:" in p2.text, f"{sid}: Step 2 missing PO acceptance"

        # Step 3: GitHub PR link, Author, Reviewer, Commit SHA
        p3 = proto.find("div", id=f"demo-p3-{sid}")
        assert p3.find("a", href=re.compile(r"github\.com/.*/pull/")), f"{sid}: Step 3 missing GitHub PR link"
        assert "Author:" in p3.text, f"{sid}: Step 3 missing Author"
        assert "###" not in p3.text, f"{sid}: Step 3 has invalid Author (###)"
        assert "Reviewer:" in p3.text, f"{sid}: Step 3 missing Reviewer"
        assert "Commit:" in p3.text or re.search(r"[0-9a-f]{7,8}", p3.text), f"{sid}: Step 3 missing Commit SHA"

        # Step 4: CI Workflow run link
        p4 = proto.find("div", id=f"demo-p4-{sid}")
        assert p4.find("a", href=re.compile(r"github\.com/.*/actions")), f"{sid}: Step 4 missing GitHub Actions CI link"
        assert "pr-conventions" in p4.text, f"{sid}: Step 4 missing CI check list"

        # Step 5: Test Cases with EP & BVA
        p5 = proto.find("div", id=f"demo-p5-{sid}")
        assert "Equivalence Partitioning (EP):" in p5.text, f"{sid}: Step 5 missing EP header"
        assert "Boundary Value Analysis (BVA):" in p5.text, f"{sid}: Step 5 missing BVA header"
        assert "Real PostgreSQL Isolation" in p5.text, f"{sid}: Step 5 missing real DB rationale"

        # Step 6: Presentation Slide Anchor (1-17)
        p6 = proto.find("div", id=f"demo-p6-{sid}")
        m_slide = re.search(r"Slide (\d+):", p6.text)
        assert m_slide is not None, f"{sid}: Step 6 missing Slide number citation"
        slide_num = int(m_slide.group(1))
        assert 1 <= slide_num <= 17, f"{sid}: invalid slide number {slide_num}"
        assert p6.find("a", href=f"#slide-card-{slide_num}") is not None, f"{sid}: Step 6 missing jump link to #slide-card-{slide_num}"

        # Step 7: Historical Postplan
        p7 = proto.find("div", id=f"demo-p7-{sid}")
        assert p7.find("a", href=re.compile(r"\.html$")), f"{sid}: Step 7 missing postplan HTML link"

    # Assert commit 0d1609d8 appears exactly once (on E07-S08 only)
    assert len(re.findall(r"0d1609d8", text)) == 1, "commit 0d1609d8 must only appear on E07-S08"
    # Assert E06-S06 is the concurrency story
    e6s6_proto = soup.find("div", attrs={"data-sid": "E06-S06"})
    assert "3ac65827" in e6s6_proto.text and "378" in e6s6_proto.text, "E06-S06 missing PR #378 / commit 3ac65827"
    # Assert E08-S03 is Coordinator readiness and E08-S06 is Safety Officer
    e8s3_proto = soup.find("div", attrs={"data-sid": "E08-S03"})
    assert "Event Coordinator" in e8s3_proto.find("span", class_="demo-protocol-role-hint").text, "E08-S03 acting role must be Event Coordinator"
    e8s6_proto = soup.find("div", attrs={"data-sid": "E08-S06"})
    assert "Safety Officer" in e8s6_proto.find("span", class_="demo-protocol-role-hint").text, "E08-S06 acting role must be Safety Officer"
    print("PASS: 7-Step Live Demonstration Protocol verified across all 65 stories (Live Demo, Jira, PR, CI, EP/BVA, Slide, Postplan + Concurrency/Safety lineage)")

    # 24. Week 11 Presentation Companion (All 17 Slides)
    slides_view = soup.find("div", id="view-slides")
    assert slides_view is not None, "Missing #view-slides"
    slide_cards = slides_view.find_all("article", class_="slide-card")
    assert len(slide_cards) == 17, f"Expected 17 slide cards, got {len(slide_cards)}"

    for s_idx in range(1, 18):
        sc = soup.find("article", id=f"slide-card-{s_idx}")
        assert sc is not None, f"Missing #slide-card-{s_idx}"
        assert sc.find("p", class_="slide-q-text") is not None, f"Slide {s_idx} missing question text"
        assert sc.find("div", class_="slide-content-text") is not None, f"Slide {s_idx} missing content text"
        assert sc.find("div", class_="slide-notes-text") is not None, f"Slide {s_idx} missing speaker notes text"
        assert "Spoken Defense Response" in sc.text, f"Slide {s_idx} missing spoken defense response"
    print(f"PASS: Week 11 Presentation Companion verified with all 17 slides and complete defense dossiers")

    # 25. Document strictly contains zero duplicate IDs
    all_elements_with_id = soup.find_all(attrs={"id": True})
    id_counts = Counter([el["id"] for el in all_elements_with_id])
    duplicate_ids = [i for i, count in id_counts.items() if count > 1]
    assert len(duplicate_ids) == 0, f"Found duplicate IDs in document: {duplicate_ids}"
    print("PASS: Document strictly contains zero duplicate IDs across all elements")

    print("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY.")


if __name__ == "__main__":
    run_tests()
