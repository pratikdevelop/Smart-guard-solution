import tensorflow as tf
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scapy.all import ARP, Ether, srp
import socket
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

interpreter = tf.lite.Interpreter(model_path="smartguard_model.tflite")
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

class TrafficData(BaseModel):
    traffic: float
@app.post("/predict")
async def predict(data: TrafficSequence):
    sequence = np.array(data.traffic_sequence).reshape((1, 10, 1)).astype(np.float32)
    interpreter.set_tensor(input_details[0]['index'], sequence)
    interpreter.invoke()
    reconstruction = interpreter.get_tensor(output_details[0]['index'])
    mse = np.mean(np.square(sequence - reconstruction))
    is_anomaly = mse > threshold
    return {
        "is_anomaly": is_anomaly,
        "status": "Suspicious Activity Detected" if is_anomaly else "Normal Behavior"
    }

@app.get("/scan")
async def scan_network():
    try:
        logger.info("Starting network scan")
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        subnet = '.'.join(local_ip.split('.')[:-1]) + '.0/24'
        logger.info(f"Scanning subnet: {subnet}")

        arp = ARP(pdst=subnet)
        ether = Ether(dst="ff:ff:ff:ff:ff:ff")
        packet = ether / arp
        result = srp(packet, timeout=2, verbose=True)  # Set verbose=True for debugging
        logger.info(f"Scan result: {len(result[0])} devices found")

        devices = []
        for sent, received in result[0]:
            ip = received.psrc
            mac = received.hwsrc
            traffic = np.random.uniform(5, 15)
            devices.append({
                "id": mac.replace(":", ""),
                "name": f"Device_{ip}",
                "traffic": traffic,
                "status": "Unknown",
                "vulnerabilities": []
            })
        logger.info(f"Returning {len(devices)} devices")
        return {"devices": devices}
    except Exception as e:
        logger.error(f"Scan failed: {str(e)}")
        return {"devices": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)