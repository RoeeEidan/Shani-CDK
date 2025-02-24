import twilio from "twilio"
import moment from 'moment-timezone'
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import zod from "zod";

moment.tz.setDefault('Asia/Jerusalem');

const { GOOGLE_DOC_EMAIL: docEmail, GOOGLE_DOC_ID: docId, GOOGLE_DOC_PRIVATE_KEY: docKey, ACCOUNT_SID: twSid, AUTH_TOKEN: swToken } = process.env
if (!docEmail || !docId || !docKey || !twSid || !swToken) throw new Error('Missing environment variables')

const doc = new GoogleSpreadsheet(docId, new JWT({ email: docEmail, key: docKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }))
const client = twilio(twSid, swToken);

const UserSchema = zod.object({
    name: zod.string(),
    kickoff: zod.string(),
    phone: zod.string(),
    id: zod.string()
})

export default async function sendReminders() {
    console.log('Getting users from Google Sheet...');

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows({ limit: sheet.rowCount, offset: 0 });
    if (!rows?.length) throw new Error('No rows found')
    console.log(`Found ${rows.length} rows of users, parsing...`);

    const users = rows
        .map(row => UserSchema.parse(row.toObject()))
        .filter(({ kickoff }) => {
            const diff = moment().startOf('day').diff(moment(kickoff).startOf('day'), 'days');
            return diff >= 0 && diff < 10 // 10 days after kickoff
        })

    console.log(`Found ${users.length} users to send messages to...`);

    let failed: string[] = []
    for (const { name, phone, id } of users) {
        console.log(`Sending message to ${name}...`);
        try {
            const messageRes = await client.messages.create({
                from: "whatsapp:+14155238886", // twilio sandbox number. Replace with real number when available
                body: `הי ${name},
                    את/ה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את יומן המעקב.
                    https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_8984AzWw99Zrf3o
                    מספר המשתתף שלך הוא ${id}
                    תודה ונתראה בדיווח הבא!`,
                to: `whatsapp:+${phone}`,
            });
            console.log(`Message sent to ${phone}, SID: ${messageRes.sid}`);
        } catch (e) {
            failed.push(name);
            console.error(e)
        }
    };

    if (failed.length) throw new Error(`Failed to send ${failed.length}/${users.length} messages. (${failed.join(', ')})`);
    console.log(`✅ Finished job`);
}