"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlugins = void 0;
const fs = __importStar(require("fs"));
const cproc = __importStar(require("child_process"));
const plugin_1 = require("./plugin");
const Helper_1 = require("../types/Helper");
const io_1 = require("../io/io");
function loadPlugins() {
    const PLUGINS_PATH = process.cwd() + '/userdata/plugins/';
    let plugins = [];
    let folders = fs.readdirSync(PLUGINS_PATH);
    iterate_plugin: for (let plugin_folder of folders) {
        if (plugin_folder.includes('.') === true)
            continue;
        let files = fs.readdirSync(PLUGINS_PATH + plugin_folder);
        if (files.find(v => v === 'plugin.json') === undefined) {
            io_1.IO.warn('ERROR: Plugin in folder', plugin_folder, 'does not define the file plugin.json');
            continue;
        }
        let raw_plugin_obj = JSON.parse(fs.readFileSync(PLUGINS_PATH + plugin_folder + '/plugin.json', { encoding: 'utf8' }));
        if ((0, Helper_1.isOfClassDeep)(raw_plugin_obj, new plugin_1.PluginFile(), { print: true, obj_name: 'plugin.json', add_missing_fields: false }) === false) {
            io_1.IO.warn('ERROR: plugin.json did not pass the sanity test.');
            continue;
        }
        let plugin_def = raw_plugin_obj;
        if (files.find(v => v === 'index.js') === undefined) {
            io_1.IO.warn('ERROR: Plugin', plugin_def.name, 'does not define the file index.js');
            continue;
        }
        let plugin = new plugin_1.Plugin();
        plugin.definition = plugin_def;
        if (plugin.definition.activated === false)
            continue iterate_plugin;
        io_1.IO.print('Loading plugin:', plugin_def.name);
        iterate_deps: for (let [key, val] of Object.entries(plugin.definition['npm-dependencies'])) {
            try {
                let dependency = require(key);
                dependency = undefined;
            }
            catch {
                let package_name = key.replaceAll(/[^a-zA-Z0-9\-\_\@\\\/\.\:]/g, '');
                let package_version = String(val).replaceAll(/[^a-zA-Z0-9\-\_\@\\\/\.\:\^\~]/g, '');
                let command = `npm install ${package_name}@${package_version} --save-dev`;
                if (command.length > 128) {
                    io_1.IO.error('CRITICAL: Prevented plugin', plugin_def.name, 'in folder', PLUGINS_PATH + plugin_folder, 'from executing command due to its abnormal length.');
                    continue iterate_plugin;
                }
                io_1.IO.print('Installing plugin', plugin_def.name, 'dependency', package_name);
                cproc.execSync(command, { cwd: process.cwd() });
            }
        }
        plugin.code = require(PLUGINS_PATH + plugin_folder + '/index');
        plugin.onLoad();
        plugins.push(plugin);
    }
    return plugins;
}
exports.loadPlugins = loadPlugins;
