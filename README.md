# Scan-O-Mart 🛒

A pretend grocery store for kids with a barcode scanner.

- Double-click `start.command` (or run `python3 -m http.server 8765` and open http://localhost:8765).
- Point the scanner at a barcode on screen (a mix of QR codes, CODE128 and EAN-13; QR needs a 2D/imager scanner). Each scan beeps, plays a random jingle, and rings up a silly item.
- Real barcodes work too (cereal boxes, books...). The same code always gives the same item.
- Scan the **PAY** barcode (or click "Pay & print receipt") to print a receipt and start a new customer.
- Clicking a barcode scans it too, for testing without a scanner.
- About 1 in 50 scans is a very special deal. 🎵

Settings live at the top of `app.js` (`RICKROLL_CHANCE`, `KINDS` for which barcode types appear, ...).
It's served over http (not opened as a file) because YouTube embeds refuse to play from `file://`.
