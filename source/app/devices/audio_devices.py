import pyaudio
import json
import sys
import os

def send_devices():
    p = pyaudio.PyAudio()
    device_count = p.get_device_count()
    obj = {}
    for i in range(0, device_count):
        info = p.get_device_info_by_index(i)
        if info["hostApi"] == 0:
            obj[info["name"].strip()] = info["index"]

    print(json.dumps(obj), file=sys.stdout)

send_devices()