"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainLoop_impl = void 0;
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const command_handler_1 = require("../commands/command_handler");
const reload_dependencies_1 = require("../dependencies/reload_dependencies");
const devices_1 = require("../devices/devices");
const should_monologue_1 = require("../monologue/should_monologue");
const check_for_bad_words_1 = require("../moderation/check_for_bad_words");
const reload_plugins_1 = require("../plugins/reload_plugins");
const check_for_spam_1 = require("../moderation/check_for_spam");
const prevent_freakout_1 = require("../anti_freakout/prevent_freakout");
const input_interface_1 = require("../input/input_interface");
const generate_response_1 = require("../gen_response/generate_response");
const sanitize_1 = require("../sanitize/sanitize");
const characters_1 = require("../characters/characters");
const chatter_status_1 = require("../chatter_info/chatter_status");
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
    if (plugin_input !== undefined) {
        input_result = {
            success: true,
            value: {
                content: plugin_input,
                sender: Waifu_1.wAIfu.state.config._.user_name.value,
                trusted: true,
            },
            error: input_interface_1.REJECT_REASON.NONE,
        };
    }
    else {
        input_result = await Waifu_1.wAIfu.dependencies.input_system.awaitInput();
    }
    if (Waifu_1.wAIfu.dependencies.needs_reload === true) {
        Waifu_1.wAIfu.dependencies = await (0, reload_dependencies_1.reloadDependencies)(Waifu_1.wAIfu.dependencies, Waifu_1.wAIfu.state.config);
        Waifu_1.wAIfu.plugins = (0, reload_plugins_1.reloadPlugins)(Waifu_1.wAIfu.plugins);
    }
    while (Waifu_1.wAIfu.state.config._.paused.value === true)
        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
    Waifu_1.wAIfu.dependencies.tts.skip = false;
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
            case input_interface_1.REJECT_REASON.INTERRUPT: {
                return;
            }
            default:
                break;
        }
    }
    if (input_result.value.content !== undefined)
        input_result.value.content = (0, sanitize_1.removeNovelAIspecialSymbols)(input_result.value.content);
    if (input_result.value.trusted === false) {
        let input_filtered = (0, check_for_bad_words_1.checkForBadWords)(input_result.value.content);
        if (input_filtered !== null)
            return;
        if ((0, check_for_spam_1.isSpamMessage)(input_result.value.content))
            return;
    }
    const character = (0, characters_1.getCurrentCharacter)();
    let is_monologue = input_result.success === true ? false : (0, should_monologue_1.shouldMonologue)();
    if (input_result.success === false && is_monologue === false)
        return;
    if (is_monologue === true) {
        input_result.value.trusted = true;
        input_result.value.content = "";
    }
    const message = input_result.value;
    for (let plugin of Waifu_1.wAIfu.plugins) {
        let handle_result = plugin.onCommandHandling(message.content, message.trusted, message.sender);
        if (handle_result === true)
            return;
    }
    const handle_status = await (0, command_handler_1.handleCommand)(message.content, message.trusted);
    if (handle_status === command_handler_1.HANDLE_STATUS.HANDLED)
        return;
    if (message.content === "")
        is_monologue = true;
    if (is_monologue === true) {
        io_1.IO.print(`${character.char_name} starts to monologue.`);
    }
    else {
        Waifu_1.wAIfu.dependencies.ui?.send(message.trusted === true ? "MESSAGE_USER" : "MESSAGE_CHAT", { text: message.content, sender: message.sender });
    }
    const user_prompt = is_monologue === true ? "" : `${message.sender}: ${message.content}\n`;
    const chatter_info = message.trusted
        ? ""
        : chatter_status_1.ChatterInfos.getChatterStatusString(message.sender);
    if (message.trusted === false &&
        chatter_status_1.ChatterInfos.isJustReturningChatter(message.sender)) {
        chatter_status_1.ChatterInfos.addChatter(message.sender);
    }
    const context = Waifu_1.wAIfu.state.config._.context.value + chatter_info;
    const prompt = Waifu_1.wAIfu.state.memory.getMemories(context === "" ? null : context, user_prompt) +
        character.char_name +
        ":";
    io_1.IO.quietPrint(prompt);
    let response = await (0, generate_response_1.generateResponse)(prompt);
    for (let plugin of Waifu_1.wAIfu.plugins) {
        let val = plugin.onResponseHandling(response.text);
        if (val === undefined)
            continue;
        response.text = val;
    }
    let infered_emotion = "";
    let infer_promise = Waifu_1.wAIfu.dependencies.llm.generate(`{ Emotions: [${Waifu_1.wAIfu
        .state.config.vts.emotions.value.map((v) => {
        return v.emotion_name;
    })
        .join(",")}] }\n${character.char_name}:\"${response.text.trim()}\"\n{ What emotion is ${character.char_name} feeling ? (1 word) }\nEmotion:`, {
        temperature: 1,
        repetition_penalty: 1,
        max_output_length: 2,
        length_penalty: -1,
        use_base_model: true,
    });
    if (Waifu_1.wAIfu.state?.config.behaviour.try_prevent_freakouts.value === true) {
        response.text = (0, prevent_freakout_1.preventFreakout)(response.text);
    }
    if (response.filtered === false) {
        let new_memory = is_monologue === true
            ? `${character.char_name}:${response.text}`
            : `${user_prompt}${character.char_name}:${response.text}`;
        new_memory = (0, sanitize_1.removeNovelAIspecialSymbols)(new_memory);
        Waifu_1.wAIfu.state.memory.addMemory(new_memory);
    }
    io_1.IO.quietPrint(`Answering to:\n${message.sender}: ${message.content}\n${character.char_name}: ${response.text.trim()}`);
    Waifu_1.wAIfu.dependencies.ui?.send("MESSAGE_CHAR", {
        text: response.text.trim(),
    });
    const read_every_messages = Waifu_1.wAIfu.state?.config.text_to_speech.read_every_messages_out_loud
        .value === true;
    const read_chat = Waifu_1.wAIfu.state?.config.text_to_speech.read_chat_out_loud.value === true;
    const time_tts_gen = new Date().getTime();
    if ((read_every_messages && is_monologue === false) ||
        (message.trusted === false && read_chat)) {
        await generateAndPlaySpeechWithNarrator({
            deps: Waifu_1.wAIfu.dependencies,
            char: character,
            input_msg: message,
            output_msg: response.text,
            dbg_time: time_tts_gen,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    }
    else {
        await generateAndPlaySpeech({
            deps: Waifu_1.wAIfu.dependencies,
            char: character,
            output_msg: response.text,
            dbg_time: time_tts_gen,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    }
    Waifu_1.wAIfu.dependencies.tts.skip = false;
    io_1.IO.setClosedCaptions("", "");
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onMainLoopEnd();
    return;
}
exports.mainLoop_impl = mainLoop_impl;
function handleInferredEmotion(promise, buffer) {
    promise.then((result) => {
        if (result.success === false)
            return;
        buffer = result.value.trim().replaceAll(/[^a-zA-Z]/g, "");
        io_1.IO.debug("Infered emotion: " + buffer);
        Waifu_1.wAIfu.dependencies.vts.reset().then(() => {
            Waifu_1.wAIfu.dependencies.vts.setAnimationSequences(buffer);
            Waifu_1.wAIfu.dependencies.vts.animateTalking();
        });
    });
}
async function generateAndPlaySpeech(args) {
    let result = await args.deps.tts.generateSpeech(args.output_msg.trim(), {
        voice: args.char.voice,
    });
    if (result.success === false) {
        io_1.IO.warn("ERROR: TTS encountered this error:", result.error, result.value);
        return;
    }
    if (Waifu_1.wAIfu.dependencies.tts.skip === false) {
        io_1.IO.setClosedCaptions(args.output_msg.trim(), result.value, false, false);
        handleInferredEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(result.value, {
            device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
            volume_modifier: Waifu_1.wAIfu.state.config.text_to_speech.volume_modifier_db.value,
        });
        Waifu_1.wAIfu.dependencies.vts.animateIdle();
    }
}
async function generateAndPlaySpeechWithNarrator(args) {
    let batch_tts_results = await Promise.allSettled([
        args.deps.tts.generateSpeech(args.input_msg.content.trim(), {
            voice: Waifu_1.wAIfu.state.config.text_to_speech.use_narrator_to_read_chat
                .value
                ? Waifu_1.wAIfu.state.config.text_to_speech.narrator_voice.value
                : args.char.voice,
        }),
        args.deps.tts.generateSpeech(args.output_msg.trim(), {
            voice: args.char.voice,
        }),
    ]);
    let narrator_tts_result;
    if (batch_tts_results[0].status === "fulfilled")
        narrator_tts_result = batch_tts_results[0].value;
    else
        return;
    if (narrator_tts_result.success === false) {
        io_1.IO.warn("ERROR: TTS encountered this error:", narrator_tts_result.error, narrator_tts_result.value);
        return;
    }
    if (Waifu_1.wAIfu.dependencies.tts.skip === false) {
        io_1.IO.setClosedCaptions(args.input_msg.sender + ": " + args.input_msg.content.trim(), narrator_tts_result.value, false, true);
        await args.deps.tts.playSpeech(narrator_tts_result.value, {
            device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.narrator_tts_output_device.value),
            volume_modifier: Waifu_1.wAIfu.state.config.text_to_speech.volume_modifier_db.value,
        });
    }
    let character_tts_result;
    if (batch_tts_results[1].status === "fulfilled")
        character_tts_result = batch_tts_results[1].value;
    else
        return;
    if (character_tts_result.success === false) {
        io_1.IO.warn("ERROR: TTS encountered this error:", character_tts_result.error, character_tts_result.value);
        return;
    }
    if (Waifu_1.wAIfu.dependencies.tts.skip === false) {
        io_1.IO.setClosedCaptions(args.output_msg.trim(), character_tts_result.value, false, false);
        handleInferredEmotion(args.emotion_promise, args.emotion);
        await args.deps.tts.playSpeech(character_tts_result.value, {
            device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
            volume_modifier: Waifu_1.wAIfu.state.config.text_to_speech.volume_modifier_db.value,
        });
        Waifu_1.wAIfu.dependencies.vts.animateIdle();
    }
}
