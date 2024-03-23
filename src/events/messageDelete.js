import { getClient } from "../LevertClient.js";

export default {
    name: "messageDelete",
    listener: async msg => {
        if (!getClient().shouldProcess(msg)) {
            return;
        }

        await getClient().executeAllHandlers("delete", msg);
    }
};
