import FuncTypes from "./FuncTypes.js";

import VMError from "../../errors/VMError.js";
import ExitError from "../../vm/isolated-vm/functionErrors/ExitError.js";

import Util from "../../util/Util.js";
import getRegisterCode from "../../util/vm/getRegisterCode.js";

function resolveObj(path, propertyMap) {
    let split = [],
        obj;

    try {
        split = path.split(".");
    } catch (err) {
        obj = undefined;
    }

    while (split.length > 0) {
        const propertyName = split[0];

        if (typeof obj === "undefined") {
            obj = propertyMap[propertyName];
        } else {
            obj = obj[propertyName];
        }

        if (typeof obj === "undefined") {
            throw new VMError("Property not found: " + propertyName);
        }

        split.shift();
    }

    return obj;
}

const defaultValues = {
    parent: "",
    type: FuncTypes.regular,
    exits: false,
    errorClass: ExitError,
    binds: []
};

class VMFunction {
    constructor(options, propertyMap) {
        if (typeof options.name === "undefined") {
            throw new VMError("VM function must have a name");
        }

        if (typeof options.ref === "undefined") {
            throw new VMError("VM function must have a reference function");
        }

        Util.setValuesWithDefaults(this, options, defaultValues);

        this.resolveReference(propertyMap);
        this.resolveBinds(propertyMap);
    }

    getRegisterCode() {
        const options = {
            objName: this.parent,
            funcName: this.name,
            type: this.type
        };

        let errorOptions;

        if (this.exits) {
            errorOptions = {
                errorClass: this.errorClass
            };
        }

        return getRegisterCode(options, errorOptions);
    }

    resolveReference(propertyMap) {
        if (typeof this.ref === "function") {
            return;
        }

        if (typeof propertyMap === "undefined") {
            throw new VMError("Cannot resolve reference function");
        }

        const path = this.ref;
        this.ref = resolveObj(path, propertyMap);

        if (typeof this.ref === "undefined") {
            throw new VMError("Cannot resolve reference function");
        }
    }

    resolveBinds(propertyMap) {
        if (typeof propertyMap === "undefined" || this.binds.length === 0) {
            return;
        }

        const argList = [];

        for (const path of this.binds) {
            const obj = resolveObj(path, propertyMap);
            argList.push(obj);
        }

        this.ref = this.ref.bind(...argList);
    }
}

export default VMFunction;
