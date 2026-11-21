# Mahakal Neuro Wellness Center — Dr. Umesh Shukla (static clone)

A complete, working static clone of **https://www.drumeshshukla.com/** — Dr. Umesh Shukla,
M.D. (Ayurved), Neuro · Spine · Joint · Immunity Specialist, Ujjain (M.P.).

Every page, section, therapy, review and blog article from the live site is included, rebuilt as
clean hand-written HTML/CSS/JS (no React, no build step, no dependencies).

## Run it

Just open `index.html` in a browser, or serve the folder:

```bash
# any static server works
npx serve .
# or
python -m http.server 8000
```

Then visit `http://localhost:8000/`.

## Pages

| File | Live route |
| --- | --- |
| `index.html` | `/` |
| `about.html` | `/about` |
| `treatments.html` | `/treatments` (12 condition sections with anchors) |
| `panchkarma.html` | `/panchkarma` (9 therapy sections + 3-phase process) |
| `testimonials.html` | `/testimonials` |
| `gallery.html` | `/gallery` |
| `blog.html` | `/blog` |
| `blog-*.html` (6 files) | `/blog/<slug>` |
| `contact.html` | `/contact` |
| `appointment.html` | `/appointment` |

## What actually works

- **Fixed nav** that turns dark/blurred on scroll, active-link highlighting, animated hamburger drawer
  with backdrop, Esc to close and body-scroll lock.
- **Animated stat counters** (5000+, 15+, 4.9★, 0) that count up when scrolled into view.
- **Patient review grid** — all 8 verified reviews in a responsive card grid, as on the live site.
- **Gallery lightbox** — click/tap any tile, Esc or backdrop to close.
- **Appointment forms** on Home, Contact and Appointment pages: inline validation, error states,
  success card, then automatic WhatsApp hand-off (`wa.me/919993032780`) pre-filled with
  name, phone, condition, city, preferred time and message — exactly like the live site.
- **Scroll reveals**, floating WhatsApp / Call / scroll-to-top buttons, smooth in-page anchors.
- **Social icons** in the footer (Facebook, Instagram, WhatsApp, Google Maps) with the same links as the live site.
- Reduced-motion support, responsive down to 360 px, accessible focus states and ARIA labels.

## Live site

Production deployment: **https://drumeshshukla.vercel.app** (Vercel)

## Admin console

**https://drumeshshukla.vercel.app/admin** → redirects to a server-verified login, then opens the
console. This is the only page on the site with a backend.

| Tab | What it does |
| --- | --- |
| Enquiries | Every appointment form submission, with search, status (New → Contacted → Booked → Closed), one-tap WhatsApp reply, delete and CSV export |
| Site health | Live status of all 15 routes, security header score, last commit |
| Contact | Phone, addresses, OPD timings, social and review links with copy buttons |
| Deploy | Publish commands and how the data flow works |

**One-tap access (owner's own devices)**

`/api/enter?t=<ADMIN_ACCESS_TOKEN>` sets a 30-day session and redirects straight to the console, so
the password never has to be typed on a trusted device. The token lives in the environment — change
`ADMIN_ACCESS_TOKEN` and every saved link stops working instantly. Until then, treat that URL like
a password.

**How it is secured**

- `POST /api/login` compares the password against a scrypt hash (`ADMIN_PASSWORD_HASH`) with
  `timingSafeEqual`; 8 wrong attempts from one IP pause logins for 10 minutes.
- The session is a signed HMAC cookie — `HttpOnly`, `Secure`, `SameSite=Lax`, 8 hours.
- `middleware.js` checks that cookie at the edge and redirects `/admin` to `/admin/login` before
  any HTML is served, so the console markup is never shipped to a signed-out visitor.
- Lead data lives in a separate `data` branch, encrypted with AES-256-GCM (`LEADS_KEY`) — the public
  repository only ever contains ciphertext, and that branch is excluded from deployments.
- Forms still hand off to WhatsApp after saving, so a visitor is never blocked by the network.

**Environment variables** (set in Vercel → Project → Settings → Environment Variables)

| Name | Purpose |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | `scrypt$<salt hex>$<hash hex>` for the admin password |
| `SESSION_SECRET` | Random 32-byte hex — signs session cookies in `api/` and `middleware.js` |
| `LEADS_KEY` | Random 32-byte hex — encrypts the enquiry store |
| `GH_DATA_TOKEN` | GitHub token with contents read/write on the repo (data branch only) |

Regenerate the password hash:

```bash
node -e "const c=require('crypto');const p=process.argv[1];const s=c.randomBytes(16);console.log('scrypt$'+s.toString('hex')+'$'+c.scryptSync(p,s,32).toString('hex'))" "new-password"
```

## Designed & developed by

**Aditya Raj Singh** — [github.com/adityarajsinghsisodiya000](https://github.com/adityarajsinghsisodiya000)

Source: [github.com/adityarajsinghsisodiya000/drumeshshukla](https://github.com/adityarajsinghsisodiya000/drumeshshukla)

## Structure

```
assets/
  css/style.css      design system + all components (~2,100 lines)
  js/main.js         nav, counters, lightbox, forms
  images/            all photography from the live site
  ayurveda_logo.png  clinic logo
```

Design tokens are kept identical to the live site (`--primary:#1a5c38`, `--gold:#c9a84c`,
`--cream:#faf7f2`, Playfair Display + Inter).

## Contact details used

- Phone / WhatsApp: **+91 9993032780**
- Wellness Center (Abhinagar): **8962153087**
- Main Clinic: "Shri Mahakaleshwar Ayurved Bhawan", Maksi Road, near Dr. Bhoraskar,
  Freeganj, Ujjain — 456010, M.P.
- OPD: Mon–Sat 12:00–3:30 PM & 6:00–8:00 PM, Sunday closed

This is a demonstration clone built for the site owner's use; all content, branding and images
belong to Mahakal Neuro Wellness Center / Dr. Umesh Shukla.

Deployed on Vercel with automatic deployments from the `main` branch.

