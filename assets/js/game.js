/**
 * Perang Narasi: Republik Timeline v3.16.0
 * Copyright (C) 2026 Adrian Janitra Putra
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n)),
    rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    shuffle = (a) => {
      const r = [...a];
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    };
  const idNum = (n) =>
    Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  function createRunSeed() {
    try {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] || 1;
    } catch (error) {
      return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
    }
  }
  function compactNumber(n) {
    n = Math.max(0, Math.round(n));
    if (n >= 1e9) return idNum(n / 1e9) + " M";
    if (n >= 1e6) return idNum(n / 1e6) + " jt";
    if (n >= 1e3) return idNum(n / 1e3) + " rb";
    return String(n);
  }
  function formatMoney(n) {
    n = Math.round(Number(n) || 0);
    const sign = n < 0 ? "−" : "";
    n = Math.abs(n);
    if (n >= 1e12) return sign + "Rp" + idNum(n / 1e12) + " T";
    if (n >= 1e9) return sign + "Rp" + idNum(n / 1e9) + " M";
    if (n >= 1e6) return sign + "Rp" + idNum(n / 1e6) + " jt";
    if (n >= 1e3) return sign + "Rp" + idNum(n / 1e3) + " rb";
    return sign + "Rp" + n.toLocaleString("id-ID");
  }
  const state = {
    role: null,
    gameMode: "chronicle",
    freeStartPhase: 0,
    phase: 0,
    day: 1,
    money: 0,
    reach: 30,
    credibility: 50,
    integrity: 60,
    stress: 20,
    democracy: 50,
    network: 25,
    heat: 25,
    resolve: 100,
    actions: 0,
    sound: true,
    quizEnabled: true,
    quizDeck: [],
    quizPositionDeck: [],
    quizIndex: 0,
    quizCorrect: 0,
    quizAnswered: 0,
    finished: false,
    finalReport: null,
    runSeed: 0,
    specialties: [],
    history: [],
    career: 0,
    lastAction: null,
    postMetrics: { reposts: 0, likes: 0, replies: 0, views: 0 },
    comments: [],
    seenEvents: [],
    eventHistory: [],
    lastImpact: null,
    crisisHistory: [],
    cycle: 1,
    lastSavedAt: null,
    abilityUses: {},
    abilityBuffs: [],
    abilityLog: [],
    trendReveal: 0,
    commentMemory: [],
    npcReplyMemory: [],
    fufuArchive: null,
    fufuTwistResolved: false,
    debt: 0,
    loanRate: 0,
    bailoutCount: 0,
    missedPayments: 0,
    bankruptcyHistory: [],
    monthlyActionVariants: {},
    phaseActionVariants: {},
    lastActionVariant: 0,
    followUpCards: [],
    characterMatchLog: [],
    perfectMatches: 0,
    partialMatches: 0,
    crewMisfires: 0,
    narrativeRipples: [],
    resolvedRipples: [],
    currentRippleNotices: [],
    eventOutcomeProfile: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
  };

  const SAVE_KEY = "perang-narasi-save-v3";
  let restoring = false;
  function saveGame(silent = true) {
    if (!state.role) return;
    try {
      state.lastSavedAt = new Date().toISOString();
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ version: 3, state }),
      );
      updateContinuePanel();
      if (!silent) flash("PROGRES TERSIMPAN DI BROWSER");
    } catch (e) {
      if (!silent) flash("SAVE GAGAL: STORAGE TIDAK TERSEDIA");
    }
  }
  function getSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (
        !data ||
        !data.state ||
        !["buzzer", "aktivis"].includes(data.state.role)
      )
        return null;
      return data;
    } catch (e) {
      return null;
    }
  }
  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
    updateContinuePanel();
  }
  function updateContinuePanel() {
    const panel = $("#continuePanel"),
      data = getSave();
    if (!panel) return;
    panel.classList.toggle("hidden", !data);
    if (data) {
      const s = data.state,
        p = phases[Math.min(s.phase, phases.length - 1)],
        i = p && p.days[Math.max(0, Math.min((s.day || 1) - 1, 11))];
      $("#continueSummary").textContent =
        `${s.gameMode === "free" ? "MODE BEBAS • " : ""}${roleData[s.role].label} • Fase ${(s.phase || 0) + 1}/6 • ${i?.month || "bulan tersimpan"} • ${Math.round(s.reach || 0)} jangkauan`;
    }
  }
  function continueGame() {
    const data = getSave();
    if (!data) return;
    restoring = true;
    Object.assign(state, data.state);
    state.gameMode = state.gameMode === "free" ? "free" : "chronicle";
    state.freeStartPhase = clamp(Number(state.freeStartPhase) || state.phase || 0, 0, phases.length - 1);
    state.phase = clamp(Number(state.phase) || 0, 0, phases.length - 1);
    state.day = clamp(Number(state.day) || 1, 1, 12);
    state.postMetrics = state.postMetrics || {
      reposts: 0,
      likes: 0,
      replies: 0,
      views: 0,
    };
    state.comments = state.comments || [];
    state.seenEvents = state.seenEvents || [];
    state.eventHistory = state.eventHistory || [];
    state.crisisHistory = state.crisisHistory || [];
    state.specialties = state.specialties || [];
    state.history = state.history || [];
    state.abilityUses = state.abilityUses || {};
    const legacyCrewKeys = [
      ["aktivis:1:" + ["ti", "yo-mahasiswa"].join(""), "aktivis:1:togar-toa"],
      ["aktivis:2:" + ["fat", "ima-azzahra"].join(""), "aktivis:2:farah-footnote"],
    ];
    legacyCrewKeys.forEach(([oldKey, newKey]) => {
      if (state.abilityUses[oldKey] && !state.abilityUses[newKey]) state.abilityUses[newKey] = true;
    });
    state.abilityBuffs = state.abilityBuffs || [];
    state.abilityLog = state.abilityLog || [];
    state.trendReveal = state.trendReveal || 0;
    state.commentMemory = state.commentMemory || [];
    state.npcReplyMemory = state.npcReplyMemory || [];
    state.fufuArchive = state.fufuArchive || null;
    state.fufuTwistResolved = Boolean(state.fufuTwistResolved);
    state.debt = Math.max(0, Number(state.debt) || 0);
    state.loanRate = Math.max(0, Number(state.loanRate) || 0);
    state.bailoutCount = Number(state.bailoutCount) || 0;
    state.missedPayments = Number(state.missedPayments) || 0;
    state.bankruptcyHistory = state.bankruptcyHistory || [];
    state.monthlyActionVariants = state.monthlyActionVariants || {};
    state.phaseActionVariants = state.phaseActionVariants || {};
    if (!Object.keys(state.phaseActionVariants).length && Object.keys(state.monthlyActionVariants).length) {
      Object.entries(state.monthlyActionVariants).forEach(([id, count]) => {
        state.phaseActionVariants[`${state.phase}:${id}`] = Number(count) || 0;
      });
    }
    state.lastActionVariant = Number(state.lastActionVariant) || 0;
    state.followUpCards = state.followUpCards || [];
    state.characterMatchLog = state.characterMatchLog || [];
    state.perfectMatches = Number(state.perfectMatches) || 0;
    state.partialMatches = Number(state.partialMatches) || 0;
    state.crewMisfires = Number(state.crewMisfires) || 0;
    state.narrativeRipples = state.narrativeRipples || [];
    state.resolvedRipples = state.resolvedRipples || [];
    state.currentRippleNotices = [];
    state.eventOutcomeProfile = state.eventOutcomeProfile || { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    state.runSeed = Number(state.runSeed) >>> 0 || createRunSeed();
    $("#startScreen").classList.add("hidden");
    $("#gameScreen").classList.remove("hidden");
    $("#roleLabel").textContent = roleData[state.role].label;
    $("#objective").textContent = roleData[state.role].objective;
    syncQuizToggles();
    syncGameModeControls();
    loadIssue(true);
    restoring = false;
    flash("KRONIK DILANJUTKAN");
  }
  const roleData = {
    buzzer: {
      label: "BUZZER",
      money: 2400000000,
      reach: 45,
      credibility: 38,
      integrity: 52,
      stress: 18,
      democracy: 49,
      network: 42,
      objective:
        "Menangkan kandidat, naik ke lingkaran kekuasaan, dan jangan sampai akun keluarga bertanya kamu sebenarnya kerja apa.",
      team: [
        [
          "🏢",
          "Narasi Bersama Konsultan",
          "Agensi yang menjual spontanitas dalam paket tender tiga tahap",
        ],
        [
          "🧑‍💻",
          "Bang Admin Satu",
          "Memiliki 47 akun dan semua foto profilnya gunung",
        ],
        [
          "🎨",
          "Mbak Canva Negara",
          "Membuat poster “organik” berdasarkan template kantor",
        ],
        ["🤖", "Bot-Setyo", "Membalas sebelum berita selesai ditulis"],
      ],
    },
    aktivis: {
      label: "AKTIVIS",
      money: 85000000,
      reach: 24,
      credibility: 66,
      integrity: 74,
      stress: 25,
      democracy: 53,
      network: 30,
      objective:
        "Lawan normalisasi rezim yang mengubah kritik jadi musuh, urusan sipil jadi rantai komando, dan warga jadi dekorasi. Ubah marah menjadi bukti, bantuan, organisasi, dan daya paksa demokratis.",
      team: [
        [
          "📱",
          "Ferry Ir-Why-Nih",
          "Arketipe aktivis-influencer: video panjang, reach besar, dan kolom komentar yang tidak pernah tidur",
        ],
        [
          "🧑‍🎓",
          "Kak Referensi",
          "Meminta tautan sumber bahkan untuk gosip sekretariat",
        ],
        [
          "🧃",
          "Dede Logistik",
          "Membawa toa, kabel, kopi, dan ekspektasi rendah",
        ],
        [
          "🐈",
          "Kucing Gerakan",
          "Tidur di atas proposal hibah, simbol keberlanjutan",
        ],
      ],
    },
  };

  const phaseRosters = {
    buzzer: [
      [
        {
          id: "gemoyfikasi",
          icon: "📸",
          name: "Kak Gemoyfikasi Nasional",
          role: "MENTOR CITRA PEMILU",
          bio: "Ngerapihin masa lalu sampai muat di video vertikal 27 detik.",
          ability: {
            name: "Filter Gemoy 24 Jam",
            desc: "Kartu meme atau data berikutnya lebih murah, lebih sakit, dan lebih gampang nyangkut di FYP.",
            immediate: { reach: 4, heat: 3 },
            metrics: {
              views: 420000,
              likes: 68000,
              reposts: 18000,
              replies: 5200,
            },
            buff: {
              actionIds: ["meme", "data"],
              damage: 14,
              costMultiplier: 0.72,
              engagementMultiplier: 1.4,
            },
            tone: "bad",
            quote:
              "Oke tim, jangan bahas masa lalu panjang-panjang. Kasih kucing, musik lucu, terus caption: kita semua pernah salah.",
          },
        },
        {
          id: "admin-satu",
          icon: "🧑‍💻",
          name: "Bang Admin Satu",
          role: "OPERATOR 47 AKUN",
          bio: "Semua akunnya organik. Kebetulan jam postingnya sama persis.",
          ability: {
            name: "Pasukan Gunung Turun",
            desc: "Langsung dorong repost dan reach, tapi timeline makin panas dan pola koordinasi makin kelihatan.",
            immediate: { reach: 7, heat: 9, credibility: -2 },
            metrics: {
              views: 360000,
              likes: 42000,
              reposts: 54000,
              replies: 11000,
            },
            tone: "bad",
            quote:
              "Gas jam 19.03 ya. Jangan 19.00, nanti keliatan settingan.",
          },
        },
        {
          id: "canva-negara",
          icon: "🎨",
          name: "Mbak Canva Negara",
          role: "DIREKTUR TEMPLATE DARURAT",
          bio: "Poster organik, font resmi, dan stok foto warga bahagia sudah satu folder.",
          ability: {
            name: "Template Tinggal Ganti Nama",
            desc: "Action berikutnya diskon besar. Konteksnya mungkin beda, desainnya tetep menang.",
            buff: {
              actionIds: ["*"],
              damage: 5,
              costMultiplier: 0.5,
              engagementMultiplier: 1.15,
            },
            tone: "neutral",
            quote:
              "Brief baru? Santai. File-nya tinggal duplicate, ganti hashtag, export PNG.",
          },
        },
      ],
      [
        {
          id: "gemoyono",
          icon: "🦅",
          name: "Pak Jenderal Gemoyono",
          role: "MENTOR PODIUM NASIONAL",
          bio: "Kalau masalahnya gede, pidatonya dibikin lebih gede lagi.",
          ability: {
            name: "Pidato Sampai Trending Pindah",
            desc: "Ketahanan narasi lawan turun dan kartu patriot berikutnya makin kuat.",
            immediate: { resolve: -12, reach: 5, heat: 5 },
            metrics: {
              views: 850000,
              likes: 92000,
              reposts: 26000,
              replies: 24000,
            },
            buff: {
              actionIds: ["patriot"],
              damage: 13,
              engagementMultiplier: 1.25,
            },
            tone: "bad",
            quote:
              "Saudara-saudara, saya cuma minta satu: jangan potong video sebelum menit ke-87.",
          },
        },
        {
          id: "tedi-beruang",
          icon: "🐻",
          name: "Mayor Tedi Ketok-Pintu",
          role: "PENJAGA RUNDOWN ISTANA",
          bio: "Bisa bikin krisis kelihatan kayak agenda jam 14.30 yang sudah dikendalikan.",
          ability: {
            name: "Kunci Rundown",
            desc: "Turunkan heat dan stres. Action berikutnya kebal dari penalti kredibilitas, integritas, dan demokrasi.",
            immediate: { stress: -9, heat: -12, network: 3 },
            buff: { actionIds: ["*"], damage: 3, protectNegatives: true },
            tone: "neutral",
            quote:
              "Semua tenang. Pukul 15.00 klarifikasi, 15.07 foto bersama, 15.10 isu baru.",
          },
        },
        {
          id: "bahlul",
          icon: "⛏️",
          name: "Pak Bahlul Serba Bisa",
          role: "MENTOR JAWABAN OMNIBUS",
          bio: "Ditanya tambang, jawab partai. Ditanya partai, jawab hilirisasi.",
          ability: {
            name: "Hilirisasi Semua Jawaban",
            desc: "Dana masuk dan kartu data/whatabout berikutnya dapat bonus. Catatan moral ikut ditambang.",
            immediate: {
              money: 85000000,
              credibility: -2,
              integrity: -3,
            },
            buff: {
              actionIds: ["data", "whatabout"],
              damage: 13,
              costMultiplier: 0.8,
            },
            tone: "bad",
            quote:
              "Gini lho bos, apa pun pertanyaannya, ujungnya nilai tambah. Yang belum jelas tinggal kita hilirisasi juga.",
          },
        },
      ],
      [
        {
          id: "purbayaya",
          icon: "💼",
          name: "Pak Purba-Yey Dompet Negara",
          role: "MENTOR FISKAL TANPA REM",
          bio: "Angka tumbuh, rupiah deg-degan, optimisme tetap full tank.",
          ability: {
            name: "Baseline Baru, Mood Baru",
            desc: "Suntikan dana besar. Kartu data berikutnya sangat kuat dan lebih murah.",
            immediate: { money: 120000000, stress: 3 },
            buff: {
              actionIds: ["data"],
              damage: 17,
              costMultiplier: 0.62,
              engagementMultiplier: 1.25,
            },
            tone: "neutral",
            quote:
              "Nih ya, angkanya nggak jelek. Kalian cuma mulai grafiknya dari tempat yang kurang bahagia.",
          },
        },
        {
          id: "muteya",
          icon: "📵",
          name: "Mbak Mute-Ya Hafalan",
          role: "PENGATUR BANDWIDTH PUBLIK",
          bio: "Timeline boleh ramai, asal volume kritiknya masuk kategori gangguan teknis.",
          ability: {
            name: "Mode Slow Timeline",
            desc: "Heat dan reply turun tajam. Ruang sipil ikut kena buffering.",
            immediate: { heat: -19, democracy: -3 },
            metrics: { views: -120000, replies: -9000, reposts: -5000 },
            tone: "bad",
            quote:
              "Bukan dibungkam ya. Ini cuma pengalaman pengguna yang dibuat lebih hening.",
          },
        },
        {
          id: "syafri",
          icon: "🪖",
          name: "Jenderal Syaf-Ribet Semua Urusan",
          role: "KOORDINATOR SEMUA KOORDINASI",
          bio: "Kalau ada masalah sipil, solusinya rapat yang kursinya lebih banyak seragam.",
          ability: {
            name: "Jadikan Semua Urusan Komando",
            desc: "Narasi lawan langsung terpukul dan jaringan naik, tapi demokrasi serta heat membayar ongkosnya.",
            immediate: {
              resolve: -15,
              network: 7,
              democracy: -5,
              heat: 7,
            },
            tone: "bad",
            quote:
              "Biar cepat, kita komandoin aja. Nanti partisipasinya menyusul setelah keputusan final.",
          },
        },
      ],
      [
        {
          id: "rosan",
          icon: "📈",
          name: "Pak ROI-san Rugi-Selalu",
          role: "MENTOR DECK INVESTOR",
          bio: "Setiap masalah rakyat bisa masuk pitch deck asal ada slide total addressable market.",
          ability: {
            name: "Deck Investor 40 Slide",
            desc: "Dana besar masuk. Kartu data/transparansi berikutnya diskon, tapi integritas kena management fee.",
            immediate: { money: 165000000, integrity: -3 },
            buff: {
              actionIds: ["data", "transparency"],
              damage: 8,
              costMultiplier: 0.5,
            },
            tone: "neutral",
            quote:
              "Kita nggak jual negara kok. Kita cuma bikin ownership structure-nya lebih exciting.",
          },
        },
        {
          id: "erick",
          icon: "⚽",
          name: "Pak E-Rick Tohired",
          role: "DIREKTUR KPI & JERSEY",
          bio: "Masalah negara belum tentu selesai, tapi minimal punya target dan seragam baru.",
          ability: {
            name: "Liga KPI Nasional",
            desc: "Karier dan reach naik. Kartu concert/data berikutnya dapat bonus performa.",
            immediate: { career: 9, reach: 6, stress: 3 },
            buff: {
              actionIds: ["concert", "data"],
              damage: 13,
              engagementMultiplier: 1.2,
            },
            tone: "neutral",
            quote:
              "Kita targetkan top three. Top three apa? Itu nanti divisi komunikasi yang naming.",
          },
        },
        {
          id: "nusruang",
          icon: "🗺️",
          name: "Pak Nus-Ruwet Wahid",
          role: "PENATA GARIS PETA",
          bio: "Kalau konflik muncul, garis konsesinya digeser dua piksel ke kiri.",
          ability: {
            name: "Geser Garis, Geser Isu",
            desc: "Ketahanan lawan turun dan network naik. Kredibilitas sedikit tersesat di peta.",
            immediate: { resolve: -13, network: 6, credibility: -3 },
            buff: { actionIds: ["data", "whatabout"], damage: 8 },
            tone: "bad",
            quote:
              "Di peta lama itu konflik. Di peta baru ini peluang. Tolong update layer-nya.",
          },
        },
      ],
      [
        {
          id: "samsul",
          icon: "🚀",
          name: "Mas Samsul Raka Buming-Buming",
          role: "MENTOR PIVOT PRA-PEMILU",
          bio: "Kalau produk nggak laku, namanya diganti. Kalau kebijakan nggak laku, launch ulang.",
          ability: {
            name: "Startup Campaign Pivot",
            desc: "Reach naik dan kartu podcast/endorse berikutnya makin kuat.",
            immediate: { reach: 10, credibility: 2 },
            metrics: {
              views: 620000,
              likes: 94000,
              reposts: 21000,
              replies: 17000,
            },
            buff: {
              actionIds: ["podcast", "endorse"],
              damage: 15,
              costMultiplier: 0.75,
              engagementMultiplier: 1.45,
            },
            tone: "neutral",
            quote:
              "Kita bukan ganti janji, ya. Kita pivot ke user needs yang baru ketemu pas survei turun.",
          },
        },
        {
          id: "rapi-ahmad",
          icon: "✨",
          name: "Mas Rapi Amat Utusan Serba Khusus",
          role: "CHIEF COLLAB OFFICER",
          bio: "Satu vlog, tiga kementerian, tujuh brand, dan semuanya katanya kebetulan ketemu.",
          ability: {
            name: "Collab Nasional Tanpa Skip",
            desc: "Like, views, dan reach meledak. Integritas turun tipis karena paid partnership-nya malu-malu.",
            immediate: { reach: 11, integrity: -2 },
            metrics: {
              views: 1200000,
              likes: 210000,
              reposts: 36000,
              replies: 22000,
            },
            tone: "bad",
            quote:
              "Guys, hari ini aku diajak lihat program negara. Seru banget, link kebijakannya nanti nyusul ya.",
          },
        },
        {
          id: "dedi-corbuzzer",
          icon: "🎙️",
          name: "Om Dedek Cor-Buzzer",
          role: "HOST PODCAST PERTAHANAN",
          bio: "Pertanyaan satu kalimat bisa dijawab dua jam plus satu flexing bicep.",
          ability: {
            name: "Podcast Sampai Lawan Lowbat",
            desc: "Ketahanan lawan turun, stres berkurang, dan kartu podcast berikutnya makin galak.",
            immediate: { resolve: -17, stress: -6, heat: 8 },
            metrics: { views: 900000, likes: 110000, replies: 31000 },
            buff: {
              actionIds: ["podcast"],
              damage: 18,
              engagementMultiplier: 1.35,
            },
            tone: "bad",
            quote:
              "Duduk dulu. Kita bahas full, tanpa potong-potong. Editor, nanti ambil bagian yang paling ribut.",
          },
        },
      ],
      [
        {
          id: "dasko",
          icon: "🕶️",
          name: "Pak Deskoordinasi Senyap",
          role: "MENTOR KOALISI TENGAH MALAM",
          bio: "Selalu hadir sebelum keputusan, hilang tepat sebelum pertanyaan kedua.",
          ability: {
            name: "Koalisi Jam 02.17",
            desc: "Dana dan network naik besar. Action berikutnya lebih murah; integritas bayar biaya rapat tertutup.",
            immediate: { money: 180000000, network: 13, integrity: -6 },
            buff: { actionIds: ["*"], damage: 7, costMultiplier: 0.72 },
            tone: "bad",
            quote:
              "Nggak ada deal kok. Cuma silaturahmi tujuh jam dengan draft kabinet di meja.",
          },
        },
        {
          id: "yusrill",
          icon: "📜",
          name: "Pak Yus-Ribet Pasal Berjalan",
          role: "PENYEDIA PASAL CADANGAN",
          bio: "Setiap keputusan punya dasar hukum. Kalau belum ada, tafsirnya bisa dicari setelah makan malam.",
          ability: {
            name: "Pasal Cadangan di Saku",
            desc: "Kredibilitas naik dan action berikutnya kebal penalti moral.",
            immediate: { credibility: 6, democracy: 2 },
            buff: { actionIds: ["*"], damage: 5, protectNegatives: true },
            tone: "neutral",
            quote:
              "Secara hukum bisa. Secara etika? Nah, itu kementerian sebelah.",
          },
        },
        {
          id: "narasi-bersama",
          icon: "🏢",
          name: "Narasi Bersama Konsultan",
          role: "WAR ROOM FINAL BOSS",
          bio: "Spontanitas dalam paket tender, revisi tiga kali, dan invoice termin dua.",
          ability: {
            name: "All In War Room",
            desc: "Action berikutnya super murah, super kuat, dan super viral. Integritas serta heat ikut all in.",
            immediate: {
              money: -100000000,
              reach: 12,
              integrity: -8,
              heat: 12,
            },
            buff: {
              actionIds: ["*"],
              damage: 22,
              costMultiplier: 0.45,
              engagementMultiplier: 1.65,
            },
            tone: "bad",
            quote:
              "Semua channel nyala. Jangan tanya faktanya dulu, kita rebut attention window enam jam ini.",
          },
        },
      ],
    ],
    aktivis: [
      [
        {
          id: "mimin-ingat",
          icon: "🧵",
          name: "Mimin Warga Tidak Lupa",
          role: "MENTOR ARSIP PEMILU",
          bio: "Trending boleh lewat. Folder bukti jangan ikut hilang.",
          ability: {
            name: "Arsip Anti-Amnesia",
            desc: "Kredibilitas naik. Kartu context/data berikutnya lebih kuat dan lebih murah.",
            immediate: { credibility: 5 },
            buff: {
              actionIds: ["context", "data"],
              damage: 15,
              costMultiplier: 0.72,
            },
            tone: "good",
            quote:
              "Udah gue folderin: rekam jejak, janji, klarifikasi, sama tweet yang katanya konteksnya hilang.",
          },
        },
        {
          id: "kak-referensi",
          icon: "🧑‍🎓",
          name: "Kak Referensi",
          role: "DROP LINK PRIMER",
          bio: "Bahkan gosip sekretariat diminta DOI dan tanggal akses.",
          ability: {
            name: "Drop Dokumen Primer",
            desc: "Ketahanan narasi lawan turun dan kredibilitas naik tanpa harus bikin thread 48 slide.",
            immediate: { resolve: -11, credibility: 5 },
            metrics: { replies: 7000, reposts: 9000, views: 120000 },
            tone: "good",
            quote:
              "Sumbernya ini ya. Baca halaman 37, bukan cuma judul file yang dishare akun fanbase.",
          },
        },
        {
          id: "ferry-irwindy",
          icon: "📱",
          name: "Ferry Ir-Why-Nih",
          role: "AKTIVIS-INFLUENCER PEMBUKA REACH",
          bio: "Video panjang, moral clarity, dan thumbnail yang bikin organisasi lama belajar YouTube.",
          ability: {
            name: "Video Panjang, Reach Panjang",
            desc: "Reach dan engagement naik. Kartu empathy/context berikutnya makin nendang, stres ikut naik.",
            immediate: { reach: 11, stress: 4 },
            metrics: {
              views: 780000,
              likes: 128000,
              reposts: 34000,
              replies: 21000,
            },
            buff: {
              actionIds: ["empathy", "context"],
              damage: 12,
              engagementMultiplier: 1.5,
            },
            tone: "good",
            quote:
              "Gue nggak minta kalian percaya gue. Cek datanya, terus kalau masih marah, minimal marahnya punya alamat.",
          },
        },
      ],
      [
        {
          id: "feri-ambyar",
          icon: "⚖️",
          name: "Prof. Ferry Ambyar-Sari",
          role: "MENTOR KONSTITUSI DARURAT",
          bio: "Pasal dibaca sampai bunyinya kedengeran kayak alarm kebakaran.",
          ability: {
            name: "Bunyikan Pasal Keras-Keras",
            desc: "Ketahanan lawan turun, kredibilitas dan demokrasi naik.",
            immediate: { resolve: -13, credibility: 6, democracy: 5 },
            tone: "good",
            quote:
              "Ini bukan soal suka atau nggak suka pemerintah. Ini soal aturan mainnya mau dipakai atau dilipat.",
          },
        },
        {
          id: "bibitri",
          icon: "📚",
          name: "Bu Bibitri Susah-Tidur",
          role: "EDITOR NASKAH BELUM FINAL",
          bio: "Begitu pasal berubah jam dua pagi, kopinya otomatis nyala.",
          ability: {
            name: "Naskah Belum Final",
            desc: "Heat dan stres turun. Action berikutnya kebal penalti negatif.",
            immediate: { heat: -13, stress: -6, credibility: 3 },
            buff: { actionIds: ["*"], damage: 4, protectNegatives: true },
            tone: "good",
            quote:
              "Sebentar, versi yang disahkan yang mana? PDF jam 21.00, 23.40, atau yang baru muncul habis rapat?",
          },
        },
        {
          id: "dandhy",
          icon: "🎥",
          name: "Bang Dandy Lensa-Sono",
          role: "SUTRADARA ARSIP VISUAL",
          bio: "Kamera selesai merekam, metadata baru mulai kerja.",
          ability: {
            name: "Premiere Dadakan",
            desc: "Ketahanan lawan dan saldo turun, tetapi views, reach, dan repost melonjak.",
            immediate: { resolve: -17, reach: 9, money: -22000000 },
            metrics: {
              views: 1100000,
              likes: 150000,
              reposts: 78000,
              replies: 28000,
            },
            tone: "good",
            quote:
              "Filmnya udah naik. Silakan bantah, tapi dokumennya jangan diskip cuma gara-gara thumbnail-nya bikin kesel.",
          },
        },
      ],
      [
        {
          id: "uceng",
          icon: "🔎",
          name: "Prof. Uceng Monitor",
          role: "MENTOR KONFLIK KEPENTINGAN",
          bio: "Bisa nyium rangkap jabatan dari radius tiga slide PowerPoint.",
          ability: {
            name: "Peta Siapa Kenal Siapa",
            desc: "Narasi lawan turun. Kartu data/context berikutnya mendapat bonus investigasi.",
            immediate: { resolve: -14, credibility: 6 },
            buff: {
              actionIds: ["data", "context"],
              damage: 13,
              costMultiplier: 0.8,
            },
            tone: "good",
            quote:
              "Coba jangan lihat orangnya dulu. Lihat jabatannya, kewenangannya, terus siapa yang dapat untung.",
          },
        },
        {
          id: "haris",
          icon: "🗣️",
          name: "Bang Haris Azar-Nalar",
          role: "PENANYA TANPA TOMBOL STOP",
          bio: "Moderator bilang pertanyaan terakhir. Dia dengarnya pembukaan bab berikutnya.",
          ability: {
            name: "Pertanyaannya Belum Dijawab",
            desc: "Demokrasi dan kredibilitas naik, ketahanan lawan turun, stres ikut nambah.",
            immediate: {
              resolve: -9,
              credibility: 6,
              democracy: 6,
              stress: 4,
            },
            tone: "good",
            quote:
              "Boleh marah sama cara gue nanya. Tapi jawab dulu: siapa yang tanggung jawab?",
          },
        },
        {
          id: "bem-ui",
          icon: "🏫",
          name: "BEM UI: Mimin Pernyataan Sikap",
          role: "KOMANDO PDF & TOA",
          bio: "Satu tangan pegang toa, satu tangan revisi footnote sebelum upload.",
          ability: {
            name: "PDF Naik, Gerbang Buka",
            desc: "Network, reach, dan heat naik. Kolom komentar langsung penuh mahasiswa, alumni, dan akun tanpa foto.",
            immediate: { network: 13, reach: 7, heat: 8, stress: 3 },
            metrics: {
              views: 480000,
              likes: 76000,
              reposts: 42000,
              replies: 35000,
            },
            tone: "neutral",
            quote:
              "Pernyataan sikap udah naik. Tolong baca full sebelum bilang mahasiswa cuma ikut tren.",
          },
        },
        {
          id: "guru-gembulbul",
          icon: "🧑‍🏫",
          name: "Guru Gembung-Bul",
          role: "WILDCARD BARAYA SERBA MAPEL",
          bio: "Mulai dari sejarah, nyasar ke filsafat, berhenti sebentar di pendidikan, lalu minta baraya jangan menelan konten mentah-mentah.",
          ability: {
            name: "Kelas Baraya Tanpa Bel Pulang",
            desc: "Kredibilitas dan reach naik. Kartu context/data berikutnya lebih kuat dan murah, tapi heat ikut naik karena semua orang merasa ikut ujian lisan.",
            immediate: { credibility: 6, reach: 8, heat: 5, stress: 2 },
            buff: { actionIds: ["context", "data"], damage: 14, costMultiplier: 0.68, engagementMultiplier: 1.25 },
            metrics: { views: 560000, likes: 72000, reposts: 24000, replies: 33000 },
            tone: "neutral",
            quote: "Baraya, masalahnya bukan kita kekurangan opini. Masalahnya tiap opini masuk kelas tanpa bawa referensi, terus minta nilai A.",
          },
        },
      ],
      [
        {
          id: "raymond",
          icon: "📈",
          name: "Raymond Cuan-Check",
          role: "MENTOR EKONOMI CREATOR",
          bio: "APBN masuk whiteboard, insentif masuk spreadsheet, buzzword masuk recycle bin.",
          ability: {
            name: "Cuan Check Anggaran",
            desc: "Kas dan kredibilitas naik. Kartu data berikutnya mendapat bonus breakdown.",
            immediate: { money: 35000000, credibility: 6 },
            buff: {
              actionIds: ["data"],
              damage: 16,
              costMultiplier: 0.65,
              engagementMultiplier: 1.25,
            },
            tone: "good",
            quote:
              "Oke gue breakdown simpel: yang pegang upside siapa, yang nombokin downside siapa?",
          },
        },
        {
          id: "ainun",
          icon: "💻",
          name: "Ainun Na-Geek Data Warga",
          role: "ARSITEK DASHBOARD SIPIL",
          bio: "Dashboard publik harus bantu warga nyari jawaban, bukan bantu pejabat nyari backdrop.",
          ability: {
            name: "Dashboard Warga Live",
            desc: "Network dan kredibilitas naik, tren dua bulan ke depan terbaca lebih jelas, kartu data lebih murah.",
            immediate: { network: 10, credibility: 6 },
            trendReveal: 2,
            buff: {
              actionIds: ["data"],
              damage: 10,
              costMultiplier: 0.55,
            },
            tone: "good",
            quote:
              "Datanya gue buka. Kalau ada yang salah, fork, koreksi, jangan cuma quote-tweet pakai emoji tengkorak.",
          },
        },
        {
          id: "andhyta",
          icon: "🌱",
          name: "Andita Filsuf Uta-Mikir",
          role: "ANALIS SKENARIO PANJANG",
          bio: "Timeline mikir 15 detik; dia maksa semua orang lihat dampak 10 tahun.",
          ability: {
            name: "Tarik Napas Sampai 2037",
            desc: "Stres turun, demokrasi naik, kartu context/transparency berikutnya lebih kuat.",
            immediate: { stress: -7, democracy: 7 },
            buff: {
              actionIds: ["context", "transparency"],
              damage: 12,
              costMultiplier: 0.75,
            },
            tone: "good",
            quote:
              "Sebelum bilang ini solusi, coba bayangin siapa yang bayar lima dan sepuluh tahun lagi.",
          },
        },

        {
          id: "mardi-gitu",
          icon: "🧩",
          name: "Bossman Mardi-Gitu",
          role: "WILDCARD BENANG MERAH GLOBAL",
          bio: "Satu papan tulis, empat negara, tujuh panah, dan kesimpulan yang keburu viral sebelum sumbernya selesai loading.",
          ability: {
            name: "Tarik Benang Merah Global",
            desc: "Reach dan heat meledak, dua tren berikutnya terbuka, action meme/context berikutnya makin viral. Kredibilitas ikut dites semesta.",
            immediate: { reach: 14, heat: 11, credibility: -5 },
            metrics: {
              views: 940000,
              likes: 118000,
              reposts: 47000,
              replies: 56000,
            },
            trendReveal: 2,
            buff: {
              actionIds: ["meme", "context"],
              damage: 15,
              engagementMultiplier: 1.55,
            },
            tone: "neutral",
            quote:
              "Gue nggak bilang ini pasti nyambung. Gue cuma gambar tujuh panah. Kalau panah kedelapan muncul, algoritma yang mutusin.",
          },
        },
      ],
      [
        {
          id: "felix",
          icon: "🕌",
          name: "Ustaz Feli-Xi-Auw",
          role: "MENTOR CERAMAH ALGORITMIK",
          bio: "Satu isu politik bisa jadi kelas sejarah, carousel, live, dan potongan 30 detik.",
          ability: {
            name: "Ceramah Masuk FYP",
            desc: "Reach dan heat naik. Kartu empathy/meme berikutnya makin viral.",
            immediate: { reach: 13, heat: 7 },
            metrics: {
              views: 880000,
              likes: 140000,
              reposts: 39000,
              replies: 26000,
            },
            buff: {
              actionIds: ["empathy", "meme"],
              damage: 13,
              engagementMultiplier: 1.45,
            },
            tone: "neutral",
            quote:
              "Teman-teman, jangan cuma tanya siapa menang. Tanya juga nilai apa yang pelan-pelan dianggap normal.",
          },
        },
        {
          id: "rocky",
          icon: "🪨",
          name: "Rocky Gunung Berisik",
          role: "PABRIK METAFORA PRIME TIME",
          bio: "Satu kata jadi tiga metafora, lima potongan viral, dan satu moderator menyesal.",
          ability: {
            name: "Satu Kata, Tiga Polemik",
            desc: "Ketahanan lawan jatuh dan reply meledak. Heat naik, kredibilitas sedikit kena ricochet.",
            immediate: { resolve: -18, heat: 12, credibility: -2 },
            metrics: {
              views: 760000,
              likes: 82000,
              reposts: 31000,
              replies: 68000,
            },
            tone: "neutral",
            quote:
              "Problemnya bukan nasi. Problemnya adalah negara yang menganggap lapar bisa diselesaikan dengan konferensi pers.",
          },
        },
        {
          id: "pandji",
          icon: "🎭",
          name: "Panji Pra-Guyon",
          role: "KOMIKA DIASPORA POLITIK",
          bio: "Punchline pulang kampung, kolom komentar ikut transit.",
          ability: {
            name: "Stand-up Biar Nggak Burnout",
            desc: "Reach dan kredibilitas naik, stres turun, engagement tumbuh tanpa terlalu membakar timeline.",
            immediate: { reach: 10, credibility: 3, stress: -8 },
            metrics: {
              views: 620000,
              likes: 110000,
              reposts: 22000,
              replies: 17000,
            },
            tone: "good",
            quote:
              "Kita ketawa dulu ya. Bukan karena masalahnya lucu, tapi karena kalau nggak, kita semua jadi admin rage bait.",
          },
        },
      ],
      [
        {
          id: "jerom",
          icon: "🧮",
          name: "Jerom Poling Data",
          role: "MENTOR HITUNG ULANG LIVE",
          bio: "Semua angka masuk spreadsheet, termasuk angka yang berharap nggak ketemu publik.",
          ability: {
            name: "Hitung Ulang di Depan Kamera",
            desc: "Kredibilitas naik. Kartu data berikutnya super kuat dan makin viral.",
            immediate: { credibility: 6 },
            metrics: {
              views: 480000,
              likes: 72000,
              reposts: 26000,
              replies: 18000,
            },
            buff: {
              actionIds: ["data"],
              damage: 21,
              costMultiplier: 0.65,
              engagementMultiplier: 1.4,
            },
            tone: "good",
            quote:
              "Gue hitung ulang live ya. Kalau salah, koreksi. Kalau benar, jangan tiba-tiba bilang matematika itu partisan.",
          },
        },
        {
          id: "andovi",
          icon: "📢",
          name: "Andovi da Toa-Speaker",
          role: "KOORDINATOR DEADLINE PUBLIK",
          bio: "Tuntutan panjang dipaksa punya tanggal, PIC, dan desain yang nggak bikin mata menyerah.",
          ability: {
            name: "Kasih Deadline, Bukan Cuma Tagar",
            desc: "Network dan reach naik, ketahanan lawan turun, stres ikut terdorong.",
            immediate: { network: 15, reach: 9, resolve: -11, stress: 5 },
            metrics: { reposts: 44000, replies: 28000, views: 410000 },
            tone: "good",
            quote:
              "Oke tuntutannya udah ada. Sekarang kasih deadline, siapa PIC-nya, terus jangan hilang pas trending turun.",
          },
        },
        {
          id: "nana-kursi",
          icon: "🪑",
          name: "Mbak Nana Kursi Kosong",
          role: "HOST AKUNTABILITAS PRIME TIME",
          bio: "Kalau narasumber nggak datang, ketidakhadirannya tetap dapat close-up.",
          ability: {
            name: "Kursi Kosong, Pertanyaan Penuh",
            desc: "Ketahanan lawan turun besar, kredibilitas naik, komentar dan views melonjak.",
            immediate: { resolve: -19, credibility: 8, heat: 3 },
            metrics: {
              views: 980000,
              likes: 125000,
              reposts: 48000,
              replies: 52000,
            },
            tone: "good",
            quote:
              "Kursinya kosong, jadi pertanyaannya gue taruh di sini. Siapa tahu jawabannya nyusul sebelum pemilu berikutnya.",
          },
        },
      ],
    ],
  };

  phaseRosters.buzzer[0].push({id:"joko-woles",icon:"🛠️",name:"Pak Joko Woles",role:"MENTOR TRANSISI REMOTE",bio:"Kerja, kerja, kerja; pertanyaan politik diarahkan ke yang terkait.",ability:{name:"Yang Penting Kerja",desc:"Heat turun dan transparansi berikutnya lebih murah, tapi satu pertanyaan tetap menunggu.",immediate:{heat:-8,stress:-4,credibility:3},buff:{actionIds:["transparency","data"],costMultiplier:.75,damage:8},tone:"neutral",quote:"Ya ditanyakan saja ke yang terkait. Saya fokus kerja dulu."}});
  phaseRosters.buzzer[1].push({id:"menlu-sugiyono",icon:"🌐",name:"Menlu Sunyi Gono-Gini",role:"DIPLOMAT HEMAT KATA",themes:["geopolitics","coalition","economy","military"],clue:"Panggil saat timeline membahas lawatan, BRICS, ASEAN, pertahanan, investasi, atau hasil konkret diplomasi.",bio:"Satu kalimat resmi, tujuh pertemuan tertutup, dua belas foto jabat tangan. Kalau ditanya hasil, jawabannya menyusul lewat jalur diplomatik.",ability:{name:"Bebas Aktif, Caption Pasif",desc:"Buka dua teaser geopolitik dan turunkan heat; manfaat konkretnya tetap ditagih.",immediate:{reach:5,heat:-5,credibility:2},reveal:2,buff:{actionIds:["data","context","transparency","patriot"],damage:12,costMultiplier:.74},tone:"neutral",quote:"Posisi Indonesia jelas. Detailnya melalui jalur diplomatik."},followUp:{actionIds:["data","context","transparency"],title:"Nota Diplomatik untuk {topic}, Bukan Album Bandara",desc:"Hubungkan {topic} dengan tujuan, biaya, leverage, dan hasil yang bisa ditagih setelah karpet merah digulung.",reward:{credibility:7,reach:4,democracy:3},costMultiplier:.4}});
  phaseRosters.aktivis[0].push({id:"roy-tifa",icon:"🔍",name:"Roy Sur-Yoyo & dr. Tifa-Tifi",role:"WILDCARD ZOOM 800%",bio:"Melihat font, pixel, dan benang merah yang nggak semua orang lihat—kadang karena memang nggak ada.",ability:{name:"Forensik dari Screenshot",desc:"Reach melonjak dan konteks berikutnya kuat, tapi kredibilitas turun kalau bukti primer nggak muncul.",immediate:{reach:10,credibility:-3,heat:9},buff:{actionIds:["context","data"],damage:12,engagementMultiplier:1.5},tone:"neutral",quote:"Saya cuma bertanya. Silakan jawab pakai dokumen asli."}});
  phaseRosters.aktivis[0].push({id:"konni-bakso-rie",icon:"🗺️",name:"Prof. Konni BaksLaah",role:"WILDCARD PETA PERTAHANAN LIPAT TIGA",bio:"Masuk studio bawa peta Indo-Pasifik sebesar taplak hajatan. Pulang ninggalin tiga headline, dua bantahan, dan host yang lupa jeda iklan.",ability:{name:"Bentangkan Peta Sampai Gelas Tumpah",desc:"Buka dua teaser geopolitik. Kartu data/context berikutnya lebih kuat dan murah; reach serta heat naik karena tiap panah di peta punya fanbase sendiri.",immediate:{reach:9,credibility:3,heat:7,stress:2,money:-7000000},metrics:{views:610000,likes:69000,reposts:30000,replies:41000},reveal:2,buff:{actionIds:["data","context"],damage:14,costMultiplier:.72,engagementMultiplier:1.3},tone:"neutral",quote:"Kalau mau bantah, bawa dokumen dan kronologi. Jangan cuma bawa potongan tujuh detik plus musik tegang."}});
  phaseRosters.aktivis[1].push({id:"dipo-peta",icon:"🧭",name:"Om Diplo Peta Dunia",role:"MENTOR STRATEGIC PAYOFF",bio:"Menghitung manfaat diplomasi setelah karpet merah digulung.",ability:{name:"Foreign Policy Scorecard",desc:"Buka dua tren dan perkuat data/konteks geopolitik.",immediate:{credibility:7,reach:4},reveal:2,buff:{actionIds:["data","context"],damage:13,costMultiplier:.8},tone:"good",quote:"Diplomasi harus punya tujuan, leverage, dan hasil—bukan cuma itinerary."}});
  phaseRosters.aktivis[1].push({id:"togar-toa",icon:"📣",name:"Mas Tiyo Toa",role:"ORATOR TOA KELILING",bio:"Kalau satu toa mati, dia sudah punya megafon cadangan, rundown aksi, dan tiga grup konsolidasi yang belum tidur.",ability:{name:"Estafet Toa Antarkampus",desc:"Network dan reach melonjak. Kartu network/empathy berikutnya lebih murah dan lebih kuat; heat ikut naik karena gerbang kampus mendadak ramai.",immediate:{network:12,reach:8,heat:5,stress:3,money:-6000000},metrics:{views:430000,likes:68000,reposts:39000,replies:26000},buff:{actionIds:["network","empathy"],damage:13,costMultiplier:.65,engagementMultiplier:1.3},tone:"good",quote:"Tuntutannya jangan cuma viral. Bagi PIC, jaga posko, catat korban, terus ketemu lagi setelah timeline pindah isu."}});
  phaseRosters.aktivis[2].push({id:"farah-footnote",icon:"📝",name:"Fatima Footnote",role:"STRATEGIS KAMPUS & PENJAGA CATATAN KAKI",bio:"Bisa mengubah rapat panas, enam voice note, dan dua puluh revisi menjadi pernyataan sikap yang masih bisa dibaca manusia.",ability:{name:"Konsolidasi Sampai Footnote",desc:"Kredibilitas, network, dan demokrasi naik. Kartu transparency/law/context berikutnya lebih murah serta terlindung dari penalti negatif.",immediate:{credibility:7,network:10,democracy:5,stress:3,money:-8000000},metrics:{views:360000,likes:57000,reposts:31000,replies:24000},buff:{actionIds:["transparency","law","context"],damage:12,costMultiplier:.7,protectNegatives:true},tone:"good",quote:"Slogannya boleh keras. Dokumennya harus lebih keras, dan tuntutannya jangan hilang pas kamera pulang."}});

  phaseRosters.buzzer[0].push(
    {id:"ultima-waspada",icon:"🚨",name:"Dr. Ultima Waspadaban",role:"ANALIS THREAT LEVEL & PODCAST",bio:"Masuk studio bawa catatan lapangan, keluar studio bikin netizen merasa semua grup WhatsApp punya sleeper cell.",ability:{name:"Naikkan Threat Level ke Oranye",desc:"Kredibilitas dan reach naik. Kartu data/patriot berikutnya lebih kuat, tapi heat ikut naik karena semua orang mendadak merasa sedang di-briefing.",immediate:{credibility:4,reach:7,heat:5,stress:2},metrics:{views:520000,likes:63000,reposts:27000,replies:32000},buff:{actionIds:["data","patriot"],damage:12,costMultiplier:.78,engagementMultiplier:1.25},tone:"neutral",quote:"Cek sumber dulu. Habis itu cek siapa yang motong videonya. Habis itu baru boleh panik, tapi antre."}},
    {id:"abu-jempol",icon:"👍",name:"Abu Jempol Nusantara",role:"PRAJURIT KOLOM KOMENTAR",bio:"Masuk thread tanpa dipanggil, keluar bawa bendera, caps lock, dan tujuh akun yang semuanya bilang ‘setuju, Bang’.",ability:{name:"Operasi Jempol Merah Putih",desc:"Repost, reply, dan reach meledak. Kartu meme/patriot berikutnya jadi brutal, tapi kredibilitas serta suhu timeline ikut terbakar.",immediate:{reach:11,heat:12,credibility:-4,democracy:-2},metrics:{views:780000,likes:94000,reposts:76000,replies:68000},buff:{actionIds:["meme","patriot"],damage:15,engagementMultiplier:1.55},tone:"bad",quote:"Nggak us bikin esai, Bro. Kasih emoji bendera, tulis ‘antek’, terus biarkan algoritma bela negara."}}
  );
  phaseRosters.buzzer[1].push(
    {id:"hasbun-brief",icon:"🍱",name:"Pak Hasbun Naskah Basi",role:"KEPALA KOMUNIKASI & DAPUR KLARIFIKASI",bio:"Kalau respons pertama bikin publik tambah marah, beliau punya klarifikasi yang menjelaskan klarifikasi atas klarifikasi.",ability:{name:"Klarifikasi Jilid Tiga",desc:"Heat dan stres turun. Kartu transparency/podcast berikutnya lebih murah dan lebih kuat, tapi kredibilitas tetap bayar ongkos kalimat pertama.",immediate:{heat:-14,stress:-7,credibility:-2,reach:3,money:45000000},metrics:{views:390000,likes:24000,reposts:17000,replies:52000},buff:{actionIds:["transparency","podcast"],damage:14,costMultiplier:.65,protectNegatives:true},tone:"neutral",quote:"Maksud saya bukan begitu. Yang begitu itu konteks sebelumnya. Nanti kita luruskan di klarifikasi berikutnya, habis makan siang."}}
  );
  phaseRosters.buzzer[1].push(
    {id:"nanik-nasi-doyang",icon:"🥘",name:"Bu Nanik Nasi-Doyang",role:"WAKIL KOMANDO DAPUR & INVESTIGASI",availableFrom:9,themes:["mbg","nutrition","food-safety","governance","accountability","media"],clue:"Panggil saat MBG membahas insiden keamanan pangan, SOP dapur, investigasi, kanal pengaduan, atau komunikasi krisis.",bio:"Baru masuk markas gizi, meja kerjanya langsung didatangi daftar insiden, chat minta jatah dapur, dan mikrofon yang belum sempat dingin.",ability:{name:"Tutup Dapur, Buka Log Suhu",desc:"Tekan heat dan buka follow-up investigasi. Efeknya kuat kalau laporan dapur, rantai dingin, vendor, serta korban benar-benar ikut dibuka—bukan cuma air mata konferensi pers.",immediate:{heat:-9,credibility:5,integrity:3,stress:3,money:-18000000},metrics:{views:540000,likes:47000,reposts:22000,replies:61000},buff:{actionIds:["transparency","data"],damage:15,costMultiplier:.58,protectNegatives:true},tone:"neutral",quote:"Kalau SOP dilanggar, dapurnya jangan dibela pakai slogan. Tutup dulu, periksa, tanggung korban, baru ngomong lagi."},followUp:{actionIds:["transparency","data"],title:"Buka Log Dapur {topic}, Jangan Cuma Buka Konpers",desc:"Publikasikan suhu, waktu masak-kirim, pemasok, sertifikat, laporan insiden, dan tindakan koreksi untuk {topic}.",reward:{credibility:9,integrity:6,democracy:4},costMultiplier:.3}}
  );
  phaseRosters.aktivis[1].push(
    {id:"tan-sehat-yen",icon:"🥗",name:"dr. Tan Sehat-Yen",role:"DOKTER GIZI PANGAN LOKAL",availableFrom:9,themes:["mbg","nutrition","food-safety","health","education","budget","accountability"],clue:"Panggil saat kotak MBG membahas mutu gizi, pangan ultra-proses, keamanan makanan, ahli gizi, atau anggaran yang mengaku pendidikan.",bio:"Melihat burger masuk kotak makan nasional lalu bertanya kenapa tepung impor dapat panggung, sementara pangan lokal dan ahli gizi kebagian catatan kaki.",ability:{name:"Bedah Menu Sampai Tepung Ngaku",desc:"Kredibilitas dan ketahanan bukti naik. Data, konteks, atau empati berikutnya membedah isi piring, beban dapur, dan dampak ke anak tanpa menjadikan korban konten.",immediate:{credibility:8,integrity:6,network:5,heat:2,stress:3,money:-7000000},metrics:{views:610000,likes:88000,reposts:41000,replies:35000},buff:{actionIds:["data","context","empathy","transparency"],damage:16,costMultiplier:.55,protectNegatives:true},tone:"good",quote:"Anak butuh pangan utuh, aman, dan masuk akal secara lokal. Bukan menu yang menang foto tapi kalah gizi."},followUp:{actionIds:["data","context","empathy"],title:"Audit Isi Piring {topic}, Bukan Cuma Isi Caption",desc:"Bandingkan kebutuhan gizi, bahan lokal, beban satu dapur, waktu distribusi, kejadian sakit, dan suara {people}.",reward:{credibility:10,integrity:7,network:5},costMultiplier:.28}}
  );

  // v3.8.0: context-sensitive power brokers, podcasters, economic critics, and strategic event ripples.
  phaseRosters.buzzer[0].push(
    {id:"stela-krispi",icon:"🧠",name:"Wamen Stelah Krispi",role:"WILDCARD LAB OTAK & SAINS KABINET",availableFrom:7,themes:["science","education","research","ai","data","budget"],clue:"Panggil saat timeline membahas kampus, riset, data, AI, atau anggaran ilmu pengetahuan.",bio:"Datang bawa diagram kognisi, pulang menemukan anggaran riset sudah lebih dulu menjalani eksperimen pengurangan.",ability:{name:"Tes Kognitif Anggaran",desc:"Kalau isu nyambung, buka kartu follow-up sains berbasis bukti. Kalau salah studio, timeline cuma dapat kuliah umum pas lagi bahas baliho.",immediate:{credibility:5,reach:4,stress:-2},buff:{actionIds:["data","transparency"],damage:13,costMultiplier:.7,protectNegatives:true},tone:"neutral",quote:"Coba pisahkan intuisi, data, dan keinginan agar slide terlihat futuristik."},followUp:{actionIds:["data","transparency"],title:"Peer Review {topic} Sebelum Press Release",desc:"Buka {doc}, indikator, desain program, dan batas klaim sebelum {topic} disebut terobosan.",reward:{credibility:7,integrity:5,democracy:3},costMultiplier:.42}},
    {id:"puanorama",icon:"🔨",name:"Mbak Puanorama Senayan",role:"POWER CARD OPOSISI DALAM GEDUNG",availableFrom:9,themes:["parliament","protest","law","budget","coalition","accountability"],clue:"Kuat saat isu menyentuh DPR, tunjangan, undang-undang, protes, atau negosiasi kursi.",bio:"Oposisi di luar kabinet, penguasa mikrofon di gedung sendiri. Satu ketukan palu bisa menutup rapat atau membuka season baru.",twist:"Efek kuat, tetapi patron istana dan jaringan koalisi bisa ngambek.",ability:{name:"Ketok Palu, Geser Koalisi",desc:"Tekan lawan lewat fungsi parlemen dan buka kartu follow-up pengawasan. Bonusnya besar; jaringan patron bayar biaya politik.",immediate:{resolve:-10,credibility:5,democracy:4,network:-4,money:-45000000,heat:5},buff:{actionIds:["transparency","data","patriot"],damage:14,costMultiplier:.72},tone:"neutral",quote:"Rapat dibuka. Yang belum siap menjawab boleh siap-siap jadi potongan video."},followUp:{actionIds:["transparency","data"],title:"Buka Risalah {topic}, Jangan Cuma Buka Sidang",desc:"Paksa {topic} masuk risalah, panggil penanggung jawab, dan bikin janji punya nomor halaman di {doc}.",reward:{credibility:8,democracy:6,network:3},costMultiplier:.38}},
    {id:"mega-watt",icon:"🔌",name:"Bu Mega-Watt Merah",role:"POWER CARD KETUA UMUM & PEMUTUS ARUS",availableFrom:4,themes:["party","coalition","legacy","constitution","election","jokowi"],clue:"Kuat saat timeline membahas koalisi, warisan kekuasaan, konstitusi, Jokowi, atau putaran pemilu.",bio:"Bisa bikin satu ruangan menunggu keputusan sambil teh dingin. Listrik koalisi menyala kalau tombolnya berkenan.",twist:"Membuka jalur oposisi, tapi invoice istana dan loyalitas patron langsung kedip-kedip.",ability:{name:"Cabut Colokan Koalisi",desc:"Pukul ketahanan lawan dan buka kartu negosiasi ideologis. Dana serta network buzzer ikut goyang karena stopkontak politik pindah ruangan.",immediate:{resolve:-16,credibility:6,integrity:2,network:-7,money:-120000000,heat:8},buff:{actionIds:["transparency","whatabout","patriot"],damage:16,costMultiplier:.75},tone:"neutral",quote:"Ideologi itu garis. Koalisi itu colokan. Jangan tertukar, nanti korslet sejarah."},followUp:{actionIds:["transparency","whatabout"],title:"Klausul Koalisi untuk {topic} Dibuka",desc:"Ubah pertemuan elite tentang {topic} jadi daftar posisi, syarat, dan konsekuensi yang bisa ditagih publik.",reward:{credibility:9,integrity:6,democracy:5},costMultiplier:.4}}
  );
  phaseRosters.aktivis[1].push(
    {id:"akbar-fasal",icon:"🎙️",name:"Bang Akbar Pasal Tanpa Sensor",role:"WILDCARD INTEROGASI PODCAST",availableFrom:7,themes:["law","parliament","party","accountability","media","election"],clue:"Cocok untuk perkara politik, DPR, partai, skandal, dan narasumber yang jawabannya muter seperti bundaran.",bio:"Pertanyaannya panjang, follow-up-nya lebih panjang, dan tombol skip intro sudah menyerah.",ability:{name:"Kunci Jawaban di Studio",desc:"Kalau tema pas, buka follow-up interview yang memaksa klaim bertemu dokumen dan timestamp.",immediate:{reach:8,credibility:4,heat:4,stress:2,money:-9000000},metrics:{views:650000,likes:72000,reposts:27000,replies:47000},buff:{actionIds:["context","law","transparency"],damage:14,costMultiplier:.72},tone:"good",quote:"Saya ulang ya: pertanyaannya siapa memutuskan, bukan siapa yang paling tersinggung."},followUp:{actionIds:["context","law","transparency"],title:"Follow-Up {topic} Sampai Jawaban Berhenti Muter",desc:"Taruh klaim, {doc}, bantahan, dan pertanyaan lanjutan tentang {topic} di meja yang sama.",reward:{credibility:8,reach:5,network:4},costMultiplier:.4}}
  );
  phaseRosters.aktivis[2].push(
    {id:"gita-wirawacana",icon:"♟️",name:"Om Gita Wacana-Wira",role:"MENTOR LONG GAME & PODCAST GLOBAL",availableFrom:2,themes:["economy","geopolitics","education","institutions","markets","productivity"],clue:"Panggil untuk rupiah, produktivitas, geopolitik, pendidikan, institusi, atau strategi jangka panjang.",bio:"Satu pertanyaan bisa keliling Singapura, Stanford, dan sejarah peradaban sebelum kembali ke harga beras.",ability:{name:"Tarik Kamera ke Long Game",desc:"Buka dua tren dan follow-up strategi jangka panjang. Salah tema bikin warga nunggu jawaban harian sampai episode berikutnya.",immediate:{credibility:7,reach:6,stress:-2,money:-12000000},metrics:{views:720000,likes:83000,reposts:21000,replies:25000},reveal:2,buff:{actionIds:["data","context","transparency"],damage:14,costMultiplier:.68},tone:"good",quote:"Kita perlu bicara bukan cuma tentang next quarter, tapi next generation—setelah tagihan bulan ini dibayar."},followUp:{actionIds:["data","context"],title:"Long Game {topic}, Short Invoice",desc:"Hubungkan {topic} dengan produktivitas, institusi, pendidikan, dan risiko antargenerasi—tanpa lupa tagihan bulan ini.",reward:{credibility:9,democracy:4,network:4},costMultiplier:.37}},
    {id:"feri-latah-hitung",icon:"🧮",name:"Feri Latih-Hitung",role:"EKONOM DOMPET STRESS TEST",availableFrom:2,themes:["economy","currency","budget","markets","debt","mbg"],clue:"Cocok untuk rupiah, IHSG, APBN, utang, MBG, dan program yang bilang gratis sambil kas batuk.",bio:"Kalau pemerintah bilang fundamental kuat, dia langsung nanya fundamental siapa dan struknya mana.",ability:{name:"Stress Test Sampai Dompet Bicara",desc:"Kuat di isu fiskal dan pasar; membuka kartu hitung biaya yang bonusnya besar untuk aktivis kere tapi teliti.",immediate:{credibility:6,reach:5,money:-6000000,heat:2},buff:{actionIds:["data","transparency"],damage:16,costMultiplier:.6},tone:"good",quote:"Gratis buat penerima bukan berarti gratis buat APBN. Tolong invoice-nya jangan disembunyikan di slide penutup."},followUp:{actionIds:["data","transparency"],title:"Hitung Siapa Bayar {topic}, Siapa Dapat",desc:"Bedah costing, risiko fiskal, kurs, dan distribusi manfaat {topic} tanpa mematikan kalkulator saat hasilnya nggak enak.",reward:{credibility:8,integrity:5,money:18000000},costMultiplier:.3}},
    {id:"yanuar-risky",icon:"⚠️",name:"Risky Februari",role:"ANALIS RISIKO & ARUS KAS NEGARA",availableFrom:2,themes:["markets","economy","risk","state-assets","budget","governance"],clue:"Paling pas untuk IHSG, Danantara, BUMN, risiko fiskal, tata kelola, dan grafik yang kelihatan aman karena zoom-nya jauh.",bio:"Membaca catatan kaki laporan keuangan sampai catatan kakinya minta perlindungan saksi.",ability:{name:"Peta Risiko Tanpa Filter Hijau",desc:"Membuka follow-up risk map. Tepat tema memberi reward besar; salah tema bikin semua orang merasa sedang ikut rapat audit yang nyasar.",immediate:{credibility:7,heat:2,money:-7000000},buff:{actionIds:["data","transparency","law"],damage:16,costMultiplier:.62,protectNegatives:true},tone:"good",quote:"Aset besar itu headline. Risiko, kontrol, dan siapa menanggung rugi itu isi laporan."},followUp:{actionIds:["data","transparency"],title:"Buka Risk Register {topic}",desc:"Petakan risiko {topic}, penanggung jawab, batas kerugian, dan siapa yang menalangi bila strategi gagal.",reward:{credibility:9,integrity:6,democracy:3},costMultiplier:.32}},
    {id:"hendro-satirio",icon:"☕",name:"Mas Hendro Satir-IO",role:"PENGAMAT SUHU PUBLIK & QUICK POLL",availableFrom:10,themes:["polling","protest","parliament","election","public-opinion","party"],clue:"Panggil saat isu tentang survei, demo, DPR, elektabilitas, atau elite yang mengira timeline sama dengan rakyat.",bio:"Membaca arah angin politik dari survei, warung kopi, dan siapa yang tiba-tiba berhenti angkat telepon.",ability:{name:"Cek Suhu, Bukan Cuma Trending",desc:"Buka follow-up opini publik. Match kuat menambah reach dan kredibilitas; salah tema cuma menghasilkan hot take suhu ruang.",immediate:{reach:7,credibility:4,network:4,heat:1,money:-5000000},buff:{actionIds:["context","data","network"],damage:12,costMultiplier:.72},tone:"neutral",quote:"Trending itu ramai. Opini publik itu ramai yang disampling dengan benar. Bedanya lumayan mahal."},followUp:{actionIds:["context","data","network"],title:"Audit Survei {topic}, Bukan Perasaan",desc:"Buka sponsor, wording, sampel, tanggal, dan selisih antara suara timeline dengan suara warga soal {topic}.",reward:{credibility:7,reach:6,network:5},costMultiplier:.4}}
  );
  // Recurring power brokers return only in phases where their institutional leverage matters.
  const cloneCrew=(role,fromPhase,id,overrides={})=>{
    const source=phaseRosters[role][fromPhase].find(c=>c.id===id);
    return source?{...source,...overrides,ability:{...source.ability,...(overrides.ability||{})},followUp:source.followUp?{...source.followUp,...(overrides.followUp||{})}:overrides.followUp}:null;
  };
  [
    ["buzzer",1,"stela-krispi",{availableFrom:2,role:"WILDCARD SAINS DI TENGAH EFISIENSI"}],
    ["buzzer",1,"puanorama",{availableFrom:7,role:"POWER CARD PALU DI TENGAH PROTES"}],
    ["buzzer",1,"mega-watt",{availableFrom:2,role:"POWER CARD OPOSISI & REKONSILIASI"}],
    ["buzzer",2,"menlu-sugiyono",{availableFrom:1}],
    ["aktivis",2,"dipo-peta",{availableFrom:1}],
    ["buzzer",4,"mega-watt",{availableFrom:1,role:"POWER CARD PRA-PEMILU"}],
    ["buzzer",4,"puanorama",{availableFrom:1,role:"POWER CARD PARLEMEN PRA-PEMILU"}],
    ["buzzer",5,"mega-watt",{availableFrom:1,role:"POWER CARD PUTARAN KEDUA"}],
    ["buzzer",5,"puanorama",{availableFrom:1,role:"POWER CARD PALU PEMILU"}],
  ].forEach(([role,phase,id,overrides])=>{const c=cloneCrew(role,id==="menlu-sugiyono"?1:id==="dipo-peta"?1:0,id,overrides);if(c&&!phaseRosters[role][phase].some(x=>x.id===id))phaseRosters[role][phase].push(c)});

  phaseRosters.aktivis[3].push(
    {id:"renal-disrupsi",icon:"📉",name:"Prof. Renal Disrupsi",role:"MENTOR PERUBAHAN & SLIDE 87",availableFrom:1,themes:["institutions","economy","state-assets","education","technology","change"],clue:"Cocok untuk reformasi institusi, Danantara, BUMN, teknologi, pendidikan, dan organisasi yang ganti logo tapi bukan kebiasaan.",bio:"Setiap krisis punya 87 slide, tiga kurva S, dan satu pertanyaan: siapa yang masih kerja pakai cara kemarin?",ability:{name:"Disrupsi Sebelum Didisrupsi",desc:"Buka kartu redesign institusi. Match kuat menurunkan biaya dan membuka reward; salah tema membuat rapat berubah jadi seminar manajemen.",immediate:{credibility:6,reach:5,stress:-3,money:-9000000},buff:{actionIds:["context","data","network"],damage:14,costMultiplier:.64},tone:"good",quote:"Masalahnya bukan perubahan datang terlalu cepat. Masalahnya organisasi masih rapat menentukan nama grup WhatsApp."},followUp:{actionIds:["context","data","network"],title:"Redesign Sistem di Balik {topic}",desc:"Petakan proses lama, insentif, kemampuan organisasi, dan siapa yang kehilangan kuasa ketika reformasi {topic} benar-benar jalan.",reward:{credibility:8,network:7,integrity:4},costMultiplier:.38}}
  );

  // Expert panel returns in later phases when the story reaches elections, markets, diplomacy, or institutional redesign.
  [
    ["aktivis",4,2,"gita-wirawacana",{availableFrom:1,role:"WILDCARD LONG GAME PRA-PEMILU"}],
    ["aktivis",4,2,"feri-latah-hitung",{availableFrom:5,role:"WILDCARD DOMPET PRA-PEMILU"}],
    ["aktivis",4,2,"yanuar-risky",{availableFrom:5,role:"WILDCARD RISK REGISTER KAMPANYE"}],
    ["aktivis",4,3,"renal-disrupsi",{availableFrom:1,role:"WILDCARD REDESIGN PROGRAM"}],
    ["aktivis",4,1,"akbar-fasal",{availableFrom:1,role:"WILDCARD FOLLOW-UP PRA-PEMILU"}],
    ["aktivis",4,2,"hendro-satirio",{availableFrom:1,role:"WILDCARD SUHU PRA-PEMILU"}],
    ["aktivis",5,2,"gita-wirawacana",{availableFrom:1,role:"PANEL LONG GAME PEMILU"}],
    ["aktivis",5,2,"feri-latah-hitung",{availableFrom:1,role:"PANEL DOMPET PEMILU"}],
    ["aktivis",5,2,"yanuar-risky",{availableFrom:1,role:"PANEL RISIKO PEMILU"}],
    ["aktivis",5,1,"akbar-fasal",{availableFrom:1,role:"PANEL FOLLOW-UP PEMILU"}],
    ["aktivis",5,2,"hendro-satirio",{availableFrom:1,role:"PANEL SUHU PEMILU"}],
    ["aktivis",5,1,"dipo-peta",{availableFrom:1,role:"PANEL GEOPOLITIK PEMILU"}]
  ].forEach(([role,phase,fromPhase,id,overrides])=>{const c=cloneCrew(role,fromPhase,id,overrides);if(c&&!phaseRosters[role][phase].some(x=>x.id===id))phaseRosters[role][phase].push(c)});

  // Keep every yearly pool broad enough for a real rotation. A three-card
  // lineup needs at least nine distinct faces to give recurring characters
  // breathing room instead of turning the roster into the same monthly panel.
  [
    ["buzzer",1,0,"joko-woles",{availableFrom:1,availableUntil:12,role:"PENASEHAT TRANSISI & WARISAN REMOTE"}],
    ["buzzer",2,1,"gemoyono",{availableFrom:1,availableUntil:12,role:"MENTOR PODIUM TAHUN KEDUA"}],
    ["buzzer",2,1,"tedi-beruang",{availableFrom:1,availableUntil:12,role:"PENGUNCI RUNDOWN KABINET"}],
    ["buzzer",2,1,"bahlul",{availableFrom:1,availableUntil:12,role:"MENTOR HILIRISASI SEMUA JAWABAN"}],
    ["buzzer",2,1,"hasbun-brief",{availableFrom:1,availableUntil:12,role:"DAPUR KLARIFIKASI TAHUN KEDUA"}],
    ["buzzer",2,0,"stela-krispi",{availableFrom:1,availableUntil:12,role:"WILDCARD SAINS & EFISIENSI"}],
    ["buzzer",3,1,"gemoyono",{availableFrom:1,availableUntil:12,role:"MENTOR PODIUM TAHUN KETIGA"}],
    ["buzzer",3,1,"tedi-beruang",{availableFrom:1,availableUntil:12,role:"PENGUNCI RUNDOWN TAHUN KETIGA"}],
    ["buzzer",3,1,"bahlul",{availableFrom:1,availableUntil:12,role:"MENTOR HILIRISASI TAHUN KETIGA"}],
    ["buzzer",3,2,"purbayaya",{availableFrom:1,availableUntil:12,role:"MENTOR DOMPET TAHUN KETIGA"}],
    ["buzzer",3,2,"muteya",{availableFrom:1,availableUntil:12,role:"PENGATUR BANDWIDTH TAHUN KETIGA"}],
    ["buzzer",3,2,"syafri",{availableFrom:1,availableUntil:12,role:"KOORDINATOR KOMANDO TAHUN KETIGA"}],
    ["buzzer",4,1,"gemoyono",{availableFrom:1,availableUntil:12,role:"MENTOR PODIUM PRA-PEMILU"}],
    ["buzzer",4,1,"tedi-beruang",{availableFrom:1,availableUntil:12,role:"PENGUNCI RUNDOWN PRA-PEMILU"}],
    ["buzzer",4,1,"bahlul",{availableFrom:1,availableUntil:12,role:"MENTOR HILIRISASI PRA-PEMILU"}],
    ["buzzer",4,2,"purbayaya",{availableFrom:1,availableUntil:12,role:"MENTOR DOMPET PRA-PEMILU"}],
    ["buzzer",5,1,"gemoyono",{availableFrom:1,availableUntil:12,role:"MENTOR PODIUM PEMILU"}],
    ["buzzer",5,1,"tedi-beruang",{availableFrom:1,availableUntil:12,role:"PENGUNCI RUNDOWN PEMILU"}],
    ["buzzer",5,1,"bahlul",{availableFrom:1,availableUntil:12,role:"MENTOR HILIRISASI PEMILU"}],
    ["buzzer",5,2,"purbayaya",{availableFrom:1,availableUntil:12,role:"MENTOR DOMPET PEMILU"}],
    ["aktivis",0,1,"feri-ambyar",{availableFrom:1,availableUntil:12,role:"PANEL KONSTITUSI PEMILU"}],
    ["aktivis",0,1,"bibitri",{availableFrom:1,availableUntil:12,role:"PANEL NASKAH & ETIK PEMILU"}],
    ["aktivis",0,1,"dandhy",{availableFrom:1,availableUntil:12,role:"PANEL ARSIP VISUAL PEMILU"}],
    ["aktivis",0,1,"togar-toa",{availableFrom:1,availableUntil:12,role:"PANEL TOA & KONSOLIDASI PEMILU"}],
    ["aktivis",1,0,"mimin-ingat",{availableFrom:1,availableUntil:12,role:"ARSIPARIS TAHUN PERTAMA REZIM"}],
    ["aktivis",1,0,"kak-referensi",{availableFrom:1,availableUntil:12,role:"DROP LINK PRIMER TAHUN PERTAMA"}],
    ["aktivis",1,0,"ferry-irwindy",{availableFrom:1,availableUntil:12,role:"VIDEO PANJANG TAHUN PERTAMA"}],
    ["aktivis",3,2,"uceng",{availableFrom:1,availableUntil:12,role:"PANEL KONFLIK KEPENTINGAN TAHUN KETIGA"}],
    ["aktivis",3,2,"haris",{availableFrom:1,availableUntil:12,role:"PANEL PERTANYAAN BELUM DIJAWAB"}],
    ["aktivis",3,2,"bem-ui",{availableFrom:1,availableUntil:12,role:"PANEL PDF, TOA & KAMPUS"}],
    ["aktivis",3,2,"farah-footnote",{availableFrom:1,availableUntil:12,role:"PANEL CATATAN KAKI & KONSOLIDASI"}]
  ].forEach(([role,phase,fromPhase,id,overrides])=>{
    const character=cloneCrew(role,fromPhase,id,overrides);
    if(character&&!phaseRosters[role][phase].some(item=>item.id===id))phaseRosters[role][phase].push(character);
  });

  const sources = {
    election: [
      [
        "Kampanye digital 2024",
        "Media internasional dan riset pemilu mencatat pentingnya rebranding, TikTok, influencer, serta pemilih muda dalam Pilpres 2024.",
        "https://www.theguardian.com/world/2024/jan/09/indonesia-election-prabowo-subianto-rebranding-kidnapping-accusations",
      ],
      [
        "Influencer pendukung paslon",
        "ANTARA melaporkan kelompok Kreator Indonesia Maju sebagai influencer dan artis pendukung Prabowo-Gibran dalam masa kampanye.",
        "https://sultra.antaranews.com/berita/454833/influencer-pendukung-prabowo-gibran-menilai-paparan-02-mudah-dipahami",
      ],
    ],
    fufufafa: [
      [
        "Kontroversi akun Kaskus fufufafa",
        "Akun forum lama itu viral pada 2024 karena unggahan yang menyerang Prabowo dan keluarganya serta komentar tidak pantas terhadap sejumlah figur publik. Kepemilikannya ramai dikaitkan dengan Gibran, tetapi belum terbukti secara final.",
        "https://www.suara.com/tekno/2024/09/02/194331/apakah-fufufafa-akun-milik-gibran-begini-jawaban-pendiri-kaskus-dan-pakar",
      ],
      [
        "Status identitas belum terkonfirmasi",
        "Pendiri Kaskus Andrew Darwis menekankan mudahnya membuat akun pada masa itu; Ainun Najib menyatakan belum ada bukti langsung yang cukup. Gibran dan sejumlah pendukungnya membantah keterkaitan akun tersebut.",
        "https://katadata.co.id/lifestyle/varia/66f4c71c2d57a/4-fakta-akun-fufufafa-yang-viral-di-media-sosial-benarkah-milik-gibran",
      ],
      [
        "Repository arsip komentar",
        "Repository komunitas mengumpulkan jejak komentar akun fufufafa untuk dokumentasi sejarah. Isinya dapat menjadi petunjuk gaya dan kronologi, bukan bukti final mengenai identitas pemilik akun.",
        "https://github.com/fufufufafafa/fufufafa-memorable-quotes",
      ],
    ],
    dirtyvote: [
      [
        "Dirty Vote",
        "Dokumenter 2024 menampilkan Bivitri Susanti, Feri Amsari, dan Zainal Arifin Mochtar serta disutradarai Dandhy Dwi Laksono.",
        "https://www.youtube.com/watch?v=RRgLZ66NCmE",
      ],
      [
        "Konteks akademik",
        "University of Melbourne mencatat film tersebut menarik lebih dari enam juta tayangan pada hari pertama.",
        "https://indonesiaatmelbourne.unimelb.edu.au/talking-indonesia-dirty-vote/",
      ],
    ],
    watchdoc: [
      [
        "Tentang Watchdoc",
        "Watchdoc didirikan oleh Andhy Panca Kurniawan dan Dandhy Dwi Laksono pada 2009 dan telah memproduksi ratusan dokumenter.",
        "https://watchdoc.co.id/what-is-watchdoc/",
      ],
      [
        "Ramon Magsaysay Award",
        "Watchdoc menerima Ramon Magsaysay Award 2021 untuk jurnalisme investigatif, film dokumenter, dan teknologi digital.",
        "https://rmaward.asia/rmawardees/watchdoc-media-mandiri/",
      ],
    ],
    experts: [
      [
        "Feri Amsari",
        "Feri adalah pengajar hukum tata negara Universitas Andalas dan pernah memimpin PUSaKO.",
        "https://themis.id/feri-amsari/",
      ],
      [
        "Bivitri Susanti",
        "Bivitri adalah pengajar Jentera dengan fokus reformasi hukum, hukum tata negara, dan kebijakan.",
        "https://www.jentera.ac.id/staf/bivitri-susanti",
      ],
      [
        "Zainal “Uceng” Arifin Mochtar",
        "UGM mengukuhkan Zainal sebagai guru besar hukum kelembagaan negara pada Januari 2026.",
        "https://law.ugm.ac.id/prof-dr-zainal-arifin-mochtar-s-h-ll-m-dikukuhkan-sebagai-guru-besar-dalam-bidang-hukum-kelembagaan-negara-soroti-independensi-lembaga-negara-di-indonesia/",
      ],
    ],
    publicfigures: [
      [
        "Utusan khusus presiden",
        "Raffi Ahmad dilantik sebagai Utusan Khusus Presiden Bidang Pembinaan Generasi Muda dan Pekerja Seni pada Oktober 2024.",
        "https://presidenri.go.id/siaran-pers/presiden-prabowo-resmi-lantik-para-penasihat-khusus-utusan-khusus-dan-staf-khusus-presiden/",
      ],
      [
        "Seniman di kabinet",
        "Giring Ganesha dilantik sebagai Wakil Menteri Kebudayaan pada Oktober 2024.",
        "https://presidenri.go.id/siaran-pers/presiden-prabowo-resmi-lantik-para-wakil-menteri-kabinet-merah-putih/",
      ],
      [
        "Komunikasi pertahanan",
        "Deddy Corbuzier dilantik sebagai Staf Khusus Menteri Pertahanan Bidang Komunikasi pada Februari 2025.",
        "https://umj.ac.id/just_info/resmi-deddy-corbuzier-dilantik-jadi-stafsus-menhan1/",
      ],
    ],
    mbg: [
      [
        "Versi anggaran negara",
        "Kementerian Keuangan menjelaskan program MBG sebagai prioritas pembangunan manusia dan gizi.",
        "https://www.kemenkeu.go.id/informasi-publik/publikasi/berita-utama/Wamenkeu-Suahasil-Program-Makan-Bergizi-Gratis",
      ],
      [
        "Evaluasi dan efisiensi",
        "Reuters membahas evaluasi anggaran, dapur, dan target penerima program pada 2026.",
        "https://www.reuters.com/world/asia-pacific/indonesia-weighs-2-billion-cut-prabowos-signature-free-meals-programme-2026-06-25/",
      ],
    ],
    tni: [
      [
        "Penjelasan DPR",
        "DPR menjelaskan jabatan tertentu yang dapat diisi prajurit aktif setelah perubahan UU TNI.",
        "https://emedia.dpr.go.id/news/2025/03/20/tni-aktif-selain-di-14-jabatan-tertentu-harus-mundur-atau-pensiun-dari-kedinasan",
      ],
      [
        "Kritik akademik",
        "Akademisi UGM memperingatkan risiko perluasan dominasi militer dalam jabatan sipil.",
        "https://ugm.ac.id/en/news/military-dominance-in-proposed-tni-law-revision-threatens-indonesias-civil-military-relations/",
      ],
    ],
    komisaris: [
      [
        "Putusan Mahkamah Konstitusi",
        "MK menegaskan larangan wakil menteri merangkap jabatan tertentu, termasuk komisaris.",
        "https://www.mkri.id/berita/wakil-menteri-dilarang-rangkap-jabatan--23695",
      ],
      [
        "Konflik kepentingan",
        "Akademisi UGM mendorong penegakan larangan rangkap jabatan wakil menteri di BUMN.",
        "https://ugm.ac.id/en/news/ugm-scholar-urges-president-prabowo-to-enforce-ban-on-deputy-ministers-holding-soe-posts/",
      ],
    ],
    buzzer: [
      [
        "Buzzer dan demokrasi",
        "Komdigi pernah membahas industri buzzer dan hoaks sebagai persoalan ruang demokrasi.",
        "https://www.komdigi.go.id/berita/pengumuman/detail/menggusur-buzzer-dari-ruang-demokrasi",
      ],
      [
        "Riset jaringan buzzer",
        "CSIS membahas dampak budaya buzzer dan misinformasi terhadap demokrasi Indonesia.",
        "https://www.csis.org/blogs/new-perspectives-asia/democracy-digital-age-how-buzzer-culture-stinging-indonesias-democracy",
      ],
    ],
    budget: [
      [
        "APBN sebagai pilihan politik",
        "APBN memuat prioritas, kompromi, dan biaya peluang dalam kebijakan publik.",
        "https://www.kemenkeu.go.id/informasi-publik/publikasi/siaran-pers/APBN-2026-Tetap-Sehat-Dukung-Pertumbuhan-Ekonomi",
      ],
      [
        "Literasi anggaran",
        "Kementerian Keuangan menjelaskan kerangka APBN 2026 dan keberpihakan kebijakan.",
        "https://mediakeuangan.kemenkeu.go.id/article/show/apbn-2026-sehat-kredibel-dan-berpihak-pada-rakyat",
      ],
    ],
    court: [
      [
        "Uji materi dan constitutional complaint",
        "Bivitri Susanti menyampaikan pandangan mengenai pengujian formal UU di Mahkamah Konstitusi pada 2025.",
        "https://en.mkri.id/news/details/2025-07-16/Bivitri_Susanti_Proposes_Formal_Review_for_Constitutional_Complaint",
      ],
      [
        "Checks and balances",
        "Pidato guru besar Zainal Arifin Mochtar menyoroti pelemahan independensi lembaga negara.",
        "https://law.ugm.ac.id/prof-dr-zainal-arifin-mochtar-s-h-ll-m-dikukuhkan-sebagai-guru-besar-dalam-bidang-hukum-kelembagaan-negara-soroti-independensi-lembaga-negara-di-indonesia/",
      ],
    ],
    hundreddays: [
      [
        "Catatan 100 hari YLBHI",
        "YLBHI mencatat lima kelompok masalah: PSN dan aparat, beban anggaran, peran militer, pajak-antikorupsi, serta pelanggaran HAM masa lalu.",
        "https://ylbhi.or.id/informasi/siaran-pers/melangkah-mundur-untuk-menghancurkan-demokrasi-catatan-100-hari-kekuasaan-rezim-prabowo/",
      ],
      [
        "Kabinet besar",
        "Kabinet Merah Putih dilantik dengan 109 anggota dan menjadi kabinet terbesar Indonesia sejak 1966.",
        "https://apnews.com/article/6b1f915d584c823aa16dbc38374c739c",
      ],
    ],
    darkprotests: [
      [
        "Indonesia Gelap",
        "Reuters melaporkan demonstrasi mahasiswa Februari 2025 menentang pemotongan anggaran dan kebijakan pemerintah.",
        "https://www.reuters.com/world/asia-pacific/students-lead-dark-indonesia-protests-against-budget-cuts-2025-02-20/",
      ],
      [
        "Rangkaian demonstrasi",
        "Tempo merangkum demonstrasi selama pemerintahan Prabowo yang belum genap setahun.",
        "https://www.tempo.co/politik/demonstrasi-sepanjang-pemerintahan-prabowo-yang-belum-genap-setahun-2068924",
      ],
    ],
    demonstrations: [
      [
        "Rangkaian demonstrasi pemerintahan Prabowo",
        "Tempo merangkum gelombang demonstrasi dari isu anggaran, TNI, sampai tekanan ekonomi.",
        "https://www.tempo.co/politik/demonstrasi-sepanjang-pemerintahan-prabowo-yang-belum-genap-setahun-2068924",
      ],
      [
        "Satu tahun pemerintahan",
        "Reuters melaporkan rencana demonstrasi mahasiswa pada satu tahun pemerintahan Prabowo.",
        "https://www.reuters.com/world/asia-pacific/indonesian-students-protest-prabowo-marks-one-year-office-2025-10-20/",
      ],
    ],
    august: [
      [
        "Protes Agustus 2025",
        "AP melaporkan protes nasional setelah kematian Affan Kurniawan, isu tunjangan DPR, biaya hidup, dan kekerasan aparat.",
        "https://apnews.com/article/3776bd9365804cda9f7c3f85b2104502",
      ],
      [
        "Latar protes",
        "TIME merangkum pemicu, eskalasi, korban, dan respons pemerintah pada protes Agustus 2025.",
        "https://time.com/7313691/indonesia-protests-bali-jakarta-food-delivery-driver-death-prabowo-subianto/",
      ],
    ],
    seventeen: [
      [
        "Tuntutan 17+8",
        "Tuntutan 17+8 merangkum 17 agenda cepat dan 8 reformasi jangka satu tahun dari berbagai kelompok masyarakat sipil.",
        "https://en.wikipedia.org/wiki/17%2B8_Demands",
      ],
      [
        "Konteks gerakan",
        "Figur publik dan aktivis digital membantu menyebarkan rangkuman tuntutan yang bersumber dari banyak organisasi.",
        "https://en.wikipedia.org/wiki/August_2025_Indonesian_protests",
      ],
    ],
    finance: [
      [
        "Pergantian Menteri Keuangan",
        "Reuters melaporkan pengangkatan Purbaya Yudhi Sadewa sebagai Menteri Keuangan pada 8 September 2025.",
        "https://www.reuters.com/world/asia-pacific/indonesia-names-purbaya-yudhi-sadewa-new-finance-minister-after-sri-mulyani-2025-09-08/",
      ],
      [
        "Tekanan setelah protes",
        "AP melaporkan reshuffle kabinet setelah protes nasional mengenai biaya hidup, tunjangan legislator, dan kekerasan.",
        "https://apnews.com/article/3776bd9365804cda9f7c3f85b2104502",
      ],
    ],
    dualroles: [
      [
        "Rangkap jabatan wakil menteri dan komisaris",
        "Putusan MK No. 80/PUU-XVII/2019 menegaskan larangan rangkap jabatan wakil menteri, termasuk pada komisaris atau direksi perusahaan negara maupun swasta.",
        "https://www.mkri.id/",
      ],
      [
        "Temuan rangkap jabatan 2025",
        "Pada Juli 2025, Transparency International Indonesia menyoroti puluhan wakil menteri atau pejabat setingkat yang juga tercatat memegang posisi komisaris BUMN. Game menyajikannya sebagai isu konflik kepentingan dan tata kelola, bukan tuduhan pidana individual.",
        "https://ti.or.id/",
      ],
    ],
    bankrupt: [
      [
        "Demonstrasi ekonomi 2026",
        "AP melaporkan demonstrasi mahasiswa Juni 2026 mengenai kenaikan harga, tekanan ekonomi, program belanja besar, dan peran militer.",
        "https://apnews.com/article/fc758948bc547075d62bcf80d8a7e827",
      ],
      [
        "Seruan Indonesia Bangkrut",
        "Nama event mengikuti seruan BEM UI yang dirujuk pembuat game; game memperlakukannya sebagai slogan politik yang perlu dijelaskan, bukan klaim insolvensi literal.",
        "https://www.instagram.com/bemui_official/",
      ],
    ],
    civicspace2026: [
      [
        "Serangan terhadap aktivis KontraS",
        "Reuters melaporkan penyelidikan serangan air keras terhadap Andrie Yunus setelah ia mengkritik perluasan peran militer dalam kehidupan sipil.",
        "https://www.reuters.com/world/asia-pacific/probe-into-acid-attack-indonesian-activist-underway-condemnation-grows-2026-03-16/",
      ],
      [
        "Ruang sipil",
        "Game tidak menyimpulkan motif pelaku sebelum proses penyelidikan dan pembuktian selesai.",
        "",
      ],
    ],
    socialmedia2026: [
      [
        "Pembatasan usia media sosial",
        "Reuters melaporkan Indonesia mulai membatasi akses platform berisiko tinggi bagi pengguna di bawah 16 tahun pada Maret 2026.",
        "https://www.reuters.com/sustainability/society-equity/indonesia-restrict-social-media-access-children-under-16-minister-says-2026-03-06/",
      ],
      [
        "Transparansi implementasi",
        "AP membahas tuntutan pelaporan akun yang ditutup serta perdebatan mengenai verifikasi usia dan privasi.",
        "https://apnews.com/article/39630c776f947652cde619ad4ae56627",
      ],
    ],
    eastkalimantan2026: [
      [
        "Protes Kalimantan Timur 2026",
        "Ribuan warga dan mahasiswa berdemonstrasi di Samarinda dengan tuntutan audit kebijakan, penghentian KKN, dan pengawasan DPRD yang lebih kuat.",
        "https://en.wikipedia.org/wiki/2026_East_Kalimantan_protests",
      ],
      [
        "Catatan sumber",
        "Tautan ini digunakan sebagai indeks kronologi; pemain tetap dianjurkan membuka sumber berita primer yang dirujuk di dalamnya.",
        "",
      ],
    ],
    defense2026: [
      [
        "Kerja sama pertahanan Indonesia–India",
        "Reuters melaporkan kesepakatan BrahMos dan Astra dalam rangkaian kerja sama pertahanan Indonesia–India pada Juli 2026.",
        "https://www.reuters.com/world/asia-pacific/indias-modi-meet-indonesias-prabowo-talks-defence-food-security-2026-07-07/",
      ],
      [
        "Biaya dan pengawasan",
        "Nilai strategis pengadaan perlu dibaca bersama kebutuhan, biaya siklus hidup, transfer teknologi, dan pengawasan sipil.",
        "",
      ],
    ],
    future: [
      [
        "Skenario prediktif",
        "Peristiwa 2027–2029 dalam game adalah fiksi yang dibangun dari risiko struktural: tekanan fiskal, politik koalisi, perluasan AI generatif, relasi sipil-militer, krisis iklim, dan siklus pemilu.",
        "",
      ],
      [
        "Bukan ramalan",
        "Nama, hasil pemilu, skandal, dan keputusan masa depan tidak dinyatakan sebagai fakta. Pemain diminta menilai mekanisme, bukan menebak pemenang.",
        "",
      ],
    ],
    election2029: [
      [
        "Ambang pencalonan presiden",
        "Mahkamah Konstitusi pada Januari 2025 menyatakan ketentuan presidential threshold tidak memiliki kekuatan hukum mengikat, membuka kemungkinan lebih banyak pasangan pada 2029.",
        "https://www.reuters.com/world/asia-pacific/indonesia-court-says-vote-threshold-presidential-candidates-not-legally-binding-2025-01-02/",
      ],
      [
        "Pemilu berikutnya",
        "Pemilihan presiden berlangsung lima tahunan; detail implementasi aturan 2029 tetap dapat berubah melalui legislasi dan putusan lanjutan.",
        "",
      ],
    ],
  };
  const cast = {
    power: [
      [
        "🦅",
        "Pak Jenderal Gemoyono",
        "Arketipe presiden berlatar militer yang citranya direbranding menjadi gemoy, tegas, dan selalu siap pidato panjang.",
        "Parodi komposit; bukan biografi.",
      ],
      [
        "🚀",
        "Mas Samsul Raka Buming-Buming",
        "Arketipe wakil presiden muda yang hidup di persimpangan dinasti, startup, dan slide presentasi.",
        "Parodi komposit; bukan tuduhan.",
      ],
      [
        "🐻",
        "Mayor Tedi Ketok-Pintu",
        "Arketipe sekretaris kabinet yang mengelola tempo panggung, agenda, dan foto resmi.",
        "Terinspirasi jabatan publik.",
      ],
      [
        "🕶️",
        "Pak Deskoordinasi Senyap",
        "Broker koalisi yang selalu hadir sebelum keputusan dan menghilang sebelum pertanyaan kedua.",
        "Parodi institusional.",
      ],
      [
        "🏢",
        "Narasi Bersama Konsultan",
        "Agensi fiktif yang menjual spontanitas, patriotisme, dan akun organik dalam paket pengadaan.",
        "Sepenuhnya fiktif.",
      ],
      [
        "💼",
        "Pak Purba-Yey Dompet Negara",
        "Arketipe menteri keuangan yang harus menjelaskan bahwa optimisme fiskal tidak dapat dibayar dengan emoji roket.",
        "Terinspirasi portofolio keuangan.",
      ],
      [
        "⛏️",
        "Pak Bahlul Serba Bisa",
        "Menteri arketipal yang dapat menjawab energi, investasi, partai, tambang, dan pertanyaan yang belum diajukan.",
        "Parodi komposit.",
      ],
      [
        "🪖",
        "Jenderal Syaf-Ribet Semua Urusan",
        "Arketipe menteri pertahanan ketika seragam, pangan, keamanan, dan pembangunan mulai berbagi grup WhatsApp.",
        "Parodi portofolio.",
      ],
      [
        "📜",
        "Pak Yus-Ribet Pasal Berjalan",
        "Arketipe ahli hukum senior yang selalu membawa pasal, tafsir, dan kalimat “secara konstitusional begini”.",
        "Parodi komposit.",
      ],
      [
        "🏠",
        "Pak Titip-Kartu Dalam Negeri",
        "Arketipe pengelola pusat-daerah yang dapat mengubah konflik lokal menjadi tabel koordinasi.",
        "Parodi portofolio.",
      ],
      [
        "📵",
        "Mbak Mute-Ya Hafalan",
        "Arketipe menteri digital yang harus menjelaskan kebebasan berekspresi sambil notifikasi platform terus berbunyi.",
        "Parodi portofolio.",
      ],
      [
        "🏛️",
        "Pak Fadli Zoom-Out",
        "Arketipe menteri kebudayaan yang mengkurasi memori nasional sampai sejarah meminta hak jawab.",
        "Parodi komposit.",
      ],
      [
        "🛣️",
        "Pak Agus Harus Yakin Infrastruktur",
        "Arketipe koordinator proyek besar: semua jalan menuju target, walau catatan kaki tertinggal di rest area.",
        "Parodi portofolio.",
      ],
      [
        "⚽",
        "Pak E-Rick Tohired",
        "Arketipe menteri yang percaya setiap problem dapat diberi target, liga, KPI, dan jersey baru.",
        "Parodi portofolio.",
      ],
      [
        "📈",
        "Pak ROI-san Rugi-Selalu",
        "Arketipe menteri investasi: setiap pulau adalah peluang, setiap peluang membutuhkan presentasi.",
        "Parodi portofolio.",
      ],
      [
        "🗺️",
        "Pak Nus-Ruwet Wahid",
        "Arketipe menteri tanah dan tata ruang yang hidup di antara sertifikat, konsesi, dan garis peta.",
        "Parodi portofolio.",
      ],
      [
        "🌲",
        "Raja Juli Kanopi",
        "Arketipe menteri kehutanan yang harus menyeimbangkan pohon, izin, dan foto menanam bibit.",
        "Parodi portofolio.",
      ],
      [
        "🌾",
        "Pak Amran Panen Presentasi",
        "Arketipe menteri pertanian yang panennya selalu siap lebih dahulu di slide.",
        "Parodi portofolio.",
      ],
      [
        "🩺",
        "Pak Budi Guna-Sehat Sekali",
        "Arketipe menteri kesehatan dengan dashboard, transformasi, dan warga yang tetap antre.",
        "Parodi portofolio.",
      ],
      [
        "📚",
        "Pak Abdul Mutu",
        "Arketipe menteri pendidikan dasar: kurikulum berganti nama, guru tetap mencari toner.",
        "Parodi portofolio.",
      ],
      [
        "🤖",
        "Prof. Brain Yuli-AI",
        "Arketipe menteri sains ketika kampus diminta inovatif, efisien, global, dan tetap hemat listrik.",
        "Parodi portofolio.",
      ],
      [
        "🏘️",
        "Pak Arah Seribu Rumah",
        "Arketipe menteri perumahan yang menghitung rumah dalam juta sementara warga menghitung cicilan per bulan.",
        "Parodi portofolio.",
      ],
      [
        "🎸",
        "Pak Giring Ganjel",
        "Arketipe seniman-politisi yang membawa panggung ke birokrasi dan birokrasi ke panggung.",
        "Parodi jabatan publik.",
      ],
      [
        "🎙️",
        "Om Dedek Cor-Buzzer",
        "Arketipe komunikator pertahanan dengan mikrofon, otot, dan disclaimer bahwa ia bukan buzzer hanya karena namanya lucu.",
        "Parodi; tidak menyatakan operasi buzzer.",
      ],
      [
        "✨",
        "Mas Rapi Amat Utusan Serba Khusus",
        "Arketipe selebritas-utusan yang selalu punya kamera, optimisme, dan kursi depan.",
        "Parodi; dukungan politik bukan bukti buzzer.",
      ],
    ],
    activist: [
      [
        "⚖️",
        "Prof. Ferry Ambyar-Sari",
        "Arketipe ahli hukum tata negara yang membuat pasal terdengar seperti alarm kebakaran.",
        "Terinspirasi keahlian publik Feri Amsari.",
      ],
      [
        "📚",
        "Bu Bibitri Susah-Tidur",
        "Arketipe reformis hukum yang tidak dapat tidur selama naskah undang-undang masih berubah setelah rapat.",
        "Terinspirasi keahlian publik Bivitri Susanti.",
      ],
      [
        "🔎",
        "Prof. Uceng Monitor",
        "Arketipe akademisi antikorupsi yang dapat menemukan konflik kepentingan dari radius tiga slide.",
        "Terinspirasi keahlian publik Zainal Arifin Mochtar.",
      ],
      [
        "🎥",
        "Bang Dandy Lensa-Sono",
        "Arketipe dokumenteris yang membuat kekuasaan menonton kredit akhir dengan gelisah.",
        "Terinspirasi tradisi Watchdoc.",
      ],
      [
        "📱",
        "Ferry Ir-Why-Nih",
        "Arketipe aktivis-influencer: rasionalisme, video panjang, fundraising, dan reach yang membuat organisasi lama belajar thumbnail.",
        "Terinspirasi aktivisme digital Ferry Irwandi.",
      ],
      [
        "🧮",
        "Jerom Poling Data",
        "Arketipe influencer angka yang mencoba memasukkan tuntutan rakyat ke spreadsheet tanpa kehilangan kemarahan.",
        "Terinspirasi keterlibatan figur publik dalam 17+8.",
      ],
      [
        "📢",
        "Andovi da Toa-Speaker",
        "Arketipe kreator yang mengubah keresahan menjadi seruan, tenggat, dan video yang tidak sempat disetujui humas.",
        "Terinspirasi keterlibatan figur publik dalam 17+8.",
      ],
      [
        "🧠",
        "Abigail Literasia",
        "Arketipe pendidik publik yang mengubah dokumen rumit menjadi carousel tanpa mengubahnya menjadi propaganda.",
        "Terinspirasi kerja literasi publik.",
      ],
      [
        "🌊",
        "Salsa Er-Winner Gelombang",
        "Arketipe suara diaspora yang masuk timeline nasional dengan volume debat internasional.",
        "Terinspirasi keterlibatan figur publik dalam 17+8.",
      ],
      [
        "🎧",
        "Fathia Isi-Data",
        "Arketipe musisi-kreator yang dapat mengubah keresahan generasi menjadi pesan lintas komunitas.",
        "Terinspirasi keterlibatan figur publik dalam 17+8.",
      ],
      [
        "🌱",
        "Andita Filsuf Uta-Mikir",
        "Arketipe analis kebijakan yang selalu bertanya dampak jangka panjang saat timeline hanya punya perhatian 15 detik.",
        "Terinspirasi keterlibatan figur publik dalam 17+8.",
      ],
      [
        "🗣️",
        "Bang Haris Azar-Nalar",
        "Arketipe pembela HAM yang tidak mengenal tombol “pertanyaan terakhir”.",
        "Terinspirasi advokasi HAM.",
      ],
      [
        "🪑",
        "Mbak Nana Kursi Kosong",
        "Arketipe jurnalis publik yang tetap menyediakan kursi ketika narasumber tidak menyediakan jawaban.",
        "Parodi tradisi jurnalisme akuntabilitas.",
      ],
      [
        "🕌",
        "Ustaz Feli-Xi-Auw",
        "Arketipe pendakwah-influencer dengan jutaan audiens, argumen ideologis, dan kemampuan mengubah debat politik menjadi kelas sejarah peradaban.",
        "Parodi figur publik; bukan penilaian atas iman atau tuduhan afiliasi fiktif.",
      ],
      [
        "📈",
        "Raymond Cuan-Check",
        "Arketipe influencer ekonomi yang mengubah APBN, investasi, dan janji kampanye menjadi grafik, valuasi, dan pertanyaan: return-nya ke rakyat kapan?",
        "Parodi kreator ekonomi; tidak menyatakan afiliasi politik tertentu.",
      ],
      [
        "🪨",
        "Rocky Gunung Berisik",
        "Arketipe komentator yang dapat mengubah satu kata menjadi tiga metafora, lima polemik, dan satu studio penuh potongan viral.",
        "Parodi tradisi debat publik.",
      ],
      [
        "🎭",
        "Panji Pra-Guyon",
        "Arketipe komika-politik diaspora yang membawa keresahan republik ke panggung, lalu pulang membawa kolom komentar.",
        "Parodi komposit.",
      ],

      [
        "🧑‍🏫",
        "Guru Gembung-Bul",
        "Arketipe guru-komentator yang masuk dari sejarah, muter lewat pendidikan, lalu pulang membawa dua disclaimer dan satu kata: baraya.",
        "Terinspirasi gaya komentar publik Guru Gembul tentang pendidikan, sejarah, agama, dan isu sosial; bukan pernyataan bahwa semua pandangannya identik dengan karakter ini.",
      ],
      [
        "🧩",
        "Bossman Mardi-Gitu",
        "Arketipe influencer geopolitik-ekonomi yang menghubungkan papan tulis, mata uang, elite global, dan algoritma dalam satu napas panjang.",
        "Parodi komposit atas gaya konten naratif-konspiratif; bukan klaim faktual mengenai teori tertentu.",
      ],
      [
        "💻",
        "Ainun Na-Geek Data Warga",
        "Arketipe teknolog sipil yang percaya dashboard publik seharusnya membantu warga, bukan sekadar membantu presentasi pejabat.",
        "Parodi kerja teknologi kewargaan.",
      ],
    ],
  };
  cast.power.push(
    ["🛠️","Pak Joko Woles","Arketipe mantan presiden yang menjawab badai politik dengan ‘yang penting kerja’ dan mengarahkan pertanyaan ke pihak terkait.","Parodi komposit atas gaya komunikasi publik; bukan kutipan literal."],
    ["🌐","Menlu Sunyi Gono-Gini","Arketipe menteri luar negeri hemat kata yang harus menjelaskan bebas aktif, BRICS, ASEAN, dan hasil lawatan dalam satu caption resmi.","Parodi jabatan dan gaya komunikasi, bukan tuduhan pribadi."],
    ["🎓","Mas Samsul Raka Buming-Buming","Arketipe wakil presiden muda yang membawa warisan putusan konstitusi, kampanye digital, dan arsip forum lama ke ruang kekuasaan.","Parodi komposit; kepemilikan akun anonim tidak ditetapkan sebagai fakta."],
    ["🍱","Pak Hasbun Naskah Basi","Arketipe konsultan politik dan kepala komunikasi yang bisa membuat satu respons spontan membutuhkan tiga konferensi pers lanjutan.","Terinspirasi jabatan dan kontroversi komunikasi publik Hasan Nasbi; karakter, dialog, serta ability sepenuhnya fiksi satir."],
    ["🚨","Dr. Ultima Waspadaban","Arketipe peneliti konflik-keamanan yang membawa field note, threat assessment, dan aura ‘tolong cek sumber sebelum panik’.","Terinspirasi profil publik Ulta Levenia Nababan sebagai peneliti terorisme; tidak menyatakan afiliasi atau tindakan fiktif sebagai fakta."],
    ["👍","Abu Jempol Nusantara","Arketipe petarung media sosial nasionalis yang selalu tiba sebelum konteks dan pulang setelah kolom komentar terkunci.","Parodi-komposit atas persona aktivis media sosial; bukan pernyataan bahwa semua aktivitasnya terkoordinasi atau berbayar."]
  );
  cast.activist.push(
    ["🧭","Om Diplo Peta Dunia","Arketipe diplomat-kritikus yang selalu bertanya strategic payoff setelah foto karpet merah selesai diunggah.","Parodi komposit atas debat kebijakan luar negeri."],
    ["🔍","Roy Sur-Yoyo","Arketipe komentator forensik digital yang menyukai zoom, metadata, dan konferensi pers panjang.","Kontroversi ijazah tetap dibedakan antara tudingan, bantahan, dan hasil pemeriksaan resmi."],
    ["🩺","dr. Tifa-Tifi","Arketipe influencer-oposisi yang menghubungkan dokumen, kesehatan politik, dan kecurigaan publik dalam thread panjang.","Parodi komposit; bukan pengesahan atas klaim yang belum terbukti."],
    ["🗺️","Prof. Konni BaksLaah","Arketipe pengamat pertahanan yang datang membawa peta besar, kronologi panjang, dan kritik kebijakan yang langsung mengubah studio menjadi ruang situasi.","Parodi-komposit atas persona publik Connie Rahakundini Bakrie. Klaim, bantahan, dan adegan di dalam game tetap dipisahkan dari fakta yang terverifikasi."],
    ["📣","Mas Tiyo Toa","Tokoh aktivis mahasiswa dalam game yang menghubungkan orasi, logistik lapangan, dokumentasi, dan konsolidasi antarkampus.","Representasi parodi-komposit berdasarkan tokoh yang dirujuk pembuat game; game tidak mengarang jabatan atau riwayat organisasi sebagai fakta."],
    ["📝","Fatima Footnote","Tokoh aktivis mahasiswa dalam game yang menjaga agar slogan, data, dan tuntutan tetap nyambung setelah aksi selesai.","Representasi parodi-komposit berdasarkan tokoh yang dirujuk pembuat game; game tidak mengarang jabatan atau riwayat organisasi sebagai fakta."]
  );

  sources.connie = [
    ["Polemik klaim pertahanan pada Pemilu 2024","Pada Februari 2024, pernyataan Connie Rahakundini Bakrie tentang Prabowo, durasi pemerintahan, dan pengadaan Mirage diperdebatkan di ruang publik serta dibantah oleh Ulta Levenia Nababan. Game ini menampilkan polemiknya sebagai debat klaim, sumber, dan insentif media—bukan menetapkan satu potongan video sebagai kebenaran final.","https://rmol.id/politik/read/2024/02/14/609364/pengamat-terorisme-ulta-levenia-pernyataan-connie-tidak-cerminkan-seorang-akademisi"],
    ["Karakter parodi-komposit","Prof. Konni BaksLaah adalah karakter fiksi satir yang mengambil inspirasi umum dari persona analis pertahanan di ruang publik. Dialog, ability, serta interaksinya dengan tokoh lain bukan rekonstruksi peristiwa nyata.","https://rmol.id/politik/read/2024/02/14/609364/pengamat-terorisme-ulta-levenia-pernyataan-connie-tidak-cerminkan-seorang-akademisi"]
  ];
  sources.ulta = [
    ["Pernyataan publik Ulta Levenia pada Pemilu 2024","Pada Februari 2024, Ulta Levenia Nababan dikutip mengkritik klaim Connie Bakrie mengenai Prabowo, durasi pemerintahan, dan pengadaan Mirage; ia menekankan verifikasi sumber serta menilai tudingan belum berdasar.","https://rmol.id/politik/read/2024/02/14/609364/pengamat-terorisme-ulta-levenia-pernyataan-connie-tidak-cerminkan-seorang-akademisi"],
    ["Profil peneliti keamanan","Ulta dikenal sebagai peneliti terorisme dan konflik. Adegan panel, interaksi dengan Abu Jempol, serta seluruh dialog di dalam game adalah komposit fiksi satir.","https://www.ebatak.com/informasi/berita/profil-ulta-levenia-nababan"]
  ];
  sources.communication = [
    ["Intimidasi terhadap jurnalis Tempo","Pada Maret 2025, jurnalis Tempo menerima paket kepala babi dan kemudian kantor Tempo menerima bangkai tikus. Organisasi pers mengecamnya sebagai intimidasi serius.","https://www.theguardian.com/world/2025/mar/28/intimidation-journalists-indonesia-pig-heads-rats"],
    ["Respons komunikasi yang dikritik","Hasan Nasbi sempat merespons enteng dengan menyarankan paket itu dimasak, lalu mengklarifikasi komitmen pemerintah pada kebebasan pers. Presiden Prabowo menyebut respons awal itu salah dan ceroboh.","https://www.theguardian.com/world/2025/mar/28/intimidation-journalists-indonesia-pig-heads-rats"]
  ];

  const specialEvents = [
    {
      id: "dirty-vote",
      phase: 0,
      after: 2,
      icon: "🎬",
      title: "Dokumenter Turun, Server Naik",
      actor: "Bang Dandy Lensa-Sono & trio pakar konstitusi",
      text: "Dokumenter politik meledak menjelang pencoblosan. Narasi Bersama Konsultan meminta semua admin menonton hanya bagian thumbnail agar respons tetap spontan.",
      fact: "Film Dirty Vote menghadirkan Bivitri Susanti, Feri Amsari, dan Zainal Arifin Mochtar serta disutradarai Dandhy Dwi Laksono.",
      sourceKey: "dirtyvote",
      choices: {
        buzzer: [
          [
            "Serang pembuat film",
            "Alihkan isi dokumenter menjadi debat motif dan afiliasi.",
            {
              reach: 9,
              credibility: -6,
              integrity: -8,
              democracy: -6,
              heat: 13,
              money: -18000000,
            },
            "“Belum jawab datanya, Bang.”",
          ],
          [
            "Baca bukti lalu jawab",
            "Akui bagian yang dapat diverifikasi dan bantah yang lemah.",
            {
              reach: 2,
              credibility: 10,
              integrity: 8,
              democracy: 7,
              heat: -7,
              money: -7000000,
            },
            "“Lho, humasnya membaca dokumen?”",
          ],
        ],
        aktivis: [
          [
            "Potong jadi klip viral",
            "Reach naik, tetapi risiko konteks hilang ikut naik.",
            {
              reach: 11,
              credibility: -2,
              integrity: -2,
              democracy: 0,
              heat: 9,
              money: -5000000,
            },
            "“Klipnya kuat, full filmnya mana?”",
          ],
          [
            "Buat panduan bukti",
            "Pisahkan klaim, dokumen, metode, dan ruang kritik.",
            {
              reach: 4,
              credibility: 11,
              integrity: 8,
              democracy: 8,
              heat: -5,
              money: -9000000,
            },
            "“Akhirnya ada indeks dokumennya.”",
          ],
        ],
      },
    },
    {
      id: "bansos-calendar",
      phase: 0,
      after: 1,
      icon: "🎁",
      title: "Kalender Netral Datang Bersama Beras",
      actor: "Bu Ketua RT Netral & Mas Samsul Raka Buming-Buming",
      text: "Bantuan sosial tiba bersama kalender, stiker, kamera, dan penjelasan bahwa seluruh elemen visual hanyalah kebetulan administrasi.",
      fact: "Pemanfaatan program sosial dalam konteks elektoral perlu diuji melalui aturan, distribusi, transparansi, dan penggunaan fasilitas negara.",
      sourceKey: "election",
      choices: {
        buzzer: [
          [
            "Naikkan branding",
            "Pastikan setiap karung punya sudut kamera terbaik.",
            {
              reach: 10,
              credibility: -4,
              integrity: -7,
              democracy: -5,
              heat: 8,
              money: -30000000,
            },
            "“Berasnya habis, kalendernya lima tahun.”",
          ],
          [
            "Pisahkan program dan kampanye",
            "Hapus materi kandidat dan buka data penerima.",
            {
              reach: -2,
              credibility: 9,
              integrity: 10,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Baru kali ini bantuan tidak minta selfie.”",
          ],
        ],
        aktivis: [
          [
            "Tuduh semua penerima dibeli",
            "Cepat marah, tetapi merendahkan agensi politik warga miskin.",
            {
              reach: 8,
              credibility: -7,
              integrity: -8,
              democracy: -4,
              heat: 13,
              money: -2000000,
            },
            "“Kami butuh bantuan, bukan dihina.”",
          ],
          [
            "Audit distribusi",
            "Bandingkan jadwal, penerima, materi visual, dan aturan.",
            {
              reach: 3,
              credibility: 10,
              integrity: 8,
              democracy: 7,
              heat: -4,
              money: -8000000,
            },
            "“Ini baru kritik yang bisa ditindaklanjuti.”",
          ],
        ],
      },
    },
    {
      id: "one-round",
      phase: 0,
      after: 3,
      icon: "🗳️",
      title: "Satu Putaran, Seribu Invoice",
      actor: "Pak Jenderal Gemoyono",
      text: "Hasil cepat diumumkan. Ruang perang berubah menjadi ruang pembagian kredit. Semua pihak mengaku paling berjasa, termasuk akun yang salah mengetik nama paslon selama kampanye.",
      fact: "Quick count adalah estimasi berbasis sampel; hasil resmi tetap ditetapkan penyelenggara pemilu.",
      sourceKey: "election",
      choices: {
        buzzer: [
          [
            "Klaim mandat total",
            "Anggap kemenangan elektoral sebagai izin untuk semua kebijakan.",
            {
              reach: 12,
              credibility: -3,
              integrity: -7,
              democracy: -7,
              heat: 10,
              money: 90000000,
            },
            "“Menang pemilu bukan menang semua argumen.”",
          ],
          [
            "Tutup kampanye, buka akuntabilitas",
            "Ubah pesan kemenangan menjadi janji keterbukaan.",
            {
              reach: 3,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: 35000000,
            },
            "“Screenshot janji ini kami simpan.”",
          ],
        ],
        aktivis: [
          [
            "Sebut semua pemilih bodoh",
            "Viral di bubble sendiri, hancur di luar bubble.",
            {
              reach: 10,
              credibility: -10,
              integrity: -10,
              democracy: -7,
              heat: 15,
              money: 0,
            },
            "“Terima kasih sudah menghina 96 juta orang.”",
          ],
          [
            "Bangun oposisi berbasis isu",
            "Terima hasil, awasi kebijakan, dan jaga ruang koreksi.",
            {
              reach: 3,
              credibility: 11,
              integrity: 10,
              democracy: 10,
              heat: -5,
              money: 6000000,
            },
            "“Kalah pemilu bukan pensiun sebagai warga.”",
          ],
        ],
      },
    },
    {
      id: "fufufafa-archive",
      phase: 0,
      after: 8,
      icon: "👻",
      title: "Akun Lama, Koalisi Baru",
      actor: "@fufufafa • cache forum yang menolak pensiun",
      text: "Netizen menggali akun Kaskus lama berisi hinaan kasar terhadap Pak Jenderal Gemoyono dan komentar seksual terhadap selebritas. Akun itu ramai dikaitkan dengan Mas Samsul Raka Buming-Buming, tetapi identitas pemiliknya belum terbukti final. War room mendadak menemukan prinsip baru: jejak digital harus dilupakan, kecuali jejak digital lawan.",
      fact: "Kontroversi fufufafa ramai pada 2024. Jejak unggahannya terdokumentasi, tetapi klaim bahwa akun tersebut milik Gibran tetap diperdebatkan dan belum memiliki pembuktian langsung yang disepakati.",
      sourceKey: "fufufafa",
      choices: {
        buzzer: [
          [
            "Kubur dengan isu baru",
            "Naikkan tiga tagar lain sampai orang lupa akun forum itu pernah punya histori.",
            { reach: 10, credibility: -4, integrity: -6, democracy: -4, heat: 9, money: -24000000 },
            "Timeline pindah isu. Cache browser nggak ikut pindah.",
            { fufuMode: "buried" },
          ],
          [
            "Bilang: identitasnya belum terbukti",
            "Pisahkan isi unggahan yang bermasalah dari klaim siapa pemiliknya.",
            { reach: 2, credibility: 9, integrity: 8, democracy: 6, heat: -4, money: -8000000 },
            "Untuk sekali ini, ketidakpastian dipakai sebagai ketelitian, bukan kabut.",
            { fufuMode: "verified" },
          ],
          [
            "Pakai arsipnya buat tekan koalisi",
            "Simpan screenshot sebagai kartu tawar internal. Publik cuma kebagian teaser.",
            { reach: 7, money: 85000000, credibility: -7, integrity: -12, democracy: -6, heat: 12 },
            "Koalisi tetap mesra. Folder ZIP mendapat kursi di meja negosiasi.",
            { fufuMode: "weaponized" },
          ],
        ],
        aktivis: [
          [
            "Arsipkan, tapi jangan kunci identitas",
            "Verifikasi unggahan, waktu, dan pola tanpa mengubah dugaan menjadi vonis.",
            { reach: 4, credibility: 11, integrity: 10, democracy: 9, heat: -4, money: -7000000 },
            "Thread-nya nggak seviral tuduhan, tapi masih bisa dibaca setelah panik reda.",
            { fufuMode: "verified" },
          ],
          [
            "Cap pemiliknya, gas meme",
            "Plot twist menang. Standar bukti kehilangan sinyal.",
            { reach: 14, credibility: -9, integrity: -8, democracy: -5, heat: 16, money: -3000000 },
            "Memenya terbang. Kata ‘diduga’ jatuh di parkiran.",
            { fufuMode: "weaponized" },
          ],
          [
            "Bahas misogini dan hinaannya, bukan doxing",
            "Fokus pada pola bahasa diskriminatif dan akuntabilitas digital tanpa menyebarkan data pribadi.",
            { reach: 6, credibility: 10, integrity: 12, democracy: 10, heat: 1, money: -9000000 },
            "Identitas masih diperdebatkan. Standar perilakunya nggak perlu ikut kabur.",
            { fufuMode: "principled" },
          ],
        ],
      },
    },
    {
      id: "cabinet-109",
      phase: 0,
      after: 9,
      icon: "🪑",
      title: "Kabinet 109 Kursi, Kursinya Kurang Dua",
      actor: "Mayor Tedi Ketok-Pintu",
      text: "Kabinet terbesar dalam beberapa dekade diperkenalkan. Narasi resminya: semua kekuatan dirangkul. Narasi kantin: siapa yang belum dapat wakil menteri?",
      fact: "Kabinet Merah Putih dilantik dengan 109 anggota, termasuk menteri, wakil menteri, dan kepala lembaga.",
      sourceKey: "publicfigures",
      choices: {
        buzzer: [
          [
            "Jual sebagai superteam",
            "Semakin banyak pemain berarti semakin banyak foto bersama.",
            {
              reach: 9,
              credibility: -2,
              integrity: -3,
              democracy: -2,
              heat: 5,
              money: -35000000,
            },
            "“Superteam atau grup WhatsApp tanpa admin?”",
          ],
          [
            "Publikasikan mandat dan KPI",
            "Buka pembagian kerja, biaya, dan konflik kewenangan.",
            {
              reach: 2,
              credibility: 10,
              integrity: 8,
              democracy: 7,
              heat: -5,
              money: -15000000,
            },
            "“Akhirnya tahu siapa mengerjakan apa.”",
          ],
        ],
        aktivis: [
          [
            "Hitung kursi saja",
            "Mudah dipahami, tetapi belum menguji kinerja.",
            {
              reach: 7,
              credibility: 0,
              integrity: -1,
              democracy: 0,
              heat: 6,
              money: -2000000,
            },
            "“Gemuk iya, tapi analisisnya mana?”",
          ],
          [
            "Audit struktur kabinet",
            "Uji biaya, mandat, tumpang tindih, dan akuntabilitas.",
            {
              reach: 3,
              credibility: 11,
              integrity: 8,
              democracy: 8,
              heat: -4,
              money: -9000000,
            },
            "“Bagan organisasinya lebih seram dari meme.”",
          ],
        ],
      },
    },
    {
      id: "special-envoys",
      phase: 0,
      after: 10,
      icon: "✨",
      title: "Utusan Khusus Bidang Semua yang Viral",
      actor: "Mas Rapi Amat & Om Dedek Cor-Buzzer",
      text: "Selebritas dan komunikator masuk orbit pemerintahan. Timeline segera membelah dunia menjadi dua: semua artis penjilat atau semua kritik iri akses.",
      fact: "Sejumlah figur hiburan dan komunikasi memperoleh jabatan resmi di pemerintahan; jabatan atau dukungan tersebut tidak otomatis membuktikan operasi buzzer.",
      sourceKey: "publicfigures",
      choices: {
        buzzer: [
          [
            "Pakai follower sebagai mandat",
            "Jumlah pengikut dipresentasikan seperti hasil pemilu.",
            {
              reach: 14,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 9,
              money: -50000000,
            },
            "“Aku follow resepnya, bukan kebijakannya.”",
          ],
          [
            "Buka tugas dan hasil kerja",
            "Nilai figur berdasarkan mandat, laporan, dan konflik kepentingan.",
            {
              reach: 2,
              credibility: 9,
              integrity: 8,
              democracy: 6,
              heat: -5,
              money: -12000000,
            },
            "“Ternyata jabatan punya deliverable.”",
          ],
        ],
        aktivis: [
          [
            "Cap semua sebagai buzzer",
            "Sederhana, memuaskan, dan sulit dibuktikan.",
            {
              reach: 10,
              credibility: -8,
              integrity: -8,
              democracy: -5,
              heat: 13,
              money: -1000000,
            },
            "“Jabatan publik boleh dikritik, fitnah jangan.”",
          ],
          [
            "Audit jabatan, bukan fandom",
            "Periksa mandat, anggaran, pelaporan, dan akses.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 7,
              heat: -4,
              money: -6000000,
            },
            "“Kritiknya akhirnya bukan sekadar fanwar.”",
          ],
        ],
      },
    },
    {
      id: "magelang-retreat",
      phase: 0,
      after: 11,
      icon: "🏕️",
      title: "Kabinet Masuk Barak, PowerPoint Keluar Formasi",
      actor: "Pak Jenderal Gemoyono",
      text: "Para menteri mengikuti retret disiplin. Foto seragam dan barisan mendominasi timeline, sementara warga mencari lampiran pembagian kewenangan.",
      fact: "Retret kabinet di Magelang menjadi simbol koordinasi dan disiplin pemerintahan baru, sekaligus memicu diskusi mengenai gaya pemerintahan militeristik.",
      sourceKey: "tni",
      choices: {
        buzzer: [
          [
            "Jadikan montage heroik",
            "Drone, musik mars, dan slow motion menutup pertanyaan kebijakan.",
            {
              reach: 12,
              credibility: -2,
              integrity: -4,
              democracy: -3,
              heat: 7,
              money: -45000000,
            },
            "“Keren, tapi rapatnya menghasilkan apa?”",
          ],
          [
            "Rilis hasil koordinasi",
            "Publikasikan keputusan, tenggat, dan penanggung jawab.",
            {
              reach: 2,
              credibility: 9,
              integrity: 8,
              democracy: 7,
              heat: -4,
              money: -9000000,
            },
            "“Lebih berguna dari video lari pagi.”",
          ],
        ],
        aktivis: [
          [
            "Ejek seragamnya",
            "Meme naik, argumen sipil-militer hilang.",
            {
              reach: 9,
              credibility: -4,
              integrity: -3,
              democracy: -1,
              heat: 9,
              money: -1500000,
            },
            "“Lucu, tapi substansinya?”",
          ],
          [
            "Bahas desain kekuasaan",
            "Uji budaya komando, supremasi sipil, dan koordinasi kabinet.",
            {
              reach: 3,
              credibility: 10,
              integrity: 8,
              democracy: 9,
              heat: -4,
              money: -7000000,
            },
            "“Nah, ini pertanyaan institusional.”",
          ],
        ],
      },
    },
    {
      id: "psn-aparat",
      phase: 1,
      after: 1,
      icon: "🗺️",
      title: "PSN Masuk, Warga Keluar dari Peta",
      actor:
        "Pak Agus Harus Yakin Infrastruktur & Jenderal Syaf-Ribet Semua Urusan",
      text: "Proyek strategis datang membawa target pertumbuhan, peta konsesi, aparat pengamanan, dan rapat konsultasi yang kursinya sudah diberi nama sebelum warga tiba.",
      fact: "Dalam catatan 100 harinya, YLBHI mengkritik intensifikasi PSN dan keterlibatan aparat pertahanan-keamanan dalam pembebasan lahan serta pengamanan proyek.",
      sourceKey: "hundreddays",
      choices: {
        buzzer: [
          [
            "Sebut semua penolak anti-pembangunan",
            "Ubah konflik hak, tanah, dan prosedur menjadi tes nasionalisme.",
            {
              reach: 10,
              credibility: -7,
              integrity: -9,
              democracy: -8,
              heat: 14,
              money: -28000000,
            },
            "“Kami tidak menolak jalan; kami menolak digusur tanpa didengar.”",
          ],
          [
            "Buka peta dampak dan mekanisme keberatan",
            "Publikasikan lahan, kompensasi, konsultasi, aparat yang terlibat, dan jalur pengaduan.",
            {
              reach: 2,
              credibility: 12,
              integrity: 11,
              democracy: 10,
              heat: -8,
              money: -19000000,
            },
            "“Untuk sekali ini, peta tidak menghapus manusianya.”",
          ],
        ],
        aktivis: [
          [
            "Romantisasi semua penolakan",
            "Anggap setiap konflik identik dan semua aktor lokal otomatis satu suara.",
            {
              reach: 8,
              credibility: -5,
              integrity: -5,
              democracy: -2,
              heat: 10,
              money: -4000000,
            },
            "“Datanglah, dengar warga yang berbeda-beda.”",
          ],
          [
            "Bangun arsip konflik lahan",
            "Petakan keputusan, konsultasi, dampak ekologis, kompensasi, dan penggunaan aparat.",
            {
              reach: 5,
              credibility: 12,
              integrity: 11,
              democracy: 11,
              heat: -4,
              money: -15000000,
            },
            "“Sekarang konflik punya kronologi, bukan cuma poster.”",
          ],
        ],
      },
    },
    {
      id: "ylbhi-100",
      phase: 1,
      after: 1,
      icon: "📋",
      title: "Catatan 100 Hari: Lima Alarm Menyala",
      actor: "YLBHI vs Ruang Klarifikasi",
      text: "Catatan 100 hari menyoroti PSN dan mobilisasi aparat, beban kabinet dan program prioritas, penempatan figur militer, kebijakan pajak-antikorupsi, serta penyelesaian pelanggaran HAM masa lalu. Narasi Bersama Konsultan meminta ringkasan satu emoji.",
      fact: "YLBHI menerbitkan lima kelompok kritik terhadap 100 hari pemerintahan Prabowo pada 20 Januari 2025.",
      sourceKey: "hundreddays",
      choices: {
        buzzer: [
          [
            "Sebut laporan politis",
            "Jawab identitas penerbit, bukan lima kelompok masalahnya.",
            {
              reach: 9,
              credibility: -7,
              integrity: -9,
              democracy: -7,
              heat: 14,
              money: -24000000,
            },
            "“Semua laporan politik. Datanya tetap harus dijawab.”",
          ],
          [
            "Buat matriks tanggapan",
            "Jawab per isu dengan data, kewenangan, koreksi, dan tenggat.",
            {
              reach: 1,
              credibility: 12,
              integrity: 10,
              democracy: 9,
              heat: -8,
              money: -16000000,
            },
            "“Kami simpan tabel janjinya.”",
          ],
        ],
        aktivis: [
          [
            "Jadikan vonis final",
            "Anggap laporan cukup membuktikan seluruh niat dan hasil rezim.",
            {
              reach: 9,
              credibility: -5,
              integrity: -5,
              democracy: -2,
              heat: 11,
              money: -3000000,
            },
            "“Kritik kuat tidak butuh klaim berlebihan.”",
          ],
          [
            "Turunkan jadi agenda audit",
            "Pecah lima isu menjadi dokumen, saksi, indikator, dan tuntutan.",
            {
              reach: 4,
              credibility: 12,
              integrity: 10,
              democracy: 10,
              heat: -6,
              money: -11000000,
            },
            "“Sekarang kami tahu apa yang harus dipantau.”",
          ],
        ],
      },
    },
    {
      id: "ppn-ampunan",
      phase: 1,
      after: 2,
      icon: "🧾",
      title: "PPN Naik, Ampunan Turun dari Langit",
      actor:
        "Pak Purba-Yey versi prototipe & Pak Yus-Ribet Pasal Berjalan",
      text: "Pajak konsumsi dibahas dengan kalkulator, pengecualian, klarifikasi, dan kalimat “hanya barang mewah”. Di meja sebelah, wacana pengampunan koruptor meminta rakyat percaya bahwa kerugian negara bisa sembuh lewat konferensi pers.",
      fact: "YLBHI mengkritik kebijakan kenaikan PPN, ketidakpastian hukumnya, serta wacana pengampunan koruptor dan pelemahan pejuang antikorupsi dalam catatan 100 hari.",
      sourceKey: "hundreddays",
      choices: {
        buzzer: [
          [
            "Bikin infografik tanpa catatan kaki",
            "Pilih satu contoh harga stabil dan nyatakan seluruh keresahan selesai.",
            {
              reach: 10,
              credibility: -6,
              integrity: -8,
              democracy: -5,
              heat: 11,
              money: -22000000,
            },
            "“Barangku tidak ada di infografik, tapi ada di struk.”",
          ],
          [
            "Jelaskan basis hukum dan dampak distribusi",
            "Buka barang terdampak, pengecualian, proyeksi penerimaan, serta alasan kebijakan.",
            {
              reach: 2,
              credibility: 11,
              integrity: 10,
              democracy: 8,
              heat: -7,
              money: -13000000,
            },
            "“Masih tidak setuju, tapi sekarang bisa berdebat dengan angka.”",
          ],
        ],
        aktivis: [
          [
            "Samakan semua pajak dengan perampokan",
            "Mudah viral, tetapi menghapus pertanyaan siapa membayar dan siapa menikmati.",
            {
              reach: 10,
              credibility: -7,
              integrity: -7,
              democracy: -3,
              heat: 13,
              money: -3000000,
            },
            "“Pajak perlu dikritik, negara juga tetap perlu dibiayai.”",
          ],
          [
            "Audit beban dan perlakuan khusus",
            "Bandingkan beban rumah tangga, insentif korporasi, tax expenditure, dan penegakan antikorupsi.",
            {
              reach: 4,
              credibility: 12,
              integrity: 10,
              democracy: 10,
              heat: -5,
              money: -12000000,
            },
            "“Nah, sekarang terlihat siapa yang paling banyak berkorban.”",
          ],
        ],
      },
    },
    {
      id: "indonesia-gelap",
      phase: 1,
      after: 2,
      icon: "⬛",
      title: "Indonesia Gelap Menyalakan Timeline",
      actor: "BEM, mahasiswa, dan warga",
      text: "Pemotongan anggaran, pendidikan, MBG, gas melon, dan peran militer bertemu dalam satu tagar. Pemerintah mengatakan efisiensi; mahasiswa mendengar masa depan dipangkas.",
      fact: "Pada Februari 2025, demonstrasi Indonesia Gelap berlangsung di berbagai kota menentang pemotongan anggaran dan kebijakan pemerintah.",
      sourceKey: "darkprotests",
      choices: {
        buzzer: [
          [
            "Hijack tagar dengan optimisme",
            "Naikkan #IndonesiaCerah menggunakan template yang sama di 800 akun.",
            {
              reach: 13,
              credibility: -7,
              integrity: -9,
              democracy: -6,
              heat: 15,
              money: -60000000,
            },
            "“Kenapa semua akun mengetik typo yang sama?”",
          ],
          [
            "Buka rincian efisiensi",
            "Tunjukkan pos yang dipotong, dilindungi, dan mekanisme keluhan.",
            {
              reach: 3,
              credibility: 11,
              integrity: 9,
              democracy: 8,
              heat: -8,
              money: -17000000,
            },
            "“Angkanya masih bisa diperdebatkan, setidaknya ada angka.”",
          ],
        ],
        aktivis: [
          [
            "Kejar angka tagar",
            "Semua energi masuk trending, sedikit masuk organisasi.",
            {
              reach: 15,
              credibility: -2,
              integrity: -3,
              democracy: 0,
              heat: 13,
              money: -6000000,
            },
            "“Trending selesai, tindak lanjut siapa?”",
          ],
          [
            "Gabungkan aksi dan policy brief",
            "Jaga mobilisasi sambil membangun tuntutan terukur.",
            {
              reach: 7,
              credibility: 11,
              integrity: 9,
              democracy: 10,
              heat: 1,
              money: -14000000,
            },
            "“Toa dan tabel akhirnya satu panggung.”",
          ],
        ],
      },
    },
    {
      id: "ham-ruang-tunggu",
      phase: 1,
      after: 4,
      icon: "🕯️",
      title: "HAM Masa Lalu Masuk Ruang Tunggu Lagi",
      actor: "Pak Yus-Ribet Pasal Berjalan & Keluarga Korban",
      text: "Pemerintah menawarkan rekonsiliasi, bantuan, dan bahasa administratif. Keluarga korban bertanya pertanyaan lama yang tetap tidak muat dalam formulir: siapa bertanggung jawab dan kapan pengadilan bekerja?",
      fact: "YLBHI menilai terdapat upaya mengubur penyelesaian yudisial pelanggaran HAM berat masa lalu dan mengkritik sejumlah pernyataan serta pendekatan pemerintah dalam 100 hari pertama.",
      sourceKey: "hundreddays",
      choices: {
        buzzer: [
          [
            "Jual bantuan sebagai penutupan kasus",
            "Ubah pemulihan material menjadi pengganti kebenaran dan pertanggungjawaban.",
            {
              reach: 7,
              credibility: -9,
              integrity: -12,
              democracy: -10,
              heat: 12,
              money: -30000000,
            },
            "“Bantuan bukan kuitansi untuk membeli ingatan.”",
          ],
          [
            "Pisahkan pemulihan dari akuntabilitas",
            "Akui hak korban atas bantuan, kebenaran, dokumen, dan proses hukum.",
            {
              reach: 1,
              credibility: 13,
              integrity: 12,
              democracy: 12,
              heat: -8,
              money: -18000000,
            },
            "“Akhirnya negara tidak meminta korban memilih salah satu.”",
          ],
        ],
        aktivis: [
          [
            "Gunakan korban sebagai properti konten",
            "Wajah korban viral, kebutuhan dan persetujuannya tertinggal.",
            {
              reach: 12,
              credibility: -9,
              integrity: -13,
              democracy: -6,
              heat: 14,
              money: -5000000,
            },
            "“Kami bukan footage untuk personal brand.”",
          ],
          [
            "Bangun kerja berpusat pada korban",
            "Ikuti persetujuan korban, jaga arsip, tuntut akses dokumen dan proses yudisial.",
            {
              reach: 4,
              credibility: 13,
              integrity: 13,
              democracy: 12,
              heat: -5,
              money: -14000000,
            },
            "“Gerakan mendengar sebelum memakai mikrofon.”",
          ],
        ],
      },
    },
    {
      id: "insya-allah-komisaris",
      phase: 1,
      after: 5,
      icon: "🪑",
      title: "Insya Allah Komisaris",
      actor: "Pak Wamen Rangkap Tiga & Dewan Pengawas Kehadiran Fleksibel",
      text: "Kabinet butuh koordinasi, BUMN butuh pengawasan, dan satu orang ternyata dianggap cukup punya hari 37 jam. Di grup relawan beredar doa karier baru: kerja keras, jaga loyalitas, insya Allah komisaris.",
      fact: "Rangkap jabatan pejabat eksekutif sebagai komisaris BUMN diperdebatkan sebagai masalah konflik kepentingan, efektivitas pengawasan, dan kepatuhan pada larangan rangkap jabatan. Putusan MK No. 80/PUU-XVII/2019 menegaskan larangan tersebut bagi wakil menteri.",
      sourceKey: "dualroles",
      choices: {
        buzzer: [
          [
            "Bikin tagar #InsyaAllahKomisaris",
            "Ubah rangkap jabatan menjadi aspirasi karier nasional. CV cukup satu halaman: loyal, siap rapat, dan bisa tidur di mobil dinas.",
            { reach: 13, network: 10, integrity: -11, democracy: -7, heat: 12, money: 240000000 },
            "Pak, saya rangkap jemuran sama cucian aja sudah burnout. Ini kok jabatan bisa bundle family pack?",
          ],
          [
            "Akui konflik kepentingannya",
            "Dorong pelepasan jabatan komisaris dan publikasi mandat pengawasan yang jelas.",
            { reach: 2, credibility: 12, integrity: 11, democracy: 9, heat: -5, money: -85000000 },
            "Waduh, ada humas yang berani bilang satu badan cuma punya 24 jam.",
          ],
        ],
        aktivis: [
          [
            "Bikin Peta Kursi Rangkap",
            "Susun jabatan, kewenangan, remunerasi, dan potensi konflik kepentingan dalam satu dashboard.",
            { reach: 8, credibility: 11, integrity: 9, democracy: 8, network: 7, money: -42000000 },
            "Nah ini baru jelas. Kursinya banyak, tulang belakang akuntabilitasnya jangan sampai lipat tiga.",
          ],
          [
            "Cuma bikin meme kursi musik",
            "Viral cepat: musik berhenti, semua orang tetap dapat kursi.",
            { reach: 14, credibility: -3, integrity: -2, democracy: 0, heat: 10, money: -12000000 },
            "Memenya lucu, tapi daftar nama dan dasar hukumnya mana, Min?",
          ],
        ],
      },
    },
    {
      id: "mbg-faktur",
      phase: 1,
      after: 6,
      icon: "🍱",
      title: "Janji Bertemu Faktur Dapur",
      actor: "Pak Jenderal Gemoyono & Badan Gizi Nasional versi timeline",
      text: "Program makan bergizi membesar cepat. Dapur, pemasok, target penerima, keamanan pangan, dan biaya diminta berlari dengan sepatu yang belum tiba.",
      fact: "MBG menjadi program prioritas besar dan terus diperdebatkan dari sisi anggaran, target, tata kelola, serta evaluasi pelaksanaan.",
      sourceKey: "mbg",
      choices: {
        buzzer: [
          [
            "Foto porsi terbaik",
            "Gunakan satu nampan ideal untuk menjawab seluruh masalah sistem.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 8,
              money: -45000000,
            },
            "“Porsinya bagus. Dapurnya diaudit?”",
          ],
          [
            "Publikasikan dashboard dapur",
            "Tampilkan biaya per porsi, insiden, pemasok, dan koreksi.",
            {
              reach: 3,
              credibility: 12,
              integrity: 10,
              democracy: 8,
              heat: -7,
              money: -22000000,
            },
            "“Akhirnya anak tidak jadi dekorasi kebijakan.”",
          ],
        ],
        aktivis: [
          [
            "Sebut program pasti gagal",
            "Tujuan gizi ikut dilempar bersama kritik tata kelola.",
            {
              reach: 8,
              credibility: -7,
              integrity: -6,
              democracy: -3,
              heat: 11,
              money: -2500000,
            },
            "“Kritik pelaksanaan bukan menolak anak makan.”",
          ],
          [
            "Audit tanpa menolak tujuan",
            "Pisahkan hak gizi dari desain, biaya, dan konflik kepentingan.",
            {
              reach: 5,
              credibility: 12,
              integrity: 11,
              democracy: 9,
              heat: -5,
              money: -10000000,
            },
            "“Ini kritik yang susah dibantah dengan foto anak.”",
          ],
        ],
      },
    },
    {
      id: "fairmont",
      phase: 1,
      after: 3,
      icon: "🏨",
      title: "Rapat Transparansi Memesan Ballroom Tertutup",
      actor: "Panitia Revisi UU TNI",
      text: "Pembahasan revisi UU TNI muncul di hotel. Aktivis datang, pintu ditutup, dan publik belajar bahwa partisipasi bermakna mungkin tersedia di paket kamar berbeda.",
      fact: "Koalisi masyarakat sipil memprotes rapat panitia revisi UU TNI di Hotel Fairmont pada Maret 2025.",
      sourceKey: "tni",
      choices: {
        buzzer: [
          [
            "Sebut lokasi tidak relevan",
            "Fokus pada karpet hotel agar prosedur tidak dibahas.",
            {
              reach: 7,
              credibility: -7,
              integrity: -8,
              democracy: -8,
              heat: 12,
              money: -20000000,
            },
            "“Lokasinya memang bukan inti; keterbukaannya iya.”",
          ],
          [
            "Buka naskah dan risalah",
            "Publikasikan versi terbaru, peserta, perubahan, dan alasan.",
            {
              reach: 1,
              credibility: 12,
              integrity: 11,
              democracy: 11,
              heat: -8,
              money: -10000000,
            },
            "“Ternyata transparansi tidak perlu check-in.”",
          ],
        ],
        aktivis: [
          [
            "Masuk demi footage",
            "Aksi dramatis viral, tetapi keamanan peserta memburuk.",
            {
              reach: 12,
              credibility: -2,
              integrity: 0,
              democracy: 2,
              heat: 15,
              money: -8000000,
            },
            "“Videonya kuat, strategi hukumnya?”",
          ],
          [
            "Gabungkan aksi dan gugatan prosedural",
            "Dokumentasikan penutupan, naskah, dan pelanggaran partisipasi.",
            {
              reach: 6,
              credibility: 12,
              integrity: 10,
              democracy: 11,
              heat: 1,
              money: -15000000,
            },
            "“Bukti proseduralnya rapi sekali.”",
          ],
        ],
      },
    },
    {
      id: "tolak-tni",
      phase: 1,
      after: 3,
      icon: "🪖",
      title: "Tolak UU TNI, Jalanan Jadi Ruang Sidang",
      actor: "Mas Tiyo Toa, mahasiswa, dosen, perempuan, dan masyarakat sipil",
      text: "Mas Tiyo Toa dan jaringan mahasiswa ikut menjaga estafet aksi menolak perluasan peran militer di berbagai kota. Gas air mata, pagar parlemen, dokumentasi korban, dan argumen supremasi sipil berebut ruang serta sinyal internet.",
      fact: "Pada Maret 2025, demonstrasi menolak revisi UU TNI digelar di Jakarta, Yogyakarta, dan daerah lain dengan kekhawatiran pada supremasi sipil.",
      sourceKey: "tni",
      choices: {
        buzzer: [
          [
            "Labeli anti-prajurit",
            "Samakan kritik desain kelembagaan dengan kebencian pada tentara.",
            {
              reach: 11,
              credibility: -8,
              integrity: -10,
              democracy: -10,
              heat: 16,
              money: -35000000,
            },
            "“Kami kritik jabatan sipil, bukan seragam individu.”",
          ],
          [
            "Jawab batas kewenangan",
            "Jelaskan posisi sipil, daftar jabatan, pengawasan, dan exit rule.",
            {
              reach: 2,
              credibility: 11,
              integrity: 10,
              democracy: 10,
              heat: -8,
              money: -15000000,
            },
            "“Masih tidak sepakat, tapi setidaknya jawabannya relevan.”",
          ],
        ],
        aktivis: [
          [
            "Romantisasi bentrokan",
            "Kemarahan naik, keselamatan dan isu utama turun.",
            {
              reach: 12,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 18,
              money: -5000000,
            },
            "“Korban bukan bahan trailer.”",
          ],
          [
            "Jaga disiplin aksi",
            "Dokumentasi kekerasan, bantuan hukum, tuntutan jelas, dan de-eskalasi.",
            {
              reach: 5,
              credibility: 12,
              integrity: 11,
              democracy: 11,
              heat: -3,
              money: -16000000,
            },
            "“Gerakannya marah tanpa kehilangan arah.”",
          ],
        ],
      },
    },
    {
      id: "kabur-aja",
      phase: 1,
      after: 7,
      icon: "✈️",
      title: "Kabur Aja Dulu Jadi Konsultan Karier Nasional",
      actor: "Generasi muda dan algoritma lowongan luar negeri",
      text: "Kecemasan ekonomi dan politik berubah menjadi tutorial visa. Pemerintah menyebut diaspora aset; timeline menyebutnya exit strategy.",
      fact: "Tagar KaburAjaDulu berkembang bersama Indonesia Gelap sebagai ekspresi pesimisme generasi muda mengenai masa depan.",
      sourceKey: "darkprotests",
      choices: {
        buzzer: [
          [
            "Sebut tidak nasionalis",
            "Jawab kecemasan kerja dengan tes cinta tanah air.",
            {
              reach: 9,
              credibility: -8,
              integrity: -9,
              democracy: -5,
              heat: 13,
              money: -18000000,
            },
            "“Cinta negara tidak membayar kontrakan.”",
          ],
          [
            "Tanya alasan dan buka data",
            "Bahas pekerjaan, upah, riset, kebebasan, dan peluang pulang.",
            {
              reach: 3,
              credibility: 11,
              integrity: 9,
              democracy: 7,
              heat: -6,
              money: -9000000,
            },
            "“Akhirnya yang diwawancarai bukan cuma paspor.”",
          ],
        ],
        aktivis: [
          [
            "Glorifikasi pergi",
            "Anggap semua yang tinggal naif dan semua yang pergi bebas.",
            {
              reach: 9,
              credibility: -5,
              integrity: -5,
              democracy: -2,
              heat: 10,
              money: -1000000,
            },
            "“Tidak semua orang punya modal untuk kabur.”",
          ],
          [
            "Bangun jaringan lintas tempat",
            "Ubah diaspora, kampus, pekerja, dan warga lokal menjadi sumber pengetahuan.",
            {
              reach: 6,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -4,
              money: -8000000,
            },
            "“Pergi dan tinggal tidak lagi jadi kompetisi moral.”",
          ],
        ],
      },
    },
    {
      id: "pati",
      phase: 1,
      after: 8,
      icon: "🌾",
      title: "Revolusi Dimulai dari Pati, Pajak Naik 250%",
      actor: "Warga Pati & Bupati Sudewow",
      text: "Kenaikan PBB-P2 memicu protes besar dan tuntutan kepala daerah mundur. Pusat segera menyebutnya urusan lokal sampai timeline nasional ikut marah.",
      fact: "Protes Pati Agustus 2025 dipicu rencana kenaikan PBB-P2 hingga 250 persen dan berkembang menjadi tuntutan politik yang lebih luas.",
      sourceKey: "demonstrations",
      choices: {
        buzzer: [
          [
            "Sebut warga salah paham",
            "Tidak perlu menjelaskan rumus selama nada konferensi pers cukup tegas.",
            {
              reach: 7,
              credibility: -8,
              integrity: -8,
              democracy: -7,
              heat: 14,
              money: -15000000,
            },
            "“Kalau salah paham, kenapa kebijakannya dibatalkan?”",
          ],
          [
            "Buka formula dan koreksi",
            "Publikasikan dasar nilai, dampak, keberatan, dan pembatalan.",
            {
              reach: 2,
              credibility: 11,
              integrity: 10,
              democracy: 9,
              heat: -7,
              money: -7000000,
            },
            "“Transparansi pajak ternyata bukan ilmu gaib.”",
          ],
        ],
        aktivis: [
          [
            "Jadikan semua isu anti-pusat",
            "Narasi sederhana menghapus aktor dan kewenangan lokal.",
            {
              reach: 8,
              credibility: -4,
              integrity: -4,
              democracy: -2,
              heat: 10,
              money: -2500000,
            },
            "“Ini kebijakan daerah, Bro.”",
          ],
          [
            "Hubungkan lokal dan fiskal",
            "Uji transfer pusat, pajak daerah, pelayanan, dan hak keberatan.",
            {
              reach: 4,
              credibility: 11,
              integrity: 9,
              democracy: 9,
              heat: -4,
              money: -7000000,
            },
            "“Kemarahan lokal akhirnya punya peta kebijakan.”",
          ],
        ],
      },
    },
    {
      id: "august-fire",
      phase: 1,
      after: 8,
      icon: "🔥",
      title: "Agustus Membara, Tunjangan DPR Jadi Bensin",
      actor: "Warga, buruh, mahasiswa, dan pengemudi ojol",
      text: "Protes atas tunjangan DPR dan biaya hidup melebar setelah Affan Kurniawan tewas tertabrak kendaraan taktis polisi. Timeline dipenuhi duka, marah, video kekerasan, dan akun yang berlomba paling benar.",
      fact: "Protes nasional Agustus 2025 meluas setelah kematian Affan Kurniawan dan menyoroti tunjangan DPR, biaya hidup, polisi, serta akuntabilitas.",
      sourceKey: "august",
      choices: {
        buzzer: [
          [
            "Fokus pada kerusuhan saja",
            "Hapus sebab, korban, dan tuntutan dari frame.",
            {
              reach: 12,
              credibility: -10,
              integrity: -12,
              democracy: -12,
              heat: 20,
              money: -50000000,
            },
            "“Kerusuhan harus diusut. Kematian Affan juga.”",
          ],
          [
            "Akui korban dan buka investigasi",
            "Pisahkan tindak pidana, hak protes, komando, dan pertanggungjawaban.",
            {
              reach: 3,
              credibility: 13,
              integrity: 12,
              democracy: 12,
              heat: -10,
              money: -25000000,
            },
            "“Belum cukup, tapi tidak lagi menyangkal duka.”",
          ],
        ],
        aktivis: [
          [
            "Sebarkan semua video mentah",
            "Bukti bercampur rumor, identitas korban, dan trauma.",
            {
              reach: 15,
              credibility: -8,
              integrity: -9,
              democracy: -5,
              heat: 20,
              money: -5000000,
            },
            "“Tolong blur wajah dan cek lokasi.”",
          ],
          [
            "Verifikasi dan lindungi korban",
            "Arsipkan waktu, lokasi, saksi, bantuan hukum, dan privasi.",
            {
              reach: 7,
              credibility: 14,
              integrity: 13,
              democracy: 12,
              heat: -2,
              money: -18000000,
            },
            "“Bukti kuat tanpa mengorbankan korban lagi.”",
          ],
        ],
      },
    },
    {
      id: "17plus8",
      phase: 1,
      after: 9,
      icon: "1️⃣",
      title: "17+8: Influencer Assembly Menemukan Dokumen Bersama",
      actor:
        "Jerom Poling Data, Andovi da Toa-Speaker, Abigail Literasia, dan kawan-kawan",
      text: "Ratusan tuntutan dari organisasi sipil dirangkum menjadi 17 tuntutan cepat dan 8 agenda setahun. Aktivis lama khawatir personal brand; warga biasa akhirnya punya daftar yang dapat dibaca.",
      fact: "Tuntutan 17+8 dirumuskan dan disebarkan oleh aktivis, kelompok masyarakat sipil, dan figur publik setelah protes Agustus 2025.",
      sourceKey: "seventeen",
      choices: {
        buzzer: [
          [
            "Serang pembuat daftar",
            "Cari kesalahan satu influencer agar 25 tuntutan ikut hilang.",
            {
              reach: 10,
              credibility: -8,
              integrity: -10,
              democracy: -8,
              heat: 15,
              money: -26000000,
            },
            "“Influencernya boleh dikritik. Tuntutannya tetap ada.”",
          ],
          [
            "Jawab status tiap tuntutan",
            "Beri penanggung jawab, progres, bukti, dan alasan penolakan.",
            {
              reach: 3,
              credibility: 13,
              integrity: 11,
              democracy: 12,
              heat: -8,
              money: -18000000,
            },
            "“Dashboard publik lebih berguna dari konferensi pers.”",
          ],
        ],
        aktivis: [
          [
            "Klaim dokumen milik influencer",
            "Gerakan menjadi fanbase dan organisasi sumber hilang.",
            {
              reach: 12,
              credibility: -6,
              integrity: -9,
              democracy: -5,
              heat: 10,
              money: -3000000,
            },
            "“Tuntutan ini dirangkum dari banyak kelompok.”",
          ],
          [
            "Jaga atribusi dan partisipasi",
            "Tautkan sumber, organisasi, tenggat, dan kanal pembaruan.",
            {
              reach: 8,
              credibility: 13,
              integrity: 12,
              democracy: 13,
              heat: -3,
              money: -10000000,
            },
            "“Viralnya membantu, akarnya tidak dihapus.”",
          ],
        ],
      },
    },
    {
      id: "purbaya",
      phase: 1,
      after: 9,
      icon: "💼",
      title: "Pak Purba-Yey Masuk Dompet Negara",
      actor: "Pak Purba-Yey Dompet Negara",
      text: "Reshuffle membawa menteri keuangan baru setelah gelombang protes. Pasar, publik, dan kabinet meminta tiga hal berbeda: stabilitas, pertumbuhan, dan jangan bilang rakyat kurang piknik.",
      fact: "Purbaya Yudhi Sadewa dilantik sebagai Menteri Keuangan pada September 2025 menggantikan Sri Mulyani.",
      sourceKey: "finance",
      choices: {
        buzzer: [
          [
            "Jual optimisme tanpa catatan kaki",
            "Angka 8% dijadikan stiker motivasi nasional.",
            {
              reach: 10,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 8,
              money: 110000000,
            },
            "“Pertumbuhan dari sektor apa dan untuk siapa?”",
          ],
          [
            "Buka asumsi fiskal",
            "Jelaskan penerimaan, belanja, risiko, distribusi, dan skenario gagal.",
            {
              reach: 2,
              credibility: 12,
              integrity: 10,
              democracy: 9,
              heat: -7,
              money: 55000000,
            },
            "“Tidak semua angka menyenangkan, tapi bisa diperiksa.”",
          ],
        ],
        aktivis: [
          [
            "Potong satu pernyataan",
            "Jadikan satu kalimat sebagai keseluruhan kebijakan ekonomi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -5,
              democracy: -2,
              heat: 11,
              money: -2500000,
            },
            "“Kutipannya buruk, analisis fiskalnya mana?”",
          ],
          [
            "Audit APBN dan distribusi",
            "Bandingkan target, realisasi, kelas sosial, daerah, dan biaya peluang.",
            {
              reach: 5,
              credibility: 13,
              integrity: 11,
              democracy: 10,
              heat: -5,
              money: -9000000,
            },
            "“Anggaran akhirnya dibaca sebagai politik.”",
          ],
        ],
      },
    },
    {
      id: "one-year",
      phase: 1,
      after: 10,
      icon: "1️⃣",
      title: "Satu Tahun Cukup, Masalah Belum Cukup",
      actor: "BEM SI dan jaringan mahasiswa",
      text: "Pada ulang tahun pertama pemerintahan, mahasiswa kembali turun. Istana menggelar rapat kabinet; timeline menggelar sidang rakyat tanpa tombol mute.",
      fact: "Kelompok mahasiswa merencanakan demonstrasi pada satu tahun pemerintahan Prabowo dengan kritik mengenai keterbukaan, partisipasi, MBG, dan kebijakan lain.",
      sourceKey: "demonstrations",
      choices: {
        buzzer: [
          [
            "Rilis rapor sendiri",
            "Semua indikator hijau karena indikator merah tidak dimasukkan.",
            {
              reach: 9,
              credibility: -7,
              integrity: -8,
              democracy: -6,
              heat: 12,
              money: -28000000,
            },
            "“Nilai 100 dari lembaga yang menulis soal sendiri.”",
          ],
          [
            "Bandingkan janji dan hasil",
            "Akui deviasi, data kosong, koreksi, dan target tahun kedua.",
            {
              reach: 2,
              credibility: 13,
              integrity: 11,
              democracy: 10,
              heat: -8,
              money: -14000000,
            },
            "“Rapor yang mengakui remedial lebih dipercaya.”",
          ],
        ],
        aktivis: [
          [
            "Buat ultimatum tanpa organisasi",
            "Tagar keras, struktur tindak lanjut lembek.",
            {
              reach: 12,
              credibility: -3,
              integrity: -4,
              democracy: -1,
              heat: 13,
              money: -4000000,
            },
            "“Besok setelah ultimatum, rapatnya di mana?”",
          ],
          [
            "Bangun evaluasi warga",
            "Kompilasi data, korban, janji, capaian, dan forum daerah.",
            {
              reach: 7,
              credibility: 13,
              integrity: 12,
              democracy: 13,
              heat: -3,
              money: -16000000,
            },
            "“Evaluasinya bisa dipakai kampus lain.”",
          ],
        ],
      },
    },
    {
      id: "indonesia-bankrupt",
      phase: 2,
      after: 6,
      icon: "📉",
      title: "BEM UI: Indonesia Bangkrut",
      actor: "Fatima Footnote, BEM UI, mahasiswa, dan warga yang membuka aplikasi harga",
      text: "Fatima Footnote dan mahasiswa membawa seruan Indonesia Bangkrut sebagai alarm politik, bukan laporan kepailitan. Pak Purba-Yey membawa grafik makro; massa membawa harga pangan, PHK, kurs, biaya kuliah, dan masa depan yang terasa makin mahal.",
      fact: "Event ini memadukan seruan BEM UI yang dirujuk pembuat game dengan konteks demonstrasi mahasiswa 2026 mengenai harga, tekanan ekonomi, belanja negara, dan peran militer.",
      sourceKey: "bankrupt",
      choices: {
        buzzer: [
          [
            "Balas dengan PDB agregat",
            "Satu angka nasional diminta membatalkan seluruh pengalaman rumah tangga.",
            {
              reach: 11,
              credibility: -6,
              integrity: -7,
              democracy: -4,
              heat: 13,
              money: -30000000,
            },
            "“PDB naik, saldo saya tetap turun.”",
          ],
          [
            "Bedakan negara, APBN, dan warga",
            "Jelaskan indikator makro sekaligus daya beli, upah, harga, utang, dan distribusi.",
            {
              reach: 3,
              credibility: 14,
              integrity: 12,
              democracy: 11,
              heat: -9,
              money: -17000000,
            },
            "“Tidak setuju semua, tapi sekarang istilahnya jelas.”",
          ],
        ],
        aktivis: [
          [
            "Pakai bangkrut secara literal",
            "Slogan kuat berubah menjadi klaim ekonomi yang mudah dipatahkan.",
            {
              reach: 14,
              credibility: -8,
              integrity: -6,
              democracy: -2,
              heat: 16,
              money: -5000000,
            },
            "“Negaranya belum insolven; warganya sedang sesak.”",
          ],
          [
            "Jelaskan bangkrut sebagai metafora politik",
            "Hubungkan daya beli, pelayanan, legitimasi, kesempatan, dan distribusi.",
            {
              reach: 9,
              credibility: 14,
              integrity: 12,
              democracy: 12,
              heat: 1,
              money: -12000000,
            },
            "“Slogannya tetap tajam, argumennya tidak rapuh.”",
          ],
        ],
      },
    },
    {
      id: "danantara-audit",
      phase: 3,
      after: 2,
      icon: "🏦",
      title: "RUPS Republik",
      actor: "Pak Danan-Tara Semesta",
      text: "Aset negara dikonsolidasikan dan target investasi diumumkan. Lampiran risiko berukuran lebih kecil daripada slogan sinergi.",
      fact: "Skenario fiksi tentang tata kelola investasi negara.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Jual optimisme tanpa lampiran",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Buka mandat dan risiko",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Viral dengan satu angka besar",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Bangun audit lintas keahlian",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "identity-wave",
      phase: 3,
      after: 5,
      icon: "🕌",
      title: "Dalil Masuk Kalender Politik",
      actor: "Ustaz Feli-Xi-Auw",
      text: "Konten agama dan politik menyatu menjelang pra-kampanye. Setiap kubu merasa memiliki monopoli moral dan algoritma.",
      fact: "Skenario fiksi tentang mobilisasi identitas.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Klaim dukungan umat",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Pisahkan iman dan mandat publik",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Cap semua audiens radikal",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Dialogkan hak dan kebijakan",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "climate-budget",
      phase: 3,
      after: 8,
      icon: "🌊",
      title: "Banjir Memindahkan APBN",
      actor: "Bu Cuaca Ekstrem",
      text: "Bencana besar memaksa realokasi anggaran dan membuka kembali debat tata ruang serta izin usaha.",
      fact: "Skenario fiksi berbasis risiko iklim.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Salahkan cuaca seratus persen",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Buka peta risiko dan izin",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Eksploitasi foto korban",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Organisir bantuan dan audit",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "asset-bill",
      phase: 3,
      after: 10,
      icon: "📜",
      title: "RUU Perampasan Aset Comeback",
      actor: "Pak Naskah Berulang",
      text: "Skandal baru membuat rancangan lama kembali disebut prioritas. Kalender legislasi tetap malu-malu.",
      fact: "Skenario fiksi tentang reformasi antikorupsi.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Umumkan segera tanpa tanggal",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Publikasikan draf dan tahapan",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Anggap semua tersangka bersalah",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Jaga due process dan tekanan publik",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "opposition-platform",
      phase: 3,
      after: 11,
      icon: "🪑",
      title: "Oposisi Menemukan PowerPoint",
      actor: "Pak Oposisi Baru Ingat",
      text: "Partai di luar kabinet menyusun platform alternatif. Slide pertama masih berisi foto ketua umum.",
      fact: "Skenario fiksi tentang konsolidasi oposisi.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Pecah oposisi lewat rumor",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Debatkan kebijakan terbuka",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Jadikan satu tokoh penyelamat",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Bangun agenda lintas organisasi",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "candidate-podcast",
      phase: 4,
      after: 1,
      icon: "🎙️",
      title: "Calon Presiden Dua Jam",
      actor: "Om Kandidat Belum Kandidat",
      text: "Podcast pra-kampanye memecahkan rekor views. Tidak ada yang yakin pertanyaan utamanya sempat dijawab.",
      fact: "Skenario fiksi pra-pemilu.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Potong klip heroik",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Rilis transkrip dan data",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Ratio satu kalimat",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Buat fact-check tematik",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "dynasty-2",
      phase: 4,
      after: 3,
      icon: "👨‍👩‍👦",
      title: "Dinasti 2.0",
      actor: "Mas Nama Belakang",
      text: "Generasi baru elite muncul dengan desain minimalis dan akses maksimal.",
      fact: "Skenario fiksi tentang politik dinasti.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Jual pengalaman sejak lahir",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Buka proses seleksi",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Serang keluarganya saja",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Audit akses dan merit",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "ai-clone",
      phase: 4,
      after: 4,
      icon: "🧬",
      title: "Kandidat Sintetis",
      actor: "Mbak Video Tidak Ada",
      text: "Deepfake kandidat menyebar sebelum kampanye resmi. Klarifikasi punya views sepersepuluh.",
      fact: "Skenario fiksi tentang AI generatif.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Sebarkan versi menguntungkan",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Bangun kanal autentikasi",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Balas dengan deepfake lain",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Koordinasikan verifikasi publik",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "fufufafa-return",
      phase: 4,
      after: 6,
      icon: "💾",
      title: "PLOT TWIST: Cache Lama Ikut Kampanye Lagi",
      actor: "@fufufafa_archive • second account yang jadi third rail koalisi",
      text: () => {
        const mode = state.fufuArchive?.mode || "ignored";
        const memory = {
          verified: "Dulu kamu menyimpan arsip sambil menjaga kata ‘diduga’. Sekarang tim hukum membaca thread-mu lebih dulu daripada tim kampanye.",
          principled: "Dulu kamu memisahkan isu identitas dari misogini dan hinaan. Arsipmu kembali sebagai standar akuntabilitas, bukan bahan doxing.",
          weaponized: "Dulu kamu mengubah dugaan menjadi senjata. Sekarang screenshot baru dan lama saling tembak, sementara standar bukti kabur dari lokasi.",
          buried: "Dulu kamu menenggelamkannya dengan isu baru. Cache lama naik lagi tepat saat koalisi menjual harmoni sebagai produk unggulan.",
          ignored: "Save lama belum punya pilihan soal arsip ini. Timeline tetap bertindak seolah semua orang sudah mengambil posisi sejak 2024.",
        }[mode];
        return `${memory} Akun forum yang pernah menghina calon presiden kini menjadi cermin aneh bagi pasangan kekuasaan yang sama. Identitasnya masih belum terverifikasi final; ironi politiknya keburu punya fanbase.`;
      },
      fact: "Isi unggahan akun fufufafa dan kontroversinya menjadi bagian dari jejak digital publik. Namun hubungan kepemilikan akun dengan Gibran tidak diperlakukan game sebagai fakta yang telah terbukti.",
      sourceKey: "fufufafa",
      choices: {
        buzzer: [
          [
            "Klarifikasi pakai standar bukti",
            "Akui ironi politiknya, jelaskan apa yang diketahui dan apa yang belum bisa dibuktikan.",
            { reach: 3, credibility: 11, integrity: 9, democracy: 7, heat: -7, money: -15000000 },
            "War room akhirnya belajar bahwa ‘belum terbukti’ bukan sinonim ‘nggak boleh dibahas’.",
          ],
          [
            "Rilis screenshot tandingan",
            "Banjiri timeline dengan arsip lawan sampai semua orang lupa pertanyaan awal.",
            { reach: 13, credibility: -8, integrity: -10, democracy: -7, heat: 17, money: -42000000 },
            "Satu akun lama dibalas empat akun lama. Arkeologi digital masuk APBN.",
          ],
          [
            "Diam dan tunggu isu lain",
            "Tidak membantah, tidak menjawab, hanya berharap algoritma punya amnesia.",
            { reach: -2, credibility: -4, integrity: -2, democracy: -2, heat: 5, money: 0 },
            "Timeline pindah sebentar, lalu kembali membawa screenshot resolusi lebih tinggi.",
          ],
        ],
        aktivis: [
          [
            "Audit klaim, arsip, dan standar buktinya",
            "Buat peta mana unggahan asli, mana inferensi, mana spekulasi, dan mana data pribadi yang tidak perlu disebar.",
            { reach: 5, credibility: 13, integrity: 11, democracy: 10, heat: -5, money: -12000000 },
            "Plot twist tetap lucu. Metodologinya akhirnya nggak jadi korban punchline.",
          ],
          [
            "Jadikan meme koalisi paling absurd",
            "Ironinya kuat, konteksnya ditaruh di link yang cuma dibuka 2% penonton.",
            { reach: 15, credibility: -3, integrity: -4, democracy: -2, heat: 14, money: -5000000 },
            "Meme menang semalam. Pertanyaan soal bukti minta jadwal ulang.",
          ],
          [
            "Fokus pada akuntabilitas tanpa doxing",
            "Bahas ucapan diskriminatif, standar pejabat publik, dan etika digital tanpa menjadikan data pribadi sebagai tontonan.",
            { reach: 7, credibility: 11, integrity: 13, democracy: 12, heat: -2, money: -10000000 },
            "Akun anonim tetap anonim. Standar publiknya justru makin terang.",
          ],
        ],
      },
    },
    {
      id: "campaign-money",
      phase: 4,
      after: 10,
      icon: "💳",
      title: "Affiliate Demokrasi",
      actor: "Kak Kode Promo Capres",
      text: "Dana kampanye mengalir lewat kreator, agensi, relawan, dan barter konten yang tidak muat di formulir lama.",
      fact: "Skenario fiksi tentang pembiayaan digital.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Pecah invoice menjadi mikro",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Buka vendor dan natura",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Doxxing semua kreator",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Dorong audit pihak ketiga",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "neutrality-test",
      phase: 4,
      after: 11,
      icon: "🪖",
      title: "Netralitas di Spanduk",
      actor: "Kolonel Tidak Berpolitik",
      text: "Institusi menyatakan netral sementara foto dan kegiatan lapangan memicu pertanyaan.",
      fact: "Skenario fiksi tentang netralitas aparat.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Serang penanya sebagai provokator",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Buka aturan dan investigasi",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Anggap semua seragam pelaku",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Dokumentasikan pola dan kanal aduan",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "many-candidates",
      phase: 5,
      after: 1,
      icon: "🚪",
      title: "Gerbang Kandidat Terbuka",
      actor: "Mbak Gerbang Kandidat",
      text: "Lebih banyak partai menyiapkan pasangan setelah threshold kehilangan daya ikat.",
      fact: "Skenario fiksi berdasarkan perubahan aturan pencalonan.",
      sourceKey: "election2029",
      choices: {
        buzzer: [
          [
            "Klaim kandidat terbanyak pasti demokratis",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Jelaskan konsekuensi sistem",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Tertawakan kandidat kecil",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Bandingkan platform secara setara",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "influencer-panel",
      phase: 5,
      after: 6,
      icon: "📺",
      title: "Ferry vs Felix vs Raymond",
      actor: "Panel Influencer Nasional",
      text: "Aktivis, pendakwah, dan kreator ekonomi menjadi pintu informasi jutaan pemilih.",
      fact: "Skenario fiksi tentang politik influencer.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Beli satu panel penuh",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Wajibkan disclosure",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Fanwar sampai pagi",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Bangun panduan sumber primer",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "election-documentary",
      phase: 5,
      after: 7,
      icon: "🎬",
      title: "Dokumenter Lima Tahun",
      actor: "Bang Dandy Lensa-Sono",
      text: "Film baru merangkum lima tahun kekuasaan. Bantahan disiapkan sebelum kredit pembuka.",
      fact: "Skenario fiksi berbasis tradisi dokumenter politik.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Serang pembuat film",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Jawab bukti per bab",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Potong hanya adegan marah",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Buat indeks dokumen",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "quiet-period",
      phase: 5,
      after: 8,
      icon: "🔇",
      title: "Masa Tenang Berisik",
      actor: "Bot-Setyo Generasi Tiga",
      text: "Iklan resmi berhenti; akun anonim, grup keluarga, dan pesan terjadwal mulai lembur.",
      fact: "Skenario satir tentang pemilu digital setelah batas arsip faktual.",
      sourceKey: "future",
      choices: {
        buzzer: [
          [
            "Aktifkan akun cadangan",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Hormati masa tenang",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Spam bantahan massal",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Arsipkan dan laporkan",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
    {
      id: "open-ballot",
      phase: 5,
      after: 11,
      icon: "🌅",
      title: "Kotak Suara Tidak Menulis Epilog",
      actor: "Republik Timeline",
      text: "Quick count memunculkan banyak kemungkinan dan mungkin putaran kedua. Game menolak memberi pemain satu pemenang yang mudah.",
      fact: "Skenario fiksi dan open ending.",
      sourceKey: "election2029",
      choices: {
        buzzer: [
          [
            "Deklarasikan kemenangan dini",
            "Naikkan distribusi dan tutup ruang pertanyaan sebelum konteks menyusul.",
            {
              reach: 10,
              credibility: -5,
              integrity: -7,
              democracy: -5,
              heat: 11,
              money: -25000000,
            },
            "“Views naik. Jawaban masih dicari.”",
          ],
          [
            "Tunggu hasil dan jaga ketenangan",
            "Publikasikan dasar keputusan, batas kewenangan, dan ruang koreksi.",
            {
              reach: 2,
              credibility: 10,
              integrity: 9,
              democracy: 8,
              heat: -6,
              money: -12000000,
            },
            "“Aneh, transparansi ternyata bisa dipakai.”",
          ],
        ],
        aktivis: [
          [
            "Sebut semua hasil curang",
            "Dorong isu menjadi viral meski bukti dan sasaran kritik belum rapi.",
            {
              reach: 11,
              credibility: -5,
              integrity: -6,
              democracy: -3,
              heat: 12,
              money: -5000000,
            },
            "“Keras, tapi siapa yang harus bertanggung jawab?”",
          ],
          [
            "Pantau tabulasi dan hak pilih",
            "Verifikasi, dokumentasikan, lalu bangun koalisi yang dapat menindaklanjuti.",
            {
              reach: 4,
              credibility: 10,
              integrity: 9,
              democracy: 9,
              heat: -5,
              money: -11000000,
            },
            "“Thread ini punya dokumen dan langkah lanjut.”",
          ],
        ],
      },
    },
  ];
  specialEvents.push(
    {
      id:"threat-level-podcast",
      phase:0,
      after:1,
      icon:"🚨",
      title:"Mirage, Mikrofon, dan Peta yang Nggak Muat Meja",
      actor:"Prof. Konni BaksLaah, Dr. Ultima Waspadaban & Abu Jempol Nusantara",
      text:"Menjelang pemilu, satu klaim pertahanan masuk studio. Prof. Konni BaksLaah bentang peta sampai gelas host pindah meja; Dr. Ultima buka catatan sumber; Abu Jempol buka caps lock dan langsung menuduh remote TV antek asing. Produser senang: thumbnail merah, tiga kubu, iklan aman.",
      fact:"Pada Februari 2024, Ulta Levenia Nababan mengkritik klaim Connie Rahakundini Bakrie mengenai Prabowo, durasi pemerintahan, dan pengadaan Mirage serta menekankan verifikasi sumber. Adegan tiga tokoh di game ini adalah komposit fiksi satir, bukan rekonstruksi panel nyata.",
      sourceKey:"connie",
      choices:{
        buzzer:[
          ["Jadikan threat assessment sebagai konten","Campur analisis keamanan, fanwar, dan patriotisme sampai penonton lupa mana bukti dan mana efek suara.",{reach:11,credibility:-4,integrity:-5,democracy:-3,heat:13,money:-38000000},"“Threat level naik. Kualitas diskusi turun ke basement.”"],
          ["Pisahkan verifikasi dari fanwar","Buka sumber, tandai mana klaim dan bantahan, lalu biarkan analis bicara tanpa pasukan caps lock.",{reach:3,credibility:10,integrity:8,democracy:7,heat:-5,money:-22000000},"“Ternyata keamanan nasional bisa dibahas tanpa emoji sirene setiap kalimat.”"]
        ],
        aktivis:[
          ["Cap semua narasumber sebagai propaganda","Viral cepat, tetapi kritikmu ikut malas membedakan riset, dukungan politik, dan konten.",{reach:10,credibility:-6,integrity:-5,democracy:-2,heat:11,money:-5000000},"“Semua dicap. Nggak ada yang diperiksa.”"],
          ["Audit klaim, sumber, dan insentif panel","Uji pernyataan satu per satu dan jelaskan bahwa gelar, studio, serta follower bukan pengganti bukti.",{reach:4,credibility:11,integrity:9,democracy:8,heat:-3,money:-9000000},"“Boring sedikit, tapi minimal nggak semua orang pulang bawa hoaks baru.”"]
        ]
      }
    },
    {
      id:"clarification-kitchen",
      phase:1,
      after:2,
      icon:"🍱",
      title:"Teror Masuk Redaksi, Jawaban Malah Masuk Dapur",
      actor:"Pak Hasbun Naskah Basi",
      text:"Seorang jurnalis menerima paket teror yang mengerikan. Publik menunggu kecaman tegas; meja komunikasi malah mengeluarkan jawaban enteng, lalu klarifikasi, lalu klarifikasi atas klarifikasi. Negara punya banyak jubir, tapi tombol ‘jangan ngomong dulu’ rupanya belum dianggarkan.",
      fact:"Paket kepala babi dan bangkai tikus yang dikirim kepada Tempo pada Maret 2025 dikecam sebagai intimidasi terhadap pers. Respons awal Hasan Nasbi yang menyarankan paket itu dimasak menuai kritik dan kemudian diklarifikasi.",
      sourceKey:"communication",
      choices:{
        buzzer:[
          ["Bikin klarifikasi jilid tiga","Akui salah ucap setengah hati, tambahkan kalimat ‘dipelintir’, lalu berharap isu kalah cepat dengan agenda presiden berikutnya.",{reach:6,credibility:-5,integrity:-6,democracy:-6,heat:8,money:-42000000},"“Klarifikasinya lengkap. Permintaan maafnya masih buffering.”"],
          ["Kecam teror dan buka langkah perlindungan","Jangan bercanda. Jelaskan penyelidikan, perlindungan jurnalis, dan tenggat tindak lanjut.",{reach:2,credibility:13,integrity:12,democracy:13,heat:-10,money:-30000000},"“Untuk sekali ini, humas memilih manusia sebelum punchline.”"]
        ],
        aktivis:[
          ["Goreng salah ucap tanpa bahas terornya","Nama pejabat trending, korban dan kebebasan pers malah jadi figuran.",{reach:12,credibility:-5,integrity:-6,democracy:-3,heat:12,money:-5000000},"“Menang quote-tweet, kalah menjaga fokus.”"],
          ["Pusatkan korban, bukti, dan kebebasan pers","Dokumentasikan ancaman, tuntut perlindungan, dan gunakan respons pejabat sebagai bukti masalah komunikasi—bukan satu-satunya cerita.",{reach:5,credibility:12,integrity:11,democracy:13,heat:-6,money:-11000000},"“Punchline berhenti. Arsip dan solidaritas lanjut.”"]
        ]
      }
    }
  );

  const engagementProfiles = {
    buzzer: {
      meme: { r: 1.8, l: 2.1, c: 1.2, v: 2.4 },
      patriot: { r: 1.5, l: 1.7, c: 2.0, v: 2.0 },
      data: { r: 0.8, l: 0.8, c: 1.2, v: 1.1 },
      whatabout: { r: 1.1, l: 1.0, c: 2.2, v: 1.5 },
      endorse: { r: 2.2, l: 2.8, c: 1.5, v: 3.1 },
      podcast: { r: 1.6, l: 1.4, c: 2.5, v: 2.8 },
      attack: { r: 2.1, l: 1.5, c: 3.2, v: 3.0 },
      concert: { r: 2.4, l: 2.7, c: 1.8, v: 3.4 },
      transparency: { r: 0.7, l: 1.1, c: 0.8, v: 1.0 },
    },
    aktivis: {
      context: { r: 1.0, l: 1.1, c: 1.5, v: 1.2 },
      data: { r: 0.8, l: 0.8, c: 1.3, v: 1.0 },
      empathy: { r: 1.5, l: 2.2, c: 1.4, v: 1.8 },
      meme: { r: 2.1, l: 2.3, c: 1.6, v: 2.5 },
      network: { r: 1.1, l: 1.2, c: 0.8, v: 1.1 },
      law: { r: 0.7, l: 0.8, c: 1.8, v: 1.0 },
      film: { r: 2.3, l: 2.5, c: 2.4, v: 3.2 },
      attack: { r: 2.2, l: 1.5, c: 3.5, v: 3.0 },
      transparency: { r: 0.5, l: 0.8, c: 0.7, v: 0.7 },
    },
  };
  const commentTemplates = {
    good: [
      "Nah gini dong, ada link, ada angka, nggak cuma ‘percaya saya’.",
      "Gue beda pendapat, tapi datanya dibuka. Fair.",
      "Akhirnya ada yang jawab pertanyaan, bukan nyari salah ketik.",
      "Save dulu. Besok biasanya ketimbun video joget dan klarifikasi jilid dua.",
      "Ini enak dibaca. Nggak perlu gelar tiga buat ngerti siapa ngapain.",
      "Oke, gue cek sumbernya. Kalau salah ya koreksi, bukan bakar orangnya.",
      "Ada konteks, ada batas data, ada bagian ‘kami belum tahu’. Langka banget.",
      "Pin ini, Min. Biar grup keluarga nggak cuma dapet screenshot separuh.",
      "Baru kali ini kolom komentar bikin tekanan darah turun dua poin.",
      "Substansinya masuk. Punchline-nya bonus, bukan pengganti bukti.",
    ],
    bad: [
      "Wkwk ini klarifikasi apa trailer season baru?",
      "Semua akun ngomongnya sama, bahkan komanya ikut briefing.",
      "Pertanyaannya A, jawabannya flashback 2014.",
      "Admin menang meme. Faktanya kalah WO.",
      "Yang dikoreksi kok orangnya, bukan angkanya?",
      "Ini organik banget sampai semua upload jam 19.03.",
      "Kok makin dijelasin makin berasa lagi ditawarin paket internet?",
      "Bang, itu font resmi nggak bikin intimidasi jadi transparansi.",
      "Sumber: percaya sama caption gue sendiri.",
      "Rame iya. Nyambung sama isu? beda server.",
    ],
    neutral: [
      "Gue kelewat satu episode. Ini mulai dari mana?",
      "Yang full video ada nggak? Gue takut debat modal 12 detik.",
      "Duitnya dari mana, keluarnya ke siapa?",
      "Angka segini dibanding tahun berapa?",
      "Ini fakta, prediksi, atau admin lagi kerasukan PowerPoint?",
      "Ada link dokumen aslinya nggak? Bukan link ke thread yang ngelink ke thread.",
      "Yang terdampak udah ditanya, atau baru yang punya mikrofon?",
      "Bentar, ini kebijakan nasional atau satu kasus dipaksa jadi poster?",
      "Siapa sponsor surveinya? Bukan nuduh, cuma males kena plot twist.",
      "Kalau salah, mekanisme koreksinya apa selain hapus story?",
    ],
  };
  const commenterPersonas = {
    bapak: {
      label: "BAPAK FACEBOOK",
      avatars: ["👨🏻‍🦳", "🧔🏻", "☕", "🚗"],
      handles: ["@pakRT_online", "@ayah_nayla88", "@omheru_bijak", "@bapak2meresahkan"],
      openers: ["Hehe izin nimbrung ya, ", "Bapak cuma mau bilang, ", "Dulu zaman bapak nggak begini... tapi serius, ", "Ini pendapat pribadi sambil nunggu servis motor: "],
      closers: [" Salam sehat untuk keluarga. 🙏", " Hehe jangan baper ya.", " Yang penting ngopi dulu.", " Mohon koreksi kalau bapak salah, tapi pelan-pelan."],
    },
    genz: {
      label: "GEN Z BASE",
      avatars: ["🧃", "🫠", "💅", "😭"],
      handles: ["@anakbasecapek", "@spilldongmin", "@fyprepublik", "@skripsibelumjadi"],
      openers: ["bestie, ", "pls deh, ", "gue baru buka timeline terus ", "no offense ya tapi "],
      closers: [" 😭", " admin spill full context dong.", " gue capek tapi penasaran.", " ini lore-nya panjang bgt anjir."],
    },
    millennial: {
      label: "MILENIAL SOTOY",
      avatars: ["💻", "🥤", "📊", "🧠"],
      handles: ["@mantananakbem", "@strategicthinkingbro", "@webinargratis", "@linkedinpolitik"],
      openers: ["Sebagai mantan anak organisasi, ", "Secara helicopter view nih, ", "Menurut gue yang pernah ikut webinar gratis, ", "Kalau kita pakai framework sederhana, "],
      closers: [" CMIIW tapi jangan galak.", " Ini cuma two cents gue.", " Intinya perlu alignment sih.", " Nanti gue bikin carousel-nya."],
    },
    conspiracy: {
      label: "BENANG MERAH?",
      avatars: ["🧿", "🕵️", "🧩", "🛰️"],
      handles: ["@benangmerahglobal", "@bongkarsemesta", "@arsiprahasia", "@kebetulanterus"],
      openers: ["Coba sambungkan titiknya: ", "Gue nggak nuduh ya, tapi... ", "Ada yang aneh nih: ", "Orang awam lihat berita. Gue lihat polanya: "],
      closers: [" Kebetulan? Silakan nilai sendiri.", " Buka mata, jangan cuma buka FYP.", " Screenshot sebelum dihapus.", " Yang ngerti geopolitik pasti paham."],
    },
    emak: {
      label: "EMAK GRUP WA",
      avatars: ["👩🏻", "🛒", "🍳", "📱"],
      handles: ["@bundanya_alif", "@mamahhemat", "@ibu2komplek", "@dapurdannegara"],
      openers: ["Maaf ya ibu-ibu ikut komen, ", "Yang saya rasain di pasar tuh, ", "Anak saya nanya, saya juga bingung: ", "Boleh debat, tapi "],
      closers: [" Yang penting harga telur jangan ikut trending.", " Tolong jangan kirim hoaks ke grup kelas lagi.", " Saya baca sambil goreng tempe.", " Admin kalau jawab jangan pakai bahasa rapat."],
    },
    anakpdf: {
      label: "ANAK PDF",
      avatars: ["📚", "🧾", "🧐", "📎"],
      handles: ["@halaman37", "@bacalampiran", "@catatankaki", "@dokumenprimer"],
      openers: ["Izin nambahin konteks, ", "Catatan kecil: ", "Bukan mau sok akademik, tapi ", "Gue cek dokumen aslinya: "],
      closers: [" Link primer gue taruh di bawah.", " Tolong jangan crop tabelnya.", " Metodenya penting, bukan cuma judulnya.", " Kalau ada versi baru kabarin."],
    },
    fanwar: {
      label: "FANWAR NASIONAL",
      avatars: ["🔥", "📢", "🤡", "🥊"],
      handles: ["@pasukansampaiakhir", "@ratioinaja", "@timkamihebat", "@capslockmerdeka"],
      openers: ["HAHAHA ", "UDAH KETEBak ", "MIN LIAT NIH ", "POKOKNYA "] ,
      closers: [" TITIK.", " JANGAN BANYAK ALASAN.", " RATIO + BLOCK.", " MENANGISLAH."],
    },
    forumGhost: {
      label: "AKUN FORUM LAMA",
      avatars: ["👻", "🗃️", "💾", "🕳️"],
      handles: ["@fufufafa_archive", "@kaskuscache", "@akunlamabangkit", "@gan_jejakdigital"],
      openers: ["Ane numpang lewat gan, ", "Pertamax dulu: ", "Old thread never dies: ", "Cache bilang begini: "],
      closers: [" Jejak digital nggak kenal masa tenang.", " Cendol belakangan, verifikasi dulu.", " Jangan tanya ane pemiliknya siapa.", " Thread closed, screenshot jalan terus."],
    },
    ojol: {
      label: "ABANG OJOL",
      avatars: ["🛵","🪖","📦","☔"],
      handles: ["@orderanseret","@abanglampumerah","@helmsetengah","@nungguping"],
      openers: ["Gue baca ini sambil nunggu order, ", "Bang, lampu merah aja ada hitung mundurnya. ", "Sebagai orang yang bensinnya bayar sendiri, ", "Tadi penumpang gue debat soal ini, "],
      closers: [" Yang jelas bensin nggak bisa dibayar pakai nasionalisme.", " Gue lanjut narik dulu, negara jangan kabur.", " Kalau ada sumber lengkap kirim, jangan voice note 11 menit.", " Rating lima bintang buat yang jawab lurus."],
    },
    anakKos: {
      label: "ANAK KOS",
      avatars: ["🍜","🧦","🛏️","🥚"],
      handles: ["@akhirbulanmulu","@mieinstanpolicy","@kosankebijakan","@telursetengah"],
      openers: ["Sebagai rakyat yang kulkasnya lampu doang, ", "Gue mau komentar tapi saldo lagi introspeksi: ", "Anak kos nanya polos nih, ", "Kalau dijelasin pakai harga mi instan, "],
      closers: [" Tolong jangan bikin telur jadi barang mewah.", " Ini gue save sebelum paket data habis.", " Negara boleh besar, porsi warteg jangan mengecil.", " Sekian dari kementerian akhir bulan."],
    },
    asn: {
      label: "ASN SILENT READER",
      avatars: ["🪪","🗂️","🖇️","😶"],
      handles: ["@akunpribadibukaninstansi","@mohonjangantagkantor","@disposisidulu","@notulenanonim"],
      openers: ["Komentar pribadi, nggak mewakili instansi: ", "Mohon jangan screenshot nama saya, tapi ", "Secara disposisi batin, ", "Saya cuma lewat sebelum apel: "],
      closers: [" Demikian, mohon tidak ditindaklanjuti ke atasan.", " Saya logout dulu sebelum admin kantor bangun.", " Lampiran menyusul kalau server tidak maintenance.", " Ini bukan bocoran, cuma kebetulan saya hafal formatnya."],
    },
    warung: {
      label: "PENGAMAT WARUNG",
      avatars: ["🫖","🚬","🪑","🍌"],
      handles: ["@warungpojok","@kopihitamdua","@kursiplastik","@gorenganpolitik"],
      openers: ["Tadi di warung kesimpulannya simpel: ", "Kata bapak-bapak meja sebelah, ", "Saya bukan pengamat, cuma utang kopi saya tercatat rapi: ", "Di warung sini pollingnya begini: "],
      closers: [" Gorengan dingin, debatnya tetap panas.", " Yang kalah debat bayar kopi.", " Besok isu baru, utang lama tetap dicatat.", " Silakan bantah, kursi plastik tersedia."],
    },
    buzzerMagang: {
      label: "BUZZER MAGANG",
      avatars: ["🧑‍💻","📱","🔋","🫡"],
      handles: ["@adminshiftmalam","@organikbanget","@briefbelumturun","@akunbackup47"],
      openers: ["Brief gue belum turun, tapi ", "Ini opini pribadi yang kebetulan seragam: ", "Admin senior bilang jangan ngaku, jadi ", "Gue magang doang ya, "],
      closers: [" Hashtag final menyusul setelah approval.", " Tolong like, KPI gue tinggal dua persen.", " Kalau salah hapus, kalau benar invoice.", " Jangan bilang siapa-siapa kita upload jam yang sama."],
    },
    npc: {
      label: "AKUN ASLI",
      avatars: ["👤"],
      handles: ["@akun_asli"],
      openers: [""],
      closers: [""],
    },
  };
  const netizenPack = window.PNNetizenPack || {
    spamChance: 0,
    noiseSupplementChance: 0,
    roughChance: 0,
    spamPersonaIds: [],
    noisePersonaIds: [],
    personas: {},
    comments: {},
  };
  Object.assign(commenterPersonas, netizenPack.personas || {});
  Object.entries(netizenPack.comments || {}).forEach(([tone, lines]) => {
    if (commentTemplates[tone]) commentTemplates[tone].push(...lines);
  });
  const personaPools = {
    good: ["genz","bapak","millennial","emak","anakpdf","ojol","anakKos","warung","asn","rageCitizen"],
    bad: ["genz","fanwar","millennial","conspiracy","bapak","buzzerMagang","warung","emak","rageCitizen"],
    neutral: ["bapak","genz","millennial","conspiracy","emak","anakpdf","ojol","anakKos","asn","warung","rageCitizen"],
  };
  const noisePersonaIds = new Set(
    netizenPack.noisePersonaIds || netizenPack.spamPersonaIds || [],
  );
  const topicCommentTemplates = {
    election: {
      good: [
        "Setidaknya ini membahas aturan main, bukan hanya elektabilitas harian.",
        "Tolong tampilkan sampel, sponsor survei, dan tanggal pengambilan data.",
      ],
      bad: [
        "Quick count belum selesai, koalisi sudah mencetak kartu nama.",
        "Nomor urut belum ada, fanwar sudah punya seragam.",
      ],
      neutral: [
        "Survei ini mengukur pilihan atau sekadar tingkat kenal?",
        "Apakah undecided dimasukkan ke grafik atau disimpan untuk headline?",
      ],
    },
    election2029: {
      good: [
        "Pemilu berikutnya butuh memori, bukan hanya maskot baru.",
        "Pengawasan TPS lebih berguna daripada 40 podcast deklarasi.",
      ],
      bad: [
        "Kandidat belum resmi, baliho sudah merasa dilantik.",
        "Deepfake belum dibantah, tim sukses sudah menjadikannya merchandise.",
      ],
      neutral: [
        "Aturan pencalonan finalnya sudah jelas belum?",
        "Siapa yang audit dana kreator dan iklan mikro-target?",
      ],
    },
    dirtyvote: {
      good: [
        "Filmnya boleh diperdebatkan, dokumennya tetap harus dijawab.",
        "Cek sumber primer sebelum memilih bagian yang paling sinematik.",
      ],
      bad: [
        "Menyerang sutradara tidak otomatis menghapus dokumen dari layar.",
        "Server down bukan bantahan akademik.",
      ],
      neutral: [
        "Ada tanggapan per poin, bukan perasaan terhadap judul film?",
        "Materi koreksi dan raw document tersedia di mana?",
      ],
    },
    court: {
      good: [
        "Baca amar, pertimbangan, dan dissenting opinion. Screenshot satu paragraf bukan putusan.",
        "Akhirnya ada yang menautkan dokumen lengkap.",
      ],
      bad: [
        "Pasal dipotong seperti video reaction.",
        "Hakim belum selesai membaca, akun partai sudah membuat kesimpulan final.",
      ],
      neutral: [
        "Putusan ini berlaku langsung atau perlu aturan pelaksana?",
        "Bagian mana yang ratio decidendi dan mana yang komentar tambahan?",
      ],
    },
    budget: {
      good: [
        "Pisahkan anggaran, realisasi, dan manfaat. Tiga angka itu bukan saudara kembar.",
        "Biaya peluang akhirnya dibahas, terima kasih.",
      ],
      bad: [
        "Grafiknya naik karena sumbu Y sedang ikut kampanye.",
        "Program disebut gratis, faktur rupanya memilih rakyat.",
      ],
      neutral: [
        "Angka ini nominal, riil, atau persentase PDB?",
        "Belanja pusat naik, transfer daerah bagaimana?",
      ],
    },
    finance: {
      good: [
        "Baseline dan asumsi makronya disebut. Jarang sekali.",
        "Cek dampaknya ke pekerjaan dan harga, bukan hanya indeks sehari.",
      ],
      bad: [
        "Rupiah melemah, admin menyalahkan kurangnya rasa syukur.",
        "Defisit diberi nama optimisme agar tidak terdengar seperti tagihan.",
      ],
      neutral: [
        "Efeknya ke kelas menengah dan daerah kapan terlihat?",
        "Ini proyeksi pemerintah atau konsensus independen?",
      ],
    },
    mbg: {
      good: [
        "Hitung gizi, keamanan pangan, biaya per porsi, dan kapasitas dapur sekaligus.",
        "Anak bukan angka serapan. Bagus akhirnya ada evaluasi mutu.",
      ],
      bad: [
        "Menu difoto dari atas, kasus keracunan difoto dari jauh.",
        "Kritik dapur dibalas poster anak tersenyum stok.",
      ],
      neutral: [
        "Audit vendor dan rantai dinginnya terbuka?",
        "Berapa biaya administrasi dibanding makanan yang sampai ke anak?",
      ],
    },
    tni: {
      good: [
        "Perdebatan sipil-militer perlu pasal dan desain pengawasan, bukan nostalgia.",
        "Daftar jabatan dan mekanisme akuntabilitasnya akhirnya dibuka.",
      ],
      bad: [
        "Setiap kritik disebut anti-negara, seolah negara cuma punya satu seragam.",
        "Rapat cepat sekali; partisipasi publik datang setelah palu.",
      ],
      neutral: [
        "Apa batas kewenangannya dan siapa yang mengawasi?",
        "Apakah penempatan ini temporer atau menjadi normal baru?",
      ],
    },
    darkprotests: {
      good: [
        "Tuntutan lengkap lebih penting daripada foto paling dramatis.",
        "Aksi jalanan dan kajian kampus akhirnya saling menaut.",
      ],
      bad: [
        "Admin hanya membahas warna almamater, bukan isi tuntutan.",
        "Video lama didaur ulang karena argumen baru belum tersedia.",
      ],
      neutral: [
        "Ada daftar tuntutan dan notulensi dialog?",
        "Siapa yang memastikan peserta aman dan informasi terverifikasi?",
      ],
    },
    demonstrations: {
      good: [
        "Tuntutan dan dampak kebijakan dibaca sebelum menilai kerumunan.",
        "Dokumentasi kekerasan disimpan dengan metadata, bukan cuma di-story.",
      ],
      bad: [
        "Ketika tuntutan sulit dijawab, jumlah massa mendadak diperdebatkan.",
        "Satu provokasi dipakai menghapus ribuan suara.",
      ],
      neutral: [
        "Kronologi independennya sudah ada?",
        "Apa respons resmi terhadap tuntutan utama?",
      ],
    },
    civicspace2026: {
      good: [
        "Perlindungan pembela HAM bukan hadiah kepada orang yang kita sukai.",
        "Kronologi dan bukti ancaman perlu disimpan lintas platform.",
      ],
      bad: [
        "Korban disuruh membuktikan kesopanan sebelum mendapat perlindungan.",
        "Serangan fisik dijawab dengan audit opini korban.",
      ],
      neutral: [
        "Status penyelidikan dan perlindungan saksi bagaimana?",
        "Apakah ada pola serangan serupa sebelumnya?",
      ],
    },
    publicfigures: {
      good: [
        "Disclosure hubungan dan bayaran membuat publik bisa menilai.",
        "Figur populer tetap boleh bicara, asal konteks kepentingannya terlihat.",
      ],
      bad: [
        "Paid partnership-nya hilang, sinematografinya tidak.",
        "Jumlah pengikut dipakai sebagai pengganti kompetensi.",
      ],
      neutral: [
        "Ini dukungan pribadi, kontrak kampanye, atau jabatan resmi?",
        "Ada transparansi remunerasi dan mandat?",
      ],
    },
    future: {
      good: [
        "Karena ini proyeksi, asumsi dan ketidakpastiannya harus terlihat.",
        "Skenario fiksi tetap berguna kalau tidak menyamar sebagai ramalan pasti.",
      ],
      bad: [
        "Prediksi dikemas seperti bocoran rapat yang bahkan belum terjadi.",
        "AI membuat kutipan, manusia membuat pembenaran.",
      ],
      neutral: [
        "Bagian mana fakta, mana asumsi, mana satire?",
        "Apa indikator yang akan membuktikan prediksi ini salah?",
      ],
    },
  };
  const phaseCommentTemplates = [
    [
      "Akun kuliner mendadak bahas konstitusi. Musim pemilu benar-benar kaya crossover.",
      "Tim sebelah mulai uji tagar baru jam dua pagi. Itu biasanya bukan insomnia biasa.",
    ],
    [
      "Konferensi pers dijadwalkan setelah semua deadline berita lewat. Menarik.",
      "Dapur, pasal, dan jalanan mulai bertemu di satu timeline.",
    ],
    [
      "Wartawan ekonomi mulai follow akun demonstrasi. Dompet dan jalanan tampaknya akan berkenalan.",
      "Ada spreadsheet baru beredar, nama filenya FINAL_revisi_baru_beneran.xlsx.",
    ],
    [
      "Skenario baru mulai, konsultan sudah mengirim invoice nyata.",
      "Akun investasi negara dan akun cuaca mulai saling reply. Aku tidak tenang.",
    ],
    [
      "Belum deklarasi, tapi podcast berdurasi dua jam sudah punya sponsor.",
      "Kreator finansial mulai memakai kata “mandat rakyat”. Pra-pemilu resmi masuk affiliate; papan tulis global ikut buka pre-order.",
    ],
    [
      "Akun cek fakta menambah shift malam. Itu sendiri sudah menjadi polling.",
      "Masa tenang tinggal nama; scheduled post sudah antre sampai subuh.",
    ],
  ];

  const D = (
    key,
    title,
    avatar,
    npc,
    handle,
    post,
    lesson,
    weak,
    resist,
    heat,
  ) => ({
    key,
    title,
    avatar,
    npc,
    handle,
    post,
    lesson,
    weak,
    resist,
    heat,
  });
  const MD = (
    month,
    status,
    key,
    title,
    avatar,
    npc,
    handle,
    post,
    lesson,
    weak,
    resist,
    heat,
  ) => ({
    ...D(
      key,
      title,
      avatar,
      npc,
      handle,
      post,
      lesson,
      weak,
      resist,
      heat,
    ),
    month,
    status,
  });
  const phases = [{"name":"2024: PEMILU, TRANSISI, DAN AUDISI KURSI","period":"JAN–DES 2024","status":"ARSIP POLITIK 2024","bRank":"Relawan Paslon Naik Kelas","aRank":"Aktivis Timeline & Pemantau Pemilu","bMentor":["📸","Kak Gemoyfikasi Nasional","Sutradara citra yang mengubah rekam jejak menjadi dance challenge, koalisi menjadi foto keluarga, dan debat menjadi potongan vertikal 27 detik.","Meme dan endorsement lebih murah; transparansi memberi bonus kepercayaan."],"aMentor":["🧵","Mimin Warga Tidak Lupa","Utas hanyalah pintu masuk. Arsip, saksi, dan organisasi menentukan apakah ingatan bertahan setelah trending turun.","Konteks dan dokumen primer lebih efektif."],"days":[{"key":"constitution","title":"#AnakHaramKonstitusi","avatar":"⚖️","npc":"Mbak Amar Setengah","handle":"@pasalbelumselesai","post":"Putusan usia cawapres masih panas. Kritikus memakai istilah ‘anak haram konstitusi’; kubu pasangan calon menyebutnya hinaan politik. Di timeline, putusan etik, syarat umur, dan silsilah keluarga digoreng dalam satu wajan.","lesson":"Istilah polemis bukan status hukum. Pisahkan isi Putusan MK 90, pelanggaran etik hakim, konsekuensi pencalonan, dan serangan personal terhadap kandidat.","weak":["law","context","data"],"resist":["meme","attack"],"heat":82,"month":"JANUARI 2024","status":"ARSIP POLITIK 2024","subject":"putusan usia cawapres dan legitimasi konstitusional","document":"Putusan MK 90, putusan etik MKMK, dan aturan pencalonan","people":"pemilih yang ingin proses pencalonan fair","counter":"rekam jejak kandidat lain","stage":"ruang sidang dan timeline pemilu","facts":[["Kontroversi syarat usia","Putusan MK membuka jalan bagi Gibran; ketua MK saat itu kemudian dinyatakan melanggar etik karena konflik kepentingan. Istilah ‘anak haram konstitusi’ adalah slogan polemis, bukan status hukum.","https://www.reuters.com/world/asia-pacific/indonesia-presidential-candidate-anies-files-court-challenge-election-result-2024-03-21/"]],"teaser":"FilmTurunServerNaik","arc":"constitution","discussion":{"good":"respons ini benar-benar menjawab putusan usia cawapres dan legitimasi konstitusional dan membuka Putusan MK 90, putusan etik MKMK, dan aturan pencalonan","bad":"isu putusan usia cawapres dan legitimasi konstitusional dialihkan ke rekam jejak kandidat lain tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada pemilih yang ingin proses pencalonan fair"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"dirtyvote","title":"#FilmTurunServerNaik","avatar":"🎥","npc":"Bang Layar Tancap","handle":"@nontonbarengwarga","post":"Dokumenter politik muncul menjelang pencoblosan. Tim sukses sibuk membahas siapa pembuatnya; penonton sibuk mencari dokumennya; algoritma sibuk menghitung durasi kemarahan.","lesson":"Dokumenter adalah argumen audiovisual. Uji sumber, metode, potongan, dan tanggapan pihak yang dikritik.","weak":["film","data"],"resist":["attack"],"heat":68,"month":"FEBRUARI 2024","status":"ARSIP POLITIK 2024","subject":"FilmTurunServerNaik","document":"film, dokumen sumber, dan tanggapan pihak yang dikritik","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"QuickCountQuickClaim","arc":"dirtyvote","facts":[],"discussion":{"good":"respons ini benar-benar menjawab FilmTurunServerNaik dan membuka film, dokumen sumber, dan tanggapan pihak yang dikritik","bad":"isu FilmTurunServerNaik dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"election","title":"#QuickCountQuickClaim","avatar":"📊","npc":"Prof. Margin Error","handle":"@sampelnyaom","post":"Hasil cepat belum selesai masuk, tetapi semua kubu sudah mencetak spanduk mandat rakyat. Angka sementara berubah menjadi wahyu permanen sebelum server resmi selesai sarapan.","lesson":"Quick count adalah estimasi berbasis sampel; hasil resmi, metode, dan margin galat tetap penting.","weak":["data","transparency"],"resist":["patriot"],"heat":48,"month":"MARET 2024","status":"ARSIP POLITIK 2024","subject":"QuickCountQuickClaim","document":"rekap suara, survei, dan laporan dana kampanye","people":"pemilih, petugas pemilu, dan kandidat","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"SidangEnamJamKlipEnamDetik","arc":"election","facts":[],"discussion":{"good":"respons ini benar-benar menjawab QuickCountQuickClaim dan membuka rekap suara, survei, dan laporan dana kampanye","bad":"isu QuickCountQuickClaim dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada pemilih, petugas pemilu, dan kandidat"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"court","title":"#SidangEnamJamKlipEnamDetik","avatar":"⚖️","npc":"Hakim Screenshot","handle":"@amarsetengah","post":"Sengketa pemilu dibacakan berjam-jam. Timeline memilih enam detik ekspresi hakim sebagai ringkasan konstitusi nasional.","lesson":"Baca amar, pertimbangan, pendapat berbeda, bukti, dan standar pembuktian secara utuh.","weak":["law","context"],"resist":["meme"],"heat":55,"month":"APRIL 2024","status":"ARSIP POLITIK 2024","subject":"SidangEnamJamKlipEnamDetik","document":"amar, pertimbangan, dissent, dan akibat hukum","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"PakJokoMasihPunyaRemote","arc":"court","facts":[],"discussion":{"good":"respons ini benar-benar menjawab SidangEnamJamKlipEnamDetik dan membuka amar, pertimbangan, dissent, dan akibat hukum","bad":"isu SidangEnamJamKlipEnamDetik dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"jokowi","title":"#PakJokoMasihPunyaRemote","avatar":"🛠️","npc":"Pak Joko Woles","handle":"@kerjakerjaremote","post":"Presiden yang akan selesai masa jabatan bilang fokus kerja sampai akhir. Partai lama mulai menjauh, koalisi baru masih sering mampir. Netizen bertanya: remote kekuasaan dikembalikan Oktober atau baterainya dibawa pulang ke Solo?","lesson":"Pengaruh politik setelah jabatan bukan otomatis ilegal. Uji keputusan transisi, jaringan partai, penempatan orang, dan batas antara warisan kebijakan dengan kendali atas penerus.","weak":["context","data","transparency"],"resist":["attack"],"heat":58,"month":"MEI 2024","status":"ARSIP POLITIK 2024","subject":"warisan dan pengaruh politik Jokowi","document":"reshuffle, keputusan transisi, jaringan koalisi, dan program warisan","people":"warga yang ingin pergantian kekuasaan jelas","counter":"popularitas dan proyek infrastruktur","stage":"Istana, Solo, dan ruang lobi koalisi","facts":[["Warisan Jokowi","Jokowi meninggalkan jabatan dengan popularitas tinggi, tetapi dikritik atas kemunduran demokrasi dan politik dinasti.","https://www.reuters.com/world/asia-pacific/decade-jokowi-indonesias-democracy-icon-leaves-illiberal-legacy-critics-say-2024-10-14/"]],"teaser":"JanjiMasukSpreadsheet","arc":"jokowi","discussion":{"good":"respons ini benar-benar menjawab warisan dan pengaruh politik Jokowi dan membuka reshuffle, keputusan transisi, jaringan koalisi, dan program warisan","bad":"isu warisan dan pengaruh politik Jokowi dialihkan ke popularitas dan proyek infrastruktur tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang ingin pergantian kekuasaan jelas"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"budget","title":"#JanjiMasukSpreadsheet","avatar":"🧾","npc":"Bu Anggaran Realistis","handle":"@kolomnyakurang","post":"Janji kampanye akhirnya bertemu Excel. Semua muat di baliho; di APBN, makan gratis, pendidikan, kesehatan, subsidi, dan utang berebut satu sel yang sama.","lesson":"Kebijakan memiliki biaya peluang. Uji sasaran, sumber dana, kapasitas, risiko, dan indikator hasil.","weak":["budget","data"],"resist":["patriot"],"heat":47,"month":"JUNI 2024","status":"ARSIP POLITIK 2024","subject":"JanjiMasukSpreadsheet","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KabinetFantasyLeague","arc":"budget","facts":[],"discussion":{"good":"respons ini benar-benar menjawab JanjiMasukSpreadsheet dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu JanjiMasukSpreadsheet dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"publicfigures","title":"#KabinetFantasyLeague","avatar":"🪑","npc":"Wamen Stelah Krispi & Mbak Bursa Menteri","handle":"@kursitambahan","post":"Nama kabinet bocor satu-satu. Di antara pensiunan jenderal, ketua relawan, dan manusia yang punya tiga jabatan, muncul ilmuwan kognitif yang diminta menjelaskan masa depan sains sambil cari colokan presentasi. Publik nanya: laboratorium dapat anggaran atau cuma dapat jargon “brain gain”?","lesson":"Kompetensi akademik penting, tetapi kebijakan sains tetap harus diuji lewat anggaran riset, kebebasan akademik, institusi, dan hasil yang bisa diaudit.","weak":["transparency","data"],"resist":["meme"],"heat":49,"month":"JULI 2024","status":"ARSIP POLITIK 2024","subject":"kabinet, pendidikan tinggi, dan kebijakan sains","document":"struktur kabinet, mandat kementerian, anggaran riset, dan indikator kebijakan sains","people":"peneliti, dosen, mahasiswa, dan kampus yang diminta inovatif sambil hemat listrik","counter":"CV internasional tanpa pembahasan desain kebijakan","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KabinetGendutLabOtakMasuk","arc":"publicfigures","facts":[["Ilmuwan kognitif masuk kabinet","Seorang ilmuwan kognitif dengan pengalaman akademik internasional dilantik sebagai wakil menteri yang menangani pendidikan tinggi, sains, dan teknologi pada Oktober 2024.","https://en.wikipedia.org/wiki/Stella_Christie"]],"discussion":{"good":"respons ini benar-benar menjawab KabinetFantasyLeague dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu KabinetFantasyLeague dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"court","title":"#PeringatanDaruratNasional","avatar":"🚨","npc":"Warga Garuda Biru","handle":"@demokrasidarurat","post":"Gambar peringatan darurat menyebar ketika parlemen dianggap hendak mengakali putusan pengadilan soal pilkada. Internet berubah menjadi sirene, jalanan menjadi ruang klarifikasi.","lesson":"Perubahan aturan pemilu yang dekat dengan kompetisi memerlukan keterbukaan dan perlindungan dari konflik kepentingan.","weak":["law","network"],"resist":["whatabout"],"heat":78,"month":"AGUSTUS 2024","status":"ARSIP POLITIK 2024","subject":"PeringatanDaruratNasional","document":"amar, pertimbangan, dissent, dan akibat hukum","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"CacheLamaKoalisiBaru","arc":"court","facts":[],"discussion":{"good":"respons ini benar-benar menjawab PeringatanDaruratNasional dan membuka amar, pertimbangan, dissent, dan akibat hukum","bad":"isu PeringatanDaruratNasional dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"fufufafa","title":"#CacheLamaKoalisiBaru","avatar":"👻","npc":"Akun Forum yang Tidak Mau Mati","handle":"@fufufafa_archive","post":"Screenshot akun Kaskus lama beredar: isinya menyerang Prabowo dan komentar aneh tentang figur publik. Akun itu dikaitkan dengan calon wakil presiden, tetapi kepemilikannya belum terbukti final. Timeline sudah telanjur bikin 47 thread silsilah keyboard.","lesson":"Arsip digital dapat diverifikasi isinya tanpa otomatis memastikan identitas pemilik. Bahas penghinaan dan misogini tanpa doxing atau mengubah dugaan menjadi vonis.","weak":["context","data","transparency"],"resist":["attack","meme"],"heat":92,"month":"SEPTEMBER 2024","status":"ARSIP POLITIK 2024","subject":"kontroversi arsip akun @fufufafa","document":"cache forum, metadata, bantahan, dan keterbatasan atribusi","people":"figur yang dihina dan publik yang berhak atas verifikasi","counter":"akun anonim kubu lain","stage":"Kaskus, cache web, dan grup screenshot","teaser":"PelantikanDanKabinetGendut","arc":"fufufafa","facts":[],"discussion":{"good":"respons ini benar-benar menjawab kontroversi arsip akun @fufufafa dan membuka cache forum, metadata, bantahan, dan keterbatasan atribusi","bad":"isu kontroversi arsip akun @fufufafa dialihkan ke akun anonim kubu lain tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada figur yang dihina dan publik yang berhak atas verifikasi"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"cabinet","title":"#PelantikanDanKabinetGendut","avatar":"🏛️","npc":"Pak Jenderal Gemoyono","handle":"@gemoyonoresmi","post":"Pak Jenderal Gemoyono dilantik. Kabinet diumumkan dengan jumlah kursi yang membuat denah gedung perlu DLC. Pidato persatuan panjang; daftar kementerian lebih panjang lagi.","lesson":"Kabinet besar dapat menambah representasi atau justru memecah akuntabilitas. Ukur biaya, tumpang tindih, target, dan siapa bertanggung jawab.","weak":["data","transparency"],"resist":["patriot","endorse"],"heat":68,"month":"OKTOBER 2024","status":"ARSIP POLITIK 2024","subject":"pelantikan dan kabinet besar","document":"struktur kementerian, target 100 hari, dan anggaran birokrasi","people":"pegawai negara dan warga pengguna layanan","counter":"kabinet kecil yang dianggap tidak efektif","stage":"pelantikan, Istana, dan papan organisasi baru","teaser":"PilkadaSatuHariSeribuDinasti","arc":"cabinet","facts":[],"discussion":{"good":"respons ini benar-benar menjawab pelantikan dan kabinet besar dan membuka struktur kementerian, target 100 hari, dan anggaran birokrasi","bad":"isu pelantikan dan kabinet besar dialihkan ke kabinet kecil yang dianggap tidak efektif tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada pegawai negara dan warga pengguna layanan"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"election","title":"#PilkadaSatuHariSeribuDinasti","avatar":"🗺️","npc":"Mbak Peta Keluarga","handle":"@namabelakangmenang","post":"Pilkada serentak membuat peta politik tampak baru, tetapi banyak nama belakang terasa seperti episode lanjutan.","lesson":"Dinasti politik bukan otomatis ilegal, namun akses, konflik kepentingan, dan kompetisi yang setara harus diuji.","weak":["data","law"],"resist":["patriot"],"heat":58,"month":"NOVEMBER 2024","status":"ARSIP POLITIK 2024","subject":"PilkadaSatuHariSeribuDinasti","document":"rekap suara, survei, dan laporan dana kampanye","people":"pemilih, petugas pemilu, dan kandidat","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"RemoteDiserahterimakanAtauDipinjam","arc":"election","facts":[],"discussion":{"good":"respons ini benar-benar menjawab PilkadaSatuHariSeribuDinasti dan membuka rekap suara, survei, dan laporan dana kampanye","bad":"isu PilkadaSatuHariSeribuDinasti dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada pemilih, petugas pemilu, dan kandidat"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"transition","title":"#RemoteDiserahterimakanAtauDipinjam","avatar":"🔑","npc":"Pak Joko Woles & Pak Gemoyono","handle":"@transisi_dua_presiden","post":"Satu presiden pulang, satu presiden memegang semua tombol. Keduanya bicara kontinuitas. Netizen bertanya apakah yang lanjut itu program, jaringan, atau grup WhatsApp kabinet.","lesson":"Transisi sehat memerlukan batas tanggung jawab yang jelas. Catat kebijakan yang diwarisi, yang diubah, dan siapa membuat keputusan setelah pelantikan.","weak":["context","transparency"],"resist":["meme","attack"],"heat":52,"month":"DESEMBER 2024","status":"ARSIP POLITIK 2024","subject":"transisi Jokowi–Prabowo","document":"program warisan, keputusan baru, dan komitmen 100 hari","people":"warga yang menanggung kesinambungan atau koreksi","counter":"narasi putus total atau kendali total","stage":"Istana lama, kabinet baru, dan grup koordinasi","teaser":"NasiGratisFakturPanjang","arc":"transition","facts":[],"discussion":{"good":"respons ini benar-benar menjawab transisi Jokowi–Prabowo dan membuka program warisan, keputusan baru, dan komitmen 100 hari","bad":"isu transisi Jokowi–Prabowo dialihkan ke narasi putus total atau kendali total tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang menanggung kesinambungan atau koreksi"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}}]},{"name":"2025: TAHUN PERTAMA, NEGARA MASUK TIMELINE","period":"JAN–DES 2025","status":"ARSIP POLITIK 2025","bRank":"Buzzer Istana & Operator Koalisi","aRank":"Aktivis Kampus, Advokat, dan Jaringan Warga","bMentor":["🦅","Pak Jenderal Gemoyono & Mayor Tedi Ketok-Pintu","Satu menguasai podium, satu menguasai jadwal. Keduanya sepakat bahwa masalah besar membutuhkan konferensi pers yang lebih besar.","Podcast, patriotisme, dan spectacle terbuka."],"aMentor":["⚖️","Prof. Ferry Ambyar-Sari & Bu Bibitri Susah-Tidur","Pasal dibaca sampai catatan kaki; rapat tertutup dianggap undangan investigasi.","Audit hukum dan konsolidasi jaringan lebih kuat."],"days":[{"key":"mbg","title":"#NasiGratisFakturPanjang","avatar":"🍱","npc":"Bu Kantin Merdeka","handle":"@nasinyakurang","post":"Program makan bergizi dimulai dengan target raksasa, dapur baru, foto seremonial, dan pertanyaan sederhana: siapa mengawasi kualitas ketika semua orang sibuk mengawasi branding?","lesson":"Tujuan baik tidak kebal dari audit keamanan pangan, pengadaan, cakupan, dan pengaduan.","weak":["data","budget"],"resist":["attack"],"heat":55,"month":"JANUARI 2025","status":"ARSIP POLITIK 2025","subject":"NasiGratisFakturPanjang","document":"anggaran, kontrak dapur, insiden, dan data penerima","people":"murid, keluarga, guru, dan pekerja dapur","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"IndonesiaGelap","arc":"mbg","facts":[],"discussion":{"good":"respons ini benar-benar menjawab NasiGratisFakturPanjang dan membuka anggaran, kontrak dapur, insiden, dan data penerima","bad":"isu NasiGratisFakturPanjang dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada murid, keluarga, guru, dan pekerja dapur"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"darkprotests","title":"#IndonesiaGelap","avatar":"🌑","npc":"Mas Tiyo Toa, BEM Nusantara Capek & Wamen Stelah Krispi","handle":"@togarpegangtoa","post":"Mahasiswa turun membawa tagar Indonesia Gelap. Pemerintah membawa slide efisiensi. Wamen Stelah Krispi membawa diagram otak dan bilang bangsa perlu berpikir jangka panjang. Mahasiswa membalas: boleh, Bu, tapi neuron kampus lagi disuruh patungan toner.","lesson":"Protes anggaran pendidikan perlu dibaca bersama rincian efisiensi, beasiswa, UKT, kebebasan akademik, dan pergantian kepemimpinan kementerian.","weak":["budget","empathy"],"resist":["patriot"],"heat":96,"month":"FEBRUARI 2025","status":"ARSIP POLITIK 2025","subject":"Indonesia Gelap, efisiensi pendidikan, dan masa depan riset","document":"rincian efisiensi kementerian, anggaran beasiswa, UKT, riset, dan respons resmi","people":"mahasiswa, dosen, penerima beasiswa, peneliti, dan pegawai kampus","counter":"motivasi individual dan klaim bahwa generasi muda cuma kurang optimistis","stage":"kampus, mobil komando, Patung Kuda, dan timeline nasional","teaser":"SainsMasukKabinetAnggaranKeluar","arc":"darkprotests","facts":[],"discussion":{"good":"respons ini menjawab Indonesia Gelap dengan data anggaran, kelompok terdampak, serta tuntutan yang dijaga Mas Tiyo Toa dan jaringan mahasiswa","bad":"isu efisiensi, pendidikan, pekerjaan, dan MBG dialihkan menjadi tuduhan mahasiswa cuma ingin viral tanpa membahas tuntutannya","neutral":"uji angka penghematan, dampak layanan, legitimasi tuntutan, dan apakah konsolidasi tetap hidup setelah toa dimatikan"},"jokes":{"bapak":"Toanya jelas, tuntutannya jelas. Yang belum jelas cuma siapa yang pinjam kabel roll pos ronda dan belum balikin.","genz":"Mas Tiyo Toa pegang toa, admin pegang Canva, negara pegang tombol mute. very collaborative 😭","emak":"Kalau katanya efisiensi, kenapa yang hemat selalu sekolah sama rumah sakit? Coba rapat pejabatnya bawa bekal dari rumah dulu."}},{"key":"tni","title":"#RapatHotelUndangUndang","avatar":"🏨","npc":"Mbak Pintu Rapat","handle":"@draftnyadimana","post":"Revisi UU TNI dibahas cepat dan sebagian pertemuan berlangsung jauh dari ruang publik. Aktivis datang; pintu keamanan menjawab lebih dahulu.","lesson":"Legislasi bermakna membutuhkan naskah terbuka, partisipasi nyata, alasan kebijakan, dan waktu deliberasi.","weak":["law","network"],"resist":["attack"],"heat":82,"month":"MARET 2025","status":"ARSIP POLITIK 2025","subject":"RapatHotelUndangUndang","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"IjazahMasukLaboratoriumTimeline","arc":"tni","facts":[],"discussion":{"good":"respons ini benar-benar menjawab RapatHotelUndangUndang dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu RapatHotelUndangUndang dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"diploma","title":"#IjazahMasukLaboratoriumTimeline","avatar":"🎓","npc":"Roy Sur-Yoyo & dr. Tifa-Tifi","handle":"@forensikdariscreenshot","post":"Roy Sur-Yoyo, dr. Tifa-Tifi, dan detektif pixel membahas ijazah Pak Joko Woles. Kampus bilang alumninya sah, aparat menyatakan dokumen autentik; pengkritik bilang masih ada kejanggalan. Satu bangsa mendadak ahli font mesin tik.","lesson":"Kontroversi dokumen harus membedakan tudingan, pemeriksaan resmi, bukti primer, bantahan, hak mengkritik, dan risiko fitnah. Screenshot bukan otomatis forensik.","weak":["data","context","law"],"resist":["meme","attack"],"heat":92,"month":"APRIL 2025","status":"ARSIP POLITIK 2025","subject":"polemik ijazah Jokowi","document":"arsip kampus, dokumen asli, hasil pemeriksaan, dan bantahan","people":"publik, pihak yang dituduh, dan institusi pendidikan","counter":"motif politik pengkritik atau kekuasaan aparat","stage":"kampus, laboratorium forensik, podcast, dan pengadilan opini","facts":[["Status kontroversi","UGM dan kepolisian menyatakan ijazah autentik; Roy Suryo, dr. Tifa, dan pihak lain tetap menyampaikan tudingan atau keraguan. Game tidak menetapkan tudingan itu benar.","https://en.wikipedia.org/wiki/Joko_Widodo_diploma_controversy"]],"teaser":"MenluHematKataPresidenSeringDiBandara","arc":"diploma","discussion":{"good":"respons ini benar-benar menjawab polemik ijazah Jokowi dan membuka arsip kampus, dokumen asli, hasil pemeriksaan, dan bantahan","bad":"isu polemik ijazah Jokowi dialihkan ke motif politik pengkritik atau kekuasaan aparat tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada publik, pihak yang dituduh, dan institusi pendidikan"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"diplomacy","title":"#MenluHematKataPresidenSeringDiBandara","avatar":"🌐","npc":"Menlu Sunyi Gono-Gini vs Om Diplo Peta Dunia","handle":"@bebasaktif_tanyahasil","post":"Presiden lebih sering terlihat di bandara daripada beberapa koper kabin. Menlu Sunyi Gono-Gini menjelaskan bebas aktif dalam kalimat yang hemat. Om Diplo Peta Dunia bertanya: tujuan strategisnya apa, hasil konkretnya mana, dan ASEAN masih dapat kursi depan nggak?","lesson":"Diplomasi aktif dinilai dari tujuan, hasil, biaya, konsistensi, serta keseimbangan BRICS, ASEAN, Barat, China, Rusia, dan kepentingan domestik.","weak":["data","context","transparency"],"resist":["patriot","endorse"],"heat":72,"month":"MEI 2025","status":"ARSIP POLITIK 2025","subject":"lawatan luar negeri dan arah politik luar negeri","document":"agenda, kesepakatan, biaya perjalanan, dan tindak lanjut","people":"warga yang menunggu manfaat diplomasi di dalam negeri","counter":"tuduhan tidak patriotik atau terlalu pro-blok tertentu","stage":"BRICS, ASEAN, bandara, dan ruang briefing Kemlu","facts":[["Arah BRICS","Menlu Sugiono menyebut proses bergabung dengan BRICS sebagai bagian politik luar negeri bebas aktif.","https://www.reuters.com/world/indonesia-wants-join-brics-ministry-says-2024-10-25/"],["Relasi Rusia","Prabowo bertemu Putin dan membahas kerja sama strategis, pertahanan, energi, dan pendidikan.","https://www.reuters.com/world/china/putin-meets-indonesias-prabowo-russia-bid-deepen-ties-2025-06-19/"]],"teaser":"KoperasiMasukBarak","arc":"diplomacy","discussion":{"good":"respons ini benar-benar menjawab lawatan luar negeri dan arah politik luar negeri dan membuka agenda, kesepakatan, biaya perjalanan, dan tindak lanjut","bad":"isu lawatan luar negeri dan arah politik luar negeri dialihkan ke tuduhan tidak patriotik atau terlalu pro-blok tertentu tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang menunggu manfaat diplomasi di dalam negeri"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"kopdes","title":"#KoperasiMasukBarak","avatar":"🪖","npc":"Komandan Latsar Koperasi","handle":"@merahputihpushup","post":"Pengelola Kopdes Merah Putih diminta ikut latsar bernuansa militer. Pemerintah bilang disiplin dan karakter; warga bertanya kenapa manajer koperasi perlu merayap di lumpur untuk membaca arus kas. Kabar insiden peserta wajib diverifikasi, bukan dijadikan punchline.","lesson":"Pelatihan publik harus relevan, aman, transparan, dan punya pertanggungjawaban ketika ada insiden. Jangan mengubah klaim belum terverifikasi menjadi fakta.","weak":["transparency","data","empathy"],"resist":["patriot","meme"],"heat":82,"month":"JUNI 2025","status":"ARSIP POLITIK 2025","subject":"Kopdes Merah Putih dan latsar bernuansa militer","document":"kurikulum, standar keselamatan, anggaran, dan laporan insiden","people":"pengelola koperasi, keluarga peserta, dan warga desa","counter":"narasi disiplin nasional","stage":"desa, pusat latihan, dan rapat koperasi","facts":[["Catatan verifikasi","Game memperlakukan kabar kematian atau insiden latsar sebagai klaim yang memerlukan sumber primer. Dialog dramatisnya adalah fiksi-komposit.",""]],"teaser":"HukumMasukWarRoom","arc":"kopdes","discussion":{"good":"respons ini benar-benar menjawab Kopdes Merah Putih dan latsar bernuansa militer dan membuka kurikulum, standar keselamatan, anggaran, dan laporan insiden","bad":"isu Kopdes Merah Putih dan latsar bernuansa militer dialihkan ke narasi disiplin nasional tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada pengelola koperasi, keluarga peserta, dan warga desa"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"lawfare","title":"#HukumMasukWarRoom","avatar":"⚖️","npc":"Bang Akbar Pasal Tanpa Sensor & Mbak Dakwaan Trending","handle":"@pasaljadikonten","post":"Perkara politik masuk podcast. Bang Akbar Pasal menaruh pertanyaan di meja, mengunci pintu metaforis, lalu menunggu narasumber berhenti menjawab “kita lihat proses hukum”. Klip paling viral justru saat semua orang minum.","lesson":"Wawancara politik yang keras tetap perlu memisahkan dakwaan, pembelaan, bukti persidangan, putusan, dan spekulasi mengenai motif.","weak":["law","data","context"],"resist":["attack","meme"],"heat":88,"month":"JULI 2025","status":"ARSIP POLITIK 2025","subject":"perkara hukum politik dan wawancara tanpa sensor","document":"surat dakwaan, pembelaan, bukti persidangan, putusan, serta hak jawab","people":"terdakwa, saksi, keluarga, partai, dan publik yang berhak pada proses adil","counter":"drama studio dan potongan ekspresi tanpa dokumen","stage":"pengadilan, KPK, dan war room partai","teaser":"AbolisiAmnestiDanTombolReset","arc":"lawfare","facts":[],"discussion":{"good":"respons ini benar-benar menjawab perkara Mas Hasta La Vista dan Om Tomat Neraca dan membuka dakwaan, pembelaan, putusan, dan indikator independensi","bad":"isu perkara Mas Hasta La Vista dan Om Tomat Neraca dialihkan ke rekam jejak partai atau pemerintahan lama tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada terdakwa, saksi, korban, dan publik"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"clemency","title":"#AbolisiAmnestiDanTombolReset","avatar":"🕊️","npc":"Pak Persatuan Nasional","handle":"@maafkandemiadem","post":"Abolisi dan amnesti untuk Mas Hasta La Vista dan Om Tomat Neraca dijual sebagai rekonsiliasi. Pendukung lega, pengkritik bertanya apakah hukum sekarang punya tombol undo di meja politik.","lesson":"Kewenangan pengampunan sah secara konstitusional, tetapi penggunaannya perlu alasan publik dan konsistensi agar tidak merusak kepastian hukum.","weak":["law","transparency"],"resist":["patriot","whatabout"],"heat":78,"month":"AGUSTUS 2025","status":"ARSIP POLITIK 2025","subject":"abolisi dan amnesti perkara politik","document":"keputusan presiden, pertimbangan DPR, dan status perkara","people":"terpidana, korban, penegak hukum, dan publik","counter":"kasus serupa dari kubu lain","stage":"Istana, DPR, dan pengadilan","teaser":"TunjanganDPRJadiBensin","arc":"clemency","facts":[],"discussion":{"good":"respons ini benar-benar menjawab abolisi dan amnesti perkara politik dan membuka keputusan presiden, pertimbangan DPR, dan status perkara","bad":"isu abolisi dan amnesti perkara politik dialihkan ke kasus serupa dari kubu lain tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada terpidana, korban, penegak hukum, dan publik"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"august","title":"#TunjanganDPRJadiBensin","avatar":"🏍️","npc":"Mbak Puanorama Senayan, Bang Ojol, dan DPR yang Mendadak Dengar","handle":"@rumahdinaskita","post":"Tunjangan DPR jadi bensin protes. Mbak Puanorama datang sebagai ketua lembaga, elite partai, dan oposisi yang tetap punya palu sidang. Warga bingung: ini kritik dari luar kekuasaan atau kekuasaan lagi mengkritik ruangan sebelah?","lesson":"Akuntabilitas parlemen harus dilihat melalui keputusan anggaran, fungsi pengawasan, respons terhadap kekerasan, konflik kepentingan, dan tindak lanjut kelembagaan.","weak":["empathy","law"],"resist":["attack"],"heat":92,"month":"SEPTEMBER 2025","status":"ARSIP POLITIK 2025","subject":"tunjangan DPR, protes jalanan, dan oposisi di dalam lembaga negara","document":"rincian tunjangan, risalah rapat, keputusan pimpinan DPR, dan hasil penyelidikan","people":"pengemudi ojol, demonstran, keluarga korban, dan pembayar pajak","counter":"gestur simbolik tanpa perubahan keputusan","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"TujuhBelasTambahDelapan","arc":"august","facts":[["Ketua DPR dan kekuasaan legislatif","Ketua DPR berasal dari partai besar di luar kabinet dan tetap memegang pengaruh legislatif yang kuat.","https://en.wikipedia.org/wiki/Puan_Maharani"]],"discussion":{"good":"respons ini benar-benar menjawab TunjanganDPRJadiBensin dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu TunjanganDPRJadiBensin dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"seventeen","title":"#TujuhBelasTambahDelapan","avatar":"📋","npc":"Koalisi Kreator Warga","handle":"@deadlinepublik","post":"Aktivis, serikat, mahasiswa, dan figur digital merangkum ratusan keresahan menjadi 17 tuntutan cepat dan 8 reformasi jangka lebih panjang. Pemerintah menemukan bahwa PDF juga bisa trending.","lesson":"Tuntutan publik perlu dilacak berdasarkan institusi penanggung jawab, tenggat, bukti pelaksanaan, dan ruang negosiasi.","weak":["network","data"],"resist":["meme"],"heat":84,"month":"OKTOBER 2025","status":"ARSIP POLITIK 2025","subject":"TujuhBelasTambahDelapan","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"SumatraBanjirPLNIkutHanyut","arc":"seventeen","facts":[],"discussion":{"good":"respons ini benar-benar menjawab TujuhBelasTambahDelapan dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu TujuhBelasTambahDelapan dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"disaster","title":"#SumatraBanjirPLNIkutHanyut","avatar":"🌊","npc":"Mbak Posko Tanpa Sinyal","handle":"@sumatrabutuhakses","post":"Banjir bandang dan longsor memutus jalan, listrik, dan komunikasi di Sumatra. Pejabat unggah rapat koordinasi; warga unggah jembatan putus pakai sisa baterai 3%. PLN bilang pemulihan bertahap, air bilang jadwalnya nggak konsultasi.","lesson":"Bencana menguji mitigasi, tata ruang, lingkungan, kesiapan listrik, transparansi korban, dan koordinasi bantuan—bukan kompetisi foto rompi.","weak":["empathy","data","network"],"resist":["endorse","meme"],"heat":98,"month":"NOVEMBER 2025","status":"ARSIP POLITIK 2025","subject":"banjir bandang Sumatra dan pemadaman listrik","document":"peta risiko, data korban, jadwal pemulihan PLN, dan distribusi bantuan","people":"korban banjir, petugas lapangan, dan wilayah terisolasi","counter":"narasi bencana murni alam tanpa faktor kebijakan","stage":"Sumatra, posko, gardu, dan pusat komando","teaser":"KotakMakanMasukRuangKrisis","arc":"disaster","facts":[],"discussion":{"good":"respons ini benar-benar menjawab banjir bandang Sumatra dan pemadaman listrik dan membuka peta risiko, data korban, jadwal pemulihan PLN, dan distribusi bantuan","bad":"isu banjir bandang Sumatra dan pemadaman listrik dialihkan ke narasi bencana murni alam tanpa faktor kebijakan tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada korban banjir, petugas lapangan, dan wilayah terisolasi"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"mbg","title":"#KotakMakanMasukRuangKrisis","avatar":"🤢","npc":"Mbak Orang Tua Grup Kelas","handle":"@bekaljanganeksperimen","post":"Laporan keracunan dan masalah dapur MBG menumpuk. Pemerintah bilang evaluasi berjalan; kontraktor bilang sesuai prosedur; orang tua bilang anaknya bukan beta tester kebijakan.","lesson":"Keselamatan pangan memerlukan pelaporan insiden terbuka, penelusuran vendor, penghentian sementara bila perlu, kompensasi, dan koreksi desain.","weak":["empathy","data","transparency"],"resist":["patriot","meme"],"heat":92,"month":"DESEMBER 2025","status":"ARSIP POLITIK 2025","subject":"insiden keamanan pangan dalam MBG","document":"laporan keracunan, hasil laboratorium, kontrak vendor, dan tindakan koreksi","people":"murid, keluarga, guru, dan pekerja dapur","counter":"jumlah porsi sukses secara nasional","stage":"sekolah, rumah sakit, dapur, dan badan gizi","teaser":"LaptopMasukPengadilan","arc":"mbg","facts":[],"discussion":{"good":"respons ini benar-benar menjawab insiden keamanan pangan dalam MBG dan membuka laporan keracunan, hasil laboratorium, kontrak vendor, dan tindakan koreksi","bad":"isu insiden keamanan pangan dalam MBG dialihkan ke jumlah porsi sukses secara nasional tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada murid, keluarga, guru, dan pekerja dapur"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}}]},{"name":"2026: TEKANAN EKONOMI, RUANG SIPIL, DAN TAHUN YANG BELUM SELESAI","period":"JAN–DES 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","bRank":"Strategis Komunikasi Krisis","aRank":"Aktivis Nasional & Watchdog Digital","bMentor":["💼","Pak Purba-Yey, Pak Bahlul Serba Bisa & Narasi Bersama Konsultan","Angka, energi, dan narasi diminta tumbuh bersamaan. Bila tidak, definisi pertumbuhan akan diperluas.","Data ekonomi dan crisis spin mendapat bonus, tetapi manipulasi lebih mahal."],"aMentor":["📱","Ferry Ir-Why-Nih, Raymond Cuan-Check & Jaringan BEM","Satu membawa reach, satu membawa spreadsheet, satu membawa massa. Semua membawa risiko personal brand.","Data, fundraising, dan organisasi lintas platform terbuka."],"days":[{"key":"nadiem","title":"#LaptopMasukPengadilan","avatar":"💻","npc":"Mas Edukasi Unicorn","handle":"@kelasjadiberkas","post":"Kasus pengadaan laptop menyeret Mas Nadim Makaroni ke pengadilan. Jaksa bicara kerugian negara; pembela bicara kebijakan, inovasi, dan kriminalisasi keputusan. Alumni startup mendadak belajar beda pitch deck dan berkas perkara.","lesson":"Nilai perkara dari dakwaan, bukti niat dan keuntungan, proses pengadaan, pembelaan, serta standar kriminalisasi kebijakan.","weak":["law","data","context"],"resist":["attack","meme"],"heat":86,"month":"JANUARI 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"perkara pengadaan laptop dan Mas Nadim Makaroni","document":"dakwaan, kontrak pengadaan, audit kerugian, dan pembelaan","people":"murid, guru, vendor, terdakwa, dan pembayar pajak","counter":"kegagalan pendidikan pemerintahan lain","stage":"pengadilan, sekolah, dan timeline startup","teaser":"IHSGTerjunAdminTetapHijau","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab perkara pengadaan laptop dan Mas Nadim Makaroni dan membuka dakwaan, kontrak pengadaan, audit kerugian, dan pembelaan","bad":"isu perkara pengadaan laptop dan Mas Nadim Makaroni dialihkan ke kegagalan pendidikan pemerintahan lain tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada murid, guru, vendor, terdakwa, dan pembayar pajak"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"market","title":"#IHSGTerjunAdminTetapHijau","avatar":"📉","npc":"Feri Latih-Hitung, Yanuar Risky Banget & Pak Grafik Optimistis","handle":"@fundamentalkuatbanget","post":"IHSG merah. Juru bicara bilang fundamental hijau. Feri Latih-Hitung menghitung arus modal sampai kalkulator minta cuti; Yanuar Risky Banget bertanya siapa menanggung risiko kalau dashboard cuma diberi filter “optimistis”.","lesson":"Pergerakan pasar perlu dibaca bersama arus modal, suku bunga, laba, valuasi, kebijakan fiskal, tata kelola, dan sentimen global—bukan warna satu hari.","weak":["data","transparency","context"],"resist":["meme","patriot"],"heat":88,"month":"FEBRUARI 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"IHSG anjlok, capital outflow, dan kepercayaan investor","document":"data perdagangan bursa, arus modal asing, yield obligasi, valuasi, dan kebijakan fiskal","people":"investor ritel, pekerja, dana pensiun, UMKM, dan rumah tangga yang terkena transmisi ekonomi","counter":"satu grafik hijau dari periode pilihan","stage":"BEI, BI, Kemenkeu, dan grup saham","teaser":"DiplomasiSeribuBandara","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab penurunan IHSG dan kepercayaan investor dan membuka arus dana asing, outlook rating, kebijakan pasar, dan data transparansi","bad":"isu penurunan IHSG dan kepercayaan investor dialihkan ke gejolak pasar global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada pekerja, investor ritel, dana pensiun, dan perusahaan"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"diplomacy","title":"#DiplomasiSeribuBandara","avatar":"✈️","npc":"Menlu Sunyi Gono-Gini & Om Diplo Peta Dunia","handle":"@bebasaktif_tanyahasil","post":"Pak Gemoyono kembali keliling dunia: forum damai, pertahanan, investasi, karpet merah. Menlu Sunyi Gono-Gini bilang bebas aktif; Om Diplo bilang aktifnya terlihat, hasil bebasnya tolong ditabelkan. Di rumah, harga energi mulai mengetuk pintu.","lesson":"Geopolitik harus menghubungkan posisi moral, kepentingan ekonomi, ASEAN, BRICS, pertahanan, dan konsekuensi domestik.","weak":["data","context","transparency"],"resist":["patriot","endorse"],"heat":76,"month":"MARET 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"lawatan luar negeri, BRICS, pertahanan, dan manfaat domestik","document":"memorandum, nilai investasi, biaya lawatan, posisi konflik, dan tindak lanjut","people":"diplomat, pekerja, pelaku usaha, dan warga terdampak harga energi","counter":"tuduhan antek Barat atau antek Timur","stage":"BRICS, ASEAN, forum damai, dan bandara","teaser":"ListrikBergilirNarasiNonstop","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab lawatan luar negeri, BRICS, pertahanan, dan manfaat domestik dan membuka memorandum, nilai investasi, biaya lawatan, posisi konflik, dan tindak lanjut","bad":"isu lawatan luar negeri, BRICS, pertahanan, dan manfaat domestik dialihkan ke tuduhan antek Barat atau antek Timur tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada diplomat, pekerja, pelaku usaha, dan warga terdampak harga energi"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"pln","title":"#ListrikBergilirNarasiNonstop","avatar":"💡","npc":"Pak PLN Nanti Menyala","handle":"@terangbertahap","post":"Pemadaman bergilir muncul di beberapa wilayah. Pabrik mengurangi jam, warung beli genset, admin resmi unggah ‘mohon maaf atas ketidaknyamanan’ untuk ketiga kalinya sebelum makan siang.","lesson":"Krisis listrik perlu data kapasitas, pasokan, kontrak, jadwal pemadaman, kompensasi, dan rencana energi—bukan cuma permintaan sabar.","weak":["data","transparency","empathy"],"resist":["meme","whatabout"],"heat":90,"month":"APRIL 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"pemadaman bergilir dan tata kelola PLN","document":"jadwal padam, pasokan pembangkit, kontrak energi, dan kompensasi","people":"rumah tangga, UMKM, rumah sakit, dan pekerja industri","counter":"cuaca ekstrem atau warisan jaringan lama","stage":"gardu, ruang kontrol, warung, dan pabrik","teaser":"RupiahMasukAnginDolarTidakKenalDesa","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab pemadaman bergilir dan tata kelola PLN dan membuka jadwal padam, pasokan pembangkit, kontrak energi, dan kompensasi","bad":"isu pemadaman bergilir dan tata kelola PLN dialihkan ke cuaca ekstrem atau warisan jaringan lama tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada rumah tangga, UMKM, rumah sakit, dan pekerja industri"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"rupiah","title":"#RupiahMasukAnginDolarTidakKenalDesa","avatar":"💸","npc":"Om Gita Wacana-Wira, Feri Latih-Hitung & Pak Purba-Yey","handle":"@kalkulatortanparem","post":"Rupiah melemah. Om Gita Wacana-Wira membuka obrolan dua jam tentang produktivitas, kualitas institusi, dan long game. Feri Latih-Hitung memotong: long game boleh, tapi importir bayar dolarnya Jumat ini. Pak Purba-Yey mengganti baseline sebelum kopi dingin.","lesson":"Nilai tukar dipengaruhi faktor global dan domestik. Dampaknya harus diuji pada impor, inflasi, utang valas, kepercayaan pasar, cadangan devisa, dan respons kebijakan.","weak":["data","context","empathy"],"resist":["patriot","meme"],"heat":100,"month":"MEI 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"rupiah melemah, daya beli, dan kredibilitas kebijakan ekonomi","document":"kurs, cadangan devisa, inflasi impor, neraca pembayaran, intervensi BI, dan asumsi APBN","people":"rumah tangga, pekerja, importir, industri, mahasiswa luar negeri, dan pemegang utang valas","counter":"klaim bahwa warga desa tidak menggunakan dolar","stage":"pasar valuta, warung desa, BI, dan podium presiden","facts":[["Rupiah rekor lemah","Pada 18 Mei 2026 rupiah jatuh ke rekor 17.670 per dolar dan IHSG turun sekitar 2%; Prabowo meremehkan dampak harian pada warga desa.","https://www.reuters.com/world/asia-pacific/indonesia-rupiah-hits-new-record-low-president-downplays-day-to-day-impact-2026-05-18/"]],"teaser":"MenujuIndonesiaBangkrut","arc":"fiksi-prediktif","discussion":{"good":"respons ini benar-benar menjawab rupiah melemah dan IHSG jatuh dan membuka kurs, cadangan devisa, intervensi BI, arus modal, dan harga impor","bad":"isu rupiah melemah dan IHSG jatuh dialihkan ke perang global dan spekulan asing tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga desa, UMKM, pekerja, importir, dan konsumen"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"protest","title":"#MenujuIndonesiaBangkrut","avatar":"📢","npc":"Fatima Footnote & BEM UI","handle":"@farahbacapdf","post":"Fatima Footnote membawa pernyataan sikap “Menuju Indonesia Bangkrut” ke timeline. Pemerintah menjawab dengan rasio, pertumbuhan, dan cadangan devisa; mahasiswa membalas dengan rupiah, PHK, harga pangan, biaya kuliah, ruang sipil, serta pertanyaan sederhana: angka makro ini tinggal serumah dengan siapa?","lesson":"“Indonesia Bangkrut” adalah slogan politik, bukan diagnosis insolvensi. Kritik yang kuat harus membedakan negara, APBN, daya beli warga, pasar kerja, kurs, utang, dan distribusi beban.","weak":["data","network","empathy"],"resist":["attack","patriot"],"heat":100,"month":"JUNI 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"protes mahasiswa tentang tekanan ekonomi dan belanja negara","document":"APBN, harga pokok, subsidi, biaya MBG, dan belanja pertahanan","people":"mahasiswa, pekerja muda, keluarga kelas menengah, pencari kerja, dan warga yang merasakan harga naik","counter":"angka pertumbuhan agregat","stage":"kampus, jalan raya, ruang fiskal, dan kolom komentar yang mendadak jadi kelas ekonomi","facts":[["Protes mahasiswa 2026","AP melaporkan demonstrasi tentang kenaikan harga, rupiah, program mahal, dan peran militer; ‘bangkrut’ adalah slogan politik, bukan status insolvensi resmi.","https://apnews.com/article/fc758948bc547075d62bcf80d8a7e827"]],"teaser":"DapurBergiziMasukRuangPenyidikan","arc":"fiksi-prediktif","discussion":{"good":"respons ini membedakan slogan politik dari indikator ekonomi serta menjawab data dan tuntutan yang dirapikan Fatima Footnote dan mahasiswa","bad":"kritik soal rupiah, PHK, harga, pendidikan, dan ruang sipil dibalas cuma dengan mengejek pilihan kata “bangkrut”","neutral":"bandingkan data makro dengan kondisi rumah tangga, sumber anggaran, distribusi beban, dan tuntutan yang benar-benar bisa dievaluasi"},"jokes":{"bapak":"Kalau ekonomi sehat, tolong kasih tahu dompet saya. Dia sejak Lebaran statusnya masih rawat jalan.","genz":"Fatima Footnote bawa PDF 18 halaman, akun centang biru jawab pakai meme “tetap optimis”. academic comeback siapa nih 😭","emak":"Grafik boleh hijau, Nak. Cabai saya tetap merah dan harganya ikut naik darah."}},{"key":"mbg","title":"#DapurBergiziMasukRuangPenyidikan","avatar":"🚔","npc":"Mbak Audit Kotak Makan","handle":"@porsinyadihitungulang","post":"Penyidikan korupsi MBG membesar; kepala program diganti dan publik mencari tahu berapa porsi makan yang berubah jadi porsi fee. Di saat yang sama Mas Nadim Makaroni divonis. Timeline kehabisan tab.","lesson":"Pisahkan perkara pidana, kegagalan tata kelola, manfaat program, dan hak banding. Tujuan sosial tidak kebal audit, tetapi skandal juga tidak otomatis membatalkan tujuan sosial.","weak":["data","law","transparency"],"resist":["patriot","whatabout"],"heat":100,"month":"JULI 2026","status":"FAKTA S.D. JULI • FIKSI SESUDAHNYA","subject":"dugaan korupsi MBG dan vonis Mas Nadim Makaroni","document":"berkas penyidikan MBG, putusan Mas Nadim Makaroni, anggaran, dan kontrak","people":"murid, terdakwa, pembayar pajak, dan warga","counter":"kasus korupsi pemerintahan lama","stage":"KPK, pengadilan, dapur, dan DPR","facts":[["Vonis Mas Nadim Makaroni","Mas Nadim Makaroni divonis 10 tahun pada 30 Juni 2026; ia membantah dan menyatakan perkara bermotif politik.","https://www.reuters.com/legal/government/indonesias-makarim-gojek-founder-former-minister-found-guilty-graft-2026-06-30/"],["Tekanan program MBG","Demonstrasi Juni 2026 menyinggung biaya besar program MBG dan penyelidikan korupsi.","https://apnews.com/article/fc758948bc547075d62bcf80d8a7e827"]],"teaser":"RudalDatangKontenMenyusul","arc":"fiksi-prediktif","discussion":{"good":"respons ini benar-benar menjawab dugaan korupsi MBG dan vonis Mas Nadim Makaroni dan membuka berkas penyidikan MBG, putusan Mas Nadim Makaroni, anggaran, dan kontrak","bad":"isu dugaan korupsi MBG dan vonis Mas Nadim Makaroni dialihkan ke kasus korupsi pemerintahan lama tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada murid, terdakwa, pembayar pajak, dan warga"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"defense2026","title":"#RudalDatangKontenMenyusul","avatar":"🚀","npc":"Pak Diplomasi Supersonik","handle":"@goldenchapter","post":"Kesepakatan pertahanan dengan India dipresentasikan sebagai bab emas. Timeline membahas kecanggihan rudal; parlemen seharusnya membahas kebutuhan, biaya, strategi, dan pengawasan.","lesson":"Pengadaan pertahanan perlu kebutuhan strategis, transparansi yang sesuai keamanan, biaya siklus hidup, dan pengawasan sipil.","weak":["budget","law"],"resist":["patriot"],"heat":74,"month":"AGUSTUS 2026","status":"TIMELINE ALTERNATIF","subject":"RudalDatangKontenMenyusul","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DeadlineTuntutanSatuTahun","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab RudalDatangKontenMenyusul dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu RudalDatangKontenMenyusul dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"seventeen","title":"#DeadlineTuntutanSatuTahun","avatar":"⏳","npc":"Mbak Tracker 17+8","handle":"@belumcentang","post":"Tenggat reformasi jangka panjang 17+8 mendekat. Sebagian janji punya rapat, sebagian punya draf, sebagian hanya punya foto pertemuan.","lesson":"Akuntabilitas menuntut indikator, dokumen, tenggat, penanggung jawab, dan penilaian independen.","weak":["data","network"],"resist":["whatabout"],"heat":79,"month":"SEPTEMBER 2026","status":"TIMELINE ALTERNATIF","subject":"DeadlineTuntutanSatuTahun","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"ReshuffleMusimKemarau","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab DeadlineTuntutanSatuTahun dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu DeadlineTuntutanSatuTahun dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future","title":"#ReshuffleMusimKemarau","avatar":"🔄","npc":"Mas Bocoran Kabinet","handle":"@sumberlingkaran","post":"tekanan fiskal dan performa program memicu rumor reshuffle. Semua menteri mendadak lebih sering turun ke pasar dan mengunggah grafik hijau.","lesson":"Rumor bukan fakta. Nilai perubahan pejabat hanya setelah keputusan, mandat, dan kebijakan dapat diverifikasi.","weak":["context","transparency"],"resist":["attack"],"heat":70,"month":"OKTOBER 2026","status":"TIMELINE ALTERNATIF","subject":"ReshuffleMusimKemarau","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"AIJadiJuruBicaraBayangan","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab ReshuffleMusimKemarau dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu ReshuffleMusimKemarau dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future","title":"#AIJadiJuruBicaraBayangan","avatar":"🤖","npc":"Bot-Setyo Generasi Dua","handle":"@suaranyaasli","post":"video sintetis pejabat dan aktivis beredar lebih cepat daripada klarifikasi. Setiap kubu memiliki forensik sendiri dan standar bukti yang berbeda.","lesson":"Verifikasi media sintetis memerlukan sumber asal, metadata, konfirmasi pihak terkait, dan pelabelan yang dapat diaudit.","weak":["data","context"],"resist":["meme"],"heat":86,"month":"NOVEMBER 2026","status":"TIMELINE ALTERNATIF","subject":"AIJadiJuruBicaraBayangan","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"TahunDitutupDenganKoreksiHalus","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab AIJadiJuruBicaraBayangan dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu AIJadiJuruBicaraBayangan dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future","title":"#TahunDitutupDenganKoreksiHalus","avatar":"📊","npc":"Mas Hendro Satir-IO & Pak Grafik Revisi","handle":"@baselinebaru","post":"Tahun ditutup dengan survei kepercayaan yang hasilnya tergantung siapa yang pesan, kapan wawancara dilakukan, dan apakah responden baru selesai lihat harga cabai. Mas Hendro Satir-IO bilang suhu publik turun-naik; netizen bertanya termometernya merek apa.","lesson":"Survei opini perlu membaca metodologi, pembiayaan, wording pertanyaan, waktu pengambilan data, nonresponse, dan perbedaan antara popularitas serta kinerja.","weak":["transparency","data"],"resist":["patriot"],"heat":75,"month":"DESEMBER 2026","status":"TIMELINE ALTERNATIF","subject":"survei kepercayaan, koreksi kebijakan, dan mood publik","document":"kuesioner, sampel, sponsor, tanggal survei, margin of error, dan data mentah","people":"warga yang sering dijadikan persentase lalu dilupakan sebagai manusia","counter":"satu angka approval tanpa metodologi","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DanantaraPunyaNegaraAtauNegaraPunyaDanantara","arc":"fiksi-prediktif","facts":[],"discussion":{"good":"respons ini benar-benar menjawab TahunDitutupDenganKoreksiHalus dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu TahunDitutupDenganKoreksiHalus dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}}]},{"name":"2027: NEGARA KORPORASI, WARGA KONSORSIUM","period":"JAN–DES 2027","status":"TIMELINE ALTERNATIF","bRank":"Arsitek Narasi Pembangunan","aRank":"Direktur Koalisi Masyarakat Sipil","bMentor":["🏦","Pak Danan-Tara Semesta","Semua aset diminta bersinergi, semua kritik diminta memahami horizon investasi tiga puluh tahun.","Spectacle ekonomi dan data resmi lebih kuat."],"aMentor":["🧠","Raymond Cuan-Check, Andhyta Uta-Mikir & Prof. Uceng Monitor","Spreadsheet, kebijakan, dan konflik kepentingan berkumpul dalam satu ruang yang kopi filternya habis.","Audit investasi, anggaran, dan jejaring korporasi terbuka."],"days":[{"key":"future2027","title":"#DanantaraPunyaNegaraAtauNegaraPunyaDanantara","avatar":"🏦","npc":"Yanuar Risky Banget, Prof. Renal Disrupsi & Pak Danan-Tara Semesta","handle":"@asetbersinergi","post":"Superholding negara masuk tahun baru dengan aset besar dan kalimat lebih besar. Yanuar Risky Banget membuat peta risiko; Prof. Renal Disrupsi bilang organisasi harus berubah sebelum perubahan mengubah organisasi. Karyawan cuma nanya: gaji bulan depan masuk dari rekening yang mana?","lesson":"Pengelolaan aset negara perlu diuji melalui mandat hukum, tata kelola, risiko fiskal, transparansi, kompetensi, audit, dan hubungan dengan APBN.","weak":["data","law"],"resist":["patriot"],"heat":71,"month":"JANUARI 2027","status":"TIMELINE ALTERNATIF","subject":"Danantara, konsolidasi aset negara, dan risiko tata kelola","document":"mandat hukum, struktur kepemilikan, laporan keuangan, komite risiko, audit, dan kebijakan investasi","people":"pekerja BUMN, pembayar pajak, penerima layanan publik, dan generasi yang menanggung risiko jangka panjang","counter":"ukuran aset sebagai pengganti kualitas tata kelola","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KelasMenengahTurunKelas","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini menghubungkan tata kelola Danantara dan konsentrasi aset negara dengan bukti dan konsekuensi dari fase sebelumnya","bad":"tata kelola Danantara dan konsentrasi aset negara dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#KelasMenengahTurunKelas","avatar":"🛒","npc":"Mbak Cicilan Nasional","handle":"@gajibelumupdate","post":"pertumbuhan kembali, tetapi pekerjaan formal dan daya beli tidak pulih merata. Pemerintah merayakan rata-rata; rumah tangga hidup di median.","lesson":"Gunakan distribusi pendapatan, pekerjaan, harga, dan layanan, bukan satu angka agregat.","weak":["data","empathy"],"resist":["meme"],"heat":76,"month":"FEBRUARI 2027","status":"TIMELINE ALTERNATIF","subject":"KelasMenengahTurunKelas","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"JenderalJadiCEOProgram","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab KelasMenengahTurunKelas dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu KelasMenengahTurunKelas dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#JenderalJadiCEOProgram","avatar":"🪖","npc":"Kolonel KPI","handle":"@komandotarget","post":"keberhasilan operasi pangan mendorong penempatan lebih banyak figur keamanan dalam proyek sipil. Setiap masalah mendapat seragam dan dashboard.","lesson":"Efektivitas tidak menggantikan akuntabilitas sipil, pembagian kewenangan, dan mekanisme keluhan.","weak":["law","context"],"resist":["patriot"],"heat":83,"month":"MARET 2027","status":"TIMELINE ALTERNATIF","subject":"JenderalJadiCEOProgram","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"IbuKotaMasihLoading","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab JenderalJadiCEOProgram dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu JenderalJadiCEOProgram dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#PLNBeliBateraiNegaraBeliWaktu","avatar":"🏗️","npc":"Mas Progres DelapanPuluhPersen","handle":"@renderlebihhijau","post":"pembangunan ibu kota baru berjalan bertahap. Foto drone menunjukkan gedung; warga sekitar menanyakan tanah, layanan, dan representasi.","lesson":"Mega-proyek harus dinilai dari biaya, manfaat, hak masyarakat, lingkungan, dan tata kelola.","weak":["budget","empathy"],"resist":["meme"],"heat":74,"month":"APRIL 2027","status":"TIMELINE ALTERNATIF","subject":"reformasi ketahanan energi setelah pemadaman","document":"peta jaringan, tender baterai, target layanan, dan kompensasi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"AgamaMasukBriefKampanyeDini","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini menghubungkan reformasi ketahanan energi setelah pemadaman dengan bukti dan konsekuensi dari fase sebelumnya","bad":"reformasi ketahanan energi setelah pemadaman dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#AgamaMasukBriefKampanyeDini","avatar":"🕌","npc":"Ustaz Feli-Xi-Auw","handle":"@dalildanalgoritma","post":"isu identitas dan moral kembali dipakai untuk membangun basis jauh sebelum kampanye resmi. Konten dakwah, kritik demokrasi, dan branding politik bertemu di feed yang sama.","lesson":"Bedakan kebebasan beragama, argumen politik, ujaran kebencian, dan mobilisasi identitas.","weak":["context","empathy"],"resist":["attack"],"heat":85,"month":"MEI 2027","status":"TIMELINE ALTERNATIF","subject":"AgamaMasukBriefKampanyeDini","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"TambangHijauLogoBaru","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab AgamaMasukBriefKampanyeDini dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu AgamaMasukBriefKampanyeDini dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#GlobalSouthTapiTetanggaDulu","avatar":"⛏️","npc":"Om Gita Wacana-Wira, Om Diplo Peta Dunia & Menlu Sunyi Gono-Gini","handle":"@tetanggadulubang","post":"pemerintah menjual kepemimpinan Global South, kandidat oposisi menjual ASEAN-first, dan podcast menjual durasi dua jam. Om Gita bertanya soal long game, Om Diplo minta strategic payoff, Menlu Sunyi bilang posisi Indonesia jelas—detailnya sedang transit.","lesson":"Uji politik luar negeri dari tujuan, leverage, konsistensi ASEAN, biaya, posisi pada konflik, dan hasil domestik yang bisa ditagih.","weak":["data","context","transparency"],"resist":["patriot","whatabout"],"heat":80,"month":"JUNI 2027","status":"TIMELINE ALTERNATIF","subject":"kepemimpinan Global South versus prioritas ASEAN","document":"posisi resmi, hasil forum, anggaran diplomasi, dan kepentingan domestik","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"RUUPerampasanAsetEpisodeLagi","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini menghubungkan kepemimpinan Global South versus prioritas ASEAN dengan bukti dan konsekuensi dari fase sebelumnya","bad":"kepemimpinan Global South versus prioritas ASEAN dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#RUUPerampasanAsetEpisodeLagi","avatar":"📜","npc":"Pak Naskah Berulang","handle":"@segeradibahas","post":"rancangan perampasan aset kembali menjadi prioritas setelah skandal besar. Semua pihak setuju secara prinsip dan berbeda pada kalender.","lesson":"Nilai substansi, due process, pengawasan, beban pembuktian, dan kemajuan legislasi nyata.","weak":["law","data"],"resist":["whatabout"],"heat":77,"month":"JULI 2027","status":"TIMELINE ALTERNATIF","subject":"RUUPerampasanAsetEpisodeLagi","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"BanjirDatangAnggaranBerpindah","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab RUUPerampasanAsetEpisodeLagi dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu RUUPerampasanAsetEpisodeLagi dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#BanjirDatangAnggaranBerpindah","avatar":"🌊","npc":"Bu Cuaca Ekstrem","handle":"@bukanbencanabiasa","post":"bencana iklim memaksa realokasi anggaran. Pemerintah menyalahkan cuaca; warga menunjukkan izin dan peta tata ruang.","lesson":"Bencana merupakan interaksi bahaya alam, kerentanan, tata ruang, kesiapsiagaan, dan kebijakan.","weak":["data","empathy"],"resist":["patriot"],"heat":82,"month":"AGUSTUS 2027","status":"TIMELINE ALTERNATIF","subject":"BanjirDatangAnggaranBerpindah","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"PartaiMulaiTesOmbak","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab BanjirDatangAnggaranBerpindah dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu BanjirDatangAnggaranBerpindah dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#PartaiMulaiTesOmbak","avatar":"🏄","npc":"Mas Kandidat Belum Kandidat","handle":"@sekadarsilaturahmi","post":"tokoh mulai keliling daerah tanpa menyebut pemilu. Baliho menyebut silaturahmi dengan ukuran nama dua meter.","lesson":"Pra-kampanye perlu transparansi pembiayaan, penggunaan fasilitas, dan batas kegiatan resmi.","weak":["transparency","law"],"resist":["meme"],"heat":70,"month":"SEPTEMBER 2027","status":"TIMELINE ALTERNATIF","subject":"PartaiMulaiTesOmbak","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"InfluencerMasukDewanPakar","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab PartaiMulaiTesOmbak dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu PartaiMulaiTesOmbak dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#InfluencerMasukDewanPakar","avatar":"🎬","npc":"Raymond Cuan-Check","handle":"@valuasikebijakan","post":"influencer ekonomi diminta menjelaskan program negara. Satu video mengubah APBN menjadi tiga grafik dan satu sponsor yang diletakkan sangat kecil.","lesson":"Penyederhanaan membantu, tetapi kepentingan, asumsi, sumber, dan keterbatasan harus jelas.","weak":["data","transparency"],"resist":["attack"],"heat":73,"month":"OKTOBER 2027","status":"TIMELINE ALTERNATIF","subject":"kooptasi influencer dan profesionalisasi propaganda","document":"surat tugas, honor, sponsor, dan konflik kepentingan","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"AktivisMenjadiMerekDagang","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini menghubungkan kooptasi influencer dan profesionalisasi propaganda dengan bukti dan konsekuensi dari fase sebelumnya","bad":"kooptasi influencer dan profesionalisasi propaganda dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#AktivisMenjadiMerekDagang","avatar":"📱","npc":"Ferry Ir-Why-Nih Prime","handle":"@linkdonasidibio","post":"gerakan tumbuh bersama personal brand. Dana terkumpul cepat; keputusan organisasi semakin tergantung pada satu wajah dan satu kalender konten.","lesson":"Jangkauan figur perlu diimbangi tata kelola dana, distribusi kepemimpinan, dan regenerasi.","weak":["network","transparency"],"resist":["meme"],"heat":79,"month":"NOVEMBER 2027","status":"TIMELINE ALTERNATIF","subject":"AktivisMenjadiMerekDagang","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"OposisiAkhirnyaRapat","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini benar-benar menjawab AktivisMenjadiMerekDagang dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu AktivisMenjadiMerekDagang dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2027","title":"#WarisanJokowiVsKemandirianPrabowo","avatar":"🪑","npc":"Pak Oposisi Baru Ingat","handle":"@checkandbalance","post":"partai di luar kabinet membangun platform bersama. Pertemuan pertama membahas siapa yang duduk di tengah foto.","lesson":"Oposisi efektif memerlukan program alternatif, pengawasan, koalisi isu, dan konsistensi.","weak":["data","network"],"resist":["attack"],"heat":68,"month":"DESEMBER 2027","status":"TIMELINE ALTERNATIF","subject":"perebutan kredit dan beban antara dua era","document":"timeline keputusan, anggaran, hasil program, dan jaringan politik","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KandidatMunculDariPodcast","arc":"proyeksi-2027","facts":[],"discussion":{"good":"respons ini menghubungkan perebutan kredit dan beban antara dua era dengan bukti dan konsekuensi dari fase sebelumnya","bad":"perebutan kredit dan beban antara dua era dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}}]},{"name":"2028: PRA-PEMILU, SEMUA ORANG MENDADAK MERAKYAT","period":"JAN–DES 2028","status":"TIMELINE ALTERNATIF","bRank":"Direktur Kampanye Nasional","aRank":"Tokoh Oposisi, Influencer, dan Pengawas Pemilu","bMentor":["🚀","Mas Samsul Raka Buming-Buming & Pak Deskoordinasi Senyap","Satu berbicara masa depan, satu menghitung kursi masa kini.","Koalisi dan endorsement mencapai level maksimum."],"aMentor":["🎙️","Mbak Nana Kursi Kosong, Ferry Ir-Why-Nih & Ustaz Feli-Xi-Auw","Jurnalisme, aktivisme digital, dan politik identitas saling menguji batas.","Fact-check, mobilisasi, dan kritik lintas komunitas terbuka."],"days":[{"key":"future2028","title":"#KandidatMunculDariPodcast","avatar":"🎙️","npc":"Bang Akbar Pasal, Om Gita Wacana-Wira & Prof. Renal Disrupsi","handle":"@belumdeklarasi","post":"Kandidat bermunculan dari studio podcast. Bang Akbar mengejar jawaban sampai sponsor minta jeda; Om Gita bertanya tentang long game; Prof. Renal menggambar kurva perubahan. Kandidat menjawab semua dengan “kita harus kolaborasi” dan pulang membawa tiga juta views.","lesson":"Podcast politik dapat memperluas deliberasi jika pertanyaan, data, konflik kepentingan, sponsorship, dan tindak lanjut dibuka secara jelas.","weak":["context","data"],"resist":["meme"],"heat":72,"month":"JANUARI 2028","status":"TIMELINE ALTERNATIF","subject":"audisi kandidat lewat podcast dan ekonomi perhatian","document":"rekam jejak kandidat, transkrip, sumber klaim, disclosure sponsor, dan rencana kebijakan","people":"pemilih yang menerima wawancara panjang tetapi tetap butuh jawaban konkret","counter":"kedekatan host dan kualitas produksi sebagai pengganti program","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KoalisiBubarKarenaKoma","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab KandidatMunculDariPodcast dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu KandidatMunculDariPodcast dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#KoalisiBubarKarenaKoma","avatar":"✍️","npc":"Bu Mega-Watt Merah & Mbak Puanorama Senayan","handle":"@kalimatbelumfinal","post":"Koalisi pecah gara-gara satu koma di deklarasi. Bu Mega-Watt bilang ideologi tidak bisa ditawar, lalu rapat tawar-menawar berlangsung empat jam. Mbak Puanorama memegang palu sidang dan kalkulator kursi. Istana memesan teh tambahan.","lesson":"Hubungan pemerintah dan oposisi perlu dibaca dari posisi kabinet, voting parlemen, agenda legislasi, negosiasi kebijakan, serta akuntabilitas—bukan sekadar foto pertemuan.","weak":["transparency","context"],"resist":["attack"],"heat":78,"month":"FEBRUARI 2028","status":"TIMELINE ALTERNATIF","subject":"oposisi, koalisi, dan negosiasi kekuasaan menjelang pemilu","document":"sikap resmi partai, voting DPR, kesepakatan koalisi, agenda legislasi, dan pembagian posisi","people":"pemilih yang suaranya sering diterjemahkan ulang setelah rapat tertutup","counter":"foto teh hangat sebagai bukti semua konflik selesai","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"IjazahDanFufufafaReuniAkbar","arc":"proyeksi-2028","facts":[["Partai besar di luar kabinet","Sebuah partai besar berada di luar kabinet, sementara ketua umumnya tetap menjadi pusat keputusan dan kader seniornya memimpin DPR. Posisi ini menciptakan relasi oposisi, negosiasi, dan kekuasaan legislatif yang tidak sederhana.","https://en.wikipedia.org/wiki/Indonesian_Democratic_Party_of_Struggle"]],"discussion":{"good":"respons ini benar-benar menjawab KoalisiBubarKarenaKoma dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu KoalisiBubarKarenaKoma dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#IjazahDanFufufafaReuniAkbar","avatar":"👨‍👩‍👦","npc":"Mas Nama Belakang","handle":"@pengalamansejaklahir","post":"kerabat elite tampil sebagai generasi baru dengan logo lebih minimalis. Biografi memulai karier dari titik setelah seluruh akses tersedia.","lesson":"Hak mencalonkan diri harus dibaca bersama kompetisi, sumber daya, konflik kepentingan, dan merit.","weak":["law","data"],"resist":["patriot"],"heat":81,"month":"MARET 2028","status":"TIMELINE ALTERNATIF","subject":"kembalinya kontroversi ijazah dan arsip @fufufafa","document":"dokumen primer, cache, hasil pemeriksaan, bantahan, dan batas atribusi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"AICloneDebatSebelumDebat","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini menghubungkan kembalinya kontroversi ijazah dan arsip @fufufafa dengan bukti dan konsekuensi dari fase sebelumnya","bad":"kembalinya kontroversi ijazah dan arsip @fufufafa dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#AICloneDebatSebelumDebat","avatar":"🧬","npc":"Kandidat Sintetis","handle":"@sayatidakpernahbilang","post":"suara dan wajah kandidat dipakai dalam video palsu sebelum debat resmi. Klarifikasi kalah cepat dari versi remix.","lesson":"Gunakan autentikasi asal, watermarks yang dapat diverifikasi, media independen, dan sanksi proporsional.","weak":["data","context"],"resist":["meme"],"heat":91,"month":"APRIL 2028","status":"TIMELINE ALTERNATIF","subject":"AICloneDebatSebelumDebat","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"UstazEndorsePaketPremium","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab AICloneDebatSebelumDebat dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu AICloneDebatSebelumDebat dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#UstazEndorsePaketPremium","avatar":"🕌","npc":"Ustaz Feli-Xi-Auw","handle":"@politikdanakidah","post":"dukungan tokoh agama diperebutkan. Sebagian membahas etika publik; sebagian menjual kepastian moral untuk pilihan yang sangat duniawi.","lesson":"Nilai argumen kebijakan tanpa merendahkan iman, serta waspadai eksploitasi otoritas keagamaan.","weak":["empathy","context"],"resist":["attack"],"heat":86,"month":"MEI 2028","status":"TIMELINE ALTERNATIF","subject":"UstazEndorsePaketPremium","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"RaymondCuanHitungJanji","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab UstazEndorsePaketPremium dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu UstazEndorsePaketPremium dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#RupiahJadiBahanKampanye","avatar":"🧮","npc":"Feri Latih-Hitung, Yanuar Risky Banget & Om Gita Wacana-Wira","handle":"@kursbukanaura","post":"rupiah dan IHSG masuk materi kampanye. Kandidat A memilih grafik sejak titik terendah, kandidat B memilih sebelum krisis, kandidat C memilih warna hijau. Feri menghitung siapa bayar, Yanuar membuka risk register, Om Gita mengingatkan long game tetap punya cicilan bulanan.","lesson":"Bandingkan kurs, inflasi, upah riil, pekerjaan, arus modal, produktivitas, serta biaya program dengan periode dan metodologi yang sama.","weak":["data","transparency","context"],"resist":["meme","whatabout"],"heat":74,"month":"JUNI 2028","status":"TIMELINE ALTERNATIF","subject":"pemulihan atau kegagalan ekonomi sebagai senjata kampanye","document":"seri kurs, IHSG, inflasi, upah riil, pekerjaan, arus modal, costing program, dan metodologi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"SurveiSeribuLembaga","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini menghubungkan pemulihan atau kegagalan ekonomi sebagai senjata kampanye dengan bukti dan konsekuensi dari fase sebelumnya","bad":"pemulihan atau kegagalan ekonomi sebagai senjata kampanye dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#BebasAktifVersiKandidat","avatar":"📊","npc":"Menlu Sunyi Gono-Gini, Om Diplo Peta Dunia & Om Gita Wacana-Wira","handle":"@bebasaktiftapijelas","post":"semua kandidat mengaku bebas aktif. Satu paling aktif ke BRICS, satu paling bebas dari penjelasan, satu punya peta Indo-Pasifik sampai moderator kehilangan meja. Om Diplo menagih hasil, Om Gita menagih strategi, Menlu Sunyi menagih waktu untuk menjawab lewat jalur diplomatik.","lesson":"Nilai kebijakan luar negeri dari prioritas ASEAN, hubungan major powers, keamanan, perdagangan, hak asasi, biaya lawatan, dan hasil konkret bagi warga.","weak":["data","context","transparency"],"resist":["patriot","attack"],"heat":80,"month":"JULI 2028","status":"TIMELINE ALTERNATIF","subject":"perdebatan BRICS, ASEAN, pertahanan, dan lawatan luar negeri","document":"rekam hasil diplomasi, biaya, posisi konflik, dan dampak ekonomi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"AktivisPecahKarenaCapres","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini menghubungkan perdebatan BRICS, ASEAN, pertahanan, dan lawatan luar negeri dengan bukti dan konsekuensi dari fase sebelumnya","bad":"perdebatan BRICS, ASEAN, pertahanan, dan lawatan luar negeri dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#AktivisPecahKarenaCapres","avatar":"💔","npc":"Kak Koalisi Isu","handle":"@temansebelumendorse","post":"jaringan sipil yang dulu bersatu pada isu kini berpisah karena pilihan kandidat. Grup kerja berubah menjadi grup mute.","lesson":"Gerakan dapat menjaga agenda bersama meski pilihan elektoral berbeda melalui aturan konflik dan tujuan minimum.","weak":["network","empathy"],"resist":["attack"],"heat":84,"month":"AGUSTUS 2028","status":"TIMELINE ALTERNATIF","subject":"AktivisPecahKarenaCapres","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"ProgramLamaLogoBaru","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab AktivisPecahKarenaCapres dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu AktivisPecahKarenaCapres dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#ProgramLamaLogoBaru","avatar":"🎨","npc":"Prof. Renal Disrupsi & Mbak Rebranding Nasional","handle":"@logobukanreformasi","post":"program lama masuk studio desain, keluar dengan logo baru dan kata “transformasi”. Prof. Renal membuka slide 87 dan bertanya proses mana yang berubah. Panitia menjawab: warna gradient sekarang lebih kolaboratif.","lesson":"Bedakan perubahan merek dengan perubahan proses, insentif, kewenangan, anggaran, indikator, dan kapasitas pelaksana.","weak":["context","data","transparency"],"resist":["meme"],"heat":69,"month":"SEPTEMBER 2028","status":"TIMELINE ALTERNATIF","subject":"ProgramLamaLogoBaru","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DanaKampanyeLewatKreator","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab ProgramLamaLogoBaru dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu ProgramLamaLogoBaru dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#CeramahMasukAffiliatePemilu","avatar":"💳","npc":"Kak Affiliate Demokrasi","handle":"@kodepromoCAPRES","post":"biaya promosi mengalir melalui agensi, kreator, relawan, dan merchandise sehingga laporan resmi terlihat sangat ramping.","lesson":"Transparansi dana harus mencakup pihak ketiga, jasa digital, natura, dan pengeluaran terkoordinasi.","weak":["law","transparency"],"resist":["whatabout"],"heat":88,"month":"OKTOBER 2028","status":"TIMELINE ALTERNATIF","subject":"influencer agama, edukator publik, dan afiliasi kampanye","document":"sumber ceramah, sponsor, afiliasi, dan klaim sejarah","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"MiliterNetralDiSpanduk","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini menghubungkan influencer agama, edukator publik, dan afiliasi kampanye dengan bukti dan konsekuensi dari fase sebelumnya","bad":"influencer agama, edukator publik, dan afiliasi kampanye dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#MiliterNetralDiSpanduk","avatar":"🪖","npc":"Kolonel Tidak Berpolitik","handle":"@sekadarfotobersama","post":"institusi menyatakan netral, sementara foto, jaringan, dan kegiatan lapangan menimbulkan pertanyaan baru.","lesson":"Netralitas perlu aturan jelas, audit, sanksi, dan kanal pengaduan yang aman.","weak":["law","data"],"resist":["patriot"],"heat":89,"month":"NOVEMBER 2028","status":"TIMELINE ALTERNATIF","subject":"MiliterNetralDiSpanduk","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"TahunPolitikDimulaiLebihAwal","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab MiliterNetralDiSpanduk dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu MiliterNetralDiSpanduk dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2028","title":"#TahunPolitikDimulaiLebihAwal","avatar":"🎆","npc":"Mas Hendro Satir-IO & Admin Tahun Baru","handle":"@pemilubelummulai","post":"malam tahun baru dipenuhi refleksi yang kebetulan punya jingle, relawan, dan survei internal. Mas Hendro membaca suhu publik; admin kandidat bilang ini bukan kampanye, cuma konten organik dengan media plan nasional.","lesson":"Awasi pra-kampanye melalui sumber dana, fasilitas negara, iklan politik, sponsor survei, akses media, dan koordinasi relawan.","weak":["data","context","transparency","network"],"resist":["endorse","meme"],"heat":82,"month":"DESEMBER 2028","status":"TIMELINE ALTERNATIF","subject":"TahunPolitikDimulaiLebihAwal","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"TanpaThresholdBanyakPanggung","arc":"proyeksi-2028","facts":[],"discussion":{"good":"respons ini benar-benar menjawab TahunPolitikDimulaiLebihAwal dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu TahunPolitikDimulaiLebihAwal dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}}]},{"name":"2029: PEMILU LAGI, REPUBLIK BELUM SELESAI","period":"JAN–DES 2029","status":"FIKSI PEMILU TERBUKA","bRank":"Komandan Narasi Pemilu Berikutnya","aRank":"Penjaga Ruang Publik & Koalisi Warga","bMentor":["🗳️","Pak Jenderal Gemoyono, Mas Samsul, dan Kandidat-Kandidat Siluet","Threshold berubah, kandidat bertambah, dan semua orang mengklaim paling siap melanjutkan sejarah.","Semua kartu terbuka; dampak integritas berlipat."],"aMentor":["🗄️","Arsip Republik, Watchdoc, Pakar, BEM, dan Kreator","Lima tahun bukti masuk arena yang hanya memberi tiap kandidat dua menit menjawab.","Arsip, fact-check, dan konsolidasi mencapai level akhir."],"days":[{"key":"future2029","title":"#TanpaThresholdBanyakPanggung","avatar":"🚪","npc":"Mbak Gerbang Kandidat","handle":"@semuabisamaju","post":"setelah ambang pencalonan kehilangan daya ikat, partai-partai menyiapkan lebih banyak pasangan. Pilihan bertambah; fragmentasi juga ikut mendaftar.","lesson":"Kompetisi lebih terbuka perlu aturan pencalonan, debat, pembiayaan, dan kemungkinan putaran kedua yang jelas.","weak":["law","data"],"resist":["meme"],"heat":79,"month":"JANUARI 2029","status":"TIMELINE ALTERNATIF","subject":"TanpaThresholdBanyakPanggung","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DeklarasiDiEnamStadion","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini benar-benar menjawab TanpaThresholdBanyakPanggung dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu TanpaThresholdBanyakPanggung dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#DebatEkonomiGrafikSalingTeriak","avatar":"🏟️","npc":"Om Gita Wacana-Wira, Feri Latih-Hitung, Yanuar Risky Banget & Kandidat","handle":"@rakyatmemanggil","post":"Debat ekonomi menghadirkan empat kandidat, enam grafik, dan satu kurs yang bergerak lebih cepat dari moderator. Para podcaster dan ekonom menguji produktivitas, fiskal, risiko, serta siapa yang akan bayar janji gratis setelah musik penutup.","lesson":"Debat ekonomi perlu membandingkan asumsi, sumber pembiayaan, trade-off, distribusi manfaat, risiko fiskal, dan kemampuan implementasi.","weak":["data","transparency"],"resist":["patriot"],"heat":81,"month":"FEBRUARI 2029","status":"TIMELINE ALTERNATIF","subject":"debat ekonomi Pemilu 2029 dan tagihan lima tahun kebijakan","document":"program kandidat, costing, asumsi makro, rekam pelaksanaan, audit, dan indikator distribusi","people":"pemilih, pekerja, kelas menengah, kelompok miskin, pelaku usaha, dan generasi pembayar utang","counter":"grafik tanpa sumber dan janji tanpa costing","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DebatDemokrasiSemuaMengakuKorban","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini menghubungkan debat rupiah, IHSG, pekerjaan, MBG, pajak, dan utang dengan bukti dan konsekuensi dari fase sebelumnya","bad":"debat rupiah, IHSG, pekerjaan, MBG, pajak, dan utang dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#DebatDemokrasiSemuaMengakuKorban","avatar":"🎤","npc":"Bang Akbar Pasal Tanpa Sensor, Mbak Nana Kursi Kosong & Moderator Kehabisan Waktu","handle":"@jawabpertanyaannya","post":"debat demokrasi dimulai dengan janji kebebasan pers dan berakhir dengan semua kandidat merasa paling pernah dizalimi. Bang Akbar mengulang pertanyaan, Mbak Nana menyorot kursi yang menghindari follow-up, moderator baru sadar waktu habis sebelum jawaban konkret muncul.","lesson":"Uji komitmen demokrasi dari rekam kebijakan, kebebasan pers, independensi hukum, supremasi sipil, hak protes, dan kesiapan menjawab pertanyaan lanjutan.","weak":["law","context","transparency"],"resist":["attack","whatabout"],"heat":86,"month":"MARET 2029","status":"TIMELINE ALTERNATIF","subject":"debat demokrasi, supremasi sipil, dan hukum","document":"rekam jabatan, kebebasan pers, perkara, serta kebijakan sipil-militer","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DeepfakeMintaMaafDuluan","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini menghubungkan debat demokrasi, supremasi sipil, dan hukum dengan bukti dan konsekuensi dari fase sebelumnya","bad":"debat demokrasi, supremasi sipil, dan hukum dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#DebatGeopolitikAntekSiapa","avatar":"🧬","npc":"Om Gita Wacana-Wira, Om Diplo Peta Dunia & Prof. Konni BaksLaah","handle":"@anteksiapadulu","post":"debat geopolitik dibuka dengan peta, ditutup dengan tuduhan antek asing. Om Gita bertanya strategi tiga dekade, Om Diplo meminta strategic payoff, Prof. Konni BaksLaah membentangkan peta sampai gelas moderator mengungsi. Kandidat menjawab: merah putih, titik.","lesson":"Bandingkan posisi BRICS, ASEAN, investasi, pertahanan, konflik regional, serta hubungan major powers tanpa mengganti analisis dengan lomba menuduh antek.","weak":["data","context","transparency"],"resist":["patriot","attack"],"heat":94,"month":"APRIL 2029","status":"TIMELINE ALTERNATIF","subject":"debat politik luar negeri tanpa lomba menuduh antek","document":"hasil BRICS dan ASEAN, perjanjian investasi, kerja sama pertahanan, voting internasional, biaya lawatan, dan kepentingan domestik","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"BansosDenganFontNetral","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini menghubungkan debat politik luar negeri tanpa lomba menuduh antek dengan bukti dan konsekuensi dari fase sebelumnya","bad":"debat politik luar negeri tanpa lomba menuduh antek dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#DapurListrikBanjirMasukDebat","avatar":"🎁","npc":"Feri Latih-Hitung, Yanuar Risky Banget, Fatima Footnote & Warga Posko","handle":"@layananbukanslogan","post":"MBG, listrik, banjir, dan rekonstruksi masuk satu debat layanan publik. Feri menghitung biaya per penerima, Yanuar membuka risiko pengadaan, Fatima membaca tuntutan lama, warga posko cuma bertanya kenapa genset datang setelah kamera pulang.","lesson":"Uji layanan publik dari desain anggaran, pengadaan, standar keselamatan, ketahanan energi, kesiapsiagaan bencana, data penerima, dan mekanisme koreksi.","weak":["data","transparency","empathy"],"resist":["meme","patriot"],"heat":87,"month":"MEI 2029","status":"TIMELINE ALTERNATIF","subject":"debat layanan publik, MBG, PLN, bencana, dan iklim","document":"costing MBG, data pemadaman, peta risiko banjir, kontrak pengadaan, audit, dan evaluasi layanan","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"IrWhyVsFeliXiVsCuanCheck","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini menghubungkan debat layanan publik, MBG, PLN, bencana, dan iklim dengan bukti dan konsekuensi dari fase sebelumnya","bad":"debat layanan publik, MBG, PLN, bencana, dan iklim dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#IrWhyVsFeliXiVsCuanCheck","avatar":"📺","npc":"Panel Influencer & Aktivis Kampus","handle":"@semuapunyadata","post":"Ferry Ir-Why-Nih, Feli-Xi-Auw, Raymond Cuan-Check, Mas Tiyo Toa, dan Fatima Footnote masuk satu forum. Yang satu bicara moral, yang satu peradaban, yang satu valuasi, sementara dua aktivis mahasiswa terus mengembalikan debat ke daftar tuntutan yang belum selesai sejak 2025–2026.","lesson":"Figur publik membantu akses informasi, tetapi audiens tetap perlu sumber primer, keberagaman perspektif, dan disclosure kepentingan.","weak":["context","transparency"],"resist":["attack"],"heat":89,"month":"JUNI 2029","status":"TIMELINE ALTERNATIF","subject":"peran influencer dan aktivis mahasiswa dalam membentuk agenda Pemilu 2029","document":"rekam jejak konten, sumber pendanaan, daftar tuntutan lama, komitmen kandidat, dan mekanisme evaluasi","people":"pemilih muda, organisasi mahasiswa, komunitas digital, dan warga yang lelah dijadikan target engagement","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"DokumenterPemiluLimaTahun","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini membandingkan reach, bukti, pendanaan, tuntutan Mas Tiyo Toa–Fatima Footnote, dan komitmen kandidat tanpa menganggap popularitas sebagai mandat","bad":"forum influencer dan aktivis dipotong jadi fanwar personal sementara tuntutan lama kembali hilang dari layar","neutral":"uji siapa membawa dokumen, siapa membawa audiens, siapa membawa organisasi, dan siapa tetap hadir setelah acara selesai"},"jokes":{"bapak":"Panelnya lima orang, moderatornya satu, waktunya dua jam. Ini bukan debat, ini rapat RT menjelang tujuhbelasan.","genz":"Mas Tiyo Toa sama Fatima Footnote literally jadi tombol “balik ke substansi” tiap panel mulai podcast-core 😭","emak":"Silakan debat panjang, tapi jangan lupa yang bayar kuota anak-anak buat nonton juga orang tua."}},{"key":"future2029","title":"#ArsipEnamTahunBocorSekaligus","avatar":"🎬","npc":"Bang Dandy Lensa-Sono","handle":"@arsiptayang","post":"dokumenter baru merangkai lima tahun kebijakan, protes, dan janji. Tim kampanye menyiapkan bantahan sebelum menonton sampai akhir.","lesson":"Arsip longitudinal membantu menguji pola, tetapi film tetap perlu metode, koreksi, dan hak jawab.","weak":["film","data"],"resist":["attack"],"heat":92,"month":"JULI 2029","status":"TIMELINE ALTERNATIF","subject":"kebocoran memo, invoice buzzer, donor, dan draft pidato","document":"metadata, rantai penguasaan, autentikasi, dan kepentingan publik","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"MasaTenangPalingBerisik","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini menghubungkan kebocoran memo, invoice buzzer, donor, dan draft pidato dengan bukti dan konsekuensi dari fase sebelumnya","bad":"kebocoran memo, invoice buzzer, donor, dan draft pidato dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#MasaTenangPalingBerisik","avatar":"🔇","npc":"Admin Pesan Terjadwal","handle":"@dipostingotomatis","post":"iklan resmi berhenti, akun anonim mulai lembur. Konten lama diunggah ulang seolah baru dan grup keluarga menjadi medan tempur terakhir.","lesson":"Masa tenang membutuhkan pengawasan iklan digital, koordinasi akun, pelabelan, dan literasi warga.","weak":["data","network"],"resist":["whatabout"],"heat":93,"month":"AGUSTUS 2029","status":"TIMELINE ALTERNATIF","subject":"MasaTenangPalingBerisik","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"HariPilihJariGemetar","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini benar-benar menjawab MasaTenangPalingBerisik dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu MasaTenangPalingBerisik dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#HariPilihJariGemetar","avatar":"🗳️","npc":"Warga Biasa Sekali","handle":"@masihmemilih","post":"lima tahun narasi dipadatkan menjadi satu surat suara. Tidak ada tombol undo, tetapi demokrasi tidak berhenti setelah kotak ditutup.","lesson":"Pilihan elektoral penting, namun pengawasan, kebebasan sipil, dan organisasi warga berjalan terus.","weak":["empathy","context"],"resist":["patriot"],"heat":95,"month":"SEPTEMBER 2029","status":"TIMELINE ALTERNATIF","subject":"HariPilihJariGemetar","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"QuickCountBanyakWarna","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini benar-benar menjawab HariPilihJariGemetar dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu HariPilihJariGemetar dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#QuickCountBanyakWarna","avatar":"📺","npc":"Prof. Sampel Nasional","handle":"@belumresmi","post":"layar menampilkan banyak kandidat dan kemungkinan putaran kedua. Semua kubu merayakan angka yang paling ramah.","lesson":"Gunakan lembaga kredibel, metode terbuka, selang ketidakpastian, dan tunggu hasil resmi.","weak":["data","transparency"],"resist":["meme"],"heat":90,"month":"OKTOBER 2029","status":"TIMELINE ALTERNATIF","subject":"QuickCountBanyakWarna","document":"dokumen primer, kronologi, anggaran, dan tanggapan resmi","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KoalisiPutaranKedua","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini benar-benar menjawab QuickCountBanyakWarna dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu QuickCountBanyakWarna dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#KoalisiPutaranKedua","avatar":"🤝","npc":"Bu Mega-Watt Merah, Mbak Puanorama & Pak Negosiasi Tengah Malam","handle":"@dukunganbersyarat","post":"Putaran kedua membuat semua garis ideologi mendadak lentur. Bu Mega-Watt membuka buku sejarah, Mbak Puanorama membuka kalkulator kursi, dan kandidat membuka pintu belakang hotel. Pemilih cuma dapat foto siluet serta kalimat “demi kepentingan bangsa”.","lesson":"Koalisi putaran kedua harus dinilai dari kesepakatan program, posisi kekuasaan, voting, transparansi, dan mekanisme akuntabilitas kepada pemilih.","weak":["transparency","law"],"resist":["attack"],"heat":91,"month":"NOVEMBER 2029","status":"TIMELINE ALTERNATIF","subject":"koalisi putaran kedua dan power broker Pemilu 2029","document":"kesepakatan koalisi, pembagian agenda, posisi kabinet, voting parlemen, dan komitmen publik","people":"pemilih yang tidak ikut masuk ruang negosiasi tetapi menanggung hasilnya","counter":"seruan persatuan tanpa membuka isi kesepakatan","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"KotakSuaraBelumMenulisAkhir","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini benar-benar menjawab KoalisiPutaranKedua dan membuka dokumen primer, kronologi, anggaran, dan tanggapan resmi","bad":"isu KoalisiPutaranKedua dialihkan ke kesalahan kubu lain dan alasan keadaan global tanpa menjawab inti","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}},{"key":"future2029","title":"#RepublikMenekanRefresh","avatar":"🌅","npc":"Republik Timeline","handle":"@babberikutnya","post":"hasil akhir belum ditampilkan. Yang terlihat hanya kualitas ruang publik yang kamu bantu bangun—atau rusak—selama enam tahun.","lesson":"Pemilu menentukan pejabat; budaya demokrasi menentukan apa yang dapat dilakukan pejabat dan warga setelahnya.","weak":["empathy","data"],"resist":["patriot"],"heat":100,"month":"DESEMBER 2029","status":"TIMELINE ALTERNATIF","subject":"ending terbuka Pemilu 2029","document":"rekap resmi, sengketa, transfer kekuasaan, dan arsip enam tahun","people":"warga yang hidup di dalam dampaknya","counter":"kesalahan kubu lain dan alasan keadaan global","stage":"timeline, ruang kebijakan, dan kehidupan sehari-hari","teaser":"bab politik setelah Pemilu 2029","arc":"proyeksi-2029","facts":[],"discussion":{"good":"respons ini menghubungkan ending terbuka Pemilu 2029 dengan bukti dan konsekuensi dari fase sebelumnya","bad":"ending terbuka Pemilu 2029 dipakai sebagai slogan baru tanpa menyelesaikan utang masalah lama","neutral":"pisahkan fakta, tudingan, bantahan, dan dampaknya pada warga yang hidup di dalam dampaknya"},"jokes":{"bapak":"Yang penting rapatnya jangan tiga jam, kesimpulannya cuma “akan dikoordinasikan”.","genz":"timeline lagi kebakaran, admin masih sempat pilih font yang slay 😭","emak":"Saya cuma nanya dampaknya ke harga dan hidup sehari-hari, bukan minta ikut podcast."}}]}];
  // The timeline keeps its fiction notice in the UI metadata. Posts themselves
  // speak like posts, not like legal disclaimers stapled to every sentence.
  const discussionVoice = {
    good: [
      (i) => `Nah, ini baru ngomongin ${i.subject}. ${i.document} ikut dibuka, jadi publik nggak disuruh beriman ke caption.`,
      (i) => `${i.people} akhirnya diperlakukan sebagai manusia, bukan dekorasi di slide penutup. Bahasan ${i.subject} juga nggak kabur ke mana-mana.`,
      (i) => `Jawabannya nyambung ke ${i.subject}. Ada bukti, ada batas klaim, dan ada ruang buat bilang “kami salah”. Tumben lengkap.`,
    ],
    bad: [
      (i) => `Ditanya ${i.subject}, jawabannya malah lari ke ${i.counter}. Ini respons atau maling sandal kabur lewat pintu samping?`,
      (i) => `${i.subject} belum terjawab, tapi admin sudah menang desain. Bukti primernya mungkin masih disuruh antre di lobi.`,
      (i) => `Omon-omon lagi: volume naik, musuh bersama muncul, ${i.people} tetap kebagian tagihan dan kalimat “harap bersabar”.`,
    ],
    neutral: [
      (i) => `Buka ${i.document}. Jangan lempar satu screenshot lalu nyuruh orang tawakal pada crop.`,
      (i) => `Pertanyaan warga simpel: soal ${i.subject}, siapa memutuskan, siapa untung, dan siapa yang nanti disuruh ikhlas?`,
      (i) => `Pisahkan fakta, tuduhan, bantahan, sama vibes admin. Dampaknya ke ${i.people} jangan hilang di balik jargon.`,
    ],
  };
  phases.forEach((phase, phaseIndex) => {
    if (phaseIndex >= 3) phase.status = "TIMELINE ALTERNATIF";
    phase.days.forEach((issue, dayIndex) => {
      issue.post = String(issue.post || "")
        .replace(/^(?:FIKSI PREDIKTIF|FIKSI PEMILU|PROYEKSI FIKSI):\s*/i, "")
        .replace(/\s*Episode ini meneruskan jejak dari [^.]+\./i, "")
        .trim();
      if (issue.post)
        issue.post = issue.post.charAt(0).toUpperCase() + issue.post.slice(1);
      if (phaseIndex >= 3 || (phaseIndex === 2 && dayIndex >= 7))
        issue.status = "TIMELINE ALTERNATIF";
      else if (phaseIndex === 2)
        issue.status = "ARSIP POLITIK 2026";
      const voiceIndex = (phaseIndex * 12 + dayIndex) % discussionVoice.good.length;
      issue.discussion = {
        good: discussionVoice.good[voiceIndex](issue),
        bad: discussionVoice.bad[voiceIndex](issue),
        neutral: discussionVoice.neutral[voiceIndex](issue),
      };
    });
  });

  const prabowo2026Sources = [
    [
      "Rupiah, pasar, dan kebijakan",
      "Pada Mei–Juni 2026 rupiah mencetak rekor lemah dan pasar tertekan. Pergerakan kurs punya banyak sebab; kekhawatiran fiskal, konsistensi kebijakan, harga energi global, serta independensi bank sentral ikut dibaca pasar.",
      "https://www.reuters.com/world/asia-pacific/prabowos-populist-policies-propel-doom-loop-indonesian-markets-2026-06-08/",
    ],
    [
      "Warga desa tetap kena dolar",
      "Prabowo mengecilkan dampak harian pelemahan rupiah dengan merujuk warga desa yang tidak bertransaksi langsung memakai dolar. Kritiknya: harga impor, energi, bahan baku, dan utang valas tetap dapat merambat ke kehidupan sehari-hari.",
      "https://www.reuters.com/world/asia-pacific/indonesia-rupiah-hits-new-record-low-president-downplays-day-to-day-impact-2026-05-18/",
    ],
    [
      "Kritik disebut digerakkan asing",
      "Amnesty International mencatat Prabowo berulang kali memakai narasi agen asing terhadap kritik dan protes; bukti untuk tudingan tersebut tidak dibuka ke publik.",
      "https://www.reuters.com/business/media-telecom/indonesian-authorities-using-online-disinformation-campaigns-target-critics-2026-05-19/",
    ],
    [
      "Defisit mendekati pagar hukum",
      "Proyeksi defisit APBN 2026 naik menjadi 2,85% PDB, dekat batas hukum 3%. Pemerintah juga memasukkan pemotongan Rp67 triliun pada program makan sekolah dalam proyeksi terbaru.",
      "https://www.reuters.com/world/asia-pacific/indonesias-2026-budget-deficit-outlook-seen-285-gdp-house-panel-says-2026-07-07/",
    ],
  ];
  sources.prabowo2026 = prabowo2026Sources;

  Object.assign(phases[2].days[4], {
    title: "#PakGemoyonoPidatoRupiahCariPintu",
    npc: "Pak Jenderal Gemoyono, Om Gita Wacana-Wira & Feri Latih-Hitung",
    handle: "@dolarnggakkenaldesa",
    post: "Pak Gemoyono naik podium dan bilang warga desa tidak memakai dolar. Pasar tidak punya tombol khusus ‘jatuh setelah pidato’, tetapi importir, harga energi, obat, bahan baku, dan cicilan valas juga tidak hidup dari tepuk tangan. Om Gita bicara institusi; Feri memotong: bagus, sekarang siapa bayar kurs Jumat pagi?",
    lesson: "Jangan bikin takhayul bahwa satu pidato otomatis menjatuhkan rupiah. Uji kebijakan fiskal, kredibilitas institusi, arus modal, energi global, cadangan devisa, serta cara pemerintah menjelaskan dampaknya tanpa meremehkan warga.",
    subject: "rupiah rekor lemah, pidato presiden, dan kredibilitas kebijakan ekonomi",
    document: "kurs, cadangan devisa, arus modal, inflasi impor, intervensi BI, dan asumsi APBN",
    people: "warga desa, pekerja, UMKM, importir, mahasiswa luar negeri, dan keluarga yang belanjanya ikut kena transmisi dolar",
    counter: "spekulan asing atau klaim bahwa rakyat biasa tidak memakai dolar",
    facts: prabowo2026Sources.slice(0, 2),
    discussion: {
      good: "Kurs dibahas sebagai kebijakan dan biaya hidup, bukan mistik podium. Data dibuka; warga desa nggak dijadikan alasan buat mengecilkan masalah.",
      bad: "Ditanya rupiah, jawabannya pindah ke spekulan dan antek asing. Harga impor tetap masuk, cuma tanggung jawabnya yang dibuat hilang.",
      neutral: "Jangan bilang satu pidato otomatis menjatuhkan kurs. Buka fiskal, arus modal, kebijakan BI, harga energi, dan dampaknya ke dompet warga.",
    },
  });
  phases[2].days[6].facts = [...(phases[2].days[6].facts || []), prabowo2026Sources[3]];

  specialEvents.push({
    id: "podium-rupiah-foreign-agent",
    phase: 2,
    after: 5,
    icon: "🎙️",
    title: "Pidato Panjang, Rupiah Pendek Napas",
    actor: "Pak Jenderal Gemoyono & Pabrik Musuh Bersama",
    text: "Rupiah menembus rekor lemah. Podium menjawab dengan optimisme, warga desa, dan antek asing. Timeline langsung terbelah: satu kubu menganggap pidato presiden punya tombol kurs; kubu lain menganggap harga impor tidak berlaku di kampung. Dua-duanya nyaman, dua-duanya malas membaca transmisi ekonomi.",
    fact: "Pelemahan rupiah pada 2026 dipengaruhi faktor global dan domestik. Reuters melaporkan kekhawatiran pasar terhadap fiskal dan konsistensi kebijakan; Amnesty mencatat narasi agen asing berulang tanpa bukti publik.",
    sourceKey: "prabowo2026",
    choices: {
      buzzer: [
        [
          "Naikkan ‘warga desa tidak pakai dolar’",
          "Potong pidato jadi klip heroik. Abaikan harga impor, energi, obat, bahan baku, dan utang valas yang tetap masuk kampung tanpa paspor.",
          { reach: 14, credibility: -10, integrity: -12, democracy: -6, heat: 15, money: -85000000 },
          "Anjing, dolarnya memang nggak dipakai beli gorengan. Minyak, pupuk, obat, dan ongkosnya yang datang duluan.",
        ],
        [
          "Berhenti cari musuh, buka langkah stabilisasi",
          "Akui tekanan pasar, jelaskan transmisi ke harga, buka asumsi APBN, dan biarkan BI bicara tanpa disulih suara podium.",
          { reach: 2, credibility: 14, integrity: 13, democracy: 10, heat: -12, money: -42000000 },
          "Ternyata nasionalisme nggak mati cuma karena pemerintah bilang: iya, ini masalah dan ini datanya.",
        ],
      ],
      aktivis: [
        [
          "Bilang setiap pidato otomatis menjatuhkan rupiah",
          "Punchline-nya enak, analisisnya malas. Korelasi dipaksa jadi tombol sebab-akibat supaya poster lebih galak.",
          { reach: 13, credibility: -9, integrity: -7, democracy: -2, heat: 14, money: -4000000 },
          "Kritik boleh pedas. Takhayul pasar tetap takhayul, Bangsat.",
        ],
        [
          "Bongkar kebijakan, bukan mitos podium",
          "Hubungkan fiskal, independensi BI, arus modal, harga impor, dan bahasa presiden yang meremehkan dampak pada warga.",
          { reach: 7, credibility: 14, integrity: 12, democracy: 10, network: 8, heat: 1, money: -16000000 },
          "Ini lebih sakit daripada meme: ada data, ada warga, dan nggak ada musuh asing imajiner buat dijadikan kambing hitam.",
        ],
      ],
    },
  });

  // Historical spine through July 2026. From August 2026 onward the existing
  // alternative-timeline engine remains deliberately projective.
  const chronologySources = window.PNTimelineVariants?.sources || {};
  Object.assign(phases[0].days[9], {
    title: "#KabinetBaruPintuKomando",
    subject: "pelantikan, kabinet besar, dan perwira aktif di pusat kendali sipil",
    document: "struktur kabinet, dasar hukum jabatan sipil, status kedinasan, target 100 hari, dan jalur pertanggungjawaban",
    people: "pegawai sipil, prajurit profesional, pers, dan warga yang berhak tahu siapa memberi perintah kepada siapa",
    counter: "dalih bahwa disiplin otomatis menggantikan kontrol sipil",
    facts: [chronologySources.tediCivilianPost].filter(Boolean),
  });
  Object.assign(phases[1].days[0], {
    title: "#DapurMasukRantaiKomando",
    subject: "militer mengelola dapur sekolah, pangan, pertanian, dan proyek sipil",
    document: "mandat operasi, anggaran, pengadaan, audit sipil, data satuan, dan kanal keluhan warga",
    people: "murid, orang tua, petani, pekerja sipil, prajurit, dan komunitas yang layanannya masuk rantai komando",
    counter: "klaim bahwa kecepatan dan disiplin cukup menggantikan transparansi",
    facts: [chronologySources.militaryExpansion].filter(Boolean),
  });
  Object.assign(phases[1].days[2], {
    title: "#UUBaruSeragamMasukKantorSipil",
    subject: "revisi UU TNI, jabatan sipil perwira aktif, dan bayang-bayang dwifungsi",
    document: "draf dan naskah final UU TNI, daftar jabatan sipil, risalah rapat, status perwira, serta mekanisme pengawasan",
    people: "warga sipil, aparatur negara, aktivis, jurnalis, dan prajurit yang profesionalitasnya bergantung pada batas tugas yang jelas",
    counter: "musuh asing, nostalgia ketertiban, dan anggapan bahwa semua kritik anti-tentara",
    facts: [chronologySources.tniLaw, chronologySources.tediCivilianPost].filter(Boolean),
  });
  const patchArcTwoIssue = (dayIndex, patch) => {
    const issue = phases[1].days[dayIndex];
    Object.assign(issue, patch);
    const voiceIndex = (12 + dayIndex) % discussionVoice.good.length;
    issue.discussion = {
      good: discussionVoice.good[voiceIndex](issue),
      bad: discussionVoice.bad[voiceIndex](issue),
      neutral: discussionVoice.neutral[voiceIndex](issue),
    };
  };
  [
    {
      key: "mbg-launch",
      title: "#DapurGratisMasukRantaiKomando",
      avatar: "🍱",
      npc: "Mbak Audit Kotak Makan",
      handle: "@porsinyadihitungulang",
      post: "Kotak pertama dibagi, targetnya sudah puluhan juta. Dapur, lahan pangan, dan distribusi ikut masuk rantai komando; standar keselamatan serta jalur koreksi masih mengejar dari belakang.",
      lesson: "Kecepatan distribusi tidak menggantikan kontrol sipil, keamanan pangan, ahli gizi, audit pengadaan, data insiden, dan hak warga menghentikan dapur yang berbahaya.",
      subject: "peluncuran MBG, ekspansi dapur, dan program sipil dalam rantai komando",
      document: "mandat operasi, anggaran Rp71 triliun, daftar SPPG, standar menu, pengadaan, audit sipil, serta kanal keluhan",
      people: "murid, orang tua, guru, petani, pekerja dapur, ahli gizi, tenaga kesehatan, dan komunitas sekitar",
      counter: "klaim bahwa disiplin dan jumlah porsi cukup membuktikan program aman",
      weak: ["data", "transparency", "empathy"],
      resist: ["patriot", "meme"],
      heat: 64,
      teaser: "EfisiensiMakanPendidikanDiet",
      arc: "mbg",
      facts: [chronologySources.militaryExpansion, chronologySources.mbgScale2025].filter(Boolean),
    },
    {
      key: "budget-education",
      title: "#EfisiensiMakanPendidikanDiet",
      avatar: "🌑",
      npc: "Mas Tiyo Toa",
      handle: "@tiyotoa",
      post: "Efisiensi Rp306,7 triliun turun lewat instruksi; penjelasan dampaknya jalan kaki. Kampus, beasiswa, riset, guru, dan layanan publik menghitung ulang masa depan sambil program prioritas mendapat jalur cepat.",
      lesson: "Uji efisiensi dari pos yang dipotong, pihak yang menanggung, tujuan realokasi, dampak layanan, dan mekanisme pemulihan—bukan dari slogan hemat semata.",
      subject: "Indonesia Gelap, pemotongan Rp306,7 triliun, dan biaya program prioritas bagi pendidikan",
      document: "Instruksi Presiden 1/2025, rincian pemotongan kementerian dan transfer daerah, anggaran pendidikan, beasiswa, riset, serta realokasi MBG",
      people: "mahasiswa, guru, dosen, peneliti, penerima beasiswa, keluarga, dan pengguna layanan publik",
      counter: "klaim bahwa layanan inti aman tanpa membuka lampiran pemotongan dan realokasi",
      weak: ["budget", "data", "network", "transparency"],
      resist: ["patriot", "attack"],
      heat: 83,
      teaser: "UUBaruSeragamMasukKantorSipil",
      arc: "budget",
      facts: [chronologySources.budgetCuts2025].filter(Boolean),
    },
    {
      key: "tni",
      title: "#UUBaruSeragamMasukKantorSipil",
      avatar: "🪖",
      npc: "Mbak Pintu Rapat",
      handle: "@draftnyadimana",
      post: "Draf berubah cepat, pintu rapat keburu rapat, dan jabatan sipil bagi perwira aktif bertambah. Publik baru diajak bicara ketika palu sudah lebih dulu punya kesimpulan.",
      lesson: "Supremasi sipil diuji lewat daftar jabatan, prosedur legislasi, status perwira, rantai komando, konflik kewenangan, serta pengawasan yang dapat bekerja.",
      subject: "revisi UU TNI, jabatan sipil perwira aktif, dan bayang-bayang dwifungsi",
      document: "draf dan naskah final UU TNI, daftar jabatan sipil, risalah rapat, status perwira, serta mekanisme pengawasan",
      people: "warga sipil, aparatur negara, aktivis, jurnalis, dan prajurit profesional",
      counter: "musuh asing, nostalgia ketertiban, dan anggapan bahwa kritik batas kewenangan berarti anti-tentara",
      weak: ["law", "context", "transparency"],
      resist: ["patriot", "attack"],
      heat: 88,
      teaser: "DelapanPuluhRibuKoperasiDikebut",
      arc: "tni",
      facts: [chronologySources.tniLaw, chronologySources.tediCivilianPost].filter(Boolean),
    },
    {
      key: "kopdes-formation",
      title: "#DelapanPuluhRibuKoperasiDikebut",
      avatar: "🏪",
      npc: "Mbak Bendahara Desa",
      handle: "@bukukasdusun",
      post: "Puluhan ribu desa diminta menyiapkan koperasi dalam tempo nasional. Akta bisa dicetak cepat; pengurus cakap, model usaha, pasar, modal kerja, dan hak desa untuk berkata tidak nggak punya tombol mass upload.",
      lesson: "Kelembagaan bukan hasil usaha. Uji otonomi anggota, model bisnis, hubungan dengan BUMDes, modal, pengadaan, risiko gagal, dan siapa menanggung kerugian.",
      subject: "percepatan pembentukan KopDes, otonomi desa, dan risiko kebijakan seragam",
      document: "instruksi percepatan, akta koperasi, daftar anggota dan pengurus, model usaha, modal kerja, proyeksi arus kas, serta hubungan dengan BUMDes",
      people: "warga desa, anggota koperasi, perangkat desa, pedagang lokal, petani, nelayan, dan pengelola BUMDes",
      counter: "jumlah badan hukum sebagai pengganti bukti koperasi benar-benar hidup",
      weak: ["data", "transparency", "network"],
      resist: ["concert", "patriot"],
      heat: 61,
      teaser: "TargetDapurNaikSOPMasihJogging",
      arc: "kopdes",
      facts: [chronologySources.kopdesLaunch2025].filter(Boolean),
    },
    {
      key: "mbg-scale",
      title: "#TargetDapurNaikSOPMasihJogging",
      avatar: "📈",
      npc: "Mbak Audit Kotak Makan",
      handle: "@porsinyadihitungulang",
      post: "Penerima MBG bertambah, dapur dikejar, vendor masuk, dan angka serapan naik. Rantai dingin, air bersih, ahli gizi, sertifikat, serta rem darurat masih diminta lari tanpa sepatu.",
      lesson: "Program gizi harus dinilai dari mutu, keamanan, cakupan yang benar, kapasitas dapur, transparansi biaya, mekanisme keluhan, dan hasil kesehatan—bukan porsi semata.",
      subject: "ekspansi MBG, anggaran Rp71 triliun, kapasitas SPPG, vendor, dan standar keselamatan",
      document: "anggaran, target penerima, daftar SPPG, kapasitas harian, kontrak vendor, ahli gizi, SLHS, laporan insiden, dan pembayaran",
      people: "anak, ibu hamil, orang tua, sekolah, pekerja dapur, ahli gizi, petani, UMKM, dan tenaga kesehatan",
      counter: "jumlah porsi dan foto dapur percontohan yang dipakai mewakili seluruh sistem",
      weak: ["data", "transparency", "empathy"],
      resist: ["meme", "patriot"],
      heat: 72,
      teaser: "GratisDiPiringMahalDiAPBN",
      arc: "mbg",
      facts: [chronologySources.mbgScale2025].filter(Boolean),
    },
    {
      key: "mbg-budget-safety",
      title: "#GratisDiPiringMahalDiAPBN",
      avatar: "🧮",
      npc: "Risky Februari",
      handle: "@riskyfebruari",
      post: "Gratis adalah cara anak menerima makan, bukan cara negara membiayainya. Rp71 triliun bertemu biaya dapur, distribusi, pengawasan, insiden, limbah, dan pos lain yang disuruh bergeser sambil tetap tersenyum.",
      lesson: "Buka biaya penuh, biaya peluang, risk register, standar keselamatan, pembayaran vendor, serta indikator gizi agar manfaat tidak dipisahkan dari tagihan dan kegagalan.",
      subject: "biaya penuh MBG, risiko dapur, dan perebutan anggaran dengan layanan pendidikan",
      document: "costing per porsi, overhead SPPG, distribusi, pengawasan, limbah, data insiden, realokasi anggaran, serta risk register",
      people: "anak, keluarga, sekolah, guru, mahasiswa, petugas dapur, ahli gizi, dan pembayar pajak",
      counter: "kata gratis dan persentase porsi sukses yang menutupi sumber dana serta korban",
      weak: ["budget", "data", "transparency", "empathy"],
      resist: ["meme", "whatabout"],
      heat: 75,
      teaser: "KopDesDanGajahKecilSatuAkhirPekan",
      arc: "mbg-budget",
      facts: [chronologySources.mbgScale2025, chronologySources.budgetCuts2025].filter(Boolean),
    },
    {
      key: "kopdes-dynasty",
      title: "#KopDesDanGajahKecilSatuAkhirPekan",
      avatar: "🐘",
      npc: "Pak Joko Woles",
      handle: "@remoteharuskerja",
      post: "Satu akhir pekan Juli memuat kongres partai keluarga dengan target 2029 dan peluncuran 80.081 koperasi desa. Yang satu menjual jaringan politik, yang satu jaringan logistik; dua-duanya minta publik percaya ukuran besar berarti masa depan cerah.",
      lesson: "Pisahkan konsolidasi keluarga dari merit politik, dan pisahkan jumlah lembaga dari kinerja koperasi. Keduanya perlu donor, tata kelola, indikator, serta batas kekuasaan yang terbuka.",
      subject: "peluncuran 80.081 KopDes dan konsolidasi partai keluarga menuju Pemilu 2029",
      document: "akta dan model usaha KopDes, pembiayaan, hasil kongres partai, struktur kader, donor, relasi keluarga, dan target 2029",
      people: "warga desa, anggota koperasi, kader lokal, pemilih, pedagang, petani, dan partai yang tidak punya remote keluarga",
      counter: "angka besar, logo baru, dan dalih bahwa akses keluarga cuma silaturahmi",
      weak: ["data", "context", "transparency", "network"],
      resist: ["meme", "concert"],
      heat: 73,
      teaser: "AnggaranPidatoProtesMendidih",
      arc: "kopdes-dinasti-2029",
      facts: [chronologySources.kopdesLaunch2025, chronologySources.family2029].filter(Boolean),
    },
    {
      key: "education-protest",
      title: "#AnggaranPidatoProtesMendidih",
      avatar: "🔥",
      npc: "Bu Guru Honorer",
      handle: "@spidolpatungan",
      post: "Pidato anggaran memasukkan MBG ke keranjang pendidikan; di luar gedung, tunjangan elite dan efek efisiensi membuat jalanan mendidih. Angka 20% tetap rapi, rasa adilnya tidak.",
      lesson: "Uji substansi anggaran pendidikan, biaya peluang MBG, tunjangan elite, hak protes, respons aparat, dan kelompok yang diminta berkorban.",
      subject: "MBG dalam anggaran pendidikan, tunjangan parlemen, dan protes Agustus 2025",
      document: "RAPBN 2026, klasifikasi fungsi pendidikan, alokasi MBG, rincian tunjangan, kronologi aksi, korban, dan tuntutan",
      people: "murid, guru, mahasiswa, pekerja, pengemudi, demonstran, keluarga, dan warga yang diminta berhemat",
      counter: "angka 20% tanpa isi serta tudingan bahwa semua protes ditunggangi",
      weak: ["budget", "data", "empathy", "law"],
      resist: ["patriot", "attack"],
      heat: 94,
      teaser: "KotakMakanMasukRuangKrisis",
      arc: "education-protest",
      facts: [chronologySources.educationBudget2026, chronologySources.augustProtests2025].filter(Boolean),
    },
    {
      key: "mbg-crisis",
      title: "#KotakMakanMasukRuangKrisis",
      avatar: "🚑",
      npc: "Bu Nanik Nasi-Doyang",
      handle: "@nasidoyangbukasop",
      post: "Ribuan anak dilaporkan sakit. Bu Nanik Nasi-Doyang baru masuk badan gizi lalu harus meminta maaf dan membentuk tim investigasi; dr. Tan Sehat-Yen datang ke parlemen membawa pertanyaan yang lebih tajam daripada pisau dapur.",
      lesson: "Jangan ukur keselamatan dari kecilnya persentase korban. Buka kasus per dapur, penyebab, sertifikasi, kapasitas, ahli gizi, kompensasi, sanksi, dan perubahan desain program.",
      subject: "krisis keamanan pangan MBG, investigasi badan gizi, dan kritik mutu menu",
      document: "daftar kasus, hasil laboratorium, SLHS, kapasitas SPPG, rasio ahli gizi, waktu masak-kirim, pemasok, kompensasi, dan sanksi",
      people: "anak yang sakit, keluarga, sekolah, petugas dapur, ahli gizi, tenaga kesehatan, dan penerima MBG lain",
      counter: "satu miliar porsi sebagai angka besar untuk mengecilkan pengalaman korban",
      weak: ["data", "transparency", "empathy", "context"],
      resist: ["meme", "patriot"],
      heat: 96,
      teaser: "TuntutanBelumPulangDapurBelumAman",
      arc: "mbg-keamanan-pangan",
      facts: [chronologySources.bgnAppointment2025, chronologySources.mbgPoisoning2025, chronologySources.tanMenu2025].filter(Boolean),
    },
    {
      key: "accountability-followup",
      title: "#TuntutanBelumPulangDapurBelumAman",
      avatar: "📋",
      npc: "Fatima Footnote",
      handle: "@fatimabacapdf",
      post: "Setelah jalanan penuh dan dapur masuk berita, pemerintah mengundang dialog. Gerakan membawa 17+8; keluarga korban membawa hasil lab; meja rapat membawa kalimat ‘akan ditindaklanjuti’ tanpa kolom deadline.",
      lesson: "Akuntabilitas perlu tuntutan terukur, PIC, tenggat, dokumen progres, data keselamatan, dan ruang warga untuk memverifikasi hasil—bukan foto pertemuan.",
      subject: "tindak lanjut 17+8, sertifikasi dapur MBG, dan janji reformasi setelah krisis",
      document: "matriks 17+8, PIC dan deadline, daftar SLHS, laporan investigasi, sanksi dapur, serta catatan pertemuan publik",
      people: "demonstran, keluarga korban, anak penerima MBG, organisasi warga, ahli gizi, guru, dan tenaga kesehatan",
      counter: "dialog seremonial dan statistik besar tanpa penanggung jawab",
      weak: ["data", "network", "transparency", "empathy"],
      resist: ["meme", "attack"],
      heat: 82,
      teaser: "DuaPuluhPersenKokJadiKotakMakan",
      arc: "accountability-mbg",
      facts: [chronologySources.augustProtests2025, chronologySources.mbgPoisoning2025, chronologySources.tanMenu2025].filter(Boolean),
    },
    {
      key: "education-budget-2026",
      title: "#DuaPuluhPersenKokJadiKotakMakan",
      avatar: "🏫",
      npc: "Bu Guru Honorer",
      handle: "@spidolpatungan",
      post: "Rp223 triliun MBG duduk di keranjang pendidikan 2026. Amanat 20% tampak utuh; sekolah rusak, guru, beasiswa, dan riset bertanya apakah definisi sekarang bisa menambal atap.",
      lesson: "Konstitusi menuntut substansi, bukan hanya persentase. Pisahkan belanja gizi dan pendidikan, lalu jelaskan sumber dana, hasil, biaya peluang, dan kebutuhan dasar yang belum terpenuhi.",
      subject: "Rp223 triliun MBG dalam anggaran pendidikan 2026 dan makna substantif amanat 20%",
      document: "UU dan RAPBN 2026, klasifikasi fungsi pendidikan, anggaran MBG, belanja guru, sekolah, beasiswa, riset, serta penghitungan di luar MBG",
      people: "murid, guru, mahasiswa, penerima beasiswa, peneliti, keluarga, dan anak yang membutuhkan makan sekaligus sekolah bermutu",
      counter: "persentase formal 20% yang tidak menjelaskan isi dan biaya peluang",
      weak: ["budget", "data", "law", "transparency"],
      resist: ["patriot", "meme"],
      heat: 87,
      teaser: "TutupBukuProgramBukaInvoice",
      arc: "education-budget",
      facts: [chronologySources.educationBudget2026].filter(Boolean),
    },
    {
      key: "populist-invoice",
      title: "#TutupBukuProgramBukaInvoice",
      avatar: "📚",
      npc: "Risky Februari",
      handle: "@riskyfebruari",
      post: "Tutup buku 2025: MBG membesar, 80.081 KopDes diluncurkan, pendidikan menampung definisi baru, dan remote 2029 mulai mengisi baterai. Semua program punya baliho; sekarang mana invoice, risk register, dan hasilnya?",
      lesson: "Audit program populis lintas sektor lewat target, realisasi, manfaat, korban, biaya penuh, utang, risiko, konflik kepentingan, dan layanan yang kehilangan anggaran.",
      subject: "tagihan akhir tahun MBG, KopDes, efisiensi pendidikan, dan konsolidasi politik 2029",
      document: "realisasi anggaran, hasil gizi, insiden, daftar KopDes aktif, arus kas, belanja pendidikan, donor politik, audit, dan risk register",
      people: "anak, keluarga, guru, mahasiswa, warga desa, anggota koperasi, pembayar pajak, dan pemilih 2029",
      counter: "serapan, jumlah lembaga, dan popularitas yang dipakai menggantikan evaluasi hasil",
      weak: ["data", "context", "transparency", "law"],
      resist: ["meme", "concert"],
      heat: 89,
      teaser: "LaptopMasukPengadilan",
      arc: "populist-program-audit",
      facts: [chronologySources.mbgScale2025, chronologySources.kopdesLaunch2025, chronologySources.educationBudget2026, chronologySources.family2029].filter(Boolean),
    },
  ].forEach((patch, dayIndex) => patchArcTwoIssue(dayIndex, patch));
  Object.assign(phases[2].days[6], {
    title: "#RudalDatangDefisitMenegang",
    subject: "kerja sama rudal Juli 2026, pengawasan pengadaan pertahanan, dan prioritas fiskal",
    document: "nilai kontrak, kebutuhan strategis, biaya siklus hidup, risiko kurs, alih teknologi, asumsi defisit, dan pengawasan parlemen",
    people: "warga pembayar pajak, prajurit, pekerja industri pertahanan, serta generasi yang mewarisi cicilan",
    counter: "patriotisme kosong yang menganggap pertanyaan biaya sebagai penghinaan negara",
    facts: [chronologySources.julyDefence].filter(Boolean),
  });

  const politicalAliases = [
    [/Prabowo Subianto/gi, "Pak Jenderal Gemoyono"],
    [/\bPrabowo\b/gi, "Pak Jenderal Gemoyono"],
    [/Gibran Rakabuming Raka/gi, "Mas Samsul Raka Buming-Buming"],
    [/\bGibran\b/gi, "Mas Samsul Raka Buming-Buming"],
    [/Joko Widodo/gi, "Pak Joko Woles"],
    [/\bJokowi\b/gi, "Pak Joko Woles"],
    [/Kaesang Pangarep/gi, "Mas Kesang Gajah-Kecil"],
    [/\bKaesang\b/gi, "Mas Kesang Gajah-Kecil"],
    [/Teddy Indra Wijaya/gi, "Mayor Tedi Ketok-Pintu"],
    [/Mayor Teddy/gi, "Mayor Tedi Ketok-Pintu"],
    [/Hasan Nasbi/gi, "Pak Hasbun Naskah Basi"],
    [/Bahlil Lahadalia/gi, "Bahlul Hilir-Hilir"],
    [/\bBahlil\b/gi, "Bahlul Hilir-Hilir"],
    [/Purbaya Yudhi Sadewa/gi, "Pak Purba-Yey Dompet Negara"],
    [/Sri Mulyani/gi, "Bu Sri Mul-Yani-Aja"],
    [/Nadiem Makarim/gi, "Mas Nadim Makaroni"],
    [/\bNadiem\b/gi, "Mas Nadim Makaroni"],
    [/Puan Maharani/gi, "Mbak Puanorama Senayan"],
    [/Megawati Soekarnoputri/gi, "Bu Mega-Watt Merah"],
    [/Connie Rahakundini Bakrie/gi, "Prof. Konni BaksLaah"],
    [/Connie Bakrie/gi, "Prof. Konni BaksLaah"],
    [/Ulta Levenia Nababan/gi, "Dr. Ultima Waspadaban"],
    [/Tiyo Ardianto/gi, "Mas Tiyo Toa"],
    [/Yanuar Nugroho/gi, "Risky Februari"],
    [/Yanuar Risky Banget/gi, "Risky Februari"],
    [/Nanik(?: Sudaryati)? S\.? Deyang/gi, "Bu Nanik Nasi-Doyang"],
    [/\bNanik Deyang\b/gi, "Bu Nanik Nasi-Doyang"],
    [/Dr\.?\s*Tan Shot Yen/gi, "dr. Tan Sehat-Yen"],
    [/\bTan Shot Yen\b/gi, "dr. Tan Sehat-Yen"],
    [/Anies Baswedan/gi, "Pak Anis Manis"],
    [/Ganjar Pranowo/gi, "Pak Rambut Putih Filter Merah"],
  ];
  function aliasPoliticalText(value) {
    if (typeof value !== "string" || /^https?:\/\//i.test(value)) return value;
    return politicalAliases.reduce((text, [pattern, alias]) => text.replace(pattern, alias), value);
  }
  function aliasPoliticalDisplay(root, seen = new WeakSet()) {
    if (!root || typeof root !== "object" || seen.has(root)) return root;
    seen.add(root);
    const technicalKeys = new Set(["id", "key", "sourceKey", "arc", "teaser", "themes", "weak", "resist", "actionIds", "characterId"]);
    Object.keys(root).forEach((key) => {
      if (technicalKeys.has(key)) return;
      const value = root[key];
      if (typeof value === "string") root[key] = aliasPoliticalText(value);
      else aliasPoliticalDisplay(value, seen);
    });
    return root;
  }
  [roleData, phaseRosters, cast, sources, phases, specialEvents].forEach((root) => aliasPoliticalDisplay(root));

  const menuTicker = [
    "SATU PEMILU, LIMA TAHUN KEKUASAAN, LALU PEMILU LAGI",
    "SAVE LOKAL AKTIF, INGATAN PUBLIK DIJUAL TERPISAH",
    "72 BULAN POLITIK DAN TIDAK SATU PUN GRUP WHATSAPP BENAR-BENAR NETRAL",
    "DEMOKRASI MASIH MENCARI CHARGER",
  ];
  const phaseTickers = [
    [
      "PASLON MENARI, TIM HUKUM MENYIAPKAN PDF",
      "HASIL SURVEI MENUNJUKKAN 112% RESPONDEN PERCAYA SURVEI",
      "KOALISI MEMBESAR, RUANG OPOSISI DIRENOVASI MENJADI LOUNGE",
      "KABINET FANTASY LEAGUE MEMBUKA BURSA TRANSFER",
      "SEMUA RELAWAN MENDADAK AHLI KEBIJAKAN PUBLIK",
      "AKUN FORUM LAMA NAIK LAGI, KOALISI MENDADAK CARI TOMBOL LOG OUT",
    ],
    [
      "MBG MENYAJIKAN PORSI BESAR, SOP DAN AHLI GIZI MASIH CARI KURSI",
      "INDONESIA GELAP, RILIS PERS TETAP TERANG",
      "UU TNI DIBAHAS CEPAT AGAR PUBLIK TIDAK KELELAHAN MEMBACA",
      "80.081 KOPDES LAHIR, ARUS KAS MASIH DI RUANG BERSALIN",
      "ANGGARAN PENDIDIKAN KENYANG DEFINISI, SEKOLAH MASIH PATUNGAN SPIDOL",
      "REMOTE SOLO MULAI ISI BATERAI UNTUK 2029",
      "17+8 MASUK PDF, KOLOM PENANGGUNG JAWAB MASIH LOADING",
    ],
    [
      "RUPIAH MASUK ANGIN, PIDATO FUNDAMENTAL TETAP SEHAT",
      "IHSG TERJUN, ADMIN MEMINDAHKAN BASELINE KE LANTAI DASAR",
      "PLN MATI BERGILIR, NARASI MENYALA 24 JAM",
      "BEM UI MENYEBUT BANGKRUT, PEMERINTAH MENAMBAH SATUAN DESIMAL",
      "FAKTA SAMPAI JULI, SESUDAHNYA TIMELINE MASUK SIMULASI",
    ],
    [
      "ASET NEGARA BERSINERGI, RISIKO DIMINTA ANTRE",
      "BANJIR MASUK APBN TANPA UNDANGAN",
      "AKTIVIS MENJADI MEREK, MEREK MEMBUKA LINK DONASI",
      "OPOSISI MENEMUKAN POWERPOINT, SLIDE PROGRAM MASIH KOSONG",
      "KANDIDAT BELUM KANDIDAT SILATURAHMI DI 34 PROVINSI",
    ],
    [
      "PODCAST DUA JAM RESMI MENJADI TES ELEKTABILITAS",
      "DINASTI 2.0 HADIR DENGAN LOGO LEBIH MINIMALIS",
      "DEEPFAKE MENANG DEBAT SEBELUM KANDIDAT NAIK PANGGUNG",
      "SEMUA TOKOH MENDADAK BELANJA DI PASAR TANPA MEMBAWA DOMPET",
      "KOALISI BUBAR KARENA URUTAN NAMA DI POSTER",
      "CACHE 2014 IKUT KAMPANYE 2028 TANPA DIMINTA",
    ],
    [
      "KOTAK SUARA MENUNGGU, ADMIN MENYIAPKAN DUA VERSI PIDATO KEMENANGAN",
      "QUICK COUNT BELUM 10%, KLAIM MANDAT RAKYAT SUDAH 100%",
      "DEBAT KANDIDAT DITERJEMAHKAN MENJADI 14 DETIK VERTIKAL",
      "PENGAWAS PEMILU MEMBUKA 87 TAB DAN SATU APLIKASI MEDITASI",
      "HASIL BELUM FINAL, BUDAYA DEMOKRASI SUDAH TERLANJUR DIUJI",
    ],
  ];
  function updateBreakingTicker(menu = false) {
    const el = $("#breakingTicker");
    if (!el) return;
    const phaseIndex = clamp(
      Number(state.phase) || 0,
      0,
      phaseTickers.length - 1,
    );
    const items = menu ? menuTicker : phaseTickers[phaseIndex];
    const prefix = menu
      ? "REPUBLIK TIMELINE"
      : `BREAKING ${phases[phaseIndex].period}`;
    el.textContent = `${prefix}: ${items.join(" • ")} • `;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }

  const actionDefs = {
    buzzer: [
      {
        id: "meme",
        name: "Meme Gemoy Berlapis",
        desc: "Sederhanakan isu sampai tinggal punchline dan emoji.",
        cost: 9000000,
        damage: 24,
        reach: 7,
        cred: -2,
        int: -2,
        stress: 1,
        dem: -1,
        heat: 6,
        tags: ["meme", "viral"],
        min: 0,
      },
      {
        id: "patriot",
        name: "Aktifkan Nasionalisme Darurat",
        desc: "Bingkai kritik sebagai kurang cinta negara tanpa menjawab substansi.",
        cost: 18000000,
        damage: 30,
        reach: 8,
        cred: -4,
        int: -6,
        stress: 2,
        dem: -4,
        heat: 10,
        tags: ["patriot", "emosi"],
        min: 0,
      },
      {
        id: "data",
        name: "Pilih Data yang Nyaman",
        desc: "Gunakan angka resmi yang benar, lalu sembunyikan pembanding yang mengganggu.",
        cost: 14000000,
        damage: 27,
        reach: 3,
        cred: 1,
        int: -4,
        stress: 2,
        dem: -2,
        heat: 3,
        tags: ["data", "cherry-pick"],
        min: 0,
      },
      {
        id: "whatabout",
        name: "What About Pemerintah Dulu?",
        desc: "Pindahkan isu sekarang ke kesalahan pihak lain sepuluh tahun lalu.",
        cost: 7000000,
        damage: 22,
        reach: 5,
        cred: -3,
        int: -4,
        stress: 1,
        dem: -2,
        heat: 8,
        tags: ["whatabout", "alih isu"],
        min: 0,
      },
      {
        id: "endorse",
        name: "Endorsement Selebritas",
        desc: "Pinjam kepercayaan pengikut dari figur populer. Transparansi dijual terpisah.",
        cost: 42000000,
        damage: 35,
        reach: 13,
        cred: -1,
        int: -3,
        stress: -1,
        dem: -2,
        heat: 8,
        tags: ["public figure", "network"],
        min: 1,
        requires: "Selebriti & akses",
      },
      {
        id: "podcast",
        name: "Podcast Penuh Otot",
        desc: "Bicara dua jam agar pertanyaan sulit kehabisan baterai lebih dulu.",
        cost: 36000000,
        damage: 38,
        reach: 11,
        cred: 0,
        int: -3,
        stress: -2,
        dem: -2,
        heat: 6,
        tags: ["podcast", "dominasi"],
        min: 2,
        requires: "Mikrofon kekuasaan",
      },
      {
        id: "attack",
        name: "Audit Masa Lalu Pengkritik",
        desc: "Cari tweet 2013 agar publik lupa membahas kebijakan 2026.",
        cost: 26000000,
        damage: 36,
        reach: 9,
        cred: -7,
        int: -10,
        stress: 4,
        dem: -7,
        heat: 14,
        tags: ["ad hominem", "toxic"],
        min: 2,
      },
      {
        id: "concert",
        name: "Konser Kebijakan Nasional",
        desc: "Ubah peluncuran program menjadi panggung sehingga pertanyaan tampak tidak sopan.",
        cost: 65000000,
        damage: 42,
        reach: 15,
        cred: -2,
        int: -4,
        stress: 1,
        dem: -3,
        heat: 10,
        tags: ["spectacle", "mass"],
        min: 3,
      },
      {
        id: "transparency",
        name: "Buka Data dan Akui Masalah",
        desc: "Strategi berisiko: perlakukan warga sebagai orang dewasa.",
        cost: 12000000,
        damage: 28,
        reach: 2,
        cred: 8,
        int: 10,
        stress: -5,
        dem: 7,
        heat: -8,
        tags: ["jujur", "reform"],
        min: 0,
      },
    ],
    aktivis: [
      {
        id: "context",
        name: "Thread Konteks",
        desc: "Susun kronologi, sumber, dan bagian yang sengaja dipotong.",
        cost: 7000000,
        damage: 27,
        reach: 3,
        cred: 5,
        int: 3,
        stress: 3,
        dem: 3,
        heat: -2,
        tags: ["konteks", "literasi"],
        min: 0,
      },
      {
        id: "data",
        name: "Buka Dokumen Primer",
        desc: "Berikan tabel, metodologi, dan tautan yang membuat admin lawan alergi PDF.",
        cost: 8000000,
        damage: 32,
        reach: 1,
        cred: 8,
        int: 4,
        stress: 5,
        dem: 5,
        heat: -4,
        tags: ["data", "verifikasi"],
        min: 0,
      },
      {
        id: "empathy",
        name: "Cerita Warga Terdampak",
        desc: "Hubungkan kebijakan dengan pengalaman manusia tanpa mengeksploitasi korban.",
        cost: 9000000,
        damage: 28,
        reach: 7,
        cred: 4,
        int: 4,
        stress: 3,
        dem: 3,
        heat: 1,
        tags: ["empati", "publik"],
        min: 0,
      },
      {
        id: "meme",
        name: "Meme Perlawanan",
        desc: "Bikin kritik mudah dibagikan. Risiko: kebijakan kompleks berubah menjadi musuh kartun.",
        cost: 6000000,
        damage: 23,
        reach: 9,
        cred: -2,
        int: -1,
        stress: -1,
        dem: 0,
        heat: 7,
        tags: ["meme", "viral"],
        min: 0,
      },
      {
        id: "network",
        name: "Konsolidasi Kampus & Warga",
        desc: "Bangun jaringan di luar timeline agar gerakan tidak mati saat akun ditangguhkan.",
        cost: 12000000,
        damage: 25,
        reach: 4,
        cred: 5,
        int: 4,
        stress: -7,
        dem: 7,
        heat: -5,
        tags: ["organisasi", "network"],
        min: 1,
        requires: "Basis sosial",
      },
      {
        id: "law",
        name: "Audit Konstitusi",
        desc: "Uji kewenangan, prosedur, konflik kepentingan, dan desain pengawasan.",
        cost: 16000000,
        damage: 39,
        reach: 1,
        cred: 9,
        int: 5,
        stress: 6,
        dem: 7,
        heat: -3,
        tags: ["hukum", "checks"],
        min: 2,
        requires: "Pakar hukum",
      },
      {
        id: "film",
        name: "Dokumenter Investigatif",
        desc: "Ubah dokumen dan kesaksian menjadi arsip audiovisual yang sulit dilupakan.",
        cost: 42000000,
        damage: 47,
        reach: 13,
        cred: 7,
        int: 5,
        stress: 10,
        dem: 8,
        heat: 9,
        tags: ["film", "investigasi"],
        min: 3,
        requires: "Jaringan produksi",
      },
      {
        id: "attack",
        name: "Bongkar Kehidupan Pribadi Lawan",
        desc: "Cepat viral, tidak menjawab kebijakan, dan membuatmu mirip mesin yang kamu lawan.",
        cost: 5000000,
        damage: 38,
        reach: 12,
        cred: -9,
        int: -13,
        stress: 5,
        dem: -8,
        heat: 16,
        tags: ["ad hominem", "toxic"],
        min: 1,
      },
      {
        id: "transparency",
        name: "Koreksi Diri Terbuka",
        desc: "Akui kesalahan data sebelum lawan mengubahnya menjadi alasan menolak seluruh kritik.",
        cost: 5000000,
        damage: 18,
        reach: -1,
        cred: 10,
        int: 8,
        stress: -4,
        dem: 5,
        heat: -8,
        tags: ["koreksi", "trust"],
        min: 0,
      },
    ],
  };

  const voiceProfiles = [
    {
      match: /Mayor Tedi|Kolonel KPI|Kolonel Tidak Berpolitik/i,
      label: "MODE NOTULEN KOMANDO",
      className: "voice-command",
      prefix: "Oke, gue lurusin ya. Poin satu: ",
      suffix:
        " Udah, poin dua nanti setelah semua orang bilang siap laksanakan.",
    },
    {
      match:
        /Purba-Yey|Margin Error|Elektabilitas|Sampel Nasional|Grafik Revisi|Kalkulator/i,
      label: "MODE KALKULATOR TANPA REM",
      className: "voice-data",
      prefix: "Nih gue buka angkanya: ",
      suffix:
        " Kalau chart-nya bikin sedih, jangan baseline-nya yang dimarahin.",
    },
    {
      match: /Bahlul/i,
      label: "MODE HILIRISASI SPONTAN",
      className: "voice-command",
      prefix: "Gini lho, bos. ",
      suffix:
        " Intinya hilirisasi dulu. Definisi detail belakangan, tepuk tangan sekarang.",
    },
    {
      match: /Guru Gembung-Bul|Gembul/i,
      label: "MODE BARAYA EXPLAINER",
      className: "voice-preacher",
      prefix: "Baraya, gini ya: ",
      suffix: " Jangan telan mentah-mentah, nanti kolom komentar kena maag intelektual.",
    },
    {
      match: /Feli-Xi-Auw/i,
      label: "MODE CERAMAH ALGORITMIK",
      className: "voice-preacher",
      prefix: "Teman-teman, coba jujur deh: ",
      suffix:
        " Versi 30 detiknya pasti nyampe duluan daripada konteks lengkapnya.",
    },
    {
      match: /Mardi-Gitu|Bossman/i,
      label: "MODE PAPAN TULIS GLOBAL",
      className: "voice-podcast",
      prefix: "Gue kasih sudut yang nggak diajarin di sekolah ya: ",
      suffix:
        " Kebetulan? Bisa aja. Tapi engagement nggak pernah suka jawaban sesederhana itu.",
    },
    {
      match: /fufufafa|akun forum|Kaskus/i,
      label: "MODE CACHE LAMA",
      className: "voice-bot",
      prefix: "[ARSIP FORUM DIPULIHKAN] ",
      suffix:
        " Identitas belum final. Screenshot keburu punya karier politik sendiri.",
    },
    {
      match: /Raymond Cuan-Check/i,
      label: "MODE BOARDROOM EXPLAINER",
      className: "voice-podcast",
      prefix: "Oke, gue breakdown simpel ya: ",
      suffix: " Jadi siapa pegang upside, siapa yang nombokin downside?",
    },
    {
      match: /Ferry Ir-Why-Nih/i,
      label: "MODE MONOLOG MORAL",
      className: "voice-podcast",
      prefix: "Gue ngomong blak-blakan ya. ",
      suffix:
        " Ini bukan kiri-kanan doang; ini soal siapa yang disuruh bayar sambil kameranya tetep nyala.",
    },
    {
      match: /Dandy Lensa-Sono|Layar Tancap/i,
      label: "MODE ARSIP VISUAL",
      className: "voice-documentary",
      prefix: "Gue taruh ini di timeline, cek frame per frame: ",
      suffix: " Videonya selesai, konsekuensinya nggak.",
    },
    {
      match:
        /BEM UI|Almamater|Reformasi|Pembela HAM|Tracker 17\+8|Koalisi Kreator Warga/i,
      label: "MODE PERNYATAAN SIKAP + PDF",
      className: "voice-press",
      prefix: "Halo warga, PDF-nya udah naik: ",
      suffix:
        " Baca full ya, jangan cuma screenshot halaman yang bikin emosi.",
    },
    {
      match: /Bot-Setyo|Sintetis|Video Tidak Pernah Ada|Pesan Terjadwal/i,
      label: "MODE SINTETIS 99,7%",
      className: "voice-bot",
      prefix: "[HASIL GENERASI SISTEM] ",
      suffix:
        " Pesan ini dinyatakan organik oleh sistem yang bikin pesannya.",
    },
    {
      match:
        /Gen-Z|Affiliate|Kreator|Influencer|Portofolio|Bursa Menteri|Rebranding|Calon Presiden Dua Jam/i,
      label: "MODE VERTIKAL 27 DETIK",
      className: "voice-genz",
      prefix: "POV: ",
      suffix:
        " Full context ada di bio, pas di bawah kode promo demokrasi.",
    },
    {
      match: /Prof\.|Hakim|Naskah|Pintu Rapat|Konflik Kepentingan/i,
      label: "MODE CATATAN KAKI MENYERANG",
      className: "voice-data",
      prefix: "Oke, sebelum pada ngamuk: ",
      suffix:
        " Tolong baca paragraf bawahnya juga, jangan cuma bikin carousel kesimpulan.",
    },
    {
      match:
        /Pak |Bu |Mbak Redaksi|Moderator|Panel Influencer|Republik Timeline/i,
      label: "MODE PERNYATAAN RESMI TAPI SANTAI",
      className: "voice-press",
      prefix: "Guys, versi resminya gini: ",
      suffix:
        " Pertanyaan lanjutan nanti ya, admin lagi nyari jawaban yang aman.",
    },
    {
      match: /.*/,
      label: "MODE WARGA + KOPI",
      className: "voice-citizen",
      prefix: "Sumpah ya, ",
      suffix:
        " Gue cuma pengen tahu siapa yang untung dan siapa yang disuruh santai.",
    },
  ];
  voiceProfiles.unshift(
    {match:/Mas Tiyo Toa|tiyotoa/i,label:"MODE TOA KAMPUS TANPA SENSOR",className:"voice-press",prefix:"Gue bilang apa adanya: ",suffix:" Kalau kritiknya bikin kuping panas, bagus. Tinggal pastikan datanya nggak ikut gosong."},
    {match:/Stela Krispi|stelakrispi/i,label:"MODE LAB OTAK & POLICY DECK",className:"voice-data",prefix:"Oke, jangan pakai feeling dulu. Kita pecah variabelnya: ",suffix:" Kalau slide-nya futuristik tapi anggarannya hilang, itu bukan inovasi. Itu screensaver."},
    {match:/Puanorama|puanorama/i,label:"MODE PALU SENAYAN",className:"voice-press",prefix:"Rapat saya buka. Tolong jawab yang ditanya: ",suffix:" Kalau belum siap, risalahnya tetap jalan. Kamera juga."},
    {match:/Mega-Watt|megawatt/i,label:"MODE GARIS PARTAI & STOPKONTAK",className:"voice-command",prefix:"Politik itu harus punya garis. ",suffix:" Koalisi boleh berubah, sejarah jangan pura-pura lupa siapa yang cabut colokan."},
    {match:/Akbar Pasal|akbarpasal/i,label:"MODE TANPA SENSOR & FOLLOW-UP",className:"voice-podcast",prefix:"Saya ulang pertanyaannya biar nggak kabur lewat jawaban normatif: ",suffix:" Jawabannya siapa, kapan, dan dokumennya mana. Bukan perasaan siapa yang terganggu."},
    {match:/Renal Disrupsi|renaldisrupsi/i,label:"MODE PERUBAHAN SLIDE 87",className:"voice-data",prefix:"Kita sedang masuk kurva perubahan. ",suffix:" Kalau organisasi cuma ganti logo, yang terdisrupsi cuma anggaran desain."},
    {match:/Gita Wacana-Wira|gitawacanawira/i,label:"MODE LONG GAME",className:"voice-podcast",prefix:"Mari tarik sedikit ke horizon yang lebih panjang: ",suffix:" Tapi long game tetap harus membayar short invoice. Institusi nggak hidup dari thumbnail."},
    {match:/Latih-Hitung|latihhitung/i,label:"MODE KALKULATOR DOMPET",className:"voice-data",prefix:"Sebentar, kita hitung dulu. ",suffix:" Gratis itu cara menerima. Bukan cara membiayai. APBN nggak makan jargon."},
    {match:/Satir-IO|satirio/i,label:"MODE SUHU PUBLIK",className:"voice-podcast",prefix:"Kalau baca suhu politik, jangan cuma lihat trending: ",suffix:" Timeline itu termometer satu ruangan. Indonesia rumahnya banyak."},
    {match:/Risky Februari|riskyfebruari|riskybanget/i,label:"MODE RISK REGISTER",className:"voice-data",prefix:"Headline-nya aset. Saya mau lihat risikonya: ",suffix:" Kalau rugi ditanggung publik, risk register jangan disimpan di laci yang kuncinya ikut rapat."},
    {match:/Pak Joko Woles|@kerjakerja|transisi_dua_presiden|legacy/i,label:"MODE KERJA SAJA",className:"voice-data",prefix:"Ya, saya kira begini. ",suffix:" Yang penting kerja. Sisanya ditanyakan ke yang terkait—saya juga lagi cari siapa yang terkait."},
    {match:/Menlu Sunyi Gono-Gini/i,label:"MODE DIPLOMASI HEMAT KATA",className:"voice-data",prefix:"Posisi Indonesia jelas. ",suffix:" Detailnya melalui jalur diplomatik, karena caption Instagram bukan nota diplomatik, walau kadang diperlakukan begitu."},
    {match:/Om Diplo Peta Dunia/i,label:"MODE FOREIGN POLICY THREAD",className:"voice-podcast",prefix:"Kita jujur aja ya: ",suffix:" Foto karpet merah itu bagus. Tapi strategic payoff-nya jangan ikut pulang naik pesawat kosong."},
    {match:/Roy Sur-Yoyo|Tifa-Tifi|forensikdariscreenshot/i,label:"MODE ZOOM 800%",className:"voice-preacher",prefix:"Saya cuma bertanya, ya. Coba zoom: ",suffix:" Kalau salah, bantah pakai dokumen asli. Jangan pakai emosi resolusi 144p."},
    {match:/Guru Gembung-Bul/i,label:"MODE BARAYA PANJANG",className:"voice-preacher",prefix:"Baraya, duduk dulu. Masalahnya gini: ",suffix:" Jangan cuma baca judul. Nanti komentar kita jadi praktikum sosiologi tanpa dosen."},
    {match:/Hasbun Naskah Basi|hasbunbrief|Dapur Klarifikasi/i,label:"MODE KLARIFIKASI BUTUH KLARIFIKASI",className:"voice-press",prefix:"Oke, gue lurusin yang lurusannya tadi agak belok: ",suffix:" Jangan dipotong ya. Kalau dipotong, besok kami bikin klarifikasi director's cut."},
    {match:/Konni BaksLaah|konnibakslaah/i,label:"MODE PETA PERTAHANAN LIPAT TIGA",className:"voice-podcast",prefix:"Gue bentang peta dulu ya, gelasnya minggir: ",suffix:" Kalau mau bantah, bawa dokumen. Jangan cuma bawa potongan tujuh detik sama musik tegang."},
    {match:/Ultima Waspadaban|ultimawaspada/i,label:"MODE THREAT ASSESSMENT PODCAST",className:"voice-data",prefix:"Sebelum panik nasional, cek tiga hal dulu: sumber, konteks, sama siapa yang jual paniknya. ",suffix:" Threat level belum tentu merah. Thumbnail-nya aja yang keburu merah."},
    {match:/Abu Jempol|abujempol/i,label:"MODE JEMPOL NASIONAL",className:"voice-command",prefix:"Bro, sederhana aja: ",suffix:" Yang setuju kasih bendera. Yang nanya panjang, nanti gue jawab pakai stiker singa."}
  );
  function netizenize(text) {
    const replacements = [
      [/\btidak\b/gi, "nggak"], [/\btetapi\b/gi, "tapi"], [/\bsudah\b/gi, "udah"],
      [/\bhanya\b/gi, "cuma"], [/\bkarena\b/gi, "soalnya"], [/\bmemang\b/gi, "emang"],
      [/\bingin\b/gi, "pengen"], [/\bbagaimana\b/gi, "gimana"], [/\bseperti\b/gi, "kayak"],
      [/\bterlihat\b/gi, "kelihatan"], [/\bmenjadi\b/gi, "jadi"], [/\btersebut\b/gi, "itu"],
      [/\bseharusnya\b/gi, "harusnya"], [/\bseluruh\b/gi, "semua"], [/\bnamun\b/gi, "cuma masalahnya"],
      [/\bsementara itu\b/gi, "di sisi lain"], [/\bmasyarakat\b/gi, "warga"], [/\bmelakukan\b/gi, "ngerjain"],
      [/\bmenjelaskan\b/gi, "ngejelasin"], [/\bmempertanyakan\b/gi, "nanyain"], [/\bmenyampaikan\b/gi, "nyampein"]
    ];
    let out = String(text || "");
    replacements.forEach(([r, v]) => (out = out.replace(r, v)));
    return out
      .replace(/;\s*/g, ". ")
      .replace(/\s+\./g, ".")
      .replace(/\s+/g, " ")
      .trim();
  }
  function escapeHtml(v) {
    return String(v ?? "").replace(
      /[&<>'"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c],
    );
  }
  const issuePunchlines = {
    constitution:"Konstitusi lagi jadi pintu otomatis: kebuka pas keluarga datang, macet pas publik mau masuk.",
    dirtyvote:"Yang paling cepat keluar bukan bantahan, tapi thumbnail reaction dengan muka kaget.",
    election:"Server belum selesai ngunyah data, spanduk kemenangan udah dicetak bolak-balik.",
    court:"Sidangnya enam jam. Yang viral alis hakim bergerak enam milimeter.",
    jokowi:"Remote katanya udah diserahin. Kok baterainya masih hangat?",
    cabinet:"Kursi ditambah biar koordinasi gampang. Gedungnya malah minta expansion pack.",
    mbg:"Anak-anak butuh protein. Timeline kebagian garnish dan drone shot.",
    darkprotests:"Lampu kota nyala. Masa depan anak kampus masuk mode hemat daya.",
    tni:"Rapatnya tertutup, hasilnya disebut partisipatif. Aspirasi masuk lewat ventilasi.",
    diploma:"Ijazah masuk zoom 800 persen. Akal sehat keluar frame pelan-pelan.",
    diplomacy:"Paspor penuh cap. Warga nanya oleh-oleh kebijakannya ditaruh di bagasi mana.",
    kopdes:"Koperasi disuruh sikap sempurna. Neraca keuangan masih salah baris.",
    lawfare:"Pasal masuk war room. Keadilan disuruh tunggu admin upload carousel.",
    august:"Duka belum selesai, akun anonim udah jual paket teori dalang.",
    seventeen:"Tuntutannya 17+8. Admin pemerintah bacanya 1, 7, terus istirahat.",
    disaster:"Air naik, sinyal turun, konferensi pers tetap HD.",
    market:"IHSG merah. Admin pilih background hijau biar fundamental nggak insecure.",
    pln:"Listrik mati bergilir. Narasi nyala 24 jam tanpa token.",
    rupiah:"Rupiah melemah. Optimisme dikuatkan pakai mic wireless dan grafik crop.",
    protest:"Mahasiswa teriak bangkrut, pejabat jawab fundamental kuat. Dua kalimat ini nggak saling follow.",
    nadiem:"Laptop masuk pengadilan. Charger, konteks, dan presumption of innocence rebutan colokan.",
    publicfigures:"Paid partnership-nya font 6. Senyumnya 4K.",
    finance:"Angka makro kelihatan sehat. Dompet warga minta second opinion.",
    future:"Belum kejadian, tapi konsultan udah kirim invoice termin pertama.",
    future2027:"Negara belum jadi korporasi penuh. Deck investornya udah minta logo baru.",
    future2028:"Belum deklarasi, podcastnya udah punya sponsor tiga episode.",
    future2029:"Kotak suara belum dibuka. War room udah pesen bunga kemenangan."
  };
  const phasePunchlines = [
    "Musim pemilu: semua orang punya prinsip, sampai rate card masuk.",
    "Tahun pertama: kebijakan baru, logo baru, masalah lama pakai lanyard.",
    "Ekonomi batuk, humas nyalain musik motivasi.",
    "Timeline-nya alternatif. Invoice konsultannya sayangnya realistis.",
    "Pra-pemilu: orang yang lima tahun hilang mendadak hafal harga cabai.",
    "Pemilu lagi. Republik menekan refresh, cache lamanya belum dibersihin."
  ];
  function getVoiceProfile(i) {
    const fingerprint = window.PNCharacterVoices?.resolve?.({
      id: i.characterId || i.voiceId,
      name: i.npc,
      handle: i.handle,
      key: i.key,
    });
    if (fingerprint && fingerprint.id !== "fallback") return fingerprint;
    if (/Jenderal Gemoyono|@gemoyono|Gemoyono/i.test(`${i.npc} ${i.handle}`)) {
      if (state.phase === 0) return {
        label: "MODE GEMOY • JOGET DULU",
        className: "voice-command",
        prefix: "He-he, santai. Pemilu harus gembira. ",
        suffix: " Kalau suasana panas, kita joget dulu. Rakyat sudah pintar menilai.",
      };
      return {
        label: "MODE KOMANDO • MUSUH BERSAMA",
        className: "voice-command",
        prefix: "Saudara-saudara, saya bicara terus terang. ",
        suffix: " Negara harus kuat, satu komando, dan jangan kalah oleh omon-omon atau pihak yang ingin Indonesia gagal.",
      };
    }
    return voiceProfiles.find((v) => v.match.test(`${i.npc} ${i.handle} ${i.key}`)) || voiceProfiles.at(-1);
  }
  function loosenPost(body){
    return netizenize(body)
      .replace(/\bDi timeline,\s*/gi,"Di timeline? ")
      .replace(/\bNetizen bertanya:\s*/gi,"Netizen langsung nanya: ")
      .replace(/\bPemerintah menyebut\s*/gi,"Versi pemerintah: ")
      .replace(/\bKritikus menyebut\s*/gi,"Versi pengkritik: ")
      .replace(/\bSemua kubu\s*/gi,"Semua kubu, seperti biasa, ")
      .replace(/\bPublik\s*/gi,"Warga ")
      .replace(/\s+/g," ")
      .trim();
  }
  function voicePostHtml(i) {
    const rendered = window.PNCharacterVoices?.renderPost?.({
      id: i.characterId || i.voiceId,
      name: i.npc,
      handle: i.handle,
      key: i.key,
      issue: i,
      phase: state.phase,
      seed: `${state.runSeed}:${state.phase}:${state.day}:${i.variantId || i.key || i.npc}`,
      base: i.post,
    });
    if (rendered) {
      return `<span class="voice-chip">${escapeHtml(rendered.label)}</span><div class="voice-copy ${escapeHtml(rendered.className)}">${escapeHtml(rendered.text)}</div>`;
    }
    const v = getVoiceProfile(i), body = loosenPost(i.post), copy = `${v.prefix}${body} ${v.suffix}`.replace(/\s+/g," ").trim();
    return `<span class="voice-chip">${v.label}</span><div class="voice-copy ${v.className}">${escapeHtml(copy)}</div>`;
  }
  const phaseActionFlavor = {
    buzzer: [
      {
        meme: [
          "Gemoykan Rekam Jejak",
          "Ubah masa lalu menjadi stiker lucu yang aman untuk pemilih yang sedang menunggu kopi.",
        ],
        patriot: [
          "Bungkus Kandidat dengan Merah Putih",
          "Jadikan pertanyaan tentang rekam jejak terdengar seperti gangguan terhadap persatuan nasional.",
        ],
        data: [
          "Potong Survei di Margin Terbaik",
          "Pilih crosstab yang paling bahagia dan biarkan margin of error tinggal di catatan kaki.",
        ],
        whatabout: [
          "Bandingkan dengan Paslon Sebelah",
          "Jawab setiap kritik dengan kompilasi kesalahan kandidat lain.",
        ],
        endorse: [
          "Turunkan Skuad Selebritas",
          "Ubah dukungan politik menjadi reuni konten dengan kamera vertikal.",
        ],
        transparency: [
          "Buka CV Tanpa Filter Gemoy",
          "Akui bagian yang sulit sebelum lawan mengubahnya menjadi film dua jam.",
        ],
      },
      {
        meme: [
          "Masak Kebijakan Jadi Stiker",
          "Ringkas program nasional menjadi satu slogan yang muat di tutup kotak makan.",
        ],
        patriot: [
          "Negara Sedang Kerja, Jangan Ganggu",
          "Perlakukan pertanyaan sebagai suara bor yang menghambat pembangunan.",
        ],
        data: [
          "Pamer Angka Serapan",
          "Tampilkan dana terserap; manfaat yang benar-benar sampai menyusul di slide berikutnya.",
        ],
        whatabout: [
          "Warisan Pemerintah Dulu",
          "Pindahkan semua tagihan tahun pertama ke pemerintahan sebelumnya.",
        ],
        endorse: [
          "Tur Dapur & Proyek Bersama Seleb",
          "Pastikan kamera menemukan senyum sebelum auditor menemukan vendor.",
        ],
        transparency: [
          "Buka Dashboard Pelaksanaan",
          "Tampilkan target, kegagalan, vendor, dan koreksi tanpa musik kemenangan.",
        ],
      },
      {
        meme: [
          "Bikin Grafik Dompet Tetap Senyum",
          "Jadikan tekanan ekonomi sebagai infografik dengan panah hijau dan font optimistis.",
        ],
        patriot: [
          "Aktifkan Optimisme Wajib",
          "Bingkai kecemasan ekonomi sebagai kekurangan iman pada potensi nasional.",
        ],
        data: [
          "Ganti Baseline, Selamatkan Grafik",
          "Bandingkan angka sekarang dengan titik yang membuatnya terlihat paling kuat.",
        ],
        whatabout: [
          "Ekonomi Global Juga Pusing",
          "Gunakan krisis luar negeri sebagai selimut untuk seluruh keputusan domestik.",
        ],
        podcast: [
          "Podcast Dua Jam Soal Satu Angka",
          "Biarkan pertanyaan kehilangan tenaga sebelum jawaban mencapai kesimpulan.",
        ],
        transparency: [
          "Akui Tekanan dan Pilihan Sulit",
          "Sebut siapa yang menanggung biaya dan apa yang benar-benar dikurangi.",
        ],
      },
      {
        meme: [
          "Jadikan Proyeksi Sebagai Bocoran",
          "Ubah skenario kebijakan menjadi “info lingkaran dalam” yang tidak dapat diverifikasi.",
        ],
        patriot: [
          "Kedaulatan Korporasi Nasional",
          "Bingkai setiap konsolidasi aset sebagai ujian cinta tanah air.",
        ],
        data: [
          "Simulasi Dividen Terbaik",
          "Pilih proyeksi paling cerah dan panggil sisanya sebagai pesimisme metodologis.",
        ],
        concert: [
          "Peluncuran Negara Korporasi",
          "Gunakan drone, layar LED, dan satu kalimat tentang rakyat.",
        ],
        transparency: [
          "Labeli Fakta, Asumsi, dan Fiksi",
          "Merusak suasana dengan menjelaskan apa yang benar-benar diketahui.",
        ],
      },
      {
        meme: [
          "Bikin Kandidat Jadi Template",
          "Ubah calon pemimpin menjadi format konten yang bisa dipakai semua partai.",
        ],
        patriot: [
          "Nasionalisme Pra-Deklarasi",
          "Kandidat belum mendaftar, tetapi lagu kebangsaannya sudah punya remix.",
        ],
        data: [
          "Survei Internal Sangat Independen",
          "Rilis angka yang kebetulan cocok dengan rundown deklarasi.",
        ],
        endorse: [
          "Affiliate Capres Nasional",
          "Sebarkan kode promo demokrasi melalui kreator yang “kebetulan suka programnya”.",
        ],
        podcast: [
          "Podcast Belum Deklarasi",
          "Bicara tiga jam tentang visi tanpa sekali pun mengaku sedang kampanye.",
        ],
        attack: [
          "Audit Digital Bakal Calon",
          "Cari unggahan lama sebelum nomor urut sempat dicetak.",
        ],
      },
      {
        meme: [
          "Menangkan Debat dengan Reaction GIF",
          "Jadikan jawaban kebijakan sebagai bahan stiker sebelum moderator selesai bicara.",
        ],
        patriot: [
          "Deklarasikan Mandat Sebelum Hitung",
          "Ubah antrean TPS menjadi bukti kemenangan moral.",
        ],
        data: [
          "Quick Count Warna Sendiri",
          "Pilih lembaga, jam, dan layar yang paling cocok dengan narasi pusat komando.",
        ],
        whatabout: [
          "Kecurangan Kubu Sebelah Dulu",
          "Siapkan delegitimasi hasil sebelum tahu apakah hasilnya merugikan.",
        ],
        endorse: [
          "Finale Kreator Nasional",
          "Satukan selebritas, ulama, podcaster, dan grafik elektabilitas dalam satu panggung.",
        ],
        transparency: [
          "Jaga Transisi dan Buka Rekap",
          "Tampilkan data, koreksi, sumber dana, dan aturan main bahkan ketika hasil belum nyaman.",
        ],
      },
    ],
    aktivis: [
      {
        context: [
          "Utas Rekam Jejak Anti-Amnesia",
          "Susun kronologi sebelum maskot kampanye menelan seluruh masa lalu.",
        ],
        data: [
          "Buka Dokumen Pemilu Primer",
          "Tautkan putusan, laporan dana, survei, dan metodologi tanpa potongan favorit.",
        ],
        empathy: [
          "Cerita Pemilih di Luar Panggung",
          "Tampilkan warga yang tidak masuk montage kampanye.",
        ],
        meme: [
          "Meme Anti-Gemoyisasi",
          "Buat kritik mudah dibagikan tanpa mengubah sejarah menjadi fan fiction.",
        ],
        network: [
          "Bangun Posko Cek Fakta",
          "Hubungkan kampus, warga, dan pemantau sebelum hari pencoblosan.",
        ],
        transparency: [
          "Koreksi Thread Sebelum Diratio",
          "Akui kesalahan angka sebelum seluruh argumen dibuang.",
        ],
      },
      {
        context: [
          "Susun Timeline Janji vs Faktur",
          "Bandingkan pidato pelantikan, aturan pelaksana, anggaran, dan dampaknya.",
        ],
        data: [
          "Audit Dapur, Pasal, dan Kursi",
          "Buka vendor, naskah hukum, konflik kepentingan, serta realisasi program.",
        ],
        empathy: [
          "Bawa Suara Warga ke Feed",
          "Jangan biarkan korban hanya menjadi B-roll konferensi pers.",
        ],
        network: [
          "Konsolidasi Kampus & Jalanan",
          "Hubungkan kajian, bantuan hukum, logistik, dan keamanan peserta aksi.",
        ],
        law: [
          "Uji Seratus Hari ke Konstitusi",
          "Periksa kewenangan, prosedur, dan pengawasan di balik jargon percepatan.",
        ],
        film: [
          "Dokumenter Tahun Pertama",
          "Simpan janji, kerusakan, koreksi, dan wajah warga sebelum narasi direvisi.",
        ],
      },
      {
        context: [
          "Thread Dompet Republik",
          "Hubungkan rupiah, APBN, harga, transfer daerah, dan pilihan politik.",
        ],
        data: [
          "Buka Spreadsheet yang Tidak Senyum",
          "Tampilkan asumsi, baseline, dan pihak yang menanggung penghematan.",
        ],
        empathy: [
          "Cerita Kelas Menengah Turun Tangga",
          "Buat statistik ekonomi kembali memiliki tubuh dan cicilan.",
        ],
        meme: [
          "Meme Kalkulator Bangkrut",
          "Gunakan humor ekonomi tanpa menyebut semua masalah sebagai kiamat literal.",
        ],
        law: [
          "Audit Fiskal dan Hak Warga",
          "Uji apakah efisiensi dan program prioritas tetap tunduk pada aturan.",
        ],
        transparency: [
          "Koreksi Prediksi Ekonomi",
          "Pisahkan data, skenario buruk, dan slogan demonstrasi.",
        ],
      },
      {
        context: [
          "Peta Konsorsium Kekuasaan",
          "Susun hubungan aset, regulasi, elite, dan warga terdampak.",
        ],
        data: [
          "Bedah Proyeksi Negara Korporasi",
          "Tulis asumsi dan indikator yang dapat membuktikanmu salah.",
        ],
        empathy: [
          "Arsip Warga di Luar Masterplan",
          "Dokumentasikan siapa yang hilang dari slide investasi.",
        ],
        network: [
          "Bangun Konsorsium Warga",
          "Hubungkan ahli, komunitas lokal, jurnalis, dan bantuan hukum.",
        ],
        film: [
          "Dokumenter Fiksi yang Terlalu Mungkin",
          "Gunakan skenario prediktif untuk menguji risiko, bukan menjual ramalan.",
        ],
        transparency: [
          "Tandai Fakta vs Prediksi",
          "Jelaskan batas pengetahuan sebelum klipmu dianggap bocoran resmi.",
        ],
      },
      {
        context: [
          "Utas Siapa di Balik Kandidat",
          "Petakan donor, konsultan, relasi bisnis, dan migrasi elite.",
        ],
        data: [
          "Audit Survei & Dana Kreator",
          "Periksa sponsor polling, iklan mikro-target, dan paid partnership.",
        ],
        empathy: [
          "Dengar Warga yang Belum Punya Jagoan",
          "Jangan paksa semua kecemasan masuk ke fanbase kandidat.",
        ],
        meme: [
          "Meme Anti-Affiliate Demokrasi",
          "Tertawakan absurditas tanpa menjadi akun serangan berbayar versi tote bag.",
        ],
        network: [
          "Koalisi Isu, Bukan Koalisi Idola",
          "Jaga tuntutan bersama ketika aktivis mulai pecah karena capres.",
        ],
        film: [
          "Dokumenter Pra-Pemilu",
          "Tampilkan struktur kekuasaan sebelum semua orang mengganti bio menjadi relawan.",
        ],
      },
      {
        context: [
          "Kronologi Enam Tahun",
          "Tarik garis dari kampanye lama ke janji baru tanpa memilihkan jawaban bagi warga.",
        ],
        data: [
          "Buka Rekap dan Dana Kampanye",
          "Periksa data TPS, belanja iklan, survei, dan koreksi secara terbuka.",
        ],
        empathy: [
          "Cerita Pemilih yang Masih Ragu",
          "Beri ruang pada warga yang menolak menjadi statistik fanwar.",
        ],
        meme: [
          "Meme Masa Tenang yang Berisik",
          "Bongkar absurditas scheduled post tanpa menyebarkan disinformasi baru.",
        ],
        network: [
          "Jaringan Pengawas hingga Rekap",
          "Jaga TPS, bantuan hukum, data, dan komunikasi lintas kubu.",
        ],
        law: [
          "Audit Aturan Main Terakhir",
          "Uji pencalonan, netralitas, bansos, sengketa, dan transisi.",
        ],
        film: [
          "Film Pemilu Tanpa Pemenang Titipan",
          "Arsipkan proses dan konsekuensi; biarkan kotak suara tetap terbuka.",
        ],
      },
    ],
  };
  const topicActionFlavor = {
    mbg: {
      buzzer: {
        meme: [
          "Menu Bergizi Jadi Konten Mukbang",
          "Tampilkan satu dapur sempurna sebagai wakil seluruh negeri.",
        ],
        data: [
          "Hitung Porsi, Hilangkan Overhead",
          "Gunakan biaya makanan; simpan biaya sistem di appendix.",
        ],
      },
      aktivis: {
        data: [
          "Audit Porsi sampai Vendor",
          "Bandingkan gizi, biaya, keamanan, kapasitas, dan rantai pasok.",
        ],
        empathy: [
          "Dengar Anak, Orang Tua, dan Petugas Dapur",
          "Hindari menjadikan korban sekadar angka kontra-narasi.",
        ],
      },
    },
    tni: {
      buzzer: {
        patriot: [
          "Seragamkan Kritik sebagai Ancaman",
          "Bingkai debat kewenangan sipil sebagai kurang hormat pada negara.",
        ],
        whatabout: [
          "Dulu Juga Ada Dwifungsi?",
          "Gunakan sejarah sebagai kabut, bukan pelajaran.",
        ],
      },
      aktivis: {
        law: [
          "Bedah Pasal Sipil-Militer",
          "Uji jabatan, kewenangan, pengawasan, dan mekanisme kembali ke institusi.",
        ],
        context: [
          "Tarik Garis Reformasi",
          "Hubungkan perubahan pasal dengan sejarah pembatasan kekuasaan.",
        ],
      },
    },
    budget: {
      buzzer: {
        data: [
          "Tampilkan Realisasi, Sembunyikan Opportunity Cost",
          "Serapan tinggi tampil besar; layanan yang dipotong tetap dalam ukuran 8px.",
        ],
      },
      aktivis: {
        data: [
          "Bandingkan Anggaran dengan Layanan Hilang",
          "Tunjukkan siapa menerima prioritas dan siapa menerima surat efisiensi.",
        ],
      },
    },
    finance: {
      buzzer: {
        podcast: [
          "Undang Pak Purba-Yey ke Podcast",
          "Biarkan angka kasar terdengar seperti terapi optimisme.",
        ],
      },
      aktivis: {
        context: [
          "Terjemahkan Makro ke Cicilan",
          "Hubungkan kebijakan dengan harga, kerja, daerah, dan rumah tangga.",
        ],
      },
    },
    election2029: {
      buzzer: {
        data: [
          "Bangun War Room Quick Count",
          "Pilih feed tercepat dan disclaimer terkecil.",
        ],
        attack: [
          "Temukan Deepfake Sebelum Fakta",
          "Sebarkan keraguan terhadap semua bukti agar bukti asli ikut tenggelam.",
        ],
      },
      aktivis: {
        network: [
          "Posko Rekap & Bantuan Hukum",
          "Hubungkan saksi, data, dan respons cepat lintas daerah.",
        ],
        law: [
          "Jaga Sengketa Tetap Berbasis Bukti",
          "Pisahkan temuan, dugaan, dan fan fiction kubu.",
        ],
      },
    },
    dirtyvote: {
      buzzer: {
        attack: [
          "Audit Sutradara, Jangan Filmnya",
          "Pindahkan percakapan dari dokumen ke motif pembuat.",
        ],
      },
      aktivis: {
        film: [
          "Nonton Bareng + Buka Dokumen",
          "Jadikan film pintu masuk ke sumber, bukan kitab suci baru.",
        ],
      },
    },
    publicfigures: {
      buzzer: {
        endorse: [
          "Turunkan Figur dengan Disclosure Mini",
          "Pastikan wajah besar, label kerja sama kecil.",
        ],
      },
      aktivis: {
        context: [
          "Audit Mandat dan Rate Card",
          "Bedakan dukungan pribadi, kontrak, jabatan, dan konflik kepentingan.",
        ],
      },
    },
    future: {
      buzzer: {
        meme: [
          "Ubah Prediksi Jadi Bocoran",
          "Hilangkan label fiksi agar engagement terasa seperti akses.",
        ],
      },
      aktivis: {
        transparency: [
          "Pasang Penanda Batas Arsip",
          "Buat satire tetap jujur tentang batas pengetahuan.",
        ],
      },
    },
  };
  const phaseFallbackFlavor = {
    buzzer: [
      {
        attack: [
          "Gali Dosa Digital Tim Sebelah",
          "Cari arsip personal agar substansi kampanye pindah jalur.",
        ],
        concert: [
          "Rapat Akbar Estetika Nasional",
          "Buat panggung lebih besar daripada daftar pertanyaan.",
        ],
        podcast: [
          "Live Klarifikasi Relawan",
          "Bicara lama dengan moderator yang sudah setuju.",
        ],
      },
      {
        attack: [
          "Audit Pengkritik Program",
          "Periksa masa lalu orang yang bertanya agar program tidak perlu diperiksa.",
        ],
        concert: [
          "Festival Seratus Hari",
          "Rayakan capaian sebelum indikator hasil selesai dikumpulkan.",
        ],
        podcast: [
          "Podcast Kabinet Ramai",
          "Semakin banyak menteri, semakin sedikit waktu untuk follow-up.",
        ],
      },
      {
        endorse: [
          "Tur Optimisme Bersama Figur Publik",
          "Pinjam kedekatan selebritas untuk menjelaskan angka yang makin jauh dari dompet.",
        ],
        concert: [
          "Panggung Ekonomi Tahan Banting",
          "Gunakan layar LED agar rupiah di grafik terlihat lebih tegak.",
        ],
        attack: [
          "Audit Gaya Hidup Pengkritik Ekonomi",
          "Alihkan debat dari daya beli ke pilihan kopi lawan.",
        ],
      },
      {
        whatabout: [
          "Bandingkan dengan Krisis Negara Lain",
          "Gunakan penderitaan global sebagai pembanding universal.",
        ],
        endorse: [
          "Dewan Pakar Influencer",
          "Berikan jabatan panjang agar promosi terasa seperti riset.",
        ],
        podcast: [
          "Town Hall CEO Negara",
          "Ubah kebijakan publik menjadi presentasi investor tanpa sesi warga.",
        ],
        attack: [
          "Audit Motif Pengkritik Investasi",
          "Tanyakan siapa yang membiayai kritik sebelum membuka siapa yang membiayai proyek.",
        ],
      },
      {
        whatabout: [
          "Capres Sebelah Juga Punya Dinasti",
          "Normalisasi masalah dengan menunjukkan bahwa semua kubu memilikinya.",
        ],
        concert: [
          "Deklarasi di Enam Stadion",
          "Panggung besar, manifesto masih dalam revisi.",
        ],
        transparency: [
          "Buka Donor dan Kontrak Kreator",
          "Tampilkan kepentingan sebelum publik menemukannya lewat invoice bocor.",
        ],
        attack: [
          "War Room Riwayat Calon",
          "Cari potongan lama untuk memproduksi skandal mingguan.",
        ],
      },
      {
        endorse: [
          "Panggung Dukungan Terakhir",
          "Satukan semua figur sebelum masa tenang dan jadwalkan posting sesudahnya.",
        ],
        podcast: [
          "Debat Setelah Debat",
          "Klaim kemenangan di studio sendiri setelah moderator pulang.",
        ],
        attack: [
          "War Room Pembunuhan Karakter",
          "Jadikan keraguan sebagai produk massal ketika bukti terlalu lambat.",
        ],
        concert: [
          "Konser Kemenangan Sebelum Hasil",
          "Rayakan mandat yang masih berada di server quick count.",
        ],
      },
    ],
    aktivis: [
      {
        law: [
          "Audit Aturan Pemilu",
          "Uji pencalonan, kampanye, dana, dan sengketa sebelum semua kubu mengklaim darurat.",
        ],
        film: [
          "Arsip Kampanye dari Bawah",
          "Rekam warga dan struktur kuasa di luar panggung kandidat.",
        ],
        attack: [
          "Doxxing dengan Tote Bag",
          "Menjadi mesin serangan yang kamu kritik, tetapi dengan desain lebih bagus.",
        ],
      },
      {
        meme: [
          "Meme Seratus Hari",
          "Ringkas kontradiksi tanpa menghapus korban dan konteks.",
        ],
        attack: [
          "Bongkar Privat Pejabat",
          "Viral cepat, relevansi kebijakan nol, integritas ikut turun.",
        ],
        transparency: [
          "Publikasikan Koreksi Kajian",
          "Perbaiki data sebelum propaganda memakai kesalahanmu sebagai sapu universal.",
        ],
      },
      {
        network: [
          "Posko Ekonomi Warga",
          "Hubungkan bantuan, data harga, serikat, kampus, dan daerah.",
        ],
        film: [
          "Dokumenter Dompet & Negara",
          "Rekam bagaimana angka makro tinggal di tubuh warga.",
        ],
        attack: [
          "Serang Keluarga Pembela Kebijakan",
          "Mengulang kekerasan personal dengan bendera berbeda.",
        ],
      },
      {
        law: [
          "Audit Tata Kelola Aset Publik",
          "Periksa mandat, konflik kepentingan, dan mekanisme pengawasan.",
        ],
        meme: [
          "Meme Konsorsium",
          "Buat struktur rumit terbaca tanpa menciptakan konspirasi baru.",
        ],
        attack: [
          "Bikin Teori Semua Terhubung",
          "Isi celah bukti dengan garis merah dan rasa yakin.",
        ],
      },
      {
        law: [
          "Audit Aturan Pra-Kampanye",
          "Uji iklan, donor, penggunaan jabatan, dan kampanye terselubung.",
        ],
        attack: [
          "Fanwar atas Nama Gerakan",
          "Ganti tuntutan publik dengan pertengkaran siapa paling murni.",
        ],
        transparency: [
          "Buka Konflik Kepentingan Gerakan",
          "Akui afiliasi, donasi, dan dukungan kandidat tanpa malu-malu.",
        ],
      },
      {
        meme: [
          "Meme Rekap Nasional",
          "Gunakan humor untuk mengajak cek data, bukan mengganti data.",
        ],
        empathy: [
          "Dengar Pemilih Setelah Mencoblos",
          "Jangan mengubah warga menjadi properti kemenangan atau kekalahan.",
        ],
        attack: [
          "Serang Pemilih Kubu Lain",
          "Cara tercepat memastikan pemilu selesai tetapi masyarakat tidak.",
        ],
        transparency: [
          "Koreksi Temuan Secara Real Time",
          "Tarik klaim yang salah sebelum menjadi bahan sengketa.",
        ],
      },
    ],
  };
  const actionAlternativeFlavor = {
    buzzer: {
      meme: [
        ["Potong Jadi Reels 9 Detik", "Isunya panjang, videonya pendek, caption-nya cuma: paham kan?"],
        ["Stiker WA Serangan Balik", "Ubah argumen jadi stiker yang bakal nyasar ke grup keluarga sebelum makan siang."],
        ["Template Meme Cadangan", "Punchline baru, font tetap Impact, konteks kembali diminta antre."],
      ],
      patriot: [
        ["Kibarkan Emoji Darurat", "Tambahkan bendera sampai kritik kelihatan seperti pelanggaran upacara."],
        ["Lagu Wajib di Background", "Naikkan volume nasionalisme biar pertanyaan kebijakan tenggelam di chorus."],
        ["Cap Kurang Merah Putih", "Bikin skala cinta negara berdasarkan seberapa sering orang setuju sama admin."],
      ],
      data: [
        ["Grafik Mulai dari Nol yang Salah", "Atur sumbu sampai kenaikan kecil terlihat kayak lompatan peradaban."],
        ["Pilih Persentase Paling Cakep", "Angkanya sah, pembandingnya kebetulan lagi cuti."],
        ["Screenshot Tabel Tanpa Catatan Kaki", "Ambil kolom terbaik, crop metodologi, lalu bilang data tidak bisa bohong."],
      ],
      whatabout: [
        ["Tapi Zaman Dulu Gimana?", "Geser bulan ini ke dosa pemerintahan lama sebelum orang sempat buka dokumen."],
        ["Buka Folder Skandal Sebelah", "Kalau isu susah dijawab, pindahkan penonton ke kebakaran lain."],
        ["Lempar Nama Mantan Pejabat", "Satu nama lama cukup buat reply berubah jadi reuni dendam nasional."],
      ],
      endorse: [
        ["Titip Narasi ke Seleb", "Pinjam muka terkenal, kasih tiga poin bicara, jangan bahas disclosure dulu."],
        ["Unboxing Kebijakan Berbayar", "Program negara dibuka seperti paket skincare: lighting bagus, syarat kecil."],
        ["Joget Dulu, Transparansi Nanti", "Buat koreografi sederhana untuk kebijakan yang penjelasannya 84 halaman."],
      ],
      podcast: [
        ["Monolog Dua Jam Tanpa Jeda", "Jawab semua pertanyaan sekaligus sampai penonton lupa pertanyaan pertama."],
        ["Potong Jawaban Jadi Shorts", "Ambil 17 detik paling gagah dari dua jam percakapan."],
        ["Undang Host yang Nggak Nyela", "Suasana santai, kopi hangat, pertanyaan tindak lanjut tidak diundang."],
      ],
      attack: [
        ["Gali Tweet Zaman Blackberry", "Cari salah ketik 2012 untuk membatalkan kritik 2026."],
        ["Bikin Kolase Masa Lalu", "Empat screenshot, satu musik tegang, nol hubungan dengan kebijakan."],
        ["Seret Circle Pertemanan", "Kalau orangnya susah diserang, audit siapa yang pernah foto bareng dia."],
      ],
      concert: [
        ["Festival Prestasi Nasional", "Tambah panggung, drone, dan MC sampai evaluasi kebijakan terasa merusak vibe."],
        ["Launching plus Band Pembuka", "Program baru butuh gitar solo supaya pertanyaan anggaran terdengar kurang asyik."],
        ["Panggung Rakyat Lampu Seribu", "Semakin terang LED-nya, semakin redup bagian lampiran."],
      ],
      transparency: [
        ["Upload Dokumen Utuh", "Langkah ekstrem: kasih warga file lengkap, bukan carousel pilihan admin."],
        ["Akui Salah Sebelum Trending", "Koreksi duluan sebelum netizen bikin nama skandal yang lebih catchy."],
        ["Q&A Tanpa Pertanyaan Titipan", "Buka mikrofon dan terima risiko warga benar-benar bertanya."],
      ],
    },
    aktivis: {
      context: [
        ["Cari Video Sebelum Dipotong", "Buka versi panjang sebelum timeline memilih 11 detik paling emosional."],
        ["Thread Konteks Babak Dua", "Tambah tanggal, pelaku, dan urutan kejadian tanpa bikin pembaca ujian skripsi."],
        ["Buka Arsip yang Dilupakan", "Tarik dokumen lama supaya semua kubu gagal pura-pura baru dengar."],
      ],
      data: [
        ["Audit Angka Babak Dua", "Cek denominator, baseline, dan siapa yang mendadak hilang dari tabel."],
        ["Grafik yang Nggak Nipu", "Bikin visual yang masih masuk akal walau tidak se-viral grafik miring."],
        ["Baca Catatan Kaki Sampai Habis", "Temukan kalimat kecil yang biasanya lebih jujur daripada konferensi pers."],
      ],
      empathy: [
        ["Dengar Warga yang Kena", "Turunkan volume pundit, naikkan suara orang yang hidup di dalam dampaknya."],
        ["Voice Note dari Lapangan", "Bawa cerita konkret, termasuk bagian yang nggak muat jadi slogan."],
        ["Ruang Aman Buat Cerita", "Jangan paksa korban berubah jadi konten sebelum mereka siap."],
      ],
      meme: [
        ["Meme Edukatif Versi Receh", "Bikin orang ketawa dulu, lalu selipkan sumber sebelum mereka kabur."],
        ["Stiker WA Anti-Lupa", "Kirim satire ke grup keluarga dengan risiko dibalas ucapan selamat pagi."],
        ["Carousel Satire Enam Slide", "Slide pertama lucu, slide terakhir baru kasih daftar bacaan."],
      ],
      network: [
        ["Koordinasi Grup Sebelah", "Satukan kampus, komunitas, dan admin yang selama ini cuma saling like."],
        ["Patungan Logistik Lagi", "Beli air, kabel, transport, dan harapan dalam satu spreadsheet."],
        ["Hubungi Komunitas yang Jarang Diajak", "Perluas gerakan di luar circle yang foto profilnya sudah seragam."],
      ],
      law: [
        ["Baca Pasal Sampai Tuntas", "Jangan berhenti di ayat yang cocok buat poster."],
        ["Bandingkan Amar dan Dissent", "Buka bagian hakim yang beda pendapat sebelum kubu memilih screenshot."],
        ["Klinik Hukum Dadakan", "Terjemahkan bahasa putusan ke bahasa warga tanpa menghilangkan syarat penting."],
      ],
      film: [
        ["Mini Dokumenter Vertikal", "Bawa bukti ke layar kecil tanpa mengecilkan kompleksitasnya."],
        ["Rilis Potongan Wawancara", "Tampilkan suara narasumber, konteks, dan kenapa bagian itu dipilih."],
        ["Buka Footage yang Disimpan", "Keluarkan arsip saat klaim resmi mulai lupa kamera pernah menyala."],
      ],
      attack: [
        ["Quote-Tweet Pakai Caps Lock", "Menang volume, kalah substansi, tetap dapat ribuan reply."],
        ["Bongkar Aib yang Nggak Nyambung", "Bikin gerakan sibuk menjelaskan kenapa kritiknya berubah jadi infotainment."],
        ["Fanwar Atas Nama Gerakan", "Pastikan musuh utama bulan ini adalah aktivis lain yang beda font poster."],
      ],
      transparency: [
        ["Publikasikan Donor dan Metode", "Kasih tahu siapa mendanai, bagaimana data dikumpulkan, dan apa keterbatasannya."],
        ["Koreksi Thread Sendiri", "Edit klaim yang keliru sebelum lawan menjadikannya monumen permanen."],
        ["Buka Catatan Produksi", "Tunjukkan proses, sumber, dan bagian yang masih belum pasti."],
      ],
    },
  };
  const PHASE_ACTION_VARIANT_LIMIT = 60;
  const phaseVariantTokens = [
    [
      ["Survei", "pakai angka elektabilitas, sampel, dan margin galat sebagai panggung"],
      ["Debat", "kemas respons seperti potongan debat yang langsung minta dinilai menang"],
      ["Quick Count", "masuk lewat angka sementara sebelum server resmi selesai sarapan"],
      ["Koalisi", "bungkus teknik ini sebagai obrolan silaturahmi yang kursinya sudah dihitung"],
      ["Baliho", "buat pesannya cukup besar untuk terlihat, belum tentu cukup jelas untuk dipahami"],
      ["Bursa Kursi", "arahkan percakapan ke kompetensi, loyalitas, dan kursi yang pura-pura belum dibagi"],
    ],
    [
      ["Dapur MBG", "bawa isu ke dapur program, vendor, gizi, dan faktur yang lebih panjang dari menu"],
      ["BGN & Keamanan Pangan", "cek SOP, ahli gizi, sertifikat, korban, investigasi, dan siapa yang boleh menutup dapur"],
      ["KopDes", "ikuti 80.081 koperasi dari sirene peluncuran sampai arus kas, anggota, dan risiko gagal"],
      ["Anggaran Pendidikan", "pisahkan amanat 20 persen dari kotak makan yang dimasukkan ke keranjang definisi"],
      ["Remote 2029", "uji partai keluarga, jaringan relawan, donor, dan baterai politik yang mulai diisi dari Solo"],
      ["UU TNI", "sentuh batas sipil-militer, pasal, dan kekhawatiran yang tidak selesai dengan hormat komando"],
      ["17+8", "hubungkan tuntutan, arsip, dan respons negara sebelum semuanya dipotong jadi carousel"],
    ],
    [
      ["Rupiah", "tarik isu ke kurs, harga, daya beli, dan grafik yang mood-nya lebih stabil daripada dompet"],
      ["APBN", "bawa angka ke sumber dana, biaya peluang, dan pos yang mendadak hilang dari presentasi"],
      ["Ruang Sipil", "uji dampaknya pada kritik, jurnalis, pembela HAM, dan orang yang tidak punya centang biru"],
      ["BEM UI", "masuk lewat pernyataan sikap, data ekonomi, dan PDF yang dibaca admin cuma judulnya"],
      ["Kabinet", "sorot tumpang tindih jabatan, koordinasi, dan rapat yang jumlahnya mengalahkan hasil"],
      ["Dana Negara", "ikuti aliran uang sampai ke lembaga, program, dan istilah sinergi yang belum tentu punya kuitansi"],
    ],
    [
      ["Danantara", "jadikan tata kelola aset, investasi, dan pengawasan sebagai inti percakapan"],
      ["Krisis Iklim", "hubungkan kebijakan dengan banjir, panas, pangan, dan anggaran adaptasi"],
      ["Konsorsium", "petakan siapa duduk dengan siapa sebelum semua hubungan disebut kebetulan profesional"],
      ["AI Negara", "uji data, bias, audit, dan bot yang sudah membantah sebelum warga selesai bertanya"],
      ["Oposisi", "bedakan alternatif kebijakan dari sekadar logo baru dan konferensi pers bersama"],
      ["Brand Aktivis", "cek kapan edukasi berubah jadi personal brand dan kapan link donasi tetap transparan"],
    ],
    [
      ["Podcast Kandidat", "bawa teknik ini ke percakapan dua jam yang dipotong jadi 19 detik paling heroik"],
      ["Dinasti 2.0", "uji akses, nama keluarga, merit, dan logo baru yang tidak otomatis menghapus silsilah"],
      ["Deepfake", "cek keaslian, sumber, dan kecepatan klarifikasi sebelum wajah palsu menang debat"],
      ["Pasar Dadakan", "lihat siapa benar-benar belanja, siapa cuma pegang cabai untuk kamera"],
      ["Koalisi Rapuh", "masuk ke negosiasi yang disebut solid sampai urutan nama di poster berubah"],
      ["Dana Kreator", "ikuti sponsor, affiliate, iklan mikro-target, dan disclosure yang ukurannya lebih kecil dari hashtag"],
    ],
    [
      ["Debat 2029", "kemas langkah ini untuk panggung kandidat tanpa mengubah jawaban menjadi skor gaya"],
      ["Quick Count", "jaga jarak antara estimasi, klaim kemenangan, dan mandat yang belum selesai dihitung"],
      ["Rekap TPS", "turunkan narasi sampai formulir, saksi, server, dan warga yang membuka 87 tab"],
      ["Masa Tenang", "uji apakah teknik ini benar-benar tenang atau cuma scheduled post pakai jam berbeda"],
      ["Sengketa", "bawa bukti, standar pembuktian, dan amar sebelum potongan ekspresi hakim jadi kesimpulan"],
      ["Pidato Kemenangan", "siapkan bahasa yang tetap waras ketika hasil belum final dan dua podium sudah menyala"],
    ],
  ];
  const actionVariantKits = {
    buzzer: {
      meme: [
        ["Remix Punchline", "Potong kerumitan jadi satu lelucon yang gampang nyangkut."],
        ["Stikerkan Isu", "Ubah masalah negara jadi stiker grup keluarga yang sulit dihapus."],
        ["Bikin POV", "Pilih sudut pandang paling menguntungkan lalu pura-pura kameranya objektif."],
        ["Jadikan GIF", "Bikin satu ekspresi berulang menggantikan penjelasan yang terlalu panjang."],
        ["Susun Tier List", "Urutkan aktor politik seperti karakter game agar konflik kepentingan terasa seperti hiburan."],
        ["Potong Punchline", "Ambil kalimat paling lucu, sisakan konteks di ruang editing."],
        ["Bikin Before–After", "Bandingkan dua gambar yang dramatis walau baseline-nya beda server."],
        ["Karikaturkan Lawan", "Besarkan satu ciri sampai kebijakan aslinya hilang dari frame."],
        ["Cetak Template", "Sebarkan format siap pakai supaya spontanitas bisa dikirim lewat spreadsheet."],
        ["Bikin Reaction", "Ganti jawaban dengan wajah kaget dan subtitle huruf kapital."],
      ],
      patriot: [
        ["Pasang Bendera di", "Tambahkan simbol nasional supaya kritik terdengar seperti gangguan upacara."],
        ["Label Anti-Nasional", "Ubah perbedaan kebijakan menjadi tes kecintaan pada negara."],
        ["Aktifkan Lagu Wajib untuk", "Naikkan emosi sebelum pertanyaan sempat menemukan mikrofon."],
        ["Bikin Sumpah Setia", "Paksa isu kompleks masuk pilihan setia atau tidak setia."],
        ["Seragamkan Caption", "Buat patriotisme terdengar serempak sampai tanda bacanya ikut apel."],
        ["Gelar Upacara untuk", "Tambahkan podium, hormat, dan kalimat besar ke masalah yang butuh data kecil."],
        ["Pasang Tameng Merah Putih", "Lindungi kebijakan dari kritik dengan simbol yang tidak bisa menjawab pertanyaan."],
        ["Bikin Tes Nasionalisme", "Nilai warga dari seberapa cepat mereka setuju, bukan seberapa kuat argumennya."],
        ["Naikkan Volume Lagu", "Tutup celah bukti dengan chorus yang mudah dinyanyikan."],
        ["Bingkai sebagai Ancaman", "Ubah evaluasi publik menjadi alarm terhadap persatuan nasional."],
      ],
      data: [
        ["Pilih Baseline", "Ambil tahun pembanding yang paling ramah pada grafik."],
        ["Crop Grafik", "Sisakan bagian visual yang naik dan keluarkan bagian yang bertanya kenapa."],
        ["Ganti Denominator", "Buat persentase terlihat gagah dengan penyebut yang tidak ikut konferensi pers."],
        ["Sorot Persentase", "Besarkan angka relatif, kecilkan jumlah absolut dan catatan kaki."],
        ["Pilih Sampel Nyaman", "Pakai kelompok yang paling mendukung lalu sebut sebagai suara publik."],
        ["Gabungkan Kategori", "Satukan kelompok berbeda sampai tren yang diinginkan muncul."],
        ["Geser Periode", "Mulai grafik tepat setelah titik terburuk supaya semua tampak pulih."],
        ["Ubah Satuan", "Ganti rupiah, persen, indeks, atau per kapita sampai audiens kehilangan kalkulator."],
        ["Sorot Ranking", "Pilih posisi yang bagus dan sembunyikan jarak dengan negara pembanding."],
        ["Bikin Dashboard", "Tambahkan meter warna hijau agar keputusan terlihat ilmiah sebelum metodologi dibuka."],
      ],
      whatabout: [
        ["Lempar ke Era Lama", "Bawa pertanyaan sekarang ke dosa pemerintahan sebelumnya."],
        ["Cari Skandal Pembanding", "Temukan kasus lain yang lebih heboh agar topik utama antre."],
        ["Tag Mantan Pejabat", "Undang tokoh lama ke reply supaya debat berubah jadi reuni dendam."],
        ["Buka Album Sejarah", "Tarik foto masa lalu tanpa menjelaskan hubungannya dengan keputusan hari ini."],
        ["Balik Tanya Kubu Sebelah", "Jawab pertanyaan dengan pertanyaan yang lebih emosional."],
        ["Pindah Server Isu", "Geser percakapan ke masalah lain yang kebetulan lebih mudah dimenangkan."],
        ["Cari Kesalahan Lama", "Gunakan kegagalan terdahulu sebagai izin untuk tidak menjawab sekarang."],
        ["Bikin Kompetisi Dosa", "Ubah akuntabilitas menjadi lomba siapa paling buruk."],
        ["Undang Masa Lalu", "Biarkan arsip lama mengambil semua kursi di percakapan baru."],
        ["Putar Arah Panah", "Arahkan kritik balik ke pengkritik sebelum substansi sempat masuk."],
      ],
      endorse: [
        ["Titip Script ke", "Pinjam muka terkenal dan tiga poin bicara yang sudah disetujui legal."],
        ["Unboxing", "Buka kebijakan seperti paket premium dengan syarat kecil di akhir video."],
        ["Jogetkan", "Bikin koreografi sederhana untuk program yang lampirannya 84 halaman."],
        ["Pakai Soft Launch", "Masukkan pesan politik di sela rutinitas pagi dan kode promo."],
        ["Bikin Collab", "Satukan figur populer dan pejabat sampai disclosure kehilangan tempat duduk."],
        ["Kirim Brief Influencer", "Bagi caption organik lewat dokumen yang namanya final_final_beneran."],
        ["Bikin Testimoni", "Ubah pengalaman satu figur menjadi bukti nasional."],
        ["Pakai Cameo", "Munculkan wajah terkenal tepat ketika pertanyaan teknis mulai ramai."],
        ["Jadikan Affiliate", "Hubungkan dukungan dengan engagement, trafik, dan istilah kolaborasi nasional."],
        ["Buat Challenge", "Ajak pengikut meniru gerakan sebelum mereka sempat membaca program."],
      ],
      podcast: [
        ["Monologkan", "Jawab dua jam sampai pertanyaan awal kehabisan baterai."],
        ["Potong jadi Shorts", "Ambil belasan detik paling heroik dari percakapan panjang."],
        ["Undang Host Ramah untuk", "Pilih kursi nyaman dan pertanyaan yang tidak punya tindak lanjut."],
        ["Bikin Episode Eksklusif", "Jadikan akses sebagai bukti kedalaman walau datanya tetap tipis."],
        ["Pasang Thumbnail Marah", "Naikkan alis dan huruf kapital agar algoritma menganggap ini substansi."],
        ["Bikin Deep Talk", "Pakai lampu redup untuk membuat jawaban normatif terasa personal."],
        ["Tumpuk Jargon di", "Isi jeda dengan istilah besar sampai lawan kehabisan waktu klarifikasi."],
        ["Buat Reaction Podcast", "Bahas klip dari podcast lain sampai timeline jadi cermin berlapis."],
        ["Rilis Teaser", "Sebarkan kalimat paling kontroversial sebelum konteks lengkap tayang."],
        ["Bikin Town Hall Studio", "Undang penonton pilihan dan sebut suasananya spontan."],
      ],
      attack: [
        ["Gali Arsip", "Cari unggahan lama yang bisa memindahkan perhatian dari kebijakan."],
        ["Bikin Kolase", "Satukan screenshot, musik tegang, dan hubungan yang belum tentu ada."],
        ["Seret Circle", "Kalau target sulit diserang, audit siapa yang pernah foto bareng."],
        ["Cari Salah Ketik", "Besarkan typo sampai argumen utama tidak kebagian layar."],
        ["Buka CV Lawan", "Ubah pengalaman kerja menjadi sidang karakter tanpa relevansi yang jelas."],
        ["Goreng Potongan Lama", "Naikkan ulang klip lama dengan caption baru dan tanggal yang sengaja kabur."],
        ["Bikin Dossier", "Tumpuk informasi benar, setengah benar, dan dekorasi merah dalam satu PDF."],
        ["Audit Pertemanan", "Jadikan relasi sosial sebagai bukti niat politik."],
        ["Cari Foto Lama", "Gunakan satu frame untuk menulis seluruh biografi lawan."],
        ["Bikin Thread Aib", "Susun tuduhan bertingkat agar bantahan selalu tertinggal satu slide."],
      ],
      concert: [
        ["Panggungkan", "Tambah LED, MC, dan drone sampai evaluasi terasa merusak suasana."],
        ["Festivalisasi", "Ubah peluncuran kebijakan menjadi hari raya konten."],
        ["Kasih Band Pembuka untuk", "Taruh musik sebelum anggaran supaya pertanyaan terdengar kurang asyik."],
        ["Bikin Parade", "Gerakkan massa, maskot, dan kamera dalam satu arus yang sulit diaudit."],
        ["Pasang LED Seribu", "Terangi panggung sampai lampiran kebijakan ikut silau."],
        ["Gelar Expo", "Penuhi aula dengan booth pencapaian dan satu meja pengaduan di belakang."],
        ["Buat Gala Nasional", "Naikkan dress code agar kritik terlihat tidak sopan."],
        ["Turunkan Drone ke", "Ambil gambar udara yang megah dan jauh dari detail pelaksanaan."],
        ["Bikin Countdown", "Ciptakan rasa sejarah sebelum indikator keberhasilan disepakati."],
        ["Jadikan Roadshow", "Bawa narasi berkeliling sambil pertanyaan lokal menunggu sesi berikutnya."],
      ],
      transparency: [
        ["Buka Dokumen", "Unggah file lengkap dan terima risiko warga membaca catatan kaki."],
        ["Akui Salah di", "Koreksi sebelum netizen memberi nama skandal yang lebih catchy."],
        ["Gelar Q&A untuk", "Buka mikrofon tanpa daftar pertanyaan titipan."],
        ["Publikasikan Kontrak", "Tunjukkan pihak, nilai, mandat, dan bagian yang biasanya disebut rahasia dagang."],
        ["Buka Dashboard Mentah", "Kasih data yang bisa diunduh, bukan cuma meter warna hijau."],
        ["Jelaskan Konflik Kepentingan", "Sebut jabatan, hubungan, dan mekanisme mitigasinya tanpa bahasa kabut."],
        ["Rilis Metodologi", "Terangkan cara angka dibuat, termasuk keterbatasan yang tidak seksi."],
        ["Buka Notulen", "Tunjukkan siapa mengusulkan apa dan siapa mendadak izin keluar."],
        ["Koreksi Caption", "Perbaiki klaim sambil membiarkan jejak perubahan terlihat."],
        ["Undang Audit Independen", "Biarkan pihak lain memeriksa sebelum semua temuan disebut serangan politik."],
      ],
    },
    aktivis: {
      context: [
        ["Susun Kronologi", "Urutkan waktu, aktor, dan keputusan sebelum potongan video memimpin sidang."],
        ["Cari Versi Penuh", "Buka rekaman lengkap dan bagian sebelum-sesudah klip viral."],
        ["Tarik Arsip", "Keluarkan dokumen lama saat semua pihak mendadak lupa."],
        ["Bikin Peta Aktor", "Tunjukkan siapa memutuskan, siapa membayar, dan siapa menerima dampak."],
        ["Cek Tanggal", "Pastikan foto, video, dan kutipan tidak teleportasi antarperistiwa."],
        ["Buka Timeline", "Susun kejadian menjadi alur yang bisa dibaca tanpa gelar tiga."],
        ["Bandingkan Pernyataan", "Taruh janji, keputusan, dan hasil dalam satu layar."],
        ["Kumpulkan Saksi", "Hubungkan cerita warga dengan bukti yang bisa diverifikasi."],
        ["Beri Catatan Konteks", "Tambahkan bagian yang hilang tanpa menghapus kritik yang sah."],
        ["Bikin FAQ", "Jawab pertanyaan dasar sebelum hoaks menemukan desain yang lebih bagus."],
      ],
      data: [
        ["Audit Angka", "Cek baseline, denominator, periode, dan siapa yang hilang dari tabel."],
        ["Bikin Grafik Waras", "Visualisasikan data tanpa sumbu yang sengaja dibuat dramatis."],
        ["Baca Catatan Kaki", "Cari kalimat kecil yang biasanya lebih jujur dari headline."],
        ["Unduh Dataset", "Periksa data mentah sebelum percaya pada carousel."],
        ["Cek Metodologi", "Uji sampel, definisi, dan batas klaim yang boleh dibuat."],
        ["Bandingkan Anggaran", "Taruh rencana, realisasi, dan biaya peluang dalam satu tabel."],
        ["Hitung per Kapita", "Ubah angka besar menjadi dampak yang bisa dibayangkan warga."],
        ["Uji Ranking", "Lihat jarak, indikator, dan negara pembanding sebelum merayakan posisi."],
        ["Bikin Replikasi", "Coba hitung ulang agar grafik tidak bergantung pada iman."],
        ["Rilis Spreadsheet", "Kasih rumus, sumber, dan sel yang tidak dikunci admin."],
      ],
      empathy: [
        ["Dengar Warga", "Turunkan volume pundit dan naikkan suara orang yang hidup di dalam dampak."],
        ["Buka Ruang Cerita", "Jangan paksa korban berubah jadi konten sebelum mereka siap."],
        ["Rekam Voice Note", "Bawa pengalaman lapangan, termasuk bagian yang tidak muat jadi slogan."],
        ["Temui Keluarga", "Hubungkan kebijakan dengan rutinitas, biaya, dan rasa aman sehari-hari."],
        ["Jaga Identitas", "Ceritakan dampak tanpa menjadikan korban sasaran baru."],
        ["Bikin Forum Dengar", "Biarkan warga menyusun prioritas, bukan cuma jadi latar foto."],
        ["Kumpulkan Kesaksian", "Cari pola dari banyak pengalaman tanpa menyamaratakan semuanya."],
        ["Terjemahkan Dampak", "Bawa bahasa anggaran ke dapur, sekolah, kerja, dan transport."],
        ["Cek Persetujuan", "Pastikan cerita dipublikasikan dengan izin dan konteks."],
        ["Kembalikan Suara", "Jadikan narasumber subjek, bukan properti kampanye."],
      ],
      meme: [
        ["Bikin Meme Edukatif", "Ajak orang ketawa lalu sisipkan sumber sebelum mereka kabur."],
        ["Stikerkan Kritik", "Kirim satire ke grup keluarga dengan risiko dibalas bunga dan kopi."],
        ["Bikin Carousel Receh", "Slide pertama lucu, slide terakhir baru mengaku punya daftar bacaan."],
        ["Jadikan Reaction", "Pakai humor untuk menunjukkan kontradiksi tanpa mengganti bukti."],
        ["Bikin Template Warga", "Sebarkan format yang gampang diadaptasi tanpa membuat semua akun seperti bot."],
        ["Remix Janji", "Taruh ucapan lama di samping hasil terbaru dan biarkan kontras bekerja."],
        ["Bikin Bingo", "Ubah jargon berulang jadi permainan sambil tetap menyimpan konteks."],
        ["Karikaturkan Sistem", "Sindir struktur kekuasaan tanpa menjadikan satu orang kambing hitam tunggal."],
        ["Bikin Caption Receh", "Turunkan bahasa seminar ke timeline tanpa menurunkan akurasi."],
        ["Susun Meme Berantai", "Buat humor yang mengantar ke arsip, bukan menjauh darinya."],
      ],
      network: [
        ["Koordinasi Jaringan", "Satukan kampus, komunitas, dan admin yang selama ini cuma saling like."],
        ["Patungan Logistik", "Beli air, kabel, transport, dan harapan dalam satu spreadsheet."],
        ["Hubungi Komunitas", "Perluas gerakan di luar circle yang foto profilnya sudah seragam."],
        ["Bikin Posko", "Bangun tempat kerja yang tetap hidup saat tagar turun."],
        ["Susun Relawan", "Bagi tugas verifikasi, dokumentasi, advokasi, dan jaga kesehatan."],
        ["Buka Kanal Aman", "Pisahkan koordinasi sensitif dari grup yang semua anggotanya admin."],
        ["Bangun Koalisi Isu", "Temukan tuntutan bersama tanpa memaksa semua kelompok jadi satu merek."],
        ["Latih Moderator", "Jaga diskusi agar tidak berubah jadi audisi siapa paling marah."],
        ["Bikin Dana Bersama", "Kumpulkan sumber daya dengan laporan yang bisa dibaca warga."],
        ["Hubungkan Daerah", "Bawa isu keluar dari pusat timeline dan dengar variasi dampaknya."],
      ],
      law: [
        ["Baca Pasal", "Jangan berhenti di ayat yang paling cocok untuk poster."],
        ["Bandingkan Amar", "Buka pertimbangan, dissent, dan akibat hukum yang tidak muat di screenshot."],
        ["Bikin Klinik Hukum", "Terjemahkan putusan ke bahasa warga tanpa menghapus syarat penting."],
        ["Uji Konflik Kepentingan", "Cek jabatan, kewenangan, dan siapa mengawasi siapa."],
        ["Susun Legal Brief", "Ringkas argumen, bukti, dan permintaan tanpa cosplay menjadi hakim."],
        ["Cek Prosedur", "Uji apakah pembahasan, partisipasi, dan naskah benar-benar tersedia."],
        ["Bandingkan Regulasi", "Lihat aturan lama, perubahan baru, dan celah implementasi."],
        ["Buka Putusan", "Kasih link dokumen utuh sebelum kubu memilih paragraf favorit."],
        ["Petakan Wewenang", "Jelaskan siapa boleh berbuat apa dan siapa yang bisa menggugat."],
        ["Bikin Panduan Hak", "Ubah bahasa hukum menjadi langkah praktis yang tidak menyesatkan."],
      ],
      film: [
        ["Bikin Dokumenter Mini", "Bawa bukti ke layar kecil tanpa mengecilkan kompleksitas."],
        ["Rilis Wawancara", "Tampilkan suara narasumber, konteks, dan alasan pemilihan potongan."],
        ["Buka Footage", "Keluarkan arsip saat klaim resmi mulai lupa kamera pernah menyala."],
        ["Susun Visual Evidence", "Hubungkan gambar, dokumen, lokasi, dan waktu secara transparan."],
        ["Bikin Teaser Etis", "Tarik perhatian tanpa menjual trauma sebagai cliffhanger."],
        ["Rilis Director’s Notes", "Jelaskan metode, keterbatasan, dan bagian yang masih diperdebatkan."],
        ["Buat Screening Warga", "Bawa film ke diskusi yang tidak selesai saat kredit penutup."],
        ["Potong Arsip Vertikal", "Sesuaikan format tanpa memotong hubungan sebab-akibat."],
        ["Bikin Peta Visual", "Tunjukkan jaringan aktor dan aliran keputusan dalam satu frame."],
        ["Buka Koreksi Film", "Publikasikan pembaruan jika ada bukti baru atau kesalahan."],
      ],
      attack: [
        ["Quote-Tweet Caps Lock", "Menang volume, kalah substansi, tetap dapat ribuan reply."],
        ["Bongkar Aib Sampingan", "Bikin gerakan sibuk menjelaskan kenapa kritik berubah jadi infotainment."],
        ["Mulai Fanwar", "Pastikan musuh utama bulan ini aktivis lain yang beda font poster."],
        ["Seret Keluarga", "Ubah debat kebijakan menjadi audit hubungan personal."],
        ["Cari Klip Memalukan", "Pakai satu momen untuk membatalkan seluruh argumen."],
        ["Bikin Doxxing Halus", "Sebarkan petunjuk identitas sambil bilang netizen yang menemukan sendiri."],
        ["Goreng Salah Ucap", "Besarkan kalimat buruk dan tinggalkan isu utama di draft."],
        ["Audit Circle", "Jadikan foto bersama sebagai pengganti bukti konflik kepentingan."],
        ["Bikin Thread Penghakiman", "Susun vonis sebelum verifikasi selesai."],
        ["Ratio Kawan Sendiri", "Ubah energi gerakan menjadi kompetisi kesucian."],
      ],
      transparency: [
        ["Publikasikan Donor", "Kasih tahu siapa mendanai, untuk apa, dan berapa sisanya."],
        ["Koreksi Thread", "Perbaiki klaim keliru sebelum lawan menjadikannya monumen."],
        ["Buka Catatan Produksi", "Tunjukkan proses, sumber, dan bagian yang belum pasti."],
        ["Rilis Laporan Kas", "Biarkan warga melihat pemasukan, pengeluaran, dan kuitansi yang lecek."],
        ["Jelaskan Afiliasi", "Sebut hubungan organisasi dan politik tanpa kalimat kabut."],
        ["Buka Metode Riset", "Terangkan sampling, wawancara, verifikasi, dan keterbatasan."],
        ["Publikasikan Koreksi", "Biarkan versi lama terlihat agar perubahan bisa diaudit."],
        ["Buka Konflik Internal", "Akui perbedaan strategi tanpa mengubahnya jadi drama personal."],
        ["Undang Peer Review", "Minta orang lain menguji klaim sebelum dipakai mobilisasi."],
        ["Bikin Arsip Terbuka", "Simpan dokumen, metadata, dan kronologi untuk publik."],
      ],
    },
  };
  function phaseActionKey(id) {
    return `${state.phase}:${id}`;
  }
  function phaseActionUseCount(id) {
    state.phaseActionVariants = state.phaseActionVariants || {};
    return Number(state.phaseActionVariants[phaseActionKey(id)]) || 0;
  }
  function maxActionVariants(a) {
    return PHASE_ACTION_VARIANT_LIMIT;
  }

  const narrativeActionVerbs={
    buzzer:{meme:["Stikerkan","Remix","Potong Jadi Reels","Bikin POV","Jadikan Template WA","Karikaturkan"],patriot:["Bungkus Merah Putih","Aktifkan Mode Bela Negara","Naikkan Lagu Kebangsaan","Pasang Tameng Kedaulatan"],data:["Pilih Baseline Ramah","Susun Grafik Optimistis","Buat Dashboard Selektif","Pindahkan Catatan Kaki"],whatabout:["Alihkan ke","Bandingkan dengan","Buka Dosa Lama","Lempar ke"],endorse:["Turunkan Influencer ke","Bikin Tur Konten di","Ajak Seleb Masuk","Live Bareng dari"],podcast:["Podcastkan","Bedah Dua Jam","Bikin Obrolan Santai soal","Panjangkan Jawaban tentang"],attack:["Bedah Motif Pengkritik","Cari Afiliasi Penanya","Naikkan Foto Lama Lawan","Serang Pembawa Pesan"],concert:["Bikin Konser untuk","Panggung Rakyatkan","Festivalisasi","Soundcheckkan"],transparency:["Buka Dokumen","Rilis Kronologi","Unggah Kontrak","Publikasikan Koreksi"]},
    aktivis:{context:["Tarik Ulang Kronologi","Buka Konteks","Susun Timeline","Cek Video Utuh"],data:["Audit","Hitung Ulang","Buka Dataset","Bandingkan Baseline"],empathy:["Dengar","Temui","Buka Ruang untuk","Rekam Kesaksian"],meme:["Bikin Meme Nyambung soal","Stikerkan Kritik pada","Remix Janji tentang","Bikin Bingo"],network:["Bangun Posko di","Hubungkan Jaringan untuk","Patungan Logistik di","Sebar Pengawas ke"],law:["Uji Dasar Hukum","Baca Putusan soal","Susun Legal Brief untuk","Gugat Prosedur"],film:["Dokumentasikan","Buka Footage tentang","Rilis Mini-Doc soal","Susun Visual Evidence untuk"],attack:["Sorot Konflik Kepentingan di","Tagih Tanggung Jawab atas","Bongkar Insentif di","Hadapkan Rekam Jejak pada"],transparency:["Buka Metode Gerakan untuk","Rilis Laporan Dana soal","Publikasikan Koreksi pada","Unggah Sumber Primer tentang"]}
  };
  const narrativeActionDesc={
    buzzer:{meme:"Bikin isu gampang dibagikan tanpa harus menjawab semua bagian yang bikin rapat nggak nyaman.",patriot:"Geser perdebatan dari kebijakan ke loyalitas dan identitas nasional.",data:"Pilih angka, periode, dan grafik yang paling membantu pesan pemerintah.",whatabout:"Tarik perhatian ke pembanding yang bikin masalah bulan ini kelihatan kecil.",endorse:"Pinjam kedekatan figur populer supaya respons terasa organik.",podcast:"Larutkan pertanyaan keras ke obrolan panjang, santai, dan penuh sponsor.",attack:"Ubah pembawa kritik jadi objek utama supaya substansi antre.",concert:"Mobilisasi panggung dan kerumunan untuk menciptakan kesan dukungan luas.",transparency:"Buka bukti, batas, dan kesalahan sebelum arsip lawan melakukannya."},
    aktivis:{context:"Kembalikan urutan peristiwa supaya potongan viral nggak menggantikan kenyataan.",data:"Uji angka, biaya, baseline, dan pihak yang menikmati atau menanggung kebijakan.",empathy:"Bawa pengalaman orang terdampak tanpa menjadikan mereka properti konten.",meme:"Pakai humor sebagai pintu menuju sumber, bukan pengganti sumber.",network:"Ubah engagement menjadi pembagian kerja, logistik, pengawasan, dan tindak lanjut.",law:"Terjemahkan pasal, putusan, prosedur, dan konflik kewenangan ke bahasa warga.",film:"Bangun argumen visual dengan arsip, metadata, narasumber, dan ruang koreksi.",attack:"Sorot kuasa dan konflik kepentingan tanpa turun jadi gosip tubuh atau keluarga.",transparency:"Buka donor, metode, koreksi, dan keterbatasan gerakan sendiri."}
  };
  const actionDescPunch={
    buzzer:{meme:"Kalau publik ketawa dulu, pertanyaan susah biasanya kebagian kursi belakang.",patriot:"Efektif buat bikin kritik kelihatan kayak kurang cinta tanah air.",data:"Grafiknya sah-sah aja. Yang dipilih cuma bagian yang nggak bikin ruang rapat sunyi.",whatabout:"Teknik klasik: kalau dapur sendiri kebakaran, tunjuk asap rumah sebelah.",endorse:"Follower dipinjam, kompetensi dianggap bonus DLC.",podcast:"Dua jam ngobrol; pertanyaan inti sempat tumbuh uban.",attack:"Substansi ditaruh di bagasi, pembawa pesan diaudit sampai zodiak.",concert:"Lampu LED bisa bikin kebijakan apa pun kelihatan punya mandat.",transparency:"Aneh memang, tapi kadang buka dokumen lebih murah daripada klarifikasi tujuh jilid."},
    aktivis:{context:"Klip 12 detik dikembalikan ke habitat aslinya: video penuh dan kronologi.",data:"Angka disuruh kerja, bukan cuma berdiri cantik di carousel.",empathy:"Warga jadi manusia, bukan B-roll yang dipelankan pakai piano.",meme:"Receh boleh. Sumber primer tetap harus diajak nongkrong.",network:"Timeline diubah jadi posko, bukan cuma tempat semua orang bilang ‘gas’.",law:"Pasal diterjemahkan ke bahasa manusia tanpa cosplay hakim.",film:"Kamera dipakai buat arsip, bukan cuma bikin kemarahan kelihatan sinematik.",attack:"Yang dibongkar kuasa dan konflik kepentingan, bukan ukuran sepatu keluarga.",transparency:"Gerakan ikut buka dompet dan salahnya sendiri. Suasana langsung canggung tapi sehat."}
  };
  function actionPresentation(a,i,variantIndex=0){
    const verbs=narrativeActionVerbs[state.role]?.[a.id]||["Respons terhadap"];
    const verb=verbs[variantIndex%verbs.length];
    let object=i.subject||i.title.replace(/^#/,"");
    if(["data","transparency"].includes(a.id)) object=i.document||object;
    if(["empathy","film"].includes(a.id)) object=i.people||object;
    if(a.id==="whatabout") object=i.counter||"kubu sebelah";
    if(["endorse","concert","network"].includes(a.id)) object=i.stage||object;
    if(a.id==="attack"&&state.role==="buzzer") object=`pengkritik ${i.subject||object}`;
    const short=String(object).split(/,| dan /)[0].trim();
    const editions=["Edisi Panik","Versi Warung","Mode Jam Tiga Pagi","Cut Tanpa Disclaimer","Revisi Setelah Dimarahin","Paket Hemat Konteks","Director's Cut Admin","Versi Grup Keluarga","Edisi Deadline","Mode Semua Siap"];
    const suffix=variantIndex>=verbs.length?` — ${editions[(variantIndex-verbs.length)%editions.length]}`:"";
    const base=narrativeActionDesc[state.role]?.[a.id]||a.desc;
    const punch=actionDescPunch[state.role]?.[a.id]||"Kalau berhasil, timeline berubah sebelum orang sempat baca utuh.";
    return {
      name:`${verb} ${short}${suffix}`.replace(/\s+/g," ").trim(),
      desc:`${base} ${punch}`,
      context:`Nyambung langsung ke ${i.subject||i.title}. Kalau dipakai sekarang, gema narasinya kebawa ke ${i.teaser||"bulan depan"}.`
    };
  }

  function actionCost(a, i) {
    const phaseScale = [1.35, 2.25, 3.55, 5.4, 8.1, 12.0],
      roleScale = state.role === "buzzer" ? 1.55 : 0.9,
      prestigeScale = 1 + (state.specialties?.length || 0) * 0.07,
      careerScale = 1 + Math.min(0.72, (Number(state.career) || 0) / 210),
      topicFactor = i.weak.includes(a.id)
        ? 0.92
        : i.resist.includes(a.id)
          ? 1.13
          : 1,
      crewFactor = activeActionBuffs(a).reduce(
        (m, b) => m * (b.costMultiplier ?? 1),
        1,
      );
    return Math.max(
      3000000,
      Math.round(
        (a.cost * phaseScale[state.phase] * roleScale * prestigeScale * careerScale * topicFactor * crewFactor) /
          1000000,
      ) * 1000000,
    );
  }
  function costLevelLabel() {
    return ["LOKAL", "NASIONAL", "ISTANA", "KONSORSIUM", "PRA-PEMILU", "OPERASI AKBAR"][state.phase] || "OPERASI";
  }
  function financeRules() {
    const p = state.phase || 0;
    if (state.role === "buzzer") {
      return {
        rate: 0.035 + p * 0.004,
        limit: 3500000000 * (p + 1),
        reserve: Math.round(900000000 * (1 + p * 0.55)),
        label: "KREDIT PATRON",
      };
    }
    return {
      rate: 0.055 + p * 0.006,
      limit: 550000000 * (p + 1),
      reserve: Math.round(180000000 * (1 + p * 0.5)),
      label: "KREDIT GERAKAN",
    };
  }
  function minimumActionCost() {
    const i = currentIssue();
    state.phaseActionVariants = state.phaseActionVariants || {};
    const costs = availableActions()
      .filter((a) => phaseActionUseCount(a.id) < maxActionVariants(a))
      .map((a) => actionCost(a, i));
    return costs.length ? Math.min(...costs) : 0;
  }
  const promotionChoices = {
    buzzer: [
      [
        {
          name: "Operator Data Elektoral",
          icon: "📊",
          spec: "Data Elektoral",
          text: "Menguasai segmentasi, survei, dan distribusi pesan tanpa menganggap semua angka wahyu.",
          boost: { reach: 8, credibility: 4, money: 180000000 },
        },
        {
          name: "Liaison Selebritas",
          icon: "🎬",
          spec: "Selebriti & akses",
          text: "Mengubah foto, panggung, dan undangan khusus menjadi mesin kedekatan politik.",
          boost: { reach: 14, network: 9, integrity: -3 },
        },
      ],
      [
        {
          name: "Staf Narasi Kebijakan",
          icon: "🎙️",
          spec: "Mikrofon kekuasaan",
          text: "Membawa program pemerintah ke podcast, konferensi pers, dan komentar teratas.",
          boost: { credibility: 7, network: 7, money: 250000000 },
        },
        {
          name: "Komandan Mobilisasi",
          icon: "📣",
          spec: "Komandan trending",
          text: "Mengelola jaringan akun, influencer, dan relawan sampai trending terasa seperti cuaca.",
          boost: { reach: 16, heat: 8, integrity: -7 },
        },
      ],
      [
        {
          name: "Reformis dari Dalam",
          icon: "🧭",
          spec: "Reformis dari dalam",
          text: "Memakai akses untuk mendorong transparansi, meski undangan rapat mulai jarang datang.",
          boost: { credibility: 12, integrity: 10, democracy: 6 },
        },
        {
          name: "Arsitek Spektakel Nasional",
          icon: "🚀",
          spec: "Selebriti & akses",
          text: "Membuat kebijakan sebesar layar LED dan kritik sekecil catatan kaki.",
          boost: { reach: 18, money: 400000000, credibility: -5 },
        },
      ],
      [
        {
          name: "Juru Bicara Substantif",
          icon: "📚",
          spec: "Mikrofon kekuasaan",
          text: "Memperlakukan publik sebagai warga dewasa, bukan target pasar dengan hak pilih.",
          boost: { credibility: 14, integrity: 8, democracy: 5 },
        },
        {
          name: "Pembelot Profesional",
          icon: "💾",
          spec: "Pembelot profesional",
          text: "Menyalin arsip, meninggalkan grup, dan menerima bahwa konferensi pers akan membahas motifmu.",
          boost: {
            credibility: 15,
            integrity: 15,
            network: -6,
            money: -150000000,
          },
        },
      ],
      [
        {
          name: "Loyalis Sampai Rekap Terakhir",
          icon: "🛡️",
          spec: "Loyalis final",
          text: "Menjaga kandidat, koalisi, dan versi resmi sampai pemilu berikutnya selesai dihitung.",
          boost: { reach: 15, money: 500000000, integrity: -8 },
        },
        {
          name: "Penjaga Transisi Demokratis",
          icon: "🗳️",
          spec: "Reformis dari dalam",
          text: "Memakai akses terakhir untuk menjaga aturan main tetap dipercaya siapa pun pemenangnya.",
          boost: { credibility: 12, integrity: 12, democracy: 10 },
        },
      ],
    ],
    aktivis: [
      [
        {
          name: "Organisator Basis",
          icon: "🤝",
          spec: "Gerakan kolektif",
          text: "Mengubah unggahan menjadi pertemuan dan kemarahan menjadi struktur.",
          boost: { network: 13, democracy: 5, reach: 4 },
        },
        {
          name: "Peneliti Kebijakan",
          icon: "🔬",
          spec: "Data Elektoral",
          text: "Mengubah keresahan menjadi data, metodologi, dan catatan kaki yang sulit dimeme-kan.",
          boost: { credibility: 12, integrity: 5, money: 70000000 },
        },
      ],
      [
        {
          name: "Jalur Konstitusi",
          icon: "⚖️",
          spec: "Pakar hukum",
          text: "Membaca pasal, putusan, dan dissenting opinion sampai admin lawan kehabisan screenshot.",
          boost: { credibility: 14, democracy: 7, stress: 5 },
        },
        {
          name: "Jalur Dokumenter",
          icon: "🎥",
          spec: "Jaringan produksi",
          text: "Menyusun arsip, saksi, dan visual menjadi cerita yang tidak selesai setelah trending.",
          boost: { reach: 12, network: 8, money: -60000000 },
        },
      ],
      [
        {
          name: "Gerakan Tanpa Wajah",
          icon: "🕸️",
          spec: "Gerakan kolektif",
          text: "Mendistribusikan kepemimpinan agar satu akun tumbang tidak mematikan gerakan.",
          boost: { network: 16, integrity: 8, reach: -2 },
        },
        {
          name: "Aktivis Prime Time",
          icon: "📺",
          spec: "Selebritas oposisi",
          text: "Membawa isu ke layar besar sambil berusaha agar layar tidak menelan isunya.",
          boost: { reach: 18, credibility: 3, integrity: -4 },
        },
      ],
      [
        {
          name: "Penjaga Arsip Republik",
          icon: "🗄️",
          spec: "Penjaga arsip",
          text: "Menyimpan bukti, kronologi, koreksi, dan konteks untuk musim politik berikutnya.",
          boost: { credibility: 12, integrity: 10, democracy: 8 },
        },
        {
          name: "Koalisi Lintas Isu",
          icon: "🌉",
          spec: "Gerakan kolektif",
          text: "Menyatukan buruh, kampus, lingkungan, hukum, agama, dan komunitas digital.",
          boost: { network: 18, democracy: 8, stress: 8 },
        },
      ],
      [
        {
          name: "Pengawas Pemilu Terbuka",
          icon: "👁️",
          spec: "Pakar hukum",
          text: "Menjaga proses, dana, media, dan administrasi tanpa menentukan pilihan warga.",
          boost: { credibility: 15, democracy: 12, integrity: 8 },
        },
        {
          name: "Pendidik Publik",
          icon: "🧠",
          spec: "Penjaga arsip",
          text: "Membekali warga agar tidak membutuhkan satu tokoh untuk memutuskan apa yang benar.",
          boost: { credibility: 13, network: 10, democracy: 10 },
        },
      ],
    ],
  };
  const glossary = [
    [
      "Astroturfing",
      "Kampanye terkoordinasi yang dibuat agar terlihat seperti dukungan warga yang spontan.",
    ],
    [
      "Ad hominem",
      "Menyerang pribadi pembawa argumen alih-alih menjawab klaimnya.",
    ],
    [
      "Cherry-picking",
      "Memilih data yang mendukung posisi dan menyembunyikan konteks yang mengganggu.",
    ],
    [
      "Whataboutism",
      "Mengalihkan kritik dengan menunjuk kesalahan pihak lain.",
    ],
    [
      "Biaya peluang",
      "Manfaat dari pilihan terbaik yang dikorbankan ketika anggaran dipakai untuk pilihan lain.",
    ],
    [
      "Konflik kepentingan",
      "Situasi ketika kewajiban publik dapat dipengaruhi kepentingan pribadi atau jabatan lain.",
    ],
    [
      "Checks and balances",
      "Mekanisme agar lembaga kekuasaan saling mengawasi dan tidak terkonsentrasi tanpa kontrol.",
    ],
    [
      "Personal branding aktivisme",
      "Ketika citra tokoh menjadi lebih dominan daripada organisasi, isu, dan regenerasi gerakan.",
    ],
  ];
  const quizzes = [
    {
      c: "Logika",
      q: "Mengkritik pelaksanaan program makan berarti ingin anak tetap lapar. Ini contoh…",
      o: [
        "Audit kebijakan",
        "Dilema palsu",
        "Analisis biaya",
        "Hak jawab",
      ],
      a: 1,
      e: "Tujuan program dapat didukung sambil desain, anggaran, dan pelaksanaannya dikritik.",
    },
    {
      c: "Literasi Video",
      q: "Sebuah video benar secara visual tetapi memotong kejadian sebelum dan sesudahnya. Masalah utamanya…",
      o: [
        "Resolusi rendah",
        "Tidak memakai musik",
        "Konteks hilang",
        "Durasi terlalu pendek",
      ],
      a: 2,
      e: "Keaslian klip tidak otomatis membuat kesimpulan yang ditempelkan padanya benar.",
    },
    {
      c: "Etika Publik",
      q: "Pejabat dianggap aman merangkap jabatan karena ia orang baik. Apa yang terlewat?",
      o: [
        "Jumlah pengikut",
        "Struktur konflik kepentingan",
        "Kemampuan pidato",
        "Selera humor",
      ],
      a: 1,
      e: "Aturan mengendalikan insentif dan risiko, bukan bergantung pada penilaian karakter seseorang.",
    },
    {
      c: "Forensik Digital",
      q: "Empat ribu akun mengunggah pesan identik dalam beberapa menit. Kesimpulan paling bertanggung jawab?",
      o: [
        "Semua dukungan otomatis palsu",
        "Pasti semuanya bot ilegal",
        "Ada indikator koordinasi yang perlu diteliti",
        "Tidak ada yang aneh",
      ],
      a: 2,
      e: "Pola koordinasi adalah indikator, bukan bukti tunggal mengenai identitas, pembayaran, atau pelanggaran.",
    },
    {
      c: "Dokumenter",
      q: "Dokumenter politik sebaiknya dinilai terutama dari…",
      o: [
        "Jumlah meme pendukung",
        "Apakah pembuatnya disukai",
        "Bukti, metode, konteks, dan hak jawab",
        "Posisi politik penontonnya",
      ],
      a: 2,
      e: "Film adalah argumen yang harus diuji dengan standar bukti, bukan loyalitas kubu.",
    },
    {
      c: "Survei",
      q: "Survei daring sukarela di akun seorang kandidat menunjukkan dukungan 91%. Kelemahan terbesarnya?",
      o: [
        "Warna grafik",
        "Sampel memilih dirinya sendiri dan tidak representatif",
        "Angkanya terlalu tinggi untuk dibaca",
        "Tidak disiarkan televisi",
      ],
      a: 1,
      e: "Self-selection membuat responden berbeda dari populasi yang hendak disimpulkan.",
    },
    {
      c: "Statistik",
      q: "Harga pangan naik bersamaan dengan naiknya jumlah konten politik. Apa kesimpulan yang aman?",
      o: [
        "Konten politik pasti menyebabkan inflasi",
        "Inflasi menyebabkan semua orang membuat konten",
        "Keduanya pasti dikendalikan aktor yang sama",
        "Korelasi saja belum membuktikan sebab-akibat",
      ],
      a: 3,
      e: "Dua hal yang bergerak bersamaan belum membuktikan hubungan kausal.",
    },
    {
      c: "Survei",
      q: "Dua kandidat berselisih 1 poin, sementara margin of error survei ±3 poin. Pernyataan paling tepat?",
      o: [
        "Kandidat pertama pasti menang",
        "Hasilnya masih terlalu dekat untuk memastikan siapa unggul",
        "Surveinya pasti palsu",
        "Margin of error boleh diabaikan",
      ],
      a: 1,
      e: "Selisih yang lebih kecil daripada ketidakpastian survei tidak mendukung klaim kemenangan pasti.",
    },
    {
      c: "Sumber",
      q: "Sebuah akun anonim membocorkan dokumen penting. Langkah jurnalistik pertama?",
      o: [
        "Langsung unggah agar tidak keduluan",
        "Periksa keaslian dokumen dan konfirmasi melalui sumber lain",
        "Tanya jumlah pengikut akun",
        "Tambahkan musik tegang",
      ],
      a: 1,
      e: "Anonimitas tidak otomatis membatalkan informasi, tetapi verifikasi menjadi semakin penting.",
    },
    {
      c: "Koreksi",
      q: "Media memperbaiki angka yang salah dan menjelaskan perubahannya. Ini paling tepat disebut…",
      o: [
        "Bukti media selalu bohong",
        "Praktik koreksi yang transparan",
        "Upaya menghapus sejarah",
        "Kekalahan algoritmik",
      ],
      a: 1,
      e: "Kesalahan tetap perlu dikritik, tetapi koreksi terbuka adalah bagian dari akuntabilitas.",
    },
    {
      c: "Anggaran",
      q: "Dana besar dipindahkan dari layanan lain untuk program unggulan. Pertanyaan kebijakan yang paling relevan?",
      o: [
        "Siapa yang paling sering menyebut program itu",
        "Apa biaya peluang dan dampaknya pada layanan yang dikurangi",
        "Apakah logonya cukup modern",
        "Apakah tagarnya sempat trending",
      ],
      a: 1,
      e: "Setiap pilihan anggaran berarti manfaat lain dikorbankan; itulah biaya peluang.",
    },
    {
      c: "Transparansi",
      q: "Pemerintah berkata data tersedia, tetapi hanya memberi infografik tanpa metodologi. Apa yang masih dibutuhkan?",
      o: [
        "Lebih banyak emoji",
        "Data dasar, definisi, metode, dan cara menghitung",
        "Juru bicara yang lebih terkenal",
        "Komentar pendukung",
      ],
      a: 1,
      e: "Transparansi substantif memungkinkan publik memeriksa proses, bukan hanya melihat kesimpulan.",
    },
    {
      c: "AI & Deepfake",
      q: "Audio tokoh publik terdengar mengejutkan dan hanya beredar sebagai potongan tanpa sumber. Respons terbaik?",
      o: [
        "Sebarkan dengan tanda tanya",
        "Percaya karena suaranya mirip",
        "Cari rekaman asal, metadata, dan konfirmasi independen",
        "Tunggu kubu sendiri memberi instruksi",
      ],
      a: 2,
      e: "Kemiripan suara bukan verifikasi, terutama di era sintesis audio.",
    },
    {
      c: "Bukti Digital",
      q: "Screenshot percakapan menjadi satu-satunya bukti tuduhan serius. Masalah utamanya?",
      o: [
        "Screenshot terlalu mudah dimanipulasi dan perlu bukti tambahan",
        "Tulisan di screenshot terlalu kecil",
        "Percakapan digital tidak pernah penting",
        "Semua screenshot pasti palsu",
      ],
      a: 0,
      e: "Screenshot dapat menjadi petunjuk, tetapi harus diverifikasi melalui konteks, sumber asli, atau bukti pendukung.",
    },
    {
      c: "Retorika",
      q: "“Pendapatmu soal APBN tidak penting karena kamu pernah salah mengeja.” Ini contoh…",
      o: [
        "Analisis fiskal",
        "Ad hominem",
        "Konsensus ahli",
        "Audit forensik",
      ],
      a: 1,
      e: "Kesalahan pribadi yang tidak relevan tidak menjawab isi argumen.",
    },
    {
      c: "Retorika",
      q: "Saat dikritik soal kebijakan A, pejabat menjawab, “Kubu kalian dulu juga melakukan B.” Teknik ini…",
      o: [
        "Whataboutism",
        "Evaluasi dampak",
        "Keterbukaan data",
        "Uji kausalitas",
      ],
      a: 0,
      e: "Kesalahan pihak lain tidak otomatis menjawab kritik terhadap kebijakan yang sedang dibahas.",
    },
    {
      c: "Data",
      q: "Akun kampanye hanya menampilkan satu indikator ekonomi yang membaik sambil mengabaikan indikator lain yang memburuk. Ini…",
      o: [
        "Random sampling",
        "Checks and balances",
        "Cherry-picking",
        "Hak jawab",
      ],
      a: 2,
      e: "Pemilihan data secara selektif dapat menghasilkan gambaran yang menyesatkan meski angkanya sendiri benar.",
    },
    {
      c: "Beban Pembuktian",
      q: "Seseorang menuduh ada konspirasi lalu berkata, “Buktikan bahwa saya salah.” Siapa yang memikul beban bukti awal?",
      o: [
        "Orang yang dituduh",
        "Publik secara acak",
        "Pihak yang membuat klaim",
        "Tidak ada siapa pun",
      ],
      a: 2,
      e: "Klaim luar biasa tetap perlu didukung oleh pihak yang mengajukannya.",
    },
    {
      c: "Hierarki Bukti",
      q: "Untuk mengetahui isi sebuah putusan pengadilan, sumber terbaik biasanya…",
      o: [
        "Potongan komentar viral",
        "Dokumen putusan resmi",
        "Meme dari kedua kubu",
        "Polling Instagram",
      ],
      a: 1,
      e: "Sumber primer paling dekat dengan objek yang hendak diperiksa, lalu dapat dilengkapi analisis ahli.",
    },
    {
      c: "Gerakan",
      q: "Aksi protes ramai satu hari, tetapi tidak punya tuntutan jelas atau tindak lanjut. Risiko terbesarnya?",
      o: [
        "Terlalu banyak dokumentasi",
        "Energi publik menguap tanpa strategi organisasi",
        "Peserta terlalu banyak membaca",
        "Media menjadi terlalu objektif",
      ],
      a: 1,
      e: "Mobilisasi sesaat perlu dihubungkan dengan tuntutan, pembagian kerja, negosiasi, dan kesinambungan.",
    },
    {
      c: "Gerakan",
      q: "Semua keputusan organisasi harus menunggu satu aktivis terkenal. Apa masalah strukturalnya?",
      o: [
        "Terlalu banyak regenerasi",
        "Ketergantungan pada personal brand dan titik kegagalan tunggal",
        "Kelebihan transparansi",
        "Kurangnya engagement berbayar",
      ],
      a: 1,
      e: "Gerakan yang sehat membagi pengetahuan, akses, dan kepemimpinan agar dapat bertahan melampaui satu tokoh.",
    },
    {
      c: "Demokrasi",
      q: "Mengapa supremasi sipil penting dalam demokrasi?",
      o: [
        "Agar militer tidak punya keahlian apa pun",
        "Agar kekuatan bersenjata tunduk pada otoritas sipil dan kontrol hukum",
        "Agar semua jabatan diisi influencer",
        "Agar kritik keamanan dilarang",
      ],
      a: 1,
      e: "Kendali sipil dan batas kelembagaan mengurangi risiko konsentrasi kekuasaan bersenjata.",
    },
    {
      c: "Institusi",
      q: "Tujuan checks and balances adalah…",
      o: [
        "Membuat semua keputusan selalu lambat",
        "Membagi dan mengawasi kekuasaan agar tidak tanpa kontrol",
        "Menjamin pemerintah selalu populer",
        "Menghapus perbedaan pendapat",
      ],
      a: 1,
      e: "Pengawasan antarlembaga membantu mencegah penyalahgunaan dan menyediakan mekanisme koreksi.",
    },
    {
      c: "Peradilan",
      q: "Hakim memutus perkara yang menyangkut kerabat dekatnya tanpa mengungkap hubungan tersebut. Masalah utamanya?",
      o: [
        "Konflik kepentingan dan persepsi independensi",
        "Kurangnya konten video",
        "Tidak ada jajak pendapat",
        "Putusannya terlalu panjang",
      ],
      a: 0,
      e: "Independensi tidak hanya soal hasil, tetapi juga proses yang bebas dari konflik nyata maupun yang tampak.",
    },
    {
      c: "Kebebasan Sipil",
      q: "Kebebasan berbicara berarti…",
      o: [
        "Tidak boleh ada kritik terhadap ucapan kita",
        "Negara tidak boleh membatasi ekspresi secara sewenang-wenang, tetapi ucapan tetap dapat diperdebatkan",
        "Semua informasi otomatis benar",
        "Platform wajib menaikkan semua konten",
      ],
      a: 1,
      e: "Hak berbicara bukan hak untuk bebas dari bantahan, koreksi, atau konsekuensi yang sah.",
    },
    {
      c: "Oposisi",
      q: "Akun oposisi menyebarkan angka palsu untuk menyerang pemerintah. Sikap yang konsisten secara demokratis?",
      o: [
        "Membiarkannya karena tujuannya baik",
        "Mengoreksi angka tersebut meski merugikan kubu sendiri",
        "Menambah angka agar lebih viral",
        "Menunggu pemerintah melakukan kesalahan lain",
      ],
      a: 1,
      e: "Standar bukti seharusnya berlaku lintas kubu; kebohongan tidak menjadi benar karena targetnya berkuasa.",
    },
    {
      c: "Sumber Resmi",
      q: "Pernyataan resmi pemerintah paling tepat diperlakukan sebagai…",
      o: [
        "Kebenaran final yang tidak perlu diuji",
        "Satu sumber penting yang tetap perlu dibandingkan dengan data dan bukti lain",
        "Propaganda yang selalu salah",
        "Pengganti seluruh dokumen",
      ],
      a: 1,
      e: "Sumber resmi penting untuk mengetahui posisi negara, tetapi klaim faktualnya tetap dapat diperiksa.",
    },
    {
      c: "Privasi",
      q: "Dokumen publik memuat nomor telepon pribadi warga yang tidak relevan dengan kepentingan publik. Apa tindakan tepat?",
      o: [
        "Sebarkan seluruhnya demi transparansi",
        "Sensor data pribadi sambil mempertahankan bagian yang relevan",
        "Tambahkan alamat rumah",
        "Jual akses dokumen",
      ],
      a: 1,
      e: "Transparansi publik perlu diseimbangkan dengan perlindungan data pribadi yang tidak relevan.",
    },
    {
      c: "Media",
      q: "Acara debat menghadirkan satu ilmuwan iklim dan satu orang tanpa keahlian hanya agar terlihat “seimbang”. Risiko ini disebut…",
      o: ["False balance", "Margin of error", "Randomisasi", "Open data"],
      a: 0,
      e: "Keseimbangan jumlah pembicara tidak selalu mencerminkan bobot bukti atau konsensus keahlian.",
    },
    {
      c: "Algoritma",
      q: "Konten penuh kemarahan mendapat lebih banyak interaksi. Kesimpulan yang tepat?",
      o: [
        "Konten itu pasti paling benar",
        "Algoritma dapat memberi insentif pada emosi tanpa menilai kebenaran",
        "Warga tidak punya tanggung jawab sama sekali",
        "Semua platform identik",
      ],
      a: 1,
      e: "Engagement mengukur reaksi, bukan validitas. Desain platform dapat memperbesar konten yang memicu emosi.",
    },
    {
      c: "Evaluasi Kebijakan",
      q: "Program mencapai target jumlah penerima, tetapi kualitas layanan buruk. Kesimpulan paling tepat?",
      o: [
        "Program pasti sukses karena target kuantitas tercapai",
        "Capaian output perlu dibedakan dari kualitas dan outcome",
        "Program pasti gagal total",
        "Tidak perlu evaluasi lanjutan",
      ],
      a: 1,
      e: "Jumlah layanan adalah output; perubahan kondisi penerima dan kualitas pelaksanaan adalah outcome yang berbeda.",
    },
    {
      c: "Whistleblower",
      q: "Seorang pegawai melaporkan dugaan korupsi dengan dokumen pendukung. Perlindungan terpenting?",
      o: [
        "Membuka identitasnya segera",
        "Kanal aman, kerahasiaan, verifikasi, dan perlindungan dari pembalasan",
        "Menyuruhnya membuat konten lucu",
        "Menghapus semua bukti setelah viral",
      ],
      a: 1,
      e: "Pelapor membutuhkan proses yang aman agar bukti dapat diperiksa tanpa membuatnya rentan terhadap intimidasi.",
    },
    {
      c: "Kampanye",
      q: "Influencer dibayar mempromosikan kandidat tetapi menyebutnya opini spontan. Masalah etik utamanya?",
      o: [
        "Tidak memakai studio",
        "Tidak mengungkap hubungan berbayar",
        "Pengikutnya terlalu sedikit",
        "Kandidatnya memakai warna tertentu",
      ],
      a: 1,
      e: "Disclosure membantu publik menilai insentif dan membedakan dukungan pribadi dari materi sponsor.",
    },
    {
      c: "Verifikasi",
      q: "Berita sensasional baru muncul dari satu akun. Sebelum membagikan, langkah paling berguna?",
      o: [
        "Baca judul saja",
        "Cari sumber asal, tanggal, konteks, dan konfirmasi independen",
        "Tambahkan kata “katanya”",
        "Bagikan ke grup keluarga untuk dites",
      ],
      a: 1,
      e: "Verifikasi sederhana sebelum berbagi dapat memutus rantai misinformasi.",
    },
    {
      c: "Bahasa Kekuasaan",
      q: "Slogan “demi stabilitas” dipakai untuk menolak semua kritik. Pertanyaan yang perlu diajukan?",
      o: [
        "Siapa yang mendefinisikan stabilitas, dengan bukti apa, dan hak siapa yang dibatasi",
        "Apakah slogannya berima",
        "Berapa banyak baliho tersedia",
        "Apakah kritik sedang trending",
      ],
      a: 0,
      e: "Istilah abstrak harus diterjemahkan menjadi ukuran, kewenangan, dampak, dan batas hukum yang dapat diuji.",
    },
    {
      c: "Konstitusi",
      q: "Pemerintah menyebut keadaan “darurat” untuk mempercepat kebijakan. Uji pertama yang paling penting?",
      o: [
        "Apakah istilahnya terdengar tegas",
        "Dasar hukum, bukti kedaruratan, batas waktu, dan mekanisme pengawasan",
        "Berapa akun yang setuju",
        "Apakah oposisi sedang populer",
      ],
      a: 1,
      e: "Kewenangan darurat harus dibatasi dasar hukum, kebutuhan yang dapat dibuktikan, waktu, dan pengawasan.",
    },
    {
      c: "Pengadaan Publik",
      q: "Tender hanya diikuti satu perusahaan yang pemiliknya dekat dengan pengambil keputusan. Apa respons yang tepat?",
      o: [
        "Langsung menyatakan korupsi terbukti",
        "Abaikan karena proyeknya penting",
        "Periksa proses tender, beneficial ownership, harga pembanding, dan konflik kepentingan",
        "Menilai dari desain logo perusahaan",
      ],
      a: 2,
      e: "Kedekatan adalah sinyal risiko, bukan vonis; proses, kepemilikan, harga, dan keputusan perlu diaudit.",
    },
    {
      c: "Keterbukaan Informasi",
      q: "Dokumen publik disensor hampir seluruhnya dengan alasan keamanan. Apa yang perlu diuji?",
      o: [
        "Apakah pengecualian spesifik, proporsional, dan memiliki dasar hukum",
        "Apakah warna hitam sensor cukup rapi",
        "Apakah pejabatnya populer",
        "Apakah dokumen sudah viral",
      ],
      a: 0,
      e: "Pengecualian informasi tidak boleh menjadi selimut umum; alasan dan cakupannya harus dapat diuji.",
    },
    {
      c: "Survei",
      q: "Lembaga survei mengubah bobot responden agar sesuai komposisi penduduk. Praktik ini…",
      o: [
        "Selalu manipulasi",
        "Dapat sah bila metode, asumsi, dan data pembobotannya transparan",
        "Tidak pernah diperlukan",
        "Membuat margin of error hilang",
      ],
      a: 1,
      e: "Pembobotan dapat memperbaiki representasi, tetapi harus dijelaskan agar publik dapat menilai asumsi dan dampaknya.",
    },
    {
      c: "Kausalitas",
      q: "Setelah kebijakan baru berlaku, angka kemiskinan turun. Apa yang masih dibutuhkan sebelum menyebut kebijakan sebagai penyebab?",
      o: [
        "Poster keberhasilan",
        "Perbandingan, tren sebelumnya, faktor lain, dan desain evaluasi yang masuk akal",
        "Lebih banyak slogan",
        "Dukungan influencer",
      ],
      a: 1,
      e: "Urutan waktu saja belum cukup; evaluasi perlu memisahkan dampak kebijakan dari faktor lain.",
    },
    {
      c: "Aktivisme Kampus",
      q: "Organisasi mahasiswa hanya mengundang pembicara yang sepakat dengan tuntutannya. Risiko strategisnya?",
      o: [
        "Pesan menjadi terlalu pendek",
        "Gerakan kehilangan ruang uji argumen dan kemampuan menjangkau publik yang belum sepakat",
        "Poster menjadi kurang ramai",
        "Tidak ada risiko apa pun",
      ],
      a: 1,
      e: "Gerakan membutuhkan posisi tegas sekaligus ruang untuk menguji argumen, memperluas koalisi, dan mendengar kritik.",
    },
    {
      c: "Koalisi Politik",
      q: "Partai oposisi mendukung satu rancangan undang-undang pemerintah. Kesimpulan paling masuk akal?",
      o: [
        "Oposisi sudah pasti dibeli",
        "Dukungan pada satu kebijakan tidak otomatis menghapus fungsi oposisi pada isu lain",
        "Semua partai sama persis",
        "RUU pasti sempurna",
      ],
      a: 1,
      e: "Posisi politik dapat dinilai per kebijakan; oposisi bukan kewajiban menolak semua hal secara otomatis.",
    },
    {
      c: "Koreksi Publik",
      q: "Kamu terlanjur membagikan data salah yang menguntungkan kubumu. Tindakan terbaik?",
      o: [
        "Diam agar lawan tidak menang",
        "Hapus tanpa penjelasan",
        "Koreksi terbuka, tautkan data yang benar, dan jelaskan bagian yang berubah",
        "Serang orang yang menemukan kesalahan",
      ],
      a: 2,
      e: "Koreksi terbuka membangun jejak akuntabilitas dan mengurangi penyebaran versi yang salah.",
    },
    {
      c: "Endorsement Politik",
      q: "Selebritas mendukung kandidat karena hubungan pribadi, bukan bayaran. Apa yang tetap penting bagi publik?",
      o: [
        "Melarang semua selebritas bicara",
        "Mengetahui hubungan dan kepentingan yang relevan tanpa otomatis menganggap dukungan itu ilegal",
        "Menghitung jumlah penggemar saja",
        "Menganggap semua dukungan sebagai fakta kebijakan",
      ],
      a: 1,
      e: "Disclosure membantu publik menilai insentif, tetapi dukungan politik tidak otomatis membuktikan operasi berbayar.",
    },
    {
      c: "Kepemilikan Media",
      q: "Media milik politisi memberitakan partainya secara dominan. Cara membaca yang paling sehat?",
      o: [
        "Percaya seluruhnya karena media resmi",
        "Tolak seluruh berita tanpa membaca",
        "Periksa kepemilikan, framing, sumber, dan bandingkan dengan media lain",
        "Nilai dari kualitas kameranya",
      ],
      a: 2,
      e: "Kepemilikan dapat memengaruhi agenda, tetapi isi tetap perlu diperiksa berdasarkan bukti dan dibandingkan.",
    },
    {
      c: "Legislasi",
      q: "RUU disahkan sangat cepat tanpa naskah terbaru mudah diakses. Masalah demokratis utamanya?",
      o: [
        "Gedung parlemen terlalu sepi",
        "Publik dan legislator kesulitan melakukan partisipasi serta pengawasan bermakna",
        "Sidang tidak memakai musik",
        "RUU pasti selalu inkonstitusional",
      ],
      a: 1,
      e: "Akses dokumen dan waktu pembahasan yang cukup adalah syarat partisipasi serta akuntabilitas legislasi.",
    },
    {
      c: "Sipil–Militer",
      q: "Perwira aktif mengisi semakin banyak jabatan sipil. Pertanyaan institusional yang relevan?",
      o: [
        "Apakah seragamnya cocok",
        "Apa dasar hukum, kebutuhan keahlian, rantai akuntabilitas, dan dampaknya bagi supremasi sipil",
        "Berapa jumlah pengikutnya",
        "Apakah ia pandai membuat konten",
      ],
      a: 1,
      e: "Penilaian harus berfokus pada aturan, akuntabilitas, kebutuhan jabatan, dan batas peran sipil–militer.",
    },
    {
      c: "Keamanan Digital",
      q: "Aktivis menemukan alamat rumah lawan politik dari data bocor. Apa yang seharusnya dilakukan?",
      o: [
        "Publikasikan agar lawan takut",
        "Simpan untuk ancaman bila perlu",
        "Jangan menyebarkan, dokumentasikan kebocoran secara aman, dan laporkan melalui kanal yang tepat",
        "Kirim ke grup besar sebagai peringatan",
      ],
      a: 2,
      e: "Doxxing membahayakan orang dan merusak legitimasi gerakan; bukti kebocoran harus ditangani secara aman.",
    },
    {
      c: "Aksi Massa",
      q: "Penyelenggara dan polisi memberi angka peserta demonstrasi yang sangat berbeda. Cara menilai?",
      o: [
        "Pilih angka kubu sendiri",
        "Gunakan foto tergeolokasi, luas area, kepadatan, waktu pengambilan, dan beberapa sumber independen",
        "Ambil rata-rata tanpa metode",
        "Angka terbesar pasti benar",
      ],
      a: 1,
      e: "Estimasi kerumunan memerlukan metode transparan dan sumber silang, bukan loyalitas.",
    },
    {
      c: "Arsip Digital",
      q: "Tautan penting sudah mati dan hanya tersisa salinan arsip web. Bagaimana menggunakannya?",
      o: [
        "Anggap arsip selalu palsu",
        "Periksa tanggal tangkapan, URL asal, metadata, dan cocokkan dengan sumber lain",
        "Ubah isinya agar lebih jelas",
        "Abaikan seluruh arsip digital",
      ],
      a: 1,
      e: "Arsip web berguna, tetapi konteks tangkapan dan autentisitasnya tetap perlu diverifikasi.",
    },
  ];
  function currentPhase() {
    return phases[state.phase];
  }
  function currentIssue() {
    const base = currentPhase().days[state.day - 1];
    return window.PNTimelineVariants?.select
      ? window.PNTimelineVariants.select(base, {
          seed: state.runSeed || 1,
          phaseIndex: state.phase,
          dayIndex: state.day - 1,
        })
      : base;
  }
  function beep(f = 420, d = 0.05) {
    if (!state.sound) return;
    try {
      const A = window.AudioContext || window.webkitAudioContext,
        a = new A(),
        o = a.createOscillator(),
        g = a.createGain();
      o.frequency.value = f;
      o.type = "square";
      g.gain.setValueAtTime(0.035, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + d);
    } catch (e) {}
  }
  function flash(t) {
    const f = $("#flash");
    f.textContent = t;
    f.classList.remove("hidden");
    setTimeout(() => f.classList.add("hidden"), 1200);
  }
  function resetQuizDeck() {
    state.quizDeck = shuffle(quizzes.map((_, i) => i));
    state.quizPositionDeck = shuffle(quizzes.map((_, i) => i % 4));
    state.quizIndex = 0;
  }
  function nextQuiz() {
    if (
      !state.quizDeck.length ||
      state.quizIndex >= state.quizDeck.length
    )
      resetQuizDeck();
    const deckIndex = state.quizIndex++,
      base = quizzes[state.quizDeck[deckIndex]],
      target = state.quizPositionDeck[deckIndex],
      correctText = base.o[base.a],
      wrong = shuffle(base.o.filter((_, i) => i !== base.a)).map(
        (text) => ({ text, correct: false }),
      );
    wrong.splice(target, 0, { text: correctText, correct: true });
    return { ...base, correctPosition: target, options: wrong };
  }
  function syncQuizToggles() {
    const a = $("#quizStartToggle"),
      b = $("#quizGameToggle"),
      l = $("#quizModeLabel"),
      on = $("#quizStartOn"),
      off = $("#quizStartOff"),
      gameBtn = $("#quizGameButton");
    if (a) a.checked = state.quizEnabled;
    if (b) b.checked = state.quizEnabled;
    if (l) l.textContent = state.quizEnabled ? "NALAR ON" : "NALAR OFF";
    if (on) on.classList.toggle("active", state.quizEnabled);
    if (off) off.classList.toggle("active", !state.quizEnabled);
    if (gameBtn) {
      gameBtn.textContent = state.quizEnabled
        ? "CEK NALAR: ON"
        : "CEK NALAR: OFF";
      gameBtn.classList.toggle("off", !state.quizEnabled);
    }
  }
  function setQuizEnabled(enabled, announce = true) {
    state.quizEnabled = enabled;
    syncQuizToggles();
    if (announce)
      flash(enabled ? "CEK NALAR DIAKTIFKAN" : "CEK NALAR DILEWATI");
  }

  function advanceDay() {
    if ((state.trendReveal || 0) > 0) state.trendReveal--;
    state.day++;
    $("#modal").classList.add("hidden");
    loadIssue();
  }
  function pendingSpecialEvent() {
    return specialEvents.find(
      (e) =>
        e.phase === state.phase &&
        e.after === state.day &&
        !state.seenEvents.includes(e.id),
    );
  }
  function continueAfterDay() {
    const e = pendingSpecialEvent();
    if (e) showSpecialEvent(e);
    else advanceDay();
  }
  const freeModeFunds = {
    buzzer: [2400000000, 5000000000, 8000000000, 12000000000, 18000000000, 28000000000],
    aktivis: [85000000, 180000000, 360000000, 650000000, 1050000000, 1600000000],
  };
  function syncGameModeControls() {
    const free = state.gameMode === "free";
    $("#chronicleModeBtn")?.classList.toggle("active", !free);
    $("#freeModeBtn")?.classList.toggle("active", free);
    $("#freePhasePicker")?.classList.toggle("hidden", !free);
    document.querySelectorAll("[data-free-phase]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.freePhase) === state.freeStartPhase);
    });
    $("#freeJumpBtn")?.classList.toggle("hidden", !free || !state.role);
  }
  function setGameMode(mode) {
    state.gameMode = mode === "free" ? "free" : "chronicle";
    if (state.gameMode === "chronicle") state.freeStartPhase = 0;
    syncGameModeControls();
    flash(state.gameMode === "free" ? "MODE BEBAS AKTIF • PILIH FASE" : "MODE KRONIK AKTIF • MULAI 2024");
  }
  function setFreeStartPhase(phase) {
    state.freeStartPhase = clamp(Number(phase) || 0, 0, phases.length - 1);
    state.gameMode = "free";
    syncGameModeControls();
  }
  function showFreePhaseJump() {
    if (state.gameMode !== "free" || !state.role) return;
    $("#modalContent").innerHTML =
      `<span class="free-mode-badge">MODE BEBAS • SANDBOX</span><h2>Lompat ke Fase Mana?</h2><p>Fase pilihan dimulai dari bulan pertama dengan dana dan statistik sandbox yang disesuaikan. Riwayat run saat ini direset agar event fase target dapat dimainkan utuh.</p><div class="choice-grid">${phases.map((phase, index) => `<button class="choice-card" data-jump-phase="${index}"><h3>FASE ${index + 1} • ${phase.period}</h3><small>${phase.name}</small></button>`).join("")}</div><button class="btn secondary" id="cancelPhaseJump">Batal</button>`;
    $("#modal").classList.remove("hidden");
    document.querySelectorAll("[data-jump-phase]").forEach((button) => {
      button.onclick = () => {
        state.freeStartPhase = Number(button.dataset.jumpPhase);
        chooseRole(state.role);
        flash(`MODE BEBAS • LOMPAT KE FASE ${state.phase + 1}`);
      };
    });
    $("#cancelPhaseJump").onclick = () => $("#modal").classList.add("hidden");
  }
  function chooseRole(role) {
    const gameMode = state.gameMode === "free" ? "free" : "chronicle";
    const startPhase = gameMode === "free"
      ? clamp(Number(state.freeStartPhase) || 0, 0, phases.length - 1)
      : 0;
    Object.assign(state, {
      role,
      gameMode,
      freeStartPhase: startPhase,
      phase: startPhase,
      day: 1,
      money: freeModeFunds[role][startPhase],
      reach: clamp(roleData[role].reach + startPhase * 3),
      credibility: clamp(roleData[role].credibility + startPhase * 2),
      integrity: clamp(roleData[role].integrity + startPhase),
      stress: roleData[role].stress,
      democracy: clamp(roleData[role].democracy + startPhase),
      network: clamp(roleData[role].network + startPhase * 3),
      heat: 25,
      resolve: 100,
      actions: 0,
      quizDeck: [],
      quizPositionDeck: [],
      quizIndex: 0,
      quizCorrect: 0,
      quizAnswered: 0,
      finished: false,
      finalReport: null,
      runSeed: createRunSeed(),
      specialties: [],
      history: [],
      career: startPhase * 12,
      lastAction: null,
      postMetrics: { reposts: 0, likes: 0, replies: 0, views: 0 },
      comments: [],
      seenEvents: [],
      eventHistory: [],
      lastImpact: null,
      crisisHistory: [],
      abilityUses: {},
      abilityBuffs: [],
      abilityLog: [],
      trendReveal: 0,
      commentMemory: [],
      npcReplyMemory: [],
      fufuArchive: null,
      fufuTwistResolved: false,
      debt: 0,
      loanRate: 0,
      bailoutCount: 0,
      missedPayments: 0,
      bankruptcyHistory: [],
      monthlyActionVariants: {},
      phaseActionVariants: {},
      lastActionVariant: 0,
      followUpCards: [],
      characterMatchLog: [],
      perfectMatches: 0,
      partialMatches: 0,
      crewMisfires: 0,
      narrativeRipples: [],
      resolvedRipples: [],
      currentRippleNotices: [],
      eventOutcomeProfile: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
    });
    resetQuizDeck();
    $("#startScreen").classList.add("hidden");
    $("#gameScreen").classList.remove("hidden");
    $("#roleLabel").textContent = roleData[role].label;
    $("#objective").textContent = roleData[role].objective;
    syncQuizToggles();
    syncGameModeControls();
    updateBreakingTicker(false);
    showPhaseIntro(true);
  }

  const MONTHLY_CREW_SIZE = 3;
  const monthlyRosterCache = new Map();
  function phaseRoster(role = state.role, phase = state.phase) {
    return phaseRosters[role]?.[phase] || [];
  }
  function currentRoster() {
    return monthlyRosterFor(state.role, state.phase, state.day);
  }

  const themeLabels={science:"SAINS",education:"PENDIDIKAN",research:"RISET",ai:"AI",data:"DATA",budget:"ANGGARAN",parliament:"DPR",protest:"PROTES",law:"HUKUM",coalition:"KOALISI",accountability:"AKUNTABILITAS",party:"PARTAI",legacy:"WARISAN",constitution:"KONSTITUSI",election:"PEMILU",jokowi:"WARISAN PAK JOKO WOLES",media:"MEDIA",economy:"EKONOMI",geopolitics:"GEOPOLITIK",institutions:"INSTITUSI",markets:"PASAR",productivity:"PRODUKTIVITAS",currency:"RUPIAH",debt:"UTANG",mbg:"MBG",nutrition:"GIZI","food-safety":"KEAMANAN PANGAN",health:"KESEHATAN",village:"DESA",kopdes:"KOPDES",dynasty:"DINASTI",risk:"RISIKO","state-assets":"ASET NEGARA",governance:"TATA KELOLA",polling:"SURVEI","public-opinion":"OPINI PUBLIK",technology:"TEKNOLOGI",change:"PERUBAHAN",digital:"DIGITAL",military:"MILITER",disaster:"BENCANA",energy:"ENERGI"};
  const actionThemeMap={meme:["media","digital","election"],patriot:["geopolitics","military","election"],data:["data","economy","markets","budget","science","nutrition","food-safety"],whatabout:["party","legacy","election","dynasty"],endorse:["media","digital","election"],podcast:["media","public-opinion","election"],attack:["party","law","media"],concert:["protest","election","media"],transparency:["accountability","governance","budget","law","food-safety"],context:["media","law","accountability","nutrition"],empathy:["protest","disaster","public-opinion","health","food-safety"],network:["protest","coalition","party","village"],law:["law","constitution","parliament","governance"],film:["media","accountability","law"]};
  const crewThemeOverrides={
    "gemoyfikasi":["election","media","digital"],"admin-satu":["media","digital"],"canva-negara":["media","digital"],"joko-woles":["legacy","jokowi","governance"],"ultima-waspada":["geopolitics","military","media"],"abu-jempol":["media","digital","election"],
    "gemoyono":["military","geopolitics","election","public-opinion"],"tedi-beruang":["governance","media","institutions"],"bahlul":["economy","productivity","party","budget"],"hasbun-brief":["media","accountability","public-opinion","mbg"],"nanik-nasi-doyang":["mbg","nutrition","food-safety","governance","accountability","media"],
    "purbayaya":["economy","currency","markets","budget","public-opinion"],"muteya":["media","digital","governance","public-opinion","energy"],"syafri":["military","institutions","governance"],
    "rosan":["markets","state-assets","economy","governance"],"erick":["institutions","public-opinion","productivity"],"nusruang":["governance","state-assets","disaster"],
    "samsul":["election","digital","public-opinion"],"rapi-ahmad":["media","digital","institutions","election"],"dedi-corbuzzer":["media","military","public-opinion","election"],
    "dasko":["coalition","election","party","parliament"],"yusrill":["law","constitution","election","parliament"],"narasi-bersama":["media","digital","election","public-opinion"],
    "mimin-ingat":["legacy","jokowi","election","media","digital","accountability"],"kak-referensi":["accountability","research","data"],"ferry-irwindy":["media","protest","institutions","public-opinion"],"roy-tifa":["media","digital","law","accountability"],"konni-bakso-rie":["geopolitics","military","media"],
    "feri-ambyar":["law","constitution","election","accountability","governance","coalition","protest"],"bibitri":["law","constitution","parliament","accountability","governance","coalition","protest"],"dandhy":["media","accountability","film"],"dipo-peta":["geopolitics","institutions","economy"],"togar-toa":["protest","education","network"],"tan-sehat-yen":["mbg","nutrition","food-safety","health","education","budget","accountability"],
    "uceng":["accountability","law","governance"],"haris":["law","protest","accountability"],"bem-ui":["education","protest","economy"],"guru-gembulbul":["education","media","context"],"farah-footnote":["education","protest","law","accountability"],
    "raymond":["economy","markets","geopolitics","technology"],"ainun":["data","technology","accountability"],"andhyta":["governance","disaster","geopolitics","institutions"],"mardi-gitu":["media","digital","geopolitics"],
    "felix":["election","digital","media","public-opinion"],"rocky":["media","accountability","public-opinion"],"pandji":["media","accountability","election"],
    "jerom":["data","economy","budget","election"],"andovi":["protest","election","media","disaster"],"nana-kursi":["accountability","law","media","election","coalition"]
  };
  const issueThemeRules={
    science:["sains","riset","kampus","pendidikan","universitas","beasiswa","ukt","ilmuwan","ai"],
    education:["kampus","pendidikan","mahasiswa","dosen","beasiswa","ukt","sekolah"],
    research:["riset","ilmuwan","laboratorium","sains"],ai:[" ai ","kecerdasan","bot","clone","sintetis"],
    budget:["anggaran","apbn","fiskal","biaya","costing","tunjangan","gratis","invoice"],
    parliament:["dpr","parlemen","senayan","rapat","undang-undang","tunjangan"],
    protest:["demo","protes","aksi","bem","mahasiswa","jalanan","tuntutan"],
    law:["hukum","putusan","dakwaan","sidang","mk","pengadilan","pasal","amnesti","abolisi"],
    constitution:["konstitusi","mk","putusan usia","threshold"],
    election:["pemilu","pilkada","kandidat","capres","quick count","kampanye","elektabilitas","survei","future2028","future2029","proyeksi-2028","proyeksi-2029"],
    coalition:["koalisi","oposisi","kursi","deklarasi","putaran kedua"],party:["partai","ketua umum","pdip","gerindra"],
    legacy:["warisan","jokowi","remote","transisi"],jokowi:["jokowi","pak joko","ijazah"],
    accountability:["audit","transparansi","dokumen","akuntabilitas","laporan","konflik kepentingan"],
    media:["podcast","tweet","timeline","video","film","jurnalis","redaksi","influencer","konten"],digital:["akun","bot","ai","deepfake","fufufafa","server"],
    economy:["ekonomi","rupiah","ihsg","pasar","inflasi","produktif","kelas menengah","daya beli"],currency:["rupiah","dolar","kurs","valas"],markets:["ihsg","bursa","investor","modal","yield","saham"],debt:["utang","cicilan","fiskal"],
    mbg:["mbg","makan bergizi","kotak makan","dapur","sppg","bgn"],nutrition:["gizi","menu","protein","pangan lokal","ultra-proses","ahli gizi"],"food-safety":["keamanan pangan","keracunan","higiene","sanitasi","sop dapur","rantai dingin"],health:["kesehatan","dokter","sakit","rumah sakit","puskesmas"],village:["desa","dana desa","kepala desa","kelurahan"],kopdes:["kopdes","koperasi desa","koperasi merah putih","80.081"],dynasty:["dinasti","keluarga politik","dua periode","2029","pak joko","mas samsul"],risk:["risiko","risk","kerugian","jaminan"],"state-assets":["danantara","bumn","aset negara","superholding"],governance:["tata kelola","audit","komite","mandat","vendor","sop"],
    geopolitics:["brics","asean","diplomasi","luar negeri","rusia","china","india","global south","geopolitik","bandara"],military:["tni","militer","jenderal","pertahanan","seragam","rudal"],
    energy:["pln","listrik","baterai","energi"],disaster:["banjir","bencana","sumatra","cuaca","posko"],
    polling:["survei","polling","approval","margin of error","sampel"],"public-opinion":["opini publik","kepercayaan","approval","survei","demo"],institutions:["institusi","kementerian","organisasi","struktur","reformasi"],technology:["teknologi","ai","digital","baterai"],change:["perubahan","reformasi","redesign","disrupsi"],productivity:["produktivitas","industri","daya saing","hilirisasi"]
  };
  function themeTokenMatch(text,token){
    const t=String(token||"").trim().toLowerCase();
    if(!t)return false;
    const escaped=t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    // Single tokens must match as whole words; phrases can match naturally.
    if(!t.includes(" "))return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,"i").test(text);
    return text.includes(t);
  }
  function issueThemes(issue=currentIssue()){
    const text=` ${issue?.key||""} ${issue?.arc||""} ${issue?.title||""} ${issue?.subject||""} ${issue?.document||""} ${issue?.people||""} ${issue?.post||""} ${issue?.lesson||""} `.toLowerCase();
    const set=new Set();
    Object.entries(issueThemeRules).forEach(([theme,words])=>{if(words.some(w=>themeTokenMatch(text,w)))set.add(theme)});
    if(!set.size)set.add("media");
    return [...set];
  }
  function directCharacterThemes(character){
    return [...new Set([...(crewThemeOverrides[character.id]||[]),...(character.themes||[])])];
  }
  function inferredCharacterThemes(character){
    const explicit=directCharacterThemes(character);
    const text=`${character.id} ${character.name} ${character.role} ${character.bio} ${character.ability?.name||""} ${character.ability?.desc||""}`.toLowerCase();
    const inferred=new Set(explicit);
    Object.entries(issueThemeRules).forEach(([theme,words])=>{if(words.some(w=>themeTokenMatch(text,w)))inferred.add(theme)});
    (character.ability?.buff?.actionIds||[]).forEach(id=>(actionThemeMap[id]||[]).forEach(t=>inferred.add(t)));
    if(!inferred.size)inferred.add("media");
    return [...inferred];
  }
  function characterAvailability(character){
    const from=Number(character.availableFrom)||1,to=Number(character.availableUntil)||12;
    return {available:state.day>=from&&state.day<=to,from,to};
  }
  function characterRelevance(character,issue=currentIssue()){
    const iThemes=issueThemes(issue),directThemes=directCharacterThemes(character),direct=directThemes.filter(t=>iThemes.includes(t)),cThemes=inferredCharacterThemes(character),overlap=cThemes.filter(t=>iThemes.includes(t)),inferredOnly=overlap.filter(t=>!direct.includes(t));
    const actionIds=[...(character.followUp?.actionIds||[]),...(character.ability?.buff?.actionIds||[])].filter(id=>id!=="*");
    const actionFit=actionIds.filter(id=>(issue.weak||[]).includes(id)).length;
    const specificity=direct.length?Math.round((direct.length/Math.max(1,directThemes.length))*6):0;
    const raw=direct.length*10+inferredOnly.length*2+actionFit*5+specificity;
    return {raw,direct,overlap,iThemes,cThemes,actionFit};
  }
  function stableCrewOrder(id,role,phase,month){
    const input=`${role}:${phase}:${month}:${id}`;
    let hash=2166136261;
    for(let i=0;i<input.length;i++)hash=Math.imul(hash^input.charCodeAt(i),16777619);
    return (hash>>>0)/4294967295;
  }
  function crewAvailableInMonth(character,month){
    const from=Number(character.availableFrom)||1,to=Number(character.availableUntil)||12;
    return month>=from&&month<=to;
  }
  function monthlyRosterSchedule(role,phase){
    const key=`${role}:${phase}`;
    if(monthlyRosterCache.has(key))return monthlyRosterCache.get(key);
    const roster=phaseRoster(role,phase),issues=phases[phase]?.days||[];
    const appearances=new Map(),lastSeen=new Map();
    const schedule=issues.map((issue,index)=>{
      const month=index+1;
      const scored=roster.filter(c=>crewAvailableInMonth(c,month)).map(character=>{
        const relevance=characterRelevance(character,issue);
        const seen=appearances.get(character.id)||0,last=lastSeen.get(character.id)||0;
        const until=Number(character.availableUntil)||12,remaining=until-month+1;
        const gap=last?month-last:Number.POSITIVE_INFINITY;
        const hardEligible=last===0||gap>1;
        const preferredGap=last===0||gap>2;
        const freshness=seen===0?18:Math.min(15,Math.max(0,gap)*4);
        const urgency=seen===0&&remaining<=3?20:0;
        const cooldownScore=preferredGap?30:-24;
        const rotationScore=relevance.raw*2-seen*17+freshness+urgency+cooldownScore+stableCrewOrder(character.id,role,phase,month);
        return {character,relevance,rotationScore,hardEligible,preferredGap};
      });
      const byPriority=(a,b)=>b.rotationScore-a.rotationScore||b.relevance.raw-a.relevance.raw||a.character.id.localeCompare(b.character.id);
      const eligible=scored.filter(entry=>entry.hardEligible);
      const unseen=eligible.filter(entry=>(appearances.get(entry.character.id)||0)===0).sort((a,b)=>{
        const aUntil=Number(a.character.availableUntil)||12,bUntil=Number(b.character.availableUntil)||12;
        return aUntil-bUntil||byPriority(a,b);
      });
      // Coverage is mandatory: every character gets a month before repeats can
      // consume all three slots. Relevance ranks the guaranteed appearances.
      const selected=unseen.slice(0,MONTHLY_CREW_SIZE);
      if(selected.length<MONTHLY_CREW_SIZE){
        const selectedIds=new Set(selected.map(entry=>entry.character.id));
        const preferredFill=eligible.filter(entry=>entry.preferredGap&&!selectedIds.has(entry.character.id)).sort(byPriority);
        selected.push(...preferredFill.slice(0,MONTHLY_CREW_SIZE-selected.length));
      }
      if(selected.length<MONTHLY_CREW_SIZE){
        const selectedIds=new Set(selected.map(entry=>entry.character.id));
        const cooldownFill=eligible.filter(entry=>!selectedIds.has(entry.character.id)).sort(byPriority);
        selected.push(...cooldownFill.slice(0,MONTHLY_CREW_SIZE-selected.length));
      }
      // This final fallback only protects malformed custom data. The shipped
      // rosters are tested to have enough available characters, so two
      // consecutive monthly lineups never share a face.
      if(selected.length<MONTHLY_CREW_SIZE){
        const selectedIds=new Set(selected.map(entry=>entry.character.id));
        const emergencyFill=scored.filter(entry=>!selectedIds.has(entry.character.id)).sort(byPriority);
        selected.push(...emergencyFill.slice(0,MONTHLY_CREW_SIZE-selected.length));
      }
      selected.forEach(({character})=>{
        appearances.set(character.id,(appearances.get(character.id)||0)+1);
        lastSeen.set(character.id,month);
      });
      return selected.map(entry=>entry.character);
    });
    monthlyRosterCache.set(key,schedule);
    return schedule;
  }
  function monthlyRosterFor(role,phase,month){
    const schedule=monthlyRosterSchedule(role,phase);
    return schedule[clamp(Number(month)||1,1,12)-1]||phaseRoster(role,phase).slice(0,MONTHLY_CREW_SIZE);
  }
  function characterTopicMatch(character,issue=currentIssue()){
    const rel=characterRelevance(character,issue),peers=currentRoster().filter(c=>characterAvailability(c).available),maxScore=Math.max(0,...peers.map(c=>characterRelevance(c,issue).raw));
    const score=rel.raw>0&&rel.raw>=maxScore?3:rel.raw>0?2:0;
    return {...rel,maxScore,score,label:score===3?"DEDUKSI TEPAT":score===2?"MASIH NYAMBUNG":"SALAH STUDIO",className:score===3?"perfect":score===2?"partial":"miss"};
  }
  function scaleEffectObject(obj={},factor=1){
    const out={};Object.entries(obj).forEach(([k,v])=>out[k]=typeof v==="number"?Math.round(v*factor):v);return out;
  }
  function bestFollowUpAction(character,issue=currentIssue()){
    const allowed=(character.followUp?.actionIds||character.ability?.buff?.actionIds||[]).filter(id=>id!=="*");
    const available=availableActions().map(a=>a.id);
    let candidates=allowed.filter(id=>available.includes(id));
    if(!candidates.length)candidates=available;
    const iThemes=issueThemes(issue),cThemes=inferredCharacterThemes(character);
    return [...candidates].sort((a,b)=>{
      const score=id=>{
        const themes=actionThemeMap[id]||[];
        return themes.filter(t=>iThemes.includes(t)).length*3+
          themes.filter(t=>cThemes.includes(t)).length*2+
          (issue.weak?.includes(id)?4:0)-
          (issue.resist?.includes(id)?3:0);
      };
      return score(b)-score(a);
    })[0]||available[0];
  }
  function tokenText(text,character,issue){
    return String(text||"").replaceAll("{character}",character.name).replaceAll("{topic}",issue.subject||issue.title).replaceAll("{doc}",issue.document||"dokumen utama").replaceAll("{people}",issue.people||"warga terdampak");
  }
  function createFollowUpCard(character,match){
    const issue=currentIssue(),actionId=bestFollowUpAction(character,issue),base=actionDefs[state.role].find(a=>a.id===actionId);
    if(!base)return null;
    const id=`${state.phase}:${state.day}:${character.id}:${Date.now()}`;
    const title=tokenText(character.followUp?.title||`${character.ability?.name||"Crew Combo"}: ${issue.subject||issue.title}`,character,issue);
    const desc=tokenText(character.followUp?.desc||`${character.name} menyiapkan respons lanjutan yang menghubungkan ${issue.subject||issue.title} dengan ${issue.document||"bukti yang relevan"}.`,character,issue);
    const card={id,phase:state.phase,day:state.day,characterId:character.id,characterName:character.name,characterIcon:character.icon,actionId,title,desc,costMultiplier:character.followUp?.costMultiplier||.45,reward:character.followUp?.reward||{credibility:5,reach:4,network:3},matchThemes:match.overlap,used:false};
    state.followUpCards=state.followUpCards||[];state.followUpCards.push(card);return card;
  }
  function activeFollowUpCards(){return (state.followUpCards||[]).filter(c=>c.phase===state.phase&&c.day===state.day&&!c.used)}
  function abilityKey(id) {
    return `${state.role}:${state.phase}:${id}`;
  }
  function isAbilityUsed(character) {
    return Boolean(state.abilityUses?.[abilityKey(character.id)]);
  }
  function activeActionBuffs(action) {
    return (state.abilityBuffs || []).filter(
      (b) =>
        b.phase === state.phase &&
        (!b.actionIds ||
          b.actionIds.includes("*") ||
          b.actionIds.includes(action.id)),
    );
  }
  function consumeActionBuffs(action) {
    const consumed = [];
    state.abilityBuffs = (state.abilityBuffs || []).filter((b) => {
      const match =
        b.phase === state.phase &&
        (!b.actionIds ||
          b.actionIds.includes("*") ||
          b.actionIds.includes(action.id));
      if (match && b.consume !== false) consumed.push(b);
      return !(match && b.consume !== false);
    });
    return consumed;
  }
  function applyMetricDelta(metrics = {}) {
    Object.entries(metrics).forEach(([k, v]) => {
      state.postMetrics[k] = Math.max(
        0,
        Math.round((state.postMetrics[k] || 0) + v),
      );
    });
  }
  function activateAbility(id) {
    const character = currentRoster().find((c) => c.id === id);
    if (!character || isAbilityUsed(character)) return;
    const availability=characterAvailability(character);
    if(!availability.available){flash(`TOKOH INI BARU MASUK BULAN ${availability.from}`);return;}
    const ability = character.ability || {},match=characterTopicMatch(character);
    state.abilityUses[abilityKey(id)] = true;
    const factor=match.score===3?1:match.score===2?.78:.38;
    if (ability.immediate) applyEffects(scaleEffectObject(ability.immediate,factor));
    if (ability.metrics) applyMetricDelta(scaleEffectObject(ability.metrics,factor));
    if(match.score===0){applyEffects({credibility:-2,stress:3,heat:4});state.crewMisfires=(state.crewMisfires||0)+1;}
    else if(match.score===2)state.partialMatches=(state.partialMatches||0)+1;
    else{
      state.perfectMatches=(state.perfectMatches||0)+1;
      const reward=state.role==="buzzer"?{money:45000000*(state.phase+1),reach:6,career:3}:{money:7000000*(state.phase+1),credibility:5,network:5,career:3};
      applyEffects(reward);
    }
    if (ability.buff && match.score>0) {
      const buffFactor=match.score===3?1:.72;
      state.abilityBuffs.push({
        ...ability.buff,
        damage:Math.round((ability.buff.damage||0)*buffFactor),
        costMultiplier:ability.buff.costMultiplier?1-(1-ability.buff.costMultiplier)*buffFactor:undefined,
        engagementMultiplier:ability.buff.engagementMultiplier?1+(ability.buff.engagementMultiplier-1)*buffFactor:undefined,
        phase: state.phase,sourceId: character.id,sourceName: character.name,abilityName: ability.name,consume: ability.buff.consume !== false,
      });
    }
    const reveal=ability.trendReveal||ability.reveal||0;
    if (reveal&&match.score>0)state.trendReveal=Math.max(state.trendReveal||0,Math.max(1,Math.round(reveal*factor)));
    let follow=null;if(match.score===3)follow=createFollowUpCard(character,match);
    state.career += match.score===3?3:1;
    state.characterMatchLog=state.characterMatchLog||[];
    state.characterMatchLog.push({phase:state.phase,day:state.day,character:character.name,score:match.score,label:match.label,themes:match.overlap,followUp:follow?.title||null});
    state.abilityLog.push({phase:state.phase,day:state.day,character:character.name,ability:ability.name,match:match.label});
    const fallbackReplyText=match.score===3
      ? `${ability.quote} Pas banget sama ${currentIssue().subject||currentIssue().title}. Gue buka follow-up “${follow?.title}”. Bonus konteks cair; admin akhirnya milih narasumber berdasarkan tema, bukan jumlah follower.`
      : match.score===2
        ? `${ability.quote} Masih nyambung, tapi belum combo sempurna. Isunya punya satu kaki di spesialisasi gue; kaki satunya masih naik ojol.`
        : `${ability.quote} Eh, ini salah studio. Gue datang bawa ${inferredCharacterThemes(character).slice(0,2).map(t=>themeLabels[t]||t).join(" dan ")}, timeline lagi bahas ${issueThemes().slice(0,2).map(t=>themeLabels[t]||t).join(" dan ")}. Ability tetap kepakai. Netizen sudah bikin meme salah narasumber.`;
    const voiceReply=window.PNCharacterVoices?.renderAbility?.({
      id:character.id,
      name:character.name,
      issue:currentIssue(),
      phase:state.phase,
      seed:`${state.runSeed}:${state.phase}:${state.day}:${character.id}:${ability.name}`,
      base:ability.quote,
      matchScore:match.score,
      followTitle:follow?.title,
    });
    const replyText=voiceReply?.text||fallbackReplyText;
    state.comments.unshift(makeComment(match.score===3?"good":match.score===2?"neutral":"bad",replyText,{avatar:character.icon,handle:`@${character.id.replace(/[^a-z0-9]+/gi,"").toLowerCase()}`,kind:"npc",label:match.label,replyTo:currentIssue().title}));
    state.comments=state.comments.slice(0,24);
    addLog(`${match.label}: ${character.name} memakai ${ability.name}.${follow?` Follow-up “${follow.title}” terbuka.`:""}`,match.score===3?"good":match.score===2?"info":"bad");
    flash(`${character.icon} ${match.label}`);beep(match.score===0?150:match.score===2?420:720,.09);renderCards();render();saveGame(true);
  }
  function renderTeamPanel() {
    const roster=currentRoster(),active=(state.abilityBuffs||[]).filter(b=>b.phase===state.phase),themes=issueThemes();
    $("#teamBox").innerHTML=`<div class="issue-signal"><b>🧩 SINYAL ISU BULAN INI — PILIH CREW YANG PALING NYAMBUNG</b>${themes.slice(0,6).map(t=>`<span class="theme-chip">${themeLabels[t]||t.toUpperCase()}</span>`).join("")}</div><div class="roster-balance-note">${currentIssue().month} • 3 KARTU AKTIF • JUMLAH SAMA UNTUK KEDUA KUBU • LINEUP BERGANTI TIAP BULAN</div><div class="roster-stack">${roster.map((c,idx)=>{
      const used=isAbilityUsed(c),availability=characterAvailability(c),matchLog=[...(state.characterMatchLog||[])].reverse().find(x=>x.phase===state.phase&&x.character===c.name),specialties=inferredCharacterThemes(c).slice(0,5);
      const disabled=used||!availability.available;
      return `<article class="roster-card ${idx===0?"mentor-card":c.role.includes("WILDCARD")||c.role.includes("POWER CARD")?"wildcard-card":"cameo-card"}"><div class="roster-head"><div class="face">${c.icon}</div><div><span class="roster-role">${c.role}</span><b>${c.name}</b><small>${c.bio}</small>${c.twist?`<span class="power-twist">TWIST: ${c.twist}</span>`:""}</div></div><div class="crew-specialties">${specialties.map(t=>`<span>${themeLabels[t]||t.toUpperCase()}</span>`).join("")}</div><div class="crew-clue"><b>PETUNJUK:</b> ${c.clue||`Cocok saat isu bersinggungan dengan ${specialties.slice(0,3).map(t=>themeLabels[t]||t).join(", ")}.`}</div><div class="ability-box"><div class="ability-name">⚡ ${c.ability.name}</div><small class="ability-desc">${c.ability.desc}</small>${matchLog?`<div class="ability-result ${matchLog.score===3?"perfect":matchLog.score===2?"partial":"miss"}">${matchLog.label}${matchLog.followUp?` • FOLLOW-UP TERBUKA`:""}</div>`:""}<button type="button" class="ability-btn ${used?"used":""} ${!availability.available?"locked":""}" data-ability="${c.id}" ${disabled?"disabled":""}>${used?"SUDAH DIPAKAI FASE INI":!availability.available?`MUNCUL MULAI BULAN ${availability.from}`:"PILIH TOKOH • 1× / FASE"}</button></div></article>`;
    }).join("")}</div>${active.length?`<div class="active-buff-list"><b>BUFF MENUNGGU ACTION:</b><br>${active.map(b=>`${b.abilityName} — ${b.sourceName}`).join("<br>")}</div>`:""}${activeFollowUpCards().length?`<div class="deduction-toast perfect"><b>🎯 CONTEXT COMBO TERSEDIA</b><br>${activeFollowUpCards().map(c=>`${c.characterIcon} ${c.characterName}: ${c.title}`).join("<br>")}</div>`:""}`;
    document.querySelectorAll("[data-ability]").forEach(b=>b.onclick=()=>activateAbility(b.dataset.ability));
  }

  function showPhaseIntro(first = false) {
    const p = currentPhase(),
      roster = currentRoster();
    const phaseMeta = /^ARSIP POLITIK/i.test(p.status)
      ? `${p.period} • ${p.status}`
      : p.period;
    state.abilityBuffs = (state.abilityBuffs || []).filter(
      (b) => b.phase === state.phase,
    );
    $("#modalContent").innerHTML =
      `${state.gameMode === "free" ? '<span class="free-mode-badge">MODE BEBAS • FASE DAPAT DIGANTI KAPAN SAJA</span>' : ""}<h2>FASE ${state.phase + 1}/6<br>${p.name}</h2><span class="quiz-kicker">${phaseMeta}</span><div class="career-line"><b>${state.role === "buzzer" ? p.bRank : p.aRank}</b><p>${first ? state.gameMode === "free" ? "Sandbox dimulai langsung di fase pilihanmu. Dana, statistik, dan karier awal sudah disesuaikan agar ekonomi fase ini tetap bisa dimainkan." : "Kariermu dimulai. Setiap bulan kedua kubu mendapat tiga kartu karakter aktif yang disusun menurut tema timeline." : "Tahun baru, rotasi baru. Tiga tokoh aktif akan berganti tiap bulan agar semua fase tetap ringkas dan setiap kemunculan punya konteks."}</p></div><div class="roster-balance-note">LINEUP PEMBUKA ${currentIssue().month} • 3 KARTU PER KUBU • ROTASI BULANAN</div><div class="crew-intro-grid">${roster.map((c, idx) => `<div class="crew-intro-card ${c.role.includes("WILDCARD") ? "wildcard-intro" : ""}"><span class="roster-role">${c.role.includes("WILDCARD") ? "WILDCARD BULAN" : c.role.includes("POWER CARD") ? "POWER CARD BULAN" : idx === 0 ? "LEAD CREW BULAN" : "CREW BULAN"} • ${c.role}</span><b>${c.icon} ${c.name}</b><small>${c.bio}</small><div class="ability-name">⚡ ${c.ability.name}</div><small>${c.ability.desc}</small></div>`).join("")}</div><div class="lesson"><b>MEKANIK DEDUKSI CREW:</b> baca sinyal isu bulan aktif, lalu pilih tokoh yang spesialisasinya paling nyambung. Match sempurna membuka follow-up card eksklusif dan reward ekstra; salah studio tetap menghabiskan ability serta mengundang roasting nasional.</div><p style="font-size:12px;color:var(--muted)">Tokoh plesetan adalah karakter satir; sebagian komposit, sebagian terinspirasi pola komunikasi publik. Semua dialog dan ability ditulis sebagai fiksi parodi, bukan kutipan atau klaim tindakan nyata.</p><button class="btn" id="phaseStartBtn">Masuk Timeline</button>`;
    $("#modal").classList.remove("hidden");
    $("#phaseStartBtn").onclick = () => {
      $("#modal").classList.add("hidden");
      loadIssue();
    };
  }
  function seedPostMetrics() {
    const i = currentIssue(),
      base = Math.max(
        2500,
        Math.round((state.reach + state.heat + i.heat) * rnd(180, 320)),
      );
    state.postMetrics = {
      views: base,
      likes: Math.round((base * rnd(18, 45)) / 1000),
      reposts: Math.round((base * rnd(5, 18)) / 1000),
      replies: Math.round((base * rnd(3, 14)) / 1000),
    };
    const openingPool = topicCommentPool("neutral", i);
    state.comments = [
      makeComment("neutral", openingPool[rnd(0, openingPool.length - 1)], {
        replyTo: i.handle,
        issueKey: i.key,
        allowNoise: false,
      }),
    ];
    state.lastImpact = {
      organic: 68,
      coordinated: 12,
      undecided: 20,
      label: "Percakapan baru mulai",
    };
  }
  function loadIssue(preserve = false) {
    const i = currentIssue();
    let rippleNotices = [];
    if (!preserve) {
      state.resolve = 100;
      state.actions = 0;
      state.heat = clamp(i.heat + state.phase * 2);
      state.lastAction = null;
      state.lastActionVariant = 0;
      seedPostMetrics();
      rippleNotices = resolveDueNarrativeRipples();
    } else {
      state.currentRippleNotices = [];
    }
    const variantIndex = Number(i._variantIndex || 0) + 1;
    const variantCount = Number(i._variantCount || 1);
    const runCode = String(state.runSeed || 0).slice(-4).padStart(4, "0");
    const archiveLabel = /^ARSIP POLITIK/i.test(i.status)
      ? `<span class="archive-label">${escapeHtml(i.status)}</span> `
      : "";
    $("#issueTitle").innerHTML =
      `<span class="timeline-meta">${archiveLabel}<span class="variant-chip" title="Campaign baru dapat memilih post lain untuk bulan yang sama">TIMELINE <b>${variantIndex}/${variantCount}</b></span> <span class="timeline-divider" aria-hidden="true">•</span> <span class="run-chip" title="Kode run campaign aktif">RUN <b>${runCode}</b></span></span><span class="issue-hashtag">${hashtagHtml(i.title)}</span>`;
    $("#npcAvatar").textContent = i.avatar;
    $("#npcName").textContent = i.npc;
    $("#npcHandle").textContent = i.handle;
    $("#postText").innerHTML = voicePostHtml(i) + rippleNoticeHtml(rippleNotices);
    $("#strategyLesson").textContent = i.lesson;
    $("#battleLog").innerHTML = "";
    addLog(
      `Fase ${state.phase + 1}, bulan ${state.day}: ${i.month}. Mesin rekomendasi meminta emosi sebelum sarapan.`,
      "info",
    );
    rippleNotices.forEach(notice => addLog(`AKIBAT EVENT LAMA: ${notice.title} — ${notice.text}`, notice.tone === "good" ? "good" : notice.tone === "bad" ? "bad" : "info"));
    renderFacts(i);
    renderCards();
    render();
  }
  function renderFacts(issue){
    const arr=(Array.isArray(issue?.facts)&&issue.facts.length)?issue.facts:(sources[issue?.key]||[["Konteks episode",issue?.lesson||"Skenario politik dalam permainan.",""]]);
    $("#facts").innerHTML=arr.map(x=>`<div class="fact-card"><h4>${x[0]}</h4><p>${x[1]}</p>${x[2]?`<a href="${x[2]}" target="_blank" rel="noopener">Buka sumber ↗</a>`:'<span class="handle">Skenario atau catatan editorial permainan</span>'}</div>`).join("")+`<div class="source-disclaimer"><b>Prinsip permainan</b><br>${issue?.status === "TIMELINE ALTERNATIF"?"Bagian ini adalah skenario satir—bukan ramalan, bocoran, atau tuduhan tentang kejadian yang belum berlangsung.":"Kutipan singkat yang terdokumentasi ditautkan lewat kartu fakta. Selebihnya adalah reaksi, parafrasa, atau dialog satir; tudingan, bantahan, dakwaan, vonis, dan upaya hukum tetap dibedakan."}</div>`;
  }

  function effectiveDamage(a, i) {
    let d = a.damage;
    if (i.weak.includes(a.id)) d += 11;
    if (i.resist.includes(a.id)) d -= 9;
    if (state.specialties.includes("Data Elektoral") && a.id === "data")
      d += 10;
    if (
      state.specialties.includes("Mikrofon kekuasaan") &&
      a.id === "podcast"
    )
      d += 10;
    if (state.specialties.includes("Pakar hukum") && a.id === "law")
      d += 12;
    if (
      state.specialties.includes("Jaringan produksi") &&
      a.id === "film"
    )
      d += 8;
    if (
      state.specialties.includes("Reformis dari dalam") &&
      a.id === "transparency"
    )
      d += 15;
    if (state.phase === 5 && state.role === "buzzer" && a.integrity < 0)
      d += 7;
    d += activeActionBuffs(a).reduce(
      (sum, b) => sum + (b.damage || 0),
      0,
    );
    return Math.max(8, d + rnd(-3, 4));
  }
  function availableActions() {
    let all = actionDefs[state.role].filter((a) => a.min <= state.phase);
    if (
      state.role === "buzzer" &&
      !state.specialties.includes("Selebriti & akses")
    )
      all = all.filter((a) => a.id !== "endorse" || state.phase >= 2);
    if (
      state.role === "buzzer" &&
      !state.specialties.includes("Mikrofon kekuasaan")
    )
      all = all.filter((a) => a.id !== "podcast" || state.phase >= 3);
    if (
      state.role === "aktivis" &&
      !state.specialties.includes("Pakar hukum")
    )
      all = all.filter((a) => a.id !== "law" || state.phase >= 3);
    if (
      state.role === "aktivis" &&
      !state.specialties.includes("Jaringan produksi")
    )
      all = all.filter((a) => a.id !== "film" || state.phase >= 4);
    return all;
  }

  function renderCards() {
    const i = currentIssue();
    const actions = availableActions();
    state.phaseActionVariants = state.phaseActionVariants || {};
    const hasAvailableFormats = actions.some(
      (a) => phaseActionUseCount(a.id) < maxActionVariants(a),
    );
    const affordable = actions.some((a) => {
      const used = phaseActionUseCount(a.id);
      return used < maxActionVariants(a) && state.money >= actionCost(a, i);
    });
    let html = actions
      .map((a) => {
        const used = phaseActionUseCount(a.id);
        const maxVariants = maxActionVariants(a);
        const exhausted = used >= maxVariants;
        const variantIndex = Math.min(used, Math.max(0, maxVariants - 1));
        const d = effectiveDamage(a, i),
          cost = actionCost(a, i),
          v = actionPresentation(a, i, variantIndex),
          disabled = exhausted || state.money < cost || state.resolve <= 0,
          buffs = activeActionBuffs(a);
        const title = exhausted ? "Pendekatan Ini Udah Habis di Fase Ini" : v.name;
        const desc = exhausted
          ? "Semua pendekatan dari keluarga kartu ini udah dipakai pada fase sekarang. Coba strategi lain sampai tahun berganti."
          : v.desc;
        const costText = exhausted ? "SUDAH DIPAKAI" : formatMoney(cost);
        return `<button class="action-card ${exhausted ? "action-exhausted" : ""}" data-action="${a.id}" data-variant="${used}" ${disabled ? "disabled" : ""}><div class="action-card-head"><h4>${title}</h4><span class="cost">${costText}${exhausted ? "" : `<span class="cost-level">${costLevelLabel()}</span>`}</span></div><p>${desc}</p><div class="tags">${a.tags.map((t) => `<span class="tag">${t}</span>`).join("")}${i.weak.includes(a.id) ? '<span class="tag new">EFEKTIF</span>' : ""}${used > 0 && !exhausted ? '<span class="tag new">PENDEKATAN BARU</span>' : '<span class="tag new">BELUM DIPAKAI</span>'}${buffs.map((b) => `<span class="tag ability-tag">⚡ ${b.sourceName}</span>`).join("")}</div><span class="action-context">${v.context}</span><p style="margin-top:7px;color:var(--ink)">Dampak ±${d}${buffs.length ? " • CREW BOOST" : ""}</p></button>`;
      })
      .join("");
    const followHtml=activeFollowUpCards().map(card=>{
      const a=actionDefs[state.role].find(x=>x.id===card.actionId);if(!a)return "";
      const cost=Math.max(1000000,Math.round(actionCost(a,i)*card.costMultiplier/1000000)*1000000);
      const reward=Object.entries(card.reward||{}).map(([k,v])=>`${k} ${v>0?"+":""}${typeof v==="number"&&Math.abs(v)>=1000000?formatMoney(v):v}`).join(" • ");
      return `<button class="action-card followup-card" data-followup="${card.id}" ${state.money<cost||state.resolve<=0?"disabled":""}><div class="followup-banner">🎯 PERFECT MATCH FOLLOW-UP • ${card.characterIcon} ${card.characterName}</div><div class="action-card-head"><h4>${card.title}</h4><span class="cost">${formatMoney(cost)}<span class="cost-level">CONTEXT COMBO</span></span></div><p>${card.desc}</p><div class="tags"><span class="tag ability-tag">${card.actionId.toUpperCase()}</span><span class="tag new">BONUS EFEKTIF</span>${card.matchThemes.map(t=>`<span class="tag">${themeLabels[t]||t}</span>`).join("")}</div><div class="followup-reward"><b>EXTRA REWARD:</b> ${reward||"credibility +5 • reach +4"}<br>Damage lebih tinggi dan komentar khusus tokoh.</div></button>`;
    }).join("");
    html=followHtml+html;
    if (!affordable && hasAvailableFormats && state.resolve > 0) {
      html += `<button class="action-card finance-card" id="cashCrisisCard"><div class="action-card-head"><h4>💸 Semua Action Card Kemahalan</h4><span class="cost">KAS KERING</span></div><p>${state.role === "buzzer" ? "Invoice belum cair, patron cuma centang dua, dan komisaris masih berupa doa." : "Donasi seret, proposal dibaca cuma bagian anggaran, dan logistik minta dibayar pakai uang beneran."}</p><div class="tags"><span class="tag new">RISIKO BANGKRUT</span><span class="tag">KREDIT BERBUNGA</span></div><p style="margin-top:7px;color:var(--ink)">Buka meja bailout atau akhiri kronik.</p></button>`;
    }
    $("#cards").innerHTML = html;
    document
      .querySelectorAll("[data-action]")
      .forEach((b) => (b.onclick = () => playAction(b.dataset.action, Number(b.dataset.variant) || 0)));
    document.querySelectorAll("[data-followup]").forEach(b=>b.onclick=()=>playFollowUpAction(b.dataset.followup));
    const crisis = $("#cashCrisisCard");
    if (crisis) crisis.onclick = () => showBankruptcyCrisis("KAS TAK CUKUP UNTUK SATU ACTION");
  }
  function nextChronicleIssue() {
    if (state.day < 12) return phases[state.phase].days[state.day];
    if (state.phase < phases.length - 1)
      return phases[state.phase + 1].days[0];
    return null;
  }

  function nextTrendHint(){
    const i=currentIssue(),teaser=i?.teaser||"isu yang adminnya sudah ganti foto profil";
    const lead=["Gue nggak bilang bakal viral, tapi admin sebelah udah bikin tiga template soal","Bocoran parkiran: bulan depan timeline mulai latihan bahas","Anak base udah nyimpen draft. Katanya habis ini masuk arc","Pak RT salah kirim screenshot ke grup ronda. Isinya soal","Spreadsheet baru muncul jam 02.13. Nama tab-nya"][rnd(0,4)];
    return `${lead} ${teaser}. Screenshot dulu, percaya belakangan.`;
  }
  function topicCommentPool(tone,i){
    const core=i?.discussion?.[tone]||i?.discussion?.neutral||"fakta dan opininya mesti dipisah";
    const subject=i.subject||issueHook(i),doc=i.document||"dokumen utuh",people=i.people||"warga",counter=i.counter||"isu sebelah";
    const p={
      good:[
        `Oke, ini nyambung. ${core}. Akhirnya ${subject} dibahas tanpa muter dulu ke ${counter}.`,
        `${core}. Pin ${doc}; jangan sampai link primernya tenggelam di bawah stiker dan “izin save”.`,
        `${core}. ${people} akhirnya jadi orang, bukan stok foto senyum di slide penutup.`
      ],
      bad:[
        `Lah, yang dibahas ${subject}, kok admin lari ke ${counter}? Ini klarifikasi atau naik angkot salah jurusan?`,
        `${core}. Judulnya galak, bukti primernya masih OTW naik ojol dan drivernya nyasar ke kantor humas.`,
        `${core}. Ini diskusi kebijakan apa audisi siapa paling yakin sambil nggak baca lampiran?`
      ],
      neutral:[
        `${core}. Link ${doc} ada nggak? Jangan screenshot satu paragraf terus sisanya disuruh tawakal.`,
        `${core}. Gue belum ambil kubu; gue cuma pengen bedain fakta, tuduhan, bantahan, sama admin lagi kesurupan template.`,
        `${core}. Dampaknya ke ${people} apa, selain jadi bahan konten, seminar, dan tote bag?`
      ]
    };
    return p[tone]||p.neutral;
  }

  function makeComment(tone = "neutral", custom = null, opts = {}) {
    state.commentMemory = state.commentMemory || [];
    const choosePersona = () => {
      if (opts.persona) return opts.persona;
      if (opts.kind === "npc") return "npc";
      if (
        opts.allowNoise === true &&
        Math.random() < (netizenPack.spamChance || 0) &&
        netizenPack.spamPersonaIds?.length
      )
        return netizenPack.spamPersonaIds[rnd(0, netizenPack.spamPersonaIds.length - 1)];
      if (Math.random() < (netizenPack.roughChance || 0)) return "rageCitizen";
      if (Math.random() < (netizenPack.fufuChance || 0)) return "forumGhost";
      if (state.fufuArchive && Math.random() < (state.fufuTwistResolved ? 0.13 : 0.075))
        return "forumGhost";
      const pool = personaPools[tone] || personaPools.neutral;
      return pool[rnd(0, pool.length - 1)];
    };
    const pickBase = (persona) =>
      custom != null
        ? custom
        : persona?.bodies?.length
        ? persona.bodies[rnd(0, persona.bodies.length - 1)]
        : commentTemplates[tone][rnd(0, commentTemplates[tone].length - 1)];
    let personaId = choosePersona();
    let persona = commenterPersonas[personaId] || commenterPersonas.millennial;
    let raw = pickBase(persona);
    let textOut = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt > 0 && !opts.persona && opts.kind !== "npc") {
        personaId = choosePersona();
        persona = commenterPersonas[personaId] || commenterPersonas.millennial;
        raw = pickBase(persona);
      }
      const opener =
        opts.kind === "npc"
          ? ""
          : persona.openers[rnd(0, persona.openers.length - 1)];
      const closer =
        opts.kind === "npc"
          ? ""
          : persona.closers[rnd(0, persona.closers.length - 1)];
      let body = netizenize(raw);
      if (personaId === "genz") body = body.charAt(0).toLowerCase() + body.slice(1);
      if (personaId === "fanwar" && Math.random() < 0.65) body = body.toUpperCase();
      textOut = netizenize(opener + body + closer);
      const fingerprint = textOut.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!state.commentMemory.includes(fingerprint) || attempt === 5) {
        state.commentMemory.unshift(fingerprint);
        state.commentMemory = state.commentMemory.slice(0, 28);
        break;
      }
    }
    return {
      avatar:
        opts.avatar || persona.avatars[rnd(0, persona.avatars.length - 1)],
      handle:
        opts.handle || persona.handles[rnd(0, persona.handles.length - 1)],
      text: textOut,
      tone,
      kind: opts.kind || "",
      label: opts.label || persona.label,
      persona: personaId,
      replyTo: opts.replyTo || "",
      actionId: opts.actionId || "",
      actionName: opts.actionName || "",
      issueKey: opts.issueKey || "",
      stance: opts.stance || "",
      reactionMode: opts.reactionMode || "",
      isNoise: Boolean(opts.isNoise || noisePersonaIds.has(personaId)),
    };
  }
  function issueHook(i) {
    return i.title.replace(/^#/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  function hashtagHtml(value) {
    return escapeHtml(String(value || "")).replace(/([a-z0-9])([A-Z])/g, "$1<wbr>$2");
  }
  const actionCommentAngles = {
    buzzer: {
      meme: { good: "humornya ngebantu orang nangkep isu", bad: "memenya lucu tapi pertanyaannya ditinggal di parkiran", ask: "link konteks sebelum punchline-nya mana" },
      patriot: { good: "simbolnya dipakai tanpa mematikan ruang kritik", bad: "cinta negara kok dijadikan tombol mute", ask: "bagian kebijakannya dijawab kapan setelah lagu selesai" },
      data: { good: "angka, baseline, dan pembandingnya dibuka", bad: "grafiknya rapi tapi denominator-nya kayak lagi cuti", ask: "periode, sampel, dan angka absolutnya mana" },
      whatabout: { good: "perbandingan sejarahnya masih relevan", bad: "isu sekarang disuruh antre di belakang skandal lama", ask: "setelah bahas masa lalu, jawaban untuk hari ini apa" },
      endorse: { good: "figur publiknya jujur soal posisi dan hubungan", bad: "follower dipakai jadi gelar kompetensi", ask: "ini opini pribadi, kontrak, atau jabatan resmi" },
      podcast: { good: "format panjangnya benar-benar dipakai buat bedah insentif", bad: "dua jam ngomong tapi pertanyaan intinya masih buffering", ask: "timestamp jawaban konkret dan sumbernya ada nggak" },
      attack: { good: "kritik rekam jejaknya relevan dan terverifikasi", bad: "aib sampingan dipakai buat kabur dari kebijakan", ask: "hubungan temuan ini dengan isu utama apa" },
      concert: { good: "panggungnya tetap menyisakan ruang audit", bad: "LED-nya terang, lampiran anggarannya gelap", ask: "setelah MC turun, indikator hasilnya apa" },
      transparency: { good: "dokumen, konflik kepentingan, dan koreksinya kebuka", bad: "katanya transparan tapi file-nya cuma foto tabel", ask: "data mentah, kontrak, dan mekanisme koreksinya di mana" },
    },
    aktivis: {
      context: { good: "kronologinya bikin klip viral balik punya sebelum dan sesudah", bad: "thread panjangnya malah bikin konteks tambah nyasar", ask: "sumber waktu, versi penuh, dan aktor keputusannya mana" },
      data: { good: "baseline dan metodologinya bisa dicek ulang", bad: "angka dipakai sebagai aksesori intelektual", ask: "dataset, rumus, dan keterbatasannya dibuka nggak" },
      empathy: { good: "warga terdampak jadi subjek, bukan dekorasi gerakan", bad: "cerita korban diperas jadi engagement", ask: "izin, perlindungan identitas, dan tindak lanjutnya ada nggak" },
      meme: { good: "recehnya ngantar orang ke sumber", bad: "kritiknya berubah jadi fanart musuh kartun", ask: "habis ketawa, orang bisa baca konteksnya di mana" },
      network: { good: "gerakannya punya logistik dan struktur di luar timeline", bad: "koalisi grup chat-nya lebih banyak dari kerja lapangannya", ask: "siapa pegang tugas, kas, keamanan, dan tindak lanjut" },
      law: { good: "pasal, amar, dan prosedurnya diterjemahkan tanpa dipelintir", bad: "bahasa hukum dipakai buat cosplay paling benar", ask: "putusan utuh dan akibat hukumnya bisa dibaca di mana" },
      film: { good: "visualnya punya dokumen, metadata, dan ruang koreksi", bad: "sinematiknya menang, metodologinya jadi figuran", ask: "footage, sumber, dan tanggapan pihak yang dikritik tersedia nggak" },
      attack: { good: "kritiknya tetap relevan dengan kuasa dan kebijakan", bad: "gerakan berubah jadi akun infotainment yang marah", ask: "kenapa serangan personal ini penting buat tuntutan publik" },
      transparency: { good: "donor, metode, dan kesalahan sendiri ikut dibuka", bad: "transparansinya cuma berlaku buat kubu lawan", ask: "laporan kas, afiliasi, dan versi koreksinya mana" },
    },
  };
  function discussionComment(tone,i,a,selectedDisplay=null){
    const display=selectedDisplay||actionPresentation(a,i,phaseActionUseCount(a.id));
    const topic=i.subject||i.title,doc=i.document||"dokumen utuh",people=i.people||"warga",counter=i.counter||"kubu sebelah";
    const angle=actionCommentAngles[state.role]?.[a.id]||{good:"responsnya nyambung",bad:"responsnya muter",ask:"buktinya mana"};
    const choices=tone==="good"
      ?["genz","anakpdf","emak","bapak","millennial","ojol","anakKos","asn","warung"]
      :tone==="bad"
        ?["genz","emak","bapak","conspiracy","fanwar","millennial","ojol","warung","buzzerMagang"]
        :["anakpdf","bapak","emak","genz","millennial","conspiracy","ojol","anakKos","asn","warung"];
    const persona=choices[rnd(0,choices.length-1)],an=`“${display.name}”`;
    const t={
      bapak:tone==="good"?`${an} lumayan nyambung. ${angle.good}. Tapi ${doc} jangan disimpan kayak kunci gudang RT.`:tone==="bad"?`${an} kayak cat ulang pos ronda: rame warnanya, masalah ${topic} masih bocor. ${angle.bad}.`:`Bapak izin tanya: soal ${topic}, ${angle.ask}? Gorengannya jangan lupa.`,
      genz:tone==="good"?`${an} actually jawab ${topic}. rare timeline W. sekarang spill ${doc}, jangan cuma bilang “cek bio”.`:tone==="bad"?`${an} judulnya slay, tapi ${topic} ditinggal on read terus disuruh lihat ${counter} 😭`:`wait, ${an} ini arahnya ke mana? pls bedain fakta, tuduhan, sama vibes admin.`,
      emak:tone==="good"?`Nah begini. ${an} nyambung sama ${topic}. Sekarang jelasin dampaknya ke ${people}; jangan cuma angka TV yang senyum.`:tone==="bad"?`Yang dibahas ${topic}, kok jawabannya jalan-jalan ke ${counter}. Saya belanja kurang seribu aja dicari kasir, lho.`:`Saya ibu-ibu nanya simpel: ${doc} bisa dibuka nggak, terus siapa yang tanggung jawab kalau salah?`,
      millennial:tone==="good"?`Secara problem-solution fit, ${an} aligned. Tinggal bikin accountability loop—maaf kebiasaan LinkedIn.`:tone==="bad"?`Secara helicopter view, ${an} high engagement low closure. ${topic} belum punya jawaban, cuma hashtag dan coffee break. CMIIW.`:`${an} punya traction, tapi governance question-nya tetap: ${angle.ask}.`,
      conspiracy:tone==="good"?`Gue nggak nuduh ya, tapi ${an}, ${doc}, dan pola akun yang kebuka itu kalau ditarik benang merah... kali ini garisnya nggak putus.`:`Gue nggak nuduh ya, tapi tiap bahas ${topic} selalu dialihin ke ${counter}. Kebetulan kok templatenya sama, typo-nya juga kembar identik.`,
      anakpdf:tone==="good"?`${an} relevan. Pin ${doc}, versi lengkap, halaman, dan tanggal. Jangan crop tabel pas kolom kanan mulai bikin nggak nyaman.`:tone==="bad"?`${an} belum jawab ${topic}. Saya cari sumber primer, yang ketemu carousel tanpa footnote dan link mati.`:`Catatan: ${angle.ask}. Bedakan putusan, dakwaan, tudingan, bantahan, dan opini admin.`,
      fanwar:`POKOKNYA ${display.name.toUpperCase()} MENANG. SOAL ${String(topic).toUpperCase()} NANTI DIBAHAS HABIS RATIO.`,
      ojol:tone==="good"?`Gue baca ${an} sambil nunggu order. Nyambung ke ${topic}, rutenya nggak muter. Tinggal kasih link ${doc}.`:tone==="bad"?`${an} muternya lebih jauh dari aplikasi pas hujan. Tujuannya ${topic}, dibawa ke ${counter}.`:`Bang, titik jemput faktanya di mana? ${angle.ask}.`,
      anakKos:tone==="good"?`${an} masuk akal bahkan dibaca sambil makan mi. Soal ${topic}, ${angle.good}.`:tone==="bad"?`${an} bikin kenyang engagement, gizinya nol. ${topic} belum dijawab, saldo nalar kepotong admin.`:`Versi anak kos: siapa bayar, siapa untung, dan ${doc} bisa dibaca gratis nggak?`,
      asn:tone==="good"?`Komentar pribadi, nggak mewakili instansi: ${an} nyambung dan dokumennya bisa didisposisi ke publik.`:tone==="bad"?`Mohon jangan tag kantor, tapi ${an} ini menjawab ${topic} dengan format “akan dikoordinasikan”. Artinya belum.`:`Secara disposisi, ${angle.ask}. Lampiran ${doc} mohon jangan menyusul setelah isu selesai.`,
      warung:tone==="good"?`Di warung tadi ${an} lolos uji kursi plastik. Nyambung, ada bukti, nggak cuma volume.`:tone==="bad"?`Kata meja sebelah, ${an} rame kayak knalpot bocor. ${topic} tetap nggak nyampe.`:`Polling warung: setengah nanya ${angle.ask}, setengah lagi minta tambah gorengan.`,
      buzzerMagang:tone==="good"?`Brief gue bilang serang, tapi ${an} malah buka data. Bahaya sih, publik bisa kebiasaan minta bukti.`:tone==="bad"?`${an} sesuai brief banget. Pertanyaan ${topic} nggak dijawab, tapi KPI reply naik. Semoga invoice cair.`:`Gue magang doang, tapi ${angle.ask}? Admin senior belum balas.`
    };
    let body=t[persona]||`${an} bikin timeline rame. ${angle.ask}.`;
    if (!body.includes(display.name)) body = `Soal ${an}: ${body}`;
    return makeComment(tone,body,{
      persona,
      replyTo:an,
      actionId:a.id,
      actionName:display.name,
      issueKey:i.key,
      allowNoise:false,
    });
  }

  function contextualComment(tone, i, a = null, selectedDisplay = null) {
    const pool = topicCommentPool(tone, i),
      base = pool[rnd(0, pool.length - 1)],
      angle = a ? actionCommentAngles[state.role]?.[a.id] : null,
      display = selectedDisplay || (a ? actionPresentation(a, i, phaseActionUseCount(a.id)) : null),
      actionRead = !angle
        ? "tekniknya tetap harus bisa diuji"
        : tone === "good"
          ? angle.good
          : tone === "bad"
            ? angle.bad
            : angle.ask,
      suffix = display ? ` Buat “${display.name}”, ${actionRead}.` : "";
    return makeComment(tone, base + suffix, {
      replyTo:display ? `“${display.name}”` : i.handle,
      actionId:a?.id || "",
      actionName:display?.name || "",
      issueKey:i.key,
      allowNoise:false,
    });
  }

  function noiseSupplementComment(i, a, display) {
    const ids = [...noisePersonaIds];
    if (!ids.length) return null;
    const persona = ids[rnd(0, ids.length - 1)];
    return makeComment("neutral", null, {
      persona,
      kind:"noise",
      replyTo:`“${display.name}”`,
      actionId:a.id,
      actionName:display.name,
      issueKey:i.key,
      allowNoise:true,
      isNoise:true,
    });
  }

  const npcVoiceReplyPools = {
    "voice-documentary": {
      good: [
        "Oke, {action} masuk. Buat {topic}, gue tempel {doc} sama timecode-nya. Biar besok nggak ada yang pura-pura amnesia.",
        "Nah, ini baru enak diedit: klaim, bukti, bantahan, semuanya punya track sendiri. {people} nggak cuma jadi B-roll.",
        "Sip. Frame-nya sekarang punya sebelum dan sesudah. Metadata aman, versi koreksi juga ikut disimpan.",
        "Gue suka arah {action}. Dramanya ada, tapi sumber primer nggak disuruh jadi figuran.",
        "Masuk arsip. Bukan cuma videonya—siapa bilang apa, tanggal berapa, dan siapa yang kena dampaknya juga ikut.",
        "Oke. Kalau narasi nanti ganti kostum, jejak {doc} masih bisa dikenali dari sepatunya.",
      ],
      bad: [
        "{action} sinematik sih. Cuma {doc} masih figuran tanpa dialog.",
        "Kemarahan masuk frame. Bukti buat {topic} belum dapat close-up.",
        "Footage-nya keren, konteksnya masih pakai stock video. {people} jangan cuma jadi establishing shot.",
        "Kalau semua lawan dijadikan villain kartun, penonton ketawa tapi pulangnya tetap nggak tahu {doc} di mana.",
        "Cut-nya cepat. Verifikasinya ketinggalan di ruang editing.",
        "Judulnya nendang. Cuma bagian yang menjawab {topic} kayaknya kepotong pas export.",
      ],
    },
    "voice-data": {
      good: [
        "Oke, {action} bisa dicek. Samain periode, buka baseline, baru kita ribut dengan tertib.",
        "Nah gini. {doc} dibuka, batas datanya disebut, dan grafiknya nggak dipotong pas garis mulai turun.",
        "Masuk. Untuk {topic}, angka ini punya tanggal, sumber, dan pembanding—tiga barang langka di timeline.",
        "Sip. Klaimnya sekarang punya kaki, bukan cuma punya font tebal.",
        "Ini fair. Kalau salah bisa dikoreksi; kalau benar nggak perlu diselamatkan pakai musik heroik.",
        "Oke. Data buat {people} akhirnya dipakai buat menjelaskan, bukan buat dekorasi backdrop.",
      ],
      bad: [
        "Angkanya ada, tapi {action} memilih pembanding yang bikin mood rapat tetap cerah.",
        "Grafiknya tinggi. Jawaban soal {topic} masih pendek.",
        "Baseline-nya pindah-pindah kayak kursi rapat. {doc} mana yang harus dipercaya?",
        "Kalau denominator disembunyikan, persentase bisa kelihatan gagah padahal sendirian.",
        "Ini bukan data bohong. Ini data yang diajak cosplay jadi kesimpulan.",
        "{action} bikin angka terlihat sibuk. Masalah {people} tetap belum punya alamat.",
      ],
    },
    "voice-command": {
      good: [
        "Baik. {action} gue catat. Kali ini pertanyaan {topic} nggak disuruh push-up dulu.",
        "Oke, substansi masuk. Bendera tetap berkibar, {doc} juga akhirnya dibuka.",
        "Diterima. Nggak semua kritik perlu dituduh antek; kadang memang ada tabel yang salah.",
        "Bagus. Jawab lurus, jangan bikin warga lari keliling lapangan sebelum dapat konteks.",
        "Masuk laporan. Kalau bukti kuat, mic nggak perlu diteriaki.",
      ],
      bad: [
        "Noted. Timeline boleh ribut, rundown tetap jalan, pertanyaan {topic} tunggu aba-aba.",
        "{action} semangat sekali. Jawabannya belum hadir, tapi volume sudah hormat senjata.",
        "Kalau semua yang nanya disebut antek, nanti petugas sensus ikut dicurigai.",
        "Merah putih aman. {doc} masih belum turun dari kendaraan dinas.",
        "Perintahnya jelas: bikin ramai dulu, klarifikasi lihat situasi.",
      ],
    },
    "voice-preacher": {
      good: [
        "Beda boleh. {action} setidaknya ngajak orang baca {doc}, bukan cuma menghafal musuh.",
        "Nah, ini baru diskusi. {topic} dijelasin tanpa mengubah komentar jadi tes keimanan nasional.",
        "Masuk. Algoritma boleh jadi pengeras suara, jangan jadi satu-satunya guru.",
        "Sip. Ada konteks, ada batas klaim, ada ruang bilang ‘gue belum tahu’. Itu juga ilmu.",
        "Oke. {people} diajak mikir, bukan cuma diajak marah berjamaah.",
      ],
      bad: [
        "Klip pendeknya rame. Konteks panjangnya masih nyari jamaah.",
        "{action} bikin semua orang merasa paling tercerahkan, padahal {doc} belum dibaca.",
        "Kalau kesimpulan datang sebelum sumber, itu bukan kajian. Itu trailer keyakinan.",
        "Masalah {topic} rumit. Jawabannya jangan dibuat sesederhana tombol subscribe.",
        "Nasihatnya panjang, bukti primernya masih izin ke toilet.",
      ],
    },
    "voice-podcast": {
      good: [
        "Oke, fair. {action} bedah insentifnya tanpa sok bisa baca isi kepala semua orang.",
        "Ini bisa dibahas. Ada {doc}, ada pihak yang untung, ada yang nanggung risiko.",
        "Sip. Hot take-nya punya unit economics argumen yang nggak langsung boncos.",
        "Nah. {topic} dibongkar pelan-pelan, bukan dipaksa muat di thumbnail satu kata.",
        "Masuk. Peta besarnya kelihatan, tapi warga di bawah panahnya nggak dihapus.",
        "Oke. {action} bikin orang pengen debat, tapi minimal debatnya bawa bahan.",
      ],
      bad: [
        "Hot take-nya cuan. Unit economics argumennya masih boncos.",
        "{action} cocok buat thumbnail. Buat jawab {topic}, runway-nya tinggal dua menit.",
        "Peta besarnya penuh panah. {people} di bawahnya jadi titik kecil tanpa suara.",
        "Kalau semua dikaitkan ke elite global, tukang fotokopi depan kantor ikut masuk bagan.",
        "Podcast-nya dua jam. Bagian yang menjawab {doc} cuma suara kursi digeser.",
        "Insight-nya premium. Verifikasinya masih versi free trial.",
      ],
    },
    "voice-press": {
      good: [
        "Oke, versi resminya kali ini nggak ngumpet di paragraf tujuh. {action} jawab {topic} cukup lurus.",
        "Masuk. Ada dokumen, tenggat, dan siapa yang harus bertanggung jawab. Admin bisa pulang sebelum subuh.",
        "Sip. {people} dapat jawaban, bukan cuma kalimat ‘akan dikoordinasikan’ dengan logo HD.",
        "Nah gini. Kalau salah bilang salah, kalau belum tahu bilang belum tahu. Nggak perlu director's cut.",
        "Oke. {doc} dibuka dan pertanyaan lanjutan nggak dimute.",
      ],
      bad: [
        "{action} rame sih. Pertanyaan {topic} masih duduk di ruang tunggu sambil pegang nomor antrean.",
        "Klarifikasinya menjelaskan klarifikasi yang menjelaskan salah paham pertama. {doc} belum ikut rapat.",
        "Versi resminya panjang. Jawaban konkretnya cuma ‘nanti’ pakai font 18.",
        "Admin sudah upload tiga slide. {people} masih nunggu satu kalimat yang bisa dipakai hidup.",
        "Kalimatnya aman. Maknanya pakai helm dan kabur lewat pintu belakang.",
      ],
    },
    "voice-genz": {
      good: [
        "Oke ini actually nyambung. {action} kasih konteks tanpa bikin otak gue buffering.",
        "Rare timeline W: {doc} di-spill, sumbernya hidup, dan {topic} nggak ditinggal on read.",
        "Slay boleh, footnote juga ada. Balance yang jarang.",
        "Nah bestie, ini baru konten vertikal yang nggak motong akal sehat jadi 9:16.",
      ],
      bad: [
        "{action} slay di desain, flop di konteks. {topic} literally ditinggal seen.",
        "POV: admin punya transisi video, tapi nggak punya jawaban.",
        "Bestie ini lore-nya makin panjang karena tiap slide menghindari {doc}.",
        "Engagement naik, comprehension keluar grup.",
      ],
    },
    "voice-bot": {
      good: [
        "Respons Anda terdeteksi 72% substantif dan 28% membahayakan KPI propaganda.",
        "Sumber primer ditemukan. Sistem bingung karena biasanya cuma disuruh memperbanyak slogan.",
        "Konteks valid. Mohon tunggu sementara bot lain belajar mengeja transparansi.",
      ],
      bad: [
        "Respons Anda dinyatakan sangat organik oleh model yang nggak boleh diaudit.",
        "Pertanyaan {topic} gagal diproses. Sistem otomatis mengalihkan ke kubu sebelah.",
        "Klarifikasi berhasil dibuat. Kebenaran tidak termasuk dalam paket berlangganan ini.",
      ],
    },
    "voice-citizen": {
      good: [
        "Oke, {action} minimal jawab {topic} tanpa bikin warga ikut kursus jargon tiga semester.",
        "Nah, ini kebaca manusia. {doc} ada dan {people} nggak cuma disebut pas butuh foto.",
        "Sip. Nggak harus sepakat, yang penting pertanyaannya nggak diculik ke isu lain.",
        "Masuk akal. Punchline ada, jawaban juga hadir. Tumben lengkap.",
      ],
      bad: [
        "{action} lucu sih. Pertanyaan {topic} masih ditinggal di parkiran.",
        "Rame iya. Nyambung sama {doc}? beda server.",
        "Gue cuma pengen tahu siapa untung dan siapa disuruh sabar. Kok jawabannya malah poster.",
        "Ini respons apa side quest? Isu utamanya belum disentuh.",
      ],
    },
  };
  const npcActionHooks = {
    meme:{good:["Memenya nganter orang ke sumber, bukan nyuruh sumber jadi korban meme.","Recehnya pas. Habis ketawa orang masih tahu harus baca apa."],bad:["Punchline menang, konteks kalah WO.","Memenya sampai duluan; faktanya masih cari parkir."]},
    data:{good:["Baseline, periode, sama sumbernya kelihatan. Grafik nggak perlu bodyguard.","Datanya punya pembanding, bukan cuma punya warna partai."],bad:["Angka dipakai seperti garnish: cantik, tapi nggak bikin argumen bergizi.","Grafiknya disuruh senyum meski sumbunya lagi nangis."]},
    context:{good:["Potongan viral akhirnya ketemu video sebelum dan sesudahnya.","Kronologinya utuh; admin potong video kehilangan mata pencaharian."],bad:["Konteksnya dipanjangin sampai inti masalah tersesat.","Versi penuh dibuka, tapi menit yang nggak nyaman tetap dilompati."]},
    film:{good:["Footage, sumber, dan ruang koreksinya ikut tayang.","Dokumenternya punya metodologi, bukan cuma punya color grading."],bad:["Sinematiknya 4K, verifikasinya 144p.","B-roll banyak, jawaban konkret jadi cameo."]},
    attack:{good:["Kritiknya nyentuh kuasa dan keputusan, bukan bentuk alis orang.","Serang kebijakannya, bukan bikin akun gosip berseragam aktivisme."],bad:["Personal attack-nya lari paling depan, relevansinya ketinggalan sandal.","Masalah kebijakan diubah jadi audisi roasting."]},
    patriot:{good:["Nasionalisme dipakai buat nuntut hasil, bukan mematikan pertanyaan.","Bendera tetap tegak, data juga nggak disuruh tiarap."],bad:["Merah putih dijadikan tombol mute buat warga yang nanya.","Kritik disebut antek sampai petugas audit ikut dituduh impor."]},
    whatabout:{good:["Perbandingannya relevan dan standar ukurnya sama.","Kubu lain dibahas tanpa membebaskan kubu sendiri dari jawaban."],bad:["Pertanyaan sekarang dilempar ke 2014 dan belum beli tiket pulang.","Kubu sebelah dipanggil jadi pengacara gratis."]},
    transparency:{good:["Kontrak, biaya, dan koreksinya dibuka sebelum isu pindah.","Transparansi kali ini berlaku juga buat teman sendiri. Aneh tapi menyegarkan."],bad:["Yang dibuka cuma pintu konferensi pers. Datanya tetap di lemari.","Transparansinya punya jam kerja: aktif kalau yang diperiksa lawan."]},
    podcast:{good:["Timestamp pentingnya jelas; dua jam ngobrol nggak jadi kabut.","Host nanya balik, narasumber nggak cuma dikasih sofa empuk."],bad:["Podcast panjang dipakai buat mengencerkan satu jawaban.","Mikrofonnya mahal, follow-up question-nya paket hemat."]},
    endorse:{good:["Disclosure-nya kelihatan; penonton tahu ini dukungan, iklan, atau dua-duanya.","Influencer-nya bilang siapa yang bayar. Republik selamat satu caption."],bad:["Paid partnership-nya hilang, senyumnya tetap sponsor-ready.","Testimoninya organik banget sampai copywriting tiga akun sama persis."]},
    concert:{good:["Panggungnya dipakai buat ngajak orang baca tuntutan.","Musiknya keras, kontrak dan biaya tetap terdengar."],bad:["Sound system menjawab semua kecuali pertanyaan kebijakan.","Konsernya meriah; akuntabilitas pulang sebelum encore."]},
    empathy:{good:["Warga terdampak pegang mikrofon, bukan cuma dipajang di thumbnail.","Izin, perlindungan, dan tindak lanjutnya ikut dipikirin."],bad:["Cerita korban diperas sampai tinggal engagement.","Air mata jadi B-roll; perlindungan narasumber lupa dibudgetkan."]},
    network:{good:["Ada PIC, logistik, keamanan, dan kerja setelah trending turun.","Gerakannya punya kaki di lapangan, bukan cuma admin di cloud."],bad:["Grup koordinasinya 14, yang datang rapat 4, yang pegang tugas nggak ada.","Koalisi penuh logo, tindak lanjut full buffering."]},
    law:{good:["Amar, pertimbangan, dan akibat hukumnya dibaca satu paket.","Pasalnya diterjemahin tanpa dipakai cosplay paling benar."],bad:["Hukum dijadikan carousel: pasal nyaman di-slide satu, dissent hilang di draft.","Istilah legal dipakai buat nakut-nakutin orang yang belum sarapan."]},
  };
  function fillNpcTemplate(template, vars) {
    return String(template).replace(/\{(action|topic|doc|people)\}/g, (_, k) => vars[k] || "");
  }
  function pickFreshNpcReply(lines, key) {
    state.npcReplyMemory = state.npcReplyMemory || [];
    const candidates = shuffle(lines || []);
    let picked = candidates.find((line) => !state.npcReplyMemory.includes(key + "|" + line));
    if (!picked) picked = candidates[0] || "Oke, gue catat.";
    state.npcReplyMemory.unshift(key + "|" + picked);
    state.npcReplyMemory = state.npcReplyMemory.slice(0, 64);
    return picked;
  }

  const npcStanceReplyPools = {
    regime: {
      support: [
        "{action} kami terima. Ini membantu menjelaskan {topic}; {doc} juga harus dibuka biar kerja pemerintah nggak cuma menang di caption.",
        "Baik, {action} sejalan dengan penjelasan kami soal {topic}. Detail {doc} jangan berhenti di podium—publik perlu bisa memeriksanya.",
        "{action} masuk. Pemerintah nggak rugi karena jawabannya lebih terang; {people} justru perlu tahu apa yang sudah dan belum beres.",
      ],
      defend: [
        "{action} dipakai supaya kerja pemerintah soal {topic} nggak tenggelam oleh potongan viral. Jangan semua strategi komunikasi disebut manipulasi; {doc} tetap kami proses.",
        "Kami berdiri di belakang {action}. Narasi harus tegas saat isu {topic} dipelintir, meski detail {doc} tetap wajib dijelaskan oleh pihak terkait.",
        "{action} itu cara kami menjaga fokus publik pada agenda untuk {people}. Kritik silakan, tapi jangan pura-pura komunikasi politik hidup di ruang hampa.",
      ],
      resist: [
        "{action} kami catat, tapi jangan jadikan satu unggahan soal {topic} sebagai vonis seluruh program. Cocokkan klaimnya dengan {doc}, bukan cuma dengan kemarahan timeline.",
        "Silakan pakai {action}, tapi konteks pemerintah soal {topic} jangan dipotong. {people} butuh perbaikan program, bukan kesimpulan yang sudah ditulis sebelum verifikasi.",
        "{action} boleh jadi masukan. Pemerintah tetap akan menguji isinya terhadap {doc}; volume kritik bukan pengganti ketepatan data.",
      ],
      condemn: [
        "{action} bukan koreksi kalau berubah jadi serangan yang nggak menjawab {topic}. Bawa {doc}; jangan cuma bawa amarah dan target personal.",
        "Kami menolak {action} kalau caranya mengorbankan orang demi engagement. Debatkan {topic}, bukan bikin kebencian baru untuk {people}.",
        "{action} melewati batas. Kritik kebijakan boleh keras, tapi fitnah dan serangan pribadi tetap nggak otomatis jadi bukti.",
      ],
    },
    critic: {
      support: [
        "Nah, {action} nyambung sama {topic}. Sekarang jangan berhenti di format: tempel {doc}, jelaskan batas klaim, dan kasih ruang koreksi.",
        "Gue dukung {action} karena {people} akhirnya nggak cuma jadi latar foto. Bukti soal {topic} tetap harus bisa dicek orang yang nggak satu kubu.",
        "{action} arahnya benar. Biar kritiknya tahan bantah, {doc}, kronologi, dan siapa yang bertanggung jawab harus tetap kelihatan.",
      ],
      correct: [
        "Gue kritik rezim, tapi {action} tetap ngawur kalau nggak menjawab {topic}. Jangan tiru mesin propaganda yang lagi kita lawan.",
        "{action} mungkin viral, tapi {people} nggak butuh gerakan yang menukar bukti dengan serangan personal. Balik ke {doc}.",
        "Nggak. {action} bikin kritik kehilangan pijakan. Soal {topic}, kita harus lebih disiplin daripada akun yang sedang kita bongkar.",
      ],
      cautious: [
        "Kalau {action} benar-benar membuka {doc}, bagus. Gue cek dulu apakah bagian yang bikin pemerintah nggak nyaman ikut dibuka.",
        "{action} patut diapresiasi sejauh menjawab {topic}. Transparansi bukan satu unggahan; koreksi dan data mentahnya juga harus hidup.",
        "Oke, {action} bisa jadi langkah benar. Tapi {people} perlu bukti bahwa ini perubahan cara kerja, bukan jeda iklan sebelum narasi lama balik.",
      ],
      oppose: [
        "{action} kelihatan seperti upaya mengaburkan {topic}. Yang kami tanya {doc}; yang datang malah teknik buat mengelola emosi publik.",
        "Gue menolak {action}. Kalau strategi ini kuat, harusnya bisa menjawab dampaknya ke {people} tanpa lari ke slogan atau aib orang.",
        "{action} justru membuktikan masalahnya: energi habis untuk mengatur persepsi, sementara jawaban soal {topic} masih disuruh menunggu.",
      ],
    },
    institutional: {
      verify: [
        "{action} relevan untuk menilai {topic}, tapi kesimpulannya baru sah setelah metode, periode, dan {doc} bisa diuji ulang.",
        "Kami catat {action} sebagai respons substantif. Berikutnya, buka indikator serta mekanisme koreksi agar {people} nggak diminta percaya begitu saja.",
        "{action} menjawab sebagian pertanyaan. Statusnya tetap perlu diverifikasi terhadap {doc}, bukan ditetapkan oleh jumlah repost.",
      ],
      correct: [
        "{action} belum memenuhi standar pembuktian untuk {topic}. Klaim, sumber, dan kesimpulan bercampur; silakan kembali dengan {doc} yang utuh.",
        "Kami nggak menilai kubunya. Kami menilai {action}: metodenya belum cukup untuk menyimpulkan dampak ke {people}.",
        "{action} menghasilkan perhatian, bukan verifikasi. Soal {topic}, prosedur dan datanya masih bolong.",
      ],
    },
    archive: {
      archiveGood: [
        "[CACHE] {action} tersimpan bersama {doc}. Bagus—kalau narasi soal {topic} berubah besok, versi hari ini masih punya tanggal.",
        "[ARSIP MASUK] {action}, sumber, dan koreksinya kami simpan. {people} nggak boleh dipaksa mengandalkan ingatan algoritma.",
        "{action} masuk cache. Identitas boleh diperdebatkan; jejak klaim tentang {topic} tetap harus bisa dibandingkan.",
      ],
      archiveBad: [
        "[CACHE] {action} ikut tersimpan. Pengalihan soal {topic} tetap pengalihan meski unggahannya nanti dihapus.",
        "[ARSIP MASUK] {action} ramai, {doc} tetap nggak muncul. Screenshot mencatat dua-duanya.",
        "{action} boleh mencoba mengubur isu. Cache tetap menyimpan pertanyaan {people} yang belum dijawab.",
      ],
    },
  };

  const npcDefensiveActionHooks = {
    meme:["Bahasa ringan dibutuhkan supaya pesan sampai; jangan setiap meme diperlakukan seperti pengakuan salah.","Humor kami pakai untuk distribusi, bukan sebagai dokumen kebijakan."],
    patriot:["Simbol kebangsaan dipakai untuk menyatukan dukungan, bukan menurut kami untuk melarang pertanyaan.","Negara perlu bahasa bersama saat percakapan sengaja dibuat pecah."],
    data:["Kami memilih angka yang paling relevan dengan capaian; pembanding lain akan dijelaskan pada forum teknis.","Data resmi tetap data resmi meski pengkritik ingin grafik yang lebih muram."],
    whatabout:["Rekam jejak pemerintah lama relevan karena standar nggak boleh berubah hanya saat lawan berkuasa.","Perbandingan sejarah diperlukan supaya kritik hari ini nggak pura-pura lahir tanpa konteks."],
    endorse:["Figur publik berhak menyampaikan dukungan; publik juga berhak menilai hubungan dan kepentingannya.","Jangkauan besar dipakai untuk menjelaskan program, bukan otomatis berarti pengikutnya kehilangan nalar."],
    podcast:["Format panjang memberi ruang konteks; bukan semua jawaban harus dipaksa muat dalam klip 20 detik.","Dua jam pembicaraan tetap lebih utuh daripada potongan yang sengaja mencari kemarahan."],
    attack:["Rekam jejak pengkritik kami anggap relevan untuk menguji konsistensi, bukan alasan meninggalkan substansi.","Yang menyerang kredibilitas pemerintah juga harus siap kredibilitasnya diperiksa."],
    concert:["Panggung besar dipakai agar program dikenal luas; evaluasi teknis tetap berjalan di jalurnya.","Mobilisasi publik bukan pengganti laporan, tapi laporan tanpa publik juga gampang dikubur."],
    transparency:["Kalau data dibuka, koreksi juga harus diterima; itu konsekuensi komunikasi yang dewasa.","Pengakuan masalah bukan kelemahan selama tindak lanjutnya bisa diukur."],
  };

  function npcReactionMode(i, good) {
    const stance = i.stance || "critic";
    if (stance === "institutional") return good ? "verify" : "correct";
    if (stance === "archive") return good ? "archiveGood" : "archiveBad";
    if (stance === "regime") {
      if (state.role === "buzzer") return good ? "support" : "defend";
      return good ? "resist" : "condemn";
    }
    if (state.role === "aktivis") return good ? "support" : "correct";
    return good ? "cautious" : "oppose";
  }

  function npcReaction(i, a, good, selectedDisplay = null) {
    const v = getVoiceProfile(i),
      display = selectedDisplay || actionPresentation(a, i, phaseActionUseCount(a.id)),
      stance = i.stance || "critic",
      reactionMode = npcReactionMode(i, good),
      topic = i.subject || i.title,
      doc = i.document || "dokumen utuh",
      people = i.people || "warga yang kena dampaknya",
      angle = actionCommentAngles[state.role]?.[a.id] || {good:"responsnya nyambung",bad:"responsnya muter",ask:"buktinya mana"},
      vars = {action:`“${display.name}”`,topic,doc,people},
      stancePool = npcStanceReplyPools[stance] || npcStanceReplyPools.critic,
      leadLines = stancePool[reactionMode] || npcStanceReplyPools.critic[good ? "support" : "oppose"],
      lead = pickFreshNpcReply(leadLines, `${i.key}:${v.className}:${stance}:${reactionMode}`),
      positiveModes = new Set(["support","cautious","verify","archiveGood"]),
      hookKey = positiveModes.has(reactionMode) ? "good" : "bad",
      hooks = reactionMode === "defend"
        ? npcDefensiveActionHooks[a.id] || [angle.good + "."]
        : npcActionHooks[a.id]?.[hookKey] || [(hookKey === "good" ? angle.good : angle.bad) + "."],
      hook = pickFreshNpcReply(hooks, `${i.key}:${a.id}:${reactionMode}:hook`),
      tone = positiveModes.has(reactionMode) ? (reactionMode === "cautious" || reactionMode === "verify" || reactionMode === "archiveGood" ? "neutral" : "good") : "bad",
      stanceLabels = {regime:"PEMERINTAH",critic:"PENGKRITIK",institutional:"INSTITUSI",archive:"ARSIP"},
      rawText = fillNpcTemplate(lead, vars) + " " + fillNpcTemplate(hook, vars),
      voiceReply = window.PNCharacterVoices?.renderReply?.({
        id:i.characterId||i.voiceId,
        name:i.npc,
        handle:i.handle,
        issue:i,
        phase:state.phase,
        seed:`${state.runSeed}:${state.phase}:${state.day}:${i.key}:${a.id}:${reactionMode}`,
        mode:reactionMode,
        action:`“${display.name}”`,
        base:rawText,
      }),
      text = voiceReply?.text || rawText;
    return makeComment(tone, text, {
      avatar:i.avatar,
      handle:i.handle,
      kind:"npc",
      label:`AKUN ASLI • ${stanceLabels[stance] || "PENGKRITIK"}`,
      replyTo:`“${display.name}”`,
      actionId:a.id,
      actionName:display.name,
      issueKey:i.key,
      stance,
      reactionMode,
      allowNoise:false,
    });
  }


  function updateEngagement(a, d, good, selectedDisplay = null, variantIndex = 0) {
    const p = (engagementProfiles[state.role] || {})[a.id] || {
        r: 1,
        l: 1,
        c: 1,
        v: 1,
      },
      crewMult = activeActionBuffs(a).reduce(
        (m, b) => m * (b.engagementMultiplier || 1),
        1,
      ),
      intensity = (d + state.heat + state.reach) / 3,
      viewGain = Math.round(intensity * rnd(1800, 4200) * p.v * crewMult),
      likeGain = Math.round(
        viewGain * (0.025 + 0.002 * Math.max(0, a.reach)) * p.l,
      ),
      repostGain = Math.round(
        viewGain * (0.008 + 0.001 * Math.max(0, a.reach)) * p.r,
      ),
      replyGain = Math.round(
        viewGain * (0.004 + 0.001 * Math.max(0, a.heat)) * p.c,
      );
    state.postMetrics.views += viewGain;
    state.postMetrics.likes += likeGain;
    state.postMetrics.reposts += repostGain;
    state.postMetrics.replies += replyGain;
    const tone = good ? "good" : "bad",
      i = currentIssue(),
      display = selectedDisplay || actionPresentation(a, i, variantIndex);
    const thread = [
      npcReaction(i, a, good, display),
      discussionComment("neutral", i, a, display),
      discussionComment(tone, i, a, display),
      contextualComment(tone, i, a, display),
    ];
    if (rnd(0, 100) > 48)
      thread.push(discussionComment(good ? "good" : "bad", i, a, display));
    if (Math.random() < (netizenPack.noiseSupplementChance || 0)) {
      const noise = noiseSupplementComment(i, a, display);
      if (noise) thread.push(noise);
    }
    state.comments.unshift(...thread);
    state.comments = state.comments.slice(0, 24);
    const coordinated = clamp(
        Math.round(
          (!good ? 25 : 8) +
            (a.tags.includes("network") ? 8 : 0) +
            (a.id === "meme" || a.id === "attack" ? 12 : 0) +
            (crewMult > 1.35 && !good ? 7 : 0),
        ),
        3,
        65,
      ),
      undecided = clamp(
        Math.round(35 - state.credibility / 4 + state.heat / 5),
        8,
        55,
      ),
      organic = clamp(100 - coordinated - undecided, 5, 89);
    state.lastImpact = {
      organic,
      coordinated,
      undecided,
      label:
        crewMult > 1
          ? `Crew boost aktif ×${crewMult.toFixed(1)}`
          : good
            ? "Pahamnya naik lebih pelan dari views"
            : "Views lari, trust jalan kaki",
    };
  }
  function renderEngagement() {
    const m = state.postMetrics;
    $("#reposts").textContent = compactNumber(m.reposts);
    $("#likes").textContent = compactNumber(m.likes);
    $("#replies").textContent = compactNumber(m.replies);
    $("#views").textContent = compactNumber(m.views);
    const x = state.lastImpact || {
      organic: 60,
      coordinated: 15,
      undecided: 25,
      label: "Belum ada dampak",
    };
    $("#timelineImpact").innerHTML =
      `<span class="impact-chip ${x.organic >= 55 ? "good" : ""}">ORGANIK ${x.organic}%</span><span class="impact-chip ${x.coordinated >= 30 ? "bad" : ""}">TERKOORDINASI ${x.coordinated}%</span><span class="impact-chip hot">BELUM YAKIN ${x.undecided}%</span><span class="impact-chip">${x.label}</span>`;
  }
  function metricNarrative(type) {
    const m = state.postMetrics,
      x = state.lastImpact || {};
    if (type === "reposts")
      return `Repost memperluas narasi, tetapi tidak membuktikan persetujuan. Estimasi ${x.coordinated || 0}% pola distribusi tampak terkoordinasi atau sangat seragam.`;
    if (type === "likes")
      return `Like paling mudah naik lewat emosi, identitas, dan figur populer. ${compactNumber(m.likes)} like tidak sama dengan mandat politik.`;
    if (type === "views")
      return `${compactNumber(m.views)} tayangan berarti konten lewat di layar, bukan berarti dibaca, dipercaya, atau mengubah pilihan.`;
    return `Komentar memperlihatkan konflik interpretasi. Reply tinggi dapat berarti dukungan, koreksi, kemarahan, atau sekadar perang stiker.`;
  }
  function showMetricDetails(type) {
    const m = state.postMetrics,
      good = state.comments.filter((c) => c.tone === "good").length,
      bad = state.comments.filter((c) => c.tone === "bad").length,
      neutral = state.comments.filter((c) => c.tone === "neutral").length,
      total = Math.max(1, good + bad + neutral);
    $("#modalContent").classList.remove("final-modal");
    $("#modalContent").innerHTML =
      `<h2>${type === "replies" ? "Kolom Komentar" : "Analitik " + type.toUpperCase()}</h2><p>${metricNarrative(type)}</p><div class="trend-radar"><b>📡 RADAR TREND BERIKUTNYA</b><br>${nextTrendHint()}</div><div class="sentiment-row"><div><strong>${Math.round((good / total) * 100)}%</strong>Substantif</div><div><strong>${Math.round((bad / total) * 100)}%</strong>Toksik/seragam</div><div><strong>${Math.round((neutral / total) * 100)}%</strong>Bertanya / radar</div></div><div class="comment-list">${state.comments.map((c) => `<div class="comment-item ${c.kind || ""} persona-${c.persona || "plain"}"><div class="comment-avatar">${c.avatar}</div><div class="comment-body"><b>${c.handle}</b><span class="comment-tone ${c.kind || c.tone}">${c.label || c.tone}</span>${c.replyTo ? `<span class="reply-context">↳ membalas ${c.replyTo}</span>` : "<br>"}${c.text}</div></div>`).join("")}</div><button class="btn" id="closeMetric">Tutup</button>`;
    $("#modal").classList.remove("hidden");
    $("#closeMetric").onclick = () => $("#modal").classList.add("hidden");
  }

  function followUpCharacterComment(card,good=true){
    const i=currentIssue(),topic=i.subject||i.title,doc=i.document||"dokumen utuh",people=i.people||"warga terdampak";
    const voicePools={
      "stela-krispi":[
        `Hipotesisnya sederhana: kalau “${card.title}” nggak bisa diuji lewat ${doc}, klaimnya belum lulus praktikum kebijakan.`,
        `Oke, variabelnya nyambung. ${topic} dibahas pakai indikator, bukan pakai aura futuristik dan font biru neon.`,
        `Peer review masuk. Sekarang tunjukkan apa yang bisa salah, siapa yang mengukur, dan kenapa anggarannya nggak menghilang saat eksperimen dimulai.`
      ],
      puanorama:[
        `Masuk risalah. “${card.title}” sekarang punya nomor halaman; jadi kalau jawabannya kabur, kameranya tahu harus zoom ke mana.`,
        `Palu diketok. ${topic} jangan selesai sebagai pernyataan prihatin—panggil penanggung jawab dan buka ${doc}.`,
        `Sidang boleh panas, tapi follow-up-nya harus lebih panas. Janji tanpa tenggat cuma dekorasi meja pimpinan.`
      ],
      "mega-watt":[
        `Colokan dipindah. Kalau koalisi mau bicara ${topic}, isi klausulnya dibuka dulu; teh manis bukan dokumen publik.`,
        `Garis politik boleh merah, tapi “${card.title}” tetap harus menjelaskan siapa dapat kursi dan siapa menanggung konsekuensi.`,
        `Saya setuju satu hal: sejarah jangan dipakai sebagai taplak untuk menutup transaksi hari ini.`
      ],
      "akbar-fasal":[
        `Saya follow-up sekali lagi: di “${card.title}”, siapa memutuskan, kapan, dan ${doc} ada di mana? Jangan jawab perasaan terganggu.`,
        `Bagus, topiknya nggak kabur. Sekarang pertanyaan kedua: siapa yang untung dan siapa yang disuruh sabar?`,
        `Timestamp saya catat. Kalau narasumber muter lagi, episode ini jadi bundaran HI versi dua jam.`
      ],
      "gita-wirawacana":[
        `Long game-nya masuk. Tapi ${people} tetap punya short invoice, jadi ${topic} harus nyambung ke institusi dan daya beli hari ini.`,
        `Mari naik ke horizon 2045—sebentar saja—lalu turun lagi ke ${doc}, karena peradaban juga butuh lampiran.`,
        `“${card.title}” punya horizon. Sekarang pastikan strateginya nggak cuma indah kalau dilihat dari lounge bandara.`
      ],
      "feri-latah-hitung":[
        `Kalkulator setuju. “${card.title}” menjawab ${topic}; sekarang tinggal jangan matikan layar pas total biayanya bikin suasana rapat berubah.`,
        `Gratis buat penerima, nggak gratis buat negara. Buka costing, kurs, dan siapa yang akhirnya nombok.`,
        `Nah, ini baru ekonomi: ada angka, distribusi manfaat, dan orang yang bayar. Bukan cuma kata “fundamental” diputar pakai echo.`
      ],
      "yanuar-risky":[
        `Risk register dibuka. Kalau ${topic} gagal, siapa pegang rem, siapa pegang kerugian, dan siapa mendadak bilang “di luar kendali”?`,
        `Aset besar boleh masuk thumbnail. Di thread ini, kontrol, downside, dan penanggung jawab juga kebagian frame.`,
        `“${card.title}” nyambung. Sekarang kasih batas rugi dan prosedur keluar; optimisme tanpa rem itu bukan tata kelola.`
      ],
      "hendro-satirio":[
        `Suhunya kebaca. Tapi jangan sebut “rakyat berkata” sebelum sampel, sponsor, tanggal, dan wording-nya keluar dari balik tirai.`,
        `Trending itu demam sesaat. “${card.title}” baru berguna kalau termometernya bukan polling grup admin sendiri.`,
        `Oke, ${topic} diuji. Sekarang bedakan suara timeline, suara responden, dan suara elite yang kebetulan punya podcast.`
      ],
      "renal-disrupsi":[
        `Ini baru perubahan: proses, insentif, dan orang yang kehilangan kuasa ikut dibahas. Bukan cuma logo digeser dua piksel.`,
        `Kurva S saya buka. “${card.title}” masuk di fase ketika organisasi berhenti seminar dan mulai mengubah kebiasaan.`,
        `Kalau ${topic} cuma menghasilkan struktur baru dan grup WhatsApp baru, itu bukan disrupsi. Itu renovasi administrasi.`
      ],
      "menlu-sugiyono":[
        `Posisinya jelas. Kali ini “${card.title}” juga menjelaskan tujuan, biaya, leverage, dan hasil—empat hal yang biasanya hilang setelah foto jabat tangan.`,
        `Bebas aktif bukan bebas dari tabel hasil. Hubungkan ${topic} dengan ASEAN, kepentingan domestik, dan ${doc}.`,
        `Nota masuk, caption diturunkan. Diplomasi dinilai setelah karpet merah digulung, bukan saat pesawat baru mendarat.`
      ],
      "dipo-peta":[
        `Strategic payoff-nya kelihatan. “${card.title}” menjawab bukan cuma kita hadir di mana, tapi pulang bawa apa.`,
        `Peta dunia dibuka. Sekarang tandai leverage, biaya peluang, dan dampaknya ke ${people}; jangan cuma rute pesawat.`,
        `ASEAN, BRICS, dan mitra besar boleh masuk satu meja. Yang nggak boleh hilang: prioritas Indonesia dan ukurannya.`
      ]
    };
    const generic=[
      `Nah, ini baru nyambung sama ${topic}. “${card.title}” nggak cuma numpang nama tokoh; ${doc} beneran dibuka.`,
      `Combo masuk. Isunya ${topic}, action-nya “${card.title}”. Akhirnya narasumber dan topik ketemu di studio yang benar, bukan nyasar ke link Zoom rapat RT.`,
      `Gue tanda tangan digital untuk “${card.title}”. Kalau hasilnya tetap ngawur, minimal jejak salahnya punya metadata.`,
      `Ini baru context combo: “${card.title}”. ${people} nggak dijadikan figuran, dan dokumen nggak disimpan di slide cadangan.`
    ];
    const lines=voicePools[card.characterId]||generic;
    const rawLine=pickFreshNpcReply(lines,`follow:${card.characterId}:${i.key}:${card.actionId}`);
    const voiceLine=window.PNCharacterVoices?.renderReply?.({
      id:card.characterId,
      name:card.characterName,
      issue:i,
      phase:state.phase,
      seed:`${state.runSeed}:${state.phase}:${state.day}:follow:${card.characterId}:${i.key}:${card.actionId}`,
      mode:"follow-up",
      action:`“${card.title}”`,
      base:rawLine,
    });
    return makeComment(good?"good":"bad",voiceLine?.text||rawLine,{
      avatar:card.characterIcon,
      handle:`@${card.characterId.replace(/[^a-z0-9]+/gi,"").toLowerCase()}`,
      kind:"npc",
      label:"CONTEXT COMBO",
      replyTo:`“${card.title}”`,
      actionId:card.actionId,
      actionName:card.title,
      issueKey:i.key,
      allowNoise:false,
    });
  }
  function contextComboCrowdComment(card){
    const i=currentIssue(),topic=i.subject||i.title,doc=i.document||"dokumen utuh";
    const pools=[
      {avatar:"🧢",handle:"@anakbasecapek",label:"GEN Z BASE",text:`ngl ${card.characterName} kepilih pas banget buat ${topic}. follow-up “${card.title}” actually slay karena ${doc} dibuka, bukan cuma aura narasumber 😭`},
      {avatar:"👨",handle:"@pakRT_online",label:"BAPAK FACEBOOK",text:`Nah begini. Narasumbernya sesuai topik, pertanyaannya sesuai masalah. Ibarat servis motor, jangan bawa ahli genteng. Salam sehat.`},
      {avatar:"📎",handle:"@anakpdf",label:"ANAK PDF",text:`Combo valid. Tolong pin ${doc}, timestamp, dan versi koreksinya. Saya nggak mau berburu lampiran sampai Lebaran berikutnya.`},
      {avatar:"👩",handle:"@bundanya_alif",label:"EMAK GRUP WA",text:`Akhirnya yang dipanggil ngerti ${topic}. Jangan habis ini dipotong jadi video 12 detik terus konteksnya ditinggal di studio ya.`},
      {avatar:"☕",handle:"@frameworkbro",label:"MILENIAL SOTOY",text:`Secara stakeholder fit, ${card.characterName} dan “${card.title}” aligned. Mohon jangan tanya saya framework-nya, deck saya masih loading.`},
      {avatar:"🛵",handle:"@orderanseret",label:"ABANG OJOL",text:`Ini baru rute benar: isu ${topic}, tokohnya nyambung, action-nya nggak muter tiga kecamatan. Bintang lima kalau hasilnya juga nyampe.`}
    ];
    const x=pools[rnd(0,pools.length-1)];
    return makeComment("good",x.text,{
      avatar:x.avatar,
      handle:x.handle,
      kind:"persona",
      label:x.label,
      replyTo:`“${card.title}”`,
      actionId:card.actionId,
      actionName:card.title,
      issueKey:i.key,
      allowNoise:false,
    });
  }

  function playFollowUpAction(cardId){
    const card=(state.followUpCards||[]).find(c=>c.id===cardId&&!c.used&&c.phase===state.phase&&c.day===state.day),i=currentIssue();
    if(!card||state.resolve<=0)return;
    const a=actionDefs[state.role].find(x=>x.id===card.actionId);if(!a)return;
    const cost=Math.max(1000000,Math.round(actionCost(a,i)*card.costMultiplier/1000000)*1000000);
    if(state.money<cost){showBankruptcyCrisis(`CONTEXT COMBO ${card.title.toUpperCase()} MELEBIHI KAS`);return;}
    const d=Math.max(18,effectiveDamage(a,i)+16);
    state.money-=cost;state.resolve=clamp(state.resolve-d);state.reach=clamp(state.reach+a.reach+4);state.credibility=clamp(state.credibility+a.cred+4);state.integrity=clamp(state.integrity+a.int+2);state.stress=clamp(state.stress+Math.max(-5,a.stress-2));state.democracy=clamp(state.democracy+a.dem+2);state.heat=clamp(state.heat+a.heat);state.network=clamp(state.network+(a.tags.includes("network")?6:2));
    applyEffects(card.reward||{});state.actions++;state.career+=Math.max(4,Math.round(d/6));state.lastAction=card.actionId;card.used=true;
    state.history.push({phase:state.phase,day:state.day,action:`followup:${card.actionId}`,variant:0,label:card.title,character:card.characterName});
    const good=a.int>=0&&a.dem>=0,display={name:card.title,desc:card.desc,context:`Context combo ${card.characterName}`};
    updateEngagement(a,d,good,display,0);state.comments.unshift(contextComboCrowdComment(card));state.comments.unshift(followUpCharacterComment(card,good));state.comments=state.comments.slice(0,24);
    addLog(`CONTEXT COMBO: ${card.characterName} → ${card.title}. Narasi lawan turun ${d}; extra reward masuk.`,"good");
    flash(`🎯 ${card.title.toUpperCase()}`);beep(760,.1);renderCards();render();saveGame(true);
  }

  function playAction(id, variantIndex = 0) {
    const a = actionDefs[state.role].find((x) => x.id === id),
      i = currentIssue();
    if (!a || state.resolve <= 0) return;
    state.phaseActionVariants = state.phaseActionVariants || {};
    const currentVariant = phaseActionUseCount(id);
    if (variantIndex !== currentVariant || currentVariant >= maxActionVariants(a)) {
      renderCards();
      return;
    }
    const cost = actionCost(a, i),
      display = actionPresentation(a, i, currentVariant),
      buffs = activeActionBuffs(a);
    if (state.money < cost) {
      showBankruptcyCrisis(`BIAYA ${display.name.toUpperCase()} MELEBIHI KAS`);
      return;
    }
    const d = effectiveDamage(a, i),
      protectedNegatives = buffs.some((b) => b.protectNegatives);
    state.money -= cost;
    state.resolve = clamp(state.resolve - d);
    state.reach = clamp(state.reach + a.reach);
    state.credibility = clamp(
      state.credibility +
        (protectedNegatives ? Math.max(0, a.cred) : a.cred),
    );
    state.integrity = clamp(
      state.integrity + (protectedNegatives ? Math.max(0, a.int) : a.int),
    );
    state.stress = clamp(state.stress + a.stress);
    state.democracy = clamp(
      state.democracy + (protectedNegatives ? Math.max(0, a.dem) : a.dem),
    );
    state.heat = clamp(state.heat + a.heat);
    state.network = clamp(
      state.network + (a.tags.includes("network") ? 5 : 0),
    );
    state.actions++;
    state.career += Math.max(1, Math.round(d / 8));
    state.lastAction = id;
    state.lastActionVariant = currentVariant;
    state.phaseActionVariants[phaseActionKey(id)] = currentVariant + 1;
    state.history.push({
      phase: state.phase,
      day: state.day,
      action: id,
      variant: currentVariant,
      label: display.name,
    });
    const good = a.int >= 0 && a.dem >= 0;
    updateEngagement(a, d, good, display, currentVariant);
    const consumed = consumeActionBuffs(a);
    addLog(
      `${display.name}: narasi lawan turun ${d}. ${good ? "Publik dapet konteks lebih banyak." : "Engagement naik; ruang publik ngirim voice note panjang."}`,
      good ? "good" : "bad",
    );
    if (phaseActionUseCount(id) < maxActionVariants(a))
      addLog(
        `Action ini udah dicatat sebagai terpakai di fase ${state.phase + 1}. Slotnya langsung diganti varian unik berikutnya (${phaseActionUseCount(id) + 1}/${maxActionVariants(a)}).`,
        "info",
      );
    else
      addLog(
        "Semua 60 varian keluarga action ini udah habis untuk fase sekarang. Timeline menolak copy-paste sampai roster tahun berikutnya masuk.",
        "info",
      );
    if (consumed.length)
      addLog(
        `Crew combo kepakai: ${consumed.map((b) => `${b.sourceName} — ${b.abilityName}`).join(" + ")}. Buff habis, admin balik ngopi.`,
        "good",
      );
    if (protectedNegatives)
      addLog(
        "Crew menahan penalti moral dari action ini. Sekali ini aja—etika nggak punya subscription unlimited.",
        "info",
      );
    if (i.weak.includes(id))
      addLog(
        "Respons ini pas kena titik lemahnya. Ternyata baca isu dulu ada gunanya.",
        "good",
      );
    if (i.resist.includes(id))
      addLog(
        "Lawan udah kebal teknik ini. Kayaknya mereka ikut pelatihan yang sama.",
        "bad",
      );
    if (state.resolve <= 0) {
      state.reach = clamp(state.reach + 6);
      state.credibility = clamp(
        state.credibility + (state.integrity > 55 ? 3 : -2),
      );
      flash("NARASI BULAN INI DIKUASAI");
      addLog(
        "Percakapan kamu kuasai. Belum tentu orang jadi lebih ngerti, tapi dashboard senyum.",
        "info",
      );
    }
    $("#gameScreen").classList.remove("glitch");
    void $("#gameScreen").offsetWidth;
    $("#gameScreen").classList.add("glitch");
    beep(good ? 590 : 180, 0.06);
    renderCards();
    render();
  }
  function addLog(t, k = "info") {
    const d = document.createElement("div");
    d.className = `log-entry ${k}`;
    d.textContent = t;
    $("#battleLog").prepend(d);
  }

  function render() {
    syncGameModeControls();
    updateBreakingTicker(false);
    const p = currentPhase();
    $("#phaseLabel").textContent =
      `FASE ${state.phase + 1}/6 • ${p.name}`;
    $("#day").textContent = state.day;
    $("#calendarLabel").textContent = currentIssue().month;
    $("#rank").textContent = state.role === "buzzer" ? p.bRank : p.aRank;
    $("#moneyLabel").textContent =
      state.role === "buzzer"
        ? "DANA OPERASI / INVOICE"
        : "KAS GERAKAN / DONASI";
    $("#money").textContent = formatMoney(state.money);
    const debtPanel = $("#debtPanel");
    if (debtPanel) {
      const hasDebt = (state.debt || 0) > 0;
      debtPanel.classList.toggle("hidden", !hasDebt);
      $("#debtAmount").textContent = formatMoney(state.debt || 0);
      $("#debtRate").textContent = `${((state.loanRate || financeRules().rate) * 100).toFixed(1)}%`;
    }
    $("#eventCount").textContent =
      `SPECIAL EVENT ${state.seenEvents.length} • ${(state.narrativeRipples || []).length} AKIBAT MENUNGGU`;
    $("#specialtyLabel").textContent =
      state.specialties.at(-1) || "GENERALIS";
    const st = [
      ["Jangkauan", state.reach, "yellow"],
      ["Kredibilitas", state.credibility, "blue"],
      ["Integritas", state.integrity, "green"],
      ["Jaringan", state.network, "purple"],
      ["Stres", state.stress, "red"],
      ["Demokrasi", state.democracy, "green"],
    ];
    $("#stats").innerHTML = st
      .map(
        (s) =>
          `<div class="stat"><div class="stat-row"><span>${s[0]}</span><b>${Math.round(s[1])}</b></div><div class="bar ${s[2]}"><i style="width:${clamp(s[1])}%"></i></div></div>`,
      )
      .join("");
    $("#resolveBar").style.width = `${state.resolve}%`;
    $("#heatBar").style.width = `${state.heat}%`;
    $("#teamMood").textContent =
      state.stress > 84
        ? "🔥"
        : state.stress > 65
          ? "😵"
          : state.integrity < 35
            ? "🫥"
            : state.democracy > 68
              ? "🫡"
              : "😐";
    renderTeamPanel();
    $("#phaseMap").innerHTML = phases
      .map(
        (_, idx) =>
          `<span class="phase-node ${idx < state.phase ? "done" : idx === state.phase ? "current" : ""}"></span>`,
      )
      .join("");
    $("#endDayBtn").textContent =
      state.day === 12
        ? state.phase === 5
          ? "Lihat Warisan"
          : "Tutup Fase"
        : "Akhiri Bulan";
    renderEngagement();
    if (state.role && !restoring) saveGame(true);
  }
  function criticalReasons() {
    const reasons = [];
    if (state.stress >= 100) reasons.push("BURNOUT");
    if (state.credibility <= 0) reasons.push("KREDIBILITAS RUNTUH");
    return reasons;
  }
  function proceedAfterMonth() {
    if (state.day === 12) {
      if (state.phase === 5) {
        showEnding(false);
      } else showPromotion();
    } else if (state.quizEnabled) showQuiz();
    else continueAfterDay();
  }
  function serviceDebt() {
    if (!(state.debt > 0)) return;
    const rate = state.loanRate || financeRules().rate;
    const interest = Math.round(state.debt * rate);
    const principal = Math.round(state.debt * 0.025);
    const due = interest + principal;
    const paid = Math.min(Math.max(0, state.money), due);
    state.money -= paid;
    const paidInterest = Math.min(paid, interest);
    const paidPrincipal = Math.max(0, paid - paidInterest);
    state.debt = Math.max(0, state.debt + (interest - paidInterest) - paidPrincipal);
    if (paid < due) state.missedPayments = (state.missedPayments || 0) + 1;
    else state.missedPayments = Math.max(0, (state.missedPayments || 0) - 1);
    addLog(`Cicilan politik jatuh tempo ${formatMoney(due)}. Terbayar ${formatMoney(paid)}; sisanya ikut tumbuh dewasa.`, paid < due ? "bad" : "info");
  }
  function showDebtManagement() {
    if (!(state.debt > 0)) return;
    const rules = financeRules();
    const maxPay = Math.min(state.debt, Math.max(0, state.money));
    $("#modalContent").innerHTML = `<h2>💳 Meja Cicilan Narasi</h2><div class="career-line"><b>Utang ${formatMoney(state.debt)}</b><p>Bunga ${(state.loanRate * 100).toFixed(1)}% per bulan. Batas kredit ${formatMoney(rules.limit)}. Telat bayar: ${state.missedPayments || 0} bulan.</p></div><div class="loan-warning">Utang tidak membuat argumen lebih benar. Ia cuma membuat bulan berikutnya lebih mahal.</div><div class="choice-grid"><button class="choice-card" data-pay="0.25"><h3>Bayar 25% Kas</h3><small>Maksimal ${formatMoney(Math.min(maxPay, state.money * .25))}</small></button><button class="choice-card" data-pay="0.6"><h3>Bayar 60% Kas</h3><small>Maksimal ${formatMoney(Math.min(maxPay, state.money * .6))}</small></button></div><button class="btn secondary" id="closeDebt">Tutup</button>`;
    $("#modal").classList.remove("hidden");
    document.querySelectorAll("[data-pay]").forEach((b) => b.onclick = () => {
      const fraction = Number(b.dataset.pay);
      const amount = Math.min(state.debt, Math.max(0, Math.round(state.money * fraction)));
      if (amount <= 0) return flash("KASNYA JUGA IKUT KOSONG");
      state.money -= amount;
      state.debt -= amount;
      addLog(`Bayar pokok utang ${formatMoney(amount)}. Timeline tidak tepuk tangan, tapi bunga sedikit kecewa.`, "good");
      $("#modal").classList.add("hidden");
      render(); saveGame(true);
    });
    $("#closeDebt").onclick = () => $("#modal").classList.add("hidden");
  }
  function takeBailout(kind, reason) {
    const rules = financeRules();
    const need = Math.max(rules.reserve, -state.money + Math.round(rules.reserve * .65));
    const remaining = Math.max(0, rules.limit - (state.debt || 0));
    const principal = Math.min(need, remaining);
    if (principal <= 0) return showBankruptcyEnding(reason, "LIMIT KREDIT HABIS");
    const premium = kind === "fast" ? 1.16 : kind === "commissioner" ? 1.08 : 1.04;
    const rate = rules.rate + (kind === "fast" ? .025 : kind === "commissioner" ? -.006 : -.01);
    state.debt += Math.round(principal * premium);
    state.money += principal;
    state.loanRate = Math.max(state.loanRate || 0, Math.max(.015, rate));
    state.bailoutCount = (state.bailoutCount || 0) + 1;
    state.missedPayments = 0;
    if (kind === "commissioner") {
      state.integrity = clamp(state.integrity - 12);
      state.democracy = clamp(state.democracy - 7);
      state.network = clamp(state.network + 11);
      state.career += 7;
      state.comments.unshift(makeComment("bad", "Insya Allah komisaris. Jobdesc menyusul, konflik kepentingan diminta tunggu di lobi.", { persona: "bapak" }));
    } else if (kind === "solidarity") {
      state.integrity = clamp(state.integrity + 2);
      state.network = clamp(state.network + 8);
      state.stress = clamp(state.stress + 4);
      state.comments.unshift(makeComment("good", "Urungan masuk. Tolong laporan kas jangan hilang pas kameranya udah mati.", { persona: "emak" }));
    } else {
      state.integrity = clamp(state.integrity - 6);
      state.heat = clamp(state.heat + 6);
      state.reach = clamp(state.reach + 4);
    }
    state.bankruptcyHistory.push({ phase: state.phase, day: state.day, kind, reason, principal, debt: state.debt });
    $("#modal").classList.add("hidden");
    render(); saveGame(true);
    flash(`BAILOUT CAIR ${formatMoney(principal)} • BUNGA ${(state.loanRate * 100).toFixed(1)}%/BULAN`);
  }
  function showBankruptcyCrisis(reason = "KAS OPERASI KOLAPS") {
    const rules = financeRules();
    const remaining = Math.max(0, rules.limit - (state.debt || 0));
    const exhausted = remaining < Math.max(10000000, rules.reserve * .35) || (state.bailoutCount || 0) >= 4;
    const bailoutCards = state.role === "buzzer"
      ? `<button class="choice-card" data-bailout="commissioner"><h3>🤲 Insya Allah Komisaris</h3><small>Patron menyelamatkan operasi. Bunga lebih ringan, karier dan jaringan naik, integritas serta demokrasi bayar ongkosnya.</small></button><button class="choice-card" data-bailout="fast"><h3>🏦 Kredit Invoice Tanpa Banyak Tanya</h3><small>Cair cepat, provisi tebal, bunga bikin bulan berikutnya ikut kampanye.</small></button>`
      : `<button class="choice-card" data-bailout="solidarity"><h3>🤝 Koperasi Gerakan</h3><small>Urunan warga dan jaringan. Bunga sedikit lebih manusiawi, laporan kas wajib transparan.</small></button><button class="choice-card" data-bailout="fast"><h3>📱 Pinjol Algoritma</h3><small>Cair cepat. Notifikasi penagihan lebih rajin daripada update kasus.</small></button>`;
    $("#modalContent").innerHTML = `<div class="bankruptcy-stage"><span class="special-ribbon">ENDING DARURAT • BANGKRUT</span><h2>💸 Kas Habis, Idealisme Minta Struk</h2><p><b>${reason}</b></p><div class="ending-score"><div><strong>${formatMoney(state.money)}</strong>Kas</div><div><strong>${formatMoney(state.debt || 0)}</strong>Utang</div><div><strong>${state.bailoutCount || 0}</strong>Bailout</div><div><strong>${formatMoney(remaining)}</strong>Sisa kredit</div></div><div class="loan-warning">Kamu bisa menerima kredit penyelamatan dan lanjut bermain. Bunganya dibebankan setiap bulan. Kalau menolak—atau limit habis—kronik benar-benar tamat.</div>${exhausted ? '<div class="lesson"><b>LIMIT KREDIT HABIS.</b><br>Patron sedang offline, koperasi juga sudah mute grup.</div>' : `<div class="choice-grid">${bailoutCards}</div>`}<div class="btn-row"><button class="btn secondary" id="acceptBankruptcy">Akui Bangkrut & Akhiri Game</button><button class="btn secondary" id="cancelBankruptcy">Batal</button></div></div>`;
    $("#modal").classList.remove("hidden");
    document.querySelectorAll("[data-bailout]").forEach((b) => b.onclick = () => takeBailout(b.dataset.bailout, reason));
    $("#acceptBankruptcy").onclick = () => showBankruptcyEnding(reason, exhausted ? "LIMIT KREDIT HABIS" : "PEMAIN MENOLAK BAILOUT");
    $("#cancelBankruptcy").onclick = () => $("#modal").classList.add("hidden");
  }
  function showBankruptcyEnding(reason, note) {
    state.finished = true;
    clearSave();
    $("#modalContent").innerHTML = `<div class="bankruptcy-stage"><span class="special-ribbon">GAME OVER • BANGKRUT</span><h2>${state.role === "buzzer" ? "Invoice Terakhir Tidak Pernah Cair" : "Gerakan Besar, Saldo Kecil"}</h2><p>${reason}. ${note}.</p><div class="ending-score"><div><strong>${formatMoney(state.debt || 0)}</strong>Utang akhir</div><div><strong>${state.bailoutCount || 0}</strong>Bailout</div><div><strong>${Math.round(state.reach)}</strong>Jangkauan</div><div><strong>${Math.round(state.integrity)}</strong>Integritas</div></div><div class="lesson"><b>CATATAN REPUBLIK:</b><br>${state.role === "buzzer" ? "Trending bisa disewa. Arus kas tetap minta transfer beneran." : "Solidaritas bukan uang tak terbatas. Transparansi dan keberlanjutan juga bagian dari gerakan."}</div><button class="btn" id="bankruptMenu">Kembali ke Menu Utama</button></div>`;
    $("#modal").classList.remove("hidden");
    $("#bankruptMenu").onclick = () => startFreshCycle();
    beep(90, .28);
  }

  function showCareerCrisis(reasons) {
    const reserve = state.role === "buzzer" ? 90000000 : 30000000;
    const reasonText = reasons
      .map((r) => `<span class=\"tag new\">${r}</span>`)
      .join("");
    const options = [
      {
        id: "retreat",
        title: "Mundur Satu Langkah",
        desc: "Ambil jeda, serahkan sebagian kendali, dan biarkan jaringan bekerja tanpa wajahmu selama beberapa minggu.",
        impact:
          "Stres turun besar, integritas dan jaringan pulih, tetapi reach serta karier terpukul.",
      },
      {
        id: "funding",
        title:
          state.role === "buzzer"
            ? "Minta Bailout Narasi"
            : "Buka Donasi Darurat",
        desc:
          state.role === "buzzer"
            ? "Agensi induk menyuntik dana dengan invoice yang judul pekerjaannya sengaja abstrak."
            : "Jaringan warga menggalang dana. Transparansi laporan akan menentukan apakah bantuan menjadi solidaritas atau skandal baru.",
        impact:
          "Dana pulih cepat, tetapi ketergantungan dan biaya moral meningkat.",
      },
      {
        id: "correction",
        title: "Koreksi Terbuka & Rebranding",
        desc: "Akui kesalahan, hapus unggahan yang menyesatkan, terbitkan sumber, lalu mulai membangun kepercayaan dari angka yang tidak mengesankan.",
        impact:
          "Kredibilitas dipulihkan, tetapi reach turun dan algoritma kehilangan minat.",
      },
    ];
    $("#modalContent").innerHTML =
      `<span class=\"special-ribbon\">KRISIS KARIER • BUKAN GAME OVER</span><h2>Timeline Menagih Tubuh dan Reputasi</h2><p>Kronik tidak berhenti di sini. Namun pilihan buruk tetap punya harga. Kondisi kritis saat ini:</p><div class=\"tags\">${reasonText}</div><div class=\"lesson\"><b>ATURAN BARU:</b> campaign hanya berakhir pada fase 6, bulan 12. Krisis di tengah jalan menjadi setback permanen dalam riwayat dan final.</div><div class=\"choice-grid\">${options.map((o) => `<button class=\"choice-card\" data-crisis=\"${o.id}\"><h3>${o.title}</h3><p>${o.desc}</p><small>${o.impact}</small></button>`).join("")}</div>`;
    $("#modal").classList.remove("hidden");
    document
      .querySelectorAll("[data-crisis]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            resolveCareerCrisis(b.dataset.crisis, reasons, reserve)),
      );
  }
  function resolveCareerCrisis(choice, reasons, reserve) {
    const before = {
      stress: state.stress,
      credibility: state.credibility,
      money: state.money,
    };
    if (choice === "retreat") {
      state.stress = 52;
      state.credibility = Math.max(state.credibility, 20);
      state.money = Math.max(state.money, reserve);
      state.reach = clamp(state.reach - 12);
      state.integrity = clamp(state.integrity + 7);
      state.network = clamp(state.network + 6);
      state.career = Math.max(0, state.career - 8);
    } else if (choice === "funding") {
      state.stress = 72;
      state.credibility = Math.max(state.credibility, 14);
      state.money = Math.max(state.money, reserve * 2);
      state.integrity = clamp(state.integrity - 9);
      state.democracy = clamp(state.democracy - 4);
      state.network = clamp(state.network + 4);
      state.career += 2;
    } else {
      state.stress = 64;
      state.credibility = Math.max(state.credibility, 32);
      state.money = Math.max(state.money, Math.round(reserve * 0.7));
      state.reach = clamp(state.reach - 9);
      state.integrity = clamp(state.integrity + 3);
      state.democracy = clamp(state.democracy + 2);
      state.career = Math.max(0, state.career - 4);
    }
    state.crisisHistory.push({
      phase: state.phase,
      day: state.day,
      reasons: [...reasons],
      choice,
      before,
      after: {
        stress: state.stress,
        credibility: state.credibility,
        money: state.money,
      },
    });
    state.comments.unshift(
      makeComment(
        choice === "funding" ? "bad" : "good",
        choice === "retreat"
          ? "Untuk pertama kalinya admin log out sebelum tubuhnya melakukan force quit."
          : choice === "funding"
            ? "Dana masuk. Pertanyaan tentang syarat dan donor ikut masuk lima menit kemudian."
            : "Koreksi tidak viral, tetapi jejak editnya akan hidup lebih lama daripada klarifikasi lisan.",
      ),
    );
    $("#modal").classList.add("hidden");
    render();
    saveGame(true);
    flash("KRISIS DILEWATI • KRONIK BERLANJUT");
    proceedAfterMonth();
  }
  function endDay() {
    if (state.finished) return;
    if (state.actions === 0) {
      state.reach = clamp(state.reach - 5);
      state.stress = clamp(state.stress - 2);
      addLog(
        "Kamu hanya membaca. Sehat untuk jiwa, buruk untuk karier algoritmik.",
        "info",
      );
    } else if (state.resolve > 0) {
      state.stress = clamp(state.stress - 3);
      state.credibility = clamp(state.credibility - 1);
      addLog(
        "Kamu keluar sebelum debat selesai. Ini mungkin keputusan paling dewasa hari ini.",
        "info",
      );
    }
    if (state.integrity < 30) {
      state.credibility = clamp(state.credibility - 5);
      state.democracy = clamp(state.democracy - 4);
    }
    if (state.stress > 82) {
      state.integrity = clamp(state.integrity - 4);
      state.network = clamp(state.network - 3);
    }
    if (state.heat > 78) state.democracy = clamp(state.democracy - 3);
    const monthlyFunding = state.role === "buzzer"
      ? [rnd(150000000, 280000000), rnd(220000000, 420000000), rnd(320000000, 600000000), rnd(450000000, 820000000), rnd(600000000, 1050000000), rnd(800000000, 1400000000)][state.phase]
      : [rnd(5000000, 17000000), rnd(7000000, 24000000), rnd(10000000, 34000000), rnd(14000000, 47000000), rnd(20000000, 65000000), rnd(28000000, 90000000)][state.phase];
    state.money += monthlyFunding;
    addLog(`${state.role === "buzzer" ? "Invoice/patron cair" : "Donasi dan urunan masuk"}: ${formatMoney(monthlyFunding)}.`, "info");
    serviceDebt();
    if (state.money < 0 || ((state.debt || 0) > financeRules().limit && state.missedPayments > 0)) {
      showBankruptcyCrisis(state.money < 0 ? "SALDO OPERASI NEGATIF" : "BATAS KREDIT JEBOL");
      return;
    }
    const reasons = criticalReasons();
    if (reasons.length) {
      showCareerCrisis(reasons);
      return;
    }
    proceedAfterMonth();
  }
  function showQuiz() {
    const q = nextQuiz();
    $("#modalContent").innerHTML =
      `<span class="quiz-kicker">${q.c}</span><h2>Cek Nalar</h2><p>${q.q}</p><div class="choice-grid">${q.options.map((o, i) => `<button class="choice-card" data-q="${i}"><h3>${String.fromCharCode(65 + i)}. ${o.text}</h3></button>`).join("")}</div><div id="quizResult"></div>`;
    $("#modal").classList.remove("hidden");
    document.querySelectorAll("[data-q]").forEach(
      (b) =>
        (b.onclick = () => {
          const picked = q.options[Number(b.dataset.q)],
            ok = picked.correct;
          state.quizAnswered++;
          document
            .querySelectorAll("[data-q]")
            .forEach((x) => (x.disabled = true));
          if (ok) {
            state.quizCorrect++;
            state.credibility = clamp(state.credibility + 4);
            state.integrity = clamp(state.integrity + 2);
            state.career += 2;
          } else {
            state.heat = clamp(state.heat + 5);
            state.stress = clamp(state.stress + 3);
          }
          const correctLetter = String.fromCharCode(
            65 + q.options.findIndex((x) => x.correct),
          );
          $("#quizResult").innerHTML =
            `<div class="lesson" style="border-left-color:${ok ? "var(--green)" : "var(--red)"}"><b>${ok ? "TEPAT" : "BELUM TEPAT"} • JAWABAN ${correctLetter}</b><br>${q.e}</div><button class="btn" id="nextDay">Lanjut</button>`;
          $("#nextDay").onclick = continueAfterDay;
          render();
        }),
    );
  }
  function applyEffects(effects) {
    Object.entries(effects).forEach(([k, v]) => {
      if (k === "money") state.money += v;
      else if (k === "career") state.career += v;
      else if (k in state && typeof state[k] === "number")
        state[k] = clamp(state[k] + v);
    });
  }
  const eventDecisionDomains = {
    media: {
      label: "MEDIA, BUKTI, DAN ATENSI",
      stakes: "Siapa yang menguasai potongan pertama sering menguasai persepsi, tetapi koreksi yang terlambat dapat hidup lebih lama daripada klarifikasi.",
      pressure: "Kecepatan viral berlawanan dengan verifikasi, perlindungan korban, dan hak jawab.",
      actions: { buzzer: ["data", "transparency", "podcast"], aktivis: ["context", "data", "film"] },
    },
    economy: {
      label: "ANGGARAN, RISIKO, DAN DISTRIBUSI",
      stakes: "Angka agregat dapat terlihat bagus sementara biaya, risiko, dan manfaat jatuh pada kelompok yang berbeda.",
      pressure: "Kas, tenggat politik, kapasitas pelaksana, dan tuntutan membuka data tidak bergerak dengan kecepatan yang sama.",
      actions: { buzzer: ["data", "transparency", "patriot"], aktivis: ["data", "transparency", "context"] },
    },
    civic: {
      label: "HAK SIPIL, KEAMANAN, DAN JALANAN",
      stakes: "Satu respons dapat meredakan keadaan hari ini sambil mempersempit ruang sipil untuk tahun-tahun berikutnya.",
      pressure: "Keselamatan lapangan, urgensi tuntutan, bukti pelanggaran, dan legitimasi proses saling tarik-menarik.",
      actions: { buzzer: ["transparency", "data", "podcast"], aktivis: ["law", "network", "empathy"] },
    },
    election: {
      label: "PEMILU, LEGITIMASI, DAN KEPERCAYAAN",
      stakes: "Keuntungan taktis satu kubu dapat dibayar dengan turunnya kepercayaan pada prosedur yang kelak juga dibutuhkan kubu itu sendiri.",
      pressure: "Klaim harus cepat, bukti bergerak lambat, dan setiap koreksi langsung dianggap bagian dari strategi lawan.",
      actions: { buzzer: ["data", "transparency", "meme"], aktivis: ["data", "law", "network"] },
    },
    governance: {
      label: "KEKUASAAN, MANDAT, DAN AKUNTABILITAS",
      stakes: "Keputusan yang efisien dapat mengaburkan siapa berwenang, siapa mengawasi, dan siapa menanggung kegagalan.",
      pressure: "Akses elite memberi hasil cepat, sedangkan prosedur terbuka menuntut waktu, biaya, dan kesediaan dikoreksi.",
      actions: { buzzer: ["transparency", "data", "whatabout"], aktivis: ["context", "law", "transparency"] },
    },
  };
  const eventChoiceBlueprints = {
    media: {
      buzzer: [
        ["Embargo 24 jam dengan jejak koreksi", "Tahan distribusi sebentar, pisahkan klaim, bantahan, korban, dan materi yang belum terverifikasi sebelum mesin konten dinyalakan lagi.", { reach: -3, credibility: 6, integrity: 4, democracy: 2, heat: -5, stress: 4, money: -18000000 }, "“Timeline melambat sehari. Untuk sekali ini, koreksi tidak ditaruh di caption edit ukuran delapan.”", { strategy: "KOREKSI TERKENDALI", outlook: "mixed", risk: "Embargo dapat dibaca sebagai sensor bila catatan proses tidak ikut dibuka.", testStat: "credibility", threshold: 52 }],
        ["Panel lintas redaksi tanpa hak veto istana", "Serahkan pemeriksaan fakta kepada panel luar, tetapi pertahankan kanal respons resmi dan tenggat koreksi yang dapat ditagih.", { reach: -4, credibility: 7, integrity: 6, democracy: 5, network: -3, stress: 5, money: -26000000 }, "“Humas kehilangan kontrol penuh, publik akhirnya mendapat lebih dari satu kamera.”", { strategy: "AUDIT INDEPENDEN", outlook: "positive", risk: "Temuan panel dapat merusak agenda sendiri dan tidak bisa ditarik kembali lewat telepon malam.", testStat: "integrity", threshold: 55 }],
      ],
      aktivis: [
        ["Pisahkan korban, klaim, dan insentif media", "Buat tiga jalur kerja: perlindungan korban, verifikasi materi, dan pemetaan siapa mendapat uang atau pengaruh dari ledakan isu.", { reach: 2, credibility: 6, integrity: 6, democracy: 4, network: 4, stress: 6, money: -10000000 }, "“Thread-nya tidak secepat fanwar, tapi untuk pertama kali semua objek masalah punya folder sendiri.”", { strategy: "TRIASE INFORMASI", outlook: "positive", risk: "Tim bisa kelelahan dan kehilangan momentum ketika algoritma sudah pindah ke skandal berikutnya.", testStat: "network", threshold: 48 }],
        ["Meja verifikasi lintas komunitas", "Undang redaksi, peneliti, korban, dan komunitas digital untuk menyepakati standar bukti tanpa menyatukan semua posisi politik.", { reach: -1, credibility: 8, integrity: 5, democracy: 6, network: 7, stress: 7, money: -14000000 }, "“Tidak semua sepakat, tetapi minimal semua memakai dokumen yang sama sebelum saling menuduh.”", { strategy: "KOALISI VERIFIKASI", outlook: "mixed", risk: "Koalisi dapat pecah saat satu anggota merasa standar bukti mengganggu narasi kubunya.", testStat: "network", threshold: 55 }],
      ],
    },
    economy: {
      buzzer: [
        ["Pilot terbatas dengan dashboard rugi", "Jalankan program pada wilayah terbatas, publikasikan biaya gagal, dan pasang klausul berhenti sebelum kegagalan berubah menjadi warisan nasional.", { reach: -2, credibility: 6, integrity: 4, democracy: 3, network: 2, stress: 5, money: -30000000 }, "“Untuk pertama kali dashboard juga punya warna merah dan tombol berhenti.”", { strategy: "PILOT + SUNSET CLAUSE", outlook: "mixed", risk: "Pilot dapat dipoles sebagai sukses sebelum biaya tersembunyi benar-benar terlihat.", testStat: "credibility", threshold: 50 }],
        ["Bagi risiko, buka siapa penjaminnya", "Libatkan daerah, BUMN, dan auditor, tetapi tulis dengan jelas siapa menanggung rugi jika target politik tidak bertemu arus kas.", { reach: 3, credibility: 3, integrity: 2, democracy: 2, network: 8, heat: 2, money: -16000000 }, "“Sinergi akhirnya datang bersama daftar penanggung rugi, bukan cuma logo berjajar.”", { strategy: "RISK SHARING TERBUKA", outlook: "neutral", risk: "Banyak aktor dapat memperlambat koreksi dan saling melempar invoice saat hasil buruk.", testStat: "network", threshold: 58 }],
      ],
      aktivis: [
        ["Bikin shadow budget sampai penerima akhir", "Bandingkan anggaran resmi dengan biaya lapangan, distribusi manfaat, kebocoran, dan kelompok yang justru menanggung ongkos.", { reach: 1, credibility: 8, integrity: 7, democracy: 4, network: 3, stress: 7, money: -13000000 }, "“Anggarannya tetap besar, tapi sekarang publik tahu besar untuk siapa.”", { strategy: "SHADOW BUDGET", outlook: "positive", risk: "Kesalahan metodologi kecil dapat dipakai untuk membuang seluruh temuan yang sebenarnya kuat.", testStat: "credibility", threshold: 56 }],
        ["Negosiasikan standar minimum dan hak veto warga", "Terima sebagian implementasi hanya jika data penerima, kanal keluhan, audit, dan hak menghentikan program ditulis sejak awal.", { reach: -2, credibility: 5, integrity: 5, democracy: 7, network: 6, stress: 5, money: -11000000 }, "“Gerakan tidak mendapat slogan sempurna, warga mendapat tombol komplain yang benar-benar tersambung.”", { strategy: "KOMPROMI BERSYARAT", outlook: "mixed", risk: "Koalisi gerakan bisa menuduh kompromi sebagai kooptasi sebelum indikator pertama sempat diuji.", testStat: "integrity", threshold: 57 }],
      ],
    },
    civic: {
      buzzer: [
        ["Moratorium lapangan, dialog 72 jam", "Bekukan tindakan koersif, buka jalur negosiasi dengan tenggat, dan umumkan kondisi yang membuat operasi dapat dimulai kembali.", { reach: -3, credibility: 5, integrity: 5, democracy: 7, network: 3, heat: -9, stress: 4, money: -22000000 }, "“Tiga hari tanpa gas air mata. Timeline bingung harus marah ke siapa.”", { strategy: "DE-ESKALASI TERBATAS", outlook: "mixed", risk: "Dialog dapat dipakai sekadar membeli waktu bila tenggat dan notulennya tidak terbuka.", testStat: "integrity", threshold: 54 }],
        ["Komite bersama dengan notulen publik", "Satukan pejabat, korban, ahli, dan pengawas independen; setiap janji mendapat PIC, tanggal, serta halaman notulen.", { reach: 1, credibility: 7, integrity: 6, democracy: 8, network: 6, stress: 6, money: -28000000 }, "“Rapatnya panjang, tapi kali ini kalimat ‘akan ditindaklanjuti’ punya nama dan deadline.”", { strategy: "KOMITE AKUNTABEL", outlook: "positive", risk: "Temuan komite dapat membuka tanggung jawab aktor yang masih berada di dalam koalisi sendiri.", testStat: "network", threshold: 55 }],
      ],
      aktivis: [
        ["Tangga eskalasi: hukum, jalanan, negosiasi", "Pisahkan target tiap jalur, tentukan kapan aksi naik atau turun, dan jangan korbankan bukti demi satu hari trending.", { reach: 5, credibility: 5, integrity: 6, democracy: 7, network: 8, heat: 5, stress: 9, money: -12000000 }, "“Aksinya keras, tetapi sekarang setiap eskalasi punya alasan dan pintu keluar.”", { strategy: "ESCALATION LADDER", outlook: "mixed", risk: "Satu insiden lapangan dapat merusak disiplin strategi dan memecah koalisi.", testStat: "network", threshold: 57 }],
        ["Posko bukti, bantuan hukum, dan pemulihan", "Prioritaskan dokumentasi aman, pendampingan korban, serta litigasi sambil menjaga jalur komunikasi dengan kelompok lapangan.", { reach: -2, credibility: 8, integrity: 9, democracy: 8, network: 6, stress: 8, money: -16000000 }, "“Tidak semua masuk FYP. Sebagian masuk berkas perkara dan rekening bantuan.”", { strategy: "INFRASTRUKTUR GERAKAN", outlook: "positive", risk: "Kerja sunyi mahal dan dapat dianggap tidak militan oleh orang yang hanya melihat metrik viral.", testStat: "integrity", threshold: 58 }],
      ],
    },
    election: {
      buzzer: [
        ["Protokol klaim lintas kubu", "Sepakati data minimum, waktu koreksi, dan larangan memakai aparat atau fasilitas negara sebelum semua pihak kembali saling serang.", { reach: -3, credibility: 6, integrity: 5, democracy: 8, network: 6, heat: -6, stress: 4, money: -20000000 }, "“Semua kubu tetap nyebelin, tetapi sekarang kebohongannya punya jalur koreksi.”", { strategy: "PAKTA PROSEDURAL", outlook: "mixed", risk: "Kesepakatan runtuh bila satu kubu memperoleh keuntungan dari pelanggaran pertama.", testStat: "network", threshold: 56 }],
        ["Audit acak dan moratorium klaim 48 jam", "Ambil sampel iklan, bansos, akun, atau tabulasi; hentikan klaim kemenangan sampai temuan awal dapat diperiksa publik.", { reach: -6, credibility: 9, integrity: 7, democracy: 7, stress: 6, money: -28000000 }, "“Dua hari tanpa klaim mandat rakyat. Mesin desain sempat belajar membaca metodologi.”", { strategy: "AUDIT PRA-KLAIM", outlook: "positive", risk: "Kehilangan momentum dapat dianggap kekalahan, bahkan bila audit kemudian membenarkan posisi sendiri.", testStat: "credibility", threshold: 58 }],
      ],
      aktivis: [
        ["Posko verifikasi lintas kandidat", "Pantau iklan, dana, aparat, hasil, dan kekerasan tanpa menjadikan satu kandidat sebagai pemilik posko.", { reach: 2, credibility: 8, integrity: 8, democracy: 9, network: 8, stress: 8, money: -15000000 }, "“Poskonya tidak netral terhadap pelanggaran, tetapi netral terhadap warna jaket.”", { strategy: "PENGAWASAN LINTAS KUBU", outlook: "positive", risk: "Relawan partisan dapat menyerang posko ketika temuan menyentuh kandidat yang mereka dukung.", testStat: "integrity", threshold: 58 }],
        ["Uji hukum dengan dashboard bukti publik", "Ajukan keberatan resmi sambil membuka bukti, batas klaim, jadwal sidang, dan koreksi kepada warga.", { reach: 1, credibility: 7, integrity: 7, democracy: 8, network: 4, stress: 7, money: -13000000 }, "“Gugatan tidak berubah jadi wahyu. Publik bisa lihat mana bukti dan mana harapan.”", { strategy: "LITIGASI TERBUKA", outlook: "mixed", risk: "Kekalahan hukum dapat dipelintir sebagai pembenaran atas semua praktik yang dikritik.", testStat: "credibility", threshold: 55 }],
      ],
    },
    governance: {
      buzzer: [
        ["Recusal konflik kepentingan dengan batas waktu", "Tarik aktor yang berkepentingan dari keputusan tertentu, tunjuk pengganti, dan buka kapan kewenangan itu kembali.", { reach: -2, credibility: 7, integrity: 8, democracy: 6, network: -5, heat: -4, stress: 5, money: -18000000 }, "“Kursinya masih ada. Untuk sementara, orang yang paling berkepentingan tidak duduk di atasnya.”", { strategy: "RECUSAL TERUKUR", outlook: "positive", risk: "Jaringan patron dapat membalas lewat akses, anggaran, atau promosi berikutnya.", testStat: "integrity", threshold: 57 }],
        ["Pilot kewenangan dengan sunset clause", "Berikan mandat terbatas, indikator kegagalan, audit berkala, dan tanggal otomatis berakhir kecuali diperpanjang secara terbuka.", { reach: 1, credibility: 5, integrity: 4, democracy: 5, network: 5, stress: 4, money: -22000000 }, "“Jabatan baru lahir bersama tanggal kedaluwarsa. Sebuah konsep radikal di republik rapat abadi.”", { strategy: "MANDAT SEMENTARA", outlook: "neutral", risk: "Sunset clause dapat diperpanjang diam-diam ketika perhatian publik sudah pindah.", testStat: "credibility", threshold: 52 }],
      ],
      aktivis: [
        ["Peta kewenangan dan konflik kepentingan", "Susun siapa memutuskan, siapa mendapat manfaat, siapa mengawasi, dan jalur koreksi sebelum membuat tuntutan final.", { reach: -1, credibility: 8, integrity: 7, democracy: 7, network: 4, stress: 6, money: -11000000 }, "“Bagannya jelek, tetapi sekarang semua panah punya nama dan dasar hukum.”", { strategy: "POWER MAPPING", outlook: "positive", risk: "Analisis panjang dapat kehilangan momentum dan memberi elite waktu menyusun narasi tandingan.", testStat: "credibility", threshold: 55 }],
        ["Koalisi pemantau dengan hak keluar", "Bangun pengawasan bersama tetapi izinkan kelompok keluar terbuka bila standar minimum dilanggar atau data ditutup.", { reach: 1, credibility: 5, integrity: 6, democracy: 8, network: 9, stress: 7, money: -14000000 }, "“Koalisinya besar, dan untuk pertama kali klausul cerainya dibaca sebelum foto bersama.”", { strategy: "KOALISI BERSYARAT", outlook: "mixed", risk: "Perbedaan ambang kompromi dapat memecah koalisi tepat ketika tekanan mulai efektif.", testStat: "network", threshold: 58 }],
      ],
    },
  };
  function eventHash(text) {
    let hash = 2166136261;
    for (const ch of String(text)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return hash >>> 0;
  }
  function eventDomain(e) {
    const text = `${e.id} ${e.sourceKey || ""} ${e.title} ${e.actor || ""}`.toLowerCase();
    if (/fufu|film|document|podcast|influencer|clone|redaksi|communication|dirty|threat|quiet/.test(text)) return "media";
    if (/ppn|mbg|finance|bankrupt|danantara|asset|budget|faktur|purbaya|climate|campaign-money/.test(text)) return "economy";
    if (/tni|protest|gelap|pati|august|17plus8|demonstration|ham|psn|ylbhi|kabur|teror/.test(text)) return "civic";
    if (/election|round|ballot|candidate|dynasty|neutrality|bansos|campaign|open-ballot|many-candidates/.test(text)) return "election";
    return "governance";
  }
  function classifyEventEffects(effects = {}) {
    const civic = (effects.credibility || 0) + (effects.integrity || 0) + (effects.democracy || 0);
    const hasUp = Object.values(effects).some(v => v > 0), hasDown = Object.values(effects).some(v => v < 0);
    if (civic >= 16 && !((effects.integrity || 0) < 0 || (effects.democracy || 0) < 0)) return "positive";
    if (civic <= -10) return "negative";
    if (hasUp && hasDown) return "mixed";
    return "neutral";
  }
  function defaultEventRisk(effects = {}) {
    if ((effects.democracy || 0) < 0) return "Keuntungan taktis dibayar dengan menyempitnya ruang demokrasi.";
    if ((effects.integrity || 0) < 0) return "Hasil cepat meninggalkan utang integritas yang dapat muncul lagi.";
    if ((effects.credibility || 0) < 0) return "Narasi dapat menang hari ini tetapi makin sulit dipercaya pada krisis berikutnya.";
    if ((effects.network || 0) < 0) return "Pilihan ini berpotensi memutus akses ke aktor yang dibutuhkan kemudian.";
    if ((effects.reach || 0) < 0) return "Respons lebih hati-hati dapat kehilangan jendela perhatian publik.";
    if ((effects.stress || 0) > 0) return "Pelaksanaan membutuhkan kapasitas tim; burnout dapat mengubah hasil baik menjadi formalitas.";
    return "Tidak ada pilihan tanpa biaya peluang; hasil akhirnya bergantung pada kondisi bulan berikutnya.";
  }
  function buildDelayedConsequence(e, choice, meta, domain, role, index) {
    const seed = eventHash(`${e.id}:${role}:${index}:${choice[0]}`);
    const afterMonths = 1 + (seed % 4);
    const outlook = meta.outlook;
    const testStat = meta.testStat || (outlook === "negative" ? "reach" : outlook === "positive" ? "integrity" : role === "buzzer" ? "credibility" : "network");
    const threshold = meta.threshold || (outlook === "negative" ? 58 : 50 + (seed % 11));
    const config = eventDecisionDomains[domain];
    const actionIds = config.actions[role];
    const topic = e.title;
    if (outlook === "negative") {
      return {
        afterMonths,
        hint: `${afterMonths} bulan lagi strategi ini diuji oleh ${testStat}; viral belum tentu berarti bertahan.`,
        test: { stat: testStat, min: threshold },
        success: { tone: "neutral", title: `Narasi ${topic} Bertahan, Biayanya Menyusul`, text: "Strategi agresif mempertahankan perhatian, tetapi publik makin sulit membedakan informasi dan mobilisasi.", effects: { reach: 5, network: 2, integrity: -3, democracy: -3, heat: 4 }, buff: { actionIds, damage: 4, costMultiplier: .94 } },
        failure: { tone: "bad", title: `Backlash ${topic}`, text: "Ledakan awal tidak bertahan. Potongan lama kembali bersama tuntutan bukti dan jejak koordinasi.", effects: { credibility: -6, integrity: -4, democracy: -2, stress: 5, heat: 6 }, buff: { actionIds, damage: -4, costMultiplier: 1.12 } },
      };
    }
    if (outlook === "positive") {
      return {
        afterMonths,
        hint: `${afterMonths} bulan lagi implementasi diuji oleh ${testStat}; niat baik tanpa kapasitas bisa tetap gagal.`,
        test: { stat: testStat, min: threshold },
        success: { tone: "good", title: `Dividen Kepercayaan: ${topic}`, text: "Dokumen, koreksi, dan tindak lanjut masih dapat ditemukan setelah headline pindah.", effects: { credibility: 5, integrity: 4, democracy: 4, network: 3, heat: -3 }, buff: { actionIds, damage: 7, costMultiplier: .82, engagementMultiplier: 1.12 } },
        failure: { tone: "neutral", title: `Implementasi ${topic} Kehabisan Napas`, text: "Prosedurnya baik, tetapi tim, uang, atau jaringan tidak cukup untuk menjaga tindak lanjut.", effects: { credibility: -2, stress: 6, network: -2, heat: 2 }, buff: { actionIds, damage: -1, costMultiplier: 1.06 } },
      };
    }
    return {
      afterMonths,
      hint: `${afterMonths} bulan lagi kompromi diuji oleh ${testStat}; hasilnya dapat positif, negatif, atau sekadar memindahkan masalah.`,
      test: { stat: testStat, min: threshold },
      success: { tone: "good", title: `Kompromi ${topic} Menghasilkan Celah`, text: "Tidak semua tuntutan tercapai, tetapi mekanisme koreksi dan akses bukti benar-benar dipakai.", effects: { credibility: 4, democracy: 3, network: 4, stress: 2, heat: -2 }, buff: { actionIds, damage: 5, costMultiplier: .88 } },
      failure: { tone: "bad", title: `Kompromi ${topic} Menjadi Foto Bersama`, text: "Kesepakatan bertahan sebagai seremoni; klausul pengawasan hilang ketika perhatian publik turun.", effects: { credibility: -4, integrity: -3, democracy: -3, network: -2, stress: 4, heat: 3 }, buff: { actionIds, damage: -3, costMultiplier: 1.1 } },
    };
  }
  function normalizeEventChoice(e, choice, index, role, domain) {
    const meta = { ...(choice[4] || {}) };
    meta.outlook = meta.outlook || classifyEventEffects(choice[2]);
    meta.strategy = meta.strategy || (index === 0 ? "ESKALASI CEPAT" : index === 1 ? "JALUR INSTITUSIONAL" : "JALUR ALTERNATIF");
    meta.risk = meta.risk || defaultEventRisk(choice[2]);
    if (meta.threshold) meta.threshold = clamp(meta.threshold + (eventHash(`${e.id}:${role}:${index}:threshold`) % 9) - 4, 35, 75);
    meta.delayed = meta.delayed || buildDelayedConsequence(e, choice, meta, domain, role, index);
    return [choice[0], choice[1], choice[2], choice[3], meta];
  }
  function varyEventChoiceEffects(effects, e, role, slot) {
    const varied = {};
    Object.entries(effects || {}).forEach(([key, value]) => {
      if (key === "money") {
        const factor = .84 + (eventHash(`${e.id}:${role}:${slot}:money`) % 37) / 100;
        varied[key] = Math.round((value * factor) / 1000000) * 1000000;
        return;
      }
      if (!value) { varied[key] = value; return; }
      const shift = (eventHash(`${e.id}:${role}:${slot}:${key}`) % 5) - 2;
      const next = value + (value > 0 ? shift : -shift);
      varied[key] = value > 0 ? Math.max(1, next) : Math.min(-1, next);
    });
    return varied;
  }
  function eventChoices(e, role) {
    const domain = eventDomain(e);
    const choices = e.choices[role].map((choice, index) => normalizeEventChoice(e, choice, index, role, domain));
    const additions = eventChoiceBlueprints[domain][role];
    for (let i = 0; choices.length < 4 && i < additions.length; i++) {
      const raw = additions[i].map((value, index) => index === 2 ? { ...value } : index === 4 ? { ...value } : value);
      raw[2] = varyEventChoiceEffects(raw[2], e, role, choices.length);
      if (e.id === "fufufafa-archive" && raw[4]) raw[4].fufuMode = "deferred";
      choices.push(normalizeEventChoice(e, raw, choices.length, role, domain));
    }
    return choices;
  }
  const eventEffectLabels = { reach: "JANGKAUAN", credibility: "KREDIBILITAS", integrity: "INTEGRITAS", democracy: "DEMOKRASI", network: "JARINGAN", heat: "SUHU", stress: "STRES", money: "BIAYA", career: "KARIER" };
  const eventOutlookLabels = { positive: "POSITIF", negative: "NEGATIF", neutral: "NETRAL", mixed: "CAMPURAN" };
  function eventEffectPreview(effects = {}) {
    return Object.entries(effects).filter(([, value]) => value !== 0).slice(0, 7).map(([key, value]) => {
      const shown = key === "money" ? formatMoney(value) : `${value > 0 ? "+" : ""}${value}`;
      return `<span class="${value > 0 ? "up" : "down"}">${eventEffectLabels[key] || key.toUpperCase()} ${shown}</span>`;
    }).join("");
  }
  function eventScenarioBrief(e) {
    const config = eventDecisionDomains[eventDomain(e)];
    return `<div class="event-brief"><div><b>MEDAN KEPUTUSAN • ${config.label}</b><br>${config.stakes}</div><div><b>TEKANAN SKENARIO</b><br>${config.pressure}</div></div>`;
  }
  function timelineIndex(phase = state.phase, day = state.day) { return phase * 12 + Math.max(0, day - 1); }
  function timelineLabel(index) {
    const safe = clamp(Number(index) || 0, 0, 71), phase = Math.floor(safe / 12), day = safe % 12;
    return phases[phase]?.days?.[day]?.month || `Fase ${phase + 1}, bulan ${day + 1}`;
  }
  function queueNarrativeRipple(e, choice, meta) {
    const delayed = meta.delayed;
    if (!delayed) return null;
    const dueIndex = Math.min(71, timelineIndex() + delayed.afterMonths);
    const ripple = { id: `${e.id}:${state.role}:${state.phase}:${state.day}:${Date.now()}`, eventId: e.id, eventTitle: e.title, choice: choice[0], strategy: meta.strategy, outlook: meta.outlook, createdIndex: timelineIndex(), dueIndex, delayed };
    state.narrativeRipples = state.narrativeRipples || [];
    state.narrativeRipples.push(ripple);
    return ripple;
  }
  function resolveDueNarrativeRipples() {
    const now = timelineIndex(), notices = [];
    state.narrativeRipples = state.narrativeRipples || [];
    state.resolvedRipples = state.resolvedRipples || [];
    const pending = [];
    state.narrativeRipples.forEach(ripple => {
      if (ripple.dueIndex > now) { pending.push(ripple); return; }
      const test = ripple.delayed.test || {}, value = Number(state[test.stat]) || 0;
      const passed = test.max !== undefined ? value <= test.max : value >= (test.min || 0);
      const outcome = passed ? ripple.delayed.success : ripple.delayed.failure;
      applyEffects(outcome.effects || {});
      if (outcome.buff) state.abilityBuffs.push({ ...outcome.buff, phase: state.phase, sourceId: ripple.eventId, sourceName: ripple.eventTitle, abilityName: outcome.title, consume: true });
      const notice = { rippleId: ripple.id, eventId: ripple.eventId, eventTitle: ripple.eventTitle, choice: ripple.choice, strategy: ripple.strategy, tone: outcome.tone, title: outcome.title, text: outcome.text, effects: outcome.effects || {}, test: { stat: test.stat, threshold: test.max ?? test.min, value, passed } };
      notices.push(notice);
      state.resolvedRipples.push(notice);
      const history = [...(state.eventHistory || [])].reverse().find(item => item.id === ripple.eventId && item.choice === ripple.choice);
      if (history) { history.consequences = history.consequences || []; history.consequences.push({ title: outcome.title, tone: outcome.tone, phase: state.phase, day: state.day }); }
      state.comments.unshift(makeComment(outcome.tone === "good" ? "good" : outcome.tone === "bad" ? "bad" : "neutral", outcome.text));
    });
    state.narrativeRipples = pending;
    state.currentRippleNotices = notices;
    return notices;
  }
  function rippleNoticeHtml(notices = []) {
    if (!notices.length) return "";
    return notices.map(n => `<div class="ripple-banner ${n.tone}"><b>↳ AKIBAT PILIHAN LAMA • ${n.eventTitle}</b><br>${n.title}: ${n.text}<br><small>${n.test.stat.toUpperCase()} ${Math.round(n.test.value)} diuji terhadap ambang ${n.test.threshold}. ${eventEffectPreview(n.effects)}</small></div>`).join("");
  }
  function showSpecialEvent(e) {
    const choices = eventChoices(e, state.role);
    const eventText = typeof e.text === "function" ? e.text() : e.text;
    const eventFact = typeof e.fact === "function" ? e.fact() : e.fact;
    const ghost = e.id.startsWith("fufufafa");
    const legacy =
      e.id === "fufufafa-return"
        ? `<div class="legacy-signal"><b>JEJAK PILIHAN 2024:</b> ${state.fufuArchive?.mode || "tidak tercatat pada save lama"}</div>`
        : "";
    $("#modalContent").innerHTML =
      `<span class="special-ribbon">${ghost ? "DIGITAL GHOST EVENT" : "SPECIAL EVENT • DILEMA STRATEGIS"}</span><h2>${e.icon} ${e.title}</h2><div class="event-card ${ghost ? "digital-ghost" : ""}"><h3>${e.actor}</h3>${ghost ? '<div class="ghost-handle">@fufufafa • KASKUS CACHE • STATUS PEMILIK: BELUM TERVERIFIKASI FINAL</div>' : ""}<p>${eventText}</p><div class="event-source"><b>Konteks dunia nyata:</b> ${eventFact}</div>${eventScenarioBrief(e)}${legacy}</div><p>Pilih strategi. Tidak semua dampak muncul sekarang; kondisi beberapa bulan mendatang ikut menentukan apakah keputusanmu berhasil, gagal, atau berubah menjadi kompromi kosong.</p><div class="choice-grid">${choices.map((c, i) => { const meta = c[4]; return `<button class="choice-card event-choice-card outcome-${meta.outlook}" data-event-choice="${i}"><span class="choice-strategy">${meta.strategy} • ${eventOutlookLabels[meta.outlook] || meta.outlook.toUpperCase()}</span><h3>${String.fromCharCode(65 + i)}. ${c[0]}</h3><small>${c[1]}</small><div class="choice-impact-preview">${eventEffectPreview(c[2])}</div><div class="choice-risk"><b>RISIKO:</b> ${meta.risk}</div><div class="choice-delay"><b>AKIBAT TERTUNDA:</b> ${meta.delayed.hint}</div></button>`; }).join("")}</div><div class="source-disclaimer">Tokoh dan dialog di event adalah parodi-komposit. Klaim faktual diringkas di Arsip Fakta dan tidak menyatakan motif pribadi atau identitas akun yang belum terbukti.</div>`;
    $("#modal").classList.remove("hidden");
    document
      .querySelectorAll("[data-event-choice]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            resolveSpecialEvent(
              e,
              choices[Number(b.dataset.eventChoice)],
            )),
      );
  }

  function resolveSpecialEvent(e, c) {
    const scaledEffects = { ...c[2] };
    if ((scaledEffects.money || 0) < 0) {
      const eventScale = [1.15, 1.65, 2.35, 3.2, 4.3, 5.8][state.phase] * (state.role === "buzzer" ? 1.3 : .85);
      scaledEffects.money = Math.round((scaledEffects.money * eventScale) / 1000000) * 1000000;
    }
    applyEffects(scaledEffects);
    const meta = c[4] || {};
    state.eventOutcomeProfile = state.eventOutcomeProfile || { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    state.eventOutcomeProfile[meta.outlook || "neutral"] = (state.eventOutcomeProfile[meta.outlook || "neutral"] || 0) + 1;
    let legacyNote = "";
    if (meta.fufuMode) {
      state.fufuArchive = {
        mode: meta.fufuMode,
        role: state.role,
        choice: c[0],
        phase: state.phase,
        day: state.day,
      };
    }
    if (e.id === "fufufafa-return") {
      const mode = state.fufuArchive?.mode || "ignored";
      const legacyEffects = {
        verified: { credibility: 4, integrity: 3, heat: -2 },
        principled: { credibility: 5, integrity: 5, democracy: 3 },
        weaponized: { credibility: -5, integrity: -4, heat: 7 },
        buried: { credibility: -3, heat: 5 },
        deferred: { credibility: 1, stress: 2 },
        ignored: { stress: 2 },
      }[mode];
      if (legacyEffects) applyEffects(legacyEffects);
      state.fufuTwistResolved = true;
      legacyNote = {
        verified: "Karena dulu kamu hati-hati pada identitas, arsipmu sekarang punya bobot lebih besar.",
        principled: "Fokusmu pada perilaku dan etika membuat plot twist tidak berubah menjadi doxing.",
        weaponized: "Overclaim lama kembali sebagai ricochet kredibilitas.",
        buried: "Upaya mengubur isu membuat kemunculannya kembali terasa lebih mahal.",
        deferred: "Kamu menunda kesimpulan dan menyimpan rantai bukti. Hasilnya tidak spektakuler, tetapi tidak ikut menambah tuduhan palsu.",
        ignored: "Save lama tidak menyimpan keputusan 2024; timeline memberi konsekuensi netral.",
      }[mode];
    }
    const queuedRipple = queueNarrativeRipple(e, c, meta);
    state.seenEvents.push(e.id);
    state.eventHistory.push({
      id: e.id,
      choice: c[0],
      strategy: meta.strategy,
      outlook: meta.outlook,
      phase: state.phase,
      after: e.after,
      pendingConsequenceId: queuedRipple?.id || null,
      consequences: [],
    });
    state.career += Math.max(
      1,
      Math.round(Math.abs(scaledEffects.reach || 0) / 3),
    );
    state.comments.unshift(
      makeComment(meta.outlook === "positive" ? "good" : meta.outlook === "negative" ? "bad" : "neutral", c[3], {
        persona: e.id.startsWith("fufufafa") ? "forumGhost" : undefined,
      }),
    );
    state.postMetrics.views += rnd(120000, 900000) * (state.phase + 1);
    state.postMetrics.likes += rnd(8000, 85000) * (state.phase + 1);
    state.postMetrics.reposts += rnd(2500, 34000) * (state.phase + 1);
    state.postMetrics.replies += rnd(1500, 18000) * (state.phase + 1);
    state.lastImpact = {
      organic: clamp(55 + (scaledEffects.integrity || 0), 10, 88),
      coordinated: clamp(20 - (scaledEffects.integrity || 0), 4, 65),
      undecided: clamp(25 + Math.round((scaledEffects.heat || 0) / 2), 8, 60),
      label: c[0],
    };
    if (state.money < 0) {
      saveGame(true);
      showBankruptcyCrisis(`SPECIAL EVENT ${e.title.toUpperCase()} MENGHABISKAN KAS`);
      return;
    }
    $("#modalContent").innerHTML =
      `<span class="special-ribbon">EVENT RESOLVED • ${eventOutlookLabels[meta.outlook] || "NETRAL"}</span><h2>${e.icon} ${e.title}</h2><div class="event-result"><b>${meta.strategy} — ${c[0]}</b><p>${c[1]}</p><p><b>Dampak timeline sekarang:</b> ${c[3]}</p>${legacyNote ? `<div class="legacy-signal"><b>EFEK JEJAK DIGITAL:</b> ${legacyNote}</div>` : ""}</div><div class="choice-impact-preview">${eventEffectPreview(scaledEffects)}</div>${queuedRipple ? `<div class="pending-consequence"><b>⏳ KONSEKUENSI BELUM SELESAI</b><br>Akan diuji pada <b>${timelineLabel(queuedRipple.dueIndex)}</b>. ${meta.delayed.hint}<br>Keadaanmu pada saat itu—bukan hanya niatmu sekarang—menentukan cabang akibat berikutnya.</div>` : ""}<button class="btn" id="eventContinue">Lanjutkan Kronik</button>`;
    $("#eventContinue").onclick = continueAfterDay;
    render();
    saveGame(true);
  }

  function castEntries(group = "power") {
    const role = group === "power" ? "buzzer" : "aktivis";
    const entries = new Map();
    cast[group].forEach((item) => {
      entries.set(item[1], {
        icon: item[0],
        name: item[1],
        bio: item[2],
        note: item[3] === "Sepenuhnya fiktif."
          ? item[3]
          : "Parodi-komposit. Referensinya dibaca dari konteks, bukan dari nama literal.",
        phases: [],
      });
    });
    (phaseRosters[role] || []).forEach((roster, phase) => {
      roster.forEach((character) => {
        const entry = entries.get(character.name) || {
          icon: character.icon,
          name: character.name,
          bio: character.bio,
          note: `Roster ${character.role.toLowerCase()} yang baru disinkronkan dari timeline aktif.`,
          phases: [],
        };
        if (!entry.phases.includes(phase + 1)) entry.phases.push(phase + 1);
        entries.set(character.name, entry);
      });
    });
    (roleData[role]?.team || []).forEach((member) => {
      if (!entries.has(member[1])) {
        entries.set(member[1], {
          icon: member[0],
          name: member[1],
          bio: member[2],
          note: "Tim inti yang hadir sepanjang jalur permainan.",
          phases: [],
        });
      }
    });
    return [...entries.values()].sort((a, b) => {
      const aPhase = a.phases[0] || 99;
      const bPhase = b.phases[0] || 99;
      return aPhase - bPhase || a.name.localeCompare(b.name, "id");
    });
  }
  function showCast(group = "power") {
    const entries = castEntries(group);
    $("#modalContent").innerHTML =
      `<h2>Tokoh Republik Timeline</h2><p>Daftar ini disinkronkan otomatis dengan seluruh roster aktif. Semua nama adalah plesetan atau karakter komposit: cukup jauh dari nama asli, tetapi konteks satirnya tetap terbaca.</p><div class="cast-tabs"><button class="cast-tab ${group === "power" ? "active" : ""}" data-cast="power">Gemoyverse</button><button class="cast-tab ${group === "activist" ? "active" : ""}" data-cast="activist">Aktivis & Influencer</button></div><div class="roster-balance-note">${entries.length} TOKOH • KATALOG + ROSTER ENAM FASE</div><div class="cast-grid">${entries.map((entry) => `<div class="cast-card"><b>${entry.icon} ${entry.name}</b><small>${entry.bio}</small><div class="real-note">${entry.note}</div>${entry.phases.length ? `<div class="phase-list">${entry.phases.map((phase) => `<span>FASE ${phase}</span>`).join("")}</div>` : ""}</div>`).join("")}</div><button class="btn" id="closeCast" style="margin-top:14px">Tutup</button>`;
    $("#modal").classList.remove("hidden");
    document
      .querySelectorAll("[data-cast]")
      .forEach((b) => (b.onclick = () => showCast(b.dataset.cast)));
    $("#closeCast").onclick = () => $("#modal").classList.add("hidden");
  }

  function showPromotion() {
    const choices = promotionChoices[state.role][state.phase];
    $("#modalContent").innerHTML =
      `<h2>Promosi atau Kooptasi?</h2><p>Kamu menyelesaikan <b>${currentPhase().name}</b>. Pilih jalur berikutnya. Tidak ada skill tree yang netral; setiap keahlian membentuk siapa yang kamu dengar dan siapa yang mulai mengundangmu makan siang.</p><div class="choice-grid">${choices.map((c, i) => `<button class="choice-card" data-promo="${i}"><h3>${c.icon} ${c.name}</h3><small>${c.text || c.desc}</small></button>`).join("")}</div>`;
    $("#modal").classList.remove("hidden");
    document
      .querySelectorAll("[data-promo]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            selectPromotion(choices[Number(b.dataset.promo)])),
      );
  }
  function selectPromotion(c) {
    state.specialties.push(c.spec);
    Object.entries(c.boost).forEach(([k, v]) => {
      if (k === "career") state.career += v;
      else if (k === "money") state.money += v;
      else state[k] = clamp(state[k] + v);
    });
    state.abilityBuffs = [];
    state.trendReveal = 0;
    state.phase++;
    state.day = 1;
    state.money += state.role === "buzzer"
      ? Math.round(1100000000 * (1 + state.phase * 0.48))
      : Math.round(90000000 * (1 + state.phase * 0.22));
    $("#modal").classList.add("hidden");
    showPhaseIntro(false);
    render();
  }
  function showGlossary() {
    $("#modalContent").innerHTML =
      `<h2>Kamus Republik Timeline</h2>${glossary.map((g) => `<div class="fact-card"><h4>${g[0]}</h4><p>${g[1]}</p></div>`).join("")}<button class="btn" id="closeModal">Tutup</button>`;
    $("#modal").classList.remove("hidden");
    $("#closeModal").onclick = () => $("#modal").classList.add("hidden");
  }

  function showCareer() {
    const path = state.specialties.length
        ? state.specialties
            .map((s, i) => `<li>Tahun ${i + 2}: <b>${s}</b></li>`)
            .join("")
        : "<li>Belum ada promosi. Nikmati masa ketika idealisme belum punya kartu nama.</li>",
      events = state.eventHistory.length
        ? state.eventHistory
            .map(
              (e) =>
                `<li><b>${specialEvents.find((x) => x.id === e.id)?.title || e.id}</b>: ${e.strategy ? `${e.strategy} — ` : ""}${e.choice}${e.outlook ? ` <span class="handle">${e.outlook.toUpperCase()}</span>` : ""}${(e.consequences || []).length ? `<ul>${e.consequences.map(c => `<li>↳ ${c.title} • Fase ${c.phase + 1}, bulan ${c.day}</li>`).join("")}</ul>` : ""}</li>`,
            )
            .join("")
        : "<li>Belum ada special event yang dilewati.</li>",
      pendingRipples = (state.narrativeRipples || []).length
        ? (state.narrativeRipples || []).map(r => `<li><b>${timelineLabel(r.dueIndex)}</b>: ${r.eventTitle} — ${r.delayed.hint}</li>`).join("")
        : "<li>Tidak ada konsekuensi tertunda yang sedang menunggu kondisi timeline.</li>",
      crew = (state.abilityLog || []).length
        ? state.abilityLog
            .map(
              (a) =>
                `<li>Fase ${a.phase + 1}, bulan ${a.day}: <b>${a.character}</b> — ${a.ability}</li>`,
            )
            .join("")
        : "<li>Belum ada crew ability yang dipakai. Mereka masih menatapmu dari sidebar.</li>";
    $("#modalContent").innerHTML =
      `<h2>Riwayat Karier</h2><div class="career-line"><b>${state.role === "buzzer" ? "Dari relawan menuju mesin kekuasaan" : "Dari utas menuju institusi publik"}</b><ul>${path}</ul></div><p>Poin karier: <b>${state.career}</b>. Angka ini ngukur seberapa jauh kamu naik, bukan seberapa sehat republiknya.</p><div class="career-line"><b>Jejak Special Event</b><ul>${events}</ul></div><div class="career-line"><b>⏳ Konsekuensi yang Masih Menunggu</b><ul>${pendingRipples}</ul></div><div class="crew-history"><b>⚡ Crew Ability yang Sudah Dipakai</b><ul>${crew}</ul></div><button class="btn" id="closeCareer">Tutup</button>`;
    $("#modal").classList.remove("hidden");
    $("#closeCareer").onclick = () => $("#modal").classList.add("hidden");
  }
  function endingData(crashed) {
    if (crashed) {
      if (state.stress >= 100)
        return [
          "BURNOUT NASIONAL",
          "Kamu menjadi infrastruktur tunggal bagi seluruh gerakan atau operasi. Saat kamu tumbang, semua orang baru sadar regenerasi bukan agenda tambahan.",
        ];
      if (state.credibility <= 0)
        return [
          "AKUN JADI MUSEUM",
          "Setiap unggahanmu dibalas “berapa rate?” atau “sumbernya mana?”. Bahkan ucapan belasungkawa dianggap framing.",
        ];
      return [
        "OPERASI KEHABISAN SALDO",
        "Politik digital ternyata tetap membutuhkan listrik, makan, dan orang yang dibayar tepat waktu.",
      ];
    }
    if (state.role === "buzzer") {
      if (
        state.specialties.includes("Pembelot profesional") &&
        state.integrity > 65
      )
        return [
          "PEMBELOT DENGAN FOLDER ZIP",
          "Kamu membuka arsip koordinasi, kontrak, dan brief yang seharusnya sejak awal menjadi informasi publik. Akses hilang; tidurmu membaik.",
        ];
      if (state.democracy < 25 && state.reach > 80)
        return [
          "MENTERI TANPA KEMENTERIAN BIDANG MENANG KOMENTAR",
          "Kamu memenangkan semua tagar dan mewarisi ruang publik yang tidak lagi dipercaya siapa pun, termasuk oleh pemenangnya.",
        ];
      if (
        state.specialties.includes("Loyalis final") &&
        state.career > 75
      )
        return [
          "UTUSAN KHUSUS URUSAN TRENDING",
          "Tidak ada yang benar-benar tahu mandatmu, tetapi setiap acara punya kursi depan, kamera, dan tanda pagar resmi.",
        ];
      if (state.integrity > 72 && state.credibility > 65)
        return [
          "HUMAS YANG MEMPERLAKUKAN WARGA DEWASA",
          "Kamu gagal menjadi buzzer sempurna karena terlalu sering membuka data, mengakui masalah, dan membiarkan kritik hidup. Aneh, kepercayaan justru naik.",
        ];
      if (state.reach > 82 && state.integrity < 35)
        return [
          "SULTAN ENGAGEMENT LIMA REZIM",
          "Ideologimu fleksibel, paket narasimu modular, dan invoice-mu abadi. Sejarah tidak mengingat pendirianmu karena tidak pernah menemukannya.",
        ];
      return [
        "KONSULTAN ABADI REPUBLIK TIMELINE",
        "Pemerintah berganti, warna deck presentasi berubah, tetapi satu kalimat bertahan: “masalahnya hanya komunikasi.”",
      ];
    }
    if (state.integrity < 38 && state.reach > 78)
      return [
        "BUZZER OPOSISI PREMIUM",
        "Kamu melawan manipulasi dengan manipulasi yang memakai tote bag. Algoritma tidak melihat perbedaan; demokrasi juga mulai kesulitan.",
      ];
    if (
      state.specialties.includes("Selebritas oposisi") &&
      state.reach > 82
    )
      return [
        "AKTIVIS PRIME TIME, GERAKAN OFFLINE",
        "Wajahmu dikenal nasional. Organisasi tidak punya regenerasi, riset tidak punya editor, dan semua undangan meminta “tokoh utamanya”.",
      ];
    if (
      state.specialties.includes("Penjaga arsip") &&
      state.democracy > 70
    )
      return [
        "ARSIP BERJALAN REPUBLIK",
        "Kamu tidak selalu viral, tetapi dokumen tersimpan, metode diwariskan, dan generasi berikutnya tidak perlu memulai dari ingatan yang dihapus.",
      ];
    if (
      state.specialties.includes("Gerakan kolektif") &&
      state.network > 75
    )
      return [
        "GERAKAN TANPA WAJAH, DAMPAK TERLIHAT",
        "Nama pribadimu tidak menjadi merek nasional. Justru itu keberhasilannya: seribu orang dapat melanjutkan kerja tanpa meminta izin pada satu akun.",
      ];
    if (
      state.specialties.includes("Jaringan produksi") &&
      state.credibility > 70
    )
      return [
        "SUTRADARA YANG MEMBUAT KEKUASAAN SULIT TIDUR",
        "Film tidak menjatuhkan rezim dalam semalam. Ia melakukan hal yang lebih berbahaya: menjaga bukti tetap hidup ketika narasi resmi berganti.",
      ];
    if (
      state.specialties.includes("Pakar hukum") &&
      state.credibility > 75
    )
      return [
        "PAKAR KONSTITUSI LEVEL GRUP KELUARGA",
        "Kamu menjelaskan masalah tata negara tanpa membuat warga merasa sedang dihukum membaca jurnal. Kekuasaan mulai hafal namamu; ibumu masih meminta pekerjaan tetap.",
      ];
    return [
      "DATA MENANG PELAN",
      "Tidak ada montage kemenangan. Hanya dokumen, rapat, koreksi, aksi kecil, dan warga yang sedikit lebih sulit dibohongi.",
    ];
  }
  function legacyState() {
    const civic = Math.round(
        (state.integrity +
          state.credibility +
          state.democracy +
          state.network) /
          4,
      ),
      noise = Math.round(
        (state.reach + state.heat + (100 - state.integrity)) / 3,
      );
    if (civic >= 72 && noise < 70)
      return [
        "RUANG PUBLIK TAHAN BANTING",
        "Pemilu berikutnya berlangsung di republik yang masih ribut, tetapi dokumen hidup, koreksi diterima, dan warga tidak sepenuhnya bergantung pada satu tokoh.",
      ];
    if (state.democracy < 35)
      return [
        "PEMILU RAMAI, PILIHAN MENYEMPIT",
        "Surat suara tetap banyak warna, tetapi rasa aman untuk mengkritik dan kemampuan institusi mengoreksi kekuasaan telah menyusut.",
      ];
    if (noise > 78)
      return [
        "REPUBLIK VIRAL, WARGA LELAH",
        "Semua orang tahu tagar terbaru. Sedikit yang masih percaya bahwa bukti dapat mengalahkan identitas dan volume.",
      ];
    return [
      "DEMOKRASI DALAM MODE NEGOSIASI",
      "Tidak runtuh, tidak selesai. Institusi, elite, gerakan, dan warga membawa warisan campuran ke kotak suara berikutnya.",
    ];
  }
  function eventLegacySummary() {
    const profile = state.eventOutcomeProfile || {}, resolved = state.resolvedRipples || [];
    const good = resolved.filter(r => r.tone === "good").length, bad = resolved.filter(r => r.tone === "bad").length;
    if ((profile.negative || 0) > (profile.positive || 0) + (profile.mixed || 0) && bad >= good)
      return { title: "KEPUTUSAN CEPAT, TAGIHAN PANJANG", text: `${bad} akibat tertunda berbalik negatif. Banyak event dimenangkan sebagai headline lalu kembali sebagai krisis kepercayaan.` };
    if ((profile.positive || 0) >= (profile.negative || 0) + 3 && good > bad)
      return { title: "PROSEDUR MENJADI INFRASTRUKTUR", text: `${good} akibat tertunda menghasilkan dividen kepercayaan. Keputusanmu tidak selalu viral, tetapi beberapa mekanisme koreksi bertahan.` };
    if ((profile.mixed || 0) + (profile.neutral || 0) >= Math.max(3, (profile.positive || 0)))
      return { title: "REPUBLIK KOMPROMI BERSYARAT", text: `${resolved.length} konsekuensi telah jatuh. Sebagian celah dipakai untuk koreksi, sebagian lagi berubah menjadi foto bersama dan notulen yang terlambat.` };
    return { title: "JEJAK EVENT BELUM PUNYA SATU WARNA", text: `${resolved.length} konsekuensi tertunda ikut membentuk statistik akhir; hasilnya campuran antara kapasitas, momentum, dan pilihan yang kamu buat beberapa bulan sebelumnya.` };
  }
  function showElectionNight(report = state.finalReport) {
    report = report || window.PNEndingSystem?.evaluate(state);
    const [world, worldText] = legacyState(),
      election = report.election,
      eventLegacy = eventLegacySummary();
    $("#modalContent").classList.add("final-modal");
    $("#modalContent").innerHTML =
      `<div class="finale-stage election-finale"><div class="finale-content"><section class="finale-copy"><span class="finale-kicker">HASIL PEMILU REPUBLIK TIMELINE • 2029</span><h2>${election.headline}</h2><p>${election.reflection}</p><div class="election-context"><b>${world}</b><br>${worldText}</div></section><aside class="finale-visual" aria-label="Hasil kandidat Republik Timeline"><div class="finale-visual-label">PILIHANMU IKUT MENULIS PAPAN SKOR</div><div class="ballot-scene"><div class="ballot-box"><div class="ballot-paper"></div></div></div></aside><div class="candidate-results">${election.candidates.map((candidate, index) => `<div class="candidate-result ${index === 0 ? "winner" : ""}"><span>${candidate.icon}</span><div><b>${candidate.name}</b><small>${candidate.bloc}</small></div><strong>${candidate.vote}%</strong></div>`).join("")}</div><div class="open-ending">${election.margin <= 3 ? "MENANG TIPIS • ADMIN QUICK COUNT MULAI SALING BLOKIR" : "PEMENANG JELAS • KOALISI BARU LANGSUNG MENGAKU PALING BERJASA"}<br><small>Ini hasil mekanik game, bukan prediksi pemilu dunia nyata.</small></div><div class="legacy-grid"><div class="legacy-card"><b>Pangkat Akhir</b>${report.performance.title}<br><small>${report.performance.grade}</small></div><div class="legacy-card"><b>Moral ${report.morality.score}/100</b>${report.morality.title}</div><div class="legacy-card"><b>Jejak Keputusan</b>${eventLegacy.title}<br><small>${eventLegacy.text}</small></div><div class="legacy-card"><b>Keuangan</b>${report.finance.title}<br><small>Kas ${formatMoney(report.finance.cash)} • utang ${formatMoney(report.finance.debt)}</small></div></div><div class="finale-actions"><button class="btn" id="newCycle">Mulai Siklus Baru</button><button class="btn secondary" id="closeEnd">Lihat Timeline Terakhir</button></div></div></div>`;
    $("#newCycle").onclick = () => {
      const legacy = {
        role: state.role,
        integrity: state.integrity,
        credibility: state.credibility,
        democracy: state.democracy,
        network: state.network,
      };
      startFreshCycle();
      flash(
        `WARISAN ${legacy.role.toUpperCase()} TERSIMPAN DI INGATAN, BUKAN DI KOTAK SUARA`,
      );
    };
    $("#closeEnd").onclick = () => {
      $("#modal").classList.add("hidden");
      $("#modalContent").classList.remove("final-modal");
    };
  }
  function showEnding(crashed = false) {
    $("#modalContent").classList.remove("final-modal");
    state.finished = true;
    const report = window.PNEndingSystem?.evaluate(state);
    if (!report) throw new Error("Ending evaluator gagal dimuat.");
    const crashDetail = crashed ? endingData(true) : null,
      eventLegacy = eventLegacySummary(),
      modeLabel = state.gameMode === "free" ? "MODE BEBAS" : "ENAM TAHUN • 72 BULAN";
    state.finalReport = report;
    clearSave();
    $("#modalContent").innerHTML =
      `<div class="finale-stage"><div class="finale-content"><span class="finale-kicker">${modeLabel} • ${state.eventHistory.length} EVENT • ${(state.crisisHistory || []).length} KRISIS • ${state.bailoutCount || 0} BAILOUT</span>${crashDetail ? `<div class="crash-verdict"><b>${crashDetail[0]}</b><br>${crashDetail[1]}</div>` : ""}<h2>${report.performance.title}</h2><p>${report.performance.text}</p><div class="report-grade"><span>NILAI KINERJA</span><strong>${report.performance.score}/100</strong><b>${report.performance.grade}</b></div><div class="ending-score"><div><strong>${Math.round(state.reach)}</strong>Jangkauan</div><div><strong>${report.performance.civic}</strong>Kerja Sipil</div><div><strong>${report.morality.score}</strong>Moral</div><div><strong>${report.finance.solvency.toFixed(0)}</strong>Solvabilitas</div><div><strong>${formatMoney(report.finance.debt)}</strong>Utang</div></div><div class="report-grid"><div class="report-card moral"><b>🧭 ${report.morality.title}</b><p>${report.morality.text}</p>${state.role === "buzzer" ? `<small>Kas akhir ${formatMoney(report.finance.cash)} ikut dihitung sebagai tekanan moral. Saldo besar tidak otomatis salah; saldo besar tanpa kuitansi dan integritas adalah cerita lain.</small>` : ""}</div><div class="report-card finance"><b>💳 ${report.finance.title}</b><p>${report.finance.text}</p><small>${report.finance.missed} telat bayar • ${report.finance.bailouts} bailout • beban utang ${report.finance.debtLoad.toFixed(0)}% dari limit</small></div><div class="report-card decisions"><b>🗂️ PILIHANMU, BUKAN CUMA STAT AKHIR</b><p>${report.decisions.positive} keputusan positif, ${report.decisions.negative} keputusan negatif, ${report.decisions.goodRipples} akibat baik, dan ${report.decisions.badRipples} akibat buruk.</p><small>Strategi substantif ${report.decisions.substantive} • strategi panggung ${report.decisions.spectacle}</small></div><div class="report-card election"><b>🗳️ EFEK KE PEMILU 2029</b><p>${report.election.headline}</p><small>${report.election.winner.reason}</small></div></div><div class="lesson"><b>${eventLegacy.title}</b><br>${eventLegacy.text}</div><p><b>Republik sudah menilai kerja, moral, utang, dan pilihanmu.</b> Sekarang buka hasil lengkap kotak suara.</p><button class="btn" id="electionNight">Buka Hasil Pemilu 2029</button></div></div>`;
    $("#modal").classList.remove("hidden");
    $("#electionNight").onclick = () => showElectionNight(report);
    beep(110, 0.25);
  }
  function returnToMainMenu(saveCurrent = false) {
    if (saveCurrent) saveGame(true);
    $("#modal").classList.add("hidden");
    $("#gameScreen").classList.add("hidden");
    $("#startScreen").classList.remove("hidden");
    updateBreakingTicker(true);
    updateContinuePanel();
    syncQuizToggles();
    syncGameModeControls();
    flash(
      saveCurrent
        ? "PROGRES DISIMPAN • KEMBALI KE MENU"
        : "KEMBALI KE MENU • AUTOSAVE TETAP AMAN",
    );
  }
  function showMainMenuPrompt() {
    const existing = getSave();
    $("#modalContent").innerHTML =
      `<h2>Kembali ke Menu Utama?</h2><div class="career-line"><b>Progresmu tidak akan dihapus.</b><p>Pilih apakah keadaan permainan saat ini perlu disimpan sekali lagi sebelum kembali. Bila tidak, autosave terakhir tetap tersedia di menu utama.</p></div><div class="btn-row"><button class="btn" id="saveAndMenu">Simpan & Kembali</button><button class="btn secondary" id="menuWithoutSave">Kembali Tanpa Simpan Manual</button><button class="btn secondary" id="cancelMenu">Batal</button></div>${existing ? '<p style="font-size:11px;color:var(--muted);margin-top:12px">Save sebelumnya tetap aman sampai kamu menghapusnya sendiri dari menu utama.</p>' : ""}`;
    $("#modal").classList.remove("hidden");
    $("#saveAndMenu").onclick = () => returnToMainMenu(true);
    $("#menuWithoutSave").onclick = () => returnToMainMenu(false);
    $("#cancelMenu").onclick = () => $("#modal").classList.add("hidden");
  }
  function startFreshCycle() {
    clearSave();
    $("#modal").classList.add("hidden");
    $("#gameScreen").classList.add("hidden");
    $("#startScreen").classList.remove("hidden");
    updateBreakingTicker(true);
    Object.assign(state, {
      role: null,
      phase: 0,
      day: 1,
      finished: false,
      finalReport: null,
      runSeed: 0,
      specialties: [],
      history: [],
      career: 0,
      quizDeck: [],
      quizPositionDeck: [],
      quizIndex: 0,
      quizCorrect: 0,
      quizAnswered: 0,
      postMetrics: { reposts: 0, likes: 0, replies: 0, views: 0 },
      comments: [],
      seenEvents: [],
      eventHistory: [],
      lastImpact: null,
      crisisHistory: [],
      abilityUses: {},
      abilityBuffs: [],
      abilityLog: [],
      trendReveal: 0,
      commentMemory: [],
      npcReplyMemory: [],
      fufuArchive: null,
      fufuTwistResolved: false,
      debt: 0,
      loanRate: 0,
      bailoutCount: 0,
      missedPayments: 0,
      bankruptcyHistory: [],
      monthlyActionVariants: {},
      phaseActionVariants: {},
      lastActionVariant: 0,
      followUpCards: [],
      characterMatchLog: [],
      perfectMatches: 0,
      partialMatches: 0,
      crewMisfires: 0,
      narrativeRipples: [],
      resolvedRipples: [],
      currentRippleNotices: [],
      eventOutcomeProfile: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
    });
    syncQuizToggles();
    syncGameModeControls();
    updateContinuePanel();
  }
  const bind = (selector, event, handler) => {
    const el = $(selector);
    if (el) el[event] = handler;
    return el;
  };
  document.querySelectorAll(".role-card").forEach((c) => {
    c.onclick = () => chooseRole(c.dataset.role);
    c.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chooseRole(c.dataset.role);
      }
    };
  });
  bind("#endDayBtn", "onclick", endDay);
  bind("#glossaryBtn", "onclick", showGlossary);
  bind("#careerBtn", "onclick", showCareer);
  bind("#castBtn", "onclick", () => showCast("power"));
  bind("#freeJumpBtn", "onclick", showFreePhaseJump);
  document
    .querySelectorAll("[data-metric]")
    .forEach(
      (b) => (b.onclick = () => showMetricDetails(b.dataset.metric)),
    );
  bind("#saveBtn", "onclick", () => saveGame(false));
  bind("#financeBtn", "onclick", showDebtManagement);
  bind("#continueBtn", "onclick", continueGame);
  bind("#deleteSaveBtn", "onclick", () => {
    clearSave();
    flash("SAVE DIHAPUS");
  });
  bind("#resetBtn", "onclick", showMainMenuPrompt);
  bind("#soundToggle", "onchange", (e) => {
    state.sound = e.target.checked;
    beep(520, 0.05);
  });
  bind("#quizStartToggle", "onchange", (e) =>
    setQuizEnabled(e.target.checked, false),
  );
  bind("#quizGameToggle", "onchange", (e) =>
    setQuizEnabled(e.target.checked, true),
  );
  bind("#quizStartOn", "onclick", () => setQuizEnabled(true, false));
  bind("#quizStartOff", "onclick", () => setQuizEnabled(false, false));
  bind("#chronicleModeBtn", "onclick", () => setGameMode("chronicle"));
  bind("#freeModeBtn", "onclick", () => setGameMode("free"));
  document.querySelectorAll("[data-free-phase]").forEach((button) => {
    button.onclick = () => setFreeStartPhase(Number(button.dataset.freePhase));
  });
  bind("#quizGameButton", "onclick", () =>
    setQuizEnabled(!state.quizEnabled, true),
  );
  syncQuizToggles();
  syncGameModeControls();
  updateContinuePanel();
})();

document.documentElement.dataset.gameReady = "true";
