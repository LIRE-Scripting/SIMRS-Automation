"""Writes the automated journey results back into pharmacy-test-journeys-QA.xlsx.

Steps sheet: column F (Status) and column G (Actual result / notes).
Every step of a journey that produced a screenshot gets the PNG embedded in G.
Journey-level status (Journeys sheet, column K) is a formula - left alone.
"""

import shutil
from pathlib import Path

import openpyxl
from openpyxl.drawing.image import Image as XLImage

SRC = Path('pharmacy-test-journeys-QA.xlsx')
BACKUP = SRC.with_suffix('.backup.xlsx')
SHOTS = Path('screenshots')
P, F, B = 'Pass', 'Fail', 'Blocked'

# Journeys that could not run at all in this environment, with the reason.
REASON_ALL = {
    'PHA-JRN-001': 'Order terbuka PT-1 (OR-OP) dan store ST-OP tidak ada di environment',
    'PHA-JRN-002': 'Order terbuka PT-1 (OR-OP) tidak ada di environment',
    'PHA-JRN-003': 'Langkah 2-4 butuh role doctor di Patient Care + order OR-RX',
    'PHA-JRN-004': 'Order terbuka PT-1 (OR-OP) tidak ada di environment',
    'PHA-JRN-005': 'Butuh layar Inpatient Ward supply, role nurse, order OR-IP',
    'PHA-JRN-006': 'Bergantung group Ward supply dari JRN-005',
    'PHA-JRN-007': 'Pasien PT-1 (QA-PHA Pasien Satu) tidak ada di environment',
    'PHA-JRN-009': 'Pasien PT-1 dan item QA-IBU tidak ada di environment',
    'PHA-JRN-010': 'Pasien PT-1 dan item kit QA-KIT tidak ada di environment',
    'PHA-JRN-012': 'Pasien PT-1 dan item QA-OMEP tidak ada di environment',
    'PHA-JRN-013': 'Pasien PT-1 dengan batch BT-1/BT-2 tidak ada di environment',
    'PHA-JRN-014': 'Pasien PT-1 tidak ada; cek invoice butuh Hospital Accounts',
    'PHA-JRN-015': 'Pasien PT-1 tidak ada; cek invoice butuh Hospital Accounts',
    'PHA-JRN-016': 'Pasien PT-1 tidak ada; approval butuh role Cashier',
    'PHA-JRN-018': 'Butuh return request dari Inpatient Ward supply (role nurse)',
    'PHA-JRN-021': 'Pasien PT-1 tidak ada di environment',
    'PHA-JRN-025': 'Order pending OR-OP (sisa 6) tidak ada di environment',
    'PHA-JRN-027': 'Pasien PT-3 (QA-PHA Pasien Kembar, admitted) tidak ada',
    'PHA-JRN-028': 'Pasien kembar PT-2/PT-3 tidak ada di environment',
    'PHA-JRN-029': 'Pasien PT-1 dan item QA-IBU/QA-AMLO tidak ada',
    'PHA-JRN-030': 'Pasien PT-4 (QA-PHA Pasien Alergi) tidak ada',
    'PHA-JRN-031': 'Pasien PT-1 dan item QA-IBU/QA-AMLO tidak ada',
    'PHA-JRN-032': 'Pasien PT-1 dengan stok QA-PARA 20 tidak ada',
    'PHA-JRN-033': 'Pasien PT-1 dan item QA-EXP/QA-FRZ tidak ada',
    'PHA-JRN-034': 'Pasien PT-1 dan store ST-OP/ST-IP tidak ada',
    'PHA-JRN-035': 'Pasien PT-1 dan item QA-NOCOST tidak ada',
    'PHA-JRN-036': 'Pasien PT-1 tidak ada; Reject butuh role Cashier',
    'PHA-JRN-037': 'Butuh akun Pharmacist, Cashier 2, dan Cashier approver',
    'PHA-JRN-039': 'Butuh invoice diskon dari JRN-015 + akses Finance',
    'PHA-JRN-040': 'Butuh Fast Cashier price settings + akses Finance',
    'PHA-JRN-044': 'Butuh akun Staff tanpa hak pharmacy',
    'PHA-JRN-045': 'Butuh akun Staff tanpa hak pharmacy',
    'PHA-JRN-047': 'Butuh tenant tanpa lisensi Pharmacy (mis. Lab tenant)',
    'PHA-JRN-048': 'Butuh tenant Apotek (pharmacy-only)',
    'PHA-JRN-049': 'Butuh skenario refusal JRN-016/027/032/035 (data seed)',
}

