import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";

import { Character } from "../characters/character";
import { Message } from "../types/Message";
import { Result } from "../types/Result";
import { Dependencies } from "../dependencies/dependencies";

import { handleCommand, HANDLE_STATUS } from "../commands/command_handler";
import { reloadDependencies } from "../dependencies/reload_dependencies";
import { getDeviceIndex } from "../devices/devices";
import { shouldMonologue } from "../monologue/should_monologue";
import { checkForBadWords } from "../moderation/check_for_bad_words";
import { reloadPlugins } from "../plugins/reload_plugins";
import { isSpamMessage } from "../moderation/check_for_spam";
import { preventFreakout } from "../anti_freakout/prevent_freakout";

import { LLM_GEN_ERRORS } from "../llm/llm_interface";
import { TTS_GEN_ERROR } from "../tts/tts_interface";
import { REJECT_REASON } from "../input/input_interface";
import { generateResponse } from "../gen_response/generate_response";
import { removeNovelAIspecialSymbols } from "../sanitize/sanitize";
import { getCurrentCharacter } from "../characters/characters";
import { ChatterInfos } from "../chatter_info/chatter_status";

/**
 * Main loop of the program.
 * Responsible for the coordination of events in the program.
 * @param dependencies Bundle of dependencies used within the main loop
 */
