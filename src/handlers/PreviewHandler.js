import Handler from "./Handler.js";

import { getClient, getLogger } from "../LevertClient.js";
import Util from "../util/Util.js";

const msgUrlRegex =
    /(?:(https?):\/\/)?(?:(www|ptb)\.)?discord\.com\/channels\/(?<sv_id>\d{18,19}|@me)\/(?<ch_id>\d{18,19})(?:\/(?<msg_id>\d{18,19}))?/;

class PreviewHandler extends Handler {
    constructor() {
        super(true, true);

        this.outCharLimit = Util.clamp(getClient().config.outCharLimit, 0, 2000);
        this.outNewlineLimit = Util.clamp(getClient().config.outNewlineLimit, 0, 2000);
    }

    canPreview(str) {
        return msgUrlRegex.test(str);
    }

    async genPreview(msg, url) {
        const match = url.match(msgUrlRegex),
            { sv_id, ch_id, msg_id } = match.groups,
            inDms = sv_id === "@me";

        const prevMsg = await getClient().fetchMessage(ch_id, msg_id, msg.author.id);

        if (!prevMsg) {
            return false;
        }

        let content = prevMsg.content,
            split = content.split("\n");

        let image = "";

        if (content.length > this.outCharLimit) {
            content = content.slice(0, this.outCharLimit) + "...";
        }

        if (split.length > this.outNewlineLimit) {
            content = split.slice(0, this.outNewlineLimit).join("\n") + "...";
        }

        if (prevMsg.attachments.size > 0) {
            const attach = prevMsg.attachments.first(),
                isImage = attach.contentType.startsWith("image/");

            if (isImage) {
                image = attach.url;
            }

            if (content.length < 1) {
                if (isImage) {
                    content = Util.hyperlink(`[Image (${attach.name})]`, attach.url);
                } else {
                    content = Util.hyperlink(`[Attachment (${attach.name})]`, attach.url);
                }
            }
        }

        content += "\n\n";
        content += Util.hyperlink("[Jump to Message]", url);

        let channel;

        if (inDms) {
            channel = "DMs";
        } else if (sv_id === msg.guild?.id) {
            channel = `#${prevMsg.channel.name}`;
        } else {
            channel = `#${prevMsg.channel.name} - ${prevMsg.guild.name}`;
        }

        channel = Util.bold(channel);

        const username = Util.bold(prevMsg.author.displayName),
            timestamp = Util.time(Math.floor(prevMsg.createdTimestamp / 1000), "R");

        const preview = `From ${username} in ${channel} | ${timestamp}

${content}
${image ? "\n" + image : ""}`;

        return preview;
    }

    async execute(msg) {
        if (!this.canPreview(msg.content)) {
            return false;
        }

        let preview;

        try {
            preview = await this.genPreview(msg, msg.content);
        } catch (err) {
            const reply = await msg.reply({
                content: ":no_entry_sign: Encountered exception while generating preview:",
                ...Util.getFileAttach(err.stack, "error.js")
            });
            this.messageTracker.addMsg(reply, msg.id);

            getLogger().error("Preview gen failed", err);
            return false;
        }

        if (!preview) {
            return false;
        }

        await msg.channel.sendTyping();

        try {
            const reply = await msg.reply(preview);
            this.messageTracker.addMsg(reply, msg.id);
        } catch (err) {
            const reply = await msg.reply({
                content: ":no_entry_sign: Encountered exception while sending preview:",
                ...Util.getFileAttach(err.stack, "error.js")
            });
            this.messageTracker.addMsg(reply, msg.id);

            getLogger().error("Reply failed", err);
            return false;
        }

        return true;
    }
}

export default PreviewHandler;
