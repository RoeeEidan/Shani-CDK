/* WHAT IS BEING SENT?*/
export const template = {
    onGoing: 'HX60487aa01ff61f37582fe9dddb43f1d5',
    oncePerDay: 'HXf17381551bd4258e581ee464a31604e7' 
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
export const FROM = 972522166846