import os
import sys
import sounddevice as sd
import soundfile as sf
import time
import wave
import os

import pyaudio

proc_id = None
other_id = None

CHUNK_SIZE = int(8192 / 8)

audio = pyaudio.PyAudio()

def get_current_time():
    return time.time_ns() // 1000000  # Convert nanoseconds to milliseconds

def play_wav(filename, device):
    global proc_id, other_id, CHUNK_SIZE

    # Open the wave file
    with wave.open(filename, 'rb') as wave_file:
        # Open a stream for capturing audio from the virtual audio cable
        audio_stream = None

        try:
            audio_stream = audio.open(format=audio.get_format_from_width(wave_file.getsampwidth()),
                                            channels=wave_file.getnchannels(),
                                            rate=wave_file.getframerate(),
                                            frames_per_buffer=CHUNK_SIZE,
                                            output=True,
                                            output_device_index=device) # Set the input device index to the virtual audio cable

        except Exception as e:
            print('Cannot use selected audio device as output audio device.', file=sys.stderr)
            return False

        desync_accumulator = 0
        desync_array = []
        iters = 0

        await_sync(proc_id, other_id)
        start_time = get_current_time()

        framerate = wave_file.getframerate()

        data = wave_file.readframes(CHUNK_SIZE)
        while data:
            iters += 1
            playback_time = get_current_time() - start_time
            audio_stream.write(data)

            target_time = wave_file.tell() / framerate * 1000
            drift = playback_time - target_time # -100
            abs_drift = abs(drift)
            desync_accumulator += abs_drift
            desync_array.append(abs_drift)
            frames_to_read = max(1, CHUNK_SIZE + int(drift * 2))
            data = wave_file.readframes(frames_to_read)

        # Clean up resources
        audio_stream.stop_stream()
        audio_stream.close()

        desync_array.sort()
        median = desync_array[int(len(desync_array) / 2)]
        
        print(f"Player {proc_id}: finished playing: {filename}. desync average(ms): {int(desync_accumulator / iters)}. desync median(ms): {int(median)}")

def await_sync(id, other_id):
    with open(f'sync{id}.lock','w') as f:
        f.write('')
    while os.path.exists(f'sync{other_id}.lock') == False:
        pass #making the cpu panick for pleasure
    return

if __name__ == '__main__':
    file = sys.argv[1]
    device = int(sys.argv[2])
    proc_id = int(sys.argv[3])

    other_id = 0 if proc_id == 1 else 1

    play_wav(file, device)