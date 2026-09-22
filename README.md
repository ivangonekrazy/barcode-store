# Scan-O-Mart 🛒

A pretend grocery store for kids with a barcode scanner.

- Double-click `start.command` (or run `python3 -m http.server 8765` and open http://localhost:8765).
- Groceries roll down a conveyor belt in jumbled piles. Point the scanner at a barcode on screen (a mix of QR codes, CODE128 and EAN-13; QR needs a 2D/imager scanner). Each scan beeps, plays a random jingle, and rings up a silly item.
- Real barcodes work too (cereal boxes, books...). The same code always gives the same item.
- After each customer's items (3–10) comes a NEXT CUSTOMER divider. When it reaches the scanner end, the receipt prints automatically. "Pay & print receipt" prints early.
- Scanned groceries fly into the bag; at checkout the cash drawer pops open and the customer takes their bag.
- Every minute or so the store PA makes a silly announcement (gibberish voice + subtitles). Type `announce()` in the console to hear one now.
- Clicking a barcode scans it too, for testing without a scanner.
- About 1 in 50 scans is a very special deal. 🎵

Settings live at the top of `app.js` (`RICKROLL_CHANCE`, `KINDS` for which barcode types appear, ...).
It's served over http (not opened as a file) because YouTube embeds refuse to play from `file://`.
