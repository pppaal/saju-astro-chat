#!/usr/bin/env bash
# ============================================================================
# cleanup-branches.sh — 안전한 원격 브랜치 정리
#
# main 에 *내용이 이미 들어간* 브랜치만 삭제한다:
#   1) git 기준 main 에 완전 머지된 브랜치
#   2) 일회용 worktree-agent-* 브랜치
#   3) PR 이 MERGED 인 브랜치  ← squash 머지(=git 은 '안 머지'로 보지만 내용은
#      main 에 있는 경우)까지 안전하게 포함. (gh CLI 필요)
#
# 미머지 작업이 있는 브랜치는 절대 건드리지 않는다.
#
# 사용법:
#   ./cleanup-branches.sh           # DRY RUN — 삭제 목록만 출력 (실제 삭제 X)
#   APPLY=1 ./cleanup-branches.sh   # 실제 삭제
#
# 사전:
#   - 이 저장소 로컬 클론에서 실행
#   - 3) 을 쓰려면 gh CLI 로그인:  gh auth login
# ============================================================================
set -euo pipefail

REPO="pppaal/saju-astro-chat"
APPLY="${APPLY:-0}"
PROTECTED='^(main|master|HEAD|develop|release)$'

echo "▶ fetch + prune …"
git fetch origin --prune

declare -a del=()

# 1) main 에 완전 머지된 브랜치
while IFS= read -r b; do
  [[ -z "$b" || "$b" =~ $PROTECTED ]] && continue
  del+=("$b")
done < <(git branch -r --merged origin/main | sed 's# *origin/##' | grep -vE '\->' || true)

# 2) 일회용 worktree-agent 브랜치
while IFS= read -r b; do
  [[ -z "$b" ]] && continue
  del+=("$b")
done < <(git branch -r | sed 's# *origin/##' | grep -E '^worktree-agent-' || true)

# 3) PR 이 MERGED 인 브랜치 (squash 머지 포함)
if command -v gh >/dev/null 2>&1; then
  echo "▶ gh: merged PR 브랜치 수집 …"
  while IFS= read -r b; do
    [[ -z "$b" || "$b" =~ $PROTECTED ]] && continue
    del+=("$b")
  done < <(gh pr list --repo "$REPO" --state merged --limit 3000 \
             --json headRefName -q '.[].headRefName' || true)
else
  echo "⚠ gh CLI 없음 — squash-merged 판별 건너뜀 (1·2 만 처리)."
  echo "  더 정리하려면:  brew install gh && gh auth login"
fi

# 중복 제거 + 현재 원격에 존재하는 것만
declare -a existing=()
while IFS= read -r b; do
  git show-ref --verify --quiet "refs/remotes/origin/$b" && existing+=("$b")
done < <(printf '%s\n' "${del[@]}" | sort -u)

echo ""
echo "▶ 삭제 대상 (내용은 모두 main 에 있음): ${#existing[@]} 개"
printf '   %s\n' "${existing[@]}"
echo ""

if [[ "$APPLY" != "1" ]]; then
  echo "── DRY RUN 입니다. 위 목록 확인 후 실제 삭제:"
  echo "     APPLY=1 $0"
  exit 0
fi

echo "▶ 삭제 시작 (40개씩 배치) …"
declare -a batch=()
flush() { (( ${#batch[@]} )) && git push origin --delete "${batch[@]}"; batch=(); }
for b in "${existing[@]}"; do
  batch+=("$b")
  (( ${#batch[@]} == 40 )) && flush
done
flush

git fetch origin --prune
echo "✅ 완료. 남은 원격 브랜치: $(git branch -r | grep -vc 'HEAD')"
