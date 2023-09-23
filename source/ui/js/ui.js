"use strict";

class State {
    static config = undefined;
    static auth = undefined;
    static characters = undefined;
    static devices = undefined;
    static presets = undefined;
}

class BackEndSocket {

    /** @type {WebSocket} */
    #websocket = new WebSocket('ws://127.0.0.1:8459');

    /**
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve) => {
            this.#websocket.onopen = () => {
                this.#websocket.onerror = (ev) => {
                    console.log('ERROR:', ev);
                };
        
                this.#websocket.onmessage = (ev) => {
                    this.#handleMessage(ev.data.toString('utf8'));
                };
        
                this.#websocket.onclose = () => {
                    window.name = "Error";
                    alert('Lost connection to w-AI-fu.');
                }
                resolve();
                return;
            }
        });
    }

    /**
     * handles incoming messages from backend
     * @param {string} data 
     */
    #handleMessage(data) {
        /** @type {string[]} */
        let split_data = data.split(' ');
        let prefix = split_data[0];

        if (prefix === undefined) {
            console.warn('ERROR: Received undefined message.');
            return;
        }

        let payload_unparsed = split_data.slice(1, undefined).join(' ');
        let payload = undefined
        if (split_data.length > 1) {
            payload = JSON.parse(payload_unparsed);
        }

        console.log('RECEIVED:', prefix);
        console.log(payload);

        messageHandler(prefix, payload);
    }

    /**
     * send message to the backend
     * @param {string} prefix
     * @param {any} payload
     */
    send(prefix, payload) {
        if (this.#websocket.readyState === WebSocket.OPEN)
            this.#websocket.send(prefix + " " + JSON.stringify(payload));
        else
            console.warn('ERROR: Tried sending message to backend, but websocket is not open.');
    }
}

/** @type {BackEndSocket} */
let BackEnd = new BackEndSocket();

class Terminal {
    /** @param {string} text  */
    static addConsoleMessage(text, color = "lightgrey") {
        let terminal = document.getElementById('console-terminal');
        let new_entry = document.createElement('div');
        new_entry.classList.add('terminal-message');
        new_entry.textContent = text;
        new_entry.style.color = color;
        new_entry.style.whiteSpace = "pre-line";
        new_entry.style.wordBreak = "break-word";
        terminal?.appendChild(new_entry);
        terminal?.scrollTo({ top: terminal.scrollHeight });
    }

    /**
     * @param {string} text
     * */
    static addOutputMessage(text) {
        let terminal = document.getElementById('console-terminal');
        let entry = document.createElement('div');
        entry.classList.add('terminal-entry');
        let new_entry = document.createElement('div');
        new_entry.classList.add('terminal-bubble', 'bubble-in');
        new_entry.textContent = text;
        new_entry.style.whiteSpace = "pre-line";
        new_entry.style.wordBreak = "break-word";
        entry.appendChild(new_entry);
        terminal?.appendChild(entry);
        terminal?.scrollTo({ top: terminal.scrollHeight });
    }

    /**
     * @param {string} text
     * */
    static addInputMessage(text) {
        let terminal = document.getElementById('console-terminal');
        let entry = document.createElement('div');
        entry.classList.add('terminal-entry');
        let new_entry = document.createElement('div');
        new_entry.classList.add('terminal-bubble', 'bubble-out');
        new_entry.textContent = text;
        new_entry.style.whiteSpace = "pre-line";
        new_entry.style.wordBreak = "break-word";
        entry.appendChild(new_entry);
        terminal?.appendChild(entry);
        terminal?.scrollTo({ top: terminal.scrollHeight });
    }

    /**
     * @param {string} text
     * @param {string} sender 
     * */
    static addChatMessage(text, sender) {
        let terminal = document.getElementById('console-terminal');
        let chat_name = document.createElement('div');
        chat_name.classList.add('chat-name');
        chat_name.textContent = sender;
        let entry = document.createElement('div');
        entry.classList.add('terminal-entry');
        let new_entry = document.createElement('div');
        new_entry.classList.add('terminal-bubble', 'bubble-chat');
        new_entry.textContent = text;
        new_entry.style.whiteSpace = "pre-line";
        new_entry.style.wordBreak = "break-word";
        entry.appendChild(chat_name);
        entry.appendChild(new_entry);
        terminal?.appendChild(entry);
        terminal?.scrollTo({ top: terminal.scrollHeight });
    }
}

