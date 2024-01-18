import torch
from TTS.api import TTS

import os
import sys
import asyncio
import threading
import json

import pyaudio
import wave
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
        case "GENERATE":
            prepare_generate(payload, ws)
        case "PLAY":
            prepare_play(payload, ws)
        case "INTERRUPT":
            interrupt()
    return

def interrupt():
    global interrupt_next
    interrupt_next = True

def prepare_generate(data, ws):
    params = json.loads(data)
    text = params["prompt"]
    options = params["options"]
    concurrent_id = params["concurrent_id"]
    response = ""
    try:
        generate_tts(text=text, voice_file=SAMPLES_PATH + options["voice_seed"] + ".wav", id=concurrent_id)
        response = "GEN DONE"
    except Exception as e:
        print(e, file=sys.stderr)
        response = "ERROR UNDEFINED " + e.args[0]
    ws.send(concurrent_id + " " + response)

def prepare_play(payload, ws):
    params = json.loads(payload)
    file_id = params["id"]
    options = params["options"]
    try:
        play_tts(file_id=file_id, device=options["device"])
    except Exception as e:
        print(e, file=sys.stderr)
    ws.send("PLAY DONE")

def init_models():
    global tts, vc
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tts = TTS("tts_models/multilingual/multi-dataset/your_tts").to(device)
    vc = TTS("voice_conversion_models/multilingual/vctk/freevc24").to(device)

def generate_tts(text, voice_file, id):
    tts.tts_to_file(text=text, language="en", file_path="audio/temp.wav", speaker_wav=voice_file)
    vc.voice_conversion_to_file(source_wav="audio/temp.wav", target_wav=voice_file, file_path="audio/" + id + ".wav")

def play_tts(file_id, device = None):
    global audio, interrupt_next, device_index
    interrupt_next = False
    # Convert .mp3 to .wav
    #path = os.path.abspath(os.environ["CWD"] + '/bin/ffmpeg/ffmpeg.exe')

    #if not os.path.isfile(path):
    #    print(f'Could not find ffmpeg at {path}. ffmpeg is not included in the w-AI-fu repository by default because of its size (> 100MB). If you cloned the repository, download the latest release instead: https://github.com/wAIfu-DEV/w-AI-fu/releases', file=sys.stderr)

    #p = subprocess.run([path, '-loglevel', 'quiet', '-y', '-i', f'audio/{file_id}.mp3', '-filter:a', f'volume={str(volume_modifier)}dB', f'audio/{file_id}.wav'])
    #p.wait()

    final_device = device_index
    if device != None:
        final_device = device

    # Open the wave file
    wave_file = wave.open(f'audio/{file_id}.wav', 'rb')
    # Open a stream for capturing audio from the virtual audio cable
    virtual_cable_stream = None
    try:
        virtual_cable_stream = audio.open(format=audio.get_format_from_width(wave_file.getsampwidth()),
                                        channels=wave_file.getnchannels(),
                                        rate=wave_file.getframerate(),
                                        output=True,
                                        output_device_index=final_device) # Set the input device index to the virtual audio cable
    except Exception as e:
        print('Cannot use selected audio device as output audio device.', file=sys.stderr)
        wave_file.close()
        return False
    # Read data from the wave file and capture it from the virtual audio cable
    data = wave_file.readframes(8192) #1024
    while data:
        if interrupt_next:
            interrupt_next = False
            break
        virtual_cable_stream.write(data)
        data = wave_file.readframes(8192)
    # Clean up resources
    virtual_cable_stream.stop_stream()
    virtual_cable_stream.close()
    wave_file.close()
    os.remove(f'audio/{file_id}.wav')
    return True

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

async def main():
    init_models()
    clear_audio_files()
    with connect("ws://localhost:8766") as websocket:
        while True:
            message = websocket.recv()
            t = threading.Thread(target=handle, args=[message, websocket])
            t.start()

if __name__ == '__main__':
    asyncio.run(main())