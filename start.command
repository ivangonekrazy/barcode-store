#!/bin/bash
# Double-click to start Scan-O-Mart
cd "$(dirname "$0")"
(sleep 1 && open http://localhost:8765) &
python3 -m http.server 8765
