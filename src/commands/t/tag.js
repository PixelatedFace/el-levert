import Util from "../../util/Util.js";

import { TagTypes } from "../../structures/tag/TagTypes.js";

import { getClient, getLogger } from "../../LevertClient.js";

const dummyMsg = {
    attachments: new Map()
};

async function parseBase(t_args, msg) {
    const [t_type, t_body] = Util.splitArgs(t_args);

    if (typeof msg === "undefined") {
        msg = dummyMsg;
    }

    if (typeof t_args === "undefined" || (t_args.length < 1 && msg.attachments.size === 0)) {
        return {
            err: ":warning: Tag body is empty."
        };
    }

    let body, isScript;

    if (msg.attachments.size > 0) {
        try {
            [body, isScript] = await getClient().tagManager.downloadBody(msg);
        } catch (err) {
            getLogger().error(err);

            if (err.name === "TagError") {
                return {
                    err: `:warning: ${err.message}.`
                };
            }

            return {
                err: {
                    content: ":no_entry_sign: Downloading attachment failed:",
                    ...Util.getFileAttach(err.stack, "error.js")
                }
            };
        }
    } else {
        let tagBody = t_args;

        if (TagTypes.scriptTypes.includes(t_type)) {
            tagBody = t_body;
        }

        [body, isScript] = Util.formatScript(tagBody);
    }

    let type;

    if (isScript) {
        if (TagTypes.scriptTypes.includes(t_type)) {
            type = t_type;
        } else {
            type = TagTypes.defaultScriptType;
        }
    } else {
        type = TagTypes.defaultType;
    }

    return { body, type };
}

async function getPreview(out, msg) {
    let preview;

    try {
        preview = await getClient().previewHandler.genPreview(msg, out);
    } catch (err) {
        getLogger().error("Preview gen failed", err);
    }

    if (!preview) {
        return out;
    }

    const previewMsg = {
            embeds: [preview]
        },
        cleanedOut = getClient().previewHandler.removeLink(out);

    if (cleanedOut.length > 0) {
        previewMsg.content = cleanedOut;
    }

    return previewMsg;
}

export default {
    name: "tag",
    aliases: ["t"],
    subcommands: ["add", "alias", "chown", "delete", "dump", "edit", "list", "owner", "quota", "raw", "search"],
    load: function () {
        this.parseBase = parseBase.bind(this);
    },
    handler: async function (args, msg) {
        if (args.length === 0) {
            return `:information_source: %t [${this.getSubcmdList()}] tag_name [tag_body]`;
        }

        const [t_name, t_args] = Util.splitArgs(args);

        const e = getClient().tagManager.checkName(t_name);
        if (e) {
            return ":warning: " + e;
        }

        let tag = await getClient().tagManager.fetch(t_name);

        if (!tag) {
            let find = await getClient().tagManager.search(t_name, 5),
                out = `:warning: Tag **${t_name}** doesn't exist.`;

            if (find.length > 0) {
                out += `\nDid you mean: **${find.join("**, **")}**?`;
            }

            return out;
        }

        if (tag.isAlias) {
            try {
                tag = await getClient().tagManager.fetchAlias(tag);
            } catch (err) {
                if (err.name === "TagError") {
                    switch (err.message) {
                        case "Tag recursion detected":
                            return `:warning: Ebic recursion fail: **${err.ref.join("** -> **")}**`;
                        case "Hop not found":
                            return `:warning: Tag **${err.ref}** doesn't exist.`;
                    }
                }

                throw err;
            }
        }

        let out;

        switch (tag.getType()) {
            case "text":
                out = tag.body;
                break;
            case "ivm":
                out = await getClient().tagVM.runScript(tag.body, msg, t_args + tag.args);
                break;
            case "vm2":
                out = await getClient().tagVM2.runScript(tag.body, msg, t_args + tag.args);
                break;
        }

        if (getClient().previewHandler.canPreview(out)) {
            return getPreview(out, msg);
        }

        return out;
    }
};
