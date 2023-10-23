import * as readline from "readline";

import { InputSystem, REJECT_REASON } from "./input_interface";
import { wAIfu } from "../types/Waifu";
import { Result } from "../types/Result";
import { Message } from "../types/Message";
import { IO } from "../io/io";

export class InputSystemText implements InputSystem {
    #cli_input_interface: readline.Interface;
    #interrupt_next: boolean;

    constructor() {
        this.#cli_input_interface = readline.createInterface(
            process.stdin,
            process.stdout
        );
        this.#interrupt_next = false;
    }

    async initialize(): Promise<void> {
        this.#cli_input_interface.removeAllListeners();
        this.#cli_input_interface.on("line", (input) => {
            wAIfu.state!.command_queue.pushBack(input);
        });
        IO.debug("Loaded InputSystemText.");
        return;
    }

    async free(): Promise<void> {
        this.#cli_input_interface.removeAllListeners();
        this.#cli_input_interface.close();
    }

    interrupt(): void {
        this.#interrupt_next = true;
    }

    async awaitInput(): Promise<Result<Message, REJECT_REASON>> {
        return new Promise<Result<Message, REJECT_REASON>>((resolve) => {
            let resolved = false;

            setTimeout(() => {
                if (resolved === true) return;
                resolved = true;
                resolve(
                    new Result(false, new Message(), REJECT_REASON.TIMEOUT)
                );
                return;
            }, wAIfu.state!.config.live_chat.read_chat_after_x_seconds.value * 1000);

            const check_queue = () => {
                if (this.#interrupt_next === true) {
                    this.#interrupt_next = false;
                    resolve(
                        new Result(
                            false,
                            new Message(),
                            REJECT_REASON.INTERRUPT
                        )
                    );
                    return;
                }
                if (resolved === true) return;
                if (wAIfu.state!.command_queue.notEmpty()) {
                    let message: Message = {
                        sender: wAIfu.state!.config._.user_name.value,
                        content: wAIfu.state!.command_queue.consume(),
                        trusted: true,
                    };
                    resolve(new Result(true, message, REJECT_REASON.NONE));
                    return;
                }
                setTimeout(check_queue, 100);
            };
            check_queue();
        });
    }
}
