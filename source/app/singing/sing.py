import os
import sys
import time
import wave
import os
import subprocess

import pyaudio

proc_id = None
other_id = None

CHUNK_SIZE: int = 8192
DRIFT_CORRECTION_SCALING: int = 2

audio = pyaudio.PyAudio()

def get_current_time():
    return time.time_ns() // 1000000

def play_wav(filename, device):
    global proc_id, other_id, CHUNK_SIZE

    # Open the wave file
    with wave.open(filename, 'rb') as wave_file:
        # Open a stream for capturing audio from the virtual audio cable
        audio_stream: pyaudio.PyAudio.Stream = None

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

        desync_accumulator: int = 0
        desync_array: list[int] = []
        iters: int = 0

        await_sync(proc_id, other_id)

        start_time: int = get_current_time()
        framerate: int = wave_file.getframerate()

        data: bytes = wave_file.readframes(CHUNK_SIZE)
        while data:
            iters += 1
            playback_time: int = get_current_time() - start_time
            audio_stream.write(data)

            target_time: int = int(wave_file.tell() / framerate * 1_000)
            drift: int = playback_time - target_time

            desync_accumulator += drift
            desync_array.append(drift)

            frames_to_read: int = max(1, CHUNK_SIZE + (drift * DRIFT_CORRECTION_SCALING))
            data = wave_file.readframes(frames_to_read)

        # Clean up resources
        audio_stream.stop_stream()
        audio_stream.close()

        # if proc_id:
        #     for i in range(len(desync_array)):
        #         print(desync_array[i])

        desync_array.sort()
        median: int = desync_array[int(len(desync_array) / 2)]
        
        print(f"Player {proc_id}: finished playing: {filename}. desync average(ms): {int(desync_accumulator / iters)}. desync median(ms): {int(median)}")

def await_sync(id, other_id):
    sync1 = f'sync{id}.lock'
    sync2 = f'sync{other_id}.lock'
    with open(sync1,'w') as f:
        f.write('')
    while not os.path.exists(sync2):
        pass
    return

if __name__ == '__main__':
    file = sys.argv[1]
    device = int(sys.argv[2])
    proc_id = int(sys.argv[3])
    other_id = 0 if proc_id == 1 else 1

    # Setting process priority to "Real Time"
    # Should technically mitigate drift induced
    # by OS thread scheduling.
    subprocess.run("wmic process where processid=\""+str(os.getpid())+"\" CALL setpriority 256", capture_output=True)
    #os.system("wmic process where processid=\""+str(os.getpid())+"\" CALL setpriority 256") 

    play_wav(file, device)