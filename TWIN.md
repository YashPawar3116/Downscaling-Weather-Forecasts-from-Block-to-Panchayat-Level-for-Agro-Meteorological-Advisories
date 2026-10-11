CRITICAL — FIX THE 3D TERRAIN, NOT JUST THE CAMERA ANGLE.

The current "3D Panchayat View" is NOT actually showing mountains/hills in 3D.

A pitched/rotated 2D map is NOT acceptable.

I need TRUE TERRAIN 3D where the actual ground surface rises and falls according to REAL elevation data.

DO NOT TOUCH:
- weather/downscaling training
- running training jobs
- model weights
- ERA5-Land processing
- Earth Engine/Sentinel pipelines
- GP extraction
- forecast generation
- existing APIs/data pipelines

Only modify the Digital Twin 3D visualization layer.

==================================================
REQUIREMENT
==================================================

The 3D view MUST visibly show:

- hills
- valleys
- ridges
- elevated terrain
- actual elevation differences

The map surface itself must deform vertically.

Do NOT fake this with:
- CSS
- gradients
- extruded GP polygons
- decorative mountains
- Three.js meshes made from guessed data
- 3D-looking shadows on a flat map

==================================================
1. USE REAL DEM TERRAIN
==================================================

Use MapLibre GL JS with a real raster-dem terrain source.

Use the official MapLibre terrain approach:

map.addSource("terrain", {
  type: "raster-dem",
  url: "https://tiles.mapterhorn.com/tilejson.json"
});

map.setTerrain({
  source: "terrain",
  exaggeration: 2.0
});

Also create a separate DEM source for hillshade:

map.addSource("hillshade", {
  type: "raster-dem",
  url: "https://tiles.mapterhorn.com/tilejson.json"
});

map.addLayer({
  id: "terrain-hillshade",
  type: "hillshade",
  source: "hillshade",
  paint: {
    "hillshade-exaggeration": 0.5
  }
});

MapLibre officially supports raster-dem + setTerrain for actual 3D elevation. Follow that architecture.

==================================================
2. VERIFY THAT THE DEM IS ACTUALLY LOADING
==================================================

DO NOT assume terrain works merely because setTerrain() exists.

Inspect the browser:

- Console
- Network requests
- MapLibre source state

Verify that the DEM TileJSON loads successfully.

Verify terrain tiles are actually being requested.

Verify there are no:
- CORS errors
- 404 errors
- source errors
- style errors
- WebGL errors

Add temporary debugging/logging if necessary.

If Mapterhorn DEM fails, use another verified DEM source or an existing real DEM already available in the project.

DO NOT silently fall back to a flat map.

==================================================
3. VERIFY TERRAIN IS ACTIVE
==================================================

After map load, explicitly verify:

map.getTerrain()

must return a terrain configuration.

Also verify the terrain source exists:

map.getSource("terrain")

If either is missing, fix that before doing anything else.

==================================================
4. CAMERA MUST SHOW THE ELEVATION
==================================================

Use:

pitch: 70,
maxPitch: 85,

and allow:

- drag-to-pan
- rotate
- pitch
- zoom

Add a visible 3D terrain control.

Do NOT rely on pitch alone.

==================================================
5. MAKE THE REAL ELEVATION VISUALLY CLEAR
==================================================

Start with terrain exaggeration around:

2.0

Then test:

1.0
1.5
2.0
2.5
3.0

Choose the lowest value that makes the actual Maharashtra elevation differences clearly visible.

Do NOT distort the terrain excessively.

The purpose is visual readability, not fake mountains.

==================================================
6. DO NOT FIT THE CAMERA TOO CLOSE
==================================================

The current GP map may be zoomed so closely that terrain variation is difficult to see.

After loading the terrain:

- fit the selected Block with padding
- use a suitable camera pitch
- choose a slightly wider view
- ensure surrounding relief is visible

The user should be able to recognize elevation changes around the Panchayat/Block.

==================================================
7. TEST TERRAIN WITH A KNOWN ELEVATED AREA
==================================================

Before declaring the 3D implementation successful:

Temporarily test the terrain renderer on a known mountainous/elevated location to prove that DEM rendering itself works.

If mountains are clearly visible there but not around the selected Maharashtra Block, then inspect:

- DEM coverage
- selected coordinates
- zoom
- terrain exaggeration
- camera position

Do not conclude that terrain works merely because the code contains setTerrain().

After testing, restore the selected Maharashtra Panchayat/Block behavior.

==================================================
8. GP GEOMETRY MUST FOLLOW THE TERRAIN
==================================================

The real GP GeoJSON must remain visible on top of the 3D surface.

The GP boundary must visually drape over the terrain.

Do not replace the GP geometry.

Do not create fake 3D GP polygons.

==================================================
9. WEATHER MUST FOLLOW THE TERRAIN
==================================================

Keep the real weather visualization on top of the terrain:

- rainfall
- temperature
- humidity
- wind

The selected GP must remain highlighted.

Weather markers/overlays must remain geographically aligned with their actual GP locations.

==================================================
10. 3D WEATHER SCENARIO
==================================================

When Digital Twin scenario values change:

Baseline → Scenario

the weather visualization in the 3D view must also update.

Do not create a separate fake weather dataset for the 3D view.

Use the same dashboard scenario state.

==================================================
11. VISUAL REQUIREMENT
==================================================

The final result should visually look like:

REAL DEM
      ↓
3D ELEVATED LAND SURFACE
      ↓
hills + valleys + ridges
      ↓
real GP boundaries draped over terrain
      ↓
real weather overlay
      ↓
selected Panchayat highlighted

NOT:

flat map
+
pitch
+
shadow

==================================================
12. IF MAPLIBRE TERRAIN CANNOT RENDER REAL RELIEF
==================================================

Do not fake it.

If the current MapLibre/DEM configuration cannot reliably produce visible 3D terrain, use a proper 3D geospatial engine such as CesiumJS with a real terrain source.

However, do this ONLY after proving that the current MapLibre DEM implementation cannot render correctly.

Do not introduce Cesium merely because the current implementation was configured incorrectly.

==================================================
13. FINAL ACCEPTANCE TEST
==================================================

The feature is NOT complete unless I can visibly see:

- actual elevated terrain
- actual hills
- actual valleys
- actual ridges
- terrain perspective changing when rotating/tilting
- GP boundaries sitting on the terrain
- weather overlay on the terrain

When I rotate the view, the terrain must visibly have DEPTH and ELEVATION.

A flat map at pitch 70° is a FAILURE.

==================================================
14. FINAL REPORT
==================================================

Report:

1. DEM source used
2. Whether DEM tiles successfully loaded
3. Whether map.getTerrain() is active
4. terrain exaggeration used
5. pitch/zoom used
6. whether hillshade is active
7. screenshot/browser verification result
8. files changed

Do NOT claim "3D terrain complete" merely because setTerrain() exists.

The visual result must actually show real elevation.