import {useState} from 'react';
import {Modal} from './components';
const terms:Record<string,string>={
 'Telemetry':'Measurements sent by a machine or sensor, together with the time and machine identity. SENEXA uses vibration, temperature, electrical current and rotational speed.',
 'Vibration (mm/s)':'How fast a machine surface moves while vibrating, expressed in millimetres per second. A rising reading may justify checking alignment, bearings or mounting. A threshold breach does not prove a specific fault.',
 'Temperature (°C)':'Sensor temperature in degrees Celsius. Excess heat can indicate cooling or load issues, but safe limits depend on the machine and measurement location.',
 'Current (A)':'Electrical current in amperes. A change can reflect changing load or electrical conditions. It requires machine-specific interpretation.',
 'RPM':'Revolutions per minute, the rotational speed of a shaft or motor. Compare it with the intended operating speed and load.',
 'Anomaly':'A reading or pattern that differs from a threshold or learned baseline. An anomaly is a reason to investigate, not a confirmed diagnosis.',
 'Threshold':'A configured measurement limit. SENEXA raises a warning at 90% and a critical indication at or above a limit. Always calibrate limits for the actual machine.',
 'Condition index':'A simple 0 to 100 display index derived from the maximum reading-to-threshold ratio. Higher is better relative to those configured limits. It is not reliability, remaining life or a failure probability.',
 'Ethernet LAN':'A local wired network connecting devices in the factory. It can keep working without public internet access as long as local power and network equipment remain available.',
 'Gateway / edge computer':'The local computer that receives sensor measurements, stores them and runs detection. The supplied Python gateway also hosts the dashboard bundle on the LAN.',
 'MQTT':'A lightweight publish/subscribe messaging protocol. Sensors publish readings to a broker; the optional SENEXA MQTT bridge subscribes and validates them. Broker authentication must be configured separately.',
 'Isolation Forest':'An anomaly-detection algorithm that learns how normal measurements are distributed. Unusual measurements are easier to isolate in its decision trees. This implementation trains separately for the chosen machine.',
 'Baseline':'Reference measurements used to describe normal operation. Real training uses technician-reviewed sensor readings. Demo training uses an explicitly synthetic baseline.',
 'Held-out validation':'Evaluation on readings excluded from model training. The local sanity gate measures how many held-out normal readings the model incorrectly flags.',
 'False alert rate':'The share of normal validation samples that a model flags as unusual. This app reports it for its held-out set only, not as a claim about field performance.',
 'Model promotion / rollback':'Promotion makes a validated candidate the active model. Rollback restores the previous model. Human review is required; training does not silently replace the active model.',
 'Stale reading':'A measurement older than 15 seconds, or no measurement at all. The app shows it as offline rather than presenting an old reading as a live signal.',
 'Work order':'A maintenance task with an asset, engineer, due date, progress state and inspection notes. Completing a task does not automatically confirm a fault.',
 'Technician outcome':'The inspection result entered by a person: normal, fault confirmed, inconclusive or unreviewed. This is kept separate from rule classifications so exported AI data does not confuse predictions with evidence.',
 'CSV / Markdown AI brief':'CSV is a spreadsheet-friendly table. The Markdown brief combines classified observations, units, rules, human outcomes and limitations for an AI reviewer. It does not send your information to an AI service automatically.',
 'Firebase / anonymous login':'Firebase provides authentication and private cloud snapshots. Anonymous login creates a temporary authenticated identity without an email. It may be lost if browser data is cleared or you sign out. Google or email login is preferable for lasting access.',
 'Cloud sync':'An explicit save or load of a workspace snapshot. Sensor readings and gateway secrets stay local. Simultaneous cloud edits are not merged; keep one authoritative snapshot.',
};
export default function Glossary({onClose}:{onClose:()=>void}){const [query,setQuery]=useState('');return <Modal title="A little clarity goes a long way" wide onClose={onClose}><p className="muted">Machine monitoring, explained in plain language.</p><label className="glossary-search">Find a term<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try MQTT, condition index, or false alerts"/></label><div className="glossary-list">{Object.entries(terms).filter(([key,value])=>(key+value).toLowerCase().includes(query.toLowerCase())).map(([key,value])=><details key={key} open={!!query}><summary>{key}</summary><p>{value}</p></details>)}</div></Modal>}
