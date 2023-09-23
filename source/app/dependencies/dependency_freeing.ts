import { Dependencies } from "./dependencies";

export async function freeDependencies(dependencies: Dependencies): Promise<void> {
    await Promise.allSettled([
        dependencies.input_system.free(),
        dependencies.live_chat.free(),
        dependencies.llm.free(),
        dependencies.tts.free(),
        dependencies.vts.free()
    ]);
}