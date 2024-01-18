import torch
from TTS.api import TTS

import os
import sys
import json

import pyaudio
from websockets.sync.client import connect

tts = None
vc = None

audio = pyaudio.PyAudio()
device_index = 0
interrupt_next = False

SAMPLES_PATH = os.environ["CWD"] + "/userdata/voice_samples/"

def handle(msg, ws):
    split_message = msg.split(' ');
    prefix = split_message[0]
    split_message.remove(prefix)
    payload = str.join(' ', split_message)
    match (prefix):
        case "CLONE":
            prepare_clone(payload, ws)
    return

def prepare_clone(data, ws):
    params = json.loads(data)
    audio_file = params["audio_file"]
    result_path = params["result_path"]
    options = params["options"]
    concurrent_id = params["concurrent_id"]
    response = ""
    try:
        generate_clone(file=audio_file, result=result_path ,speaker_wav=SAMPLES_PATH + options["voice_sample"] + ".wav", id=concurrent_id)
        response = "GEN DONE"
    except Exception as e:
        print(e, file=sys.stderr)
        response = "ERROR UNDEFINED " + e.args[0]
    ws.send(concurrent_id + " " + response)

def init_models():
    global tts, vc
    device = "cuda" if torch.cuda.is_available() else "cpu"
    vc = TTS("voice_conversion_models/multilingual/vctk/freevc24").to(device)

def generate_clone(file, speaker_wav, id, result):
    vc.voice_conversion_to_file(source_wav=file, target_wav=speaker_wav, file_path=result)

def clear_audio_files():
    if os.path.isdir('audio') == False:
        os.mkdir('audio')
        return
    dir_list = os.listdir('audio')
    for file in dir_list:
        os.remove('audio/' + file)

def verify_samples_dir():
    if os.path.isdir(SAMPLES_PATH) == False:
        os.mkdir(SAMPLES_PATH)

def main():
    init_models()
    clear_audio_files()
    with connect("ws://localhost:8781") as websocket:
        while True:
            message = websocket.recv()
            handle(message, websocket)

if __name__ == '__main__':
    main()