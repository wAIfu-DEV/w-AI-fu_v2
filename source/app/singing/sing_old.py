import os
import sys
import sounddevice as sd
import soundfile as sf
import time
import wave

proc_id = None
other_id = None

def play_wav(filename, device):
    global proc_id, other_id
    data, fs = sf.read(filename, dtype='float32')
    await_sync(proc_id, other_id)
    print(f"Player {proc_id}: playing {filename} on device: {device} at time(ms): {time.time_ns() // 1000000}")
    sd.play(data, fs, device=device, blocking=False)
    sys.stdout.flush()
    sd.wait()
    print(f"Player {proc_id}: finished playing: {filename}")

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
    sd.stop()