async function main() {
    initializeTemplates();
    intializeNavBar();
    await BackEnd.initialize();
    initializeParamSaveButton();
    initializeCharaSaveButton();
    initializeAuthSaveButton();
    initializeInputSendButton();
    initializeContextInputBox();
    initializeUserNameInputBox();
    initializeInterruptButton();
    initializeResetButton();
    initializeNewPresetButton();
}
main();

function sendInput() {
    let input_box = document.getElementById('console-inputbox');
    let content = input_box?.textContent;
    if (content === undefined || content === null) {
        console.warn('input box content was undefined.');
        return;
    }
    if (content === "") return;
    if (input_box !== null)
        input_box.textContent = '';
    BackEnd.send('MESSAGE', { text: content });
}

/**
 * @param {any} devices  
 */
function initializeDeviceSelects(devices) {
    let params = document.getElementById('parameters');
    if (params === null) return;
    for (let page of Array.from(params.children)) {
        if (page.getAttribute('linkedparams') !== "devices") continue;

        for (let entry of Array.from(page.children)) {

            let entry_select = entry.children[1];

            while (entry_select?.firstElementChild !== null)
                entry_select?.removeChild(entry_select?.firstElementChild);
        
            entry_select.setAttribute('options',Object.keys(devices).join(','));
            entry_select.removeAttribute('initialized');
            initializeTemplates();
        }
    }
}

function initializeNewPresetButton() {
    let add_btn = document.getElementById('new-preset-button');
    if (add_btn === null) return;
    add_btn.onclick = () => {
        let preset_name = "";
        let name_input = document.getElementById('new-preset-name-input');
        if (name_input?.firstElementChild === null || name_input?.firstElementChild === undefined) return;
        if ("value" in name_input?.firstElementChild && typeof name_input?.firstElementChild.value === "string") {
            preset_name = name_input?.firstElementChild.value;
        };
        BackEnd.send('NEW_PRESET', { name: preset_name });
    }
}

function initializePauseButton() {
    if (State.config === undefined) return;
    let pause_button = document.getElementById('control-pause');
    if (pause_button === null) return;
    if (State.config["_"]["paused"]["value"] === true) {
        if (pause_button.classList.contains('important') === false)
            pause_button.classList.add('important');
    } else {
        if (pause_button.classList.contains('important') === true)
            pause_button.classList.remove('important');
    }
    pause_button.onclick = () => {
        if (State.config === undefined) return;
        if (pause_button === null) return;
        // @ts-ignore
        State.config["_"]["paused"]["value"] = !pause_button?.classList.contains('important');
        if (State.config["_"]["paused"]["value"] === true) {
            if (pause_button.classList.contains('important') === false)
                pause_button.classList.add('important');
        } else {
            if (pause_button.classList.contains('important') === true)
                pause_button.classList.remove('important');
        }
        BackEnd.send('CONFIG', State.config);
        if (State.config["_"]["paused"]["value"] === true)
            BackEnd.send('INTERRUPT', {});
    };
}

function initializeSpecialCaseFields() {
    if (State.config === undefined) return;
    let context_box = document.getElementById('console-context');
    if (context_box === null) return;
    context_box.textContent = State.config["_"]["context"]["value"];
    let username_box = document.getElementById('username-box');
    if (username_box === null) return;
    username_box.textContent = State.config["_"]["user_name"]["value"];
    initializePauseButton();
}

function initializeUserNameInputBox() {
    let username_box = document.getElementById('username-box');
    if (username_box !== null) {
        // VERY ROUDABOUT WAY TO IMPLEMENT A 'ONCHANGE' FOR CONTENTEDITABLE
        /** @type {any} */
        let last_box_content = undefined;
        username_box.onfocus = () => {
            last_box_content = username_box?.textContent;
        };
        username_box.onblur = () => {
            if (State.config === undefined) return;
            let new_val = username_box?.textContent;
            if (new_val === undefined || new_val === null) return;

            if (new_val === last_box_content) return;

            // @ts-ignore
            State.config["_"]["user_name"]["value"] = new_val;
            BackEnd.send('CONFIG', State.config);
        };
    }
}

