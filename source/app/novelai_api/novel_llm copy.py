import base64
import sys
import os
import json
import asyncio
import time

from websockets.sync.client import connect

from typing import List
from boilerplate import API

from novelai_api.BanList import BanList
from novelai_api.BiasGroup import BiasGroup
from novelai_api.GlobalSettings import GlobalSettings
from novelai_api.Preset import Model, Preset
from novelai_api.Tokenizer import Tokenizer
from novelai_api.utils import b64_to_tokens

os.system('title w-AI-fu NovelAI LLM')

bad_words: BanList = BanList(':', ' :', '::', ' ::', '*:', ';', ' ;', ';;', ' ;;', '#', ' #', '|', ' |', '{', ' {', '}', ' }', '[', ' [', ']', ' ]', '\\', ' \\', '/', ' /', '*', ' *', '~', ' ~', 'bye', ' bye', 'Bye', ' Bye', 'goodbye', ' goodbye', 'Goodbye', ' Goodbye', 'goodbye', ' goodnight', 'Goodnight', ' Goodnight', 'www', ' www', 'http', ' http', 'https', ' https', '.com', '.org', '.net')

async def handle(message: str, websocket):
    split_message = message.split(' ');
    prefix = split_message[0]
    split_message.remove(prefix)
    payload = str.join(' ', split_message)
    match (prefix):
        case "GENERATE":
            await prepare_generate(payload, websocket)

async def prepare_generate(payload, websocket):
    parsed = json.loads(payload)
    prompt = parsed["prompt"]
    config = parsed["config"]
    llm_params = config["llm"]
    response = ''
    try:
        response = "TEXT " + await generate(prompt, llm_params)
    except Exception as e:
        match e.args[1]:
            case 401:
                response = "ERROR WRONG_AUTH Missing or incorrect NovelAI mail and/or password."
            case _:
                print(e, file=sys.stderr)
                response = "ERROR UNDEFINED " + str(e.args[2])
    websocket.send(response)

async def generate(custom_prompt, parameters)-> str:
    global bad_words
    start_time = time.time()
    async with API() as api_handler:

        api_handler.api.timeout

        print('connection to API took:', time.time() - start_time, 's', file=sys.stderr)
        novel_api = api_handler.api

        model = Model.Kayra
        preset = Preset.from_official(model, "Carefree")

        preset.max_length = parameters["max_output_length"]["value"]
        preset.min_length = 1
        preset.repetition_penalty = parameters["repetition_penalty"]["value"] + 0.5
        preset.temperature = parameters["temperature"]["value"] + 1
        preset.length_penalty = parameters["length_penalty"]["value"]
        preset.stop_sequences = [[85], [49287]]
            
        global_settings: GlobalSettings = GlobalSettings(num_logprobs=GlobalSettings.NO_LOGPROBS)
        global_settings.bias_dinkus_asterism = False
        global_settings.generate_until_sentence = True
        global_settings.ban_ambiguous_genji_tokens = True
            
        bias_groups: List[BiasGroup] = []
        module = 'vanilla'
        prompt = Tokenizer.encode(model, custom_prompt)
            
        gen = await novel_api.high_level.generate(prompt, model, preset, global_settings, bad_words, bias_groups, module)
        decoded = Tokenizer.decode(model, b64_to_tokens(gen["output"]))
        return decoded  

def main():
    with connect("ws://localhost:8765") as websocket:
        while(True):
            asyncio.run(handle(websocket.recv(), websocket))

if __name__ == '__main__':
    main()