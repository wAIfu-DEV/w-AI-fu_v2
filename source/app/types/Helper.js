"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMissingFields = exports.addMissingFields_ERRORS = exports.isOfClassDeep = exports.isOfClass = void 0;
const io_1 = require("../io/io");
const Result_1 = require("./Result");
function isOfClass(x, y, options = { print: false, obj_name: "x" }) {
    if (x === undefined || x === null) {
        if (x === y)
            return true;
        if (options.print === true)
            io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    if (typeof x !== "object") {
        if (typeof x === typeof y)
            return true;
        if (options.print === true)
            io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    for (let key of Object.keys(y)) {
        if (key in x === false) {
            if (options.print === true)
                io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
            return false;
        }
    }
    return true;
}
exports.isOfClass = isOfClass;
function isOfClassDeep(x, y, options = { print: false, obj_name: "x" }) {
    if (x === undefined || x === null) {
        if (x === y)
            return true;
        if (options.print === true)
            io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    if (typeof x !== "object") {
        if (typeof x === typeof y)
            return true;
        if (options.print === true)
            io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    for (let key of Object.keys(y)) {
        if (key in x === false) {
            if (options.print === true)
                io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
            return false;
        }
        if (isOfClassDeep(x[key], y[key], { print: options.print, obj_name: options.obj_name + '.' + key }) === false) {
            if (options.print === true)
                io_1.IO.warn('WARNING:', options.obj_name, 'failed the type check.');
            return false;
        }
    }
    return true;
}
exports.isOfClassDeep = isOfClassDeep;
var addMissingFields_ERRORS;
(function (addMissingFields_ERRORS) {
    addMissingFields_ERRORS["NONE"] = "NONE";
    addMissingFields_ERRORS["NOT_AN_OBJECT"] = "NOT_AN_OBJECT";
})(addMissingFields_ERRORS || (exports.addMissingFields_ERRORS = addMissingFields_ERRORS = {}));
function addMissingFields(x, y) {
    if (x === undefined || x === null) {
        return new Result_1.Result(false, y, addMissingFields_ERRORS.NOT_AN_OBJECT);
    }
    if (typeof x !== "object") {
        return new Result_1.Result(false, y, addMissingFields_ERRORS.NOT_AN_OBJECT);
    }
    for (let key of Object.keys(y)) {
        if (key in x === false)
            x[key] = y[key];
    }
    return new Result_1.Result(true, x, addMissingFields_ERRORS.NONE);
}
exports.addMissingFields = addMissingFields;
