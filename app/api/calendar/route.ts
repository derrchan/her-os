import { NextResponse } from 'next/server';
import { google, calendar_v3 } from 'googleapis';
import { oauth2Client } from '@/lib/google-auth';

export async function GET() {
  try {
    // Set credentials - in a real app, you'd get these from a database
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items?.map((event: calendar_v3.Schema$Event) => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
    })) || [];

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}