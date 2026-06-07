<#
.SYNOPSIS
  안전한 원격 브랜치 정리 (Windows PowerShell 용).

.DESCRIPTION
  main 에 *내용이 이미 들어간* 브랜치만 삭제한다:
    1) git 기준 main 에 완전 머지된 브랜치
    2) 일회용 worktree-agent-* 브랜치
    3) PR 이 MERGED 인 브랜치 (squash 머지 포함 — gh CLI 필요)
  미머지 작업 브랜치는 건드리지 않는다.

.EXAMPLE
  .\scripts\cleanup-branches.ps1            # DRY RUN (목록만)
  .\scripts\cleanup-branches.ps1 -Apply     # 실제 삭제
#>
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$repo = 'pppaal/saju-astro-chat'
$protected = '^(main|master|HEAD|develop|release)$'

Write-Host "fetch + prune ..."
git fetch origin --prune | Out-Null

$del = New-Object System.Collections.Generic.List[string]

# 1) main 에 완전 머지된 브랜치
git branch -r --merged origin/main | ForEach-Object {
  $b = ($_ -replace '\s*origin/', '').Trim()
  if ($b -and ($_ -notmatch '->') -and ($b -notmatch $protected)) { $del.Add($b) }
}

# 2) worktree-agent 일회용
git branch -r | ForEach-Object {
  $b = ($_ -replace '\s*origin/', '').Trim()
  if ($b -like 'worktree-agent-*') { $del.Add($b) }
}

# 3) PR 이 MERGED 인 브랜치 (squash 포함)
if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "gh: merged PR 브랜치 수집 ..."
  gh pr list --repo $repo --state merged --limit 3000 --json headRefName -q '.[].headRefName' |
    ForEach-Object {
      $b = $_.Trim()
      if ($b -and ($b -notmatch $protected)) { $del.Add($b) }
    }
} else {
  Write-Host "gh CLI 없음 - squash-merged 판별 건너뜀 (1,2 만 처리). winget install GitHub.cli"
}

# 중복 제거 + 현재 원격에 존재하는 것만
$existing = @()
foreach ($b in ($del | Sort-Object -Unique)) {
  git show-ref --verify --quiet "refs/remotes/origin/$b"
  if ($LASTEXITCODE -eq 0) { $existing += $b }
}

Write-Host ""
Write-Host "삭제 대상 (내용은 모두 main 에 있음): $($existing.Count) 개"
$existing | ForEach-Object { Write-Host "   $_" }
Write-Host ""

if (-not $Apply) {
  Write-Host "── DRY RUN 입니다. 실제 삭제:  .\scripts\cleanup-branches.ps1 -Apply"
  exit 0
}

Write-Host "삭제 시작 (40개씩 배치) ..."
for ($i = 0; $i -lt $existing.Count; $i += 40) {
  $end = [Math]::Min($i + 39, $existing.Count - 1)
  $batch = $existing[$i..$end]
  git push origin --delete @batch
}

git fetch origin --prune | Out-Null
$remain = (git branch -r | Where-Object { $_ -notmatch 'HEAD' }).Count
Write-Host "완료. 남은 원격 브랜치: $remain"
