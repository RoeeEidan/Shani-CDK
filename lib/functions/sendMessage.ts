import twilio from "twilio"
import zod from "zod"
import { FROM } from "../config";

const { ACCOUNT_SID: twSid, AUTH_TOKEN: swToken } = process.env

if (!twSid || !swToken) throw new Error('Missing environment variables')

const twClient = twilio(twSid, swToken);

const eventSchema = zod.object({
    phone: zod.string(),
    message: zod.string(),
})

export async function sendMessage(event: any) {
    const { phone, message } = eventSchema.parse(event)

    console.log(`Sending message to ${phone}...`);

    const messageInstance = await twClient.messages.create({
        from: `whatsapp:+${FROM}`,
        body: message,
        to: `whatsapp:+${phone}`,
    })

    if (messageInstance.errorMessage || messageInstance.errorCode)
        throw new Error(messageInstance.errorMessage || `Error code from twilio: ${messageInstance.errorCode}`)

    console.log(`✅ Message sent! ${messageInstance.sid}`);
}