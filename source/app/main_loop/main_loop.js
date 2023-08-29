"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainLoop_impl = void 0;
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const closed_captions_1 = require("../closed_captions/closed_captions");
const command_handler_1 = require("../commands/command_handler");
const reload_dependencies_1 = require("../dependencies/reload_dependencies");
const devices_1 = require("../devices/devices");
const should_monologue_1 = require("../monologue/should_monologue");
const input_interface_1 = require("../input/input_interface");
const commands_1 = require("../commands/commands");
const check_for_bad_words_1 = require("../moderation/check_for_bad_words");
const reload_plugins_1 = require("../plugins/reload_plugins");
async function mainLoop_impl() {
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onMainLoopStart();
    let plugin_input = undefined;
    for (let plugin of Waifu_1.wAIfu.plugins) {
        let val = plugin.onInputSource();
        if (val === undefined)
            continue;
        plugin_input = val;
    }
    let input_result;
    if (plugin_input !== undefined)
        input_result = {
            success: true,
            value: {
                content: plugin_input,
                sender: Waifu_1.wAIfu.state.config._.user_name.value,
                trusted: true
            },
            error: input_interface_1.REJECT_REASON.NONE
        };
    else
        input_result = await Waifu_1.wAIfu.dependencies.input_system.awaitInput();
    if (Waifu_1.wAIfu.dependencies.needs_reload === true) {
        Waifu_1.wAIfu.dependencies = await (0, reload_dependencies_1.reloadDependencies)(Waifu_1.wAIfu.dependencies, Waifu_1.wAIfu.state.config);
        Waifu_1.wAIfu.plugins = (0, reload_plugins_1.reloadPlugins)(Waifu_1.wAIfu.plugins);
    }
    while (Waifu_1.wAIfu.state.config._.paused.value === true)
        await new Promise(resolve => { setTimeout(resolve, 250); });
    if (input_result.success === false) {
        switch (input_result.error) {
            case input_interface_1.REJECT_REASON.TIMEOUT:
                {
                    let live_chat_result = Waifu_1.wAIfu.dependencies.live_chat.nextMessage();
                    if (live_chat_result.success === false)
                        break;
                    input_result.success = true;
                    input_result.value = live_chat_result.value;
                }
                break;
            case input_interface_1.REJECT_REASON.INTERRUPT:
                {
                    return;
                }
                break;
            default:
                break;
        }
    }
    ;
    if (input_result.value.trusted === false) {
        let input_filtered = (0, check_for_bad_words_1.checkForBadWords)(input_result.value.content);
        if (input_filtered !== null)
            return;
    }
    const character = Waifu_1.wAIfu.state.characters[Waifu_1.wAIfu.state.config._.character_name.value];
    let is_monologue = (input_result.success === true) ? false : (0, should_monologue_1.shouldMonologue)();
    if (input_result.success === false && is_monologue === false)
        return;
    if (is_monologue === true) {
        input_result.value.trusted = true;
        input_result.value.content = '';
    }
    const message = input_result.value;
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onCommandHandling(message.content, message.trusted);
    const handle_status = await (0, command_handler_1.handleCommand)(message.content, message.trusted);
    if (handle_status === commands_1.HANDLE_STATUS.HANDLED)
        return;
    if (is_monologue === true) {
        io_1.IO.print(`${character.char_name} starts to monologue.`);
    }
    else {
        Waifu_1.wAIfu.dependencies.ui?.send((message.trusted === true) ? 'MESSAGE_USER' : 'MESSAGE_CHAT', { text: message.content, sender: message.sender });
    }
    const user_prompt = (is_monologue === true)
        ? ''
        : `${message.sender}: ${message.content}\n`;
    const prompt = Waifu_1.wAIfu.state.memory.getMemories(Waifu_1.wAIfu.state.config._.context.value, user_prompt)
        + character.char_name + ':';
    const gen_start_time = new Date().getTime();
    const llm_cfg = Waifu_1.wAIfu.state.config.llm;
    const llm_response = await Waifu_1.wAIfu.dependencies.llm.generate(prompt, {
        temperature: llm_cfg.temperature.value,
        repetition_penalty: llm_cfg.repetition_penalty.value,
        max_output_length: llm_cfg.max_output_length.value,
        length_penalty: llm_cfg.length_penalty.value
    });
    if (llm_response.success === false) {
        io_1.IO.warn('ERROR: LLM encountered this error:', llm_response.error, llm_response.value);
        return;
    }
    for (let plugin of Waifu_1.wAIfu.plugins) {
        let val = plugin.onResponseHandling(llm_response.value);
        if (val === undefined)
            continue;
        llm_response.value = val;
    }
    let infered_emotion = '';
    let infer_promise = Waifu_1.wAIfu.dependencies.llm.generate(`{Emotions: [${Waifu_1.wAIfu.state.config.vts.emotions.value.map(v => { return v.emotion_name; }).join(',')}]}\n${character.char_name}:\"${llm_response.value.trim()}\"\n{What emotion is ${character.char_name} feeling ? (1 word)}\nEmotion:`, {
        temperature: 0.6,
        repetition_penalty: 2.8,
        max_output_length: 2,
        length_penalty: 0
    });
    let filtered_content = (0, check_for_bad_words_1.checkForBadWords)(llm_response.value);
    if (filtered_content !== null)
        llm_response.value = "Filtered.";
    else
        Waifu_1.wAIfu.state.memory.addMemory((is_monologue === true)
            ? `${Waifu_1.wAIfu.state.config._.character_name.value}:${llm_response.value}`
            : `${user_prompt}${Waifu_1.wAIfu.state.config._.character_name.value}:${llm_response.value}`);
    io_1.IO.quietPrint(`Answering to:\n${message.sender}: ${message.content}\n${Waifu_1.wAIfu.state.config._.character_name.value}: ${llm_response.value.trim()}`);
    Waifu_1.wAIfu.dependencies.ui?.send('MESSAGE_CHAR', { text: llm_response.value.trim() });
    if (message.trusted === false)
        await generateAndPlaySpeechWithNarrator({
            deps: Waifu_1.wAIfu.dependencies,
            char: character,
            input_msg: message,
            output_msg: llm_response.value,
            dbg_time: gen_start_time,
            emotion: infered_emotion,
            emotion_promise: infer_promise
        });
    else
        await generateAndPlaySpeech({
            deps: Waifu_1.wAIfu.dependencies,
            char: character,
            output_msg: llm_response.value,
            dbg_time: gen_start_time,
            emotion: infered_emotion,
            emotion_promise: infer_promise
        });
    Waifu_1.wAIfu.dependencies.tts.skip = false;
    (0, closed_captions_1.setClosedCaptions)('');
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onMainLoopEnd();
    return;
}
exports.mainLoop_impl = mainLoop_impl;
function handleInferedEmotion(promise, buffer) {
    promise.then(result => {
        if (result.success === false)
            return;
        buffer = result.value.trim().replace(/[^a-zA-Z]/g, '');
        io_1.IO.debug('Infered emotion: ' + buffer);
        Waifu_1.wAIfu.dependencies.vts?.reset()
            .then(() => {
            Waifu_1.wAIfu.dependencies.vts?.setAnimationSequences(buffer);
            Waifu_1.wAIfu.dependencies.vts?.animateTalking();
        });
    });
}
async function generateAndPlaySpeech(args) {
    let result = await args.deps.tts.generateSpeech(args.output_msg.trim(), {
        voice: args.char.voice
    });
    if (result.success === false) {
        io_1.IO.warn('ERROR: TTS encountered this error:', result.error, result.value);
        return;
    }
    io_1.IO.debug('Generation took:', (new Date().getTime() - args.dbg_time) / 1_000, 's');
    if (Waifu_1.wAIfu.dependencies.tts.skip === false) {
        (0, closed_captions_1.setClosedCaptions)(args.output_msg.trim());
        handleInferedEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(result.value, {
            device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
            volume_modifier: Waifu_1.wAIfu.state.config.tts.volume_modifier_db.value
        });
        Waifu_1.wAIfu.dependencies.vts?.animateIdle();
    }
}
async function generateAndPlaySpeechWithNarrator(args) {
    let batch_tts_results = await Promise.allSettled([
        args.deps.tts.generateSpeech(args.input_msg.content.trim(), {
            voice: (Waifu_1.wAIfu.state.config.tts.use_narrator_to_read_chat.value)
                ? Waifu_1.wAIfu.state.config.tts.narrator_voice.value
                : args.char.voice
        }),
        args.deps.tts.generateSpeech(args.output_msg.trim(), {
            voice: args.char.voice
        })
    ]);
    io_1.IO.debug('Generation took:', (new Date().getTime() - args.dbg_time) / 1_000, 's');
    let narrator_tts_result;
    if (batch_tts_results[0].status === "fulfilled")
        narrator_tts_result = batch_tts_results[0].value;
    else
        return;
    if (narrator_tts_result.success === false) {
        io_1.IO.warn('ERROR: TTS encountered this error:', narrator_tts_result.error, narrator_tts_result.value);
        return;
    }
    if (Waifu_1.wAIfu.dependencies.tts.skip === false) {
        (0, closed_captions_1.setClosedCaptions)(args.input_msg.content.trim());
        await args.deps.tts.playSpeech(narrator_tts_result.value, {
            device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.narrator_tts_output_device.value),
            volume_modifier: Waifu_1.wAIfu.state.config.tts.volume_modifier_db.value
        });
    }
    let character_tts_result;
    if (batch_tts_results[1].status === "fulfilled")
        character_tts_result = batch_tts_results[1].value;
    else
        return;
    if (character_tts_result.success === false) {
        io_1.IO.warn('ERROR: TTS encountered this error:', character_tts_result.error, character_tts_result.value);
        return;
    }
    if (Waifu_1.wAIfu.dependencies.tts.skip === false) {
        (0, closed_captions_1.setClosedCaptions)(args.output_msg.trim());
        handleInferedEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(character_tts_result.value, {
            device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
            volume_modifier: Waifu_1.wAIfu.state.config.tts.volume_modifier_db.value
        });
        Waifu_1.wAIfu.dependencies.vts?.animateIdle();
    }
}