# Journeys that ran (partly): per-step (status, note) in workbook step order.
PARTIAL = {
    'PHA-JRN-008': [
        (P, 'Pencarian pasien baru: "No medical record matches."'),
        (P, 'Link "Register on the patient form" tersedia'),
        (B, 'Form pasien ada di Ambulatory Care (luar Pharmacy)'),
    ],
    'PHA-JRN-017': [
        (P, 'Return 3 berhasil - sel Returned ter-update'),
        (P, 'Return 7 berhasil - total Returned 10'),
        (B, 'Cek stok BT-1 di Inventory > Item Master (luar Pharmacy)'),
        (P, 'Return 7 selesai'),
        (B, 'Kontrol Return habis ("-") belum diverifikasi'),
    ],
    'PHA-JRN-019': [
        (P, '"Every issued line" adalah rule default'),
        (P, 'Pilih branch -> Save "Verified lines only" -> toast muncul'),
        (P, 'Setelah reload tetap "Verified lines only"'),
        (B, 'Butuh pharmacist BR-B'),
        (B, 'Butuh head pharmacist "All branches"'),
    ],
    'PHA-JRN-020': [
        (P, 'Selector branch menawarkan semua branch'),
        (B, 'Butuh head pharmacist + store seed BR-A/BR-B'),
    ],
    'PHA-JRN-022': [
        (P, '/id/pharmacy terbuka, bahasa Indonesia aktif'),
        (P, 'Layar Dispense berbahasa Indonesia (Cari rekam medis, Penyerahan obat)'),
        (B, 'Butuh data pasien untuk menyelesaikan counter sale'),
        (B, 'Butuh data issue line untuk cek kolom bahasa Indonesia'),
    ],
    'PHA-JRN-023': [
        (P, 'Tab All + hint "Choose outpatient or inpatient..."'),
        (P, 'Tab Outpatient/Inpatient -> field Store muncul'),
        (B, 'Butuh branch tanpa order pending'),
        (P, 'Pager Issue Lines "Showing 1-28 of 28"'),
        (P, 'Halaman pager termuat'),
        (P, '"Paracetamol" cocok; "zzzz" mengosongkan tabel'),
    ],
    'PHA-JRN-038': [
        (F, 'DEVIASI: input 0 + Return diam-diam meng-return 1 unit (harusnya ditolak)'),
        (P, 'Input 11 ditolak - Returned tidak berubah'),
        (P, 'Return 7 berhasil - sel Returned ter-update persis'),
        (P, 'Return dari tab kedua ditolak'),
        (P, 'Setelah reload Returned = nilai awal + 3 persis'),
    ],
    'PHA-JRN-041': [
        (P, 'Return semua sisa unit berhasil'),
        (P, 'Orders tetap tidak menampilkan order tersebut'),
        (B, 'Cek invoice RX- di Hospital Accounts (luar Pharmacy)'),
    ],
    'PHA-JRN-043': [
        (F, 'Tidak redirect ke login - halaman Orders terbuka tanpa sesi'),
        (P, 'Sign-in -> Pharmacy, Orders terbuka'),
        (P, 'Sign out + browser Back -> kembali ke halaman login'),
    ],
    'PHA-JRN-046': [
        (B, 'Butuh pharmacist khusus BR-A'),
        (B, 'Butuh data issue line BR-A/BR-B'),
        (P, 'Selector branch menawarkan semua branch (login superadmin)'),
        (B, 'Butuh alamat order BR-B (/pharmacy/dispense?order=...)'),
        (B, 'Butuh store list per branch'),
    ],
    'PHA-JRN-050': [
        (P, 'Item QA-PARA ditambahkan ke wizard'),
        (P, 'Sign out di tab kedua -> halaman login'),
        (P, 'Reload: wizard kosong kembali (tidak ada setengah sale)'),
    ],
}

IMG_W, IMG_H, ROW_H = 420, 260, 196  # image fits exactly inside one G cell
G_COL_WIDTH = 60  # ~425 px, just wider than the image

# Journeys whose every step ran and passed in the automation.
PASS_ALL = {'PHA-JRN-011', 'PHA-JRN-024', 'PHA-JRN-026', 'PHA-JRN-042'}


def main() -> None:
    if not BACKUP.exists():
        shutil.copyfile(SRC, BACKUP)
    wb = openpyxl.load_workbook(SRC)
    ws = wb['Steps']

    rows_by_journey: dict[str, list[int]] = {}
    for r in range(2, ws.max_row + 1):
        jid = ws.cell(r, 1).value
        if jid:
            rows_by_journey.setdefault(str(jid).strip(), []).append(r)

    images = 0
    ws._images = []  # openpyxl keeps previously embedded images on load; start clean
    for jid, rows in rows_by_journey.items():
        partial = PARTIAL.get(jid, [])
        reason = REASON_ALL.get(jid, 'Data seed / role tidak tersedia di environment ini')
        shot = SHOTS / f'{jid}.png'
        # Skipped tests may leave a blank screenshot (~4 KB); embed only real captures.
        has_img = shot.exists() and shot.stat().st_size > 15_000

        for idx, r in enumerate(rows):
            if jid in PASS_ALL:
                status, note = P, 'Pass - diverifikasi otomatis'
            elif idx < len(partial):
                status, note = partial[idx]
            else:
                status, note = B, reason
            if status == P and not note:
                note = 'Pass - diverifikasi otomatis'
            ws.cell(r, 6).value = status
            ws.cell(r, 7).value = note
            if has_img:
                img = XLImage(str(shot))
                img.width, img.height = IMG_W, IMG_H
                ws.add_image(img, f'G{r}')
                ws.row_dimensions[r].height = ROW_H
                images += 1

    ws.column_dimensions['G'].width = G_COL_WIDTH
    wb.save(SRC)
    print(f'updated {sum(len(v) for v in rows_by_journey.values())} step rows, {images} screenshots embedded')


if __name__ == '__main__':
    main()
