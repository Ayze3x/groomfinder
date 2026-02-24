$zipPath = "..\AuraCraft.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
$items = Get-ChildItem -Path . -Exclude node_modules, .agent, .agents, .git
Compress-Archive -Path $items -DestinationPath $zipPath -Force
