# Windows Code Signing

## Prerequisites
- A valid Windows code-signing certificate (`.pfx`)
- Certificate password

## One-time (PowerShell, current session)
```powershell
$env:CSC_LINK="C:\path\to\your-certificate.pfx"
$env:CSC_KEY_PASSWORD="your-pfx-password"
```

## Build signed installer + portable
```powershell
npm run electron:build:signed:clean
```

Output:
- `release/namou-1.0.0-setup.exe`
- `release/namou-1.0.0-portable.exe`

## Notes
- Existing unsigned flow is kept:
  - `npm run electron:build:clean`
- Signed flow uses electron-builder default signing path with `CSC_LINK` / `CSC_KEY_PASSWORD`.