export async function mainLoop_impl(): Promise<void> {
    for (let plugin of wAIfu.plugins) plugin.onMainLoopStart();

    let plugin_input = undefined;
    for (let plugin of wAIfu.plugins) {
        let val = plugin.onInputSource();
        if (val === undefined) continue;
        plugin_input = val;
    }

    // Obtain user input or timeout
    let input_result: Result<Message, REJECT_REASON>;
    if (plugin_input !== undefined) {
        input_result = {
            success: true,
            value: {
                content: plugin_input,
                sender: wAIfu.state!.config._.user_name.value,
                trusted: true,
            },
            error: REJECT_REASON.NONE,
        };
    } else {
        input_result = await wAIfu.dependencies!.input_system.awaitInput();
    }

    // Handle dep reload
    if (wAIfu.dependencies!.needs_reload === true) {
        wAIfu.dependencies = await reloadDependencies(
            wAIfu.dependencies!,
            wAIfu.state!.config
        );
        wAIfu.plugins = reloadPlugins(wAIfu.plugins);
    }

    // Handle pausing
    while (wAIfu.state!.config._.paused.value === true)
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 250);
        });

    wAIfu.dependencies!.tts.skip = false;

    // Error handling of input system
    if (input_result.success === false) {
        switch (input_result.error) {
            case REJECT_REASON.TIMEOUT:
                {
                    let live_chat_result =
                        wAIfu.dependencies!.live_chat.nextMessage();
                    if (live_chat_result.success === false) break;
                    input_result.success = true;
                    input_result.value = live_chat_result.value;
                }
                break;
            case REJECT_REASON.INTERRUPT: {
                return;
            }
            default:
                break;
        }
    }

    if (input_result.value.content !== undefined)
        input_result.value.content = removeNovelAIspecialSymbols(
            input_result.value.content
        );

    if (input_result.value.trusted === false) {
        let input_filtered = checkForBadWords(input_result.value.content);
        if (input_filtered !== null) return;
        if (isSpamMessage(input_result.value.content)) return;
    }

    const character: Character = getCurrentCharacter();

    // Monologue
    let is_monologue =
        input_result.success === true ? false : shouldMonologue();
    if (input_result.success === false && is_monologue === false) return;

    if (is_monologue === true) {
        input_result.value.trusted = true;
        input_result.value.content = "";
    }

    const message: Message = input_result.value;

    for (let plugin of wAIfu.plugins) {
        let handle_result = plugin.onCommandHandling(
            message.content,
            message.trusted,
            message.sender
        );
        if (handle_result === true) return;
    }

    // Handling of commands
    const handle_status = await handleCommand(message.content, message.trusted);
    if (handle_status === HANDLE_STATUS.HANDLED) return;

    if (message.content === "") is_monologue = true;

    if (is_monologue === true) {
        IO.print(`${character.char_name} starts to monologue.`);
    } else {
        wAIfu.dependencies!.ui?.send(
            message.trusted === true ? "MESSAGE_USER" : "MESSAGE_CHAT",
            { text: message.content, sender: message.sender }
        );
    }

    const user_prompt =
        is_monologue === true ? "" : `${message.sender}: ${message.content}\n`;

    const chatter_info = message.trusted
        ? ""
        : ChatterInfos.getChatterStatusString(message.sender);

    if (
        message.trusted === false &&
        ChatterInfos.isJustReturningChatter(message.sender)
    ) {
        ChatterInfos.addChatter(message.sender);
    }

    const context = wAIfu.state!.config._.context.value + chatter_info;

    // Construct prompt using memories + context + input
    const prompt =
        wAIfu.state!.memory.getMemories(
            context === "" ? null : context,
            user_prompt
        ) +
        character.char_name +
        ":";

    IO.quietPrint(prompt);

    let response = await generateResponse(prompt);

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
            } feeling ? (1 word) }\nEmotion:`,
            {
                temperature: 1,
                repetition_penalty: 1,
                max_output_length: 2,
                length_penalty: -1,
                use_base_model: true,
            }
        );

    if (wAIfu.state?.config.behaviour.try_prevent_freakouts.value === true) {
        response.text = preventFreakout(response.text);
    }

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

    IO.quietPrint(
        `Answering to:\n${message.sender}: ${message.content}\n${
            character.char_name
        }: ${response.text.trim()}`
    );
    wAIfu.dependencies!.ui?.send("MESSAGE_CHAR", {
        text: response.text.trim(),
    });

    const read_every_messages =
        wAIfu.state?.config.text_to_speech.read_every_messages_out_loud
            .value === true;
    const read_chat =
        wAIfu.state?.config.text_to_speech.read_chat_out_loud.value === true;

    const time_tts_gen = new Date().getTime();
    if (
        (read_every_messages && is_monologue === false) ||
        (message.trusted === false && read_chat)
    ) {
        // I'm gonna be honest, the amount of arguments this function takes is sickening
        await generateAndPlaySpeechWithNarrator({
            deps: wAIfu.dependencies!,
            char: character,
            input_msg: message,
            output_msg: response.text,
            dbg_time: time_tts_gen,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    } else {
        await generateAndPlaySpeech({
            deps: wAIfu.dependencies!,
            char: character,
            output_msg: response.text,
            dbg_time: time_tts_gen,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    }

    wAIfu.dependencies!.tts.skip = false;
    IO.setClosedCaptions("", "");

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
    deps: Dependencies;
    char: Character;
    output_msg: string;
    dbg_time: number;
    emotion: string;
    emotion_promise: Promise<Result<string, LLM_GEN_ERRORS>>;
}) {
    let result = await args.deps.tts.generateSpeech(args.output_msg.trim(), {
        voice: args.char.voice,
    });

    if (result.success === false) {
        IO.warn(
            "ERROR: TTS encountered this error:",
            result.error,
            result.value
        );
        return;
    }

    if (wAIfu.dependencies!.tts.skip === false) {
        IO.setClosedCaptions(
            args.output_msg.trim(),
            result.value,
            false,
            false
        );
        handleInferredEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(result.value, {
            device: getDeviceIndex(
                wAIfu.state!.config.devices.tts_output_device.value
            ),
            volume_modifier:
                wAIfu.state!.config.text_to_speech.volume_modifier_db.value,
        });
        wAIfu.dependencies!.vts.animateIdle();
    }
}

async function generateAndPlaySpeechWithNarrator(args: {
    deps: Dependencies;
    char: Character;
    input_msg: Message;
    output_msg: string;
    dbg_time: number;
    emotion: string;
    emotion_promise: Promise<Result<string, LLM_GEN_ERRORS>>;
}) {
    // Generate both narrator's and character's TTS at the same time
    let batch_tts_results = await Promise.allSettled([
        args.deps.tts.generateSpeech(args.input_msg.content.trim(), {
            voice: wAIfu.state!.config.text_to_speech.use_narrator_to_read_chat
                .value
                ? wAIfu.state!.config.text_to_speech.narrator_voice.value
                : args.char.voice,
        }),
        args.deps.tts.generateSpeech(args.output_msg.trim(), {
            voice: args.char.voice,
        }),
    ]);

    let narrator_tts_result: Result<string, TTS_GEN_ERROR>;
    if (batch_tts_results[0].status === "fulfilled")
        narrator_tts_result = batch_tts_results[0].value;
    else return;

    if (narrator_tts_result.success === false) {
        IO.warn(
            "ERROR: TTS encountered this error:",
            narrator_tts_result.error,
            narrator_tts_result.value
        );
        return;
    }

    if (wAIfu.dependencies!.tts.skip === false) {
        IO.setClosedCaptions(
            args.input_msg.sender + ": " + args.input_msg.content.trim(),
            narrator_tts_result.value,
            false,
            true
        );
        await args.deps.tts.playSpeech(narrator_tts_result.value, {
            device: getDeviceIndex(
                wAIfu.state!.config.devices.narrator_tts_output_device.value
            ),
            volume_modifier:
                wAIfu.state!.config.text_to_speech.volume_modifier_db.value,
        });
    }

    let character_tts_result: Result<string, TTS_GEN_ERROR>;
    if (batch_tts_results[1].status === "fulfilled")
        character_tts_result = batch_tts_results[1].value;
    else return;

    if (character_tts_result.success === false) {
        IO.warn(
            "ERROR: TTS encountered this error:",
            character_tts_result.error,
            character_tts_result.value
        );
        return;
    }

    if (wAIfu.dependencies!.tts.skip === false) {
        IO.setClosedCaptions(
            args.output_msg.trim(),
            character_tts_result.value,
            false,
            false
        );
        handleInferredEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(character_tts_result.value, {
            device: getDeviceIndex(
                wAIfu.state!.config.devices.tts_output_device.value
            ),
            volume_modifier:
                wAIfu.state!.config.text_to_speech.volume_modifier_db.value,
        });
        wAIfu.dependencies!.vts.animateIdle();
    }
}
