# Perang Narasi: Republik Timeline

> **Voiceprint Roster — v3.16.0**  
> Game satire politik Indonesia tentang kekuasaan, buzzer, aktivisme, propaganda, algoritma, dan ingatan publik.

[![Release](https://img.shields.io/badge/release-3.16.0-f4d34a)](https://github.com/japutraa/perang-narasi-republik-timeline/releases)
[![Platform](https://img.shields.io/badge/platform-browser-8bd3ff)](https://japutraa.github.io/perang-narasi-republik-timeline/)
[![License](https://img.shields.io/badge/license-GPL--3.0-a9f98f)](LICENSE)

## Mainkan

**https://japutraa.github.io/perang-narasi-republik-timeline/**

Game tidak memerlukan akun, backend, build step, atau dependency runtime. Semua permainan berlangsung di browser dan save hanya disimpan secara lokal.

## Tentang game

Pemain memilih salah satu dari dua jalur:

- **Relawan Paslon → mesin komunikasi kekuasaan**
- **Aktivis Timeline → jaringan kampus, masyarakat sipil, watchdog, atau figur publik**

Campaign membentang selama **6 fase × 12 bulan = 72 episode**, dari Pemilu 2024 sampai Pemilu 2029. Bagian 2024 hingga Juli 2026 mengambil inspirasi dari peristiwa politik yang terdokumentasi. Episode setelahnya berada dalam **Timeline Alternatif**, bukan ramalan atau klaim faktual.

## Fitur v3.16.0

- Mesin **Voiceprint Roster** baru memberi seluruh 59 kartu karakter pola suara tersendiri: kosakata, panjang kalimat, cara membuka argumen, jenis bukti, ritme, dan tusukan penutup tidak lagi berasal dari satu suara admin generik.
- Total 93 profil suara mencakup roster dan seluruh akun yang dapat menjadi post utama timeline, termasuk akun institusi, warga, bot, auditor, pollster, dan figur komposit. Tidak ada focal speaker yang jatuh ke fallback pada 233 varian bulanan.
- Profil figur yang terinspirasi tokoh publik disusun dari pidato, wawancara panjang, podcast, tulisan, dan unggahan publik. Semua kalimat game tetap merupakan tulisan parodi orisinal—bukan kutipan palsu atau klaim bahwa figur asli pernah mengucapkannya.
- Gaya kini mengubah struktur argumen, bukan sekadar menempel catchphrase: ahli hukum memakai norma–kewenangan–prosedur, ekonom memakai baseline–arus kas–downside, dokumenteris memakai lokasi–tanggal–pelaku–akibat, ahli gizi memakai bahan–porsi–suhu–higiene, dan komika memakai setup–target kuasa–punchline.
- Voiceprint yang sama dipakai konsisten pada empat titik: post utama timeline, balasan akun setelah action card, dialog ability, dan komentar follow-up context combo.
- Persona Pak Jenderal Gemoyono tetap kronologis: fase kampanye memakai kegembiraan dan joget, sedangkan fase pemerintahan memakai perintah, komando, hasil, omon-omon, dan musuh bersama.
- Modul baru `assets/js/character-voices.js` memisahkan karakterisasi dari mesin game agar penambahan arc tidak kembali mencampur semua tokoh menjadi satu suara.
- Tes regresi mengaudit 59/59 roster, semua focal speaker timeline, sumber profil berbasis riset, keragaman output, kronologi persona, dan kebocoran nama asli pada teks yang dirender.

- Kolom komentar kini dibangun dari tiga konteks sekaligus: isu bulan aktif, nama/varian action card yang benar-benar dipilih, dan posisi akun yang membalas.
- Setiap komentar inti menyebut kartu yang sedang ditanggapi dan menyimpan metadata `actionId`, `actionName`, serta `issueKey`; komentar lama tetap jelas membalas kartu yang mana.
- Akun post utama merespons menurut stance: akun pemerintah mendukung atau membela strategi buzzer sendiri, pengkritik menantangnya, institusi memverifikasi metode, dan akun arsip menyimpan jejak. Akun tidak lagi mendadak menyerang posisi politiknya sendiri.
- Respons silang juga konsisten: akun pemerintah dapat menahan atau mengecam action aktivis, sementara pengkritik dapat mendukung action substantif tetapi mengoreksi doxxing, ad hominem, atau metode toksik dari kubunya sendiri.
- Persona warga marah dan arsip forum tetap memakai isi komentar yang kontekstual; gaya persona tidak lagi menimpa teks khusus action dengan stok kalimat acak.
- Noise OOT dipisahkan menjadi suplemen acak maksimal satu akun per gelombang komentar, terbatas pada bot judol fiktif, akun numpang jualan, dan crypto bro. Bisikan tren yang tidak terkait dihapus dari thread action.
- Komentar pembuka sebelum pemain memilih kartu sekarang juga membahas isu aktif, bukan mengambil kalimat generik lintas topik.
- Tes regresi memainkan seluruh keluarga action untuk kedua kubu melawan empat stance akun dan memastikan komentar non-noise selalu membawa konteks kartu yang dipilih.

- Arc 2 (2025) dibangun ulang dengan rangkaian isu yang saling terhubung: peluncuran dan ekspansi MBG, BGN dan keamanan pangan, efisiensi Rp306,7 triliun, pendidikan yang berebut ruang anggaran, KopDes Merah Putih, protes Agustus, serta konsolidasi keluarga politik menuju 2029.
- Juli dan Agustus memakai **varian isu penuh**, bukan sekadar copy berbeda. Seed run dapat memilih KopDes atau konsolidasi partai keluarga pada Juli, lalu konflik anggaran pendidikan–MBG atau protes tunjangan pada Agustus.
- Action card membaca `subject`, `document`, dan `people` dari varian yang terpilih. Kartu audit Juli, misalnya, berubah antara akta serta arus kas koperasi dan struktur partai serta hasil kongres.
- Menambahkan dua tokoh roster kontekstual: **Bu Nanik Nasi-Doyang** di sisi pemerintah dan **dr. Tan Sehat-Yen** di sisi aktivis. Keduanya baru tersedia pada September 2025 agar sesuai waktu pelantikan, investigasi keamanan pangan, dan audiensi gizi.
- Timeline September–Desember membahas permintaan maaf dan investigasi badan gizi, kritik burger/spaghetti dan pangan lokal, sertifikasi dapur, Rp223 triliun MBG dalam anggaran pendidikan 2026, serta audit akhir tahun program populis.
- Peluncuran 80.081 KopDes diperbaiki ke Juli 2025. Pemanasan jaringan keluarga ditempatkan pada kongres partai Juli 2025; dukungan dua periode yang eksplisit tetap diperlakukan sebagai perkembangan Juni 2026, bukan dimundurkan secara palsu.
- Audit nama asli diperluas ke dua tokoh baru dan keluarga politik terkait. Semua tampilan game tetap memakai alias parodi; nama faktual hanya hidup di URL sumber dan aturan sanitasi internal.

- Semua judul hashtag panjang kini mendapat titik bungkus alami di batas CamelCase plus fallback `overflow-wrap`, termasuk **#DanantaraPunyaNegaraAtauNegaraPunyaDanantara**.
- Metadata post dipisah menjadi chip **TIMELINE 3/3** dan **RUN 0608**, sehingga tidak lagi menempel pada hashtag.
- Label **Timeline Alternatif** disembunyikan dari header post, intro fase, dan layar pembuka; batas fakta dan satire tetap dijelaskan di Arsip Fakta.

- Nama sekretaris kabinet kini konsisten sebagai **Mayor Tedi Ketok-Pintu** di roster, event, timeline, dan katalog Tokoh.
- Setiap pool fase untuk kedua kubu sekarang berisi minimal sembilan tokoh. Seluruhnya tetap wajib muncul sebelum fase berakhir.
- Scheduler roster melarang tokoh yang sama muncul dua bulan berturut-turut, mengutamakan jeda dua bulan penuh, dan membatasi satu tokoh maksimal lima bulan per fase.
- Catatan editorial tambahan seperti **Catatan Admin Aktivis** dihapus agar post utama lebih bersih dan suara tokohnya tidak ditimpa penjelasan yang tidak penting.
- Semua nama politik yang tampil memakai alias parodi. Arsip fakta tetap menyimpan tautan sumber, tetapi kartu game tidak membocorkan nama asli.
- Persona Pak Jenderal Gemoyono mengikuti waktu: kampanye 2024 memakai joget dan citra gemoy; setelah pelantikan, suaranya berubah menjadi pidato komando, ketertiban, omon-omon, dan musuh bersama.
- Kronologi faktual dikunci sampai Juli 2026. Agustus 2026–2029 tetap berstatus Timeline Alternatif.
- Militerisasi menjadi tema utama: sekretaris kabinet perwira aktif, program sipil dalam rantai komando, revisi UU TNI, pelabelan agen asing, serta pengadaan pertahanan dibahas lewat posisi rezim dan kritik aktivis yang terpisah.
- Seluruh tokoh roster wajib mendapat giliran dalam fase masing-masing sebelum rotasi mengulang; relevansi isu menentukan urutan, bukan menghapus kartu.
- `Yanuar Risky Banget` diganti menjadi **Risky Februari**.
- Mode **Kronik** untuk campaign penuh dan **Mode Bebas** untuk mulai atau lompat ke fase 2024–2029 mana saja.
- Setiap bulan memiliki minimal tiga alternatif post utama: **233 varian timeline** untuk 72 bulan, termasuk 49 varian di Arc 2.
- Seed campaign menentukan varian yang muncul dan ikut tersimpan di save. Reload mempertahankan timeline yang sama; campaign baru menyusun kombinasi lain.
- Setiap post utama hanya berfokus pada satu akun/tokoh. Panel ramai tetap boleh muncul sebagai special event, bukan sebagai satu tweet keroyokan.
- Varian arsip memakai pernyataan kontroversial yang terdokumentasi, termasuk komentar rupiah–dolar, polemik SPPG, narasi agen asing, serta arsip fufufafa; kutipan, parafrasa, dan satire dibedakan lewat kartu sumber.
- Akun `@fufufafa_archive` kini dapat muncul acak di kolom komentar dengan gaya forum lama. Labelnya selalu mengingatkan bahwa identitas pemilik belum terbukti final.
- Raport ending yang menilai kinerja, mutu pilihan, moral, utang, solvabilitas, dan sisa uang pemain.
- Empat calon presiden fiktif dengan persentase suara dinamis; pilihan pemain ikut menentukan siapa yang menang.
- Pangkat akhir satir berdasarkan peran dan rekam permainan, dari **Arsiparis Republik Anti-Amnesia** sampai **Sultan Invoice, Fakir Nurani**.
- Moral buzzer kini ikut membaca sisa uang: saldo besar yang dikumpulkan lewat pilihan manipulatif bukan lagi dianggap kemenangan bersih.
- Komentar netizen lebih liar dan Indonesia: ada warga ngamuk, akun numpang jualan, crypto bro, serta bot judol fiktif tanpa tautan atau ajakan yang dapat dipakai.
- Wording timeline dipoles agar lebih mengalir, karakter-spesifik, dan dekat dengan nada kolom Omong-Omong: satire tenang, bukti dulu, lalu tusukan di akhir.
- Kritik 2026 mencakup tekanan rupiah dan pasar, defisit, gaya pidato “omon-omon”, serta produksi musuh bersama—dengan pemisahan tegas antara korelasi pasar dan klaim sebab-akibat.
- Daftar Tokoh yang disinkronkan otomatis dari seluruh roster enam fase, lengkap dengan penanda fase kemunculan.
- Nama karakter dipoles menjadi plesetan yang lebih jelas fiktif—termasuk **Prof. Konni BaksLaah**, **Mas Nadim Makaroni**, dan **Mayor Tedi Ketok-Pintu**.
- 72 skenario bulanan dalam enam fase politik.
- 42 strategic events untuk masing-masing kubu.
- Empat strategi per event: **336 pilihan** di seluruh kombinasi event dan kubu.
- **672 cabang konsekuensi** berhasil/gagal yang dapat jatuh 1–4 bulan kemudian.
- Outcome positif, negatif, netral, dan campuran yang memengaruhi statistik, komentar, buff/debuff, riwayat keputusan, serta ending.
- Tim & Mentor dengan tiga kartu aktif per bulan, seimbang untuk kedua kubu dan didistribusikan sepanjang timeline.
- Sistem deduksi crew: match sempurna membuka follow-up card khusus; salah memilih tokoh tetap menghabiskan ability.
- Action deck kontekstual, ekonomi progresif, utang, bailout, krisis karier, dan ending kebangkrutan.
- Engagement, komentar publik, Radar Trend, Arsip Fakta, serta Cek Nalar opsional.
- Autosave dan Continue yang tetap kompatibel dengan save seri v3.x.
- PWA/offline app shell tanpa analytics dan tanpa pengiriman data permainan.

## Struktur proyek

```text
.
├── index.html                 # markup dan antarmuka
├── assets/
│   ├── css/game.css           # seluruh stylesheet
│   ├── js/character-voices.js # 93 voiceprint + sumber gaya + renderer dialog
│   ├── js/game.js             # data naratif + mesin permainan
│   ├── js/ending-system.js    # skor, moral, utang, pangkat, dan pemilu
│   ├── js/netizen-pack.js     # persona komentar dan spam satir
│   ├── js/timeline-variants.js # 233 post bulanan, speaker, seed, sumber
│   ├── js/runtime.js          # boot diagnostics + registrasi offline
│   └── icons/icon.svg         # ikon lokal
├── manifest.webmanifest       # metadata PWA
├── sw.js                      # offline cache
├── tests/game.test.mjs        # smoke test + simulasi 72 bulan
├── .github/workflows/
│   └── deploy-pages.yml       # test dan deploy GitHub Pages
├── CHANGELOG.md
├── LICENSE
└── package.json
```

Tidak ada library pihak ketiga yang dikirim ke browser. `jsdom` hanya merupakan dev dependency untuk simulasi otomatis dan tidak ikut ke runtime game.

## Menjalankan secara lokal

Karena rilis modular memakai beberapa file, jalankan static server dari root repo:

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Test

```bash
npm ci
npm test
```

Enam belas test memeriksa sintaks JavaScript, kelengkapan file modular, 59/59 voiceprint roster beserta seluruh focal account timeline, koherensi komentar untuk seluruh action dan stance akun, audit alias politik, 216+ varian satu-tokoh, perbedaan seed antarrun, coverage seluruh roster, Mode Bebas untuk kedua kubu, 42 event × 2 kubu × 4 pilihan, evaluator ending, kompatibilitas save v3, dan simulasi campaign penuh untuk kedua kubu.

## Deploy ke GitHub Pages

1. Buat repository bernama `perang-narasi-republik-timeline` di akun `japutraa`.
2. Upload isi folder ini ke branch `main`.
3. Buka **Settings → Pages** dan pilih **GitHub Actions** sebagai Source.
4. Workflow akan menjalankan test lalu menerbitkan game secara otomatis.

## Privasi dan save game

Save memakai key `perang-narasi-save-v3` pada `localStorage`. Tidak ada akun, server analytics, tracking pixel, atau pengiriman data permainan. Menghapus data situs di browser juga akan menghapus save lokal.

## Prinsip editorial

- Satire bukan pengganti verifikasi.
- Tokoh adalah plesetan atau komposit, bukan biografi.
- Kutipan singkat yang terdokumentasi ditautkan ke sumber; reaksi dan dialog karakter tetap satire.
- Arsip fufufafa dapat diverifikasi sebagai kumpulan unggahan, tetapi identitas pemilik akun tidak diperlakukan sebagai fakta final.
- Dukungan politik, jabatan publik, dan kerja komunikasi tidak otomatis membuktikan seseorang adalah buzzer berbayar.
- Tudingan, bantahan, dakwaan, putusan, serta upaya hukum harus dibedakan.
- Episode masa depan berada di Timeline Alternatif dan tidak diperlakukan sebagai fakta.
- Kemenangan karier tidak selalu berarti kemenangan demokrasi.

## Kredit

**Game design, writing, and development:**  
[Adrian Janitra Putra](https://github.com/japutraa) — `japutraa`

## Lisensi

Copyright © 2026 Adrian Janitra Putra.

Kode dirilis di bawah [GNU General Public License v3.0 or later](LICENSE).
