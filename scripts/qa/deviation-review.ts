/**
 * Review of the deviations (requested 2026-11-01): which of them can count as
 * passed, because the step reached its aim and only the form or the wording
 * differs from the reference workbook. Every deviation gets one of three
 * verdicts with a note in Indonesian:
 *
 * - "Bisa dianggap lulus": the outcome is right; a link instead of a button, a
 *   refusal by the browser or a disabled button instead of a toast, a refusal
 *   with a general message, a field the session fills (the branch), more
 *   than the workbook lists, a different but equivalent screen.
 * - "Perlu keputusan": the site works another way or lacks the feature the
 *   workbook describes (no confirmation, no undo, no search, free text instead
 *   of a list, audit without the record); the product owner decides.
 * - "Deviasi nyata": a defect: a save that should be refused, a double, a user
 *   without the right who reads or saves, a server error, wrong figures or
 *   times, data of another branch.
 *
 * The verdict comes from the rules below, read against every deviation of
 * reports/summary/run-summary.json on 2026-11-01; a rule names the pattern it
 * matches. Used by build-run-summary.ts (sheets per module, column
 * "Tinjauan deviasi") and build-findings-md.ts (docs/qa/deviations.md).
 */

export type Verdict = 'Bisa dianggap lulus' | 'Perlu keputusan' | 'Deviasi nyata';
export interface Review { verdict: Verdict; note: string; fix?: string }

/**
 * What to do about a deviation, by its note: the fix for a defect, the decision for "Perlu keputusan", or what (if
 * anything) is left for one that counts as passed. A note without an entry gets the default of its verdict.
 */
