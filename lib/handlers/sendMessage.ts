import twilio from "twilio"
import zod from "zod"
import { FROM } from "../config";

const { ACCOUNT_SID: twSid, AUTH_TOKEN: swToken } = process.env

if (!twSid || !swToken) throw new Error('Missing environment variables')

const twClient = twilio(twSid, swToken);

const eventSchema = zod.object({
    phone: zod.string(),
    name: zod.string(),
    id: zod.string(),
    template: zod.string(),
})

export async function sendMessage(event: any) {
    const { phone, name, id, template } = eventSchema.parse(event)

    console.log(`Sending message to ${phone}...`);

    const messageInstance = await twClient.messages.create({
        from: `whatsapp:+${FROM}`,
        // from: 'XE75df172f772a7f8b5cbea6c3e3857f15',
        contentSid: template,
        contentVariables: JSON.stringify({ name, id }),
        to: `whatsapp:+${phone}`
    })

    console.log(messageInstance)

    // Sleep for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000))

    console.log('after 10 seconds', messageInstance)

    if (messageInstance.errorMessage || messageInstance.errorCode) {
        console.error(`Error code from twilio: ${messageInstance.errorCode}`)
        console.error(`Error message from twilio: ${messageInstance.errorMessage}`)
        throw new Error(messageInstance.errorMessage || `Error code from twilio: ${messageInstance.errorCode}`)
    }

    console.log(`✅ Message sent! ${messageInstance.sid}`);
}