function initializeInterruptButton() {
    let button = document.getElementById("control-interrupt");
    if (button === null) return;
    button.onclick = () => {
        BackEnd.send('INTERRUPT', {});
    };
}

function initializeResetButton() {
    let button = document.getElementById("control-reset");
    if (button === null) return;
    button.onclick = () => {
        BackEnd.send('RESET', {});
    };
}

function initializeContextInputBox() {
    let context_box = document.getElementById('console-context');
    if (context_box !== null) {
        // VERY ROUDABOUT WAY TO IMPLEMENT A 'ONCHANGE' FOR CONTENTEDITABLE
        /** @type {any} */
        let last_box_content = undefined;
        context_box.onfocus = () => {
            last_box_content = context_box?.textContent;
        };
        context_box.onblur = () => {
            if (State.config === undefined) return;
            let new_val = context_box?.textContent;
            if (new_val === undefined || new_val === null) return;

            if (new_val === last_box_content) return;

            // @ts-ignore
            State.config["_"]["context"]["value"] = new_val;
            BackEnd.send('CONFIG', State.config);
        };
    }
}

function initializeInputSendButton() {
    let send_button = document.getElementById('console-inputbox-send');
    if (send_button !== null)
    send_button.onclick = sendInput;
    let input_box = document.getElementById('console-inputbox');
    if (input_box !== null)
        input_box.onkeydown = (ke) => {
            if (ke.code !== 'Enter') return;
            ke.preventDefault();
            sendInput();
        };
}

function initializeParamSaveButton() {
    let save_button = document.getElementById('parameters-save-button');
    if (save_button !== null)
    save_button.onclick = () => {
        generateConfig(State.config);
        console.log(State.config);
        BackEnd.send('CONFIG', State.config);
    };
}

function initializeCharaSaveButton() {
    let save_button = document.getElementById('characters-save-button');
    if (save_button !== null)
    save_button.onclick = () => {
        BackEnd.send('CHARACTER', saveCharacter());
    };
}

function initializeAuthSaveButton() {
    let save_button = document.getElementById('accounts-save-button');
    if (save_button !== null)
    save_button.onclick = () => {
        generateAuth();
        BackEnd.send('AUTH', State.auth);
    };
}

function initializeTemplates() {
    /** @type {HTMLElement[]} */ // @ts-ignore
    const template_tags = Array.from(document.getElementsByTagName('template'));

    for (let template of template_tags) {
        /** @type {HTMLTemplateElement} */ // @ts-ignore
        const template_as_ele = template;
        const template_name = template.id;
        /** @type {HTMLElement[]} */ // @ts-ignore
        const templated_elements = Array.from(document.getElementsByTagName(template_name));
        for (let element of templated_elements) {
            if (element.hasAttribute('initialized')) continue;
            element.setAttribute('initialized', 'true');
            while (element?.firstElementChild !== null)
                element?.removeChild(element?.firstElementChild);
            let clone = template_as_ele.content.cloneNode(true);
            element.appendChild(clone);
            recursiveForceLoad(element);
        }
    }
}

/**
 * @param {HTMLElement} element
 */
function recursiveForceLoad(element) {
    element.dispatchEvent(new Event('load'));
    for (let child of [...element.children]) {
        
        /** @type {HTMLElement} */ // @ts-ignore
        let as_elem = child;

        if (as_elem.hasAttribute('initialized') === false)
            // @ts-ignore
            recursiveForceLoad(child);
    }
}


function intializeNavBar() {
    /** @type {HTMLElement[]} */ // @ts-ignore
    const pages = Array.from(document.getElementsByClassName('page'));

    const nav_bar = document.getElementById('nav-bar');
    if (nav_bar !== null)
    for(let ele of [...nav_bar.children]) {
        const page_tag = ele.getAttribute('linkedpage');
        if (page_tag !== null) {
            /** @type {HTMLElement} */ // @ts-ignore
            let as_html = ele;
            as_html.onclick = () => {
                if (page_tag === "page-accounts") {
                    /*if (window.confirm('You are about to enter the account section of w-AI-fu, it contains sensitive informations and should NOT be displayed on stream.') === false) {
                        return;
                    }*/
                }
                for (let page of pages)
                    page.style.display = (page.id !== page_tag) ? 'none' : '';
                for(let ele of [...nav_bar.children])
                    ele.classList.remove('important');
                as_html.classList.add('important');
                if (page_tag === "page-parameters") {
                    document.getElementById('first-param-button')?.click();
                }
            };
        }
    };
}

