import os,tempfile
os.environ['SENEXA_DATA_DIR']=tempfile.mkdtemp(prefix='senexa-test-')
os.environ['SENEXA_GATEWAY_TOKEN']='test-token-only-not-for-deployment'
from fastapi.testclient import TestClient
from gateway.app import app
from datetime import datetime,timezone
HEADERS={'Authorization':'Bearer '+os.environ['SENEXA_GATEWAY_TOKEN']}

def reading(**changes):
    r={'machineId':'TEST-01','timestamp':datetime.now(timezone.utc).isoformat(),'vibration':1.2,'temperature':50,'current':12,'rpm':1400,'source':'sensor'}
    r.update(changes);return r

def test_auth_and_telemetry_validation():
    with TestClient(app) as c:
        assert c.get('/api/health').status_code==200
        assert c.get('/api/snapshot').status_code==401
        assert c.post('/api/readings',json=[reading()],headers=HEADERS).status_code==200
        assert c.post('/api/readings',json=[reading(vibration=-1)],headers=HEADERS).status_code==422
        assert c.post('/api/readings',json=[reading(timestamp='2999-01-01T00:00:00Z')],headers=HEADERS).status_code==422
        assert c.post('/api/readings',json=[reading(timestamp='2026-01-01T00:00:00')],headers=HEADERS).status_code==422
        assert len(c.get('/api/snapshot',headers=HEADERS).json()['readings'])>=1

def test_threshold_alert_and_feedback():
    with TestClient(app) as c:
        c.post('/api/readings',json=[reading(machineId='FAULT-01',vibration=9)],headers=HEADERS)
        data=c.get('/api/snapshot',headers=HEADERS).json()
        assert any(a['machineId']=='FAULT-01' and a['severity']=='critical' for a in data['alerts'])
        assert c.post('/api/feedback',json={'machineId':'FAULT-01','outcome':'fault-confirmed'},headers=HEADERS).status_code==200
        assert c.post('/api/feedback',json={'machineId':'UNKNOWN','outcome':'normal'},headers=HEADERS).status_code==404
        assert c.put('/api/thresholds',json={'vibration':0,'temperature':80,'current':30},headers=HEADERS).status_code==422

def test_simulator_and_reviewed_model_lifecycle():
    with TestClient(app) as c:
        assert c.post('/api/models/train',json={'demo':False},headers=HEADERS).status_code==422
        assert c.post('/api/simulator/start',headers=HEADERS).json()['simulator'] is True
        assert any(r['source']=='simulator' for r in c.get('/api/snapshot',headers=HEADERS).json()['readings'])
        first=c.post('/api/models/train',json={'demo':True},headers=HEADERS).json()['candidate']
        assert first['source']=='Synthetic showcase' and first['passed']
        assert c.post('/api/models/promote',headers=HEADERS).json()['active']==first['id']
        assert c.post('/api/models/promote',headers=HEADERS).status_code==409
        c.post('/api/models/train',json={'demo':True},headers=HEADERS)
        assert c.post('/api/models/promote',headers=HEADERS).json()['previous']==first['id']
        assert c.post('/api/models/rollback',headers=HEADERS).status_code==200
        assert c.post('/api/simulator/stop',headers=HEADERS).json()['simulator'] is False

def test_cors_does_not_allow_arbitrary_sites():
    with TestClient(app) as c:
        r=c.options('/api/readings',headers={'Origin':'https://untrusted.example','Access-Control-Request-Method':'POST'})
        assert r.status_code==400
        assert 'access-control-allow-origin' not in r.headers
