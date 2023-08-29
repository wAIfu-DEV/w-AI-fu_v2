import os
import sys
import json

from characterai import PyCAI

cai_client = PyCAI(os.environ["CAI_TOKEN"])
cai_client.start()

character_def = json.loads(os.environ["CHARACTER"])

def check_char_exists():
    global character_def, cai_client
    try:
        char = cai_client.chat.get_chat(char="w-AI-fu_" + character_def["char_name"])
    except:
        char = cai_client.character.create(
            name="w-AI-fu_" + character_def["char_name"],
            identifier="w-AI-fu_" + character_def["char_name"],
            visibility='PRIVATE',
            greeting="hey",
            definition=character_def["example_dialogue"],
            title="AI",
            description=character_def["char_persona"])
    print(char, file=sys.stderr)

def prep_generate_char():
    pass

def prep_generate_response():
    pass

def main():
    check_char_exists()
    pass

if __name__ == "__main__":
    main()