function initializeParamNavBar() {
    /** @type {HTMLElement[]} */ // @ts-ignore
    const param_pages = Array.from(document.getElementsByClassName('param-section'));
    /** @type {HTMLElement} */ // @ts-ignores
    const params = document.getElementById('parameters');
    const param_navbar = document.getElementById('parameters-header');
    if (param_navbar !== null)
    for (let child of [...param_navbar.children]) {
        const linked_params = child.getAttribute('linkedparams');
        if (linked_params === null) return;
        /** @type {HTMLElement} */ // @ts-ignore
        const child_as_html = child;
        child_as_html.onclick = () => {
            for (let page of param_pages) {
                if (page.getAttribute('linkedparams') !== linked_params) {
                    page.style.display = 'none';
                } else {
                    page.style.display = '';
                    /*let computed_style = window.getComputedStyle(params, null);
                    params.style.height = `calc(calc(${String(page.scrollHeight)}px`
                        + ` + calc(${computed_style.padding} * 2))`
                        + ` + calc(${computed_style.borderWidth} * 2))`;*/
                }
            }
            for(let ele of [...param_navbar.children])
                ele.classList.remove('important');
            child_as_html.classList.add('important');
        };     
    }
    document.getElementById('first-param-button')?.click();
}

/**
 * @param {string} prefix 
 * @param {any} payload 
 */
function messageHandler(prefix, payload) {
    switch(prefix) {
        case "PRESETS": {
            State.presets = payload;
            setupPresets(payload);
        } break;        
        case "CONFIG": {
            State.config = payload;
            setupParamsPage(payload);
            initializeParamNavBar();
            initializeSpecialCaseFields();
        } break;
        case "AUTH": {
            State.auth = payload;
            setupAccountsPage(payload);
        } break;
        case "DEVICES": {
            State.devices = payload;
            initializeDeviceSelects(payload);
        } break;
        case "CONSOLE_MESSAGE": {
            Terminal.addConsoleMessage(payload["text"], payload["color"]);
        } break;
        case "CONSOLE_DEBUG": {
            if (State.config === undefined) return;
            if (State.config["behaviour"]["additional_logs"]["value"] === true)
                Terminal.addConsoleMessage(payload["text"], payload["color"]);
        } break;
        case "CHARACTERS": {
            State.characters = payload;
            setupCharacters();
        } break;
        case "MESSAGE_CHAR": {
            Terminal.addOutputMessage(payload["text"]);
        } break;
        case "MESSAGE_USER": {
            Terminal.addInputMessage(payload["text"]);
        } break;
        case "MESSAGE_CHAT": {
            Terminal.addChatMessage(payload["text"], payload["sender"]);
        } break;
        case "VERSION": {
            let v = document.getElementById('version-string');
            if (v === null) return;
            v.textContent = payload["version"];
        } break;
        case "UPDATE": {
            /** @type {HTMLAnchorElement} */ // @ts-ignore
            let v = document.getElementById("update-version-string");
            if (v === null) return;
            v.textContent = payload["version"];
            v.href = `https://github.com/wAIfu-DEV/w-AI-fu_v2/releases/tag/${payload["version"]}`;
            
            /** @type {HTMLDialogElement} */ // @ts-ignore
            let d = document.getElementById("dialog-update");
            if (d === null) return;
            d.showModal();
        }
    }
}

