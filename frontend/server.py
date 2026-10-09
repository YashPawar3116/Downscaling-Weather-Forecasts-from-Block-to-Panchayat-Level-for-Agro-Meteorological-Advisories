"""Read-only development API over the repository's existing model outputs."""
from __future__ import annotations
import csv, json, mimetypes, os, subprocess, shutil, socket, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'models' / 'main_model' / 'stage2_direct_gp_training'
GP_ROOT = ROOT / 'gp'
DIST = Path(__file__).resolve().parent / 'dist'

def rows(path):
    with path.open(encoding='utf-8-sig', newline='') as f: return list(csv.DictReader(f))
def number(value):
    try:
        x=float(value)
        return x if x == x and abs(x) != float('inf') else None
    except (TypeError, ValueError): return None
def block_path(state,district,block): return MODEL/state/district/block
def advisory_is_healthy(port):
    try:
        with urlopen(f'http://127.0.0.1:{port}/api/health',timeout=0.6) as response:
            payload=json.loads(response.read().decode('utf-8'))
            return response.status==200 and payload.get('success') is True
    except Exception:return False
def port_is_available(port):
    try:
        with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as probe:
            probe.settimeout(0.25)
            if probe.connect_ex(('127.0.0.1',port))==0:return False
            probe.bind(('127.0.0.1',port))
        return True
    except OSError:return False
def unused_local_port():
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as probe:
        probe.bind(('127.0.0.1',0))
        return probe.getsockname()[1]
def discover():
    result=[]
    if not MODEL.exists(): return result
    for f in MODEL.glob('*/*/*/stage2_current_gp_forecast.csv'):
        state,district,block=f.parent.relative_to(MODEL).parts
        try:
            rs=rows(f); dates=sorted({r['target_date'] for r in rs}); n=len({r['gp_id'] for r in rs})
            result.append({'state':state,'district':district,'block':block,'gpCount':n,'forecastDates':dates})
        except (OSError, KeyError): continue
    return sorted(result,key=lambda x:(x['state'],x['district'],x['block']))
def simplify_geometry(fc):
    # Keep only the selected block's geometry and reduce boundary payload size.
    try:
        from shapely.geometry import shape, mapping
        features=[]
        for feature in fc.get('features',[]):
            geom=shape(feature['geometry']).simplify(0.00015,preserve_topology=True)
            features.append({'type':'Feature','properties':feature.get('properties',{}),'geometry':mapping(geom)})
        return {'type':'FeatureCollection','features':features}
    except Exception:
        return fc
