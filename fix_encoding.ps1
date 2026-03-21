$bytes = [System.IO.File]::ReadAllBytes('index.js')
$text = [System.Text.Encoding]::Latin1.GetString($bytes)
$text = $text -replace 'vitÃ³rias', 'vitorias'
$text = $text -replace 'Ã³', 'o'
$text = $text -replace 'Ã©', 'e'
$text = $text -replace 'Ã§Ã£o', 'cao'
$text = $text -replace 'Ã§', 'c'
$text = $text -replace 'Ã£o', 'ao'
$text = $text -replace 'Ã£', 'a'
$text = $text -replace 'Ã¡', 'a'
$text = $text -replace 'Ã­', 'i'
$text = $text -replace 'Ãº', 'u'
$text = $text -replace 'Ã\x83', 'A'
$outBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
[System.IO.File]::WriteAllBytes("$PWD\index.js", $outBytes)
Write-Host "Feito!"
