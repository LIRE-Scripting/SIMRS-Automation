$ErrorActionPreference = 'Stop'
$path = 'C:\Users\Administrator\Documents\automation\pharmacy-test-journeys-QA.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open($path, 0, $false)
  $excel.CalculateFullRebuild()
  $wb.Save()
  $wb.Close($false)
  Write-Output 'RECALC SAVED'
} finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
