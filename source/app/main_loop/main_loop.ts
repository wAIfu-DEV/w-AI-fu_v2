import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";

import { Character } from "../characters/character";
import { Message } from "../types/Message";
import { Result } from "../types/Result";
import { ChatterInfos } from "../chatter_info/chatter_status";

import { handleCommand, HANDLE_STATUS } from "../commands/command_handler";
import { reloadDependencies } from "../dependencies/reload_dependencies";
import { getDeviceIndex } from "../devices/devices";
import { shouldMonologue } from "../monologue/should_monologue";
import { checkForBadWords } from "../moderation/check_for_bad_words";
import { reloadPlugins } from "../plugins/reload_plugins";
import { isSpamMessage } from "../moderation/check_for_spam";
import { preventFreakout } from "../anti_freakout/prevent_freakout";
import { generateResponse } from "../gen_response/generate_response";
import { removeNovelAIspecialSymbols } from "../sanitize/sanitize";
import { getCurrentCharacter } from "../characters/characters";
import {
    /*generateTTS, generateTtsSplit,*/
    generateTtsOverlapped,
} from "../gen_tts/generate_tts";

import { LLM_GEN_ERRORS } from "../llm/llm_interface";
import { REJECT_REASON } from "../input/input_interface";
import { formatStampedMemory } from "../memory/format_ltm";
import { QueryResult } from "../memory/ltm_interface";
import { ClosedCaptionsWS } from "../closed_captions/stream_captions";
import { WebSocket } from "ws";

let start_time = 0;
let llm_start_time = 0;
let tts_start_time = 0;

/**
 * Main loop of the program.
 * Responsible for the coordination of events in the program.
 * @param dependencies Bundle of dependencies used within the main loop
 */
