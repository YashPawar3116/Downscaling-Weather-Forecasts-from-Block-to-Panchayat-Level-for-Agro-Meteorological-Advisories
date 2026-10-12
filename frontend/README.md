# HyperWeather frontend

This is a separate React application and read-only data adapter. It reads the existing files under `models/main_model/stage2_direct_gp_training`, `gp`, and `block`; it does not train models or modify the forecasting pipeline.

## Run locally

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Both `npm run dev` and `npm run dev:frontend` start the local API on port 8001 before starting Vite, which proxies `/api` requests to it. On Windows, the launcher uses the Python launcher (`py -3`); set `PYTHON` to a specific interpreter path if needed. For a single-process production preview, run `npm run build` inside `frontend`, then start `python frontend/server.py`; the Python server serves the built frontend and its `/api` routes on port 8001.

## Deploy

Deploy the API to Render from the repository root. The included `render.yaml` starts `python frontend/server.py`. If Render needs to run the ERA5-Land pipeline, add the Copernicus CDS API URL and key as the private `CDSAPI_URL` and `CDSAPI_KEY` service variables. The backend writes these to its private home-directory `.cdsapirc` at runtime; credentials must never be committed to this repository. A local `%USERPROFILE%\\.cdsapirc` is available to local pipeline runs but is not copied to Render. Existing valid forecast snapshots remain available when their dates are older than today; deploy updated snapshots to publish newer forecast runs.

Deploy the static site to Vercel with `frontend` as the Root Directory. `frontend/vercel.json` routes `/api` and `/agri-api` requests to `https://hyperweather-api.onrender.com`; redeploy after changing that service URL. Do not put CDS credentials or other secrets in Vercel `VITE_` variables, because those are included in the browser bundle.

The API discovers blocks that have an existing `stage2_current_gp_forecast.csv`. It loads only the requested block and uses that block's GP geometry. Environmental fields display as unavailable when the repository has no matching source value. The external OpenStreetMap tile service is used for the basemap.

## Data notes

- Forecast Day 1 is the first date in the latest available seven-day output file. Historical or stale runs are labeled with their source run date when available.
- Wind is stored in the model output in m/s. Dashboard cards convert it to km/h; map legend and advisory thresholds use m/s.
- Advisory rules are prototype threshold rules and their “rule match” count reports how many available forecast days met a threshold. It is not calibrated confidence or validated agronomic guidance.
- Environmental context uses the existing GP terrain, soil, and land-cover CSV summaries. Soil texture is shown as clay fraction because that is the available field; soil class is not inferred.
