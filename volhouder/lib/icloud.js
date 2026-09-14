import { DAVClient } from "tsdav";
import ICAL from "ical.js";

// Haalt agenda-items van een iCloud-account op voor een periode (server-side
// only — het app-specifiek wachtwoord mag nooit naar de browser). Faalt
// stil (lege lijst + foutmelding) zodat een verkeerd wachtwoord of een
// tijdelijke Apple-storing nooit de rest van de pagina breekt.
export async function fetchICloudEvents(appleId, appPassword, rangeStart, rangeEnd) {
  const client = new DAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: appleId, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  await client.login();
  const calendars = await client.fetchCalendars();

  const start = new Date(rangeStart + "T00:00:00Z");
  const end = new Date(rangeEnd + "T23:59:59Z");

  const events = [];
  for (const calendar of calendars) {
    let objects;
    try {
      objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: start.toISOString(), end: end.toISOString() },
      });
    } catch {
      continue; // sommige agenda's (bv. abonnementen) staan geen REPORT toe
    }

    for (const obj of objects) {
      if (!obj.data) continue;
      try {
        const jcalData = ICAL.parse(obj.data);
        const comp = new ICAL.Component(jcalData);
        for (const vevent of comp.getAllSubcomponents("vevent")) {
          const icalEvent = new ICAL.Event(vevent);
          collectOccurrences(icalEvent, start, end, calendar.displayName, events);
        }
      } catch {
        continue; // corrupte/onleesbare ICS-entry overslaan
      }
    }
  }

  return events;
}

function collectOccurrences(icalEvent, rangeStart, rangeEnd, calendarName, out) {
  const durationSeconds = icalEvent.duration ? icalEvent.duration.toSeconds() : 0;

  if (!icalEvent.isRecurring()) {
    const start = icalEvent.startDate.toJSDate();
    if (start >= rangeStart && start <= rangeEnd) {
      out.push(toEntry(icalEvent.summary, start, durationSeconds, calendarName));
    }
    return;
  }

  const iterator = icalEvent.iterator();
  let next;
  let guard = 0;
  while ((next = iterator.next()) && guard < 500) {
    guard++;
    const occStart = next.toJSDate();
    if (occStart > rangeEnd) break;
    if (occStart >= rangeStart) {
      out.push(toEntry(icalEvent.summary, occStart, durationSeconds, calendarName));
    }
  }
}

function toEntry(title, startDate, durationSeconds, calendarName) {
  const dateStr = startDate.toISOString().slice(0, 10);
  const timeStr = startDate.toTimeString().slice(0, 5);
  return {
    title: title || "(geen titel)",
    date: dateStr,
    time: timeStr,
    durationMinutes: Math.max(15, Math.round((durationSeconds || 1800) / 60)),
    calendarName,
  };
}
