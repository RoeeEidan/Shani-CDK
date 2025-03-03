import Handlebars from "handlebars"

/* WHAT IS BEING SENT?*/
const onGoingMessage = `הי {{name}},
אתה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את יומן המעקב.
https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_3KQ7EeKuwl87kqO
מספר המשתתף שלך הוא {{id}}
תודה ונתראה בדיווח הבא!`

const onceADayMessage = `הי {{name}},
אתה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את דיווח החוסן היומי.
https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_dhcFIxXZWn6qxlI
מספר המשתתף שלך הוא {{id}}
תודה ונתראה בדיווח הבא!`

type TemplateParams = { name: string, id: string }
export const template = {
    onGoing: Handlebars.compile<TemplateParams>(onGoingMessage),
    endOfDay: Handlebars.compile<TemplateParams>(onceADayMessage)
}

/*  WHEN IS IT BEING SENT? (ISRAEL TIMEZONE UTC+2) */
export const allDaySchedules: number[][] = [
    [7, 11, 15, 19, 22],
    [8, 12, 15, 18, 21],
    [9, 12, 16, 19, 22],
]

export const eodTime = {
    hour: 9,
    minute: 30
}
// 9:30am ISRAEL TIMEZONE UTC+2

/*  WHO IS IT BEING SENT FROM? */
export const FROM = 14155238886 // twilio sandbox number. Replace with real number when available