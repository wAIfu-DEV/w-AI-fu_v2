import speech_recognition as sr
import sys
from pynput.keyboard import Key, Listener
import pyaudio
import wave
import threading
import time

from websockets.sync.client import connect

#state
ptt_should_record = False
released = True

use_ptt = int(sys.argv[1])
use_ptt = True if use_ptt == 1 else False

index = None
try:
    index = int(sys.argv[2])
except:
    index = None

provider = "google"
try:
    provider = sys.argv[3]
except:
    provider = "google"

api_key = ""
try:
    api_key = sys.argv[4]
except:
    api_key = ""

stt_language = ""
try:
    stt_language = sys.argv[5]
except:
    stt_language = "en-US"

ws = None
paudio = None


def main():
    global use_ptt, index, ws, paudio

    with connect("ws://localhost:8711") as websocket:
        ws = websocket
        if use_ptt:
            paudio = pyaudio.PyAudio()
            print("Using Push-To-Talk.", file=sys.stdout)
            sys.stdout.flush()
            push_to_talk()
        else:
            print("Using speech recognition.", file=sys.stdout)
            sys.stdout.flush()
            speech_recognition()


def ptt_press(key: Key):
    global ptt_should_record, released
    if key == Key.ctrl_r and released:
        ptt_should_record = True
        released = False
        t = threading.Thread(target=ptt_record_audio)
        t.start()


def ptt_release(key: Key):
    global ptt_should_record, released
    if key == Key.ctrl_r:
        ptt_should_record = False
        released = True


def push_to_talk():
    with Listener(
        on_press=ptt_press,
        on_release=ptt_release) as listener:
        listener.join()
        print("PTT Listener has joined.", file=sys.stderr)


def ptt_record_audio():
    global ptt_should_record, paudio, index
    filename = "recorded.wav"
    chunk = 1024
    FORMAT = pyaudio.paInt16
    sample_rate = 44100
    paudio = pyaudio.PyAudio()
    channels = paudio.get_device_info_by_index(index)["maxInputChannels"]
    stream = paudio.open(format=FORMAT,
                        channels=channels,
                        rate=sample_rate,
                        input=True,
                        output=True,
                        frames_per_buffer=chunk,
                        input_device_index=index,
                        output_device_index=None)
    frames = []

    print("Recording...")
    sys.stdout.flush()

    while ptt_should_record:
        data = stream.read(chunk)
        frames.append(data)
    
    print("Finished recording.")
    sys.stdout.flush()

    stream.stop_stream()
    stream.close()
    paudio.terminate()

    wf = wave.open(filename, "wb")
    wf.setnchannels(channels)
    wf.setsampwidth(paudio.get_sample_size(FORMAT))
    wf.setframerate(sample_rate)
    wf.writeframes(b"".join(frames))
    wf.close()
    recognize_file()


def recognize_file():
    global ws, provider, api_key
    recognizer = sr.Recognizer()
    with sr.AudioFile("recorded.wav") as source:
        audio = recognizer.listen(source)
        recognize_audio(audio, recognizer, throw=False)


def speech_recognition():
    global index, ws, provider, api_key
    recognizer = sr.Recognizer()
    while True:
        try:
            with sr.Microphone(device_index=index) as mic:
                recognizer.adjust_for_ambient_noise(mic)
                audio = recognizer.listen(mic, timeout=5)
                recognize_audio(audio, recognizer, throw=True)
        except sr.UnknownValueError:
            recognizer = sr.Recognizer()
            continue
        except sr.WaitTimeoutError:
            recognizer = sr.Recognizer()
            continue
        except:
            continue


def recognize_audio(audio: sr.AudioData, recognizer: sr.Recognizer, throw: bool):
    global provider, ws, api_key, stt_language
    text = ''
    start_time = time.time()
    try:
        match(provider):
            case "google":
                text = recognizer.recognize_google(audio, language=stt_language)
            case "openai":
                text = recognizer.recognize_whisper_api(audio, api_key=api_key)
    except sr.exceptions.SetupError as e:
        if throw:
            raise Exception()
        print("Incorrect OpenAI token.", file=sys.stderr)
        text = '...'
    except sr.exceptions.UnknownValueError as e:
        if throw:
            raise Exception()
        print("Could not understand audio.", file=sys.stderr)
        text = '...'
    except sr.exceptions.RequestError as e:
        if throw:
            raise Exception()
        print("Could not contact audio recognition API.", file=sys.stderr)
        text = '...'
    ws.send(text)
    print("Recognition took:", round((time.time() - start_time) * 1_000), "ms", file=sys.stdout)
    sys.stdout.flush()


if __name__ == "__main__":
    main()