function setupCharacters() {
    if (State.config === undefined) return;
    let default_char = State.config["_"]["character_name"]["value"]

    let char_select = document.getElementById('console-character-select');
    if (char_select === null) return;
    char_select.removeAttribute('initialized');
    if (State.characters === undefined) return;
    char_select.setAttribute('options', Object.keys(State.characters).join(','));
    char_select.setAttribute('default', default_char);

    let char_select2 = document.getElementById('character-edit-select');
    if (char_select2 === null) return;
    char_select2.removeAttribute('initialized');
    char_select2.setAttribute('options', Object.keys(State.characters).join(','));
    char_select2.setAttribute('default', default_char);

    initializeTemplates();

    /** @type {HTMLSelectElement} */ // @ts-ignore
    let select_elem = char_select.firstElementChild
    select_elem.onchange = () => {
        let new_char = select_elem.value
        if (State.config === undefined) return;
        // @ts-ignore
        State.config["_"]["character_name"]["value"] = new_char;
        BackEnd.send('CONFIG', State.config);
        BackEnd.send('RESET', {});
    };

    /** @type {HTMLSelectElement} */ // @ts-ignore
    let select_elem2 = char_select2.firstElementChild
    select_elem2.onchange = () => {
        let new_char = select_elem2.value
        if (State.config === undefined) return;
        setCharacter(new_char);
    };

    setCharacter(default_char);
}

/** @param {string} char_name  */
function setCharacter(char_name) {
    if (State.characters === undefined) return;
    let character = State.characters[char_name];

    let character_name = document.getElementById("character-edit-name");
    if (character_name === null) return;
    character_name.textContent = character["char_name"];
    let character_desc = document.getElementById("character-edit-desc");
    if (character_desc === null) return;
    character_desc.textContent = character["char_persona"];
    let character_dialogue = document.getElementById("character-edit-dialogue");
    if (character_dialogue === null) return;
    character_dialogue.textContent = character["example_dialogue"];
    let character_voice = document.getElementById("character-edit-voice");
    if (character_voice === null) return;
    character_voice.textContent = character["voice"];
}

function saveCharacter() {
    /** @type { HTMLSelectElement } */ // @ts-ignore
    let char_select = document.getElementById('character-edit-select')?.firstElementChild;
    let char_file_name = char_select.value;

    /** @type {{file:string, character: any}} */
    let wrapper = {
        file: char_file_name,
        character: {}
    };

    let character_name = document.getElementById("character-edit-name");
    if (character_name === null) return;
    wrapper.character["char_name"] = character_name.innerHTML
        ?.replaceAll(/<br>/g, "\n").replaceAll(/<div>/g, "\n").replaceAll(/<\/div>/g, "").replaceAll(/&\w+;/g, "");
    let character_desc = document.getElementById("character-edit-desc");
    if (character_desc === null) return;
    wrapper.character["char_persona"] = character_desc.innerHTML
        ?.replaceAll(/<br>/g, "\n").replaceAll(/<div>/g, "\n").replaceAll(/<\/div>/g, "").replaceAll(/&\w+;/g, "");
    let character_dialogue = document.getElementById("character-edit-dialogue");
    if (character_dialogue === null) return;
    wrapper.character["example_dialogue"] = character_dialogue.innerHTML
        ?.replaceAll(/<br>/g, "\n").replaceAll(/<div>/g, "\n").replaceAll(/<\/div>/g, "").replaceAll(/&\w+;/g, "");
    let character_voice = document.getElementById("character-edit-voice");
    if (character_voice === null) return;
    wrapper.character["voice"] = character_voice.innerHTML
        ?.replaceAll(/<br>/g, "\n").replaceAll(/<div>/g, "\n").replaceAll(/<\/div>/g, "").replaceAll(/&\w+;/g, "");

    return wrapper;
}

/** @param {any} auth */
function setupAccountsPage(auth) {
    let accounts_page = document.getElementById('accounts');

    while (accounts_page?.firstElementChild !== null)
        accounts_page?.removeChild(accounts_page?.firstElementChild);

    for (let [provider, obj] of Object.entries(auth)) {
        for (let [field, value] of Object.entries(obj)) {
            let new_entry = document.createElement('span');
            let entry_p = document.createElement('p');
            entry_p.textContent = toPascalCase(`${provider} ${field}`);
            let entry_val = document.createElement('input');
            entry_val.setAttribute('type', 'password');
            entry_val.value = value;
            new_entry.appendChild(entry_p);
            new_entry.appendChild(entry_val);
            accounts_page?.appendChild(new_entry);
        }
    }
}

