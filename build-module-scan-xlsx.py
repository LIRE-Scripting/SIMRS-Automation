"""Builds module-scan-QA.xlsx from data/module-scan/*.json.

Same layout as the pharmacy workbook: Summary, Journeys, Steps.
F = Status (Pass / Blocked), G = notes in Indonesian + embedded screenshot.
Journey status (Journeys!K) is a formula over the Steps sheet, like pharmacy.
"""

import json
from pathlib import Path

import openpyxl
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Font, PatternFill

SCAN_DIR = Path('data/module-scan')
OUT = Path('module-scan-QA.xlsx')
ADMINS = [('rs', 'RS'), ('apotek', 'Apotek'), ('klinik', 'Klinik')]

IMG_W, IMG_H, ROW_H = 420, 260, 196

# Login-page pseudo-modules produced when a scan could not authenticate.
SKIP_SLUGS = {'forgot-password'}

# Detailed blocked-notes for admins whose login never produced a real scan.
BLOCKED_NOTES = {
    'apotek': (
        'Blocked - login apotek.admin ditolak server: 15+ percobaan (3 run x 6 gagal + poll), '
        '1x sukses intermiten tanpa bisa dilanjutkan scan. Tanpa pesan error sama sekali (temuan UX). '
        'Saat verifikasi terakhir akun klikmed.superadmin yang sebelumnya selalu berhasil juga gagal - '
        'indikasi auth service staging tidak stabil / rate-limit per IP, bukan salah kredensial. '
        'Ulangi "node scan-modules.mjs apotek" saat auth normal, lalu jalankan ulang builder.'
    ),
    'klinik': (
        'Blocked - login klinik.admin ditolak server: 19+ percobaan, 0 sukses. '
        'Tanpa pesan error sama sekali (temuan UX). Auth service staging tidak stabil saat verifikasi '
        '(klikmed.superadmin pun ikut gagal) - ulangi "node scan-modules.mjs klinik" saat auth normal, '
        'lalu jalankan ulang builder.'
    ),
}
LOGIN_JOURNEY = {'apotek': 'Login & scan modul Apotek', 'klinik': 'Login & scan modul Klinik'}

HEAD_FILL = '1F4E5F'


def note_for(screen):
    d = screen.get('data') or {}
    if d.get('redirectedToLogin'):
        return 'Blocked', 'Sesi berakhir / akses ditolak - diarahkan ke halaman login'
    if d is None:
        return 'Blocked', 'Halaman gagal dimuat'
    tables = d.get('tables') or []
    rows = sum(t.get('rows', 0) for t in tables)
    if rows > 0:
        headers = ', '.join((tables[0].get('headers') or [])[:6])
        first = (tables[0].get('sample') or '')[:120]
        return 'Pass', f'{rows} baris data tampil (kolom: {headers}). Contoh: {first}'
    empty = d.get('empty')
    if empty:
        return 'Blocked', f'Belum ada data: "{empty}"'
    return 'Pass', 'Halaman tampil normal (tanpa tabel data)'