def block_data(state,district,block):
    folder=block_path(state,district,block)
    forecast_file=folder/'stage2_current_gp_forecast.csv'
    if not forecast_file.is_file(): return None
    frows=rows(forecast_file)
    # Pick the latest seven-day run represented by the existing output.
    dates=sorted({r['target_date'] for r in frows})
    if not dates:return None
    date_set=set(dates[-7:]); grouped={}
    for r in frows:
        if r['target_date'] not in date_set:continue
        day=int(r['forecast_horizon_day']); key=str(r['gp_id'])
        item=grouped.setdefault(key,{'id':key,'name':key,'forecast':[]})
        item['forecast'].append({'date':r['target_date'],'day':day,
            'temperature':number(r.get('gp_temperature_corrected')),
            'humidity':number(r.get('gp_humidity_corrected')),
            'rainfall':number(r.get('gp_precipitation_corrected')),
            'wind':number(r.get('gp_wind_corrected'))})
    gp_dir=GP_ROOT/state/district/block/'processed'
    master_path=gp_dir/'gp_master.geojson'
    master=json.loads(master_path.read_text(encoding='utf-8-sig')) if master_path.exists() else {'type':'FeatureCollection','features':[]}
    by_id={}
    for feature in master.get('features',[]):
        p=feature.get('properties',{}); key=str(p.get('gp_id',''))
        if not key:continue
        by_id[key]=p
        if key in grouped:
            grouped[key]['name']=p.get('gp_name') or grouped[key]['name']
            grouped[key]['lat']=number(p.get('centroid_lat')); grouped[key]['lon']=number(p.get('centroid_lon'))
            grouped[key]['area']=number(p.get('area_km2'))
    # The pipeline's merged master GeoJSON already carries the spatial summaries.
    # Keep these when available; CSV exports are optional and are not emitted by
    # every pipeline run.
    for key, props in by_id.items():
        item=grouped.get(key)
        if item is None: continue
        item['elevation']=number(props.get('elevation_mean'))
        item['slope']=number(props.get('slope_mean'))
        item['soilClay']=number(props.get('soil_clay_rootzone_0_30cm_pct'))
        item['landCover']=props.get('dominant_landcover') or None
    # Feature extraction is stored as GeoJSON in this repository. Read those
    # published outputs when optional CSV exports are absent.
    merged_path=gp_dir/'gp_merged_features.geojson'
    if merged_path.exists():
        try: features=json.loads(merged_path.read_text(encoding='utf-8-sig')).get('features',[])
        except (OSError,json.JSONDecodeError): features=[]
        for feature in features:
            props=feature.get('properties',{}); item=grouped.get(str(props.get('gp_id','')))
            if item is None: continue
            for field, col in [('elevation','terrain__elevation_mean'),('slope','terrain__slope_mean'),('soilClay','soil__soil_clay_rootzone_0_30cm_pct')]:
                value=number(props.get(col))
                if value is not None: item[field]=value
            item['landCover']=props.get('landcover__dominant_landcover') or item['landCover']
    for filename, field, col in [('gp_terrain_features.csv','elevation','elevation_mean'),('gp_terrain_features.csv','slope','slope_mean'),('gp_soil_features.csv','soilClay','soil_clay_rootzone_0_30cm_pct'),('gp_landcover_features.csv','landCover','dominant_landcover')]:
        p=gp_dir/filename
        if not p.exists(): continue
        for row in rows(p):
            item=grouped.get(str(row.get('gp_id')))
            if item is not None:
                value=number(row.get(col)) if field!='landCover' else (row.get(col) or None)
                if value is not None: item[field]=value
    gp_fc={'type':'FeatureCollection','features':[]}
    for feature in master.get('features',[]):
        if str(feature.get('properties',{}).get('gp_id','')) in grouped:gp_fc['features'].append(feature)
    gp_fc=simplify_geometry(gp_fc)
    block_fc=None
    candidates=list((GP_ROOT/state/district/block/'raw'/'boundaries').glob('gram_manchitra_block*.geojson'))
    if candidates:
        candidate=max(candidates,key=lambda p:p.stat().st_mtime)
        try:block_fc=simplify_geometry(json.loads(candidate.read_text(encoding='utf-8-sig')))
        except (OSError,json.JSONDecodeError):pass
    for item in grouped.values():item['forecast'].sort(key=lambda d:d['day'])
    location=next((x for x in discover() if (x['state'],x['district'],x['block'])==(state,district,block)),None)
    if not location:return None
    meta_path=folder/'stage2_manifest.json'; meta={}
    if meta_path.exists():
        try:meta=json.loads(meta_path.read_text(encoding='utf-8-sig'))
        except json.JSONDecodeError:pass
    updated=meta.get('forecast_retrieved_at')
    if not updated:
        source=ROOT/'block'/state/district/block/'processed'/'merge'/'block_current_forecast.csv'
        if source.exists():
            try:
                source_rows=rows(source)
                updated=next((r.get('forecast_retrieved_at') for r in source_rows if r.get('forecast_retrieved_at')) ,None)
            except (OSError,KeyError):pass
    return {'location':location,'gps':sorted(grouped.values(),key=lambda x:x['name'].casefold()),'gpGeometry':gp_fc,'blockGeometry':block_fc,'updatedAt':updated}

