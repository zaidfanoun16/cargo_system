// Files made in the browser (calendar events, spreadsheets) and saved
// with the browser's normal download

function save(content: string, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

// --- Calendar (.ics) ---

// 20301015T080000Z, the format calendar apps expect
function icsDate(date: Date | string) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Commas, semicolons and line breaks have a meaning in .ics files
function icsText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

// One event that Google Calendar, Outlook and the phone's calendar can
// open, with a reminder an hour before it starts
export function downloadCalendarEvent(event: {
  id: string
  title: string
  description: string
  start: Date | string
  end: Date | string
  fileName: string
}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CarGo//Bookings//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@cargosystem.site`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(event.title)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  save(lines.join('\r\n'), 'text/calendar;charset=utf-8', event.fileName)
}

// --- Spreadsheet (.csv) ---

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Opens in Excel and Google Sheets. The BOM at the start makes Excel
// read Arabic text correctly.
export function downloadCsv(rows: (string | number)[][], fileName: string) {
  const content = '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  save(content, 'text/csv;charset=utf-8', fileName)
}
