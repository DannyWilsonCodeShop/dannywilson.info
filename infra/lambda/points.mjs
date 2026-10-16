import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sms = new PinpointSMSVoiceV2Client({ region: 'us-east-1' });
const ORIGINATION_NUMBER = '+18552432682';

const TABLE = process.env.POINTS_TABLE || 'FamilyChoresPoints';

const PHONES = {
  Shane: process.env.SHANE_PHONE || '+14044932795',
  Austin: process.env.AUSTIN_PHONE || '+16789842089',
  Olivia: process.env.OLIVIA_PHONE || '+14708333224',
};

// Only Danny and Courtnee can modify points
const ADMINS = ['Danny', 'Courtnee'];

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const points = {};
    (result.Items || []).forEach(item => {
      points[item.person.S] = {
        points: parseInt(item.points?.N || '0'),
        history: JSON.parse(item.history?.S || '[]'),
      };
    });
    // Ensure all kids have an entry
    ['Shane', 'Austin', 'Olivia'].forEach(k => {
      if (!points[k]) points[k] = { points: 0, history: [] };
    });
    return response(200, points);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { person, action, day, requestedBy } = body;
    // action: "add" or "remove"

    if (!person || !action || !requestedBy) {
      return response(400, { error: 'person, action, and requestedBy required' });
    }

    if (!ADMINS.includes(requestedBy)) {
      return response(403, { error: 'Only Danny and Courtnee can modify points' });
    }

    if (!['Shane', 'Austin', 'Olivia'].includes(person)) {
      return response(400, { error: 'Points only apply to Shane, Austin, and Olivia' });
    }

    // Get current points
    const current = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { person: { S: person } }
    }));

    // Single on/off flag: 1 = flagged, 0 = clear. No counting.
    let pts = parseInt(current.Item?.points?.N || '0') > 0 ? 1 : 0;
    let history = JSON.parse(current.Item?.history?.S || '[]');

    if (action === 'add') {
      pts = 1;
      history.push({ type: 'add', day: day || 'unspecified', date: new Date().toISOString(), by: requestedBy });
    } else if (action === 'remove') {
      pts = 0;
      history.push({ type: 'remove', day: day || 'unspecified', date: new Date().toISOString(), by: requestedBy });
    } else {
      return response(400, { error: 'action must be "add" or "remove"' });
    }

    // Keep only last 30 history entries
    if (history.length > 30) history = history.slice(-30);

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        person: { S: person },
        points: { N: String(pts) },
        history: { S: JSON.stringify(history) },
        updatedAt: { S: new Date().toISOString() },
        updatedBy: { S: requestedBy },
      }
    }));

    // Send SMS notification to the kid
    const phone = PHONES[person];
    if (phone) {
      let msg;
      if (action === 'add') {
        const addMessages = [
          `Hey ${person}, you've been flagged for ${day || 'today'}. 🚩 Your device is paused until it's cleared. Get your chores done and let's clear it.`,
          `Hey ${person}, a flag was added for ${day || 'today'}. 🚩 I'm not upset — just do your part and we'll clear it. Device is paused until then.`,
          `${person}, you're flagged for ${day || 'today'}. 🚩 We all forget sometimes. Knock out your chores and your device comes back on.`,
          `Hey ${person}, flagged for ${day || 'today'}. 🚩 You're capable of so much — show up for the team and we'll clear this. Device is paused for now.`,
        ];
        msg = addMessages[Math.floor(Math.random() * addMessages.length)];
      } else {
        const removeMessages = [
          `${person}! Your flag is cleared. ✅ Device is back on. I see you putting in the effort and I appreciate it. 💛`,
          `Flag cleared, ${person}! ✅ Device unlocked. Thank you for stepping up — that's what growth looks like. ✊🏾`,
          `Hey ${person}, you cleared your flag. ✅ Device back on. Keep going — you're proving what I already know about you. 🙌🏾`,
          `${person}, flag cleared. ✅ Device unlocked. I'm proud of you for making it right. 💪🏾`,
        ];
        msg = removeMessages[Math.floor(Math.random() * removeMessages.length)];
      }

      try {
        await sms.send(new SendTextMessageCommand({
          DestinationPhoneNumber: phone,
          OriginationIdentity: ORIGINATION_NUMBER,
          MessageBody: msg,
          MessageType: 'TRANSACTIONAL'
        }));
      } catch (err) {
        console.error('SMS send error:', err);
      }
    }

    return response(200, { success: true, person, points: pts, action });
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
