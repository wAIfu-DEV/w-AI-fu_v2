"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainLoop_impl = void 0;
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const Message_1 = require("../types/Message");
const chatter_status_1 = require("../chatter_info/chatter_status");
const command_handler_1 = require("../commands/command_handler");
const reload_dependencies_1 = require("../dependencies/reload_dependencies");
const devices_1 = require("../devices/devices");
const should_monologue_1 = require("../monologue/should_monologue");
const check_for_bad_words_1 = require("../moderation/check_for_bad_words");
const reload_plugins_1 = require("../plugins/reload_plugins");
const check_for_spam_1 = require("../moderation/check_for_spam");
const prevent_freakout_1 = require("../anti_freakout/prevent_freakout");
const generate_response_1 = require("../gen_response/generate_response");
const sanitize_1 = require("../sanitize/sanitize");
const characters_1 = require("../characters/characters");
const generate_tts_1 = require("../gen_tts/generate_tts");
const input_interface_1 = require("../input/input_interface");
const format_ltm_1 = require("../memory/format_ltm");
const stream_captions_1 = require("../closed_captions/stream_captions");
const ws_1 = require("ws");
let start_time = 0;
let llm_start_time = 0;
let tts_start_time = 0;
async function mainLoop_impl() {
    const cfg = Waifu_1.wAIfu.state.config;
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onMainLoopStart();
    let plugin_input = undefined;
    for (let plugin of Waifu_1.wAIfu.plugins) {
        plugin_input = plugin.onInputSource();
        if (plugin_input !== undefined)
            break;
    }
    let input_result = {
        success: true,
        value: new Message_1.Message(),
        error: input_interface_1.REJECT_REASON.NONE,
    };
    if (plugin_input === undefined) {
        input_result = await Waifu_1.wAIfu.dependencies.input_system.awaitInput();
    }
    else {
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
    if (Waifu_1.wAIfu.dependencies.needs_reload === true) {
        Waifu_1.wAIfu.dependencies = await (0, reload_dependencies_1.reloadDependencies)(Waifu_1.wAIfu.dependencies);
        Waifu_1.wAIfu.plugins = (0, reload_plugins_1.reloadPlugins)(Waifu_1.wAIfu.plugins);
    }
    while (Waifu_1.wAIfu.state.config._.paused.value === true) {
        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
    }
    Waifu_1.wAIfu.dependencies.tts.skip = false;
    let is_monologue = cfg.behaviour.monologue.value === false ? false : (0, should_monologue_1.shouldMonologue)();
    input_failure: if (input_result.success === false) {
        if (cfg.behaviour.force_monologue.value === true && is_monologue) {
            input_result.success = false;
            break input_failure;
        }
        switch (input_result.error) {
            case input_interface_1.REJECT_REASON.TIMEOUT:
                {
                    let { value, success } = Waifu_1.wAIfu.dependencies.live_chat.nextMessage();
                    input_result.value = value;
                    input_result.success = success;
                }
                break;
            case input_interface_1.REJECT_REASON.INTERRUPT:
                return;
            default:
                break;
        }
    }
    is_monologue = input_result.success ? false : is_monologue;
    if (input_result.success === false && is_monologue === false)
        return;
    if (is_monologue === true) {
        input_result.value.trusted = true;
        input_result.value.content = "";
    }
    if (input_result.value.trusted === false) {
        input_result.value.content = (0, sanitize_1.removeNovelAIspecialSymbols)(input_result.value.content);
        const input_filtered = (0, check_for_bad_words_1.checkForBadWords)(input_result.value.content);
        if (input_filtered !== null)
            return;
        const should_filter_spam = cfg.moderation.filter_spam_messages.value;
        if (should_filter_spam && (0, check_for_spam_1.isSpamMessage)(input_result.value.content))
            return;
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
    if (is_monologue === false) {
        Waifu_1.wAIfu.dependencies.ui?.send(message.trusted === true ? "MESSAGE_USER" : "MESSAGE_CHAT", { text: message.content, sender: message.sender });
    }
    let context_arr = [];
    if (cfg._.context.value !== "")
        context_arr.push(`Context: ${cfg._.context.value}`);
    let chatter_string = chatter_status_1.ChatterInfos.getChatterStatusString(message.sender);
    if (chatter_string !== "" && message.sender !== undefined)
        context_arr.push(`User: ${chatter_string}`);
    if (chatter_status_1.ChatterInfos.isJustReturningChatter(message.sender)) {
        chatter_status_1.ChatterInfos.addChatter(message.sender);
    }
    const character = (0, characters_1.getCurrentCharacter)();
    if (is_monologue) {
        io_1.IO.print(`${character.char_name} starts to monologue.`);
        let topics = cfg.behaviour.templated_monologue_topics.value;
        if (topics.length !== 0) {
            let rand = Math.random() * (topics.length - 1);
            context_arr.push(`Action: ${topics[Math.round(rand)].replaceAll("<CHARA>", character.char_name)}`);
        }
    }
    const context = context_arr.join("\n");
    const user_prompt = is_monologue
        ? ""
        : `${message.sender}: ${message.content}\n`;
    let long_term_memories = [];
    if (cfg.memory.retrieve_memories_from_vectordb.value === true) {
        const items_amount = cfg.memory.vectordb_retrieval_amount.value;
        let query_result = await Waifu_1.wAIfu.dependencies.ltm.query(Waifu_1.wAIfu.state?.memory.getLastShortTermMemory() + " " + user_prompt, items_amount);
        long_term_memories = query_result
            .sort((a, b) => a.timestamp > b.timestamp ? 1 : -1)
            .map((v) => (0, format_ltm_1.formatStampedMemory)(v));
    }
    const prompt = Waifu_1.wAIfu.state.memory.getMemories(context === "" ? null : context, user_prompt, long_term_memories);
    io_1.IO.quietPrint(prompt);
    io_1.IO.print("Start Took(ms):", new Date().getTime() - start_time);
    llm_start_time = new Date().getTime();
    if (Waifu_1.wAIfu.dependencies.tts.skip)
        return;
    let response = await (0, generate_response_1.generateResponse)(prompt, character.char_name);
    if (Waifu_1.wAIfu.dependencies.tts.skip)
        return;
    io_1.IO.print("LLM Took(ms):", new Date().getTime() - llm_start_time);
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
        .join(",")}] }\n${character.char_name}:\"${response.text.trim()}\"\n{ What emotion is ${character.char_name} feeling? (1 word) }`, {
        character_name: "Emotion",
        temperature: 0.5,
        repetition_penalty: 0.5,
        max_output_length: 4,
        length_penalty: -1,
        use_base_model: true,
    });
    if (cfg.behaviour.try_prevent_freakouts.value === true) {
        response.text = (0, prevent_freakout_1.preventFreakout)(response.text);
    }
    io_1.IO.quietPrint(`Answering to:\n${message.sender}: ${message.content}\n${character.char_name}: ${response.text.trim()}`);
    Waifu_1.wAIfu.dependencies.ui?.send("MESSAGE_CHAR", {
        text: response.text.trim(),
    });
    if (Waifu_1.wAIfu.dependencies.tts.skip)
        return;
    const read_every_messages = cfg.text_to_speech.read_every_messages_out_loud.value === true;
    const read_chat = cfg.text_to_speech.read_chat_out_loud.value === true;
    tts_start_time = new Date().getTime();
    if ((read_every_messages && is_monologue === false) ||
        (message.trusted === false && read_chat)) {
        await generateAndPlaySpeechWithNarrator({
            input_msg: message,
            output_msg: response.text,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    }
    else {
        await generateAndPlaySpeech({
            output_msg: response.text,
            emotion: infered_emotion,
            emotion_promise: infer_promise,
        });
    }
    if (Waifu_1.wAIfu.dependencies.tts.skip)
        return;
    Waifu_1.wAIfu.dependencies.tts.skip = false;
    if (stream_captions_1.ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN)
        stream_captions_1.ClosedCaptionsWS.send("CLEAR");
    io_1.IO.setClosedCaptions("");
    Waifu_1.wAIfu.dependencies.input_system.input_text = "";
    if (response.filtered === false) {
        let new_memory = is_monologue === true
            ? `${character.char_name}:${response.text}`
            : `${user_prompt}${character.char_name}:${response.text}`;
        new_memory = (0, sanitize_1.removeNovelAIspecialSymbols)(new_memory);
        Waifu_1.wAIfu.state.memory.addMemory(new_memory);
    }
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
    const cfg = Waifu_1.wAIfu.state.config;
    let sentences = args.output_msg
        .trim()
        .replaceAll("¤", "")
        .replaceAll(/[\.\!\?]+/g, "$&¤")
        .split("¤")
        .map((s) => s.trim())
        .filter((v) => v !== "");
    handleInferredEmotion(args.emotion_promise, args.emotion);
    let idx = 0;
    await (0, generate_tts_1.generateTtsOverlapped)(sentences, {
        voice: (0, characters_1.getCurrentCharacter)().voice,
        is_narrator: false,
    }, async (id) => {
        if (Waifu_1.wAIfu.dependencies.tts.skip)
            return;
        if (idx === 0) {
            io_1.IO.print("TTS Took(ms):", new Date().getTime() - tts_start_time);
            io_1.IO.print("Took(ms):", new Date().getTime() - start_time);
        }
        io_1.IO.setClosedCaptions(sentences[idx], {
            id: id,
            persistent: idx === sentences.length - 1 ? false : true,
            is_narrator: false,
        });
        await Waifu_1.wAIfu.dependencies.tts.playSpeech(id, {
            device: (0, devices_1.getDeviceIndex)(cfg.devices.tts_output_device.value),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
        idx++;
    });
    Waifu_1.wAIfu.dependencies.vts.animateIdle();
}
async function generateAndPlaySpeechWithNarrator(args) {
    const cfg = Waifu_1.wAIfu.state.config;
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
    Waifu_1.wAIfu.dependencies?.vts.animateListening();
    await (0, generate_tts_1.generateTtsOverlapped)(usr_sentences, {
        voice: cfg.text_to_speech.use_narrator_to_read_chat.value
            ? narrator_voice
            : (0, characters_1.getCurrentCharacter)().voice,
        is_narrator: true,
    }, async (id) => {
        if (Waifu_1.wAIfu.dependencies.tts.skip)
            return;
        let sub_text = "";
        if (idx === 0) {
            io_1.IO.print("TTS Took(ms):", new Date().getTime() - tts_start_time);
            sub_text += args.input_msg.sender + ": ";
        }
        sub_text += usr_sentences[idx];
        io_1.IO.setClosedCaptions(sub_text, {
            id: id,
            persistent: idx === usr_sentences.length - 1 ? false : true,
            is_narrator: true,
        });
        await Waifu_1.wAIfu.dependencies.tts.playSpeech(id, {
            device: (0, devices_1.getDeviceIndex)(cfg.devices.narrator_tts_output_device.value),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
        idx++;
    });
    if (Waifu_1.wAIfu.dependencies.tts.skip)
        return;
    idx = 0;
    await (0, generate_tts_1.generateTtsOverlapped)(char_sentences, {
        voice: (0, characters_1.getCurrentCharacter)().voice,
        is_narrator: false,
    }, async (id) => {
        if (Waifu_1.wAIfu.dependencies.tts.skip)
            return;
        if (idx === 0) {
            if (stream_captions_1.ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN)
                stream_captions_1.ClosedCaptionsWS.send("CLEAR");
            io_1.IO.setClosedCaptions("");
            handleInferredEmotion(args.emotion_promise, args.emotion);
        }
        io_1.IO.setClosedCaptions(char_sentences[idx], {
            id: id,
            persistent: idx === char_sentences.length - 1 ? false : true,
            is_narrator: false,
        });
        await Waifu_1.wAIfu.dependencies.tts.playSpeech(id, {
            device: (0, devices_1.getDeviceIndex)(cfg.devices.tts_output_device.value),
            volume_modifier: cfg.text_to_speech.volume_modifier_db.value,
        });
        idx++;
    });
    Waifu_1.wAIfu.dependencies.vts.animateIdle();
}
