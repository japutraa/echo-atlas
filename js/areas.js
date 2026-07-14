/*
 * Echo Atlas
 * Copyright (C) 2026 Adrian Janitra Putra
 * SPDX-License-Identifier: GPL-3.0-only
 */

(() => {
  const areas = [
        {
          id: "lumen",
          glyph: "I",
          title: "Lumen",
          subtitle: "Diatonis · cahaya pertama",
          mapLabel: "Diatonis",
          scaleName: "Mayor diatonis",
          scaleText: "Interval yang terang dan familiar. Perjalanan dimulai dari jarak nada yang mudah dibaca.",
          noteLabels: ["1", "2", "3", "4", "5", "6", "7"],
          cents: [0, 200, 400, 500, 700, 900, 1100],
          freeScales: [
            { name: "Mayor / Ionian", text: "Mayor diatonis lengkap: terang, stabil, dan familiar.", labels: ["1", "2", "3", "4", "5", "6", "7"], cents: [0, 200, 400, 500, 700, 900, 1100] },
            { name: "Minor natural / Aeolian", text: "Versi minor dengan derajat ketiga, keenam, dan ketujuh yang lebih rendah.", labels: ["1", "2", "♭3", "4", "5", "♭6", "♭7"], cents: [0, 200, 300, 500, 700, 800, 1000] }
          ],
          root: 220,
          instrument: "glass",
          colors: {
            accent: "213, 224, 255",
            accent2: "134, 159, 210",
            orb: "202, 216, 255",
            a: "rgba(51, 63, 102, .30)",
            b: "rgba(23, 40, 62, .16)"
          },
          lengths: [3, 4, 5, 6],
          speeds: [720, 660, 610, 560],
          mode: ["normal", "normal", "normal", "normal"],
          toneCounts: [4, 5, 6, 7]
        },
        {
          id: "kiri",
          glyph: "II",
          title: "Kiri no Niwa",
          subtitle: "Jepang · taman kabut",
          mapLabel: "Hirajōshi",
          scaleName: "Hirajōshi terinspirasi",
          scaleText: "Lima nada dengan ruang yang lebar dan tarikan semiton. Warna nadanya makin rapat, tetapi urutan tetap dibaca seperti biasa.",
          noteLabels: ["1", "2", "♭3", "5", "♭6"],
          cents: [0, 200, 300, 700, 800],
          freeScales: [
            { name: "Hirajōshi terinspirasi", text: "Pentatonik Jepang dengan tarikan semiton dan lompatan lebar.", labels: ["1", "2", "♭3", "5", "♭6"], cents: [0, 200, 300, 700, 800] },
            { name: "In scale terinspirasi", text: "Warna pentatonik gelap dengan dua pasangan nada yang berdekatan.", labels: ["1", "♭2", "4", "5", "♭6"], cents: [0, 100, 500, 700, 800] }
          ],
          root: 246.94,
          instrument: "koto",
          colors: {
            accent: "226, 211, 224",
            accent2: "180, 142, 170",
            orb: "233, 203, 222",
            a: "rgba(89, 60, 83, .30)",
            b: "rgba(42, 49, 64, .18)"
          },
          lengths: [4, 5, 6, 7],
          speeds: [680, 620, 590, 550],
          mode: ["normal", "normal", "normal", "normal"],
          toneCounts: [5, 5, 5, 5]
        },
        {
          id: "nusa",
          glyph: "III",
          title: "Nusa Resonansi",
          subtitle: "Indonesia · logam dan tanah",
          mapLabel: "Sléndro / Pélog",
          scaleName: "Sléndro terinspirasi",
          scaleText: "Jarak lima nada yang relatif merata membuka jalan menuju warna pélog yang lebih tajam dan tidak simetris.",
          noteLabels: ["1", "2", "3", "5", "6"],
          cents: [0, 240, 480, 720, 960],
          alternate: {
            fromStage: 3,
            scaleName: "Pélog terinspirasi",
            scaleText: "Tujuh posisi nada dengan jarak yang tidak merata. Ini adalah interpretasi sintetis, bukan penyetelan gamelan tertentu.",
            noteLabels: ["1", "2", "3", "4", "5", "6", "7"],
            cents: [0, 150, 350, 550, 700, 900, 1050]
          },
          freeScales: [
            { name: "Sléndro terinspirasi", text: "Lima posisi dengan jarak relatif merata, disintesis sebagai pendekatan eksploratif.", labels: ["1", "2", "3", "5", "6"], cents: [0, 240, 480, 720, 960] },
            { name: "Pélog terinspirasi", text: "Jarak tidak merata dengan tegangan yang lebih tajam; bukan replika laras gamelan tertentu.", labels: ["1", "2", "3", "4", "5", "6", "7"], cents: [0, 150, 350, 550, 700, 900, 1050] }
          ],
          root: 196,
          instrument: "gamelan",
          colors: {
            accent: "236, 207, 137",
            accent2: "165, 112, 64",
            orb: "239, 194, 112",
            a: "rgba(104, 68, 28, .32)",
            b: "rgba(47, 54, 34, .17)"
          },
          lengths: [5, 6, 7, 8],
          speeds: [650, 600, 560, 520],
          mode: ["normal", "normal", "normal", "normal"],
          toneCounts: [5, 5, 6, 7]
        },
        {
          id: "surya",
          glyph: "IV",
          title: "Surya Raga",
          subtitle: "India · fajar dan dengung",
          mapLabel: "Bhairav",
          scaleName: "Bhairav terinspirasi",
          scaleText: "Nada kedua dan keenam yang rendah menciptakan tegangan khas. Dengung dasar tetap hidup di belakang melodi.",
          noteLabels: ["Sa", "r", "Ga", "Ma", "Pa", "d", "Ni"],
          cents: [0, 100, 400, 500, 700, 800, 1100],
          freeScales: [
            { name: "Bhairav terinspirasi", text: "Komal Re dan komal Dha memberi tegangan kuat di sekitar Sa dan Pa.", labels: ["Sa", "r", "Ga", "Ma", "Pa", "d", "Ni"], cents: [0, 100, 400, 500, 700, 800, 1100] },
            { name: "Yaman terinspirasi", text: "Warna terang dengan Ma yang dinaikkan, dimainkan di atas dengung Sa.", labels: ["Sa", "Re", "Ga", "M+", "Pa", "Dha", "Ni"], cents: [0, 200, 400, 600, 700, 900, 1100] }
          ],
          root: 174.61,
          instrument: "raga",
          colors: {
            accent: "244, 181, 126",
            accent2: "177, 69, 55",
            orb: "247, 169, 112",
            a: "rgba(112, 48, 35, .31)",
            b: "rgba(84, 67, 28, .17)"
          },
          lengths: [5, 6, 7, 8],
          speeds: [650, 610, 570, 540],
          mode: ["normal", "normal", "blind", "blind"],
          toneCounts: [6, 7, 7, 7]
        },
        {
          id: "chrome",
          glyph: "V",
          title: "Kota Kromatik",
          subtitle: "Dua belas nada · kaca malam",
          mapLabel: "Kromatis",
          scaleName: "Kromatis 12-TET",
          scaleText: "Setiap langkah hanya berjarak satu semiton. Perbedaan mengecil, jumlah pilihan membesar, dan tempo mulai menekan.",
          noteLabels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
          cents: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
          root: 220,
          instrument: "chrome",
          colors: {
            accent: "151, 231, 224",
            accent2: "76, 122, 158",
            orb: "139, 229, 226",
            a: "rgba(24, 94, 104, .27)",
            b: "rgba(35, 43, 87, .20)"
          },
          lengths: [6, 7, 8, 9],
          speeds: [540, 500, 460, 420],
          mode: ["normal", "normal", "normal", "blind"],
          toneCounts: [8, 9, 10, 12]
        },
        {
          id: "between",
          glyph: "VI",
          title: "Antara Nada",
          subtitle: "Mikrotonal · batas yang larut",
          mapLabel: "24-TET",
          scaleName: "Mikrotonal 24-TET",
          scaleText: "Setengah dari semiton biasa. Beberapa nada terasa hampir sama; telinga harus mengingat arah, warna, dan gesekan.",
          noteLabels: ["0", "½", "1½", "2½", "4", "5½", "7", "8½", "10", "11½"],
          cents: [0, 50, 150, 250, 400, 550, 700, 850, 1000, 1150],
          root: 207.65,
          instrument: "micro",
          colors: {
            accent: "194, 165, 255",
            accent2: "89, 164, 181",
            orb: "203, 177, 255",
            a: "rgba(72, 45, 112, .32)",
            b: "rgba(19, 79, 92, .19)"
          },
          lengths: [6, 8, 10, 12],
          speeds: [500, 455, 420, 385],
          mode: ["normal", "blind", "blind", "blind"],
          toneCounts: [7, 8, 9, 10]
        },
        {
          id: "metal",
          category: "bonus",
          glyph: "VII",
          title: "Iron Cathedral",
          subtitle: "Baja yang berbisik",
          mapLabel: "Steel resonance",
          scaleName: "Phrygian dominant",
          scaleText: "Phrygian dominant dipertahankan sebagai arsitektur gelap, tetapi hadir melalui resonansi synth seperti baja yang jauh.",
          noteLabels: ["1", "♭2", "3", "4", "5", "♭6", "♭7"],
          cents: [0, 100, 400, 500, 700, 800, 1000],
          freeScales: [
            { name: "Phrygian dominant", text: "Semiton dan mayor ketiga memberi bayangan dramatis, dirender sebagai resonansi sintetis yang tenang.", labels: ["1", "♭2", "3", "4", "5", "♭6", "♭7"], cents: [0, 100, 400, 500, 700, 800, 1000] },
            { name: "Harmonic minor", text: "Leading tone tinggi memberi tarikan dramatis tanpa perlu menjadi riff yang literal.", labels: ["1", "2", "♭3", "4", "5", "♭6", "7"], cents: [0, 200, 300, 500, 700, 800, 1100] }
          ],
          root: 110,
          instrument: "metal",
          colors: { accent: "235, 112, 97", accent2: "111, 40, 48", orb: "244, 126, 105", a: "rgba(108, 31, 37, .34)", b: "rgba(52, 45, 53, .22)" },
          lengths: [4, 5, 6, 7], speeds: [620, 570, 520, 470], mode: ["normal", "normal", "normal", "normal"], toneCounts: [5, 6, 7, 7]
        },
        {
          id: "rock",
          category: "bonus",
          glyph: "VIII",
          title: "Garage Ember",
          subtitle: "Bara analog yang tertinggal",
          mapLabel: "Analog embers",
          scaleName: "Minor pentatonic",
          scaleText: "Minor pentatonic menjadi jejak rock yang samar, dibawa oleh synth analog hangat dan interval fifth yang terbuka.",
          noteLabels: ["1", "♭3", "4", "5", "♭7"],
          cents: [0, 300, 500, 700, 1000],
          freeScales: [
            { name: "Minor pentatonic", text: "Kerangka rock yang dikenali hanya dari arah frase dan ruang di antara nadanya.", labels: ["1", "♭3", "4", "5", "♭7"], cents: [0, 300, 500, 700, 1000] },
            { name: "Blues hexatonic", text: "Blue note menjadi noda kecil di dalam tekstur analog yang lembut.", labels: ["1", "♭3", "4", "♭5", "5", "♭7"], cents: [0, 300, 500, 600, 700, 1000] }
          ],
          root: 146.83,
          instrument: "rock",
          colors: { accent: "241, 177, 98", accent2: "128, 74, 43", orb: "245, 187, 108", a: "rgba(105, 58, 24, .32)", b: "rgba(68, 48, 42, .19)" },
          lengths: [4, 5, 6, 7], speeds: [640, 590, 540, 500], mode: ["normal", "normal", "normal", "normal"], toneCounts: [5, 5, 6, 6]
        },
        {
          id: "pop",
          category: "bonus",
          glyph: "IX",
          title: "Prism FM",
          subtitle: "Cahaya yang mudah diingat",
          mapLabel: "Lucent memory",
          scaleName: "Major pentatonic",
          scaleText: "Major pentatonic muncul sebagai serpihan melodi yang mudah diingat, tetapi larut dalam pad dan gema.",
          noteLabels: ["1", "2", "3", "5", "6"],
          cents: [0, 200, 400, 700, 900],
          freeScales: [
            { name: "Major pentatonic", text: "Lima nada konsonan untuk hook yang langsung terbaca.", labels: ["1", "2", "3", "5", "6"], cents: [0, 200, 400, 700, 900] },
            { name: "Mixolydian pop", text: "Mayor dengan ♭7 untuk warna anthem yang sedikit lebih terbuka.", labels: ["1", "2", "3", "4", "5", "6", "♭7"], cents: [0, 200, 400, 500, 700, 900, 1000] }
          ],
          root: 261.63,
          instrument: "pop",
          colors: { accent: "255, 157, 218", accent2: "109, 125, 238", orb: "255, 174, 225", a: "rgba(120, 42, 99, .28)", b: "rgba(46, 59, 118, .21)" },
          lengths: [4, 5, 6, 7], speeds: [660, 610, 560, 520], mode: ["normal", "normal", "normal", "normal"], toneCounts: [5, 5, 6, 7]
        },
        {
          id: "rnb",
          category: "bonus",
          glyph: "X",
          title: "Velvet Hours",
          subtitle: "Arus beludru di malam hari",
          mapLabel: "Velvet current",
          scaleName: "Dorian",
          scaleText: "Dorian memberi warna hangat dan ambigu melalui chord panjang, overtone lembut, dan ruang yang luas.",
          noteLabels: ["1", "2", "♭3", "4", "5", "6", "♭7"],
          cents: [0, 200, 300, 500, 700, 900, 1000],
          freeScales: [
            { name: "Dorian", text: "Minor dengan mayor keenam, memberi rasa lembut tetapi tidak sepenuhnya muram.", labels: ["1", "2", "♭3", "4", "5", "6", "♭7"], cents: [0, 200, 300, 500, 700, 900, 1000] },
            { name: "Minor pentatonic", text: "Fondasi ringkas untuk frase vokal, bass, dan ornamentasi soulful.", labels: ["1", "♭3", "4", "5", "♭7"], cents: [0, 300, 500, 700, 1000] }
          ],
          root: 196,
          instrument: "rnb",
          colors: { accent: "185, 139, 255", accent2: "79, 64, 127", orb: "198, 159, 255", a: "rgba(75, 40, 112, .31)", b: "rgba(38, 41, 72, .22)" },
          lengths: [4, 5, 6, 7], speeds: [680, 630, 580, 540], mode: ["normal", "normal", "normal", "normal"], toneCounts: [5, 6, 7, 7]
        },
        {
          id: "hiphop",
          category: "bonus",
          glyph: "XI",
          title: "Low Orbit",
          subtitle: "Ruang kosong dan gravitasi rendah",
          mapLabel: "Sub gravity",
          scaleName: "Natural minor",
          scaleText: "Natural minor hadir melalui sub-bass yang bernapas, jeda panjang, dan fragmen bunyi seperti ingatan akan sample.",
          noteLabels: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
          cents: [0, 200, 300, 500, 700, 800, 1000],
          freeScales: [
            { name: "Natural minor", text: "Kerangka minor stabil untuk loop dan 808 bassline.", labels: ["1", "2", "♭3", "4", "5", "♭6", "♭7"], cents: [0, 200, 300, 500, 700, 800, 1000] },
            { name: "Phrygian", text: "Minor dengan ♭2 untuk beat yang lebih tegang dan gelap.", labels: ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"], cents: [0, 100, 300, 500, 700, 800, 1000] }
          ],
          root: 82.41,
          instrument: "hiphop",
          colors: { accent: "113, 220, 167", accent2: "45, 98, 89", orb: "126, 232, 177", a: "rgba(27, 91, 69, .30)", b: "rgba(24, 45, 57, .23)" },
          lengths: [4, 5, 6, 7], speeds: [700, 640, 590, 540], mode: ["normal", "normal", "normal", "normal"], toneCounts: [5, 6, 7, 7]
        },
        {
          id: "electronic",
          category: "bonus",
          glyph: "XII",
          title: "Neon Assembly",
          subtitle: "Kabut spektral yang bergerak",
          mapLabel: "Spectral mist",
          scaleName: "Whole tone",
          scaleText: "Whole tone menciptakan gerak tanpa pusat melalui spektrum, filter lambat, dan kilau sintetis yang tipis.",
          noteLabels: ["0", "2", "4", "6", "8", "10"],
          cents: [0, 200, 400, 600, 800, 1000],
          freeScales: [
            { name: "Whole tone", text: "Jarak seragam menciptakan sensasi mengambang dan futuristik.", labels: ["0", "2", "4", "6", "8", "10"], cents: [0, 200, 400, 600, 800, 1000] },
            { name: "Harmonic minor synth", text: "Minor dramatis untuk arpeggio, synthwave, dan garis lead yang tegang.", labels: ["1", "2", "♭3", "4", "5", "♭6", "7"], cents: [0, 200, 300, 500, 700, 800, 1100] }
          ],
          root: 130.81,
          instrument: "electronic",
          colors: { accent: "92, 231, 255", accent2: "83, 70, 214", orb: "106, 238, 255", a: "rgba(22, 92, 119, .31)", b: "rgba(49, 36, 112, .23)" },
          lengths: [4, 5, 6, 7], speeds: [590, 540, 490, 440], mode: ["normal", "normal", "normal", "normal"], toneCounts: [6, 6, 7, 7]
        }
      ];

  window.ECHO_ATLAS_AREAS = Object.freeze(areas);
})();
