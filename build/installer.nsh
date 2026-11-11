!macro customHeader
  !ifndef BUILD_UNINSTALLER
    Section "-PreserveWishSyncAppData"
      ${if} $installMode == "all"
        SetShellVarContext current
      ${endif}

      ${If} ${FileExists} "$APPDATA\WishSync\*.*"
        CheckWishSyncRunning:
          nsExec::Exec '"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq WishSync.exe" /NH | "$SYSDIR\findstr.exe" /I "WishSync.exe"'
          Pop $0
          ${If} $0 == 0
            MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "WishSync is currently running. Please close WishSync so your linked WhatsApp session and Google Sheets data can be preserved safely, then click Retry." /SD IDCANCEL IDRETRY CheckWishSyncRunning
            Abort
          ${EndIf}

        DetailPrint "Backing up existing WishSync data before upgrade..."
        RMDir /r "$APPDATA\WishSync_upgrade_backup"
        CreateDirectory "$APPDATA\WishSync_upgrade_backup"
        CopyFiles /SILENT "$APPDATA\WishSync\*.*" "$APPDATA\WishSync_upgrade_backup"
      ${EndIf}

      ${if} $installMode == "all"
        SetShellVarContext all
      ${endif}
    SectionEnd
  !endif
!macroend

!macro customInstall
  ${if} $installMode == "all"
    SetShellVarContext current
  ${endif}

  ; Preserve user data (%APPDATA%\WishSync: WhatsApp .wwebjs_auth, google_token.json, settings.json, sent_log.json).
  ; If upgrading from an older version (e.g. v1.0.6) whose uninstaller deleted %APPDATA%\WishSync, restore from backup.
  ${If} ${FileExists} "$APPDATA\WishSync_upgrade_backup\*.*"
    ${IfNot} ${FileExists} "$APPDATA\WishSync\*.*"
      DetailPrint "Restoring WishSync client data and linked sessions..."
      RMDir /r "$APPDATA\WishSync"
      Rename "$APPDATA\WishSync_upgrade_backup" "$APPDATA\WishSync"
    ${ElseIfNot} ${FileExists} "$APPDATA\WishSync\settings.json"
      DetailPrint "Restoring WishSync settings and linked sessions..."
      CopyFiles /SILENT "$APPDATA\WishSync_upgrade_backup\*.*" "$APPDATA\WishSync"
      RMDir /r "$APPDATA\WishSync_upgrade_backup"
    ${Else}
      RMDir /r "$APPDATA\WishSync_upgrade_backup"
    ${EndIf}
  ${EndIf}

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

  ; Preserve %APPDATA%\WishSync so linked WhatsApp & Google Sheets client data survives upgrades and reinstalls.
  RMDir /r "$INSTDIR\.wwebjs_cache"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WishSync"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SheetPulse"

  ${if} $installMode == "all"
    SetShellVarContext all
  ${endif}
!macroend

