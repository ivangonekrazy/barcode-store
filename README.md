# Scan-O-Mart 🛒

A pretend grocery store for kids with a barcode scanner.

- Double-click `start.command` (or run `python3 -m http.server 8765` and open http://localhost:8765).
- Point the scanner at a barcode on screen. Each scan beeps, plays a random jingle, and rings up a silly item.
- Real barcodes work too (cereal boxes, books...). The same code always gives the same item.
- About 1 in 30 scans is a very special deal. 🎵

Settings live at the top of `app.js` (`RICKROLL_CHANCE`, `BARCODE_FORMAT`, ...).
It's served over http (not opened as a file) because YouTube embeds refuse to play from `file://`.