export async function mainLoop_impl(): Promise<void> {
    const cfg = wAIfu.state!.config;

    // Tell plugins of loop start
    for (let plugin of wAIfu.plugins) plugin.onMainLoopStart();

    /*************************
    Get input
    *************************/

    // Get input from plugins
    let plugin_input: string | Message | undefined = undefined;
    for (let plugin of wAIfu.plugins) {
        plugin_input = plugin.onInputSource();
        if (plugin_input !== undefined) break;
    }

    let input_result: Result<Message, REJECT_REASON> = {
        success: true,
        value: new Message(),
        error: REJECT_REASON.NONE,
    };

    // Set input result based on plugin response
    if (plugin_input === undefined) {
        // If no answer from plugins,
        // obtain user input or timeout
        input_result = await wAIfu.dependencies!.input_system.awaitInput();
    } else {
        input_result.value =
            typeof plugin_input === "string"
                ? {
                      content: plugin_input,
                      sender: cfg._.user_name.value,
                      trusted: true,
                  }
                : plugin_input;
    }

    start_time = new Date().getTime();

    // Handle dependencies reload
    if (wAIfu.dependencies!.needs_reload === true) {
        wAIfu.dependencies = await reloadDependencies(wAIfu.dependencies!);
        wAIfu.plugins = reloadPlugins(wAIfu.plugins);
    }

    // Handle pausing
    while (wAIfu.state!.config._.paused.value === true) {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 250);
        });
    }

    // reset skip status
    wAIfu.dependencies!.tts.skip = false;

    let is_monologue: boolean =
        cfg.behaviour.monologue.value === false ? false : shouldMonologue();

    // Error handling of input system
    input_failure: if (input_result.success === false) {
        if (cfg.behaviour.force_monologue.value === true && is_monologue) {
            input_result.success = false;
            break input_failure;
        }

        switch (input_result.error) {
            case REJECT_REASON.TIMEOUT:
                {
                    let { value, success } =
                        wAIfu.dependencies!.live_chat.nextMessage();
                    input_result.value = value;
                    input_result.success = success;
                }
                break;
            case REJECT_REASON.INTERRUPT:
                return;
            default:
                break;
        }
    }

    // If input success is true, make sure to turn off monologue
    is_monologue = input_result.success ? false : is_monologue;

    // If both input and monologue are off, next loop iter
    if (input_result.success === false && is_monologue === false) return;

    if (is_monologue === true) {
        input_result.value.trusted = true;
        input_result.value.content = "";
    }

    if (input_result.value.trusted === false) {
        input_result.value.content = removeNovelAIspecialSymbols(
            input_result.value.content
        );

        const input_filtered = checkForBadWords(input_result.value.content);
        if (input_filtered !== null) return;

        const should_filter_spam = cfg.moderation.filter_spam_messages.value;

        if (should_filter_spam && isSpamMessage(input_result.value.content))
            return;
    }

    const message: Message = input_result.value;

    // Handle commands from plugins
    for (let plugin of wAIfu.plugins) {
        let handle_result = plugin.onCommandHandling(
            message.content,
            message.trusted,
            message.sender
        );
        if (handle_result === true) return;
    }

    // Handling of built-in commands
    const handle_status = await handleCommand(message.content, message.trusted);
    if (handle_status === HANDLE_STATUS.HANDLED) return;

    if (message.content === "") is_monologue = true;

    if (is_monologue === false) {
        wAIfu.dependencies!.ui?.send(
            message.trusted === true ? "MESSAGE_USER" : "MESSAGE_CHAT",
            { text: message.content, sender: message.sender }
        );
    }

    /*************************
    Prompt making
    *************************/
    let context_arr = [];

    if (cfg._.context.value !== "")
        context_arr.push(`Context: ${cfg._.context.value}`);

    let chatter_string = ChatterInfos.getChatterStatusString(message.sender);
    if (chatter_string !== "" && message.sender !== undefined)
        context_arr.push(`User: ${chatter_string}`);

    if (ChatterInfos.isJustReturningChatter(message.sender)) {
        ChatterInfos.addChatter(message.sender);
    }

    const character: Character = getCurrentCharacter();

    if (is_monologue) {
        IO.print(`${character.char_name} starts to monologue.`);

        let topics = cfg.behaviour.templated_monologue_topics.value;
        if (topics.length !== 0) {
            let rand = Math.random() * (topics.length - 1);
            context_arr.push(
                `Action: ${topics[Math.round(rand)]!.replaceAll(
                    "<CHARA>",
                    character.char_name
                )}`
            );
        }
    }

    const context = context_arr.join("\n");

    const user_prompt = is_monologue
        ? ""
        : `${message.sender}: ${message.content}\n`;

    // Get long-term memories
    let long_term_memories: string[] = [];
    if (cfg.memory.retrieve_memories_from_vectordb.value === true) {
        const items_amount = cfg.memory.vectordb_retrieval_amount.value;
        let query_result = await wAIfu.dependencies!.ltm.query(
            wAIfu.state?.memory.getLastShortTermMemory() + " " + user_prompt,
            items_amount
        );
        long_term_memories = query_result
            .sort((a: QueryResult, b: QueryResult) =>
                a.timestamp > b.timestamp ? 1 : -1
            )
            .map((v: QueryResult) => formatStampedMemory(v));
    }

    // Construct prompt using memories + context + input
    const prompt = wAIfu.state!.memory.getMemories(
        context === "" ? null : context,
        user_prompt,
        long_term_memories
    );

    IO.quietPrint(prompt);

    IO.print("Start Took(ms):", new Date().getTime() - start_time);
    llm_start_time = new Date().getTime();

    /*************************
    LLM Generation
    *************************/
    if (wAIfu.dependencies!.tts.skip) return;

    let response = await generateResponse(prompt, character.char_name);

    if (wAIfu.dependencies!.tts.skip) return;

    IO.print("LLM Took(ms):", new Date().getTime() - llm_start_time);

    for (let plugin of wAIfu.plugins) {
        let val = plugin.onResponseHandling(response.text);
        if (val === undefined) continue;
        response.text = val;
    }

    let infered_emotion = "";

    let infer_promise: Promise<Result<string, LLM_GEN_ERRORS>> =
        wAIfu.dependencies!.llm.generate(
            `{ Emotions: [${wAIfu
                .state!.config.vts.emotions.value.map((v) => {
                    return v.emotion_name;
                })
                .join(",")}] }\n${
                character.char_name
            }:\"${response.text.trim()}\"\n{ What emotion is ${
                character.char_name
            } feeling? (1 word) }`,
            {
                character_name: "Emotion",
                temperature: 0.5,
                repetition_penalty: 0.5,
                max_output_length: 4,
                length_penalty: -1,
                use_base_model: true,
            }
        );

    if (cfg.behaviour.try_prevent_freakouts.value === true) {
        response.text = preventFreakout(response.text);
    }

    IO.quietPrint(
        `Answering to:\n${message.sender}: ${message.content}\n${
            character.char_name
        }: ${response.text.trim()}`
    );
    wAIfu.dependencies!.ui?.send("MESSAGE_CHAR", {
        text: response.text.trim(),
    });

    /*************************
    TTS Generation and Playing
    *************************/
    if (wAIfu.dependencies!.tts.skip) return;

    const read_every_messages =
        cfg.text_to_speech.read_every_messages_out_loud.value === true;
    const read_chat = cfg.text_to_speech.read_chat_out_loud.value === true;

    tts_start_time = new Date().getTime();

    if (
        (read_every_messages && is_monologue === false) ||
        (message.trusted === false && read_chat)
    ) {
        // I'm gonna be honest, the amount of arguments this function takes is sickening
        await generateAndPlaySpeechWithNarrator({
            input_msg: message,
            output_msg: response.text,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    } else {
        await generateAndPlaySpeech({
            output_msg: response.text,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    }

    /*************************
    End of Main Loop
    *************************/
    if (wAIfu.dependencies!.tts.skip) return;

    wAIfu.dependencies!.tts.skip = false;
    if (ClosedCaptionsWS.readyState === WebSocket.OPEN)
        ClosedCaptionsWS.send("CLEAR");
    IO.setClosedCaptions("");

    wAIfu.dependencies!.input_system.input_text = "";

    if (response.filtered === false) {
        let new_memory =
            is_monologue === true
                ? `${character.char_name}:${response.text}`
                : `${user_prompt}${character.char_name}:${response.text}`;

        // Making sure we don't poison the prompt with novelai sp symbols
        // as we also use them to parse the memory for the openai models.
        new_memory = removeNovelAIspecialSymbols(new_memory);
        wAIfu.state!.memory.addMemory(new_memory);
    }

    for (let plugin of wAIfu.plugins) plugin.onMainLoopEnd();
    return;
}

function handleInferredEmotion(
    promise: Promise<Result<string, LLM_GEN_ERRORS>>,
    buffer: string
) {
    promise.then((result) => {
        if (result.success === false) return;
        buffer = result.value.trim().replaceAll(/[^a-zA-Z]/g, "");
        IO.debug("Infered emotion: " + buffer);
        wAIfu.dependencies!.vts.reset().then(() => {
            wAIfu.dependencies!.vts.setAnimationSequences(buffer);
            wAIfu.dependencies!.vts.animateTalking();
        });
    });
}

async function generateAndPlaySpeech(args: {
    output_msg: string;
    emotion: string;
    emotion_promise: Promise<Result<string, LLM_GEN_ERRORS>>;
}) {
    const cfg = wAIfu.state!.config;

    let sentences = args.output_msg
        .trim()
        .replaceAll("¤", "")
        .replaceAll(/[\.\!\?]+/g, "$&¤")
        .split("¤")
        .map((s) => s.trim())
        .filter((v) => v !== "");

    handleInferredEmotion(args.emotion_promise, args.emotion);

    let idx = 0;

    await generateTtsOverlapped(
        sentences,
        {
            voice: getCurrentCharacter().voice,
            is_narrator: false,
        },
        async (id: string) => {
            if (wAIfu.dependencies!.tts.skip) return;
            if (idx === 0) {
                IO.print(
                    "TTS Took(ms):",
                    new Date().getTime() - tts_start_time
                );
                IO.print("Took(ms):", new Date().getTime() - start_time);
            }

            IO.setClosedCaptions(sentences[idx]!, {
                id: id,
                persistent: idx === sentences.length - 1 ? false : true,
                is_narrator: false,
            });

            await wAIfu.dependencies!.tts.playSpeech(id, {
                device: getDeviceIndex(cfg.devices.tts_output_device.value),
                volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
            });

            idx++;
        }
    );

    wAIfu.dependencies!.vts.animateIdle();

    /*let result: string | null = await generateTTS(args.output_msg.trim(), {
        voice: getCurrentCharacter().voice,
        is_narrator: false,
    });

    IO.print("TTS Took(ms):", new Date().getTime() - tts_start_time);
    IO.print("Took(ms):", new Date().getTime() - start_time);

    if (result === null) return;

    if (wAIfu.dependencies!.tts.skip === false) {
        IO.setClosedCaptions(args.output_msg.trim(), {
            id: result,
            persistent: false,
            is_narrator: false,
        });

        handleInferredEmotion(args.emotion_promise, args.emotion);

        await wAIfu.dependencies!.tts.playSpeech(result, {
            device: getDeviceIndex(cfg.devices.tts_output_device.value),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });

        wAIfu.dependencies!.vts.animateIdle();
    }*/
}

async function generateAndPlaySpeechWithNarrator(args: {
    input_msg: Message;
    output_msg: string;
    emotion: string;
    emotion_promise: Promise<Result<string, LLM_GEN_ERRORS>>;
}) {
    const cfg = wAIfu.state!.config;

    const narrator_voice = cfg.text_to_speech.chatter_specific_voice.value
        ? args.input_msg.sender
        : cfg.text_to_speech.narrator_voice.value;

    const char_sentences = args.output_msg
        .trim()
        .replaceAll("¤", "")
        .replaceAll(/[\.\!\?]+/g, "$&¤")
        .split("¤")
        .map((s) => s.trim())
        .filter((v) => v !== "");

    const usr_sentences = args.input_msg.content
        .trim()
        .replaceAll("¤", "")
        .replaceAll(/[\.\!\?]+/g, "$&¤")
        .split("¤")
        .map((s) => s.trim())
        .filter((v) => v !== "");

    let idx = 0;

    wAIfu.dependencies?.vts.animateListening();

    await generateTtsOverlapped(
        usr_sentences,
        {
            voice: cfg.text_to_speech.use_narrator_to_read_chat.value
                ? narrator_voice
                : getCurrentCharacter().voice,
            is_narrator: true,
        },
        async (id: string) => {
            if (wAIfu.dependencies!.tts.skip) return;

            let sub_text = "";

            if (idx === 0) {
                IO.print(
                    "TTS Took(ms):",
                    new Date().getTime() - tts_start_time
                );
                sub_text += args.input_msg.sender + ": ";
            }

            sub_text += usr_sentences[idx]!;

            IO.setClosedCaptions(sub_text, {
                id: id,
                persistent: idx === usr_sentences.length - 1 ? false : true,
                is_narrator: true,
            });

            await wAIfu.dependencies!.tts.playSpeech(id, {
                device: getDeviceIndex(
                    cfg.devices.narrator_tts_output_device.value
                ),
                volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
            });

            idx++;
        }
    );

    if (wAIfu.dependencies!.tts.skip) return;
    idx = 0;

    await generateTtsOverlapped(
        char_sentences,
        {
            voice: getCurrentCharacter().voice,
            is_narrator: false,
        },
        async (id: string) => {
            if (wAIfu.dependencies!.tts.skip) return;
            if (idx === 0) {
                if (ClosedCaptionsWS.readyState === WebSocket.OPEN)
                    ClosedCaptionsWS.send("CLEAR");
                IO.setClosedCaptions("");

                handleInferredEmotion(args.emotion_promise, args.emotion);
            }

            IO.setClosedCaptions(char_sentences[idx]!, {
                id: id,
                persistent: idx === char_sentences.length - 1 ? false : true,
                is_narrator: false,
            });

            await wAIfu.dependencies!.tts.playSpeech(id, {
                device: getDeviceIndex(cfg.devices.tts_output_device.value),
                volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
            });

            idx++;
        }
    );

    wAIfu.dependencies!.vts.animateIdle();

    /*
    const char_sentences = args.output_msg
        .trim()
        .replaceAll("¤", "")
        .replaceAll(/[\.\!\?]+/g, "$&¤")
        .split("¤")
        .map((s) => s.trim())
        .filter((v) => v !== "");

    const usr_sentences = args.input_msg.content
        .trim()
        .replaceAll("¤", "")
        .replaceAll(/[\.\!\?]+/g, "$&¤")
        .split("¤")
        .map((s) => s.trim())
        .filter((v) => v !== "");

    const batch_results = await Promise.allSettled([
        generateTtsSplit(usr_sentences, {
            voice: cfg.text_to_speech.use_narrator_to_read_chat.value
                ? narrator_voice
                : getCurrentCharacter().voice,
            is_narrator: true,
        }),
        generateTtsSplit(char_sentences, {
            voice: getCurrentCharacter().voice,
            is_narrator: false,
        }),
    ]);

    IO.print("TTS Took(ms):", new Date().getTime() - tts_start_time);
    IO.print("Took(ms):", new Date().getTime() - start_time);

    let narrator_tts_ids: string[] | null;
    if (batch_results[0].status === "fulfilled")
        narrator_tts_ids = batch_results[0].value;
    else return;

    let character_tts_ids: string[] | null;
    if (batch_results[1].status === "fulfilled")
        character_tts_ids = batch_results[1].value;
    else return;

    if (narrator_tts_ids === null) return;
    if (character_tts_ids === null) return;

    wAIfu.dependencies?.vts.animateListening();

    for (let i = 0; i < narrator_tts_ids.length; ++i) {
        if (wAIfu.dependencies!.tts.skip === true) return;
        let id = narrator_tts_ids[i]!;

        IO.print("Sentence:", usr_sentences[i]!);

        IO.setClosedCaptions(usr_sentences[i]!, {
            id: id,
            persistent: i === narrator_tts_ids.length - 1 ? false : true,
            is_narrator: true,
        });

        await wAIfu.dependencies!.tts.playSpeech(id, {
            device: getDeviceIndex(
                cfg.devices.narrator_tts_output_device.value
            ),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
    }

    handleInferredEmotion(args.emotion_promise, args.emotion);

    for (let i = 0; i < character_tts_ids.length; ++i) {
        if (wAIfu.dependencies!.tts.skip === true) return;
        let id = character_tts_ids[i]!;

        IO.print("Sentence:", char_sentences[i]!);

        IO.setClosedCaptions(char_sentences[i]!, {
            id: id,
            persistent: i === character_tts_ids.length - 1 ? false : true,
            is_narrator: false,
        });

        await wAIfu.dependencies!.tts.playSpeech(id, {
            device: getDeviceIndex(cfg.devices.tts_output_device.value),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
    }

    wAIfu.dependencies!.vts.animateIdle();
    */

    /*
    // Generate both narrator's and character's TTS at the same time
    const batch_tts_results = await Promise.allSettled([
        generateTTS(args.input_msg.content.trim(), {
            voice: cfg.text_to_speech.use_narrator_to_read_chat.value
                ? narrator_voice
                : getCurrentCharacter().voice,
            is_narrator: true,
        }),
        generateTTS(args.output_msg.trim(), {
            voice: getCurrentCharacter().voice,
            is_narrator: false,
        }),
    ]);

    IO.print("TTS Took(ms):", new Date().getTime() - tts_start_time);
    IO.print("Took(ms):", new Date().getTime() - start_time);

    let narrator_tts_id: string | null;
    if (batch_tts_results[0].status === "fulfilled")
        narrator_tts_id = batch_tts_results[0].value;
    else return;

    let character_tts_id: string | null;
    if (batch_tts_results[1].status === "fulfilled")
        character_tts_id = batch_tts_results[1].value;
    else return;

    if (narrator_tts_id === null) return;
    if (character_tts_id === null) return;

    wAIfu.dependencies?.vts.animateListening();

    if (wAIfu.dependencies!.tts.skip === false) {
        IO.setClosedCaptions(
            args.input_msg.sender + ": " + args.input_msg.content.trim(),
            {
                id: narrator_tts_id,
                persistent: false,
                is_narrator: true,
            }
        );

        await wAIfu.dependencies!.tts.playSpeech(narrator_tts_id, {
            device: getDeviceIndex(
                cfg.devices.narrator_tts_output_device.value
            ),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
    }

    if (wAIfu.dependencies!.tts.skip === false) {
        IO.setClosedCaptions(args.output_msg.trim(), {
            id: character_tts_id,
            persistent: false,
            is_narrator: false,
        });

        handleInferredEmotion(args.emotion_promise, args.emotion);

        await wAIfu.dependencies!.tts.playSpeech(character_tts_id, {
            device: getDeviceIndex(cfg.devices.tts_output_device.value),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
        wAIfu.dependencies!.vts.animateIdle();
    }*/
}
