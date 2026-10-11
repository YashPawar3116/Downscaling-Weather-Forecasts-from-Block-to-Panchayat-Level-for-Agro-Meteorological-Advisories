We are now completing the Maharashtra-wide real weather/forecast implementation.

IMPORTANT:
The previous run correctly reported that the work is NOT complete. Do not mark PROMPTS.md complete unless the required implementation is actually finished and verified.

Do NOT work on Digital Twin in this task.
Do NOT add Digital Twin functionality.
Do NOT redesign unrelated frontend features.

The FINAL OBJECTIVE of this task is:

Maharashtra
→ any of the 36 districts
→ any valid available Block
→ correct official Block identification/LGD code
→ real GP extraction
→ real required geospatial + weather datasets
→ real feature generation
→ existing weather/downscaling model
→ real GP-level forecast
→ forecast displayed on the website

The system must use ONE generalized pipeline for all Maharashtra districts/Blocks.

==================================================
1. READ THE EXISTING SYSTEM FIRST
==================================================

Before changing code:

Inspect:

- PROMPTS.md
- frontend location-selection code
- backend location APIs
- Block-resolution logic
- GP extraction pipeline
- scripts/block/*
- scripts/gp/*
- model/forecast scripts
- output/data directory structure
- existing Baramati outputs
- existing Sinnar outputs
- existing Bicholim outputs if still relevant to the current architecture

Identify exactly why currently processed pilot Blocks work while a newly selected Maharashtra Block can stop at "no data".

Do not replace working logic.

Do not create a second parallel pipeline.

==================================================
2. KEEP THE CURRENT DEFAULT
==================================================

The main dashboard must continue to open as:

Maharashtra
→ Pune
→ Baramati

Baramati must continue showing:

- 99 real GPs
- existing real forecast
- current dashboard behavior

Do not break this.

==================================================
3. ALL 36 MAHARASHTRA DISTRICTS
==================================================

The website must contain all 36 Maharashtra districts everywhere a district selection is used:

Ahilyanagar
Akola
Amravati
Beed
Bhandara
Buldhana
Chhatrapati Sambhajinagar
Chandrapur
Dhule
Dharashiv
Gadchiroli
Gondia
Hingoli
Jalgaon
Jalna
Kolhapur
Latur
Mumbai City
Mumbai Suburban
Nagpur
Nanded
Nandurbar
Nashik
Palghar
Parbhani
Pune
Raigad
Ratnagiri
Sangli
Satara
Sindhudurg
Solapur
Thane
Wardha
Washim
Yavatmal

Satara MUST be included.

Do not maintain separate district lists in different frontend components.

Use one source of truth.

==================================================
4. REAL BLOCKS FOR EVERY DISTRICT
==================================================

For the selected district:

Dynamically obtain the valid/available Blocks using the existing official/source resolution mechanism.

Do NOT manually hardcode all Block names into React.

Do NOT manually create district → Block mappings.

Do NOT create fake Blocks.

Do NOT create fake LGD codes.

The flow must be:

Maharashtra
→ District
→ dynamically available Blocks
→ user selects Block
→ resolve official Block LGD code

==================================================
5. NEW BLOCKS MUST NOT BE TREATED AS "NO DATA"
==================================================

This is critical.

Currently, a Block without an already-precomputed model output can result in:

"No data available"

That behavior must be removed for the normal "not processed yet" case.

A selected Block with no cached final forecast must be treated as:

"data not generated yet"

NOT:

"data does not exist"

When the user selects such a Block:

→ start the actual real processing pipeline
→ show a processing state
→ complete the required stages
→ generate the real forecast
→ automatically load the result

Do NOT show "No data available" merely because a final output file doesn't already exist.

==================================================
6. REAL ON-DEMAND PROCESSING
==================================================

When a user selects ANY valid Maharashtra Block that has no valid cached forecast:

Automatically run the required real pipeline for that Block.

Required flow:

1. Resolve State / District / Block.
2. Resolve official Block LGD code.
3. Prepare the Block target directory using the existing project structure.
4. Run existing Block boundary stage.
5. Acquire required real weather datasets.
6. Acquire required ERA5-Land data through the existing Copernicus CDS workflow.
7. Run required satellite/geospatial acquisition.
8. Run existing Block merge stage.
9. Run GP boundary extraction using existing Gram Manchitra logic.
10. Create/update GP master.
11. Run required GP feature stages.
12. Produce GP feature/merged datasets required by the model.
13. Run the existing Stage-2/downscaling forecast model.
14. Save final GP-level forecast output.
15. Return the final output to the website.
16. Cache it for future requests.

Reuse the current scripts and architecture.

Do not create duplicate logic.

==================================================
7. COPERNICUS CDS / ERA5-LAND
==================================================

The machine now has CDS credentials configured.

Use the same Python environment that runs the backend.

Do not ask the user to manually download ERA5-Land files when the existing pipeline can download them automatically.

For a selected Block:

- determine the exact ERA5-Land period required by the existing model pipeline
- inspect already-downloaded files
- download only missing required periods
- validate the downloaded files
- continue the pipeline

Do not stop at April 2023 merely because that is where the previous run stopped.

Determine the actual period required by the existing working model pipeline.

Do not replace ERA5-Land with a dummy or easier dataset.

Do not fabricate missing weather values.

==================================================
8. EARTH ENGINE
==================================================

Earth Engine authentication has already been configured.

Use the exact Python environment running the backend.

Do not create a workaround that bypasses required Earth Engine processing.

For any Block requiring Earth Engine:

- initialize Earth Engine with the configured Cloud Project
- run the existing Earth Engine-dependent stages
- verify the real request succeeds
- continue processing

Do not silently substitute fake or static satellite data if Earth Engine fails.

If Earth Engine fails, report the real technical failure.

==================================================
9. BLOCK PIPELINE
==================================================

Reuse the existing block stages.

Inspect and use the existing workflow including, where applicable:

scripts/block/01_block_boundary.py
scripts/block/02_open_meteo_actual.py
scripts/block/03_historical_forecasts.py
scripts/block/04_era5_land.py
scripts/block/05_gfs.py
scripts/block/06_block_satellite.py
scripts/block/07_block_merge.py

Do not assume all stages are always necessary; follow the existing project's intended dependencies.

The final block-level merged output must actually be produced for a newly processed Block.

==================================================
10. GP PIPELINE
==================================================

Reuse:

scripts/gp/08_gp_runner.py

and the existing GP child stages.

For the selected Block:

- use official Block identification
- obtain real GP boundaries
- create real gp_master
- calculate required geometry/metrics from actual geometry
- run required terrain/landcover/satellite/soil/LST/weather processing
- generate the actual GP feature dataset

Do not hardcode GP names or counts.

Do not copy Baramati GP data to another Block.

Do not use random coordinates.

Do not synthesize polygons.

==================================================
11. MODEL / FORECAST
==================================================

Use the existing trained model and current Stage-2/downscaling implementation.

Do not replace the validated model methodology.

Do not retrain unnecessarily.

Do not produce a forecast from incomplete features merely to make the UI show something.

Before inference:

- compare generated feature columns against the model's expected schema
- verify required features exist
- verify correct Block/GP identity
- verify values are real/project-derived

Then run the existing forecast workflow.

The final output must contain actual GP-level forecast results.

==================================================
12. GENERIC IMPLEMENTATION — NO DISTRICT-SPECIFIC CODE
==================================================

This is very important.

Do NOT implement:

if district == Pune:
    special logic

if district == Satara:
    special logic

if district == Nashik:
    special logic

etc.

The implementation must be generic:

selected_state
selected_district
selected_block
→ resolve LGD
→ run the same pipeline

The only difference between Blocks should be the actual geographic/data inputs.

==================================================
13. SATARA / WAI IS NOT THE FINAL TARGET
==================================================

Wai is only the first additional validation case.

Complete:

Maharashtra → Satara → Wai

end-to-end.

But do NOT stop there.

After Wai succeeds, immediately verify the same generalized pipeline with additional Maharashtra Blocks.

At minimum test:

1. Pune → Baramati
2. Nashik → Sinnar
3. Satara → Wai
4. One Block from a different district that did not previously have a forecast output

The fourth test is mandatory because it proves this is not just pilot-specific logic.

==================================================
14. ONE BLOCK PER DISTRICT VALIDATION
==================================================

After the generic pipeline is proven, validate that the system can resolve and prepare at least one real valid Block for EACH Maharashtra district.

Do not necessarily precompute the full forecast for every Block in advance.

The important requirement is that:

- every district has real Block discovery
- a valid Block can be selected
- the same processing pipeline accepts that Block
- the system does not depend on Baramati/Sinnar-specific files

For expensive processing, do not blindly launch all 36 districts simultaneously.

Process sequentially and reuse valid results.

==================================================
15. WEBSITE PROCESSING STATE
==================================================

When the user selects an unprocessed Block:

Do not show:

"No data available"

Instead show something like:

Preparing Block data...
Resolving Block...
Fetching official GP boundaries...
Preparing weather data...
Processing geospatial data...
Preparing GP features...
Running forecast model...
Generating GP forecast...

When complete:

→ automatically display the real forecast.

If processing genuinely fails:

show an actual error state, NOT a fake forecast.

Distinguish clearly between:

NOT_PROCESSED
PROCESSING
COMPLETED
FAILED

Do not merge these states into "no data".

==================================================
16. BACKEND JOB HANDLING
==================================================

Long-running processing must not freeze the FastAPI server.

Implement or extend the existing background-job mechanism.

The frontend should be able to:

1. request processing for a Block
2. receive a job ID
3. poll processing status
4. receive completion
5. fetch final output

Possible statuses:

queued
resolving_block
fetching_block_data
fetching_weather
fetching_era5
processing_satellite
processing_gp
preparing_features
running_model
generating_forecast
completed
failed

Use the existing backend architecture where possible.

Do not add a completely unrelated job framework unless necessary.

==================================================
17. CACHING
==================================================

After a Block is successfully processed:

cache the valid outputs.

On subsequent requests:

- validate the output belongs to the selected Block
- validate the LGD code
- validate relevant model/forecast identity
- reuse the result

Do not rerun expensive processing unnecessarily.

Do not accidentally use another Block's cached output.

Prevent duplicate jobs for the same Block.

==================================================
18. DATA INTEGRITY
==================================================

Never create:

- fake GPs
- fake Block IDs
- fake LGD codes
- fake GP counts
- fake latitude/longitude
- random coordinates
- fake polygons
- copied weather data
- copied forecasts
- arbitrary averages
- dummy model outputs

All displayed weather/forecast values must come from the actual pipeline.

If a real external source is unavailable or a required processing step genuinely fails:

report the real failure.

Never hide it by displaying invented data.

==================================================
19. DO NOT MAKE BARAmati THE TEMPLATE DATASET
==================================================

Baramati is only the validated reference for output structure.

It must NOT become the source of data for other Blocks.

Other Blocks must independently obtain:

- their own boundaries
- their own GPs
- their own weather
- their own geospatial features
- their own model inputs
- their own forecasts

==================================================
20. PROMPTS.MD
==================================================

Read PROMPTS.md completely.

Implement the requirements that apply to the current Maharashtra weather/forecast scope.

Do not simply edit PROMPTS.md to make it say "complete".

The actual code, pipeline, and outputs must satisfy the requirements.

At the end, update PROMPTS.md only after implementation and verification are genuinely complete.

==================================================
21. DO NOT STOP AFTER FETCHING INPUTS
==================================================

The previous Wai attempt stopped after obtaining boundaries and ERA5-Land files.

Do not repeat that.

For the primary validation case Wai, continue all the way through:

ERA5-Land
→ block merge
→ GP master
→ GP features
→ model inputs
→ Stage-2 forecast
→ final GP-level forecast output
→ frontend display

The task is NOT complete if it stops at:

- boundary acquisition
- weather download
- ERA5 download
- satellite download
- block merge

The final model output must actually exist.

==================================================
22. VERIFY THE FINAL FORECAST
==================================================

For each completed test Block verify:

- correct State
- correct District
- correct Block
- correct LGD code
- correct GP boundaries
- correct GP count
- real weather input
- real geospatial input
- required feature columns
- model successfully executed
- final GP forecast output exists
- forecast belongs to the correct Block
- forecast is displayed in the frontend

Do not consider "file exists" sufficient.

Actually inspect the data.

==================================================
23. FINAL WEBSITE ACCEPTANCE TEST
==================================================

The following must work:

Maharashtra → Pune → Baramati
Maharashtra → Nashik → Sinnar
Maharashtra → Satara → Wai
Maharashtra → another district → valid Block

Then confirm that the generic implementation does NOT contain pilot-only assumptions.

The website must behave like:

User selects District
→ real Blocks load
→ user selects Block
→ if output exists, load it
→ otherwise automatically process the Block
→ show processing status
→ generate real GP forecast
→ automatically display it

No "No data available" simply because the Block has not been precomputed.

==================================================
24. SCALABILITY REQUIREMENT
==================================================

The final implementation must be capable of handling:

ANY VALID MAHARASHTRA DISTRICT
→ ANY VALID BLOCK
→ SAME PIPELINE

Do not build a collection of special cases.

Do not require manually coding every new Block.

The purpose of this task is to make the current system genuinely reusable across Maharashtra.

==================================================
25. FINAL REPORT
==================================================

Do not reply with a generic summary.

At completion report:

A. Exact files changed
B. Exact pipeline stages implemented
C. Wai final processing status
D. Wai GP count
E. Wai final forecast output path
F. Additional new Block(s) actually processed
G. Which Maharashtra districts were successfully validated for Block discovery
H. Whether the generic pipeline now accepts arbitrary Maharashtra Blocks
I. Any remaining genuine technical blocker
J. Exact commands/tests used for verification

Do NOT say "complete" unless the real end-to-end forecast has been generated and verified for at least one NEW Block beyond the existing pilot outputs.

The final objective is not just a 36-district dropdown.

The final objective is a REAL, GENERIC, REUSABLE:

Maharashtra → District → Block → GP → Weather Data → Existing Model → Real GP Forecast

system.