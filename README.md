# devfest-sara-tasfia
Tender Document Package Builder - AI DevFest 2026
# Tender Document Package Builder

**Name:** Sara Tasfia
**Registration number:** [Sara_Tasfia]
**Live link:** https://sara-tasfia.github.io/devfest-sara-tasfia/

## How to run
No build step. Open the live link in Chrome, or open `index.html` locally.
1. Load `requirements.json`
2. Upload PDF files
3. Match each file to a document and enter expiry dates
4. Click Generate package

## Main features done
- Load requirements and show tender details, sorted by order
- Multi-file PDF upload with page count; non-PDF files rejected with a clear message; remove files
- One-to-one matching with change/undo
- Expiry date entry and live status (Missing, Expiry date needed, Expired, Not provided, OK)
- Duplicate detection by SHA-256 content hash; duplicates cannot be matched to different documents
- Generate button disabled with reasons while blocking problems exist
- Combined PDF: English cover page, documents in order, footer `T-2026-0417 | Page X of Y` in a separate strip so content is not covered
- Full Bangla/English switch

## Bonus features
- Auto-match suggestions from file names
- Export checklist as CSV (UTF-8 BOM)
- Save/restore matches, dates and language in browser storage
- Safe handling of damaged or password-protected PDFs

## Known problems
- No index page
- Bangla text is not shown on the PDF cover (cover is English as required)
- Non-Latin characters on the cover are replaced with "?"
- Rotated source pages are not auto-corrected

## AI tools used
Claude (Anthropic)

## Most useful prompt
"Build a frontend-only tender package builder with upload, matching, status checks, duplicate detection, Bangla/English toggle and PDF generation with cover page and footer."