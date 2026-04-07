$env:NEXT_DIST_DIR = 'tmp/.next-playwright-tarot'
$env:NEXT_FONT_GOOGLE_MOCKED_RESPONSES = 'c:\Users\pjyrh\Desktop\saju-astro-chat-backup-latest\tests\playwright\google-fonts-mock.js'
$env:DEMO_TOKEN = 'demo-test-token'
$env:SUPPORT_EMAIL = 'support@destinypal.com'
Set-Location 'c:\Users\pjyrh\Desktop\saju-astro-chat-backup-latest'
npx next dev --webpack --port 3007
