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

async def handle(message: str, websocket, api_handler: API):
    split_message = message.split(' ');
    prefix = split_message[0]
    split_message.remove(prefix)
    payload = str.join(' ', split_message)
    match (prefix):
        case "GENERATE":
            await prepare_generate(payload, websocket, api_handler)

async def prepare_generate(payload, websocket, api_handler:API):
    parsed = json.loads(payload)
    prompt = parsed["prompt"]
    llm_params = parsed["config"]
    response = ''
    try:
        response = "TEXT " + await generate(prompt, llm_params, api_handler)
    except Exception as e:
        if (len(e.args) < 2):
            print(e, file=sys.stderr)
            response = "ERROR UNDEFINED Could not get informations about this error. Sorry."
        match e.args[1]:
            case 401:
                response = "ERROR WRONG_AUTH Missing or incorrect NovelAI mail and/or password."
            case 502:
                response = "ERROR RESPONSE_FAILURE API Responded with 502. Service may be down or temporary inaccessible."
            case _:
                print(e, file=sys.stderr)
                response = "ERROR UNDEFINED " + str(e.args[2])
    websocket.send(response)

async def generate(custom_prompt, parameters, api_handler: API)-> str:
    global bad_words
    #start_time = time.time()
    #print('connection to API took:', time.time() - start_time, 's', file=sys.stderr)

    novel_api = api_handler.api
    model = Model.Kayra
    preset = Preset.from_official(model, "Carefree")
    preset.max_length = parameters["max_output_length"]
    preset.min_length = 1
    preset.repetition_penalty = parameters["repetition_penalty"]
    preset.repetition_penalty_frequency = 0.02
    preset.repetition_penalty_presence = 0
    preset.repetition_penalty_range = 2048
    preset.repetition_penalty_slope = 0.02
    preset.tail_free_sampling = 0.915
    preset.temperature = parameters["temperature"]
    preset.length_penalty = parameters["length_penalty"]
    preset.stop_sequences = [[85], [49287]]
    preset.repetition_penalty_whitelist = [49256,49264,49231,49230,49287,85,49255,49399,49262,336,333,432,363,468,492,745,401,426,623,794,1096,2919,2072,7379,1259,2110,620,526,487,16562,603,805,761,2681,942,8917,653,3513,506,5301,562,5010,614,10942,539,2976,462,5189,567,2032,123,124,125,126,127,128,129,130,131,132,588,803,1040,49209,4,5,6,7,8,9,10,11,12]
    preset.phrase_rep_pen = "aggressive"
    preset.order = [2,3,0,4,1]
    preset.top_a = 0.1
    preset.top_k = 15
    preset.top_p = 0.85
    
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

async def main():
    with connect("ws://localhost:8765") as websocket:
        try:
            async with API() as api_handler:
                while(True):
                    await handle(websocket.recv(), websocket, api_handler)
        except Exception as e:
            if e.args[1] == 401:
                while(True):
                    websocket.recv()
                    websocket.send("ERROR WRONG_AUTH Missing or incorrect NovelAI mail and/or password.")
            else:
                websocket.send("ERROR UNDEFINED " + str(e.args))

if __name__ == '__main__':
    asyncio.run(main())