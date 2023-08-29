import * as fs from 'fs';
import * as cproc from 'child_process'

import { Plugin, PluginFile } from "./plugin";
import { IO } from '../io/io';
import { isOfClassDeep } from '../types/Helper';

export function loadPlugins(): Plugin[] {

    const PLUGINS_PATH = process.cwd() + '/plugins/';

    let plugins: Plugin[] = [];

    let folders = fs.readdirSync(PLUGINS_PATH);
    iterate_plugin: for (let plugin_folder of folders) {
        if (plugin_folder.includes('.') === true) continue;

        let files = fs.readdirSync(PLUGINS_PATH + plugin_folder);
        
        if(files.find(v => v === 'plugin.json') === undefined) {
            IO.warn('ERROR: Plugin in folder', plugin_folder, 'does not define the file plugin.json');
            continue;
        }

        let raw_plugin_obj = JSON.parse(fs.readFileSync(PLUGINS_PATH + plugin_folder + '/plugin.json', { encoding: 'utf8' }));
        if (isOfClassDeep(raw_plugin_obj, new PluginFile(), { print: true, obj_name: 'plugin.json' }) === false) {
            IO.warn('ERROR: plugin.json did not pass the sanity test.');
            continue;
        }
        let plugin_def: PluginFile = raw_plugin_obj as PluginFile;
        IO.print('Loading plugin:', plugin_def.name);

        if(files.find(v => v === 'index.js') === undefined) {
            IO.warn('ERROR: Plugin', plugin_def.name, 'does not define the file index.js');
            continue;
        }

        let plugin: Plugin = new Plugin();
        plugin.definition = plugin_def;

        iterate_deps: for(let [key, val] of Object.entries(plugin.definition['npm-dependencies'])) {
            try {
                // Check for error on initialization
                // @ts-ignore
                let dependency = require(key);
                dependency = undefined;
            } catch {
                let package_name = key.replaceAll(/[^a-zA-Z0-9\-\_\@\\\/\.\:]/g, '');
                let package_version = String(val).replaceAll(/[^a-zA-Z0-9\-\_\@\\\/\.\:\^\~]/g, '');
                let command = `npm install ${package_name}@${package_version} --save-dev`;
                if (command.length > 128) {
                    IO.error('CRITICAL: Prevented plugin', plugin_def.name, ' in folder', PLUGINS_PATH + plugin_folder, 'from executing command due to its abnormal length.');
                    continue iterate_plugin;
                }
                IO.print('Installing plugin', plugin_def.name, 'dependency', package_name);
                cproc.execSync(command, { cwd: process.cwd() });
            }
        }

        plugin.code = require(PLUGINS_PATH + plugin_folder + '/index');
        plugin.onLoad();

        plugins.push(plugin);
    }
    return plugins;
}