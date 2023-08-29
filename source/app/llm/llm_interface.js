"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmGenerationSettings = exports.LLM_GEN_ERRORS = void 0;
var LLM_GEN_ERRORS;
(function (LLM_GEN_ERRORS) {
    LLM_GEN_ERRORS["NONE"] = "NONE";
    LLM_GEN_ERRORS["WRONG_AUTH"] = "WRONG_AUTH";
    LLM_GEN_ERRORS["UNDEFINED"] = "UNDEFINED";
    LLM_GEN_ERRORS["INCORRECT_PROMPT"] = "INCORRECT_PROMPT";
    LLM_GEN_ERRORS["RESPONSE_FAILURE"] = "RESPONSE_FAILURE";
})(LLM_GEN_ERRORS || (exports.LLM_GEN_ERRORS = LLM_GEN_ERRORS = {}));
class LlmGenerationSettings {
    temperature = 1;
    repetition_penalty = 2;
    max_output_length = 80;
    length_penalty = -0.25;
}
exports.LlmGenerationSettings = LlmGenerationSettings;
