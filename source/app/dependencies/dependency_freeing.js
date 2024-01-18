"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freeDependencies = void 0;
async function freeDependencies(dependencies) {
    await Promise.allSettled([
        dependencies.input_system.free(),
        dependencies.live_chat.free(),
        dependencies.llm.free(),
        dependencies.tts.free(),
        dependencies.vts.free(),
        dependencies.ltm.free(),
    ]);
}
exports.freeDependencies = freeDependencies;
