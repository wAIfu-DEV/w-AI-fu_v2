import * as cproc from 'child_process';

import { Result } from "../types/Result";
import { LLM_GEN_ERRORS, LargeLanguageModel, LlmGenerationSettings } from "./llm_interface";
import { wAIfu } from '../types/Waifu';
import { IO } from '../io/io';

export class LargeLanguageModelCharacterAI implements LargeLanguageModel {
    #child_process: cproc.ChildProcess;

    constructor() {
        this.#child_process = cproc.spawn('python', [ 'characterai_llm.py' ], { 
            cwd: process.cwd() + '/source/app/characterai_api/',
            env: {
                CAI_TOKEN: wAIfu.state!.auth["characterai"]["token"],
                CHARACTER: JSON.stringify(wAIfu.state!.characters[wAIfu.state!.config._.character_name.value])
            },
            detached: false, shell: false
        });
        this.#child_process.stderr?.on('data', (data) => {
            IO.warn(data.toString());
        });
        this.#child_process.stdout?.on('data', (data) => {
            IO.print(data.toString());
        });
    }
    
    async initialize(): Promise<void> {
        
    }

    async free(): Promise<void> {
        
    }

    // @ts-ignore
    async generate(prompt: string, settings: LlmGenerationSettings): Promise<Result<string, LLM_GEN_ERRORS>> {
        return new Result(false, '', LLM_GEN_ERRORS.UNDEFINED);
    }
}