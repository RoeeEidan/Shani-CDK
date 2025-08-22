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

    console.log(`Sending message to ${phone}..., variables ${name}, ${id}, ${template}`);

    const messageInstance = await twClient.messages.create({
        from: `whatsapp:+${FROM}`,
        contentSid: template,
        contentVariables: JSON.stringify({ name, id }),
        to: `whatsapp:+${phone}`
    })

    console.log(messageInstance)

    if (messageInstance.errorMessage || messageInstance.errorCode) {
        console.error(`Error code from twilio: ${messageInstance.errorCode}`)
        console.error(`Error message from twilio: ${messageInstance.errorMessage}`)
        throw new Error(messageInstance.errorMessage || `Error code from twilio: ${messageInstance.errorCode}`)
    }

    console.log(`✅ Message sent! ${messageInstance.sid}`);
}