const FIX: Record<string, string> = {
  'Hanya beda bahasa: fungsinya berjalan, tetapi sebagian teks belum diterjemahkan.': 'Dihitung lulus. Catatan untuk Development: lengkapi terjemahan teks yang disebut (judul, deskripsi, breadcrumb, kolom, tombol, pesan error) seperti modul yang sudah lengkap, misalnya Rawat Inap.',
  'Server error (HTTP 500/SQL) alih-alih pesan validasi.': 'Tangani input ini di server dan kembalikan pesan validasi yang jelas; jangan biarkan server menjawab error 500.',
  'User tanpa hak (U3) bisa membuka/membaca/menyimpan: hak akses tidak ditegakkan.': 'Tegakkan hak akses di server untuk baca dan tulis; sembunyikan kartu aplikasi dan tombol dari peran tanpa hak.',
  'Waktu ditampilkan dalam UTC, bukan WIB.': 'Tampilkan dan simpan waktu dalam zona waktu cabang (WIB).',
  'Angka desimal/ribuan salah dibaca.': 'Baca angka sesuai format Indonesia (koma desimal, titik ribuan) atau beri petunjuk format pada isian.',
  'Data cabang lain muncul atau dipakai: pembatasan cabang tidak berlaku.': 'Batasi data dan pilihan ke cabang aktif user (server dan daftar pilihan).',
  'Papan antrean publik menampilkan nama lengkap dan RM (privasi).': 'Samarkan nama dan sembunyikan nomor RM di papan antrean publik.',
  'Data ganda tersimpan tanpa penolakan atau peringatan.': 'Tolak data ganda (nomor, kode, atau kunjungan yang sama) atau minta konfirmasi dengan peringatan yang jelas.',
  'Seharusnya ditolak/diperingatkan, tetapi tersimpan: validasi tidak ada.': 'Tambahkan validasi di server untuk input ini, dengan pesan yang menyebut alasannya.',
  'Input yang seharusnya ditolak tetap tersimpan.': 'Tambahkan validasi di server untuk input ini, dengan pesan yang menyebut alasannya.',
  'Pembuat dokumen bisa menyetujui dokumennya sendiri (pemisahan tugas tidak berlaku).': 'Terapkan pemisahan tugas: pembuat dokumen (atau satu orang untuk langkah berurutan) tidak boleh menyetujuinya.',
  'Fungsinya sama: berupa link, bukan tombol; navigasinya berjalan.': 'Tidak perlu perbaikan; referensi bisa disesuaikan (link, bukan tombol).',
  'Input tetap tertolak, hanya lewat validasi browser/tombol nonaktif, bukan teks dari situs.': 'Tidak wajib; bila diinginkan, tampilkan pesan dari situs yang menyebut isian yang kurang.',
  'Penolakannya benar; pesannya umum dan tidak menyebut alasan seperti di referensi.': 'Opsional: ganti pesan umum ("... failed") dengan alasan penolakan yang spesifik.',
  'Cabang diambil dari sesi (U1 hanya di satu cabang); field cabang tidak diperlukan.': 'Tidak perlu perbaikan; referensi bisa disesuaikan (cabang dari sesi).',
  'Pencarian per kata menemukan lebih banyak; hasil yang dicari tetap muncul.': 'Tidak perlu perbaikan; referensi bisa disesuaikan (pencarian per kata).',
  'Format tampilan berbeda (sisa / dipesan); angkanya benar.': 'Tidak perlu perbaikan.',
  'Setelah dipanggil, baris lanjut ke "Start encounter"; panggilan tercatat.': 'Tidak perlu perbaikan; referensi bisa disesuaikan.',
  'Petunjuk tampil dalam bahasa Indonesia karena situs dibuka di /id.': 'Tidak perlu perbaikan.',
  'Pembatasan cabang ada dengan bentuk lain (daftar cabang dan user yang diizinkan).': 'Tidak perlu perbaikan; referensi bisa disesuaikan.',
  'Periode terbuka dikenali dari tombol "Lock"; statusnya tidak ditulis.': 'Opsional: tampilkan status "Terbuka" pada baris periode.',
  'Situs menampilkan lebih banyak menu/kolom dari referensi; yang diminta tetap ada.': 'Tidak perlu perbaikan; referensi bisa diperbarui dengan menu/kolom tambahan.',
  'Ditolak dengan pesan yang setara (teksnya sedikit berbeda).': 'Tidak perlu perbaikan.',
  'Baris bisa dihapus dengan cara lain (mengosongkan namanya).': 'Opsional: tambahkan tombol hapus per baris.',
  'Departemen sudah terisi otomatis, jadi tombol aktif wajar.': 'Tidak perlu perbaikan.',
  'Hasil yang diharapkan masih TBD di referensi; perilaku situs dicatat.': 'Lengkapi hasil yang diharapkan di referensi (masih TBD).',
  'Status tampil sebagai kode singkat "A"; artinya sama (menunggu).': 'Opsional: tampilkan status dengan kata ("Menunggu") alih-alih kode.',
  'Situs memakai FIFO (masuk dulu keluar dulu), referensi FEFO (kedaluwarsa dulu): aturan stok perlu diputuskan.': 'Putuskan aturan pengeluaran stok (FEFO atau FIFO), lalu sesuaikan situs atau referensi.',
  'Audit Log tidak menyimpan rincian (nomor dokumen/RM/alasan) atau aksinya tidak tercatat.': 'Putuskan apakah entri Audit Log harus menyimpan nomor dokumen/RM/alasan dan bisa dibuka; bila ya, lengkapi pencatatannya.',
  'Isian hilang tanpa peringatan saat meninggalkan layar (perlu keputusan UX).': 'Putuskan apakah perlu peringatan sebelum meninggalkan formulir yang belum disimpan.',
  'Aksi langsung dijalankan tanpa konfirmasi.': 'Putuskan apakah aksi ini perlu dialog konfirmasi (dan alasan) sebelum dijalankan.',
  'Fitur yang diminta referensi tidak ada di situs.': 'Putuskan apakah fitur ini dibuat, atau referensi disesuaikan dengan situs.',
  'Isian berupa teks bebas, bukan pilihan dari daftar.': 'Putuskan apakah isian diganti pilihan dari data master (pasien, pemasok, mata uang, dsb.).',
};
const FIX_DEFAULT: Record<Verdict, string> = {
  'Bisa dianggap lulus': 'Tidak perlu perbaikan; referensi bisa disesuaikan.',
  'Perlu keputusan': 'Putuskan apakah perilaku situs diterima (lalu sesuaikan referensi) atau situs perlu diubah.',
  'Deviasi nyata': 'Perbaiki di situs sesuai hasil yang diharapkan referensi.',
};
const withFix = (r: Review): Review => ({ ...r, fix: r.fix ?? FIX[r.note] ?? FIX_DEFAULT[r.verdict] });

interface Rule { test: (expected: string, site: string, id: string) => boolean; verdict: Verdict; note: string }

