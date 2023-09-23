import * as readline from 'readline';
import * as cproc from 'child_process';

import { InputSystem, REJECT_REASON } from './input_interface';
import { wAIfu } from '../types/Waifu';
import { Result } from '../types/Result';
import { Message } from '../types/Message';
import { getDeviceIndex } from '../devices/devices';
import { IO } from '../io/io';

import WebSocket, { WebSocketServer } from 'ws';

export class InputSystemVoice implements InputSystem {
    #cli_input_interface: readline.Interface;
    #interrupt_next: boolean;

    #child_process: cproc.ChildProcess;
    #websocket_server: WebSocketServer;
    #websocket: WebSocket = new WebSocket(null);

    constructor() {
        this.#cli_input_interface = readline.createInterface(process.stdin, process.stdout);
        this.#interrupt_next = false;

        let use_ptt = (wAIfu.state!.config.behaviour.push_to_talk.value == true) ? '1' : '0';
        let device = getDeviceIndex(wAIfu.state!.config.devices.voice_input_device.value).toString();

        //this.#child_process = cproc.spawn('cmd.exe', ['/C', 'python speech.py ' + use_ptt + ' ' + device], {
        this.#child_process = cproc.spawn('python', [
            'speech.py',
            use_ptt,
            device,
            wAIfu.state!.config.providers.stt_provider.value,
            wAIfu.state!.auth.openai.token
        ], {
            cwd: `${process.cwd()}/source/app/speech_to_text/`,
            detached: false, shell: false
        });
        this.#child_process.stderr?.on('data', (data) => {
            IO.warn(data.toString());
        });
        this.#child_process.stdout?.on('data', (data) => {
            IO.print(data.toString());
        });

        this.#websocket_server = new WebSocketServer({ host: '127.0.0.1', port: 8711 });
    }

    async initialize(): Promise<void> {
        this.#cli_input_interface.removeAllListeners();
        this.#cli_input_interface.on('line', (input) => {
            wAIfu.state!.command_queue.pushBack(input);
        });
        
        return new Promise((resolve) => {
            this.#websocket_server.on('connection', (socket) => {
                this.#websocket = socket;
                this.#websocket.on('error', (err: Error) => IO.print(err));

                this.#websocket.on('message', (data: WebSocket.RawData) => {
                    wAIfu.state!.command_queue.pushFront(data.toString('utf8'));
                });

                this.#websocket.send('');

                resolve();
            });
        });
    }

    async free(): Promise<void> {
        this.#cli_input_interface.removeAllListeners();
        this.#cli_input_interface.close();

        return new Promise(resolve => {
            this.#child_process.on('close', () => {
                this.#child_process.removeAllListeners();
                this.#websocket_server.removeAllListeners();
                this.#websocket.removeAllListeners();
                this.#websocket.close();
                this.#websocket_server.close();

                let el = () => {
                    if (this.#websocket.readyState === WebSocket.CLOSED) {
                        resolve();
                        return;
                    };
                    setTimeout(el, 100);
                };
                setTimeout(el, 100);
            });
            this.#child_process.kill(2);
        });
    }

    interrupt(): void {
        this.#interrupt_next = true;
    }

    async awaitInput(): Promise<Result<Message,REJECT_REASON>> {
        return new Promise<Result<Message,REJECT_REASON>>((resolve) => {

            let resolved = false;

            setTimeout(() => {
                if (resolved === true) return;
                resolved = true;
                resolve(new Result(false,new Message(),REJECT_REASON.TIMEOUT));
                return;
            },
            wAIfu.state!.config.behaviour.read_chat_after_x_seconds.value * 1000);

            const check_queue = () => {
                if (this.#interrupt_next === true) {
                    this.#interrupt_next = false;
                    resolve(new Result(false,new Message(),REJECT_REASON.INTERRUPT));
                    return;
                };
                if (resolved === true) return;
                if (wAIfu.state!.command_queue.notEmpty()) {
                    let message: Message = {
                        "sender": wAIfu.state!.config._.user_name.value,
                        "content": wAIfu.state!.command_queue.consume(),
                        "trusted": true
                    }
                    resolve(new Result(true,message,REJECT_REASON.NONE));
                    return;
                }
                setTimeout(check_queue, 100);
            }
            check_queue();
        });
    }
}