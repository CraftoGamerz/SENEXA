"""SENEXA single-site gateway. No industrial actuation or external message delivery."""
import asyncio
import json
import logging
import math
import os
import secrets
import sqlite3
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ConfigDict, field_validator
from sklearn.ensemble import IsolationForest

DATA = Path(os.getenv('SENEXA_DATA_DIR', str(Path(__file__).parent / 'data')))
DATA.mkdir(parents=True, exist_ok=True)
TOKEN = os.getenv('SENEXA_GATEWAY_TOKEN')
if not TOKEN:
    token_file = DATA / 'access-token.txt'
    if not token_file.exists():
        token_file.write_text(secrets.token_urlsafe(32))
        try: token_file.chmod(0o600)
        except OSError: pass
    TOKEN = token_file.read_text().strip()
if len(TOKEN) < 16:
    raise RuntimeError('SENEXA_GATEWAY_TOKEN must contain at least 16 characters.')

LOCK = threading.RLock()
db = sqlite3.connect(DATA / 'telemetry.sqlite3', check_same_thread=False)
db.execute('PRAGMA journal_mode=WAL')
db.execute('CREATE TABLE IF NOT EXISTS readings(machine_id TEXT, timestamp TEXT, vibration REAL, temperature REAL, current REAL, rpm REAL, source TEXT, PRIMARY KEY(machine_id,timestamp))')
db.execute('CREATE TABLE IF NOT EXISTS feedback(machine_id TEXT,timestamp TEXT,outcome TEXT,notes TEXT,reading TEXT)')
db.execute('CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT)')
db.commit()

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class Reading(StrictModel):
    machineId: str = Field(min_length=1,max_length=80,pattern=r'^[A-Za-z0-9_-]+$')
    timestamp: datetime
    vibration: float = Field(ge=0,le=100)
    temperature: float = Field(ge=-40,le=250)
    current: float = Field(ge=0,le=1000)
    rpm: float = Field(ge=0,le=100000)
    source: Literal['sensor','simulator']

    @field_validator('timestamp')
    @classmethod
    def valid_time(cls,value):
        if value.tzinfo is None: raise ValueError('A timezone is required.')
        value = value.astimezone(timezone.utc)
        if value > datetime.now(timezone.utc)+timedelta(seconds=60): raise ValueError('Timestamp is in the future.')
        return value

class Thresholds(StrictModel):
    vibration: float = Field(default=5.5,gt=0,le=100)
    temperature: float = Field(default=80,gt=0,le=250)
    current: float = Field(default=30,gt=0,le=1000)

class Training(StrictModel):
    demo: bool = False
    machineId: str = Field(default='CNC-01',pattern=r'^[A-Za-z0-9_-]+$',max_length=80)

class Feedback(StrictModel):
    machineId: str = Field(pattern=r'^[A-Za-z0-9_-]+$',max_length=80)
    outcome: Literal['normal','fault-confirmed','inconclusive']
    notes: str = Field(default='',max_length=2000)

def settings_get(key,default):
    row = db.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone()
    return json.loads(row[0]) if row else default

def settings_put(key,value):
    db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',(key,json.dumps(value)))
    db.commit()

thresholds = Thresholds(**settings_get('thresholds',{}))
simulating = False
active = None
previous = None
candidate = None

def restore_models():
    global active, previous, candidate
    for name in ('active','previous','candidate'):
        file = DATA / f'{name}.joblib'
        if file.exists():
            try: globals()[name] = joblib.load(file)
            except Exception: logging.exception('Cannot restore model %s; threshold fallback remains active',name)

restore_models()

def persist_models():
    for name,value in [('active',active),('previous',previous),('candidate',candidate)]:
        file = DATA / f'{name}.joblib'
        if value is None:
            if file.exists(): file.unlink()
        else:
            tmp = file.with_suffix('.tmp')
            joblib.dump(value,tmp)
            tmp.replace(file)

def store(readings):
    with LOCK:
        db.executemany('INSERT OR IGNORE INTO readings VALUES (?,?,?,?,?,?,?)',[(r.machineId,r.timestamp.isoformat(),r.vibration,r.temperature,r.current,r.rpm,r.source) for r in readings])
        # Bounded retention protects a small edge PC from uncontrolled database growth.
        db.execute('DELETE FROM readings WHERE timestamp < ?',((datetime.now(timezone.utc)-timedelta(days=30)).isoformat(),))
        count = db.execute('SELECT COUNT(*) FROM readings').fetchone()[0]
        if count > 200000: db.execute('DELETE FROM readings WHERE rowid IN (SELECT rowid FROM readings ORDER BY timestamp LIMIT ?)',(count-200000,))
        db.commit()

