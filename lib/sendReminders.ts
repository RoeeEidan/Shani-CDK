import twilio from "twilio"
import moment from 'moment-timezone'
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

moment.tz.setDefault('Asia/Jerusalem');

const { GOOGLE_DOC_EMAIL: docEmail, GOOGLE_DOC_ID: docId, GOOGLE_DOC_PRIVATE_KEY: docKey, ACCOUNT_SID: twSid, AUTH_TOKEN: swToken } = process.env
if (!docEmail || !docId || !docKey || !twSid || !swToken) throw new Error('Missing environment variables')

const doc = new GoogleSpreadsheet(docId, new JWT({ email: docEmail, key: docKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }))
const client = twilio(twSid, swToken);

export default async function sendReminders() {
    const date = moment()

    console.log('Getting users from Google Sheet...');

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows({ limit: sheet.rowCount, offset: 0 });
    if (!rows?.length) throw new Error('No rows found')
    console.log(`Found ${rows.length} rows of users, parsing...`);

    const users = rows
        .map((row) => {
            const { kickoff, phone, identifier, name } = row.toObject();
            return { name: String(name), kickoff: moment(kickoff), phone: Number(phone), identifier: String(identifier) }
        })
        .filter(({ kickoff }) => {
            const diff = moment().startOf('day').diff(kickoff.startOf('day'), 'days');
            return diff >= 0 && diff < 10 // 10 days after kickoff
        })

    console.log(`Found ${users.length} users to send messages to...`);

    for (const { name, phone, identifier } of users) {
        console.log(`Sending message to ${name}...`);
        try {
            const messageRes = await client.messages.create({
                from: "whatsapp:+14155238886", // twilio sandbox number. Replace with real number when available
                body: `הי ${name},
                    את/ה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את יומן המעקב.
                    https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_8984AzWw99Zrf3o
                    מספר המשתתף שלך הוא ${identifier}
                    תודה ונתראה בדיווח הבא!`,
                to: `whatsapp:+${phone}`,
            });
            console.log(`Message sent to ${phone}, SID: ${messageRes.sid}`);
        } catch (e) {
            console.error(`❌ Error sending message to ${name}`);
            console.error(e)
        }
    };
    console.log(`✅ Finished job at ${date.format('DD/MM/YYYY HH:mm:ss')}`);
}