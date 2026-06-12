# MapGuessR

A browser-based geography game using OpenStreetMap data. Study a labeled map excerpt, place a pin on the world map, and score up to 5,000 points based on distance.

## Run

Serve this folder with any static web server:

```powershell
python -m http.server 8080 --directory outputs
```

Then open `http://localhost:8080`.

An internet connection is required for map tiles and web fonts.

## Difficulty

- Easy: approximately 100 × 100 km
- Medium: approximately 10 × 10 km
- Hard: approximately 1 × 1 km

Map data is provided by OpenStreetMap contributors. The labeled clue style is served by CARTO.
