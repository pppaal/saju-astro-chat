# Run key pre-deploy checks for backend_ai data quality and perf snapshot.

$env:PYTHONUTF8 = "1"

Write-Host "== Domain quality report =="
python backend_ai/tools/domain_quality_report.py

Write-Host "`n== Content sampling (top repeats) =="
python backend_ai/tools/content_sampling.py

Write-Host "`n== Performance profile (CPU) =="
python backend_ai/tools/performance_profile.py --device=cpu

Write-Host "`nDone."
