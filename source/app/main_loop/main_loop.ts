import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";

import { Character } from "../characters/character";
import { Message } from "../types/Message";
import { Result } from "../types/Result";
import { Dependencies } from "../dependencies/dependencies";

import { setClosedCaptions } from "../closed_captions/closed_captions";
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

/**
 * Main loop of the program.
 * Responsible for the coordination of events in the program.
 * @param dependencies Bundle of dependencies used within the main loop
 */
export async function mainLoop_impl(): Promise<void> {

    for (let plugin of wAIfu.plugins)
        plugin.onMainLoopStart();

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
                trusted: true 
            }, 
            error: REJECT_REASON.NONE
        };
    } else {
        input_result = await wAIfu.dependencies!.input_system.awaitInput();
    }

    // Handle dep reload
    if (wAIfu.dependencies!.needs_reload === true) {
       wAIfu.dependencies = await reloadDependencies(wAIfu.dependencies!, wAIfu.state!.config);
       wAIfu.plugins = reloadPlugins(wAIfu.plugins);
    }

    // Handle pausing
    while (wAIfu.state!.config._.paused.value === true)
        await new Promise<void>(resolve => { setTimeout(resolve, 250) });

    // Error handling of input system
    if (input_result.success === false) {
        switch(input_result.error) {
            case REJECT_REASON.TIMEOUT: {
                let live_chat_result = wAIfu.dependencies!.live_chat.nextMessage();
                if (live_chat_result.success === false) break;
                input_result.success = true;
                input_result.value = live_chat_result.value;
            } break;
            case REJECT_REASON.INTERRUPT: {
                return;
            }
            default:
                break;
        }
    };

    if (input_result.value.trusted === false) {
        input_result.value.content = removeNovelAIspecialSymbols(input_result.value.content);
        let input_filtered = checkForBadWords(input_result.value.content);
        if (input_filtered !== null) return;
        if (isSpamMessage(input_result.value.content)) return;
    }

    const character: Character = wAIfu.state!.characters[wAIfu.state!.config._.character_name.value] as Character;

    // Monologue
    let is_monologue = (input_result.success === true) ? false : shouldMonologue();
    if (input_result.success === false && is_monologue === false) return;

    if (is_monologue === true) {
        input_result.value.trusted = true;
        input_result.value.content = '';
    }

    const message: Message = input_result.value;

    for (let plugin of wAIfu.plugins) 
        plugin.onCommandHandling(message.content, message.trusted);

    // Handling of commands
    const handle_status = await handleCommand(message.content, message.trusted);
    if (handle_status === HANDLE_STATUS.HANDLED) return;

    if (is_monologue === true) {
        IO.print(`${character.char_name} starts to monologue.`);
    } else {
        wAIfu.dependencies!.ui?.send(
            (message.trusted === true) ? 'MESSAGE_USER' : 'MESSAGE_CHAT',
            {text: message.content, sender: message.sender});
    }

    const user_prompt = (is_monologue === true) 
                        ? ''
                        : `${message.sender}: ${message.content}\n`;

    // Construct prompt using memories + context + input
    const prompt = wAIfu.state!.memory.getMemories(
                   (wAIfu.state!.config._.context.value === "")
                   ? null : wAIfu.state!.config._.context.value, user_prompt)
                   + character.char_name + ':';

    const gen_start_time = new Date().getTime();

    let response = await generateResponse(prompt);

    for (let plugin of wAIfu.plugins) {
        let val = plugin.onResponseHandling(response.text);
        if (val === undefined) continue;
        response.text = val;
    }

    let infered_emotion = '';

    // TODO: in UI emotion list
    let infer_promise: Promise<Result<string, LLM_GEN_ERRORS>> = wAIfu.dependencies!.llm.generate(
        `{ Emotions: [${ wAIfu.state!.config.vts.emotions.value.map(v => {return v.emotion_name}).join(',') 
        }] }\n${character.char_name}:\"${response.text.trim()}\"\n{ What emotion is ${character.char_name} feeling ? (1 word) }\nEmotion:`, {
            temperature: 0.6,
            repetition_penalty: 2.8,
            max_output_length: 2,
            length_penalty: 0
        }
    );

    if (wAIfu.state?.config.behaviour.try_prevent_freakouts.value === true) {
        response.text = preventFreakout(response.text);
    }

    if (response.filtered === false) {
        wAIfu.state!.memory.addMemory((is_monologue === true)
            ? `${character.char_name}:${response.text}`
            : `${user_prompt}${character.char_name}:${response.text}`);
    }
    
    
    
    IO.quietPrint(`Answering to:\n${message.sender}: ${message.content}\n${character.char_name}: ${response.text.trim()}`);
    wAIfu.dependencies!.ui?.send('MESSAGE_CHAR', {text: response.text.trim() });

    if (message.trusted === false)
        await generateAndPlaySpeechWithNarrator({
            deps: wAIfu.dependencies!,
            char: character,
            input_msg: message,
            output_msg: response.text,
            dbg_time: gen_start_time,
            emotion: infered_emotion,
            emotion_promise: infer_promise
        });
    else
        await generateAndPlaySpeech({
            deps: wAIfu.dependencies!,
            char: character,
            output_msg: response.text,
            dbg_time: gen_start_time,
            emotion: infered_emotion,
            emotion_promise: infer_promise
        });
    
    wAIfu.dependencies!.tts.skip = false;
    setClosedCaptions('');

    for (let plugin of wAIfu.plugins)
        plugin.onMainLoopEnd();

    return;
}



