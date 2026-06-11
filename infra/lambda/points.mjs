import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sns = new SNSClient({ region: 'us-east-1' });

const TABLE = process.env.POINTS_TABLE || 'FamilyChoresPoints';

const PHONES = {
  Shane: process.env.SHANE_PHONE || '+16789842089',
  Austin: process.env.AUSTIN_PHONE || '+14044932795',
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

    let pts = parseInt(current.Item?.points?.N || '0');
    let history = JSON.parse(current.Item?.history?.S || '[]');

    if (action === 'add') {
      pts += 1;
      history.push({ type: 'add', day: day || 'unspecified', date: new Date().toISOString(), by: requestedBy });
    } else if (action === 'remove') {
      pts = Math.max(0, pts - 1);
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
          `Hey ${person}, you received a point for ${day || 'today'}. I know you've been busy — any help you can give helps us all out. You now have ${pts} point${pts !== 1 ? 's' : ''}.`,
          `Hey ${person}, a point was added for ${day || 'today'}. I'm not upset — I just want you to keep track of how we experience you as a team member who carries their own weight. You're at ${pts} now.`,
          `${person}, you got a point for ${day || 'today'}. We all forget sometimes. What matters is what you do next. You're at ${pts} point${pts !== 1 ? 's' : ''}.`,
          `Hey ${person}, point added for ${day || 'today'}. You're capable of so much — I just need you to show up for the team. Currently at ${pts}.`,
        ];
        msg = addMessages[Math.floor(Math.random() * addMessages.length)];
        if (pts >= 3) {
          msg += `\n\n⚠️ You're at ${pts} points now. Device is paused until you work it back down to zero. You can do this.`;
        }
      } else {
        const removeMessages = [
          `${person}! A point has been removed. You're down to ${pts}. I see you putting in the effort and I appreciate it. 💛`,
          `Point removed, ${person}! You're at ${pts} now. Thank you for stepping up — that's what growth looks like. ✊🏾`,
          `Hey ${person}, you earned that point back. Down to ${pts}. Keep going — you're proving what I already know about you. 🙌🏾`,
          `${person}, one less point. You're at ${pts}. I'm proud of you for making it right. 💪🏾`,
        ];
        msg = removeMessages[Math.floor(Math.random() * removeMessages.length)];
        if (pts === 0) {
          msg += `\n\n🎉 You're back to zero! Device unlocked. Thank you for following through.`;
        }
      }

      try {
        await sns.send(new PublishCommand({
          PhoneNumber: phone,
          Message: msg,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
          }
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