function generateAuth() {
    let accounts_page = document.getElementById('accounts');
    let new_auth = {};
    if (accounts_page !== null)
    for (let entry of Array.from(accounts_page?.children)) {
        /** @type {HTMLParagraphElement} */ // @ts-ignore
        let entry_p = entry.firstElementChild;
        /** @type {HTMLInputElement} */ // @ts-ignore
        let entry_input = entry.lastElementChild;

        let split_entry_name = entry_p.textContent?.split(' ');
        if (split_entry_name === undefined) return;
        let provider = split_entry_name[0];
        if (provider === undefined) return;
        provider = toSnakeCase(provider);
        let entry_name = split_entry_name?.slice(1,undefined)
                                          .join(' ');
        let entry_name_snake = toSnakeCase(entry_name);
        let entry_value = entry_input.value;

        // @ts-ignore
        if (new_auth[provider] === undefined) {
            // @ts-ignore
            new_auth[provider] = {};
        }
        // @ts-ignore
        new_auth[provider][entry_name_snake] = entry_value;
    }
    // @ts-ignore
    State.auth = new_auth;
}

/**
 * @param {any} config 
 */
function setupParamsPage(config) {
    let parameters_header = document.getElementById('parameters-header');

    while (parameters_header?.firstElementChild !== null)
        parameters_header?.removeChild(parameters_header?.firstElementChild);

    let parameters_page_wrapper = document.getElementById('parameters');

    while (parameters_page_wrapper?.firstElementChild !== null)
        parameters_page_wrapper?.removeChild(parameters_page_wrapper?.firstElementChild);

    for (let field of Object.keys(config)) {

        if (field === '_') continue;

        let header_tab = document.createElement('div');
        header_tab.classList.add('parameters-header-button', 'button');
        header_tab.setAttribute('linkedparams', field);
        header_tab.textContent = toPascalCase(field);
        parameters_header?.appendChild(header_tab);

        let params_page = document.createElement('div');
        params_page.classList.add('param-section');
        params_page.setAttribute('linkedparams', field);
        params_page.style.display = 'none';
        
        for (let [param, value] of Object.entries(config[field])) {
            let new_param = document.createElement('span');
            let param_name = document.createElement('p');
            new_param.appendChild(param_name);
            param_name.textContent = toPascalCase(param);
            switch(value["type"]) {
                case "string": {
                    let val = document.createElement('tmpl-string-input');
                    val.setAttribute('value', value["value"].toString());
                    val.setAttribute('default', value["default"].toString());
                    new_param.appendChild(val);
                } break;
                case "boolean": {
                    let val = document.createElement('tmpl-check-input');
                    val.setAttribute('checked', (value["value"] === true) ? 'true' : 'false');
                    new_param.appendChild(val);
                } break;
                case "number": {
                    let val = document.createElement('tmpl-number-input');
                    val.setAttribute('value', value["value"].toString());
                    val.setAttribute('max', value["max"].toString());
                    val.setAttribute('min', value["min"].toString());
                    val.setAttribute('default', value["default"].toString());
                    new_param.appendChild(val);
                } break;
                case "select": {
                    let val = document.createElement('tmpl-select-input');
                    val.setAttribute('options', value["options"].join(','));
                    val.setAttribute('default', value["value"]);
                    new_param.appendChild(val);
                } break;
                case "list": {
                    let val = document.createElement('tmpl-list-input');
                    val.setAttribute('list', value["value"].join(","));
                    new_param.appendChild(val);
                } break;
                case "vts_emotions_list": {
                    let val = document.createElement('tmpl-vts-emotes-list-input');
                    // @ts-ignore
                    let data = value["value"].map(v => {return JSON.stringify(v)}).join("#@51248");
                    val.setAttribute('listdata', data);
                    new_param.appendChild(val);
                } break;
                case "contextual_memory_list": {
                    let val = document.createElement('tmpl-contextual-memories-list-input');
                    // @ts-ignore
                    let data = value["value"].map(v => {return JSON.stringify(v)}).join("#@51248");
                    val.setAttribute('listdata', data);
                    new_param.appendChild(val);
                } break;
            }
            let hint_element = document.createElement('hint');
            hint_element.title = value["hint"];
            new_param.appendChild(hint_element);
            params_page.appendChild(new_param);
        }
        parameters_page_wrapper?.appendChild(params_page);
    }
    initializeTemplates();
    
    /** @type {HTMLElement} */ // @ts-ignore
    let first_button = parameters_header?.children[0];
    first_button.id = "first-param-button";

    /*
    let first_button = parameters_header?.children[0];
    if (first_button !== undefined)
    first_button.classList.add('important');
    */
    /** @type {HTMLElement|undefined} */ // @ts-ignore
    /*
    let first_page = parameters_page_wrapper?.children[0];
    if (first_page !== undefined)
    first_page.style.display = '';
    */
}

