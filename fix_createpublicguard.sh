#!/bin/bash
cd "c:/dev/saju-astro-chat"

# Replace in each file
for file in "src/app/api/destiny-map/route.ts" "src/app/api/iching/changing-line/route.ts" "src/app/api/tarot/chat/route.ts" "src/app/api/tarot/prefetch/route.ts"; do
  echo "Fixing $file..."
  sed -i 's/createPublicGuard/createSimpleGuard/g' "$file"
done

echo "All files fixed!"
