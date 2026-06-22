import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROPERTY_ID = '542345483';

interface GA4Response {
  activeUsersNow: number;
  todaySessions: number;
  yesterdaySessions: number;
  last7DaysSessions: number;
}

interface GA4Error {
  error: string;
  step: string;
  details?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return String((err as any).message);
  return String(err);
}

async function getAuthenticatedClient() {
  let credentials;
  try {
    const credsJson = process.env.GA4_CREDENTIALS_JSON;
    if (!credsJson) throw new Error('GA4_CREDENTIALS_JSON env variable is not set');
    credentials = JSON.parse(credsJson);
  } catch (err) {
    const message = getErrorMessage(err);
    console.error('Error reading credentials:', message);
    throw { step: 'readCredentials', error: message };
  }

  try {
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    return auth;
  } catch (err) {
    const message = getErrorMessage(err);
    console.error('Error initializing GoogleAuth:', message);
    throw { step: 'authentication', error: message };
  }
}

async function fetchWithAuth(url: string, body: object) {
  const auth = await getAuthenticatedClient();
  const client = await auth.getClient() as any;

  let token;
  try {
    const accessTokenResponse = await client.getAccessToken();
    token = accessTokenResponse.token;
    if (!token) {
      throw new Error('Access token is null - authentication failed');
    }
  } catch (err) {
    const message = getErrorMessage(err);
    console.error('Error getting access token:', message);
    throw { step: 'authentication', error: `getAccessToken failed: ${message}` };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error(`API error (status ${response.status}):`, responseText);
    throw {
      step: 'apiResponse',
      error: `HTTP ${response.status}`,
      details: responseText,
    };
  }

  return response.json();
}

async function getActiveUsers(): Promise<number> {
  const requestBody = { metrics: [{ name: 'activeUsers' }] };
  const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`;

  console.log('=== REALTIME API ===');
  console.log('URL:', apiUrl);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetchWithAuth(apiUrl, requestBody);

    console.log('Raw response:', JSON.stringify(response, null, 2));

    return response.rows?.[0]?.metricValues?.[0]?.value ?? 0;
  } catch (err) {
    const error = err as any;
    const message = error?.error || getErrorMessage(err);
    const details = error?.details || '';
    console.error('Realtime API error:', message, details);
    throw { step: 'realtimeApi', error: message, details };
  }
}

async function getSessions(startDate: string, endDate: string): Promise<number> {
  const requestBody = {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'sessions' }],
  };
  const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

  console.log('=== STANDARD REPORT API ===');
  console.log('URL:', apiUrl);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetchWithAuth(apiUrl, requestBody);

    console.log('Raw response:', JSON.stringify(response, null, 2));

    return response.rows?.[0]?.metricValues?.[0]?.value ?? 0;
  } catch (err) {
    const error = err as any;
    const message = error?.error || getErrorMessage(err);
    const details = error?.details || '';
    console.error('Standard Report API error:', message, details);
    throw { step: 'standardReportApi', error: message, details };
  }
}

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function createErrorResponse(step: string, errorMessage: string, details?: string) {
  const response: GA4Error = { error: errorMessage, step };
  if (details) response.details = details;
  return NextResponse.json(response, { status: 500 });
}

export async function GET() {
  const today = getDateString(0);
  const yesterday = getDateString(1);
  const last7DaysStart = getDateString(6);

  console.log('=== GA4 ANALYTICS REQUEST ===');
  console.log('today:', today);
  console.log('yesterday:', yesterday);
  console.log('last7DaysStart:', last7DaysStart);

  try {
    const [activeUsersNow, todaySessions, yesterdaySessions, last7DaysSessions] =
      await Promise.all([
        getActiveUsers(),
        getSessions(today, today),
        getSessions(yesterday, yesterday),
        getSessions(last7DaysStart, today),
      ]);

    const data: GA4Response = {
      activeUsersNow,
      todaySessions,
      yesterdaySessions,
      last7DaysSessions,
    };

    return NextResponse.json(data);
  } catch (err) {
    const error = err as any;

    if (error?.step) {
      console.error(`GA4 Error at step [${error.step}]:`, error.error, error.details);
      return createErrorResponse(error.step, error.error, error.details);
    }

    const message = getErrorMessage(err);
    console.error('Unexpected GA4 Error:', message);
    return createErrorResponse('unknown', message);
  }
}
