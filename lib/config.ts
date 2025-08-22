/* WHAT IS BEING SENT?*/
const {ON_GOING_TEMPLATE, ONCE_PER_DAY_TEMPLATE} = process.env
if (!ON_GOING_TEMPLATE || !ONCE_PER_DAY_TEMPLATE) throw new Error('Missing environment variables')
export const template = {
    onGoing: ON_GOING_TEMPLATE,
    oncePerDay: ONCE_PER_DAY_TEMPLATE
}

/*  WHEN IS IT BEING SENT? (ISRAEL TIMEZONE UTC+2) */
export const allDaySchedules: number[][] = [
    [7, 11, 15, 19, 22],
    [8, 12, 15, 18, 21],
    [9, 12, 16, 19, 22],
]

export const oncePerDayTime = {
    hour: 9,
    minute: 30
}
// 9:30am ISRAEL TIMEZONE UTC+2

/*  WHO IS IT BEING SENT FROM? */
const { FROM_NUMBER } = process.env
if (!FROM_NUMBER) throw new Error('Missing environment variables')
export const FROM = Number(FROM_NUMBER)