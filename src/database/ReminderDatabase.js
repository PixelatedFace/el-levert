import SqliteDatabase from "./SqlDatabase.js";

import Reminder from "../structures/Reminder.js";

class ReminderDatabase extends SqliteDatabase {
    async fetch(user) {
        const rows = await this.queries.fetch.all({
            $user: user
        });

        if (typeof rows === "undefined" || rows.length < 1) {
            return false;
        }

        return rows.map(x => new Reminder(x));
    }

    async add(reminder) {
        return await this.queries.add.run({
            $user: reminder.user,
            $end: reminder.end,
            $msg: reminder.msg
        });
    }

    async remove(reminder) {
        return await this.queries.remove.run({
            $id: reminder.id
        });
    }

    async removeAll(user) {
        return await this.queries.removeAll.run({
            $user: user
        });
    }

    async list() {
        const rows = await this.queries.list.all();
        return rows.map(x => new Reminder(x));
    }
}

export default ReminderDatabase;
