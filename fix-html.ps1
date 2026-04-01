$file = "c:\Users\admin\.gemini\antigravity\playground\dynamic-ride\photography-coach-ai-gemini3\index.html"
$content = Get-Content $file -Raw
# Remove importmap script block
$pattern = '(?s)\s*<script type="importmap">.*?</script>'
$content = $content -replace $pattern, ''
Set-Content $file -Value $content -NoNewline
Write-Host "Done - importmap removed"
