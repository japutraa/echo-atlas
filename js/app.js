/*
 * Echo Atlas
 * Copyright (C) 2026 Adrian Janitra Putra
 * SPDX-License-Identifier: GPL-3.0-only
 */

(() => {
      const STORAGE_KEY = "echo-atlas-progress-v1";
      const LEGACY_VOLUME_KEY = "echo-atlas-master-volume-v1";
      const BACKGROUND_VOLUME_KEY = "echo-atlas-background-volume-v1";
      const INSTRUMENT_VOLUME_KEY = "echo-atlas-instrument-volume-v1";
      const STAGES_PER_AREA = 4;
      const CHALLENGE_AREA_COUNT = 6;
      const LANGUAGE_KEY = "echo-atlas-language-v1";

      if (!window.ECHO_ATLAS_I18N || !window.ECHO_ATLAS_AREAS) {
        throw new Error("Echo Atlas data modules were not loaded.");
      }

      const { UI_TEXT, LOCALIZED_STRINGS } = window.ECHO_ATLAS_I18N;
      const areas = window.ECHO_ATLAS_AREAS;

      function loadLanguage() {
        try {
          const saved = localStorage.getItem(LANGUAGE_KEY);
          if (["id", "en", "de"].includes(saved)) return saved;
        } catch {}
        const browser = (navigator.language || "").toLowerCase();
        if (browser.startsWith("de")) return "de";
        if (browser.startsWith("en")) return "en";
        return "id";
      }

      let currentLang = loadLanguage();

      function t(key, vars = {}) {
        const table = UI_TEXT[currentLang] || UI_TEXT.id;
        let value = table[key] ?? UI_TEXT.id[key] ?? key;
        Object.entries(vars).forEach(([name, replacement]) => {
          value = value.replaceAll(`{${name}}`, String(replacement));
        });
        return value;
      }

      function localizeText(value) {
        return LOCALIZED_STRINGS[currentLang]?.[value] || value;
      }

      

      const dom = {
        canvas: document.getElementById("field"),
        map: document.getElementById("map"),
        tones: document.getElementById("tones"),
        areaTitle: document.getElementById("areaTitle"),
        areaSubtitle: document.getElementById("areaSubtitle"),
        stageLabel: document.getElementById("stageLabel"),
        instruction: document.getElementById("instruction"),
        subtext: document.getElementById("subtext"),
        listeningDot: document.getElementById("listeningDot"),
        scaleName: document.getElementById("scaleName"),
        scaleText: document.getElementById("scaleText"),
        scaleNotes: document.getElementById("scaleNotes"),
        scaleButton: document.getElementById("scaleButton"),
        modifier: document.getElementById("modifier"),
        mainButton: document.getElementById("mainButton"),
        modeButton: document.getElementById("modeButton"),
        musicButton: document.getElementById("musicButton"),
        soundButton: document.getElementById("soundButton"),
        volumePanel: document.getElementById("volumePanel"),
        backgroundVolumeSlider: document.getElementById("backgroundVolumeSlider"),
        backgroundVolumeValue: document.getElementById("backgroundVolumeValue"),
        instrumentVolumeSlider: document.getElementById("instrumentVolumeSlider"),
        instrumentVolumeValue: document.getElementById("instrumentVolumeValue"),
        resetButton: document.getElementById("resetButton"),
        journeyLabel: document.getElementById("journeyLabel"),
        journeyBar: document.getElementById("journeyBar"),
        splash: document.getElementById("splash"),
        enterChallenge: document.getElementById("enterChallenge"),
        enterFree: document.getElementById("enterFree"),
        toast: document.getElementById("toast"),
        flash: document.getElementById("flash"),
        finale: document.getElementById("finale"),
        closeFinale: document.getElementById("closeFinale"),
        languageButtons: [...document.querySelectorAll("#languageSwitch button")],
        brandEyebrow: document.getElementById("brandEyebrow"),
        activeAreaLabel: document.getElementById("activeAreaLabel"),
        toneSystemLabel: document.getElementById("toneSystemLabel"),
        ambienceLabel: document.getElementById("ambienceLabel"),
        instrumentLabel: document.getElementById("instrumentLabel"),
        journeyTitle: document.getElementById("journeyTitle"),
        splashTag: document.getElementById("splashTag"),
        splashLead: document.getElementById("splashLead"),
        splashSmall: document.getElementById("splashSmall"),
        finaleTag: document.getElementById("finaleTag"),
        finaleTitle: document.getElementById("finaleTitle"),
        finaleBody: document.getElementById("finaleBody"),
        creatorMark: document.getElementById("creatorMark"),
        creatorTrigger: document.getElementById("creatorTrigger"),
        creatorName: document.getElementById("creatorName"),
        creatorHint: document.getElementById("creatorHint")
      };

      let state = loadState();
      let areaIndex = Math.min(state.selectedArea, state.unlockedArea);
      let stage = getStartStage(areaIndex);
      let sequence = [];
      let expected = [];
      let userStep = 0;
      let accepting = false;
      let playing = false;
      let waitingForGate = false;
      let muted = false;
      let backgroundVolume = loadChannelVolume(BACKGROUND_VOLUME_KEY, .55);
      let instrumentVolume = loadChannelVolume(INSTRUMENT_VOLUME_KEY, .82);
      let audioCtx = null;
      let master = null;
      let instrumentBus = null;
      let backgroundBus = null;
      let convolver = null;
      let backgroundConvolver = null;
      let droneBus = null;
      let droneNodes = [];
      let toastTimer = null;
      let gameMode = "challenge";
      let freeScaleIndex = Array(areas.length).fill(0);

      // Generative ambient soundtrack.
      let atlasEntered = false;
      let backgroundEnabled = backgroundVolume > .001;
      let backgroundDeck = null;
      let backgroundDuck = 1;
      let backgroundNoise = null;
      const backgroundDecks = new Set();

      function defaultState() {
        return {
          unlockedArea: 0,
          selectedArea: 0,
          completed: [0, 0, 0, 0, 0, 0],
          finaleSeen: false
        };
      }

      function loadState() {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
          if (!saved || !Array.isArray(saved.completed)) return defaultState();
          return {
            unlockedArea: Math.max(0, Math.min(CHALLENGE_AREA_COUNT - 1, Number(saved.unlockedArea) || 0)),
            selectedArea: Math.max(0, Math.min(CHALLENGE_AREA_COUNT - 1, Number(saved.selectedArea) || 0)),
            completed: Array.from({ length: CHALLENGE_AREA_COUNT }, (_, i) => Math.max(0, Math.min(STAGES_PER_AREA, Number(saved.completed[i]) || 0))),
            finaleSeen: Boolean(saved.finaleSeen)
          };
        } catch {
          return defaultState();
        }
      }

      function saveState() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
          // Game tetap berjalan jika penyimpanan browser diblokir.
        }
      }

      function loadChannelVolume(key, fallback) {
        try {
          const own = Number(localStorage.getItem(key));
          if (Number.isFinite(own)) return Math.max(0, Math.min(1, own));

          const legacy = Number(localStorage.getItem(LEGACY_VOLUME_KEY));
          if (Number.isFinite(legacy)) return Math.max(0, Math.min(1, legacy));
        } catch {
          // Fallback ke nilai bawaan.
        }
        return fallback;
      }

      function saveChannelVolume(key, value) {
        try {
          localStorage.setItem(key, String(value));
        } catch {
          // Abaikan jika browser memblokir storage.
        }
      }

      function currentMasterTarget() {
        return muted ? .0001 : .78;
      }

      function soundGlyph() {
        const audibleLevel = Math.max(backgroundVolume, instrumentVolume);
        if (muted || audibleLevel <= .01) return "○";
        if (audibleLevel < .35) return "◔";
        if (audibleLevel < .7) return "◑";
        return "◖";
      }

      function updateVolumeUi() {
        const backgroundPct = Math.round(backgroundVolume * 100);
        const instrumentPct = Math.round(instrumentVolume * 100);
        backgroundEnabled = backgroundVolume > .001;

        if (dom.backgroundVolumeSlider) dom.backgroundVolumeSlider.value = String(backgroundPct);
        if (dom.instrumentVolumeSlider) dom.instrumentVolumeSlider.value = String(instrumentPct);
        if (dom.backgroundVolumeValue) dom.backgroundVolumeValue.textContent = `${backgroundPct}%`;
        if (dom.instrumentVolumeValue) dom.instrumentVolumeValue.textContent = `${instrumentPct}%`;

        if (dom.musicButton) {
          dom.musicButton.classList.toggle("music-on", backgroundEnabled);
          dom.musicButton.classList.toggle("music-off", !backgroundEnabled);
          dom.musicButton.textContent = backgroundEnabled ? "♫" : "·";
          dom.musicButton.setAttribute(
            "aria-label",
            backgroundEnabled ? t("musicOnAria") : t("musicOffAria")
          );
          dom.musicButton.title = `${t("musicTitle")} · ${backgroundPct}%`;
        }

        if (dom.soundButton) {
          dom.soundButton.textContent = soundGlyph();
          dom.soundButton.setAttribute(
            "aria-label",
            muted ? t("muteOnAria") : t("muteOffAria")
          );
        }
      }

      function applyMasterGain() {
        if (!master || !audioCtx) return;
        master.gain.cancelScheduledValues(audioCtx.currentTime);
        master.gain.setTargetAtTime(currentMasterTarget(), audioCtx.currentTime, .04);
      }

      function applyChannelGains() {
        if (!audioCtx) return;

        if (backgroundBus) {
          backgroundBus.gain.cancelScheduledValues(audioCtx.currentTime);
          backgroundBus.gain.setTargetAtTime(
            Math.max(.0001, backgroundVolume),
            audioCtx.currentTime,
            .04
          );
        }

        if (instrumentBus) {
          instrumentBus.gain.cancelScheduledValues(audioCtx.currentTime);
          instrumentBus.gain.setTargetAtTime(
            Math.max(.0001, instrumentVolume),
            audioCtx.currentTime,
            .04
          );
        }
      }

      function getStartStage(index) {
        const done = Number(state.completed[index]) || 0;
        return done >= STAGES_PER_AREA ? 1 : done + 1;
      }

      function localizeScale(scale) {
        return {
          ...scale,
          name: localizeText(scale.name),
          text: localizeText(scale.text)
        };
      }

      function getFreeScales(area) {
        const source = Array.isArray(area.freeScales) && area.freeScales.length
          ? area.freeScales
          : (() => {
              const variants = [{ name: area.scaleName, text: area.scaleText, labels: area.noteLabels, cents: area.cents }];
              if (area.alternate) {
                variants.push({
                  name: area.alternate.scaleName,
                  text: area.alternate.scaleText,
                  labels: area.alternate.noteLabels,
                  cents: area.alternate.cents
                });
              }
              return variants;
            })();
        return source.map(localizeScale);
      }

      function getAreaScale(area, currentStage) {
        if (gameMode === "free") {
          const variants = getFreeScales(area);
          const chosen = variants[freeScaleIndex[areaIndex] % variants.length];
          return { cents: chosen.cents, labels: chosen.labels, name: chosen.name, text: chosen.text };
        }
        if (area.alternate && currentStage >= area.alternate.fromStage) {
          return localizeScale({
            cents: area.alternate.cents,
            labels: area.alternate.noteLabels,
            name: area.alternate.scaleName,
            text: area.alternate.scaleText
          });
        }
        return localizeScale({
          cents: area.cents,
          labels: area.noteLabels,
          name: area.scaleName,
          text: area.scaleText
        });
      }

      function applyStaticLanguage() {
        document.documentElement.lang = currentLang;
        document.title = t("pageTitle");
        dom.languageButtons.forEach(button => {
          button.classList.toggle("active", button.dataset.lang === currentLang);
          button.setAttribute("aria-pressed", String(button.dataset.lang === currentLang));
        });

        dom.brandEyebrow.textContent = t("brandEyebrow");
        dom.activeAreaLabel.textContent = t("activeArea");
        dom.toneSystemLabel.textContent = t("toneSystem");
        dom.ambienceLabel.textContent = t("ambience");
        dom.instrumentLabel.textContent = t("instrument");
        dom.journeyTitle.textContent = t("journey");

        dom.map.setAttribute("aria-label", t("mapAria"));
        document.querySelector(".world").setAttribute("aria-label", t("worldAria"));
        document.querySelector(".volume-cradle").setAttribute("aria-label", t("volumeGroup"));
        dom.backgroundVolumeSlider.setAttribute("aria-label", t("backgroundVolumeAria"));
        dom.instrumentVolumeSlider.setAttribute("aria-label", t("instrumentVolumeAria"));
        dom.musicButton.title = t("musicTitle");
        dom.musicButton.setAttribute("aria-label", backgroundEnabled ? t("musicOnAria") : t("musicOffAria"));
        dom.soundButton.title = t("muteTitle");
        dom.resetButton.title = t("resetTitle");
        dom.resetButton.setAttribute("aria-label", t("resetAria"));

        dom.splashTag.textContent = t("splashTag");
        dom.splashLead.textContent = t("splashLead");
        dom.enterChallenge.textContent = t("startJourney");
        dom.enterFree.textContent = t("freeExplore");
        dom.splashSmall.textContent = t("splashSmall");

        dom.finaleTag.textContent = t("finaleTag");
        dom.finaleTitle.innerHTML = t("finaleTitle");
        dom.finaleBody.textContent = t("finaleBody");
        dom.closeFinale.textContent = t("returnAtlas");

        dom.creatorName.textContent = t("creatorName");
        dom.creatorHint.textContent = t("creatorHint");
        dom.creatorTrigger.setAttribute("aria-label", t("creatorAria"));
      }

      function refreshLocalizedArea() {
        const area = areas[areaIndex];
        const scale = getAreaScale(area, stage);
        const variants = getFreeScales(area);

        dom.areaTitle.textContent = area.title;
        dom.areaSubtitle.textContent = localizeText(area.subtitle);
        dom.stageLabel.textContent = gameMode === "free"
          ? `${area.category === "bonus" ? t("hiddenGarden") : t("freeMode")} · ${String((freeScaleIndex[areaIndex] % variants.length) + 1).padStart(2, "0")} / ${String(variants.length).padStart(2, "0")}`
          : t("stage", { stage: String(stage).padStart(2, "0") });
        dom.scaleName.textContent = scale.name;
        dom.scaleText.textContent = scale.text;

        dom.scaleButton.textContent = variants.length > 1
          ? t("switchScaleCount", { current: (freeScaleIndex[areaIndex] % variants.length) + 1, total: variants.length })
          : t("oneScale");

        dom.modeButton.textContent = gameMode === "free" ? t("challengeModeButton") : t("freeModeButton");

        if (gameMode === "free") {
          dom.modifier.innerHTML = `<b>∞</b><span>${t("freeModifier")}</span>`;
        } else if (area.mode[stage - 1] === "blind") {
          dom.modifier.innerHTML = `<b>◌</b><span>${t("blindModifier")}</span>`;
        } else {
          dom.modifier.innerHTML = `<b>→</b><span>${t("normalModifier")}</span>`;
        }

        [...dom.tones.children].forEach((button, index) => {
          button.setAttribute("aria-label", t("toneLabel", { label: scale.labels[index] || index + 1 }));
        });

        if (waitingForGate) dom.mainButton.textContent = t("openGate");
        else if (gameMode === "free") dom.mainButton.textContent = t("playScale");
        else if (accepting) dom.mainButton.textContent = t("repeat");
        else dom.mainButton.textContent = t("listen");
      }

      function setLanguage(language) {
        if (!["id", "en", "de"].includes(language)) return;
        currentLang = language;
        try { localStorage.setItem(LANGUAGE_KEY, currentLang); } catch {}
        applyStaticLanguage();
        buildMap();
        refreshLocalizedArea();
        updateJourney();
        updateVolumeUi();
      }

      function init() {
        applyStaticLanguage();
        updateVolumeUi();
        buildMap();
        renderArea();
        updateJourney();
        initField();
        requestAnimationFrame(drawField);
      }

      function buildMap() {
        dom.map.innerHTML = `<p class="map-title">${t("soundAtlas")}</p>`;

        areas.forEach((area, i) => {
          if (i === 0 || i === CHALLENGE_AREA_COUNT) {
            const section = document.createElement("p");
            section.className = "map-section";
            section.textContent = i === 0 ? t("worldScales") : t("hiddenGardens");
            dom.map.appendChild(section);
          }

          const button = document.createElement("button");
          button.className = "map-node";
          if (area.category === "bonus") button.classList.add("bonus", "free-only");
          button.dataset.index = i;

          const lockedChallenge = gameMode === "challenge" && (i >= CHALLENGE_AREA_COUNT || i > state.unlockedArea);
          button.disabled = lockedChallenge;
          if (i === areaIndex) button.classList.add("active");

          const completed = Number(state.completed[i]) || 0;
          if (i < CHALLENGE_AREA_COUNT && completed >= STAGES_PER_AREA) button.classList.add("complete");

          const dots = i < CHALLENGE_AREA_COUNT
            ? Array.from({ length: STAGES_PER_AREA }, (_, d) => `<i class="${d < completed ? "done" : ""}"></i>`).join("")
            : "";
          const sublabel = i >= CHALLENGE_AREA_COUNT && gameMode === "challenge"
            ? t("freeMode")
            : localizeText(area.mapLabel);

          button.innerHTML = `
            <span class="sigil">${area.glyph}</span>
            <span class="map-copy">
              <strong>${area.title}</strong>
              <span>${sublabel}</span>
              ${dots ? `<span class="stage-dots">${dots}</span>` : ""}
            </span>
          `;

          button.addEventListener("click", () => selectArea(i));
          dom.map.appendChild(button);
        });
      }

      function selectArea(index) {
        const blocked = gameMode === "challenge" && (index >= CHALLENGE_AREA_COUNT || index > state.unlockedArea);
        if (blocked || playing) return;
        areaIndex = index;
        if (index < CHALLENGE_AREA_COUNT) state.selectedArea = index;
        stage = gameMode === "free" ? 1 : getStartStage(index);
        waitingForGate = false;
        accepting = gameMode === "free";
        sequence = [];
        expected = [];
        userStep = 0;
        saveState();
        stopDrone();
        buildMap();
        renderArea();
        startDrone();
        transitionBackgroundMusic();
        showToast(areas[index].title);
      }

      function setGameMode(mode, announce = true) {
        if (playing) return;
        gameMode = mode === "free" ? "free" : "challenge";
        document.body.classList.toggle("free-mode", gameMode === "free");
        dom.modeButton.classList.toggle("active", gameMode === "free");
        dom.modeButton.textContent = gameMode === "free" ? t("challengeModeButton") : t("freeModeButton");

        if (gameMode === "challenge" && (areaIndex >= CHALLENGE_AREA_COUNT || areaIndex > state.unlockedArea)) {
          areaIndex = Math.min(state.selectedArea, state.unlockedArea, CHALLENGE_AREA_COUNT - 1);
        }
        stage = gameMode === "free" ? 1 : getStartStage(areaIndex);
        sequence = [];
        expected = [];
        accepting = gameMode === "free";
        waitingForGate = false;
        stopDrone();
        buildMap();
        renderArea();
        updateJourney();
        startDrone();
        transitionBackgroundMusic();
        if (announce) showToast(gameMode === "free" ? t("freeModeActive") : t("challengeModeActive"));
      }

      function renderArea() {
        stage = Math.max(1, Math.min(STAGES_PER_AREA, Number(stage) || 1));
        const area = areas[areaIndex];
        const scale = getAreaScale(area, stage);
        const variants = getFreeScales(area);
        const root = document.documentElement.style;

        root.setProperty("--accent", area.colors.accent);
        root.setProperty("--accent2", area.colors.accent2);
        root.setProperty("--orb", area.colors.orb);
        root.setProperty("--scene-a", area.colors.a);
        root.setProperty("--scene-b", area.colors.b);

        dom.areaTitle.textContent = area.title;
        dom.areaSubtitle.textContent = localizeText(area.subtitle);
        dom.stageLabel.textContent = gameMode === "free"
          ? `${area.category === "bonus" ? t("hiddenGarden") : t("freeMode")} · ${String((freeScaleIndex[areaIndex] % variants.length) + 1).padStart(2, "0")} / ${String(variants.length).padStart(2, "0")}`
          : t("stage", { stage: String(stage).padStart(2, "0") });
        dom.scaleName.textContent = scale.name;
        dom.scaleText.textContent = scale.text;
        dom.scaleNotes.innerHTML = scale.labels.map(label => `<span>${label}</span>`).join("");

        dom.scaleButton.classList.toggle("visible", gameMode === "free" && variants.length > 1);
        dom.scaleButton.textContent = variants.length > 1
          ? t("switchScaleCount", { current: (freeScaleIndex[areaIndex] % variants.length) + 1, total: variants.length })
          : t("oneScale");

        if (gameMode === "free") {
          dom.modifier.innerHTML = `<b>∞</b><span>${t("freeModifier")}</span>`;
          buildTones();
          accepting = true;
          setCopy(t("playSpace"), t("noWrong"));
          dom.mainButton.textContent = t("playScale");
          dom.mainButton.disabled = false;
          return;
        }

        const mode = area.mode[stage - 1];
        if (mode === "blind") {
          dom.modifier.innerHTML = `<b>◌</b><span>${t("blindModifier")}</span>`;
        } else {
          dom.modifier.innerHTML = `<b>→</b><span>${t("normalModifier")}</span>`;
        }

        buildTones();
        accepting = false;
        setCopy(t("pressListen"), t("nextTrace"));
        dom.mainButton.textContent = t("listen");
        dom.mainButton.disabled = false;
      }

      function buildTones() {
        dom.tones.innerHTML = "";
        const area = areas[areaIndex];
        const scale = getAreaScale(area, stage);
        const challengeCount = area.toneCounts?.[stage - 1] || scale.cents.length;
        const count = gameMode === "free" ? scale.cents.length : Math.min(challengeCount, scale.cents.length);
        const offset = count >= 10 ? -90 : -90 - 180 / count;

        for (let i = 0; i < count; i++) {
          const button = document.createElement("button");
          button.className = "tone";
          button.dataset.index = i;
          button.setAttribute("aria-label", t("toneLabel", { label: scale.labels[i] || i + 1 }));
          const angle = offset + (360 / count) * i;
          button.style.setProperty("--angle", `${angle}deg`);
          button.style.setProperty("--counter", `${-angle}deg`);
          button.innerHTML = `<span class="tone-label">${scale.labels[i] || i + 1}</span>`;
          button.addEventListener("pointerdown", () => handleTone(i));
          dom.tones.appendChild(button);
        }
      }

      async function initAudio() {
        if (audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        master = audioCtx.createGain();
        master.gain.value = currentMasterTarget();
        master.connect(audioCtx.destination);

        instrumentBus = audioCtx.createGain();
        instrumentBus.gain.value = Math.max(.0001, instrumentVolume);
        instrumentBus.connect(master);

        backgroundBus = audioCtx.createGain();
        backgroundBus.gain.value = Math.max(.0001, backgroundVolume);
        backgroundBus.connect(master);

        convolver = audioCtx.createConvolver();
        convolver.buffer = createImpulse(2.8, 2.6);
        const instrumentWet = audioCtx.createGain();
        instrumentWet.gain.value = .30;
        convolver.connect(instrumentWet).connect(instrumentBus);

        backgroundConvolver = audioCtx.createConvolver();
        backgroundConvolver.buffer = createImpulse(3.8, 3.0);
        const backgroundWet = audioCtx.createGain();
        backgroundWet.gain.value = .32;
        backgroundConvolver.connect(backgroundWet).connect(backgroundBus);
      }

      function createImpulse(duration, decay) {
        const length = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);

        for (let c = 0; c < 2; c++) {
          const data = buffer.getChannelData(c);
          for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
          }
        }
        return buffer;
      }

      function centsToFreq(root, cents) {
        return root * Math.pow(2, cents / 1200);
      }

      function currentFrequency(index) {
        const area = areas[areaIndex];
        const scale = getAreaScale(area, stage);
        return centsToFreq(area.root, scale.cents[index]);
      }

      function envelope(gain, now, peak, duration, attack = .012, releaseTail = 0) {
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), now + attack);
        gain.gain.exponentialRampToValueAtTime(.0001, now + duration + releaseTail);
      }

      function connectDryWet(source, dryAmount = 1, wetAmount = .25) {
        const dry = audioCtx.createGain();
        const wet = audioCtx.createGain();
        dry.gain.value = dryAmount;
        wet.gain.value = wetAmount;
        source.connect(dry).connect(instrumentBus);
        source.connect(wet).connect(convolver);
      }

      function playTone(index, duration = .62, visual = true) {
        if (visual) animateTone(index, duration);
        if (!audioCtx || muted) return;

        const area = areas[areaIndex];
        const freq = currentFrequency(index);
        const now = audioCtx.currentTime;

        if (area.instrument === "glass") playGlass(freq, duration, now);
        else if (area.instrument === "koto") playKoto(freq, duration, now);
        else if (area.instrument === "gamelan") playGamelan(freq, duration, now);
        else if (area.instrument === "raga") playRaga(freq, duration, now);
        else if (area.instrument === "chrome") playChrome(freq, duration, now);
        else if (area.instrument === "metal") playMetal(freq, duration, now);
        else if (area.instrument === "rock") playRock(freq, duration, now);
        else if (area.instrument === "pop") playPop(freq, duration, now);
        else if (area.instrument === "rnb") playRnb(freq, duration, now);
        else if (area.instrument === "hiphop") playHipHop(freq, duration, now);
        else if (area.instrument === "electronic") playElectronic(freq, duration, now);
        else playMicro(freq, duration, now);
      }

      function playGlass(freq, duration, now) {
        const mix = audioCtx.createGain();
        const gain = audioCtx.createGain();
        envelope(gain, now, .23, duration, .015, .12);

        [1, 2.01].forEach((ratio, i) => {
          const osc = audioCtx.createOscillator();
          const partial = audioCtx.createGain();
          osc.type = i ? "sine" : "triangle";
          osc.frequency.value = freq * ratio;
          partial.gain.value = i ? .13 : .9;
          osc.connect(partial).connect(mix);
          osc.start(now);
          osc.stop(now + duration + .25);
        });

        mix.connect(gain);
        connectDryWet(gain, 1, .38);
      }

      function playKoto(freq, duration, now) {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq * 1.015, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + .045);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2800, now);
        filter.frequency.exponentialRampToValueAtTime(900, now + duration);
        filter.Q.value = 4.5;
        envelope(gain, now, .26, duration, .004, .06);
        osc.connect(filter).connect(gain);
        connectDryWet(gain, 1, .26);
        osc.start(now);
        osc.stop(now + duration + .15);

        const click = audioCtx.createBufferSource();
        click.buffer = noiseBuffer(.035);
        const clickFilter = audioCtx.createBiquadFilter();
        const clickGain = audioCtx.createGain();
        clickFilter.type = "bandpass";
        clickFilter.frequency.value = Math.min(5000, freq * 5);
        clickFilter.Q.value = 1.1;
        envelope(clickGain, now, .055, .03, .001);
        click.connect(clickFilter).connect(clickGain).connect(instrumentBus);
        click.start(now);
      }

      function playGamelan(freq, duration, now) {
        const carrier = audioCtx.createOscillator();
        const mod = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        const out = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        carrier.type = "sine";
        carrier.frequency.value = freq;
        mod.type = "sine";
        mod.frequency.value = freq * 1.414;
        modGain.gain.value = freq * .68;
        mod.connect(modGain).connect(carrier.frequency);

        filter.type = "bandpass";
        filter.frequency.value = Math.min(7000, freq * 3.2);
        filter.Q.value = .7;
        envelope(out, now, .22, duration, .004, .5);
        carrier.connect(filter).connect(out);
        connectDryWet(out, .92, .48);

        carrier.start(now);
        mod.start(now);
        carrier.stop(now + duration + .65);
        mod.stop(now + duration + .65);
      }

      function playRaga(freq, duration, now) {
        const osc = audioCtx.createOscillator();
        const soft = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = "sawtooth";
        soft.type = "sine";
        osc.frequency.setValueAtTime(freq * .985, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + .11);
        soft.frequency.setValueAtTime(freq, now);

        filter.type = "lowpass";
        filter.frequency.value = 1200;
        filter.Q.value = 1.4;
        envelope(gain, now, .15, duration + .1, .045, .18);

        const softGain = audioCtx.createGain();
        softGain.gain.value = .75;
        osc.connect(filter);
        soft.connect(softGain).connect(filter);
        filter.connect(gain);
        connectDryWet(gain, .95, .34);

        osc.start(now);
        soft.start(now);
        osc.stop(now + duration + .4);
        soft.stop(now + duration + .4);
      }

      function playChrome(freq, duration, now) {
        const osc = audioCtx.createOscillator();
        const sub = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = "square";
        sub.type = "sine";
        osc.frequency.value = freq;
        sub.frequency.value = freq * .5;
        filter.type = "lowpass";
        filter.frequency.value = 1700 + freq;
        filter.Q.value = 2;
        envelope(gain, now, .14, Math.min(duration, .46), .006, .02);

        const subGain = audioCtx.createGain();
        subGain.gain.value = .38;
        osc.connect(filter);
        sub.connect(subGain).connect(filter);
        filter.connect(gain);
        connectDryWet(gain, 1, .19);

        osc.start(now);
        sub.start(now);
        osc.stop(now + duration + .08);
        sub.stop(now + duration + .08);
      }

      function playMicro(freq, duration, now) {
        const mix = audioCtx.createGain();
        const gain = audioCtx.createGain();
        envelope(gain, now, .16, duration, .025, .28);

        [-4.5, 0, 4.5].forEach((detune, i) => {
          const osc = audioCtx.createOscillator();
          const partial = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq * (i === 2 ? 2 : 1);
          osc.detune.value = detune;
          partial.gain.value = i === 2 ? .12 : .52;
          osc.connect(partial).connect(mix);
          osc.start(now);
          osc.stop(now + duration + .4);
        });

        mix.connect(gain);
        connectDryWet(gain, .82, .53);
      }


      function distortionCurve(amount = 45) {
        const samples = 22050;
        const curve = new Float32Array(samples);
        const k = amount;
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = (3 + k) * x * 20 * Math.PI / (Math.PI + k * Math.abs(x));
        }
        return curve;
      }

      function playMetal(freq, duration, now) {
        // A quiet "steel memory": no guitar model and no distortion.
        const mix = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        const partials = [
          { ratio: .5, level: .20, detune: -3 },
          { ratio: 1, level: .62, detune: 0 },
          { ratio: 1.498, level: .17, detune: 2 },
          { ratio: 2.72, level: .055, detune: -2 }
        ];

        partials.forEach((partial, i) => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          osc.type = i < 2 ? "sine" : "triangle";
          osc.frequency.value = freq * partial.ratio;
          osc.detune.value = partial.detune;
          voice.gain.value = partial.level;
          osc.connect(voice).connect(mix);
          osc.start(now);
          osc.stop(now + duration + .72);
        });

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1900, now);
        filter.frequency.exponentialRampToValueAtTime(720, now + duration + .3);
        filter.Q.value = 1.1;

        envelope(gain, now, .082, duration + .22, .028, .40);
        mix.connect(filter).connect(gain);
        connectDryWet(gain, .70, .48);
      }

      function playRock(freq, duration, now) {
        // Warm analog fifths: an homage to open rock harmony, not a guitar.
        const mix = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        [
          { ratio: 1, type: "triangle", level: .58, detune: -3 },
          { ratio: 1.5, type: "sine", level: .20, detune: 3 },
          { ratio: 2, type: "sine", level: .10, detune: 0 }
        ].forEach(voiceData => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          osc.type = voiceData.type;
          osc.frequency.value = freq * voiceData.ratio;
          osc.detune.value = voiceData.detune;
          voice.gain.value = voiceData.level;
          osc.connect(voice).connect(mix);
          osc.start(now);
          osc.stop(now + duration + .55);
        });

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2300, now);
        filter.frequency.exponentialRampToValueAtTime(880, now + duration);
        filter.Q.value = .75;
        envelope(gain, now, .092, duration + .18, .045, .32);

        mix.connect(filter).connect(gain);
        connectDryWet(gain, .74, .40);
      }

      function playPop(freq, duration, now) {
        const mix = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        [
          { ratio: 1, level: .66, type: "sine" },
          { ratio: 2, level: .14, type: "triangle" },
          { ratio: 3.01, level: .045, type: "sine" }
        ].forEach((voiceData, i) => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          osc.type = voiceData.type;
          osc.frequency.value = freq * voiceData.ratio;
          osc.detune.value = i === 1 ? 3 : 0;
          voice.gain.value = voiceData.level;
          osc.connect(voice).connect(mix);
          osc.start(now);
          osc.stop(now + duration + .55);
        });

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(3400, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + duration + .15);
        filter.Q.value = 1.3;
        envelope(gain, now, .092, duration + .12, .022, .32);

        mix.connect(filter).connect(gain);
        connectDryWet(gain, .70, .46);
      }

      function playRnb(freq, duration, now) {
        const carrier = audioCtx.createOscillator();
        const mod = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        const tone = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        carrier.type = "sine";
        mod.type = "sine";
        carrier.frequency.value = freq;
        mod.frequency.value = freq * 2;
        modGain.gain.setValueAtTime(freq * .38, now);
        modGain.gain.exponentialRampToValueAtTime(.001, now + .42);
        mod.connect(modGain).connect(carrier.frequency);

        tone.type = "lowpass";
        tone.frequency.value = 2050;
        tone.Q.value = .55;
        envelope(gain, now, .108, duration + .25, .036, .42);

        carrier.connect(tone).connect(gain);
        connectDryWet(gain, .66, .54);
        carrier.start(now);
        mod.start(now);
        carrier.stop(now + duration + .72);
        mod.stop(now + duration + .72);
      }

      function playHipHop(freq, duration, now) {
        // Sub as breath, with a faint dusty overtone rather than a hard 808 hit.
        const sub = audioCtx.createOscillator();
        const overtone = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        const overtoneGain = audioCtx.createGain();

        sub.type = "sine";
        overtone.type = "triangle";
        sub.frequency.setValueAtTime(freq * 1.08, now);
        sub.frequency.exponentialRampToValueAtTime(freq, now + .11);
        overtone.frequency.value = freq * 2;
        overtoneGain.gain.value = .09;

        filter.type = "lowpass";
        filter.frequency.value = 680;
        filter.Q.value = .65;
        envelope(gain, now, .115, duration + .30, .026, .44);

        sub.connect(filter);
        overtone.connect(overtoneGain).connect(filter);
        filter.connect(gain);
        connectDryWet(gain, .82, .22);

        sub.start(now);
        overtone.start(now);
        sub.stop(now + duration + .78);
        overtone.stop(now + duration + .78);
      }

      function playElectronic(freq, duration, now) {
        const mix = audioCtx.createGain();
        const spectralFilter = audioCtx.createBiquadFilter();
        const bodyFilter = audioCtx.createBiquadFilter();
        const spectralGain = audioCtx.createGain();
        const bodyGain = audioCtx.createGain();
        const output = audioCtx.createGain();

        [-6, 0, 6].forEach((detune, i) => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          osc.type = i === 1 ? "triangle" : "sine";
          osc.frequency.value = freq * (i === 2 ? 2 : 1);
          osc.detune.value = detune;
          voice.gain.value = i === 2 ? .16 : .52;
          osc.connect(voice).connect(mix);
          osc.start(now);
          osc.stop(now + duration + .76);
        });

        // Moving spectral halo.
        spectralFilter.type = "bandpass";
        spectralFilter.frequency.setValueAtTime(760, now);
        spectralFilter.frequency.exponentialRampToValueAtTime(2900, now + duration * .55);
        spectralFilter.frequency.exponentialRampToValueAtTime(1050, now + duration + .34);
        spectralFilter.Q.value = 2.15;
        envelope(spectralGain, now, .092, duration + .20, .035, .48);

        // Parallel body path so the instrument remains clearly audible.
        bodyFilter.type = "lowpass";
        bodyFilter.frequency.setValueAtTime(2450, now);
        bodyFilter.frequency.exponentialRampToValueAtTime(1380, now + duration + .28);
        bodyFilter.Q.value = .58;
        envelope(bodyGain, now, .082, duration + .22, .028, .46);

        output.gain.value = 1;
        mix.connect(spectralFilter).connect(spectralGain).connect(output);
        mix.connect(bodyFilter).connect(bodyGain).connect(output);

        connectDryWet(output, .80, .52);
      }

      function noiseBuffer(duration) {
        const length = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
        const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
      }


      function getBackgroundNoise() {
        if (backgroundNoise) return backgroundNoise;
        const length = audioCtx.sampleRate;
        backgroundNoise = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
        const data = backgroundNoise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        return backgroundNoise;
      }

      function getMusicProfile(area) {
        const profiles = {
          lumen: {
            bpm: 58, volume: .155, cutoff: 3900,
            progression: [0, 3, 4, 0], chord: [0, 2, 4],
            style: "lumen", chordEveryBars: 2, chordLengthSteps: 31,
            pulseSteps: [0, 8], pulseEveryBars: 2,
            gestureSteps: [6, 14], gestureEveryBars: 2,
            airEveryBars: 4
          },
          kiri: {
            bpm: 54, volume: .145, cutoff: 3300,
            progression: [0, 3, 1, 0], chord: [0, 2],
            style: "kiri", chordEveryBars: 2, chordLengthSteps: 30,
            pulseSteps: [0], pulseEveryBars: 2,
            gestureSteps: [5, 13], gestureEveryBars: 2,
            airEveryBars: 4
          },
          nusa: {
            bpm: 60, volume: .145, cutoff: 4200,
            progression: [0, 3, 2, 4], chord: [0, 2, 4],
            style: "nusa", chordEveryBars: 2, chordLengthSteps: 30,
            pulseSteps: [0, 10], pulseEveryBars: 2,
            gestureSteps: [3, 11], gestureEveryBars: 2,
            airEveryBars: 4
          },
          surya: {
            bpm: 50, volume: .150, cutoff: 3000,
            progression: [0, 3, 4, 0], chord: [0, 3, 4],
            style: "surya", chordEveryBars: 2, chordLengthSteps: 32,
            pulseSteps: [0], pulseEveryBars: 1,
            gestureSteps: [7, 15], gestureEveryBars: 2,
            airEveryBars: 4
          },
          chrome: {
            bpm: 62, volume: .130, cutoff: 4600,
            progression: [0, 5, 8, 3], chord: [0, 4, 7],
            style: "chrome", chordEveryBars: 2, chordLengthSteps: 29,
            pulseSteps: [0, 12], pulseEveryBars: 2,
            gestureSteps: [4, 10], gestureEveryBars: 2,
            airEveryBars: 4
          },
          between: {
            bpm: 46, volume: .125, cutoff: 2900,
            progression: [0, 3, 6, 2], chord: [0, 3, 6],
            style: "between", chordEveryBars: 2, chordLengthSteps: 34,
            pulseSteps: [0], pulseEveryBars: 2,
            gestureSteps: [8], gestureEveryBars: 1,
            airEveryBars: 3
          },
          metal: {
            bpm: 48, volume: .120, cutoff: 2700,
            progression: [0, 1, 4, 0], chord: [0, 4],
            style: "metal", chordEveryBars: 2, chordLengthSteps: 32,
            pulseSteps: [0, 8], pulseEveryBars: 2,
            gestureSteps: [7, 15], gestureEveryBars: 2,
            airEveryBars: 4
          },
          rock: {
            bpm: 55, volume: .135, cutoff: 3200,
            progression: [0, 3, 4, 0], chord: [0, 4],
            style: "rock", chordEveryBars: 2, chordLengthSteps: 30,
            pulseSteps: [0, 10], pulseEveryBars: 2,
            gestureSteps: [6, 14], gestureEveryBars: 2,
            airEveryBars: 4
          },
          pop: {
            bpm: 60, volume: .145, cutoff: 4300,
            progression: [0, 3, 4, 3], chord: [0, 2, 4],
            style: "pop", chordEveryBars: 2, chordLengthSteps: 29,
            pulseSteps: [0, 8], pulseEveryBars: 2,
            gestureSteps: [3, 7, 13], gestureEveryBars: 2,
            airEveryBars: 4
          },
          rnb: {
            bpm: 52, volume: .145, cutoff: 3400,
            progression: [0, 3, 4, 1], chord: [0, 2, 4, 6],
            style: "rnb", chordEveryBars: 2, chordLengthSteps: 32,
            pulseSteps: [0], pulseEveryBars: 2,
            gestureSteps: [5, 13], gestureEveryBars: 2,
            airEveryBars: 4
          },
          hiphop: {
            bpm: 48, volume: .135, cutoff: 2400,
            progression: [0, 3, 5, 4], chord: [0, 2],
            style: "hiphop", chordEveryBars: 2, chordLengthSteps: 31,
            pulseSteps: [0, 11], pulseEveryBars: 2,
            gestureSteps: [7, 15], gestureEveryBars: 2,
            airEveryBars: 4
          },
          electronic: {
            bpm: 58, volume: .140, cutoff: 5000,
            progression: [0, 2, 4, 1], chord: [0, 2, 4],
            style: "electronic", chordEveryBars: 2, chordLengthSteps: 30,
            pulseSteps: [0, 8], pulseEveryBars: 2,
            gestureSteps: [2, 6, 10, 14], gestureEveryBars: 2,
            airEveryBars: 4
          }
        };
        return profiles[area.id] || profiles.lumen;
      }

      function deckFrequency(deck, scaleIndex, octave = 0) {
        const length = deck.scale.cents.length;
        const wrapped = ((scaleIndex % length) + length) % length;
        const carry = Math.floor(scaleIndex / length);
        const cents = deck.scale.cents[wrapped] + (octave + carry) * 1200;
        return centsToFreq(deck.root, cents);
      }

      function connectToDeck(node, deck) {
        node.connect(deck.input);
      }

      function scheduleBgKick(deck, time, accent = 1) {
        const style = deck.profile.drumStyle || "lounge";
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = style === "metal" || style === "rock" ? "triangle" : "sine";
        const startFrequency =
          style === "hiphop" ? 105 :
          style === "metal" ? 145 :
          style === "psy" ? 142 :
          style === "club" ? 132 : 125;
        const endFrequency =
          style === "hiphop" ? 39 :
          style === "metal" ? 52 :
          style === "psy" ? 43 : 46;
        const decay =
          style === "hiphop" ? .36 :
          style === "metal" ? .15 :
          style === "psy" ? .205 :
          style === "rock" ? .21 : .24;
        const peak =
          style === "metal" ? .115 :
          style === "rock" ? .135 :
          style === "psy" ? .155 :
          style === "hiphop" ? .19 :
          style === "club" ? .175 : .18;

        osc.frequency.setValueAtTime(startFrequency, time);
        osc.frequency.exponentialRampToValueAtTime(endFrequency, time + Math.min(.11, decay * .55));
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak * accent, time + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, time + decay);
        osc.connect(gain);
        connectToDeck(gain, deck);
        osc.start(time);
        osc.stop(time + decay + .03);
      }

      function scheduleBgHat(deck, time, open = false) {
        const style = deck.profile.drumStyle || "lounge";
        const source = audioCtx.createBufferSource();
        const hp = audioCtx.createBiquadFilter();
        const band = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        source.buffer = getBackgroundNoise();
        hp.type = "highpass";
        hp.frequency.value =
          style === "hiphop" ? 5200 :
          style === "metal" ? 7400 :
          style === "psy" ? 6900 :
          style === "rock" ? 6100 :
          open ? 5100 : 6800;
        band.type = "bandpass";
        band.frequency.value = style === "metal" ? 9100 : 7600;
        band.Q.value = .45;

        const length =
          style === "hiphop" && open ? .11 :
          open ? .18 :
          style === "metal" ? .035 : .055;
        const peak =
          style === "metal" ? .010 :
          style === "rock" ? .014 :
          style === "psy" ? .014 :
          style === "hiphop" ? .011 :
          style === "club" ? .019 : .017;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak * (open ? 1.35 : 1), time + .002);
        gain.gain.exponentialRampToValueAtTime(.0001, time + length);
        source.connect(hp).connect(band).connect(gain);
        connectToDeck(gain, deck);
        source.start(time, Math.random() * .75, length + .02);
        source.stop(time + length + .03);
      }

      function scheduleBgBackbeat(deck, time) {
        const style = deck.profile.drumStyle || "clap";

        if (style === "rim") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1650, time);
          osc.frequency.exponentialRampToValueAtTime(720, time + .035);
          gain.gain.setValueAtTime(.0001, time);
          gain.gain.exponentialRampToValueAtTime(.032, time + .001);
          gain.gain.exponentialRampToValueAtTime(.0001, time + .06);
          osc.connect(gain);
          connectToDeck(gain, deck);
          osc.start(time);
          osc.stop(time + .07);
          return;
        }

        if (style === "rock" || style === "metal" || style === "hiphop") {
          const body = audioCtx.createOscillator();
          const bodyGain = audioCtx.createGain();
          body.type = "triangle";
          body.frequency.setValueAtTime(style === "metal" ? 225 : 190, time);
          body.frequency.exponentialRampToValueAtTime(105, time + .09);
          bodyGain.gain.setValueAtTime(.0001, time);
          bodyGain.gain.exponentialRampToValueAtTime(
            style === "metal" ? .055 : style === "hiphop" ? .07 : .065,
            time + .002
          );
          bodyGain.gain.exponentialRampToValueAtTime(.0001, time + .14);
          body.connect(bodyGain);
          connectToDeck(bodyGain, deck);
          body.start(time);
          body.stop(time + .16);

          const noise = audioCtx.createBufferSource();
          const band = audioCtx.createBiquadFilter();
          const noiseGain = audioCtx.createGain();
          noise.buffer = getBackgroundNoise();
          band.type = "bandpass";
          band.frequency.value = style === "metal" ? 2600 : style === "hiphop" ? 1700 : 2200;
          band.Q.value = .75;
          noiseGain.gain.setValueAtTime(.0001, time);
          noiseGain.gain.exponentialRampToValueAtTime(
            style === "metal" ? .022 : .032,
            time + .002
          );
          noiseGain.gain.exponentialRampToValueAtTime(.0001, time + .11);
          noise.connect(band).connect(noiseGain);
          connectToDeck(noiseGain, deck);
          noise.start(time, Math.random() * .7, .13);
          noise.stop(time + .14);
          return;
        }

        [0, .018, .036].forEach((offset, i) => {
          const source = audioCtx.createBufferSource();
          const band = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();
          source.buffer = getBackgroundNoise();
          band.type = "bandpass";
          band.frequency.value = 1250 + i * 330;
          band.Q.value = .75;
          const t = time + offset;
          gain.gain.setValueAtTime(.0001, t);
          gain.gain.exponentialRampToValueAtTime(.025 / (1 + i * .35), t + .002);
          gain.gain.exponentialRampToValueAtTime(.0001, t + .085);
          source.connect(band).connect(gain);
          connectToDeck(gain, deck);
          source.start(t, Math.random() * .7, .1);
          source.stop(t + .11);
        });
      }

      function scheduleBgBass(deck, degree, time, duration = .23) {
        const style = deck.profile.bassStyle || "soft";
        const freq = deckFrequency(deck, degree, -1);

        if (style.startsWith("psy")) {
          const osc = audioCtx.createOscillator();
          const body = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();
          const shaper = audioCtx.createWaveShaper();
          const flavor = deck.profile.psyFlavor || "electronic";

          osc.type =
            flavor === "metal" || flavor === "rock" ? "sawtooth" :
            flavor === "electronic" ? "square" :
            "triangle";
          body.type = "sine";

          osc.frequency.setValueAtTime(freq * 1.28, time);
          osc.frequency.exponentialRampToValueAtTime(freq, time + .024);
          body.frequency.value = freq;

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(
            flavor === "metal" ? 780 :
            flavor === "rock" ? 920 :
            flavor === "pop" ? 1120 :
            flavor === "rnb" ? 760 :
            flavor === "hiphop" ? 590 : 1380,
            time
          );
          filter.frequency.exponentialRampToValueAtTime(
            flavor === "electronic" ? 520 : 330,
            time + Math.min(.13, duration)
          );
          filter.Q.value =
            flavor === "electronic" ? 4.8 :
            flavor === "pop" ? 3.2 : 2.1;

          shaper.curve = distortionCurve(
            flavor === "metal" ? 18 :
            flavor === "rock" ? 11 :
            flavor === "electronic" ? 9 : 5
          );
          shaper.oversample = "2x";

          const bodyGain = audioCtx.createGain();
          bodyGain.gain.value =
            flavor === "hiphop" ? .43 :
            flavor === "rnb" ? .33 : .22;

          const peak =
            flavor === "metal" ? .030 :
            flavor === "rock" ? .043 :
            flavor === "pop" ? .050 :
            flavor === "rnb" ? .047 :
            flavor === "hiphop" ? .056 : .048;
          const gate = Math.min(
            flavor === "hiphop" ? .145 :
            flavor === "rnb" ? .125 : .105,
            duration
          );

          gain.gain.setValueAtTime(.0001, time);
          gain.gain.exponentialRampToValueAtTime(peak, time + .003);
          gain.gain.exponentialRampToValueAtTime(.0001, time + gate);

          osc.connect(filter);
          body.connect(bodyGain).connect(filter);
          filter.connect(shaper).connect(gain);
          connectToDeck(gain, deck);

          osc.start(time);
          body.start(time);
          osc.stop(time + gate + .035);
          body.stop(time + gate + .035);
          return;
        }

        if (style === "808") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq * 1.32, time);
          osc.frequency.exponentialRampToValueAtTime(freq, time + .075);
          gain.gain.setValueAtTime(.0001, time);
          gain.gain.exponentialRampToValueAtTime(.145, time + .006);
          gain.gain.exponentialRampToValueAtTime(.0001, time + Math.max(.34, duration * 2.2));
          osc.connect(gain);
          connectToDeck(gain, deck);
          osc.start(time);
          osc.stop(time + Math.max(.38, duration * 2.3));
          return;
        }

        const osc = audioCtx.createOscillator();
        const second = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type =
          style === "chug" || style === "rock" ? "sawtooth" :
          style === "pulse" ? "square" : "sine";
        second.type = "triangle";
        osc.frequency.setValueAtTime(freq * (style === "chug" ? 1 : 1.02), time);
        if (style !== "chug") osc.frequency.exponentialRampToValueAtTime(freq, time + .045);
        second.frequency.value = freq * 2;

        filter.type = "lowpass";
        filter.frequency.value =
          style === "chug" ? 520 :
          style === "rock" ? 760 :
          style === "pulse" ? 900 :
          style === "pop" ? 680 : 540;
        filter.Q.value = style === "pulse" ? 3.4 : 1.1;

        const peak =
          style === "chug" ? .042 :
          style === "rock" ? .070 :
          style === "pulse" ? .075 :
          style === "pop" ? .078 :
          style === "warm" ? .090 : .082;
        const gate =
          style === "chug" ? Math.min(.13, duration) :
          style === "pulse" ? Math.min(.19, duration) :
          duration;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak, time + .006);
        gain.gain.exponentialRampToValueAtTime(.0001, time + gate);

        const secondGain = audioCtx.createGain();
        secondGain.gain.value =
          style === "chug" ? .06 :
          style === "rock" ? .12 :
          style === "pop" ? .18 : .13;

        if (style === "chug") {
          const shaper = audioCtx.createWaveShaper();
          shaper.curve = distortionCurve(18);
          shaper.oversample = "2x";
          osc.connect(filter);
          second.connect(secondGain).connect(filter);
          filter.connect(shaper).connect(gain);
        } else {
          osc.connect(filter);
          second.connect(secondGain).connect(filter);
          filter.connect(gain);
        }

        connectToDeck(gain, deck);
        osc.start(time);
        second.start(time);
        osc.stop(time + gate + .04);
        second.stop(time + gate + .04);
      }

      function schedulePowerChord(deck, degree, time, duration) {
        const isMetal = deck.profile.texture === "metal";
        const mix = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        [0, 4, 7].forEach((offset, i) => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.value = deckFrequency(deck, degree + offset, deck.root < 130 ? 1 : 0);
          osc.detune.value = i === 2 ? -4 : i * 2;
          voice.gain.value = i === 0 ? .36 : .21;
          osc.connect(voice).connect(mix);
          osc.start(time);
          osc.stop(time + duration + .12);
        });

        mix.gain.value = isMetal ? .18 : .30;
        shaper.curve = distortionCurve(isMetal ? 24 : 12);
        shaper.oversample = "2x";
        filter.type = "lowpass";
        filter.frequency.value = isMetal ? 1550 : 2600;
        filter.Q.value = .8;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(isMetal ? .018 : .040, time + .006);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);

        mix.connect(shaper).connect(filter).connect(gain);
        connectToDeck(gain, deck);
      }

      function scheduleRhodesChord(deck, degree, time, duration) {
        const mix = audioCtx.createGain();
        const tone = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        deck.profile.chord.forEach((offset, i) => {
          const carrier = audioCtx.createOscillator();
          const mod = audioCtx.createOscillator();
          const modGain = audioCtx.createGain();
          const voice = audioCtx.createGain();
          const freq = deckFrequency(deck, degree + offset, 0);

          carrier.type = "sine";
          mod.type = "sine";
          carrier.frequency.value = freq;
          mod.frequency.value = freq * 2;
          modGain.gain.value = freq * .42;
          voice.gain.value = 1 / Math.max(3.3, deck.profile.chord.length);

          mod.connect(modGain).connect(carrier.frequency);
          carrier.connect(voice).connect(mix);
          carrier.start(time);
          mod.start(time);
          carrier.stop(time + duration + .35);
          mod.stop(time + duration + .35);
        });

        tone.type = "lowpass";
        tone.frequency.value = 2350;
        tone.Q.value = .7;
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(.052, time + .035);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
        mix.connect(tone).connect(gain);
        connectToDeck(gain, deck);
      }

      function scheduleBgChord(deck, degree, time, duration) {
        const style = deck.profile.chordStyle || "pad";
        if (style === "power") {
          schedulePowerChord(deck, degree, time, duration);
          return;
        }
        if (style === "rhodes") {
          scheduleRhodesChord(deck, degree, time, duration);
          return;
        }

        const mix = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        const texture = deck.profile.texture;
        const chordOctave = deck.root < 130 ? 1 : 0;

        deck.profile.chord.forEach((offset, i) => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          osc.type =
            style === "sample" ? "triangle" :
            style === "popStab" ? "sawtooth" :
            style === "offbeat" ? "sawtooth" :
            texture === "rnb" || texture === "glass" || texture === "micro" ? "sine" :
            texture === "pluck" || texture === "gamelan" ? "triangle" :
            "sawtooth";
          osc.frequency.value = deckFrequency(deck, degree + offset, chordOctave);
          osc.detune.value = (i - 1) * (texture === "micro" ? 4.5 : 2.2);
          voice.gain.value = 1 / Math.max(2.6, deck.profile.chord.length);
          osc.connect(voice).connect(mix);
          osc.start(time);
          osc.stop(time + duration + .28);
        });

        filter.type = "lowpass";
        filter.frequency.value =
          style === "sample" ? 1450 :
          style === "offbeat" ? 4200 :
          style === "popStab" ? 3400 :
          texture === "electronic" ? 3300 :
          texture === "pop" ? 3100 : 2200;
        filter.Q.value = style === "offbeat" ? 4.4 : style === "popStab" ? 2.1 : .9;

        const peak =
          style === "sample" ? .028 :
          style === "offbeat" ? .040 :
          style === "popStab" ? .044 : .047;
        const attack = style === "sample" || style === "popStab" || style === "offbeat" ? .006 : .045;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak, time + attack);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);

        mix.connect(filter).connect(gain);
        connectToDeck(gain, deck);
      }

      function scheduleBgMotif(deck, degree, time) {
        const style = deck.profile.motifStyle || deck.profile.texture;
        const texture = deck.profile.texture;
        const octave =
          style === "sample" ? 0 :
          style === "metalLead" ? 1 :
          style === "rockLick" ? 1 : 1;
        const freq = deckFrequency(deck, degree, octave);
        const gain = audioCtx.createGain();

        if (texture === "gamelan") {
          const carrier = audioCtx.createOscillator();
          const mod = audioCtx.createOscillator();
          const modGain = audioCtx.createGain();
          carrier.type = "sine";
          carrier.frequency.value = freq;
          mod.type = "sine";
          mod.frequency.value = freq * 1.414;
          modGain.gain.value = freq * .42;
          mod.connect(modGain).connect(carrier.frequency);
          carrier.connect(gain);
          connectToDeck(gain, deck);
          gain.gain.setValueAtTime(.0001, time);
          gain.gain.exponentialRampToValueAtTime(.032, time + .003);
          gain.gain.exponentialRampToValueAtTime(.0001, time + .42);
          carrier.start(time); mod.start(time);
          carrier.stop(time + .48); mod.stop(time + .48);
          return;
        }

        if (style === "rnbBell") {
          const carrier = audioCtx.createOscillator();
          const mod = audioCtx.createOscillator();
          const modGain = audioCtx.createGain();
          carrier.type = "sine";
          mod.type = "sine";
          carrier.frequency.value = freq;
          mod.frequency.value = freq * 3;
          modGain.gain.value = freq * .32;
          mod.connect(modGain).connect(carrier.frequency);
          gain.gain.setValueAtTime(.0001, time);
          gain.gain.exponentialRampToValueAtTime(.025, time + .004);
          gain.gain.exponentialRampToValueAtTime(.0001, time + .36);
          carrier.connect(gain);
          connectToDeck(gain, deck);
          carrier.start(time); mod.start(time);
          carrier.stop(time + .42); mod.stop(time + .42);
          return;
        }

        const source = audioCtx.createOscillator();
        source.type =
          style === "electroArp" ? "square" :
          style === "popArp" ? "sawtooth" :
          style === "sample" ? "triangle" :
          style === "metalLead" || style === "rockLick" ? "sawtooth" :
          texture === "glitch" || texture === "electronic" ? "square" :
          "triangle";
        source.frequency.setValueAtTime(
          texture === "raga" ? freq * .985 : freq,
          time
        );
        if (texture === "raga") source.frequency.exponentialRampToValueAtTime(freq, time + .07);

        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value =
          style === "metalLead" ? 1250 :
          style === "rockLick" ? 2350 :
          style === "electroArp" ? 4800 :
          style === "popArp" ? 3900 :
          style === "sample" ? 1050 :
          texture === "hiphop" ? 700 : 3000;
        filter.Q.value = style === "electroArp" ? 5 : style === "popArp" ? 2.7 : 1.2;

        const peak =
          style === "metalLead" ? .013 :
          style === "rockLick" ? .023 :
          style === "electroArp" ? .028 :
          style === "popArp" ? .026 :
          style === "sample" ? .018 : .030;
        const release =
          style === "sample" ? .28 :
          style === "rockLick" ? .24 :
          style === "metalLead" ? .14 : .18;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak, time + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, time + release);

        if (style === "metalLead" || style === "rockLick") {
          const shaper = audioCtx.createWaveShaper();
          shaper.curve = distortionCurve(style === "metalLead" ? 14 : 8);
          shaper.oversample = "2x";
          source.connect(filter).connect(shaper).connect(gain);
        } else {
          source.connect(filter).connect(gain);
        }

        connectToDeck(gain, deck);
        source.start(time);
        source.stop(time + release + .06);
      }


      function schedulePsyFx(deck, time, bar) {
        const flavor = deck.profile.psyFlavor || "electronic";
        const duration = deck.secondsPerStep * 5.5;

        if (flavor === "hiphop") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(deck.root * .9, time);
          osc.frequency.exponentialRampToValueAtTime(deck.root * .35, time + duration);
          gain.gain.setValueAtTime(.0001, time);
          gain.gain.exponentialRampToValueAtTime(.032, time + .015);
          gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
          osc.connect(gain);
          connectToDeck(gain, deck);
          osc.start(time);
          osc.stop(time + duration + .03);
          return;
        }

        const source = audioCtx.createBufferSource();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        source.buffer = getBackgroundNoise();
        filter.type = flavor === "rnb" ? "bandpass" : "highpass";
        filter.frequency.setValueAtTime(
          flavor === "metal" ? 520 :
          flavor === "rock" ? 690 :
          flavor === "pop" ? 1150 :
          flavor === "rnb" ? 780 : 900,
          time
        );
        filter.frequency.exponentialRampToValueAtTime(
          flavor === "metal" ? 6200 :
          flavor === "rock" ? 5400 :
          flavor === "pop" ? 7900 :
          flavor === "rnb" ? 3100 : 9800,
          time + duration
        );
        filter.Q.value =
          flavor === "rnb" ? 6 :
          flavor === "electronic" ? 4.5 : 1.1;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(
          flavor === "metal" ? .010 :
          flavor === "rock" ? .013 :
          flavor === "pop" ? .014 :
          flavor === "rnb" ? .011 : .016,
          time + duration * .72
        );
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);

        source.connect(filter).connect(gain);
        connectToDeck(gain, deck);
        source.start(time, Math.random() * .4, duration);
        source.stop(time + duration + .02);

        if (flavor === "electronic" || flavor === "pop") {
          const tone = audioCtx.createOscillator();
          const toneFilter = audioCtx.createBiquadFilter();
          const toneGain = audioCtx.createGain();
          tone.type = flavor === "electronic" ? "sawtooth" : "sine";
          tone.frequency.setValueAtTime(
            deckFrequency(deck, (bar + 2) % deck.scale.cents.length, 1),
            time
          );
          toneFilter.type = "bandpass";
          toneFilter.frequency.setValueAtTime(650, time);
          toneFilter.frequency.exponentialRampToValueAtTime(5200, time + duration);
          toneFilter.Q.value = 7;
          toneGain.gain.setValueAtTime(.0001, time);
          toneGain.gain.exponentialRampToValueAtTime(.009, time + duration * .55);
          toneGain.gain.exponentialRampToValueAtTime(.0001, time + duration);
          tone.connect(toneFilter).connect(toneGain);
          connectToDeck(toneGain, deck);
          tone.start(time);
          tone.stop(time + duration + .02);
        }
      }

      function ambientStyle(style) {
        const styles = {
          lumen:      { wave: "sine",     second: "triangle", detune: 4,  bright: 2800, peak: .042, sub: .14, shimmer: .10 },
          kiri:       { wave: "triangle", second: "sine",     detune: 2,  bright: 2100, peak: .036, sub: .10, shimmer: .07 },
          nusa:       { wave: "sine",     second: "triangle", detune: 1,  bright: 3300, peak: .035, sub: .09, shimmer: .16 },
          surya:      { wave: "sine",     second: "sine",     detune: 5,  bright: 1600, peak: .040, sub: .22, shimmer: .05 },
          chrome:     { wave: "triangle", second: "sine",     detune: 7,  bright: 3600, peak: .030, sub: .08, shimmer: .13 },
          between:    { wave: "sine",     second: "sine",     detune: 9,  bright: 1900, peak: .028, sub: .12, shimmer: .08 },
          metal:      { wave: "sine",     second: "triangle", detune: 3,  bright: 1750, peak: .030, sub: .24, shimmer: .07 },
          rock:       { wave: "triangle", second: "sine",     detune: 5,  bright: 2200, peak: .034, sub: .18, shimmer: .06 },
          pop:        { wave: "sine",     second: "triangle", detune: 3,  bright: 3500, peak: .037, sub: .10, shimmer: .14 },
          rnb:        { wave: "sine",     second: "sine",     detune: 2,  bright: 2000, peak: .040, sub: .16, shimmer: .09 },
          hiphop:     { wave: "sine",     second: "triangle", detune: 2,  bright: 1250, peak: .034, sub: .28, shimmer: .035 },
          electronic: { wave: "triangle", second: "sine",     detune: 8,  bright: 4200, peak: .033, sub: .11, shimmer: .17 }
        };
        return styles[style] || styles.lumen;
      }

      function scheduleAmbientPad(deck, degree, time, duration) {
        const style = deck.profile.style;
        const character = ambientStyle(style);
        const mix = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        const voices = [...deck.profile.chord];

        // Certain homages are carried by interval shape rather than instrument imitation.
        if (style === "metal" && !voices.includes(4)) voices.push(4);
        if (style === "rock" && !voices.includes(4)) voices.push(4);

        voices.forEach((offset, index) => {
          const osc = audioCtx.createOscillator();
          const voice = audioCtx.createGain();
          const octave = deck.root < 130 ? 1 : 0;
          osc.type = index % 2 === 0 ? character.wave : character.second;
          osc.frequency.value = deckFrequency(deck, degree + offset, octave);
          osc.detune.value = (index - (voices.length - 1) / 2) * character.detune;
          voice.gain.value = 1 / Math.max(3.5, voices.length * 1.55);
          osc.connect(voice).connect(mix);
          osc.start(time);
          osc.stop(time + duration + 1.8);
        });

        // A low, nearly subliminal root.
        const sub = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        sub.type = "sine";
        sub.frequency.value = deckFrequency(deck, degree, -1);
        subGain.gain.value = character.sub;
        sub.connect(subGain).connect(mix);
        sub.start(time);
        sub.stop(time + duration + 1.8);

        // A very faint upper partial gives each garden a halo.
        const shimmer = audioCtx.createOscillator();
        const shimmerGain = audioCtx.createGain();
        shimmer.type = "sine";
        shimmer.frequency.value = deckFrequency(deck, degree, 2) * (
          style === "nusa" ? 1.007 :
          style === "between" ? 1.004 :
          style === "metal" ? 1.5 :
          1
        );
        shimmerGain.gain.value = character.shimmer;
        shimmer.connect(shimmerGain).connect(mix);
        shimmer.start(time);
        shimmer.stop(time + duration + 1.8);

        filter.type = style === "electronic" || style === "between" ? "bandpass" : "lowpass";
        filter.frequency.setValueAtTime(Math.max(420, character.bright * .42), time);
        filter.frequency.exponentialRampToValueAtTime(character.bright, time + duration * .44);
        filter.frequency.exponentialRampToValueAtTime(Math.max(500, character.bright * .52), time + duration);
        filter.Q.value =
          style === "electronic" ? 2.7 :
          style === "between" ? 2.2 :
          style === "nusa" ? 1.5 : .65;

        const attack =
          style === "surya" || style === "between" ? 1.35 :
          style === "metal" ? 1.10 :
          .72;
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(character.peak, time + attack);
        gain.gain.setValueAtTime(character.peak * .82, time + Math.max(attack + .1, duration * .68));
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration + 1.2);

        mix.connect(filter).connect(gain);
        connectToDeck(gain, deck);
      }

      function scheduleAmbientPulse(deck, degree, time) {
        const style = deck.profile.style;
        const character = ambientStyle(style);
        const osc = audioCtx.createOscillator();
        const overtone = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        const overtoneGain = audioCtx.createGain();

        osc.type = "sine";
        overtone.type = style === "rock" || style === "nusa" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(deckFrequency(deck, degree, -1) * 1.025, time);
        osc.frequency.exponentialRampToValueAtTime(deckFrequency(deck, degree, -1), time + .12);
        overtone.frequency.value = deckFrequency(deck, degree, 0);
        overtoneGain.gain.value =
          style === "metal" ? .08 :
          style === "hiphop" ? .035 :
          .055;

        filter.type = "lowpass";
        filter.frequency.value =
          style === "hiphop" ? 520 :
          style === "metal" ? 720 :
          style === "surya" ? 640 :
          980;
        filter.Q.value = .55;

        const peak =
          style === "hiphop" ? .050 :
          style === "metal" ? .030 :
          .034;
        const release =
          style === "surya" || style === "hiphop" ? 1.10 :
          .78;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak, time + .045);
        gain.gain.exponentialRampToValueAtTime(.0001, time + release);

        osc.connect(filter);
        overtone.connect(overtoneGain).connect(filter);
        filter.connect(gain);
        connectToDeck(gain, deck);

        osc.start(time);
        overtone.start(time);
        osc.stop(time + release + .08);
        overtone.stop(time + release + .08);
      }

      function scheduleAmbientGesture(deck, degree, time) {
        const style = deck.profile.style;
        const character = ambientStyle(style);
        const carrier = audioCtx.createOscillator();
        const second = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        const secondGain = audioCtx.createGain();
        const freq = deckFrequency(deck, degree, 1);

        carrier.type =
          style === "kiri" || style === "nusa" ? "triangle" :
          "sine";
        second.type = "sine";
        carrier.frequency.setValueAtTime(
          style === "surya" ? freq * .982 : freq,
          time
        );
        if (style === "surya") {
          carrier.frequency.exponentialRampToValueAtTime(freq, time + .42);
        }

        second.frequency.value = freq * (
          style === "metal" ? 1.5 :
          style === "between" ? 1.008 :
          style === "electronic" ? 2.01 :
          2
        );
        secondGain.gain.value =
          style === "pop" ? .16 :
          style === "nusa" ? .14 :
          style === "metal" ? .07 :
          .09;

        filter.type =
          style === "electronic" || style === "chrome" ? "bandpass" :
          "lowpass";
        filter.frequency.setValueAtTime(
          style === "hiphop" ? 850 :
          Math.max(1100, character.bright * .55),
          time
        );
        filter.frequency.exponentialRampToValueAtTime(
          character.bright,
          time + .35
        );
        filter.Q.value =
          style === "electronic" ? 3.8 :
          style === "chrome" ? 2.4 :
          style === "kiri" ? 1.7 :
          .8;

        const peak =
          style === "metal" ? .020 :
          style === "hiphop" ? .017 :
          style === "pop" ? .027 :
          .023;
        const attack =
          style === "surya" || style === "rnb" ? .18 :
          style === "metal" ? .12 :
          .035;
        const release =
          style === "between" || style === "electronic" ? 1.65 :
          style === "rnb" ? 1.40 :
          1.05;

        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak, time + attack);
        gain.gain.exponentialRampToValueAtTime(.0001, time + release);

        carrier.connect(filter);
        second.connect(secondGain).connect(filter);
        filter.connect(gain);
        connectToDeck(gain, deck);

        carrier.start(time);
        second.start(time);
        carrier.stop(time + release + .1);
        second.stop(time + release + .1);
      }

      function scheduleAmbientAir(deck, time) {
        const style = deck.profile.style;
        const source = audioCtx.createBufferSource();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        const duration = deck.secondsPerStep * 12;

        source.buffer = getBackgroundNoise();
        filter.type = style === "nusa" || style === "electronic" ? "bandpass" : "highpass";
        filter.frequency.setValueAtTime(
          style === "hiphop" ? 900 :
          style === "metal" ? 1200 :
          1500,
          time
        );
        filter.frequency.exponentialRampToValueAtTime(
          style === "rnb" ? 3300 :
          style === "metal" ? 4100 :
          style === "between" ? 2900 :
          6200,
          time + duration
        );
        filter.Q.value =
          style === "nusa" ? 5.2 :
          style === "electronic" ? 4.0 :
          .65;

        const peak =
          style === "metal" ? .0055 :
          style === "hiphop" ? .0045 :
          .0075;
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(peak, time + duration * .55);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);

        source.connect(filter).connect(gain);
        connectToDeck(gain, deck);
        source.start(time, Math.random() * .5, duration);
        source.stop(time + duration + .02);
      }

      function scheduleMusicStep(deck, absoluteStep, time) {
        if (deck.stopped) return;

        const step = absoluteStep % 16;
        const bar = Math.floor(absoluteStep / 16);
        const profile = deck.profile;
        const progressionDegree = profile.progression[
          Math.floor(bar / Math.max(1, profile.chordEveryBars)) % profile.progression.length
        ];
        const scaleLength = deck.scale.cents.length;

        if (
          step === 0 &&
          bar % Math.max(1, profile.chordEveryBars) === 0
        ) {
          scheduleAmbientPad(
            deck,
            progressionDegree % scaleLength,
            time,
            deck.secondsPerStep * profile.chordLengthSteps
          );
        }

        if (
          profile.pulseSteps.includes(step) &&
          bar % Math.max(1, profile.pulseEveryBars) === 0
        ) {
          const pulseOffset =
            step === 0 ? 0 :
            Math.max(1, Math.floor(scaleLength / 2));
          scheduleAmbientPulse(
            deck,
            (progressionDegree + pulseOffset) % scaleLength,
            time
          );
        }

        if (
          profile.gestureSteps.includes(step) &&
          bar % Math.max(1, profile.gestureEveryBars) === 1
        ) {
          const gestureMap = [0, 2, 4, 1, 3, 5, 2, 4, 1, 5, 3, 0, 4, 2, 5, 1];
          scheduleAmbientGesture(
            deck,
            (progressionDegree + gestureMap[step]) % scaleLength,
            time
          );
        }

        if (
          step === 15 &&
          bar % Math.max(1, profile.airEveryBars) === profile.airEveryBars - 1
        ) {
          scheduleAmbientAir(deck, time);
        }
      }

      function runMusicScheduler(deck) {
        if (deck.stopped || !audioCtx) return;
        const horizon = audioCtx.currentTime + .16;
        while (deck.nextTime < horizon) {
          scheduleMusicStep(deck, deck.step, deck.nextTime);
          const pairSwing = deck.step % 2 === 0
            ? 1 - deck.profile.swing
            : 1 + deck.profile.swing;
          deck.nextTime += deck.secondsPerStep * pairSwing;
          deck.step++;
        }
      }

      function createMusicDeck() {
        const area = areas[areaIndex];
        const profile = getMusicProfile(area);
        const scale = getAreaScale(area, stage);
        const input = audioCtx.createGain();
        const tone = audioCtx.createBiquadFilter();
        const compressor = audioCtx.createDynamicsCompressor();
        const output = audioCtx.createGain();
        const send = audioCtx.createGain();

        tone.type = "lowpass";
        tone.frequency.value = profile.cutoff;
        tone.Q.value = .55;

        compressor.threshold.value = -24;
        compressor.knee.value = 18;
        compressor.ratio.value = 3.2;
        compressor.attack.value = .012;
        compressor.release.value = .24;

        output.gain.value = .0001;
        send.gain.value =
          profile.style === "between" ? .48 :
          profile.style === "electronic" ? .42 :
          profile.style === "rnb" ? .40 :
          profile.style === "metal" ? .31 :
          profile.style === "hiphop" ? .24 :
          .36;

        input.connect(tone).connect(compressor).connect(output);
        output.connect(backgroundBus);
        output.connect(send).connect(backgroundConvolver);

        const deck = {
          areaId: area.id,
          root: area.root,
          scale: {
            cents: [...scale.cents],
            labels: [...scale.labels]
          },
          profile,
          input,
          tone,
          compressor,
          output,
          send,
          step: 0,
          secondsPerStep: 60 / profile.bpm / 4,
          nextTime: audioCtx.currentTime + .06,
          timer: null,
          stopped: false
        };

        deck.timer = setInterval(() => runMusicScheduler(deck), 35);
        backgroundDecks.add(deck);
        runMusicScheduler(deck);
        return deck;
      }

      function holdAudioParam(param, time) {
        if (typeof param.cancelAndHoldAtTime === "function") {
          param.cancelAndHoldAtTime(time);
        } else {
          const value = Math.max(.0001, param.value);
          param.cancelScheduledValues(time);
          param.setValueAtTime(value, time);
        }
      }

      function destroyMusicDeck(deck) {
        if (!deck || deck.stopped) return;
        deck.stopped = true;
        clearInterval(deck.timer);
        backgroundDecks.delete(deck);
        try { deck.input.disconnect(); } catch {}
        try { deck.output.disconnect(); } catch {}
        try { deck.send.disconnect(); } catch {}
      }

      function fadeOutMusicDeck(deck, seconds = 2.6) {
        if (!deck || deck.stopped || !audioCtx) return;
        const now = audioCtx.currentTime;
        holdAudioParam(deck.output.gain, now);
        deck.output.gain.exponentialRampToValueAtTime(.0001, now + seconds);
        setTimeout(() => destroyMusicDeck(deck), (seconds + .45) * 1000);
      }

      function transitionBackgroundMusic(force = false) {
        if (!atlasEntered || !audioCtx || !backgroundEnabled) return;
        const area = areas[areaIndex];
        const scale = getAreaScale(area, stage);
        const signature = `${area.id}:${scale.name}:${gameMode}`;

        if (!force && backgroundDeck?.signature === signature) return;

        const oldDeck = backgroundDeck;
        const nextDeck = createMusicDeck();
        nextDeck.signature = signature;
        backgroundDeck = nextDeck;

        const now = audioCtx.currentTime;
        const target = Math.max(.0001, nextDeck.profile.volume * backgroundDuck);
        nextDeck.output.gain.setValueAtTime(.0001, now);
        nextDeck.output.gain.exponentialRampToValueAtTime(target, now + 4.8);

        if (oldDeck && oldDeck !== nextDeck) fadeOutMusicDeck(oldDeck, 4.2);
      }

      function stopBackgroundMusic(seconds = 1.2) {
        const decks = [...backgroundDecks];
        backgroundDeck = null;
        decks.forEach(deck => fadeOutMusicDeck(deck, seconds));
      }

      function duckBackgroundMusic(multiplier = 1, seconds = .3) {
        backgroundDuck = Math.max(.12, Math.min(1, multiplier));
        if (!backgroundDeck || backgroundDeck.stopped || !audioCtx || !backgroundEnabled) return;
        const now = audioCtx.currentTime;
        holdAudioParam(backgroundDeck.output.gain, now);
        const target = Math.max(.0001, backgroundDeck.profile.volume * backgroundDuck);
        backgroundDeck.output.gain.exponentialRampToValueAtTime(target, now + seconds);
      }

      function startDrone() {
        if (!audioCtx || !backgroundEnabled || backgroundVolume <= .001) return;
        stopDrone();

        const area = areas[areaIndex];
        droneBus = audioCtx.createGain();
        droneBus.gain.setValueAtTime(.0001, audioCtx.currentTime);
        droneBus.gain.exponentialRampToValueAtTime(area.instrument === "raga" ? .055 : .018, audioCtx.currentTime + 1.8);
        droneBus.connect(backgroundBus);

        const roots = area.instrument === "raga"
          ? [area.root / 2, area.root, area.root * 1.5]
          : [area.root / 2, area.root * .75];

        roots.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();

          osc.type = i === 0 ? "sine" : "triangle";
          osc.frequency.value = freq;
          osc.detune.value = i % 2 ? 4 : -4;
          filter.type = "lowpass";
          filter.frequency.value = area.instrument === "raga" ? 620 : 260;
          gain.gain.value = i === 0 ? .75 : .22;

          osc.connect(filter).connect(gain).connect(droneBus);
          osc.start();
          droneNodes.push(osc);
        });
      }

      function stopDrone() {
        if (droneBus && audioCtx) {
          const now = audioCtx.currentTime;
          droneBus.gain.cancelScheduledValues(now);
          droneBus.gain.setTargetAtTime(.0001, now, .08);
          droneNodes.forEach(node => {
            try { node.stop(now + .5); } catch {}
          });
        }
        droneNodes = [];
        droneBus = null;
      }

      function animateTone(index, duration) {
        const tone = dom.tones.children[index];
        if (!tone) return;
        tone.classList.remove("active");
        void tone.offsetWidth;
        tone.classList.add("active");
        setTimeout(() => tone.classList.remove("active"), Math.max(250, duration * 700));
      }

      function generateSequence() {
        const area = areas[areaIndex];
        const count = dom.tones.children.length;
        const length = area.lengths[stage - 1];
        sequence = [];

        while (sequence.length < length) {
          let next = Math.floor(Math.random() * count);
          const last = sequence.at(-1);
          const before = sequence.at(-2);

          if (sequence.length > 1 && next === last && last === before) {
            next = (next + 1 + Math.floor(Math.random() * Math.max(1, count - 1))) % count;
          }
          sequence.push(next);
        }

        expected = area.mode[stage - 1] === "reverse"
          ? [...sequence].reverse()
          : [...sequence];
      }

      async function playSequence() {
        if (playing) return;
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        startDrone();
        duckBackgroundMusic(.48, .32);

        if (!sequence.length) generateSequence();

        const area = areas[areaIndex];
        const speed = area.speeds[stage - 1];
        const mode = area.mode[stage - 1];
        const blind = mode === "blind";

        playing = true;
        accepting = false;
        userStep = 0;
        dom.mainButton.disabled = true;
        dom.listeningDot.classList.add("on");
        [...dom.tones.children].forEach(t => t.classList.add("dim"));
        setCopy(t("sequenceListen"), blind ? t("blindListen") : t("sequenceForm"));

        await sleep(480);

        for (const note of sequence) {
          const tone = dom.tones.children[note];
          if (!blind && tone) tone.classList.remove("dim");
          if (blind && tone) tone.classList.add("hidden-pulse");
          playTone(note, Math.min(.72, speed / 740), !blind);
          await sleep(speed);
          if (tone) {
            tone.classList.add("dim");
            tone.classList.remove("hidden-pulse");
          }
        }

        [...dom.tones.children].forEach(t => t.classList.remove("dim", "hidden-pulse"));
        dom.listeningDot.classList.remove("on");
        playing = false;
        accepting = true;
        duckBackgroundMusic(1, .48);
        dom.mainButton.disabled = false;
        dom.mainButton.textContent = t("repeat");

        if (mode === "reverse") {
          setCopy(t("reverseTitle"), t("reverseBody"));
        } else {
          setCopy(t("answerNow"), t("answerBody"));
        }
      }

      async function handleTone(index) {
        if (playing || waitingForGate) return;
        if (gameMode !== "free" && !accepting) return;
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();

        playTone(index, .62, true);

        if (gameMode === "free") {
          const area = areas[areaIndex];
          const scale = getAreaScale(area, stage);
          const label = scale.labels[index] || String(index + 1);
          const cents = scale.cents[index];
          setCopy(label, cents === 0 ? t("rootCent") : t("aboveRoot", { cents }));
          return;
        }

        if (index === expected[userStep]) {
          userStep++;
          const remaining = expected.length - userStep;

          if (remaining === 0) {
            accepting = false;
            await sleep(260);
            await completeStage();
          } else {
            setCopy(t("continue"), t("echoesLeft", { count: remaining }));
          }
        } else {
          accepting = false;
          playWrong();
          screenFlash("bad");
          showToast(t("traceBroken"));
          setCopy(t("nearly"), t("repeatRoom"));
          await sleep(850);
          await playSequence();
        }
      }

      function playWrong() {
        if (!audioCtx || muted) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(118, now);
        osc.frequency.exponentialRampToValueAtTime(63, now + .26);
        envelope(gain, now, .12, .25, .006);
        osc.connect(gain).connect(instrumentBus);
        osc.start(now);
        osc.stop(now + .3);
      }

      function playSuccess() {
        if (!audioCtx || muted) return;
        const count = dom.tones.children.length;
        [0, Math.floor(count / 2), count - 1].forEach((note, i) => {
          setTimeout(() => playTone(note, .9, true), i * 62);
        });
      }

      async function completeStage() {
        screenFlash("good");
        playSuccess();

        if (state.completed[areaIndex] < stage) {
          state.completed[areaIndex] = stage;
        }

        updateJourney();
        saveState();
        buildMap();

        if (stage < STAGES_PER_AREA) {
          showToast(t("stageDone", { stage }));
          setCopy(t("traceStored"), t("nextRoomOpening"));
          await sleep(1200);
          stage++;
          sequence = [];
          expected = [];
          renderArea();
          transitionBackgroundMusic(true);
          await sleep(300);
          await playSequence();
          return;
        }

        if (areaIndex < CHALLENGE_AREA_COUNT - 1) {
          if (state.unlockedArea < areaIndex + 1) {
            state.unlockedArea = areaIndex + 1;
          }
          saveState();
          buildMap();
          waitingForGate = true;
          dom.mainButton.disabled = false;
          dom.mainButton.textContent = t("openGate");
          setCopy(t("areaDone"), t("areaNowOpen", { area: areas[areaIndex + 1].title }));
          showToast(t("gateOpened"));
          return;
        }

        state.finaleSeen = true;
        saveState();
        updateJourney();
        setCopy(t("atlasComplete"), t("atlasCompleteBody"));
        await sleep(800);
        dom.finale.classList.add("show");
      }

      async function playScaleDemo() {
        if (playing) return;
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        startDrone();
        duckBackgroundMusic(.52, .32);
        playing = true;
        accepting = false;
        dom.mainButton.disabled = true;
        dom.listeningDot.classList.add("on");
        setCopy(t("scaleMoves"), t("scaleMovesBody"));
        const count = dom.tones.children.length;
        const notes = [...Array(count).keys(), ...Array.from({ length: Math.max(0, count - 2) }, (_, i) => count - 2 - i)];
        const speed = areas[areaIndex].category === "bonus" ? 230 : 280;
        for (const note of notes) {
          playTone(note, .5, true);
          await sleep(speed);
        }
        dom.listeningDot.classList.remove("on");
        playing = false;
        accepting = true;
        duckBackgroundMusic(1, .48);
        dom.mainButton.disabled = false;
        setCopy(t("playSpace"), t("freeTouch"));
      }

      async function mainAction() {
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();

        if (gameMode === "free") {
          await playScaleDemo();
          return;
        }

        if (waitingForGate) {
          waitingForGate = false;
          selectArea(Math.min(areaIndex + 1, CHALLENGE_AREA_COUNT - 1));
          await sleep(250);
          await playSequence();
          return;
        }

        await playSequence();
      }

      function updateJourney() {
        const done = state.completed.slice(0, CHALLENGE_AREA_COUNT).reduce((sum, value) => sum + value, 0);
        const total = CHALLENGE_AREA_COUNT * STAGES_PER_AREA;
        dom.journeyLabel.textContent = gameMode === "free" ? `∞ · ${t("explore")}` : `${done} / ${total}`;
        dom.journeyBar.style.width = gameMode === "free" ? "100%" : `${(done / total) * 100}%`;
      }

      function setCopy(title, body) {
        dom.instruction.style.opacity = "0";
        dom.instruction.style.transform = "translateY(4px)";
        dom.subtext.style.opacity = "0";

        setTimeout(() => {
          dom.instruction.textContent = title;
          dom.subtext.textContent = body;
          dom.instruction.style.opacity = "1";
          dom.instruction.style.transform = "translateY(0)";
          dom.subtext.style.opacity = "1";
        }, 150);
      }

      function showToast(text) {
        clearTimeout(toastTimer);
        dom.toast.textContent = text;
        dom.toast.classList.add("show");
        toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 1450);
      }

      function screenFlash(type) {
        dom.flash.classList.remove("good", "bad");
        void dom.flash.offsetWidth;
        dom.flash.classList.add(type);
      }

      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      async function enterAtlas(mode) {
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        atlasEntered = true;
        setGameMode(mode, false);
        dom.splash.classList.add("closed");
        if (mode === "challenge") setTimeout(() => playSequence(), 700);
        else setCopy(t("playSpace"), t("noWrong"));
      }

      dom.languageButtons.forEach(button => {
        button.addEventListener("click", () => setLanguage(button.dataset.lang));
      });

      dom.creatorTrigger.addEventListener("click", event => {
        event.stopPropagation();
        const open = dom.creatorMark.classList.toggle("open");
        dom.creatorTrigger.setAttribute("aria-expanded", String(open));
      });

      document.addEventListener("click", event => {
        if (dom.creatorMark.contains(event.target)) return;
        dom.creatorMark.classList.remove("open");
        dom.creatorTrigger.setAttribute("aria-expanded", "false");
      });

      dom.enterChallenge.addEventListener("click", () => enterAtlas("challenge"));
      dom.enterFree.addEventListener("click", () => enterAtlas("free"));
      dom.mainButton.addEventListener("click", mainAction);
      dom.modeButton.addEventListener("click", () => setGameMode(gameMode === "free" ? "challenge" : "free"));

      dom.musicButton.addEventListener("click", async () => {
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();

        const turningOn = backgroundVolume <= .001;
        backgroundVolume = turningOn ? .50 : 0;
        backgroundEnabled = turningOn;

        saveChannelVolume(BACKGROUND_VOLUME_KEY, backgroundVolume);
        applyChannelGains();
        updateVolumeUi();

        if (turningOn) {
          startDrone();
          transitionBackgroundMusic(true);
        } else {
          stopDrone();
          stopBackgroundMusic(1.1);
        }

        showToast(t("ambienceVolume", {
          value: Math.round(backgroundVolume * 100)
        }));
      });

      dom.scaleButton.addEventListener("click", () => {
        if (gameMode !== "free" || playing) return;
        const variants = getFreeScales(areas[areaIndex]);
        freeScaleIndex[areaIndex] = (freeScaleIndex[areaIndex] + 1) % variants.length;
        stopDrone();
        renderArea();
        startDrone();
        transitionBackgroundMusic(true);
        showToast(getAreaScale(areas[areaIndex], stage).name);
      });

      dom.soundButton.addEventListener("click", async () => {
        await initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();

        muted = !muted;
        applyMasterGain();
        updateVolumeUi();
        showToast(muted ? t("soundOff") : t("soundOn"));
      });

      dom.backgroundVolumeSlider.addEventListener("input", async () => {
        const wasEnabled = backgroundEnabled;

        backgroundVolume = Math.max(
          0,
          Math.min(1, Number(dom.backgroundVolumeSlider.value) / 100)
        );
        backgroundEnabled = backgroundVolume > .001;

        saveChannelVolume(BACKGROUND_VOLUME_KEY, backgroundVolume);
        if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
        applyChannelGains();
        updateVolumeUi();

        if (!atlasEntered || !audioCtx) return;

        if (wasEnabled && !backgroundEnabled) {
          stopDrone();
          stopBackgroundMusic(1.1);
        } else if (!wasEnabled && backgroundEnabled) {
          startDrone();
          transitionBackgroundMusic(true);
        }
      });

      dom.backgroundVolumeSlider.addEventListener("change", () => {
        showToast(t("ambienceVolume", { value: Math.round(backgroundVolume * 100) }));
      });

      dom.instrumentVolumeSlider.addEventListener("input", async () => {
        instrumentVolume = Math.max(
          0,
          Math.min(1, Number(dom.instrumentVolumeSlider.value) / 100)
        );
        saveChannelVolume(INSTRUMENT_VOLUME_KEY, instrumentVolume);
        if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
        applyChannelGains();
        updateVolumeUi();
      });

      dom.instrumentVolumeSlider.addEventListener("change", () => {
        showToast(t("instrumentVolume", { value: Math.round(instrumentVolume * 100) }));
      });

      dom.resetButton.addEventListener("click", () => {
        const confirmed = confirm(t("resetConfirm"));
        if (!confirmed) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        state = defaultState();
        areaIndex = 0;
        gameMode = "challenge";
        document.body.classList.remove("free-mode");
        dom.modeButton.classList.remove("active");
        dom.modeButton.textContent = t("freeModeButton");
        freeScaleIndex = Array(areas.length).fill(0);
        stage = 1;
        sequence = [];
        expected = [];
        waitingForGate = false;
        stopDrone();
        buildMap();
        renderArea();
        updateJourney();
        if (atlasEntered && backgroundEnabled) transitionBackgroundMusic(true);
        showToast(t("atlasReset"));
      });

      dom.closeFinale.addEventListener("click", () => {
        dom.finale.classList.remove("show");
        waitingForGate = false;
        dom.mainButton.textContent = t("listenAgain");
      });

      window.addEventListener("keydown", event => {
        if (event.repeat) return;

        if (event.key === "Escape" && dom.creatorMark.classList.contains("open")) {
          dom.creatorMark.classList.remove("open");
          dom.creatorTrigger.setAttribute("aria-expanded", "false");
          dom.creatorTrigger.focus();
          return;
        }

        const toneKeys = {
          "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5,
          "7": 6, "8": 7, "9": 8, "0": 9, "-": 10, "=": 11
        };

        if (Object.prototype.hasOwnProperty.call(toneKeys, event.key)) {
          handleTone(toneKeys[event.key]);
        } else if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (!dom.splash.classList.contains("closed")) dom.enterChallenge.click();
          else dom.mainButton.click();
        } else if (event.key.toLowerCase() === "m") {
          dom.soundButton.click();
        } else if (event.key.toLowerCase() === "b") {
          dom.musicButton.click();
        } else if (event.key === "[" || event.key === "_") {
          instrumentVolume = Math.max(
            0,
            Math.round(instrumentVolume * 100 - 5) / 100
          );
          saveChannelVolume(INSTRUMENT_VOLUME_KEY, instrumentVolume);
          applyChannelGains();
          updateVolumeUi();
        } else if (event.key === "]" || event.key === "+") {
          instrumentVolume = Math.min(
            1,
            Math.round(instrumentVolume * 100 + 5) / 100
          );
          saveChannelVolume(INSTRUMENT_VOLUME_KEY, instrumentVolume);
          applyChannelGains();
          updateVolumeUi();
        }
      });

      document.addEventListener("visibilitychange", () => {
        if (!audioCtx) return;
        if (document.hidden) audioCtx.suspend();
      });

      // Quiet animated star / dust field.
      const ctx = dom.canvas.getContext("2d");
      let particles = [];
      let width = 0;
      let height = 0;
      let dpr = 1;

      function initField() {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        width = window.innerWidth;
        height = window.innerHeight;
        dom.canvas.width = Math.floor(width * dpr);
        dom.canvas.height = Math.floor(height * dpr);
        dom.canvas.style.width = `${width}px`;
        dom.canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.max(45, Math.floor((width * height) / 19000));
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.25 + .25,
          a: Math.random() * .32 + .05,
          v: Math.random() * .075 + .015,
          phase: Math.random() * Math.PI * 2
        }));
      }

      function drawField(time = 0) {
        ctx.clearRect(0, 0, width, height);
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "220,230,255";

        particles.forEach((p, i) => {
          p.y -= p.v;
          p.x += Math.sin(time * .00015 + p.phase) * .015;
          if (p.y < -4) {
            p.y = height + 4;
            p.x = Math.random() * width;
          }

          const pulse = .55 + Math.sin(time * .0007 + p.phase) * .25;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${accent}, ${p.a * pulse})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          if (i % 11 === 0) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${accent}, ${p.a * .09})`;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + 18);
            ctx.stroke();
          }
        });

        requestAnimationFrame(drawField);
      }

      window.addEventListener("resize", initField);
      init();
    })();
