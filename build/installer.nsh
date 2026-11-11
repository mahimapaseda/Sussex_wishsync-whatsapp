!macro customInstall
  ${if} $installMode == "all"
    SetShellVarContext current
  ${endif}

  DetailPrint "Preparing clean WishSync application data..."
  RMDir /r "$APPDATA\WishSync"
  RMDir /r "$APPDATA\@mahimapaseda\wishsync"
  RMDir /r "$APPDATA\SheetPulse"
  RMDir /r "$LOCALAPPDATA\wishsync-updater"
  RMDir /r "$INSTDIR\.wwebjs_cache"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SheetPulse"

  ${if} $installMode == "all"
    SetShellVarContext all
  ${endif}
!macroend

!macro customUnInstall
  ${if} $installMode == "all"
    SetShellVarContext current
  ${endif}

  RMDir /r "$APPDATA\WishSync"
  RMDir /r "$APPDATA\@mahimapaseda\wishsync"
  RMDir /r "$APPDATA\SheetPulse"
  RMDir /r "$LOCALAPPDATA\wishsync-updater"
  RMDir /r "$INSTDIR\.wwebjs_cache"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WishSync"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SheetPulse"

  ${if} $installMode == "all"
    SetShellVarContext all
  ${endif}
!macroend

