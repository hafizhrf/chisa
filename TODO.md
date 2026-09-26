# MV-inspired visual backlog

Opening/Hero dan Profile sudah dikerjakan. Item yang selesai ditandai di bawah;
checklist lainnya masih ditunda. Referensi: MV lokal `珠乃井ナナ】.mp4` (sekitar 4:49).

## Selesai

- [x] **Opening/Hero** — slit buku/kertas → panel wajah dan crop jendela, buku,
  langit, tirai → classroom terbuka; panel detail hilang sebelum scene utama muncul.
- [x] **Painting dan scramble Kuroneko** — kuas cepat dimulai setelah intro selesai;
  scramble per huruf mengikuti scroll dan kembali utuh saat scroll mundur.
- [x] **Fokus kamera** — classroom blur sejak awal terbuka, tajam saat tirai putih
  selesai; background makin blur mengikuti zoom ke Profile sementara karakter tajam.
- [x] **Profile** — alur zoom → siluet → white bloom → desk mata tertutup/terbuka
  dipertahankan; bayangan kisi jendela tidak tertinggal saat kembali ke Hero.
- [x] **Catatan manga Profile** — judul Jepang, lead bersorot, body dan fakta pada
  kertas bergaris dengan tepi tidak rata, shadow tebal dan overlap gambar; waktu baca
  diperpanjang dengan informasi penuh pada sekitar 70–88% progress.
- [x] **Verifikasi Opening/Profile** — build dan 18 tes existing lulus; desktop,
  mobile 390×844 / 320×640, resize, skip klik/Escape, scroll maju–mundur, reduced
  motion dan fallback Canvas tanpa WebGL diperiksa selama implementasi.

## Skills dan Works

- [ ] **Demonstrasi per skill** — 00:54–01:12, 03:24. Motion, Illustration,
  Typography, dan Code mendapat komposisi/demo masing-masing, bukan hanya daftar kata.
- [ ] **Variasi framing Works** — 00:30–00:48, 02:00. Variasikan detail, wide shot,
  panel diagonal, dan ruang kosong sambil menjaga navigasi serta caption terbaca.
- [ ] **Panel menjadi preview** — panel Works yang diklik membesar menjadi preview
  dengan gambar dan posisi yang berlanjut dari panel asal; tutup kembali ke panel.

## Transisi antar-section

- [ ] **Profile → Works** — 00:00–00:13. White field menyisakan celah yang membuka
  panel Works pertama. Pertahankan handoff kamera yang sudah berjalan.
- [ ] **Works → Skills** — 00:54–01:12. Kamera keluar dari panel terakhir, lalu
  judul skill mengambil alih bidang tersebut.
- [ ] **Skills → Milestone** — 00:30–00:48. Huruf/garis terakhir menjadi coretan
  papan tulis sebelum karakter Milestone masuk.
- [ ] **Milestone → Contact** — 04:12–04:30. Panel papan tulis bergeser seperti
  halaman dan memperlihatkan classroom dusk.

## Cerita dan halaman tambahan

- [ ] **Breakdown Milestone** — 02:24–02:36. Ilustrasi saat ini → catatan menabung
  → tujuan commission. Progress tetap berdasarkan nominal sebenarnya; aset prototipe
  tidak diberi label sebagai sketsa artist.
- [ ] **Contact sebagai outro/liner notes** — 04:12–04:30. Classroom tenang, lembar
  contact, dan credits kecil yang memiliki fungsi jelas.
- [ ] **Process / 制作ノート** — 02:24–02:36. Tiga panel ringkas setelah Works:
  ide/storyboard, pemisahan layer, dan hasil motion; isi dari proses nyata proyek.
- [ ] **Halaman detail karya** — hasil utama, konsep, breakdown, serta kontribusi
  author untuk karya unggulan; modal tetap menjadi preview cepat.
- [ ] **Lab / 実験室** — eksperimen brush lettering, parallax, shader, dan kinetic
  type yang bisa dimainkan; tambahkan ketika eksperimen nyata sudah tersedia.

Semua improvement harus mendukung mobile, keyboard, reduced motion, dan cleanup
timeline/listener. Ambil bahasa visual MV tanpa menyalin asetnya ke website.
