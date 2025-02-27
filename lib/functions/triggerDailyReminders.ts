import moment from 'moment-timezone'
import { getUsers } from "../helpers/getUsers";
import { schedules, template } from '../config';
import { invokeSendMessage } from '../helpers/invokeSendMessage';

const isInSchedule = () => schedules[moment().dayOfYear() % schedules.length].includes(moment().hour())

export async function triggerDailyReminders() {
    if (!isInSchedule()) {
        console.log('❌ Not in schedule, skipping job.');
        return
    }

    const users = await getUsers();
    console.log(`Found ${users.length} users to send messages to...`);

    for (const { name, phone, id } of users) {
        console.log(`Invoking sendMessage for ${phone}...`);
        await invokeSendMessage(phone, template.onGoing({ name, id }));
    }

    console.log(`✅ Finished job, sent ${users.length} messages.`);
}
