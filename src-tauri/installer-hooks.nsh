!include "WinVer.nsh"
!macro NSIS_HOOK_PREINSTALL
  ${IfNot} ${AtLeastWin11}
    MessageBox MB_OK|MB_ICONSTOP "O VIO com áudio por aplicativo precisa do Windows 11 (64 bits)."
    Abort
  ${EndIf}
!macroend
