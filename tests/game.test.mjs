import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const runtimeSource = fs.readFileSync(path.join(root, "assets/js/runtime.js"), "utf8");
const netizenSource = fs.readFileSync(path.join(root, "assets/js/netizen-pack.js"), "utf8");
const characterVoicesSource = fs.readFileSync(path.join(root, "assets/js/character-voices.js"), "utf8");
const timelineVariantsSource = fs.readFileSync(path.join(root, "assets/js/timeline-variants.js"), "utf8");
const endingSource = fs.readFileSync(path.join(root, "assets/js/ending-system.js"), "utf8");
const gameSource = fs.readFileSync(path.join(root, "assets/js/game.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "assets/css/game.css"), "utf8");

function inlineScript(source) {
  return `<script>${source.replaceAll("</script", "<\\\\/script")}</script>`;
}

function testHtml({ expose = false } = {}) {
  let game = gameSource;
  if (expose) {
    const marker = "\n})();\n\ndocument.documentElement.dataset.gameReady";
    assert.ok(game.includes(marker), "game test hook marker must exist");
    game = game.replace(
      marker,
      '\n  window.__PN_TEST__ = { state, phases, phaseRosters, specialEvents, eventChoices, castEntries, monthlyRosterSchedule, monthlyRosterFor, voicePostHtml, hashtagHtml, actionDefs, actionPresentation, currentIssue, makeComment, discussionComment, contextualComment, npcReaction, npcReactionMode, updateEngagement };\n})();\n\ndocument.documentElement.dataset.gameReady',
    );
  }

  return indexSource
    .replace('<link rel="stylesheet" href="assets/css/game.css" />', "")
    .replace('<script src="assets/js/runtime.js" defer></script>', () => inlineScript(runtimeSource))
    .replace('<script src="assets/js/netizen-pack.js" defer></script>', () => inlineScript(netizenSource))
    .replace('<script src="assets/js/character-voices.js" defer></script>', () => inlineScript(characterVoicesSource))
    .replace('<script src="assets/js/timeline-variants.js" defer></script>', () => inlineScript(timelineVariantsSource))
    .replace('<script src="assets/js/ending-system.js" defer></script>', () => inlineScript(endingSource))
    .replace('<script src="assets/js/game.js" defer></script>', () => inlineScript(game));
}

function createDom({ expose = false, beforeParse } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (error) => errors.push(error));
  const dom = new JSDOM(testHtml({ expose }), {
    runScripts: "dangerously",
    url: "https://japutraa.github.io/perang-narasi-republik-timeline/",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse,
  });
  return { dom, errors };
}

async function tick(window) {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

test("release references only files that are present", () => {
  const required = [
    "index.html",
    "assets/css/game.css",
    "assets/js/runtime.js",
    "assets/js/netizen-pack.js",
    "assets/js/character-voices.js",
    "assets/js/timeline-variants.js",
    "assets/js/ending-system.js",
    "assets/js/game.js",
    "assets/icons/icon.svg",
    "manifest.webmanifest",
    "sw.js",
    "README.md",
    "LICENSE",
  ];
  required.forEach((file) => assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`));
  assert.doesNotMatch(indexSource, /<style(?:\s|>)/i, "CSS must not be embedded in index.html");
  assert.doesNotMatch(indexSource, /<script(?![^>]+src=)[^>]*>/i, "JavaScript must not be embedded in index.html");
  assert.match(indexSource, /meta name="version" content="3\.16\.0"/);
  assert.match(gameSource, /SAVE_KEY = "perang-narasi-save-v3"/);
  assert.match(gameSource, /Prof\. Konni BaksLaah/);
  assert.match(gameSource, /Mas Nadim Makaroni/);
  assert.match(gameSource, /Bu Nanik Nasi-Doyang/);
  assert.match(gameSource, /dr\. Tan Sehat-Yen/);
  assert.doesNotMatch(gameSource, /Konni Bakso-Rie/);
  assert.doesNotMatch(gameSource, /Purba-Yaya|Felix Si-Auw|Dandhy Lensono|Akbar Fasal|Gita Wira-Wacana|Latah-Hitung/);
  assert.match(netizenSource, /BOT JUDOL NYASAR/);
  assert.match(netizenSource, /Anjing|Bangsat/);
  assert.match(netizenSource, /ARSIP FUFUFAFA • PEMILIK BELUM TERBUKTI/);
  assert.match(timelineVariantsSource, /Satuan Penjilat Pak Gemoyono–Mas Samsul/);
  assert.match(timelineVariantsSource, /fufufafa-memorable-quotes/);
  assert.match(endingSource, /SULTAN INVOICE, FAKIR NURANI/);
  assert.doesNotMatch(gameSource, /CATATAN ADMIN AKTIVIS|editorial-cut/);
  assert.doesNotMatch(cssSource, /editorial-cut/);
  assert.doesNotMatch(cssSource, /\.future-label/);
  assert.match(cssSource, /\.feed-head h2\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(cssSource, /\.issue-hashtag\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test("comment threads stay tied to the selected card and speaker stance", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  const api = dom.window.__PN_TEST__;

  const custom = api.makeComment(
    "bad",
    "Kartu Uji Crop Grafik membahas audit vendor, bukan isu lain.",
    { persona: "rageCitizen", actionId: "data", actionName: "Kartu Uji Crop Grafik", issueKey: "uji-komentar" },
  );
  assert.match(custom.text, /Kartu Uji Crop Grafik/i, "a contextual body must not be replaced by a persona's stock line");
  assert.match(custom.text, /audit vendor/i);
  assert.equal(custom.isNoise, false);

  const noise = api.makeComment("neutral", null, {
    persona: "judol",
    kind: "noise",
    isNoise: true,
    actionId: "data",
    actionName: "Kartu Uji Crop Grafik",
    issueKey: "uji-komentar",
  });
  assert.equal(noise.isNoise, true);
  assert.equal(noise.persona, "judol");

  api.state.role = "buzzer";
  api.state.phase = 0;
  api.state.day = 1;
  api.state.runSeed = 1817;
  api.state.comments = [];
  api.state.postMetrics = { views: 0, likes: 0, reposts: 0, replies: 0 };
  api.state.actionBuffs = [];
  const issue = api.currentIssue();
  const dataAction = api.actionDefs.buzzer.find((action) => action.id === "data");
  const display = {
    name: "Crop Grafik Harga Beras",
    desc: "Pilih potongan angka yang paling nyaman.",
    context: "Uji komentar action-linked",
  };
  api.updateEngagement(dataAction, 27, false, display, 0);

  const linked = api.state.comments.filter((comment) => comment.actionId === "data");
  const core = linked.filter((comment) => !comment.isNoise);
  const supplements = linked.filter((comment) => comment.isNoise);
  assert.ok(core.length >= 4, "each action needs a coherent core thread");
  core.forEach((comment) => {
    assert.equal(comment.actionName, display.name);
    assert.equal(comment.issueKey, issue.key);
    assert.ok(comment.text.toLowerCase().includes(display.name.toLowerCase()), `${comment.handle} lost the selected action context`);
  });
  assert.ok(supplements.length <= 1, "noise must remain a supplement, not the thread");
  supplements.forEach((comment) => assert.ok(["seller", "judol", "cryptoBro"].includes(comment.persona)));
  assert.equal(linked.some((comment) => comment.kind === "hint"), false, "future trend chatter must not interrupt an action thread");

  const fakeIssue = (stance) => ({
    key: `stance-${stance}`,
    title: "#AuditDapur",
    subject: "audit vendor dapur sekolah",
    document: "kontrak dan hasil uji laboratorium",
    people: "murid dan orang tua",
    npc: stance === "regime" ? "Pak Jenderal Gemoyono" : stance === "archive" ? "Akun Forum yang Tidak Mau Mati" : "Fatima Footnote",
    handle: `@${stance}`,
    avatar: "👤",
    stance,
  });
  const badDisplay = { name: "Crop Grafik Vendor", desc: "", context: "" };
  const goodAction = api.actionDefs.aktivis.find((action) => action.id === "data");
  const goodDisplay = { name: "Buka Kontrak Vendor", desc: "", context: "" };

  api.state.role = "buzzer";
  const regimeAlly = api.npcReaction(fakeIssue("regime"), dataAction, false, badDisplay);
  const criticOpponent = api.npcReaction(fakeIssue("critic"), dataAction, false, badDisplay);
  assert.equal(regimeAlly.reactionMode, "defend", "a regime account must not denounce its own buzzer tactic");
  assert.equal(criticOpponent.reactionMode, "oppose", "a critic must challenge a manipulative buzzer tactic");

  api.state.role = "aktivis";
  const criticAlly = api.npcReaction(fakeIssue("critic"), goodAction, true, goodDisplay);
  const regimeOpponent = api.npcReaction(fakeIssue("regime"), goodAction, true, goodDisplay);
  const institution = api.npcReaction(fakeIssue("institutional"), goodAction, true, goodDisplay);
  const archive = api.npcReaction(fakeIssue("archive"), dataAction, false, badDisplay);
  assert.equal(criticAlly.reactionMode, "support");
  assert.equal(regimeOpponent.reactionMode, "resist");
  assert.equal(institution.reactionMode, "verify");
  assert.equal(archive.reactionMode, "archiveBad");
  [regimeAlly, criticOpponent, criticAlly, regimeOpponent, institution, archive].forEach((comment) => {
    assert.match(comment.text, /audit vendor dapur sekolah|kontrak dan hasil uji laboratorium|murid dan orang tua/i);
    assert.equal(comment.isNoise, false);
  });

  for (const role of ["buzzer", "aktivis"]) {
    api.state.role = role;
    for (const action of api.actionDefs[role]) {
      const good = action.int >= 0 && action.dem >= 0;
      for (const stance of ["regime", "critic", "institutional", "archive"]) {
        const actionDisplay = { name: `Uji ${role} ${action.id}`, desc: "", context: "" };
        const reply = api.npcReaction(fakeIssue(stance), action, good, actionDisplay);
        assert.equal(reply.actionId, action.id);
        assert.equal(reply.actionName, actionDisplay.name);
        assert.equal(reply.stance, stance);
        assert.ok(reply.reactionMode, `${role}/${action.id}/${stance} has no reaction mode`);
        assert.match(reply.text, new RegExp(actionDisplay.name, "i"));
        assert.equal(reply.isNoise, false);
      }
    }
  }

  dom.window.close();
});

function displayText(value, seen = new Set()) {
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? "" : value;
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  const technicalKeys = new Set(["id", "key", "sourceKey", "arc", "teaser", "themes", "weak", "resist", "actionIds", "characterId"]);
  return Object.entries(value)
    .filter(([key]) => !technicalKeys.has(key))
    .map(([, item]) => displayText(item, seen)).join("\n");
}

test("all displayed political figures use parody aliases", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  const api = dom.window.__PN_TEST__;
  const variants = api.phases.flatMap((phase, phaseIndex) => phase.days.flatMap((issue, dayIndex) =>
    dom.window.PNTimelineVariants.build(issue, { phaseIndex, dayIndex })));
  const renderedData = displayText({
    phases: api.phases,
    rosters: api.phaseRosters,
    events: api.specialEvents,
    cast: [...api.castEntries("power"), ...api.castEntries("activist")],
    variants,
  });
  const realNamePattern = /\b(?:Prabowo|Jokowi|Joko Widodo|Gibran|Kaesang(?: Pangarep)?|Nadiem|Teddy Indra Wijaya|Bahlil|Hasan Nasbi|Purbaya Yudhi Sadewa|Sri Mulyani|Puan Maharani|Megawati Soekarnoputri|Connie(?: Rahakundini Bakrie| Bakrie)?|Nanik(?: Sudaryati)? S\.? Deyang|Tan Shot Yen|Anies Baswedan|Ganjar Pranowo|Tiyo Ardianto|Yanuar Nugroho|Yanuar Risky Banget)\b/i;
  const leakedName = renderedData.match(realNamePattern);
  assert.equal(leakedName, null, `real political name leaked into display: ${leakedName?.[0]}`);
  assert.match(renderedData, /Risky Februari/);
  assert.match(renderedData, /Mayor Tedi Ketok-Pintu/);
  assert.match(renderedData, /Bu Nanik Nasi-Doyang/);
  assert.match(renderedData, /dr\. Tan Sehat-Yen/);
  assert.doesNotMatch(renderedData, /Mayor Tedi (?!Ketok-Pintu)/);
  dom.window.close();
});

test("Tokoh catalogue includes every six-phase roster entry", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  const api = dom.window.__PN_TEST__;
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));

  for (const [role, group] of [["buzzer", "power"], ["aktivis", "activist"]]) {
    const catalogue = new Set(api.castEntries(group).map((entry) => entry.name));
    api.phaseRosters[role].flat().forEach((character) => {
      assert.ok(catalogue.has(character.name), `${character.name} missing from ${group} catalogue`);
    });
  }
  dom.window.close();
});

test("character voice engine covers every roster and focal timeline account", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  const api = dom.window.__PN_TEST__;
  const voices = dom.window.PNCharacterVoices;
  assert.ok(voices, "character voice module did not load");

  const roster = [...new Map(
    Object.values(api.phaseRosters).flat(2).map((character) => [character.id, character]),
  ).values()];
  assert.equal(roster.length, 59);
  assert.deepEqual(new Set(voices.rosterProfileIds), new Set(roster.map((character) => character.id)));

  const rendered = roster.map((character, index) => {
    const profile = voices.resolve({ id: character.id, name: character.name });
    assert.equal(profile.id, character.id, `${character.name} fell through to ${profile.id}`);
    assert.notEqual(profile.sourceKind, "fallback");
    if (profile.sourceKind === "researched") {
      assert.ok(profile.sources.length >= 1, `${character.name} has no public style source`);
    }
    const post = voices.renderPost({
      id: character.id,
      name: character.name,
      phase: index % 6,
      seed: 7001 + index,
      issue: {
        subject: "audit anggaran dan tanggung jawab program",
        document: "kontrak, metodologi, dan laporan audit",
        people: "warga yang membayar dan menerima layanan",
      },
      base: "Program disebut berhasil. Dokumen baru dibuka setelah kritik membesar.",
    });
    assert.notEqual(post.profileId, "fallback");
    assert.notEqual(post.label, "MODE AKUN TIMELINE");
    assert.ok(post.text.length >= 90, `${character.name} voice is too thin`);
    return post.text;
  });
  assert.ok(new Set(rendered).size >= 57, "roster voices are still collapsing into generic copy");

  const variants = api.phases.flatMap((phase, phaseIndex) => phase.days.flatMap((issue, dayIndex) =>
    dom.window.PNTimelineVariants.build(issue, { phaseIndex, dayIndex })));
  const missing = [...new Set(variants
    .filter((variant) => voices.resolve({ name: variant.npc, handle: variant.handle }).id === "fallback")
    .map((variant) => variant.npc))];
  assert.deepEqual(missing, [], `timeline speakers without a fingerprint: ${missing.join(", ")}`);

  const gemoyCampaign = voices.renderPost({
    id: "gemoyono", phase: 0, seed: 11,
    issue: { subject: "kampanye", document: "rekam jejak", people: "pemilih" },
    base: "Kampanye harus riang dan citra dibuat lebih lunak.",
  }).text;
  const gemoyGovernment = voices.renderPost({
    id: "gemoyono", phase: 2, seed: 11,
    issue: { subject: "program strategis", document: "laporan", people: "warga" },
    base: "Menteri diminta bergerak cepat dan kritik disebut omon-omon.",
  }).text;
  assert.match(gemoyCampaign, /pemilu harus gembira|joget/i);
  assert.doesNotMatch(gemoyCampaign, /semua jajaran bergerak/i);
  assert.match(gemoyGovernment, /semua jajaran bergerak|omon-omon/i);

  const displayVoices = displayText(rendered);
  assert.doesNotMatch(displayVoices, /\b(?:Prabowo|Jokowi|Gibran|Bahlil|Purbaya|Megawati|Puan Maharani|Nadiem|Teddy Indra Wijaya)\b/i);
  dom.window.close();
});

test("every roster character is scheduled before a phase ends", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  const api = dom.window.__PN_TEST__;
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  for (const role of ["buzzer", "aktivis"]) {
    api.phaseRosters[role].forEach((roster, phaseIndex) => {
      assert.ok(roster.length >= 9, `${role}/phase ${phaseIndex + 1} needs a broad rotation pool`);
      assert.equal(new Set(roster.map((character) => character.id)).size, roster.length, `${role}/phase ${phaseIndex + 1} has duplicate crew IDs`);
      const schedule = api.monthlyRosterSchedule(role, phaseIndex);
      assert.equal(schedule.length, 12, `${role}/phase ${phaseIndex + 1} month count`);
      schedule.forEach((month, monthIndex) => {
        assert.equal(month.length, 3, `${role}/${phaseIndex + 1}/${monthIndex + 1}`);
        assert.equal(new Set(month.map((character) => character.id)).size, 3, `${role}/${phaseIndex + 1}/${monthIndex + 1} repeats a card`);
        if (monthIndex > 0) {
          const previous = new Set(schedule[monthIndex - 1].map((character) => character.id));
          month.forEach((character) => assert.ok(!previous.has(character.id), `${character.name} appears in consecutive months for ${role}/phase ${phaseIndex + 1}`));
        }
      });
      const appeared = new Set(schedule.flat().map((character) => character.id));
      const appearanceCounts = schedule.flat().reduce((counts, character) => counts.set(character.id, (counts.get(character.id) || 0) + 1), new Map());
      appearanceCounts.forEach((count, id) => assert.ok(count <= 5, `${id} is overexposed (${count} months) in ${role}/phase ${phaseIndex + 1}`));
      roster.forEach((character) => assert.ok(appeared.has(character.id), `${character.name} skipped in ${role}/phase ${phaseIndex + 1}`));
    });
  }
  dom.window.close();
});

for (const [role, startMoney, jumpMoney] of [
  ["buzzer", 12000000000, 28000000000],
  ["aktivis", 650000000, 1600000000],
]) {
  test(`Mode Bebas starts and jumps phases for ${role}`, async () => {
    const { dom, errors } = createDom({ expose: true });
    const { window } = dom;
    const { document } = window;
    await tick(window);

    document.querySelector("#freeModeBtn").click();
    document.querySelector('[data-free-phase="3"]').click();
    document.querySelector(`[data-role="${role}"]`).click();

    let state = window.__PN_TEST__.state;
    assert.equal(state.gameMode, "free");
    assert.equal(state.phase, 3);
    assert.equal(state.day, 1);
    assert.equal(state.money, startMoney);
    assert.equal(state.career, 36);
    assert.doesNotMatch(document.querySelector("#modalContent").textContent, /TIMELINE ALTERNATIF/);
    document.querySelector("#phaseStartBtn").click();
    await tick(window);
    assert.ok(!document.querySelector("#freeJumpBtn").classList.contains("hidden"));
    assert.doesNotMatch(document.querySelector("#issueTitle").textContent, /TIMELINE ALTERNATIF/);

    document.querySelector("#freeJumpBtn").click();
    document.querySelector('[data-jump-phase="5"]').click();
    state = window.__PN_TEST__.state;
    assert.equal(state.phase, 5);
    assert.equal(state.day, 1);
    assert.equal(state.money, jumpMoney);
    assert.equal(state.career, 60);
    assert.ok(document.querySelector("#phaseStartBtn"));
    assert.doesNotMatch(document.querySelector("#modalContent").textContent, /TIMELINE ALTERNATIF/);
    assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
    dom.window.close();
  });
}

test("modular build boots and starts a campaign", async () => {
  const { dom, errors } = createDom({ expose: true });
  const { document } = dom.window;
  await tick(dom.window);

  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  assert.equal(document.documentElement.dataset.gameReady, "true");
  document.querySelector('[data-role="buzzer"]').click();
  document.querySelector("#phaseStartBtn").click();
  await tick(dom.window);

  assert.ok(document.querySelector("#startScreen").classList.contains("hidden"));
  assert.ok(!document.querySelector("#gameScreen").classList.contains("hidden"));
  assert.ok(document.querySelectorAll("#cards .action-card").length > 0);
  const issueTitle = document.querySelector("#issueTitle");
  assert.match(issueTitle.textContent, /TIMELINE \d\/\d • RUN \d{4}/);
  assert.ok(issueTitle.querySelector(".timeline-meta"));
  assert.ok(issueTitle.querySelector(".variant-chip"));
  assert.ok(issueTitle.querySelector(".run-chip"));
  assert.ok(issueTitle.querySelector(".issue-hashtag"));
  assert.ok(issueTitle.querySelector(".issue-hashtag wbr"));
  assert.doesNotMatch(issueTitle.textContent, /TIMELINE ALTERNATIF/);
  assert.doesNotMatch(document.querySelector("#npcName").textContent, /\s(?:&|vs\.?|dan)\s|,/);
  assert.ok(dom.window.localStorage.getItem("perang-narasi-save-v3"));
  dom.window.close();
});

test("all strategic events expose four choices and two delayed branches", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  const api = dom.window.__PN_TEST__;
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  assert.equal(api.phases.length, 6);
  assert.equal(api.phases.reduce((sum, phase) => sum + phase.days.length, 0), 72);
  assert.equal(api.specialEvents.length, 42);
  assert.doesNotMatch(
    api.phases.flatMap((phase) => phase.days.map((day) => day.post)).join("\n"),
    /FIKSI PREDIKTIF:|FIKSI PEMILU:|PROYEKSI FIKSI:/,
  );
  api.phases.flatMap((phase) => phase.days).forEach((day) => {
    assert.doesNotMatch(day.post, /^[a-z]/, `${day.title} starts like an unfinished sentence`);
    assert.doesNotMatch(
      Object.values(day.discussion).join(" "),
      /respons ini benar-benar menjawab|pisahkan fakta, tudingan, bantahan, dan dampaknya/i,
      `${day.title} still uses generic discussion filler`,
    );
  });

  let choices = 0;
  let delayedBranches = 0;
  for (const event of api.specialEvents) {
    for (const role of ["buzzer", "aktivis"]) {
      const options = api.eventChoices(event, role);
      assert.equal(options.length, 4, `${event.id}/${role}`);
      choices += options.length;
      options.forEach((option, index) => {
        assert.ok(option[4]?.delayed?.success, `${event.id}/${role}/${index} success branch`);
        assert.ok(option[4]?.delayed?.failure, `${event.id}/${role}/${index} failure branch`);
        assert.ok(option[4].delayed.afterMonths >= 1 && option[4].delayed.afterMonths <= 4);
        delayedBranches += 2;
      });
    }
  }

  assert.equal(choices, 336);
  assert.equal(delayedBranches, 672);
  dom.window.close();
});

test("every month has seeded single-speaker timeline variants", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  const { phases, hashtagHtml } = dom.window.__PN_TEST__;
  const pack = dom.window.PNTimelineVariants;
  let total = 0;
  let changedBetweenRuns = 0;

  phases.forEach((phase, phaseIndex) => phase.days.forEach((issue, dayIndex) => {
    const variants = pack.build(issue, { phaseIndex, dayIndex });
    assert.ok(variants.length >= 3, `${phaseIndex + 1}/${dayIndex + 1} needs at least three variants`);
    assert.equal(new Set(variants.map((variant) => variant.post)).size, variants.length);
    variants.forEach((variant) => {
      assert.doesNotMatch(variant.npc, /\s(?:&|vs\.?|dan)\s|,/, `${variant.npc} is not a single focal account`);
      assert.ok(variant.handle.startsWith("@"));
    });
    const runA = pack.select(issue, { phaseIndex, dayIndex, seed: 104729 });
    const runB = pack.select(issue, { phaseIndex, dayIndex, seed: 130363 });
    if (runA._variantId !== runB._variantId) changedBetweenRuns++;
    total += variants.length;
  }));

  assert.ok(total >= 216, `${total} variants configured`);
  assert.ok(changedBetweenRuns >= 24, `${changedBetweenRuns} months should differ between two runs`);
  const variantTitles = phases.flatMap((phase, phaseIndex) => phase.days.flatMap((issue, dayIndex) =>
    pack.build(issue, { phaseIndex, dayIndex }).map((variant) => variant.title || issue.title)));
  const longHashtags = [...new Set([
    ...phases.flatMap((phase) => phase.days.map((issue) => issue.title)),
    ...variantTitles,
  ])].filter((title) => title.length >= 28);
  assert.ok(longHashtags.includes("#DanantaraPunyaNegaraAtauNegaraPunyaDanantara"));
  longHashtags.forEach((title) => {
    const rendered = hashtagHtml(title);
    const probe = dom.window.document.createElement("span");
    probe.innerHTML = rendered;
    assert.equal(probe.textContent, title, `${title} must preserve its copyable text`);
    if (/[a-z0-9][A-Z]/.test(title)) assert.ok(probe.querySelector("wbr"), `${title} needs safe breakpoints`);
  });
  const podcastVariants = pack.build(phases[4].days[0], { phaseIndex: 4, dayIndex: 0 });
  assert.equal(
    podcastVariants.map((variant) => variant.npc).join(" | "),
    "Bang Akbar Pasal | Om Gita Wacana-Wira | Prof. Renal Disrupsi",
  );
  const rupiahVariants = pack.build(phases[2].days[4], { phaseIndex: 2, dayIndex: 4 });
  assert.ok(rupiahVariants.some((variant) => /desa enggak pakai dolar/i.test(variant.post)));
  assert.ok(rupiahVariants.some((variant) => /Satuan Penjilat Pak Gemoyono–Mas Samsul/.test(variant.post)));
  const julyVariants = pack.build(phases[2].days[6], { phaseIndex: 2, dayIndex: 6 });
  assert.ok(julyVariants.some((variant) => /kerja sama pertahanan|rudal/i.test(variant.post)));
  assert.ok(julyVariants.every((variant) => variant.facts.some((fact) => /2026-07-07/.test(fact[2] || ""))));
  assert.equal(phases[2].days[6].status, "ARSIP POLITIK 2026");
  assert.equal(phases[2].days[7].status, "TIMELINE ALTERNATIF");

  const campaignGemoy = pack.build(phases[0].days[1], { phaseIndex: 0, dayIndex: 1 });
  assert.ok(campaignGemoy.some((variant) => variant.npc === "Pak Jenderal Gemoyono" && /joget/i.test(variant.post)));
  const presidentialGemoy = pack.build(phases[1].days[2], { phaseIndex: 1, dayIndex: 2 })
    .find((variant) => variant.npc === "Pak Jenderal Gemoyono");
  assert.equal(presidentialGemoy.stance, "regime");
  assert.match(presidentialGemoy.post, /negara|perwira|strategis/i);
  dom.window.close();
});

test("Arc 2 rotates real-world program themes and context-aware cards", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  const api = dom.window.__PN_TEST__;
  const pack = dom.window.PNTimelineVariants;
  const arc = api.phases[1];

  assert.match(arc.days.map((issue) => `${issue.title} ${issue.subject}`).join("\n"), /KopDes/i);
  assert.match(arc.days.map((issue) => `${issue.title} ${issue.subject}`).join("\n"), /anggaran pendidikan/i);
  assert.match(arc.days.map((issue) => `${issue.title} ${issue.subject}`).join("\n"), /keamanan pangan MBG/i);
  assert.match(arc.days.map((issue) => `${issue.title} ${issue.subject}`).join("\n"), /2029/i);

  const july = pack.build(arc.days[6], { phaseIndex: 1, dayIndex: 6 });
  assert.deepEqual(new Set(july.map((variant) => variant.title)), new Set([
    "#DelapanPuluhRibuKopDesSiapaNgitung",
    "#RemoteSoloPindahKeGajahKecil",
  ]));
  assert.ok(july.every((variant) => variant.facts.some((fact) => /2025/.test(fact.join(" ")))));

  const august = pack.build(arc.days[7], { phaseIndex: 1, dayIndex: 7 });
  assert.deepEqual(new Set(august.map((variant) => variant.title)), new Set([
    "#AnggaranPendidikanDimakanDefinisi",
    "#TunjanganNaikRakyatDisuruhEfisien",
  ]));

  const september = pack.build(arc.days[8], { phaseIndex: 1, dayIndex: 8 });
  assert.ok(september.some((variant) => variant.npc === "Bu Nanik Nasi-Doyang"));
  assert.ok(september.some((variant) => variant.npc === "dr. Tan Sehat-Yen"));
  assert.ok(september.every((variant) => variant.facts.length >= 3));

  const june2026 = pack.build(api.phases[2].days[5], { phaseIndex: 2, dayIndex: 5 });
  const twoTermPayoff = june2026.filter((variant) => variant.title === "#RemoteSoloMintaDuaPeriode");
  assert.equal(twoTermPayoff.length, 2);
  assert.ok(twoTermPayoff.every((variant) => variant.facts.some((fact) => /8541851/.test(fact[2] || ""))));

  const governmentRoster = api.phaseRosters.buzzer[1];
  const activistRoster = api.phaseRosters.aktivis[1];
  assert.equal(governmentRoster.find((character) => character.id === "nanik-nasi-doyang")?.availableFrom, 9);
  assert.equal(activistRoster.find((character) => character.id === "tan-sehat-yen")?.availableFrom, 9);

  api.state.role = "aktivis";
  api.state.phase = 1;
  const dataAction = api.actionDefs.aktivis.find((action) => action.id === "data");
  const cardNames = july.map((variant) => api.actionPresentation(
    dataAction,
    { ...arc.days[6], ...variant },
    0,
  ).name);
  assert.ok(cardNames.some((name) => /akta koperasi|target gerai/i.test(name)));
  assert.ok(cardNames.some((name) => /struktur partai|hasil kongres/i.test(name)));

  dom.window.close();
});

test("ending evaluator reflects choices, debt, cash morality, and election outcome", async () => {
  const { dom, errors } = createDom({ expose: true });
  await tick(dom.window);
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  const evaluate = dom.window.PNEndingSystem.evaluate;
  const good = evaluate({
    role: "aktivis", phase: 5, integrity: 88, credibility: 84, democracy: 82,
    network: 86, reach: 68, heat: 30, stress: 45, career: 130,
    money: 500000000, debt: 0, missedPayments: 0, bailoutCount: 0,
    quizAnswered: 20, quizCorrect: 18, perfectMatches: 10, crewMisfires: 1,
    history: Array.from({ length: 20 }, (_, i) => ({ action: ["data", "context", "law", "network"][i % 4] })),
    eventOutcomeProfile: { positive: 30, negative: 2, mixed: 6, neutral: 4 },
    resolvedRipples: Array.from({ length: 34 }, () => ({ tone: "good" })),
    specialties: ["Gerakan kolektif"],
  });
  const bad = evaluate({
    role: "buzzer", phase: 5, integrity: 18, credibility: 25, democracy: 20,
    network: 45, reach: 95, heat: 94, stress: 72, career: 110,
    money: 25000000000, debt: 18000000000, missedPayments: 3, bailoutCount: 2,
    quizAnswered: 10, quizCorrect: 2, perfectMatches: 2, crewMisfires: 12,
    history: Array.from({ length: 25 }, (_, i) => ({ action: ["patriot", "attack", "whatabout", "meme"][i % 4] })),
    eventOutcomeProfile: { positive: 1, negative: 30, mixed: 5, neutral: 6 },
    resolvedRipples: Array.from({ length: 30 }, () => ({ tone: "bad" })),
    specialties: ["Loyalis final"],
  });

  assert.ok(good.performance.score > bad.performance.score);
  assert.ok(good.finance.solvency > bad.finance.solvency);
  assert.ok(good.morality.score > bad.morality.score);
  assert.equal(good.election.winner.key, "reform");
  assert.equal(bad.election.winner.key, "wildcard");
  assert.equal(good.election.candidates.reduce((sum, candidate) => sum + candidate.vote, 0), 100);
  assert.equal(bad.election.candidates.reduce((sum, candidate) => sum + candidate.vote, 0), 100);
  dom.window.close();
});

async function runCampaign(role) {
  const { dom, errors } = createDom({ expose: true });
  const { window } = dom;
  const { document } = window;
  document.querySelector("#quizStartOff").click();
  document.querySelector(`[data-role="${role}"]`).click();
  await tick(window);

  for (let step = 0; step < 1000 && !window.__PN_TEST__.state.finished; step++) {
    const state = window.__PN_TEST__.state;
    const modalOpen = !document.querySelector("#modal").classList.contains("hidden");
    if (!modalOpen) {
      document.querySelector("#endDayBtn").click();
      await tick(window);
      continue;
    }

    const control =
      document.querySelector("[data-event-choice].outcome-positive") ||
      document.querySelector("[data-event-choice].outcome-mixed") ||
      document.querySelector("[data-event-choice]") ||
      document.querySelector("#eventContinue") ||
      document.querySelector('[data-crisis="correction"]') ||
      document.querySelector(`[data-bailout="${role === "buzzer" ? "commissioner" : "solidarity"}"]`) ||
      document.querySelector("[data-promo]") ||
      document.querySelector("#phaseStartBtn");
    assert.ok(control, `unhandled modal at phase ${state.phase + 1}, month ${state.day}`);
    control.click();
    await tick(window);
  }

  const endingText = document.querySelector("#modalContent")?.textContent || "";
  const electionButton = document.querySelector("#electionNight");
  assert.ok(electionButton, `${role} ending must expose election results`);
  electionButton.click();
  await tick(window);
  const electionText = document.querySelector("#modalContent")?.textContent || "";
  const candidateCards = document.querySelectorAll(".candidate-result").length;

  const result = {
    ...window.__PN_TEST__.state,
    configuredEvents: window.__PN_TEST__.specialEvents.length,
    runtimeErrors: errors,
    endingAudit: { endingText, electionText, candidateCards },
  };
  dom.window.close();
  return result;
}

for (const role of ["buzzer", "aktivis"]) {
  test(`${role} campaign reaches a scored election ending with every event resolved`, async () => {
    const state = await runCampaign(role);
    assert.equal(state.runtimeErrors.length, 0);
    assert.equal(state.finished, true);
    assert.equal(state.phase, 5);
    assert.equal(state.day, 12);
    assert.equal(state.eventHistory.length, state.configuredEvents);
    assert.equal(state.eventHistory.length, 42);
    assert.equal(state.narrativeRipples.length, 0);
    assert.equal(state.resolvedRipples.length, 42);
    assert.ok(state.finalReport);
    assert.ok(state.finalReport.performance.score >= 0 && state.finalReport.performance.score <= 100);
    assert.equal(state.finalReport.election.candidates.reduce((sum, candidate) => sum + candidate.vote, 0), 100);
    assert.match(state.endingAudit.endingText, /NILAI KINERJA/);
    assert.match(state.endingAudit.endingText, /Utang/);
    assert.match(state.endingAudit.electionText, /bukan prediksi pemilu dunia nyata/i);
    assert.equal(state.endingAudit.candidateCards, 4);
  });
}

test("v3.x save key and migration path remain compatible", async () => {
  const legacyState = {
    role: "aktivis",
    phase: 2,
    day: 6,
    money: 120000000,
    reach: 51,
    credibility: 61,
    integrity: 69,
    stress: 34,
    democracy: 58,
    network: 47,
    heat: 45,
    resolve: 74,
    actions: 1,
    quizEnabled: false,
    quizDeck: [],
    quizPositionDeck: [],
    quizIndex: 0,
    specialties: [],
    history: [],
    postMetrics: { reposts: 10, likes: 20, replies: 5, views: 500 },
    comments: [],
    seenEvents: [],
    eventHistory: [],
  };
  const { dom, errors } = createDom({
    expose: true,
    beforeParse(window) {
      window.localStorage.setItem(
        "perang-narasi-save-v3",
        JSON.stringify({ version: 3, state: legacyState }),
      );
    },
  });
  await tick(dom.window);
  const { document } = dom.window;
  assert.ok(!document.querySelector("#continuePanel").classList.contains("hidden"));
  document.querySelector("#continueBtn").click();
  await tick(dom.window);

  const state = dom.window.__PN_TEST__.state;
  assert.equal(errors.length, 0, errors.map((error) => error.message).join("\n"));
  assert.equal(state.role, "aktivis");
  assert.equal(state.phase, 2);
  assert.equal(state.day, 6);
  assert.ok(state.runSeed > 0);
  assert.deepEqual([...state.narrativeRipples], []);
  assert.deepEqual([...state.resolvedRipples], []);
  dom.window.close();
});
