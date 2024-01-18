"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtsPlaySettings = exports.TtsGenerationSettings = exports.TTS_PLAY_ERROR = exports.TTS_GEN_ERROR = void 0;
var TTS_GEN_ERROR;
(function (TTS_GEN_ERROR) {
    TTS_GEN_ERROR["NONE"] = "NONE";
    TTS_GEN_ERROR["WRONG_AUTH"] = "WRONG_AUTH";
    TTS_GEN_ERROR["RESPONSE_FAILURE"] = "RESPONSE_FAILURE";
    TTS_GEN_ERROR["RESPONSE_TIMEOUT"] = "RESPONSE_TIMEOUT";
})(TTS_GEN_ERROR || (exports.TTS_GEN_ERROR = TTS_GEN_ERROR = {}));
var TTS_PLAY_ERROR;
(function (TTS_PLAY_ERROR) {
    TTS_PLAY_ERROR["NONE"] = "NONE";
})(TTS_PLAY_ERROR || (exports.TTS_PLAY_ERROR = TTS_PLAY_ERROR = {}));
class TtsGenerationSettings {
    voice = "galette";
    is_narrator = false;
}
exports.TtsGenerationSettings = TtsGenerationSettings;
class TtsPlaySettings {
    device = 6;
    volume_modifier = 10;
}
exports.TtsPlaySettings = TtsPlaySettings;
