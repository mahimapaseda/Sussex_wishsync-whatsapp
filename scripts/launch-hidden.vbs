' SheetPulse Birthday Wisher - Silent Background Launcher
' Runs node src/index.js without popping up a black CMD console window

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = projectDir

' 0 = Hide window, False = Don't wait for return
objShell.Run "cmd /c node src/index.js", 0, False