function handleInferedEmotion(promise: Promise<Result<string, LLM_GEN_ERRORS>>, buffer: string) {
    promise.then(result => {
        if (result.success === false) return;
        buffer = result.value.trim().replaceAll(/[^a-zA-Z]/g, '');
        IO.debug('Infered emotion: ' + buffer);
        wAIfu.dependencies!.vts.reset()
        .then(() => {
            wAIfu.dependencies!.vts.setAnimationSequences(buffer);
            wAIfu.dependencies!.vts.animateTalking();
        });
    });
}

async function generateAndPlaySpeech(args: {
                                        deps: Dependencies,
                                        char: Character,
                                        output_msg: string,
                                        dbg_time: number,
                                        emotion: string,
                                        emotion_promise: Promise<Result<string,LLM_GEN_ERRORS>>
                                    })
{
    let result = await args.deps.tts.generateSpeech(args.output_msg.trim(), {
        voice: args.char.voice
    });

    if (result.success === false) {
        IO.warn('ERROR: TTS encountered this error:', result.error, result.value);
        return;
    }

    IO.debug('Generation took:', (new Date().getTime() - args.dbg_time) / 1_000, 's');

    if (wAIfu.dependencies!.tts.skip === false) {
        setClosedCaptions(args.output_msg.trim());
        handleInferedEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(result.value, {
            device: getDeviceIndex(wAIfu.state!.config.devices.tts_output_device.value),
            volume_modifier: wAIfu.state!.config.tts.volume_modifier_db.value
        });
        wAIfu.dependencies!.vts.animateIdle();
    }
}

async function generateAndPlaySpeechWithNarrator(args: {
                                                    deps: Dependencies,
                                                    char: Character,
                                                    input_msg: Message,
                                                    output_msg: string,
                                                    dbg_time: number,
                                                    emotion: string,
                                                    emotion_promise: Promise<Result<string,LLM_GEN_ERRORS>>
                                                })
{
    // Generate both narrator's and character's TTS at the same time
    let batch_tts_results = await Promise.allSettled([
        args.deps.tts.generateSpeech(args.input_msg.content.trim(), {
            voice: (wAIfu.state!.config.tts.use_narrator_to_read_chat.value)
                   ? wAIfu.state!.config.tts.narrator_voice.value
                   : args.char.voice
        }),
        args.deps.tts.generateSpeech(args.output_msg.trim(), {
            voice: args.char.voice
        })
    ]);

    IO.debug('Generation took:', (new Date().getTime() - args.dbg_time) / 1_000, 's');

    let narrator_tts_result: Result<string,TTS_GEN_ERROR>;
    if (batch_tts_results[0].status === "fulfilled")
        narrator_tts_result = batch_tts_results[0].value;
    else
        return;

    if (narrator_tts_result.success === false) {
        IO.warn('ERROR: TTS encountered this error:', narrator_tts_result.error, narrator_tts_result.value);
        return;
    }

    if (wAIfu.dependencies!.tts.skip === false) {
        setClosedCaptions(args.input_msg.content.trim());
        await args.deps.tts.playSpeech(narrator_tts_result.value, {
            device: getDeviceIndex(wAIfu.state!.config.devices.narrator_tts_output_device.value),
            volume_modifier: wAIfu.state!.config.tts.volume_modifier_db.value
        });
    }

    let character_tts_result: Result<string,TTS_GEN_ERROR>;
    if (batch_tts_results[1].status === "fulfilled")
        character_tts_result = batch_tts_results[1].value;
    else
        return;

    if (character_tts_result.success === false) {
        IO.warn('ERROR: TTS encountered this error:', character_tts_result.error, character_tts_result.value);
        return;
    }

    if (wAIfu.dependencies!.tts.skip === false) {
        setClosedCaptions(args.output_msg.trim());
        handleInferedEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(character_tts_result.value, {
            device: getDeviceIndex(wAIfu.state!.config.devices.tts_output_device.value),
            volume_modifier: wAIfu.state!.config.tts.volume_modifier_db.value
        });
        wAIfu.dependencies!.vts.animateIdle();
    }
}