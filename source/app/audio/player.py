import sys
import os
import subprocess
import asyncio
import threading
import json

import pyaudio
from websockets.sync.client import connect
import wave

audio = pyaudio.PyAudio()
device_index = 0
interrupt_next = False

def handle(message, ws):
    if message == "":
        return
    if message == "INTERRUPT":
        interrupt()
        return
    split_message = message.split(' ')
    prefix = split_message[0]
    split_message.remove(prefix)
    payload = str.join(' ', split_message)
    params = json.loads(payload)
    file_id = params["id"]
    options = params["options"]
    try:
        match (prefix):
            case "PLAY_WAV":
                print("WORKED", file=sys.stderr)
                play_wav(file_id=file_id, device=options["device"])
            case "PLAY_MP3":
                play_mp3(file_id=file_id, device=options["device"], volume_modifier=options["volume_modifier"])
    except Exception as e:
        print(e, file=sys.stderr)
    ws.send("PLAY DONE")

def interrupt():
    global interrupt_next
    interrupt_next = True

def play_mp3(file_id, device = None, volume_modifier = 10):
    global audio, interrupt_next, device_index
    interrupt_next = False
    # Convert .mp3 to .wav
    path = os.path.abspath(os.environ["CWD"] + '/bin/ffmpeg/ffmpeg.exe')

    if not os.path.isfile(path):
        print(f'Could not find ffmpeg at {path}. ffmpeg is not included in the w-AI-fu repository by default because of its size (> 100MB). If you cloned the repository, download the latest release instead: https://github.com/wAIfu-DEV/w-AI-fu/releases', file=sys.stderr)

    p = subprocess.run([path, '-loglevel', 'quiet', '-y', '-i', f'{file_id}.mp3', '-filter:a', f'volume={str(volume_modifier)}dB', f'{file_id}.wav'])
    
    play_wav(file_id=file_id, device=device)
    os.remove(f'{file_id}.mp3')


def play_wav(file_id, device = None):
    global audio, interrupt_next, device_index
    interrupt_next = False

    final_device = device_index
    if device != None:
        final_device = device

    # Open the wave file
    wave_file = wave.open(f'{file_id}.wav', 'rb')
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
    os.remove(f'{file_id}.wav')
    return True

async def main():
    with connect("ws://localhost:8769") as websocket:
        while True:
            message = websocket.recv()
            t = threading.Thread(target=handle, args=[message, websocket])
            t.start()

if __name__ == '__main__':
    asyncio.run(main())