def recent(limit=3000):
    rows = db.execute('SELECT * FROM (SELECT * FROM readings ORDER BY timestamp DESC LIMIT ?) ORDER BY timestamp',(limit,)).fetchall()
    return [dict(zip(('machineId','timestamp','vibration','temperature','current','rpm','source'),r)) for r in rows]

def values(r): return [r['vibration'],r['temperature'],r['current'],r['rpm']]

def classify(r):
    ratios = {'vibration':r['vibration']/thresholds.vibration,'temperature':r['temperature']/thresholds.temperature,'current':r['current']/thresholds.current}
    name = max(ratios,key=ratios.get)
    ratio = ratios[name]
    learned = active and active['machineId']==r['machineId'] and active['model'].predict([values(r)])[0]==-1
    if ratio >= 1: return ('critical',f'{name.capitalize()} threshold exceeded',f'{name.capitalize()} reading exceeds its configured limit. Inspect the machine and verify the cause.')
    if learned: return ('warning','Unusual machine pattern','The active local Isolation Forest flagged this reading. Confirm the physical condition before maintenance.')
    if ratio >= .9: return ('warning',f'{name.capitalize()} approaching limit','A reading is within 10% of the configured limit. Review the recent trend.')
    return None

def simulated_batch():
    t = datetime.now(timezone.utc)
    machines=['CNC-01','CNC-02','PMP-01','PRS-01','CMP-01','MTR-01']
    batch=[]
    for i,m in enumerate(machines):
        wave=math.sin(t.timestamp()/11+i)
        batch.append(Reading(machineId=m,timestamp=t,vibration=round((6.4 if i==0 else 1.8+i*.2)+wave*.25,2),temperature=round((77 if i==0 else 75 if i==2 else 48+i*3)+wave*1.5,1),current=round(14+i+wave*.5,1),rpm=round(2800+i*30+wave*20),source='simulator'))
    return batch

async def simulation_loop():
    while True:
        if simulating: store(simulated_batch())
        await asyncio.sleep(3)

def mqtt_start():
    host=os.getenv('SENEXA_MQTT_HOST')
    if not host:return None
    import paho.mqtt.client as mqtt
    client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    if os.getenv('SENEXA_MQTT_USERNAME'):client.username_pw_set(os.environ['SENEXA_MQTT_USERNAME'],os.getenv('SENEXA_MQTT_PASSWORD'))
    if os.getenv('SENEXA_MQTT_TLS')=='1':client.tls_set()
    def on_connect(c,userdata,flags,reason,properties):
        if reason==0:c.subscribe(os.getenv('SENEXA_MQTT_TOPIC','senexa/+/telemetry'))
    def on_message(c,userdata,msg):
        try:
            if len(msg.payload)>4096:raise ValueError('Payload too large')
            r=Reading.model_validate_json(msg.payload)
            if r.source!='sensor':raise ValueError('MQTT devices must identify as sensors')
            store([r])
        except Exception:logging.warning('Rejected invalid MQTT reading on topic %s',msg.topic)
    client.on_connect=on_connect;client.on_message=on_message
    client.connect_async(host,int(os.getenv('SENEXA_MQTT_PORT','1883')),60);client.loop_start()
    return client

@asynccontextmanager
async def lifespan(app):
    task=asyncio.create_task(simulation_loop());client=mqtt_start()
    logging.info('Gateway ready. Token is configured by environment or stored in %s',DATA/'access-token.txt')
    yield
    task.cancel()
    try:await task
    except asyncio.CancelledError:pass
    if client:client.loop_stop();client.disconnect()

app=FastAPI(title='SENEXA local gateway',version='1.0.0',lifespan=lifespan)
origins=os.getenv('SENEXA_ALLOWED_ORIGINS','http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000').split(',')
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=False,allow_methods=['GET','POST','PUT'],allow_headers=['Authorization','Content-Type'])

def authorize(authorization: str=Header(default='')):
    if not secrets.compare_digest(authorization,f'Bearer {TOKEN}'):raise HTTPException(401,'A valid gateway bearer token is required.')

@app.get('/api/health')
def health():return {'service':'senexa-gateway','status':'ok','version':'1.0.0'}

