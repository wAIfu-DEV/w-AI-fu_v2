from vectordb import Memory
from websockets.sync.client import connect

import json
import sys
import os

def get_list_from_query(query_results: list[dict])-> list[str]:
    result: list[dict] = []
    for item in query_results:
        item["distance"] = float(item["distance"])
        result.append(item)
    return result


def handle_msg(data: str, ws, memory: Memory):
    split_data: list[str] = data.split(" ")
    prefix: str = split_data[0]
    payload: str = " ".join(split_data[1:])
    result = ""
    match prefix:
        case "STORE":
            timestamp = int(split_data[1])
            content = " ".join(split_data[2:])
            memory.save(content, timestamp)
        case "QUERY":
            payload_json = json.loads(payload)
            id = payload_json["id"]
            text = payload_json["text"].strip()
            items = payload_json["items"]
            query_result = []
            try:
                query_result = get_list_from_query(memory.search(text, top_n=items, unique=True))
            except Exception as e:
                print(e, file=sys.stderr)
                query_result = []
            result_json = json.dumps({ "results": query_result })
            result = id + " " + result_json
            ws.send(result)
        case "CLEAR":
            memory.clear()
        case "DUMP":
            memory.dump()
            sys.stdout.flush()
        case _:
            return

def main():
    path = os.getcwd() + "\\database.txt"
    #options = { 'mode':'sliding_window', 'window_size': 240, 'overlap': 16 }
    options = { 'mode':'sliding_window', 'window_size': 80, 'overlap': 16 }
    try:
        memory = Memory(memory_file=path, chunking_strategy=options)
    except:
        memory = Memory()
        memory.memory_file = path
        memory.save("empty", memory_file=path)
        memory = Memory(memory_file=path, chunking_strategy=options)
    while True:
        try:
            with connect("ws://localhost:9251") as ws:
                while True:
                    msg: str = ws.recv()
                    handle_msg(msg, ws, memory)
        except Exception as e:
            print(e, file=sys.stderr)
            continue

if __name__ == "__main__":
    main()