class Handler(BaseHTTPRequestHandler):
    def send_json(self,value,status=200):
        data=json.dumps(value,separators=(',',':')).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        u=urlparse(self.path)
        if u.path.startswith('/agri-api/'):
            return self.proxy_advisory('GET',u.path[len('/agri-api'):]+(('?'+u.query) if u.query else ''),None)
        if u.path=='/api/locations':return self.send_json(discover())
        if u.path=='/api/gp-location':
            gp_id=parse_qs(u.query).get('id',[''])[0]
            if not gp_id:return self.send_json({'error':'id is required'},400)
            for location in discover():
                f=block_path(location['state'],location['district'],location['block'])/'stage2_current_gp_forecast.csv'
                try:
                    if any(str(row.get('gp_id'))==gp_id for row in rows(f)):return self.send_json(location)
                except (OSError,KeyError):continue
            return self.send_json({'error':'No GP forecast found for this id'},404)
        if u.path=='/api/block':
            q=parse_qs(u.query); keys=[q.get(k,[''])[0] for k in ('state','district','block')]
            if not all(keys):return self.send_json({'error':'state, district and block are required'},400)
            try:data=block_data(*keys)
            except (OSError,ValueError,KeyError) as exc:return self.send_json({'error':str(exc)},500)
            return self.send_json(data,200) if data else self.send_json({'error':'No GP forecast available for this block'},404)
        # In production, serve the Vite build from this same process.
        rel='index.html' if u.path=='/' or u.path.startswith(('/dashboard','/map','/forecast','/advisory','/insights','/about','/gp/','/block/')) else u.path.lstrip('/')
        path=(DIST/rel).resolve()
        if not str(path).startswith(str(DIST.resolve())) or not path.is_file():return self.send_error(404)
        content=path.read_bytes(); self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(path.name)[0] or 'application/octet-stream'); self.send_header('Content-Length',str(len(content))); self.end_headers(); self.wfile.write(content)
    def do_POST(self):
        u=urlparse(self.path)
        if u.path.startswith('/agri-api/'):
            body=self.rfile.read(int(self.headers.get('Content-Length','0')))
            return self.proxy_advisory('POST',u.path[len('/agri-api'):]+(('?'+u.query) if u.query else ''),body)
        return self.send_json({'error':'Not found'},404)
    def proxy_advisory(self,method,path,body):
        request=Request('http://127.0.0.1:'+os.environ.get('AGRI_ADVISORY_PORT','5000')+path,data=body,method=method,headers={'Content-Type':'application/json'})
        try:
            with urlopen(request,timeout=45) as response:
                payload=response.read(); status=response.status
        except Exception as exc:
            payload=json.dumps({'success':False,'error':'Advisory service unavailable','message':str(exc)}).encode(); status=503
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(payload))); self.end_headers(); self.wfile.write(payload)
    def log_message(self,fmt,*args):print('%s - %s'%(self.address_string(),fmt%args))

if __name__=='__main__':
    host=os.environ.get('HOST','0.0.0.0')
    port=int(os.environ.get('PORT','8001'))
    node=shutil.which('node')
    advisory_dir=ROOT/'agri_advisory'
    advisory_process=None
    if node and (advisory_dir/'node_modules').is_dir():
        advisory_port=int(os.environ.get('AGRI_ADVISORY_PORT','5000'))
        if advisory_is_healthy(advisory_port):
            print(f'Agri advisory API already running on port {advisory_port}; reusing it.')
        else:
            if not port_is_available(advisory_port):
                occupied_port=advisory_port
                advisory_port=unused_local_port()
                print(f'Agri advisory port {occupied_port} is occupied by another service; using available port {advisory_port}.')
            os.environ['AGRI_ADVISORY_PORT']=str(advisory_port)
            env={**os.environ,'PORT':str(advisory_port)}
            advisory_process=subprocess.Popen([node,'server.js'],cwd=advisory_dir,env=env)
            for _ in range(50):
                if advisory_is_healthy(advisory_port):break
                if advisory_process.poll() is not None:break
                time.sleep(0.1)
            if not advisory_is_healthy(advisory_port):
                print(f'Agri advisory API did not become ready on port {advisory_port}.')
            else:
                print(f'Agri advisory API started on port {advisory_port}')
    else:
        print('Agri advisory API is not installed; run npm install in agri_advisory to enable it.')
    print(f'HyperWeather API at http://{host}:{port} (repository: {ROOT})')
    try: ThreadingHTTPServer((host,port),Handler).serve_forever()
    finally:
        if advisory_process: advisory_process.terminate()
