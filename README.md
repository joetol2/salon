# MySalonSuite — static site clone

A static, self-contained clone of [mysalonsuite.com](https://www.mysalonsuite.com), rebuilt from a
browser-saved snapshot of the live site. It exists as a base for prototyping visual/UX enhancements
(CSS, transitions, animations) to show as a demo — it is **not** the client's real codebase, and it
has no backend, CMS, or form processing behind it.

## Pages

| File | Original page |
|---|---|
| `index.html` | Home (`/`) |
| `about-us.html` | About Us (`/about-us/`) |
| `locations.html` | Find a Location (`/locations/`) |
| `blog.html` | Blog (`/blog/`) |
| `reserve-a-suite.html` | Reserve a Suite (`/reserve-a-suite/`) |
| `find-a-salon-professional.html` | Find a Salon Professional (`/find-a-salon-professional/`) |
| `franchise.html` | Franchise (`/franchise/`) |

All theme CSS/JS/images used across pages are deduplicated into a single shared `assets/` folder.
Internal nav links between the pages above were rewritten to point at these local files.

## Previewing locally

Any static file server works, e.g.:

```
python3 -m http.server 8080
# then open http://localhost:8080/index.html
```

## What was intentionally removed

The original page saves included a lot of third-party tracking/consent/ads code that only makes sense
on the live, backend-connected site. These were stripped during cleanup:

- Google Tag Manager, Google Ads/Analytics, Facebook Pixel, TikTok Pixel, Act-On marketing tracker
- Google reCAPTCHA, Cloudflare bot-management challenge script
- TrustArc cookie-consent banner and its "powered by" widget
- AccessiBe accessibility overlay widget (leftover static markup)
- Google Maps JS API runtime chunks (the map on `locations.html` renders its container/pins/list but
  without a live interactive Google Map — that needs a real API key and network access)

## Known gaps

- **Custom webfonts** (Cera Pro, Albra) and the Gravity Forms icon font weren't captured by the browser's
  "Save Page" (it doesn't reliably grab `@font-face` binaries), so the page falls back to the next font in
  the stack. If you have access to the actual font files, drop them in `assets/` with the same filenames
  referenced in `assets/theme-Cgwhw7nX.css` / `assets/basic.min.css`.
- A handful of decorative background SVGs (`vector-ornament-*.svg`) still point at the live
  `mysalonsuite.com` domain and won't load offline.
- Forms (Gravity Forms) render but don't submit anywhere — there's no backend.
- The interactive Google Map on the locations page needs a Maps JavaScript API key to render tiles.

None of these affect the overall layout/branding — they're the right things to swap in once you're
building on top of this rather than trying to make the original site load live.