def main() -> None:
    wb = openpyxl.Workbook()
    summary = wb.active
    summary.title = 'Summary'

    # ---- Summary ----------------------------------------------------------
    summary['A1'] = 'Module scan - KlikMed HMIS'
    summary['A1'].font = Font(bold=True, size=14)
    summary['A2'] = 'Hasil scan otomatis semua modul per akun admin (tanggal: 2026-10-12)'
    headers = ['Akun', 'Login', 'Modul', 'Layar discan', 'Pass', 'Blocked']
    for c, h in enumerate(headers, 1):
        cell = summary.cell(4, c, h)
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill(start_color=HEAD_FILL, end_color=HEAD_FILL, fill_type='solid')
    row = 5
    totals = [0, 0, 0, 0]
    payloads = []
    for key, label in ADMINS:
        f = SCAN_DIR / f'{key}.json'
        if not f.exists():
            continue
        data = json.loads(f.read_text(encoding='utf-8'))
        data['modules'] = [m for m in data['modules'] if m['slug'] not in SKIP_SLUGS]
        payloads.append(data)
        n_mod = len(data['modules'])
        n_scr = n_pass = n_blk = 0
        for m in data['modules']:
            for s in m['screens']:
                st, _ = note_for(s)
                n_scr += 1
                n_pass += st == 'Pass'
                n_blk += st == 'Blocked'
        totals = [a + b for a, b in zip(totals, [n_mod, n_scr, n_pass, n_blk])]
        for c, v in enumerate([f'{label} ({data["username"]})', 'OK' if data['loginOk'] else 'GAGAL', n_mod, n_scr, n_pass, n_blk], 1):
            summary.cell(row, c, v)
        row += 1
    for c, v in enumerate(['Total', '', *totals], 1):
        cell = summary.cell(row, c, v)
        cell.font = Font(bold=True)
    for c, w in zip('ABCDEF', [26, 10, 8, 14, 8, 10]):
        summary.column_dimensions[c].width = w

    # ---- Journeys & Steps -------------------------------------------------
    jw = wb.create_sheet('Journeys')
    sw = wb.create_sheet('Steps')
    j_headers = ['Journey ID', 'Journey', 'Path', 'Priority', 'Role', 'Goal',
                 'Before you start', 'Test data', 'Check at the end', 'Steps', 'Status']
    s_headers = ['Journey ID', 'Journey', 'Step', 'Action', 'Expected result',
                 'Status', 'Actual result / notes', 'Tester', 'Date', 'Defect ID']
    jw.append(j_headers)
    sw.append(s_headers)

    n_rows = 1
    for data in payloads:
        key = data['admin']
        label = dict(ADMINS)[key]
        # Drop the login-page pseudo-module; if nothing real remains, the scan
        # is blocked on authentication and gets one documented journey instead.
        mods = [m for m in data['modules'] if m['slug'] not in SKIP_SLUGS]
        if not mods and key in BLOCKED_NOTES:
            mods = [{
                'slug': 'login', 'name': LOGIN_JOURNEY[key],
                'screens': [{
                    'label': 'login',
                    'data': {'requested': '/id/login', 'redirectedToLogin': True},
                    'shot': f'screenshots-scan/{key}-apps.png',
                }],
            }]
        prefix = key[:3].upper()
        for i, mod in enumerate(mods, 1):
            jid = f'{prefix}-{i:03d}'
            name = f'Module scan: {mod["name"] or mod["slug"]}'
            n_steps = len(mod['screens'])
            jw.append([jid, name, 'Scan struktur & data', 'P1', data['username'],
                       'Semua layar modul tampil dan datanya tersedia',
                       'Login sebagai admin', '-', 'Setiap layar punya SS di kolom G',
                       n_steps,
                       f'=IF(COUNTIFS(Steps!$A$2:$A$500,A{{ROW}},Steps!$F$2:$F$500,"Fail")>0,"Fail",'
                       f'IF(COUNTIFS(Steps!$A$2:$A$500,A{{ROW}},Steps!$F$2:$F$500,"Blocked")>0,"Blocked",'
                       f'IF(COUNTIFS(Steps!$A$2:$A$500,A{{ROW}},Steps!$F$2:$F$500,"Pass")=J{{ROW}},"Pass","In progress")))'
                       .replace('{ROW}', str(jw.max_row + 1))])
            for step, screen in enumerate(mod['screens'], 1):
                status, note = note_for(screen)
                if mod['slug'] == 'login':
                    note = BLOCKED_NOTES[key]
                d = screen.get('data') or {}
                n_rows += 1
                sw.append([jid, name, step,
                           f'Buka {d.get("path") or d.get("requested") or screen.get("requested", "")}',
                           'Halaman tampil dan datanya tersedia',
                           status, note, '', '', ''])
                shot = d.get('shot') or screen.get('shot')
                if shot and Path(shot).exists() and Path(shot).stat().st_size > 15_000:
                    img = XLImage(shot)
                    img.width, img.height = IMG_W, IMG_H
                    sw.add_image(img, f'G{n_rows}')
                    sw.row_dimensions[n_rows].height = ROW_H

    for c, w in zip('ABCDEFG', [12, 34, 6, 40, 34, 10, 60]):
        sw.column_dimensions[c].width = w
    for c, w in zip('ABCDEFGHIJK', [12, 34, 18, 8, 16, 36, 24, 12, 30, 7, 10]):
        jw.column_dimensions[c].width = w
    for sheet in (jw, sw):
        for cell in sheet[1]:
            cell.font = Font(bold=True, color='FFFFFF')
            cell.fill = PatternFill(start_color=HEAD_FILL, end_color=HEAD_FILL, fill_type='solid')
        sheet.freeze_panes = 'A2'

    wb.save(OUT)
    print(f'saved {OUT}: {jw.max_row - 1} journeys, {sw.max_row - 1} steps')


if __name__ == '__main__':
    main()
