"""External HTTP device simulator: python simulator.py --url http://127.0.0.1:8000"""
import argparse,math,os,time
from datetime import datetime,timezone
import httpx
parser=argparse.ArgumentParser(description='Publish explicitly simulated sensor data to SENEXA.')
parser.add_argument('--url',default='http://127.0.0.1:8000')
parser.add_argument('--machine',default='CNC-01')
parser.add_argument('--fault',action='store_true')
args=parser.parse_args()
token=os.getenv('SENEXA_GATEWAY_TOKEN')
if not token:raise SystemExit('Set SENEXA_GATEWAY_TOKEN to the token of your running gateway.')
try:
    with httpx.Client(timeout=10) as client:
        while True:
            wave=math.sin(time.time()/8)
            data={'machineId':args.machine,'timestamp':datetime.now(timezone.utc).isoformat(),'vibration':round((6.8 if args.fault else 1.7)+wave*.2,2),'temperature':round(52+wave*2,1),'current':round(15+wave,1),'rpm':round(2800+wave*20),'source':'simulator'}
            try:
                response=client.post(args.url.rstrip('/')+'/api/readings',json=[data],headers={'Authorization':f'Bearer {token}'})
                response.raise_for_status();print(f"{data['timestamp']} {args.machine} {data['vibration']} mm/s (simulator)")
            except httpx.HTTPError as error:print(f'Gateway unavailable: {error}')
            time.sleep(3)
except KeyboardInterrupt:print('Simulator stopped.')
