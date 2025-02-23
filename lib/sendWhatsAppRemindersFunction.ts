import twilio from "twilio"
import moment from 'moment-timezone'
import Handlebars from "handlebars";
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import zod from 'zod'

moment.tz.setDefault('Asia/Jerusalem');

if (!process.env.GOOGLE_DOC_EMAIL
    || !process.env.GOOGLE_DOC_ID
    || !process.env.GOOGLE_DOC_PRIVATE_KEY
    || !process.env.ACCOUNT_SID
    || !process.env.AUTH_TOKEN
    || !process.env.FROM_WHATSAPP)
    throw new Error('Missing environment variables')

/* WHEN */
function isInSchedule() {
    const now = moment();
    const hour = now.startOf('hour').hour();
    switch (now.day() % 3) {
        case 0:
            return [7, 11, 15, 19, 21, 23].includes(hour);
        case 1:
            return [8, 12, 15, 18, 20, 23].includes(hour);
        case 2:
            return [9, 12, 16, 19, 22, 23].includes(hour);
        default:
            throw new Error('Invalid day');
    }
}

/* WHO */
const serviceAccountAuth = new JWT({ email: process.env.GOOGLE_DOC_EMAIL, key: process.env.GOOGLE_DOC_PRIVATE_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const doc = new GoogleSpreadsheet(process.env.GOOGLE_DOC_ID, serviceAccountAuth);

const userSchema = zod.object({
    phone: zod.number(),
    startDate: zod.date(),
    name: zod.string(),
    identifier: zod.string(),
})

type User = zod.infer<typeof userSchema>

function isInPeriod({ startDate, name }: User): boolean {
    const PERIOD_LENGTH = 10;
    const now = moment().startOf('day');
    const momentStartDate = moment(startDate).startOf('day');
    const diff = now.diff(momentStartDate, 'days');

    // We are before the start date
    if (diff < 0) return false

    // We are more than PERIOD_LENGTH days after the start date
    if (diff >= PERIOD_LENGTH) return false

    console.log(`User ${name} is in period, diff: ${diff}`);
    // We are in the period at day (0 - 9)
    return true
}

async function getUsers() {
    console.log('Getting users from Google Sheet...');

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows({ limit: sheet.rowCount, offset: 0 });

    if (!rows?.length) throw new Error('No rows found')

    console.log(`Found ${rows.length} rows of users, parsing...`);

    const users = rows.map((row) => {
        const { ['start date']: startDate, phone, identifier, name } = row.toObject();
        return userSchema.parse({
            name: String(name),
            startDate: new Date(startDate),
            phone: Number(phone),
            identifier: String(identifier)
        });
    })

    console.log(`Parsed ${users.length} users`);

    const usersToRemind = users.filter(isInPeriod);

    console.log(`Found ${usersToRemind.length} users in period`);

    return usersToRemind
}

/* WHAT */
const message = Handlebars.compile<User>(`הי {{name}},
    את/ה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את יומן המעקב.
    https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_8984AzWw99Zrf3o
    מספר המשתתף שלך הוא {{identifier}}
    תודה ונתראה בדיווח הבא!`);

/* HOW */
const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);
async function sendTo(user: User) {
    console.log(`Sending message to ${user.name}...`);
    const messageRes = await client.messages.create({
        body: message(user),
        from: process.env.FROM_WHATSAPP,
        to: `whatsapp:+${user.phone}`,
    });
    console.log(`Message sent to ${user.phone}, SID: ${messageRes.sid}`);
}


/* HANDLER */
export async function handler() {
    const date = moment()

    if (!isInSchedule()) {
        console.log(`Not in schedule at ${date.format('DD/MM/YYYY HH:mm:ss')}`);
        return
    }

    console.log(`In schedule at ${date.format('DD/MM/YYYY HH:mm:ss')}`);

    for (const user of await getUsers()) {
        try {
            await sendTo(user)
        } catch (e) {
            console.error(`❌ Error sending message to ${user.name}`);
            console.error(e)
        }
    };

    console.log(`✅ Finished job at ${date.format('DD/MM/YYYY HH:mm:ss')}`);
}