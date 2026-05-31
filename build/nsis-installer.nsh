; Custom NSIS installer script for Kelex Downloader
; This adds custom pages and behaviors to the Windows installer

!macro customWelcomePage
  !insertMacro MUI_PAGE_WELCOME
!macroend

!macro customInstall
  ; Create a firewall rule to allow Kelex (optional - can be uncommented)
  ; nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Kelex Downloader" dir=in action=allow program="$INSTDIR\Kelex Downloader.exe" enable=yes'
!macroend

!macro customUnInstall
  ; Remove firewall rule on uninstall
  ; nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Kelex Downloader"'
!macroend
