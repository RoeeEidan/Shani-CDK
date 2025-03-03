import { template } from "../config";
import { getUsers } from "../helpers/getUsers";
import { invokeSendMessage } from "../helpers/invokeSendMessage";

export async function triggerOncePerDayReminder() {
    const users = await getUsers();
    console.log(`Found ${users.length} users to send EOD messages to...`);

    for (const { name, phone, id } of users) {
        console.log(`Invoking sendMessage for ${phone}...`);
        await invokeSendMessage(phone, template.endOfDay({ name, id }));
    }

    console.log(`✅ Finished job triggerOncePerDayReminder, sent ${users.length} messages.`);
}