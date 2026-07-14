/**
 * Perang Narasi — performance, morality, finance, and election evaluator.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
  "use strict";

  const clamp = (value, min = 0, max = 100) =>
    Math.max(min, Math.min(max, Number(value) || 0));
  const average = (...values) =>
    values.reduce((total, value) => total + clamp(value), 0) /
    Math.max(1, values.length);
  const actionId = (entry) => String(entry?.action || "").split(":").at(-1);
  const formatMoney = (value) => {
    const amount = Math.max(0, Number(value) || 0);
    if (amount >= 1e12) return `Rp${(amount / 1e12).toFixed(1)} T`;
    if (amount >= 1e9) return `Rp${(amount / 1e9).toFixed(1)} M`;
    if (amount >= 1e6) return `Rp${Math.round(amount / 1e6)} jt`;
    return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
  };

  const SUBSTANTIVE = new Set([
    "data",
    "transparency",
    "context",
    "empathy",
    "network",
    "law",
    "film",
  ]);
  const SPECTACLE = new Set([
    "meme",
    "patriot",
    "whatabout",
    "endorse",
    "podcast",
    "attack",
    "concert",
  ]);

  function decisionProfile(state) {
    const history = state.history || [];
    const substantive = history.filter((entry) => SUBSTANTIVE.has(actionId(entry))).length;
    const spectacle = history.filter((entry) => SPECTACLE.has(actionId(entry))).length;
    const event = state.eventOutcomeProfile || {};
    const consequences = state.resolvedRipples || [];
    const positive = Number(event.positive) || 0;
    const negative = Number(event.negative) || 0;
    const mixed = Number(event.mixed) || 0;
    const neutral = Number(event.neutral) || 0;
    const goodRipples = consequences.filter((entry) => entry.tone === "good").length;
    const badRipples = consequences.filter((entry) => entry.tone === "bad").length;
    const totalActions = substantive + spectacle;
    const substanceShare = totalActions
      ? (substantive / totalActions) * 100
      : average(state.integrity, state.credibility);
    const eventTotal = Math.max(1, positive + negative + mixed + neutral);
    const eventQuality = clamp(
      50 + ((positive - negative) / eventTotal) * 42 + ((goodRipples - badRipples) / Math.max(1, consequences.length)) * 28,
    );
    return {
      substantive,
      spectacle,
      substanceShare,
      positive,
      negative,
      mixed,
      neutral,
      goodRipples,
      badRipples,
      eventQuality,
    };
  }

  function financeReport(state) {
    const debt = Math.max(0, Number(state.debt) || 0);
    const cash = Math.max(0, Number(state.money) || 0);
    const phase = clamp(state.phase, 0, 5);
    const limit = state.role === "buzzer"
      ? 3500000000 * (phase + 1)
      : 550000000 * (phase + 1);
    const debtLoad = clamp((debt / Math.max(1, limit)) * 100);
    const missed = Math.max(0, Number(state.missedPayments) || 0);
    const bailouts = Math.max(0, Number(state.bailoutCount) || 0);
    const solvency = clamp(100 - debtLoad * 0.72 - missed * 9 - bailouts * 5);
    let title = "MERDEKA DARI CICILAN";
    let text = "Bendahara masih membalas chat. Ini pencapaian yang terlalu langka untuk dianggap biasa.";
    if (debtLoad > 70 || missed >= 3) {
      title = state.role === "buzzer" ? "PATRON KABUR, CICILAN TINGGAL" : "REVOLUSI PAYLATER";
      text = `Utang ${formatMoney(debt)} sudah bukan alat bantu; dia ikut duduk di rapat dan minta hak suara.`;
    } else if (debtLoad > 35 || missed > 0) {
      title = "BENDAHARA MULAI GHOSTING";
      text = `Utang ${formatMoney(debt)} masih bisa dibayar, tetapi setiap keputusan baru sudah terdengar seperti notifikasi jatuh tempo.`;
    } else if (debt > 0) {
      title = "UTANG MASIH BISA DIAJAK NGOBROL";
      text = `Ada tagihan ${formatMoney(debt)}, belum sampai membuat seluruh idealisme atau propaganda masuk daftar agunan.`;
    }
    return { debt, cash, limit, debtLoad, solvency, missed, bailouts, title, text };
  }

  function moralityReport(state, decisions, finance) {
    const civicBase = average(state.integrity, state.credibility, state.democracy);
    const cashBillions = finance.cash / 1e9;
    const idleCashPressure = state.role === "buzzer"
      ? clamp(((cashBillions - 4) / 22) * 100)
      : 0;
    const score = clamp(
      civicBase * 0.64 +
      decisions.eventQuality * 0.2 +
      decisions.substanceShare * 0.16 -
      idleCashPressure * (0.18 + (100 - clamp(state.integrity)) / 260),
    );
    let title;
    let text;
    if (state.role !== "buzzer") {
      title = score >= 75
        ? "MASIH PUNYA MALU DAN PASSWORD DONOR"
        : score >= 48
          ? "NIAT BAIK, EGO MASIH IKUT RAPAT"
          : "MELAWAN MANIPULASI DENGAN MANIPULASI";
      text = score >= 75
        ? "Kamu cukup sering membuka sumber, donor, dan kesalahan sendiri. Gerakan tidak otomatis suci hanya karena logonya hitam-putih."
        : score >= 48
          ? "Beberapa pilihan membela warga; beberapa lainnya cuma membela harga diri akun."
          : "Kamu menang fanwar dan kehilangan alasan kenapa gerakan ini dimulai.";
      return { score: Math.round(score), title, text, idleCashPressure: 0 };
    }

    if (finance.cash >= 18000000000 && score < 45) {
      title = "REKENING GENDUT, NURANI MODE HEMAT";
      text = `${formatMoney(finance.cash)} masih parkir di kas. Publik berhak bertanya: ini efisiensi, sisa invoice, atau uang yang lupa jalan pulang?`;
    } else if (finance.cash >= 9000000000) {
      title = "SULTAN SISA ANGGARAN";
      text = `${formatMoney(finance.cash)} tersisa. Saldo besar tidak otomatis korup, tetapi moralitas yang menolak kuitansi memang pantas dicurigai.`;
    } else if (score >= 72) {
      title = "HUMAS NEGARA YANG MASIH PUNYA MALU";
      text = "Kamu tetap bekerja untuk kuasa, tetapi tidak setiap pertanyaan dijawab dengan bendera, musuh asing, atau suara podium.";
    } else if (score >= 45) {
      title = "MORAL KONTRAK TAHUNAN";
      text = "Kadang kamu membuka data, kadang kamu membuka amplop brief. Prinsipmu hadir, cuma jam kerjanya tidak selalu jelas.";
    } else {
      title = "INVOICE LUNAS, RASA MALU TERTUNDA";
      text = "Engagement dibayar kontan. Kerusakan kepercayaan dicicil rakyat sampai pemilu berikutnya.";
    }
    return { score: Math.round(score), title, text, idleCashPressure: Math.round(idleCashPressure) };
  }

  function performanceReport(state, decisions, finance, morality) {
    const civic = average(state.integrity, state.credibility, state.democracy, state.network);
    const execution = clamp(
      (Number(state.career) || 0) * 0.55 +
      (Number(state.perfectMatches) || 0) * 2.5 -
      (Number(state.crewMisfires) || 0) * 2,
    );
    const literacy = state.quizAnswered
      ? clamp((state.quizCorrect / state.quizAnswered) * 100)
      : 55;
    const score = Math.round(clamp(
      civic * 0.38 +
      decisions.eventQuality * 0.22 +
      decisions.substanceShare * 0.12 +
      execution * 0.12 +
      finance.solvency * 0.11 +
      literacy * 0.05,
    ));
    const grade = score >= 88
      ? "S — SULIT DIBELI"
      : score >= 76
        ? "A — AMANAH, TUMBEN"
        : score >= 64
          ? "B — BISA DIPERTANGGUNGJAWABKAN"
          : score >= 50
            ? "C — CUKUP, JANGAN BESAR KEPALA"
            : score >= 36
              ? "D — DALIH LEBIH BANYAK DARI HASIL"
              : "E — ENGAGEMENT DOANG";

    let rank;
    if (state.role === "buzzer") {
      if (finance.debtLoad > 70) rank = ["BUZZER BONCOS, NEGARA IKUT NOMBOK", "Brief terus datang; patron, saldo, dan akal sehat sudah keluar grup."];
      else if (morality.score < 38 && finance.cash >= 12000000000) rank = ["SULTAN INVOICE, FAKIR NURANI", "Kamu bisa membeli trending topic, kecuali penjelasan masuk akal untuk saldo akhir."];
      else if (score >= 80 && morality.score >= 68) rank = ["HUMAS NEGARA YANG MEMPERLAKUKAN WARGA DEWASA", "Jarang berteriak, rajin membuka data, dan cukup waras untuk bilang pemerintah salah."];
      else if (clamp(state.reach) >= 82 && morality.score < 52) rank = ["KOMISARIS BAYANGAN URUSAN TRENDING", "Mandatmu tidak jelas, kursimu selalu ada, dan semua krisis dianggap kekurangan konten positif."];
      else if (score >= 62) rank = ["DIRJEN PENGELOLA KERIBUTAN", "Tidak semua masalah selesai, tetapi setidaknya dashboard dan notulen saling kenal."];
      else rank = ["STAFSUS OMON-OMON MADYA", "Pidato panjang, slogan tebal, hasil kerja masih minta perpanjangan waktu."];
    } else if (finance.debtLoad > 70) rank = ["REVOLUSIONER PAYLATER", "Kapitalisme belum tumbang; limit kreditmu duluan yang roboh."];
    else if (clamp(state.network) >= 78 && clamp(state.integrity) >= 72) rank = ["ARSIPARIS REPUBLIK ANTI-AMNESIA", "Tidak selalu viral, tetapi kebohongan harus kerja dua kali lebih keras karena dokumenmu masih hidup."];
    else if (clamp(state.reach) >= 82 && clamp(state.integrity) < 48) rank = ["SELEB OPOSISI CENTANG BIRU, BASIS CENTANG DUA", "Wajahmu ada di semua poster. Grup logistik masih menunggu balasan."];
    else if (clamp(state.stress) >= 86) rank = ["KETUA PANITIA BURNOUT NASIONAL", "Semua orang memanggilmu kawan. Tidak ada yang mengambil shift kedua."];
    else if (score >= 78) rank = ["KOORDINATOR WARGA KERAS KEPALA", "Kamu mengubah marah menjadi arsip, kas, jaringan, dan kerja setelah kamera pulang."];
    else if (score >= 58) rank = ["PENJAGA THREAD TINGKAT NASIONAL", "Utasmu kadang kepanjangan, tetapi sumbernya tidak kabur saat ditanya."];
    else rank = ["AKTIVIS QUOTE-TWEET MADYA", "Marahnya valid. Strateginya masih sering berhenti di tombol kirim."];

    return { score, grade, title: rank[0], text: rank[1], civic: Math.round(civic), execution: Math.round(execution), literacy: Math.round(literacy) };
  }

  function electionReport(state, decisions, finance, morality) {
    const reach = clamp(state.reach);
    const credibility = clamp(state.credibility);
    const integrity = clamp(state.integrity);
    const democracy = clamp(state.democracy);
    const network = clamp(state.network);
    const heat = clamp(state.heat);
    const eventTilt = decisions.eventQuality - 50;
    const roleBuzzer = state.role === "buzzer";
    const loyalist = (state.specialties || []).includes("Loyalis final");
    const defector = (state.specialties || []).includes("Pembelot profesional");

    const candidates = [
      {
        key: "continuity",
        icon: "🦅",
        name: "Pak Gemoyono — Lanjut, Saudara-Saudara",
        bloc: "Koalisi Lanjut Terus",
        score: 34 + reach * 0.14 + (100 - democracy) * 0.18 + (100 - integrity) * 0.1 + (roleBuzzer ? 9 : -2) + (loyalist ? 10 : 0) - (defector ? 12 : 0) - eventTilt * 0.12,
        reason: "Politik musuh bersama, mesin kekuasaan, dan nostalgia podium mendapat jalan paling lebar.",
      },
      {
        key: "reform",
        icon: "📚",
        name: "Mbak Reformasi Nggak Pakai Filter",
        bloc: "Koalisi Warga Masih Ingat",
        score: 22 + democracy * 0.25 + integrity * 0.2 + network * 0.17 + eventTilt * 0.22 + (!roleBuzzer ? 8 : 0) + (defector ? 7 : 0),
        reason: "Arsip, jaringan warga, dan keputusan yang masih bisa diperiksa mengalahkan sekadar volume.",
      },
      {
        key: "technocrat",
        icon: "📊",
        name: "Prof. Tengah-Tengah Tapi Punya Excel",
        bloc: "Aliansi Stabil Dulu",
        score: 28 + credibility * 0.23 + (100 - heat) * 0.12 + finance.solvency * 0.12 + decisions.mixed * 1.4 + decisions.neutral * 0.8,
        reason: "Pemilih capek fanwar dan memilih orang yang minimal tahu sel mana yang berisi rumus.",
      },
      {
        key: "wildcard",
        icon: "📱",
        name: "Bang Viral Dulu, Program Belakangan",
        bloc: "Partai FYP Bersatu",
        score: 19 + heat * 0.22 + reach * 0.13 + (100 - credibility) * 0.13 + decisions.negative * 1.8 + decisions.spectacle * 0.35,
        reason: "Ruang publik terlalu panas; kandidat paling berisik terlihat seperti satu-satunya orang yang bergerak.",
      },
    ];

    const weights = candidates.map((candidate) => Math.pow(Math.max(8, candidate.score), 1.42));
    const total = weights.reduce((sum, value) => sum + value, 0);
    const exactVotes = weights.map((weight) => (weight / total) * 100);
    const wholeVotes = exactVotes.map(Math.floor);
    let remaining = 100 - wholeVotes.reduce((sum, value) => sum + value, 0);
    exactVotes
      .map((value, index) => ({ index, remainder: value - wholeVotes[index] }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
      .slice(0, remaining)
      .forEach(({ index }) => { wholeVotes[index] += 1; });
    candidates.forEach((candidate, index) => { candidate.vote = wholeVotes[index]; });
    candidates.sort((a, b) => b.vote - a.vote || b.score - a.score);
    const winner = candidates[0];
    return {
      winner,
      candidates,
      headline: `${winner.icon} ${winner.name.toUpperCase()} MENANG ${winner.vote}%`,
      reflection: `${winner.reason} Hasil ini bukan ramalan dunia nyata; ini cermin mekanis dari pilihanmu di Republik Timeline.`,
      margin: winner.vote - candidates[1].vote,
    };
  }

  function evaluate(state) {
    const decisions = decisionProfile(state);
    const finance = financeReport(state);
    const morality = moralityReport(state, decisions, finance);
    const performance = performanceReport(state, decisions, finance, morality);
    const election = electionReport(state, decisions, finance, morality);
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      role: state.role,
      performance,
      morality,
      finance,
      decisions,
      election,
    };
  }

  window.PNEndingSystem = Object.freeze({ evaluate });
})();
