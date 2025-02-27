import moment from 'moment-timezone'
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import zod from "zod";

const { GOOGLE_DOC_EMAIL, GOOGLE_DOC_ID, GOOGLE_DOC_PRIVATE_KEY, TIMEZONE } = process.env
if (!GOOGLE_DOC_EMAIL || !GOOGLE_DOC_ID || !GOOGLE_DOC_PRIVATE_KEY) throw new Error('Missing environment variables')

moment.tz.setDefault(TIMEZONE);

const doc = new GoogleSpreadsheet(GOOGLE_DOC_ID, new JWT({ email: GOOGLE_DOC_EMAIL, key: GOOGLE_DOC_PRIVATE_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }))

const userSchema = zod.object({
    name: zod.string(),
    kickoff: zod.string(),
    phone: zod.string(),
    id: zod.string()
})

export async function getUsers() {
    console.log('Getting users from Google Sheet...');
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows({ limit: sheet.rowCount, offset: 0 });
    if (!rows?.length) throw new Error('No rows found')
    console.log(`Found ${rows.length} rows of users, parsing...`);

    return rows
        .map(row => userSchema.parse(row.toObject()))
        .filter(({ kickoff }) => {
            const diff = moment().startOf('day').diff(moment(kickoff).startOf('day'), 'days');
            return diff >= 0 && diff < 40 // 40 days after kickoff
        })
}
