"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadDependencies = void 0;
const io_1 = require("../io/io");
const dependency_freeing_1 = require("./dependency_freeing");
const dependency_loader_1 = require("./dependency_loader");
async function reloadDependencies(dependencies, config) {
    io_1.IO.print('Reloading dependencies...');
    let ui_ref = dependencies.ui;
    await (0, dependency_freeing_1.freeDependencies)(dependencies);
    let dep = await (0, dependency_loader_1.loadDependencies)(config);
    dep.ui = ui_ref;
    io_1.IO.print('Reloaded dependencies.');
    return dep;
}
exports.reloadDependencies = reloadDependencies;