/**
 * @param {string} str 
 */
function toPascalCase(str) {
    let split_words = str.split(/ |_/g);
    let result_array = [];
    for (let word of split_words) {
        result_array.push(word[0]?.toUpperCase() + word.substring(1));
    }
    return result_array.join(' ');
}

/** @param {string} str */
function toSnakeCase(str) {
    let lower_str = str.toLocaleLowerCase();
    return lower_str.replaceAll(' ', '_');
}

/** @param {any} config  */
function generateConfig(config) {

    let parameters = document.getElementById("parameters");

    // @ts-ignore
    for (let page of Array.from(parameters?.children)) {

        let raw_page_name = page.getAttribute('linkedparams');
        if (raw_page_name === null) {
            console.error(`CRITICIAL ERROR: page name was null.`);
            continue;
        }
        let page_name = toSnakeCase(raw_page_name);

        if (config[page_name] === undefined) {
            console.error(`CRITICIAL ERROR: Could not find field "${page_name}" in config object.`);
            return;
        }

        for (let entry of Array.from(page.children)) {

            /** @type {HTMLParagraphElement} */ // @ts-ignore
            let param_name_element = entry.children[0];
            /** @type {string} */ // @ts-ignore
            let param_name = toSnakeCase(param_name_element.textContent);

            if (config[page_name][param_name] === undefined) {
                console.error(`CRITICIAL ERROR: Could not find field "${page_name}.${param_name}" in config object.`);
                return;
            }

            let param_element = entry.children[1];

            if (param_element === undefined) {
                console.warn('ERROR: parameter element was undefined');
                continue;
            }
            let param_tag = param_element.tagName.toLowerCase();

            switch(param_tag) {
                case "tmpl-string-input": {
                    /** @type {HTMLInputElement} */ // @ts-ignore
                    let input = param_element.firstElementChild;
                    let value = input.value;
                    config[page_name][param_name]["value"] = value;
                } break;
                case "tmpl-number-input": {
                    /** @type {HTMLInputElement} */ // @ts-ignore
                    let input = param_element.firstElementChild;
                    let value = Number(input.value);
                    config[page_name][param_name]["value"] = value;
                } break;
                case 'tmpl-check-input': {
                    /** @type {HTMLInputElement} */ // @ts-ignore
                    let input = param_element.firstElementChild;
                    let value = input.checked;
                    config[page_name][param_name]["value"] = value;
                } break;
                case "tmpl-select-input": {
                    /** @type {HTMLSelectElement} */ // @ts-ignore
                    let select = param_element.firstElementChild;
                    let value = select.value;
                    config[page_name][param_name]["value"] = value;
                } break;
                case "tmpl-list-input": {
                    /** @type {HTMLDivElement} */ // @ts-ignore
                    let list_wrapper = param_element.firstElementChild;
                    /** @type {HTMLDivElement} */ // @ts-ignore
                    let list = list_wrapper.firstElementChild;
                    let value = [];

                    for (let entry of Array.from(list.children)) {
                        let item = entry.firstElementChild;
                        if (item === null) {
                            console.warn('ERROR: item was null.');
                            continue;
                        }
                        value.push(item.textContent);
                    }
                    config[page_name][param_name]["value"] = value;
                } break;
                case "tmpl-vts-emotes-list-input": {
                    /** @type {HTMLElement} */ // @ts-ignore
                    let list_wrapper = param_element.firstElementChild;
                    /** @type {HTMLElement} */ // @ts-ignore
                    let list = list_wrapper.firstElementChild;
                    let value = [];

                    for (let entry of Array.from(list.children)) {
                        let obj = {
                            "emotion_name": "",
                            "talking_hotkey_sequence": [],
                            "idle_hotkey_sequence": [],
                            "reset_hotkey_sequence": []
                        };
                        
                        let name_line = entry.children[0]?.children[1];
                        let talk_seq_line = entry.children[1]?.children[1];
                        let idle_seq_line = entry.children[2]?.children[1];
                        let reset_seq_line = entry.children[3]?.children[1];

                        if (name_line === undefined) continue;
                        if (talk_seq_line === undefined) continue;
                        if (idle_seq_line === undefined) continue;
                        if (reset_seq_line === undefined) continue;

                        /** @type {HTMLInputElement} */ // @ts-ignore
                        let name_input = name_line.firstElementChild;
                        obj.emotion_name = name_input.value;

                        let talk_list = talk_seq_line.firstElementChild?.firstElementChild;
                        if (talk_list === undefined || talk_list === null) continue;
                        for (let entry of Array.from(talk_list.children)) {
                            let item = entry.firstElementChild;
                            if (item === null) {
                                console.warn('ERROR: item was null.');
                                continue;
                            }
                            // @ts-ignore
                            obj.talking_hotkey_sequence.push(item.textContent);
                        }

                        let idle_list = idle_seq_line.firstElementChild?.firstElementChild;
                        if (idle_list === undefined || idle_list === null) continue;
                        for (let entry of Array.from(idle_list.children)) {
                            let item = entry.firstElementChild;
                            if (item === null) {
                                console.warn('ERROR: item was null.');
                                continue;
                            }
                            // @ts-ignore
                            obj.idle_hotkey_sequence.push(item.textContent);
                        }

                        let reset_list = reset_seq_line.firstElementChild?.firstElementChild;
                        if (reset_list === undefined || reset_list === null) continue;
                        for (let entry of Array.from(reset_list.children)) {
                            let item = entry.firstElementChild;
                            if (item === null) {
                                console.warn('ERROR: item was null.');
                                continue;
                            }
                            // @ts-ignore
                            obj.reset_hotkey_sequence.push(item.textContent);
                        }
                        value.push(obj);
                    }
                    config[page_name][param_name]["value"] = value;
                } break;
                case "tmpl-contextual-memories-list-input": {
                    /** @type {HTMLElement} */ // @ts-ignore
                    let list_wrapper = param_element.firstElementChild;
                    /** @type {HTMLElement} */ // @ts-ignore
                    let list = list_wrapper.firstElementChild;
                    let value = [];

                    for (let entry of Array.from(list.children)) {
                        let obj = {
                            "keywords": [],
                            "content": "",
                        };

                        let keywords_line = entry.children[1]?.children[1];
                        let content_line = entry.children[2]?.children[1];

                        if (keywords_line === undefined) continue;
                        if (content_line === undefined) continue;

                        let keywords_list = keywords_line.firstElementChild?.firstElementChild;
                        if (keywords_list === undefined || keywords_list === null) continue;
                        for (let entry of Array.from(keywords_list.children)) {
                            let item = entry.firstElementChild;
                            if (item === null) {
                                console.warn('ERROR: item was null.');
                                continue;
                            }
                            // @ts-ignore
                            obj.keywords.push(item.textContent);
                        }

                        obj.content = content_line.textContent || '';
                        value.push(obj);
                    }
                    config[page_name][param_name]["value"] = value;
                } break;
            }
        }
    }

    return config;
}

/**
 * @param { {presets: string[], current: string} } payload 
 */
function setupPresets(payload) {
    let select = document.getElementById('preset-select');
    if (select === null) return;

    select.removeAttribute('initialized');
    select.setAttribute('options', payload.presets.join(','));
    select.setAttribute('default', payload.current);

    initializeTemplates();

    /** @type { HTMLSelectElement } */ // @ts-ignore
    let select_element = select.firstElementChild;
    if (select_element === null) return;

    select_element.onchange = () => {
        let new_preset = select_element.value;
        BackEnd.send('PRESET', { preset: new_preset });
    };
}