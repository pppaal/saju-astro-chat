<#
.SYNOPSIS
  Safe remote branch cleanup (Windows PowerShell).
.DESCRIPTION
  Deletes only branches whose content is already in main:
    1) branches fully merged into main (git)
    2) ephemeral worktree-agent-* branches
    3) branches of MERGED pull requests (covers squash-merges; needs gh CLI)
  Branches with unmerged work are never touched.
.EXAMPLE
  .\scripts\cleanup-branches.ps1            # DRY RUN (list only)
  .\scripts\cleanup-branches.ps1 -Apply     # actually delete
#>
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$repo = 'pppaal/saju-astro-chat'
$protected = '^(main|master|HEAD|develop|release)$'

Write-Host "fetch + prune ..."
git fetch origin --prune | Out-Null

$del = New-Object System.Collections.Generic.List[string]

# 1) merged into main
git branch -r --merged origin/main | ForEach-Object {
  $b = ($_ -replace '\s*origin/', '').Trim()
  if ($b -and ($_ -notmatch '->') -and ($b -notmatch $protected)) { $del.Add($b) }
}

# 2) ephemeral worktree-agent branches
git branch -r | ForEach-Object {
  $b = ($_ -replace '\s*origin/', '').Trim()
  if ($b -like 'worktree-agent-*') { $del.Add($b) }
}

# 3) branches of MERGED PRs (covers squash-merges)
if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "gh: collecting merged-PR branches ..."
  gh pr list --repo $repo --state merged --limit 3000 --json headRefName -q '.[].headRefName' |
    ForEach-Object {
      $b = $_.Trim()
      if ($b -and ($b -notmatch $protected)) { $del.Add($b) }
    }
} else {
  Write-Host "gh CLI not found - skipping squash-merge detection (only 1,2). Install: winget install GitHub.cli"
}

# unique + only branches that still exist on the remote
$existing = @()
foreach ($b in ($del | Sort-Object -Unique)) {
  git show-ref --verify --quiet "refs/remotes/origin/$b"
  if ($LASTEXITCODE -eq 0) { $existing += $b }
}

Write-Host ""
Write-Host ("To delete (content already in main): {0}" -f $existing.Count)
$existing | ForEach-Object { Write-Host "   $_" }
Write-Host ""

if (-not $Apply) {
  Write-Host "DRY RUN. To actually delete:  .\scripts\cleanup-branches.ps1 -Apply"
  exit 0
}

Write-Host "Deleting in batches of 40 ..."
for ($i = 0; $i -lt $existing.Count; $i += 40) {
  $end = [Math]::Min($i + 39, $existing.Count - 1)
  $batch = $existing[$i..$end]
  git push origin --delete @batch
}

git fetch origin --prune | Out-Null
$remain = (git branch -r | Where-Object { $_ -notmatch 'HEAD' }).Count
Write-Host ("Done. Remaining remote branches: {0}" -f $remain)
