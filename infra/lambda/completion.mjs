import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const ses = new SESClient({ region: 'us-east-1' });

const TABLE = process.env.COMPLETION_TABLE || 'FamilyChoresCompletion';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'dwilson1919@gmail.com';

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    // Get completions for a given date
    const date = event.queryStringParameters?.date;
    if (!date) return response(400, { error: 'date parameter required' });

    const result = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(personDate, :prefix) OR contains(personDate, :datePart)',
      ExpressionAttributeValues: {
        ':prefix': { S: '' },
        ':datePart': { S: date }
      }
    }));

    // Scan and filter for the date
    const items = (result.Items || [])
      .filter(item => item.personDate.S.endsWith(date))
      .map(item => ({
        person: item.person?.S,
        chore: item.chore?.S,
        completedAt: item.completedAt?.S,
      }));

    return response(200, items);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { person, chore, date } = body;

    if (!person || !chore || !date) {
      return response(400, { error: 'person, chore, and date required' });
    }

    const personDate = `${person}#${chore}#${date}`;
    const now = new Date().toISOString();

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        personDate: { S: personDate },
        person: { S: person },
        chore: { S: chore },
        date: { S: date },
        completedAt: { S: now },
      }
    }));

    // Send email notification to Danny
    try {
      await ses.send(new SendEmailCommand({
        Source: NOTIFICATION_EMAIL,
        Destination: { ToAddresses: [NOTIFICATION_EMAIL] },
        Message: {
          Subject: { Data: `✅ ${person} completed: ${chore}` },
          Body: {
            Text: { Data: `${person} just marked "${chore}" as complete!\n\nDate: ${date}\nTime: ${now}` },
            Html: { Data: `<h2>✅ Chore Completed!</h2><p><strong>${person}</strong> just finished: <strong>${chore}</strong></p><p>Date: ${date}<br>Time: ${now}</p>` }
          }
        }
      }));
    } catch (err) {
      console.error('Email send error:', err);
    }

    return response(200, { success: true, personDate, completedAt: now });
  }

  return response(405, { error: 'Method not allowed' });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(body),
  };
}
