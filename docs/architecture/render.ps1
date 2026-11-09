# Рендер deck.html в slide-1..5.png и architecture.pdf через headless Edge.
# Запуск: powershell -ExecutionPolicy Bypass -File docs/architecture/render.ps1

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$dir = $PSScriptRoot
# «#» в пути (папка c#) браузер принял бы за якорь — экранируем.
$url = "file:///" + (($dir -replace '\\', '/') -replace '#', '%23') + "/deck.html"
$userData = Join-Path $env:TEMP "edge-render-profile"
$common = @("--headless=new", "--disable-gpu", "--hide-scrollbars", "--user-data-dir=`"$userData`"", "--virtual-time-budget=8000")

foreach ($i in 1..5) {
    Start-Process -FilePath $edge -Wait -WindowStyle Hidden -ArgumentList ($common + @(
        "--window-size=1920,1080", "--screenshot=`"$dir\slide-$i.png`"", "`"$url`?slide=$i`""))
}

Start-Process -FilePath $edge -Wait -WindowStyle Hidden -ArgumentList ($common + @(
    "--no-pdf-header-footer", "--print-to-pdf=`"$dir\architecture.pdf`"", "`"$url`""))

Get-ChildItem $dir -Include *.png, *.pdf -Recurse | Select-Object Name, Length
