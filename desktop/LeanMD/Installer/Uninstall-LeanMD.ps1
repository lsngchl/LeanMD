[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$appName = 'LeanMD'
$progId = 'LeanMD.Markdown'
$localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
$installDirectory = [IO.Path]::GetFullPath((Join-Path $localAppData 'Programs\LeanMD'))
$profileDirectory = [IO.Path]::GetFullPath((Join-Path $localAppData 'LeanMD'))
$currentUser = [Microsoft.Win32.Registry]::CurrentUser

foreach ($extension in @('.md', '.markdown')) {
    $openWith = $currentUser.OpenSubKey("Software\Classes\$extension\OpenWithProgids", $true)
    if ($null -ne $openWith) {
        $openWith.DeleteValue($progId, $false)
        $openWith.Close()
    }
}

$currentUser.DeleteSubKeyTree("Software\Classes\$progId", $false)
$currentUser.DeleteSubKeyTree('Software\Classes\Applications\LeanMD.exe', $false)
$currentUser.DeleteSubKeyTree('Software\LeanMD', $false)
$currentUser.DeleteSubKeyTree('Software\Microsoft\Windows\CurrentVersion\Uninstall\LeanMD', $false)

$registeredApplications = $currentUser.OpenSubKey('Software\RegisteredApplications', $true)
if ($null -ne $registeredApplications) {
    $registeredApplications.DeleteValue($appName, $false)
    $registeredApplications.Close()
}

$programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
$shortcutPath = Join-Path $programs 'LeanMD.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
}

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class LeanMDShellNotify {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(uint eventId, uint flags, IntPtr item1, IntPtr item2);
}
'@
[LeanMDShellNotify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)

$cleanupPath = Join-Path ([IO.Path]::GetTempPath()) "LeanMD-cleanup-$PID.ps1"
$escapedInstall = $installDirectory.Replace("'", "''")
$escapedProfile = $profileDirectory.Replace("'", "''")
$cleanup = @"
Start-Sleep -Milliseconds 750
if (Test-Path -LiteralPath '$escapedInstall') {
    Remove-Item -LiteralPath '$escapedInstall' -Recurse -Force
}
if (Test-Path -LiteralPath '$escapedProfile') {
    Remove-Item -LiteralPath '$escapedProfile' -Recurse -Force
}
Remove-Item -LiteralPath `$PSCommandPath -Force
"@
[IO.File]::WriteAllText($cleanupPath, $cleanup, [Text.UTF8Encoding]::new($false))
Start-Process powershell.exe -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$cleanupPath`"") -WindowStyle Hidden

Write-Host 'LeanMD was unregistered and will be removed.'
