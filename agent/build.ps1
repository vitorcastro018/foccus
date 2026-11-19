# Gera agent\dist\Foccus.exe (precisa do .NET 8 SDK: https://dotnet.microsoft.com/download/dotnet/8.0)
$ErrorActionPreference = "Stop"
dotnet publish "$PSScriptRoot\Foccus.Agent" -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true `
  -o "$PSScriptRoot\dist"
Write-Host "`nPronto: $PSScriptRoot\dist\Foccus.exe"
