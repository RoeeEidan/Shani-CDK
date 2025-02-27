import Handlebars from "handlebars"

/* WHAT IS BEING SENT?*/
const onGoingMessage = `הי {{name}},
את/ה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את יומן המעקב.
https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_8984AzWw99Zrf3o 
מספר המשתתף שלך הוא {{id}}
תודה ונתראה בדיווח הבא!`

const endOfDayMessage = `הי {{name}},
את/ה מוזמנ/ת להיכנס כעת דרך הקישור המצורף ולמלא את יומן המעקב.
https://HaifaCATRC.eu.qualtrics.com/jfe/form/SV_8984AzWw99Zrf3o 
מספר המשתתף שלך הוא {{id}}
תודה ונתראה בדיווח הבא!!!`

type TemplateParams = { name: string, id: string }
export const template = {
    onGoing: Handlebars.compile<TemplateParams>(onGoingMessage),
    endOfDay: Handlebars.compile<TemplateParams>(endOfDayMessage)
}

/*  WHEN IS IT BEING SENT? (ISRAEL TIMEZONE UTC+2) */
export const schedules: number[][] = [
    [7, 11, 15, 19, 22],
    [8, 12, 15, 18, 21],
    [9, 12, 16, 19, 22],
]

export const eodTime = 20 // 20:00pm ISRAEL TIMEZONE UTC+2

/*  WHO IS IT BEING SENT FROM? */
export const FROM = 14155238886 // twilio sandbox number. Replace with real number when available