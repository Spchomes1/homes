# Contracts

Buyer-facing paperwork for SPC Homes deals. The markdown file is the source of truth; the `.docx`
and `.pdf` are generated from it so the three never drift apart.

| Deal | Structure | Source |
|---|---|---|
| 3011 Harlan Dr, Mesquite TX 75150 | Consultation fee | `3011-harlan-dr-consultation-fee-agreement.md` |

## Regenerating the DOCX and PDF

Edit the `.md`, then rebuild both outputs:

```bash
cd contracts/build
npm install                      # one time — pulls the docx package
./build.sh ../3011-harlan-dr-consultation-fee-agreement.md
```

`build.sh` writes the `.docx` (via docx-js) and the `.pdf` (via headless Chromium print-to-PDF)
next to the markdown file. The PDF is what goes out to buyers for signature; the DOCX is there for
when a deal needs the terms edited before sending.

## Starting a new deal from this one

Copy the markdown, change the property description, the fee, the closing date and the title company,
and rebuild. Everything else — the non-circumvention term, the direction to the title company, the
no-brokerage language — is deal-independent and should stay as written.

## Before it goes out

These documents were drafted for SPC Homes' own use and have not been reviewed by outside counsel.
Have a Texas real estate attorney review the template once; after that, per-deal changes are just
the property, the fee and the dates.