const has = (re: RegExp) => (_e: string, s: string) => re.test(s);
const expectsRefusal = (e: string) => /^(Refused|Toast "|A message|The text "|A warning|Not possible|Access refused|No "|The button "New order" is not offered)/i.test(e);

const RULES: Rule[] = [
  // Only the language differs (English left on /id, or Indonesian on /en): the function works, the translation is incomplete.
  // A page crash (React error) or a server error is not a matter of language and keeps its own verdict.
  { test: (e, s) => (/\bIndonesian\b/.test(e) || /Indonesian on the English screen/.test(s)) && !/React error|HTTP 5\d\d/.test(s), verdict: 'Bisa dianggap lulus', note: 'Hanya beda bahasa: fungsinya berjalan, tetapi sebagian teks belum diterjemahkan.' },
  // Defects first: a check that is missing, a double, a user without the right, a server error, wrong figures.
  { test: has(/HTTP 500|SQLSTATE|numeric field overflow|Minified React/i), verdict: 'Deviasi nyata', note: 'Server error (HTTP 500/SQL) alih-alih pesan validasi.' },
  { test: has(/U3 \(no (right|privilege)|for U3|to U3|gives U3|U3 opens|saved by U3|accepted for U3/), verdict: 'Deviasi nyata', note: 'User tanpa hak (U3) bisa membuka/membaca/menyimpan: hak akses tidak ditegakkan.' },
  { test: has(/world time|seven hours|"2026-10-31 03:00"/), verdict: 'Deviasi nyata', note: 'Waktu ditampilkan dalam UTC, bukan WIB.' },
  { test: has(/the dot is read|the field shows "\d+"/), verdict: 'Deviasi nyata', note: 'Angka desimal/ribuan salah dibaca.' },
  { test: has(/Kemayoran.*(offered|sees)|PT-B|of the Kemayoran patient|not narrowed by the branch|BR02 Daan Mogot/), verdict: 'Deviasi nyata', note: 'Data cabang lain muncul atau dipakai: pembatasan cabang tidak berlaku.' },
  { test: has(/full name ".*" and MRN shown/), verdict: 'Deviasi nyata', note: 'Papan antrean publik menampilkan nama lengkap dan RM (privasi).' },
  { test: has(/second (order|bed|loan|visit|patient|row|time)|both (got|are saved|saves|saved)|appear more than once|2 open stays|2 visits|2 rows|two identical rows|two patients with the same|booked a second time|admitted a second time|admitted with .* a second time|issued a second|consumed again|recorded a second time|listed 1 times|a second, identical/), verdict: 'Deviasi nyata', note: 'Data ganda tersimpan tanpa penolakan atau peringatan.' },
  { test: (e, s) => expectsRefusal(e) && /\b(saved|created|accepted|admitted|added|authorised|approves|is changed|fulfilled|scheduled|marks the billing|set inactive|moved to|stored|placed|consumed|Visit created|Configuration saved|Request saved|Saved\.)\b/i.test(s) && !/refused|not saved|nothing is saved|0 saved/i.test(s), verdict: 'Deviasi nyata', note: 'Seharusnya ditolak/diperingatkan, tetapi tersimpan: validasi tidak ada.' },
  { test: has(/saved (without|with no|on a name)|saved;|saved: |saved as "|is saved with|created with empty|a voucher of "IDR 0|saved with IDR 0|saved over|is accepted|^saved$|^saved \(|\(toast "Saved"\)|the name of 500 characters is saved|a unit with the factor|phone code "abc"|both spellings are saved|the dialog closes|toast "Saved"; dialog closes/i), verdict: 'Deviasi nyata', note: 'Input yang seharusnya ditolak tetap tersimpan.' },
  { test: has(/the creator approves|author approves|approves its own|approves .* consecutive/), verdict: 'Deviasi nyata', note: 'Pembuat dokumen bisa menyetujui dokumennya sendiri (pemisahan tugas tidak berlaku).' },

  // Counts as passed: the aim is reached, the form or wording differs.
  { test: has(/is a link$/), verdict: 'Bisa dianggap lulus', note: 'Fungsinya sama: berupa link, bukan tombol; navigasinya berjalan.' },
  { test: (e, s) => /the browser (stops|requires|asks)|Please (select|fill|enter)|stays disabled|is only disabled|is disabled while|"Next" is only disabled|Save" stays disabled|"Confirm dispense" is disabled/.test(s) && !/saved/.test(s), verdict: 'Bisa dianggap lulus', note: 'Input tetap tertolak, hanya lewat validasi browser/tombol nonaktif, bukan teks dari situs.' },
  { test: (e, s) => expectsRefusal(e) && /^refused|toast "(Booking failed|Failed to|failed to|Could not|Arrival failed|Registration failed"$|tpn failed|Failed to save)|"cssd: invalid input"|failed to admit|"Failed to|patient_id required|"missing required privilege"|"Failed to return record"|"bloodbank: invalid input|receiveStockBatch: 400|saveFreezeDays: 400/i.test(s) && !/HTTP 500/.test(s), verdict: 'Bisa dianggap lulus', note: 'Penolakannya benar; pesannya umum dan tidak menyebut alasan seperti di referensi.' },
  { test: has(/no Branch field|no "Branch" field|takes the branch of the session/), verdict: 'Bisa dianggap lulus', note: 'Cabang diambil dari sesi (U1 hanya di satu cabang); field cabang tidak diperlukan.' },
  { test: has(/the words "qa" and/), verdict: 'Bisa dianggap lulus', note: 'Pencarian per kata menemukan lebih banyak; hasil yang dicari tetap muncul.' },
  { test: has(/Remaining reads "10 \/ 10"/), verdict: 'Bisa dianggap lulus', note: 'Format tampilan berbeda (sisa / dipesan); angkanya benar.' },
  { test: has(/replaced by "Start encounter"/), verdict: 'Bisa dianggap lulus', note: 'Setelah dipanggil, baris lanjut ke "Start encounter"; panggilan tercatat.' },
  { test: has(/hint "No\. atau deskripsi/), verdict: 'Bisa dianggap lulus', note: 'Petunjuk tampil dalam bahasa Indonesia karena situs dibuka di /id.' },
  { test: has(/Branches allowed to use this account/), verdict: 'Bisa dianggap lulus', note: 'Pembatasan cabang ada dengan bentuk lain (daftar cabang dan user yang diizinkan).' },
  { test: has(/an open period offers "Lock"/), verdict: 'Bisa dianggap lulus', note: 'Periode terbuka dikenali dari tombol "Lock"; statusnya tidak ditulis.' },
  { test: has(/^\d+ items: Orders|^7 groups|Licensing 2|^10 tiles|tiles: Requests, Case|columns Request no, Procedures, Status|the hub has Financial years/), verdict: 'Bisa dianggap lulus', note: 'Situs menampilkan lebih banyak menu/kolom dari referensi; yang diminta tetap ada.' },
  { test: has(/Shares must total 100%|height, weight, energy, protein and fluid are required|"bloodbank: invalid input: (component is required|required-by date)/), verdict: 'Bisa dianggap lulus', note: 'Ditolak dengan pesan yang setara (teksnya sedikit berbeda).' },
  { test: has(/the row is taken out by emptying its name/), verdict: 'Bisa dianggap lulus', note: 'Baris bisa dihapus dengan cara lain (mengosongkan namanya).' },
  { test: has(/the empty field already holds a department/), verdict: 'Bisa dianggap lulus', note: 'Departemen sudah terisi otomatis, jadi tombol aktif wajar.' },
  { test: (e) => /^TBD/.test(e), verdict: 'Bisa dianggap lulus', note: 'Hasil yang diharapkan masih TBD di referensi; perilaku situs dicatat.' },
  { test: has(/Status "A"$/), verdict: 'Bisa dianggap lulus', note: 'Status tampil sebagai kode singkat "A"; artinya sama (menunggu).' },
  { test: has(/the batch received first is issued first/), verdict: 'Perlu keputusan', note: 'Situs memakai FIFO (masuk dulu keluar dulu), referensi FEFO (kedaluwarsa dulu): aturan stok perlu diputuskan.' },

  // Everything else: the site works another way or lacks the feature.
  { test: has(/Audit Log|the entries show|an entry cannot be opened/), verdict: 'Perlu keputusan', note: 'Audit Log tidak menyimpan rincian (nomor dokumen/RM/alasan) atau aksinya tidak tercatat.' },
  { test: has(/lost with no warning|returns to the empty|clears the whole screen/), verdict: 'Perlu keputusan', note: 'Isian hilang tanpa peringatan saat meninggalkan layar (perlu keputusan UX).' },
  { test: has(/at once|no question|with no question|without a question/), verdict: 'Perlu keputusan', note: 'Aksi langsung dijalankan tanpa konfirmasi.' },
  { test: has(/no (undo|way back|way to bring|reopen|cancel|edit|delete|search|filter|print|remove|reject|status)|none|cannot be opened|opens nothing|no such screen|no .* screen|^no |missing:|not offered|is not listed|no way/i), verdict: 'Perlu keputusan', note: 'Fitur yang diminta referensi tidak ada di situs.' },
  { test: has(/free text|plain text field|is typed by hand|text field/), verdict: 'Perlu keputusan', note: 'Isian berupa teks bebas, bukan pilihan dari daftar.' },
];

/** Verdicts set by hand ("<test case> <step>"), read one by one on 2026-11-01 where a rule alone judged wrongly. */
const BY_HAND: Record<string, Review> = {
  'TC-APP006-062 1': { verdict: 'Perlu keputusan', note: 'Referensi: QC di luar batas tetap disimpan dan ditandai gagal; situs menolaknya. Aturannya perlu diputuskan.' },
  'TC-APP010-040 4': { verdict: 'Bisa dianggap lulus', note: 'Ditolak karena U1 sudah tertaut ke pegawai dari run sebelumnya (data uji bersama), bukan cacat situs.' },
  'TC-APP008-010 2': { verdict: 'Perlu keputusan', note: 'Penjadwalan OT tanpa tanggal, jam, atau kamar, jadi bentrok jadwal tidak mungkin dicek: fitur jadwal perlu diputuskan.' },
  'TC-APP015-009 2': { verdict: 'Perlu keputusan', note: 'Triase tidak menyimpan tingkat urgensi, jadi urutan tidak berubah: fitur triase perlu diputuskan.' },
  'TC-APP018-017 1': { verdict: 'Perlu keputusan', note: 'Cabang langsung dinonaktifkan tanpa peringatan: perlu keputusan UX.' },
  'TC-APP019-023 1': { verdict: 'Perlu keputusan', note: 'Akun langsung dinonaktifkan tanpa peringatan bahwa aturan posting memakainya: perlu keputusan UX.' },
  'TC-APP018-030 2': { verdict: 'Perlu keputusan', note: 'Edit bersamaan: penyimpanan terakhir menang tanpa peringatan (tidak ada penguncian): perlu keputusan.' },
  'TC-APP019-034 2': { verdict: 'Perlu keputusan', note: 'Edit bersamaan: penyimpanan terakhir menang tanpa peringatan (tidak ada penguncian): perlu keputusan.' },
  'TC-APP007-028 4': { verdict: 'Perlu keputusan', note: 'Mata uang berupa teks bebas, bukan pilihan: perlu keputusan.' },
  'TC-APP007-029 3': { verdict: 'Perlu keputusan', note: 'Tidak ada peringatan saat stok melewati maksimum: perlu keputusan.' },
  'TC-APP007-017 1': { verdict: 'Perlu keputusan', note: 'Kode item bisa diubah tanpa peringatan walau ada stok: perlu keputusan.' },
  'TC-APP009-022 3': { verdict: 'Perlu keputusan', note: 'PO tidak dicek terhadap anggaran departemen: integrasi anggaran perlu diputuskan.' },
  'TC-APP010-029 4': { verdict: 'Perlu keputusan', note: 'Tidak jelas apakah alokasi dipindah atau ditambah: perlu keputusan.' },
  'TC-APP010-030 1': { verdict: 'Perlu keputusan', note: 'Tidak ada peringatan lisensi kedaluwarsa: perlu keputusan.' },
  'TC-APP018-024 3': { verdict: 'Perlu keputusan', note: 'Tarif pajak disimpan dengan 4 desimal tanpa pembulatan: perlu keputusan.' },
  'TC-APP018-020 1': { verdict: 'Deviasi nyata', note: 'Departemen pindah cabang tanpa peringatan; service center-nya tetap di cabang lama (data tidak konsisten).' },
};

export function reviewDeviation(id: string, text: string): Review {
  const t = text.replace(/\s+/g, ' ');
  const step = /^Step (\d+):/.exec(t)?.[1];
  const hand = BY_HAND[`${id} ${step}`];
  if (hand) return withFix(hand);
  const m = /Excel expects "(.*?)"; the site: (.*)$/.exec(t);
  const [expected, site] = m ? [m[1], m[2]] : ['', t];
  for (const r of RULES) if (r.test(expected, site, id)) return withFix({ verdict: r.verdict, note: r.note });
  return withFix({ verdict: 'Perlu keputusan', note: 'Perilaku situs berbeda dari referensi; perlu keputusan apakah diterima.' });
}

/** The verdict of a test case: passed when every deviation can count as passed. */
export function reviewCase(id: string, deviations: string[]): Verdict | null {
  if (!deviations.length) return null;
  const v = deviations.map((d) => reviewDeviation(id, d).verdict);
  if (v.includes('Deviasi nyata')) return 'Deviasi nyata';
  if (v.includes('Perlu keputusan')) return 'Perlu keputusan';
  return 'Bisa dianggap lulus';
}