@app.get('/api/snapshot',dependencies=[Depends(authorize)])
def snapshot():
    with LOCK:
        rows=recent(); latest={r['machineId']:r for r in rows};alerts=[]
        for mid,r in latest.items():
            if datetime.now(timezone.utc)-datetime.fromisoformat(r['timestamp'])>timedelta(seconds=15):continue
            result=classify(r)
            if result:
                severity,title,reason=result
                alerts.append({'id':f"gateway-{mid}-{r['timestamp'][:13]}-{title}",'machineId':mid,'title':title,'severity':severity,'status':'open','createdAt':r['timestamp'],'reason':reason})
        return {'readings':rows,'alerts':alerts,'simulator':simulating,'model':active['id'] if active else 'threshold-rules','thresholds':thresholds.model_dump()}

@app.post('/api/readings',dependencies=[Depends(authorize)])
def ingest(payload:list[Reading]):
    if not 1<=len(payload)<=1000:raise HTTPException(422,'Submit 1 to 1,000 readings.')
    store(payload)
    return {'accepted':len(payload),'duplicatePolicy':'Duplicate machine/timestamp pairs are ignored.'}

@app.put('/api/thresholds',dependencies=[Depends(authorize)])
def configure(payload:Thresholds):
    global thresholds
    with LOCK:thresholds=payload;settings_put('thresholds',payload.model_dump())
    return payload

@app.post('/api/simulator/start',dependencies=[Depends(authorize)])
def start():
    global simulating
    simulating=True;store(simulated_batch())
    return {'simulator':True,'source':'simulator'}

@app.post('/api/simulator/stop',dependencies=[Depends(authorize)])
def stop():
    global simulating
    simulating=False
    return {'simulator':False,'note':'Historical simulator readings retain their source label.'}

@app.post('/api/feedback',dependencies=[Depends(authorize)])
def feedback(payload:Feedback):
    with LOCK:
        rows=[r for r in recent() if r['machineId']==payload.machineId]
        if not rows:raise HTTPException(404,'No reading found for this machine.')
        r=rows[-1]
        db.execute('INSERT INTO feedback VALUES (?,?,?,?,?)',(payload.machineId,r['timestamp'],payload.outcome,payload.notes,json.dumps(r)));db.commit()
    return {'recorded':True,'sampleTimestamp':r['timestamp']}

def model_status():
    metadata=lambda v:{k:x for k,x in v.items() if k!='model'} if v else None
    return {'active':active['id'] if active else None,'activeMetadata':metadata(active),'previous':previous['id'] if previous else None,'candidate':metadata(candidate)}

@app.get('/api/models',dependencies=[Depends(authorize)])
def models():
    with LOCK:return model_status()

@app.post('/api/models/train',dependencies=[Depends(authorize)])
def train(payload:Training):
    global candidate
    with LOCK:
        if payload.demo:
            rng=np.random.default_rng(42)
            data=rng.normal([1.8,50,15,2800],[.25,3,1,50],size=(300,4))
            source='Synthetic showcase'
        else:
            rows=db.execute("SELECT DISTINCT reading FROM feedback WHERE machine_id=? AND outcome='normal'",(payload.machineId,)).fetchall()
            data=np.array([values(r) for row in rows if (r:=json.loads(row[0]))['source']=='sensor'])
            source='Technician-reviewed sensor'
            if len(data)<40:raise HTTPException(422,'At least 40 distinct normal sensor readings reviewed by a technician are required. Simulator data is excluded.')
        split=int(len(data)*.8)
        model=IsolationForest(n_estimators=100,contamination=.05,random_state=42,n_jobs=1).fit(data[:split])
        flagged=float(np.mean(model.predict(data[split:])==-1))
        candidate={'id':f'iforest-{datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")}-{secrets.token_hex(2)}', 'machineId':payload.machineId,'model':model,'source':source,'samples':len(data),'falsePositiveRate':flagged,'passed':flagged<=.25,'createdAt':datetime.now(timezone.utc).isoformat()}
        persist_models();return model_status()

@app.post('/api/models/promote',dependencies=[Depends(authorize)])
def promote():
    global active,previous,candidate
    with LOCK:
        if not candidate or not candidate['passed']:raise HTTPException(409,'No candidate has passed the validation gate.')
        previous=active;active=candidate;candidate=None;persist_models();return model_status()

@app.post('/api/models/rollback',dependencies=[Depends(authorize)])
def rollback():
    global active,previous
    with LOCK:
        if not previous:raise HTTPException(409,'There is no previous model to restore.')
        active,previous=previous,active;persist_models();return model_status()

# Serving the built bundle from this same LAN origin avoids mixed-content access.
dist=Path(__file__).resolve().parents[1]/'dist'
if dist.exists():app.mount('/',StaticFiles(directory=dist,html=True),name='web')
