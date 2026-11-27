# Rebuilds images/map.jpg from the Lotus squaremap (https://lotus.blossomcraft.org).
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File Highway\tools\update-map.ps1
#
# squaremap tiles are 512x512 px at tiles/<world>/<zoom>/<x>_<z>.png.
# This server's max zoom is 3 (1 block per pixel), so zoom 0 is 8 blocks per pixel
# and each zoom-0 tile covers 4096 x 4096 blocks.

param(
  [int]$MinX = -25000, [int]$MaxX = 25000,   # must match X in js/main.js (Z covers the live map's full height)
  [int]$MinZ = -25000, [int]$MaxZ = 25000,   # must match IMG_Z in js/main.js
  [int]$OutWidth = 2400,
  [int]$Quality = 82,
  [ValidateRange(0, 3)][int]$Zoom = 0,       # squaremap zoom: 0 = 8 blocks/pixel ... 3 = 1 block/pixel
  [string]$OutFile = "map.jpg"               # file name inside images/
)
# Home page image (area around spawn and the Hub), for example:
#   powershell -ExecutionPolicy Bypass -File Highway\tools\update-map.ps1 -MinX 0 -MaxX 3200 -MinZ -1000 -MaxZ 1000 -Zoom 2 -OutWidth 1600 -OutFile hero.jpg

Add-Type -AssemblyName System.Drawing
$base = "https://lotus.blossomcraft.org/tiles/minecraft_overworld/$Zoom"
$blocksPerTile = 512 * [Math]::Pow(2, 3 - $Zoom)

[int]$tx0 = [Math]::Floor($MinX / $blocksPerTile); [int]$tx1 = [Math]::Floor(($MaxX - 1) / $blocksPerTile)
[int]$tz0 = [Math]::Floor($MinZ / $blocksPerTile); [int]$tz1 = [Math]::Floor(($MaxZ - 1) / $blocksPerTile)

[int]$outH = [Math]::Round($OutWidth * ($MaxZ - $MinZ) / ($MaxX - $MinX))
[double]$s = $OutWidth / ($MaxX - $MinX)              # output pixels per block
[single]$tileOut = $blocksPerTile * $s

$out = New-Object System.Drawing.Bitmap ([int]$OutWidth), ([int]$outH)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(255, 30, 40, 38))

$attrs = New-Object System.Drawing.Imaging.ImageAttributes
$attrs.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
$wc = New-Object System.Net.WebClient
$n = 0; $total = ($tx1 - $tx0 + 1) * ($tz1 - $tz0 + 1); $missing = 0
for ($tz = $tz0; $tz -le $tz1; $tz++) {
  for ($tx = $tx0; $tx -le $tx1; $tx++) {
    $n++; Write-Progress -Activity "Downloading map tiles" -Status "$n / $total" -PercentComplete ($n / $total * 100)
    try {
      $bytes = $wc.DownloadData("$base/${tx}_${tz}.png")
      if ($bytes.Length -eq 0) { $missing++; continue }
      $ms = New-Object System.IO.MemoryStream (, $bytes)
      $img = [System.Drawing.Image]::FromStream($ms)
      [single]$dx = ($tx * $blocksPerTile - $MinX) * $s
      [single]$dy = ($tz * $blocksPerTile - $MinZ) * $s
      # TileFlipXY stops faint seams appearing along tile edges when scaling
      $dest = New-Object System.Drawing.Rectangle ([int][Math]::Floor($dx)), ([int][Math]::Floor($dy)), ([int][Math]::Ceiling($tileOut) + 1), ([int][Math]::Ceiling($tileOut) + 1)
      $g.DrawImage($img, $dest, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
      $img.Dispose(); $ms.Dispose()
    } catch { $missing++; Write-Warning "Tile ${tx}_${tz}: $($_.Exception.Message)" }
  }
}
$g.Dispose()

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$dest = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\images\$OutFile"))
$out.Save($dest, $jpeg, $params); $out.Dispose()
"Saved $dest ($OutWidth x $outH, $([Math]::Round((Get-Item $dest).Length / 1KB)) KB, $($total - $missing)/$total tiles)"
