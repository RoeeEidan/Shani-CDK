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

/* WHO */
const serviceAccountAuth = new JWT({ email: process.env.GOOGLE_DOC_EMAIL, key: process.env.GOOGLE_DOC_PRIVATE_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const doc = new GoogleSpreadsheet(process.env.GOOGLE_DOC_ID, serviceAccountAuth);

const userSchema = zod.object({
    phone: zod.number(),
    startDate: zod.date(),
    name: zod.string(),
    identifier: zod.number()
})

type User = zod.infer<typeof userSchema>

async function getUsers() {
    console.log('Getting users from Google Sheet...');

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows({ limit: sheet.rowCount, offset: 0 });

    if (!rows?.length) throw new Error('No rows found')

    console.log(`Found ${rows.length} rows of users, parsing...`);
    return rows.map((row) => {
        const { ['state date']: startDate, ...rest } = row.toObject();
        return userSchema.parse({ ...rest, startDate });
    })
}


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

function isInPeriod({ startDate }: User): boolean {
    const PERIOD_LENGTH = 10;
    console.log(`Runing shouldSendMessage for ${moment(startDate).format('DD/MM/YYYY')}`)
    const now = moment().startOf('day');
    const momentStartDate = moment(startDate).startOf('day');
    const diff = now.diff(momentStartDate, 'days');

    if (!diff) {
        console.log(`It's the start date, ${momentStartDate.format('DD/MM/YYYY')}`);
        return true
    }

    if (diff < 0) {
        console.log(`It's not the start date yet, ${momentStartDate.format('DD/MM/YYYY')}`);
        return false
    }
    if (diff >= PERIOD_LENGTH) {
        console.log(`It's been more than ${PERIOD_LENGTH} days since the start date, ${momentStartDate.format('DD/MM/YYYY')}`);
        return false
    }

    console.log(`It's day ${diff} of the period, ${momentStartDate.format('DD/MM/YYYY')}`);
    return true
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

    const users = (await getUsers()).filter(isInPeriod);

    console.log(`Found ${users.length} users in period`);

    for (const user of users) {
        try {
            await sendTo(user)
        } catch (e) {
            console.error(`❌ Error sending message to ${user.name}`);
            console.error(e)
        }
    };

    console.log(`✅ Finished job at ${date.format('DD/MM/YYYY HH:mm:ss')}`);
}