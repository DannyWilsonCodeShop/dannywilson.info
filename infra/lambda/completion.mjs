import { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sns = new SNSClient({ region: 'us-east-1' });

const TABLE = process.env.COMPLETION_TABLE || 'FamilyChoresCompletion';

const PHONES = {
  Shane: process.env.SHANE_PHONE || '+16789842089',
  Austin: process.env.AUSTIN_PHONE || '+14044932795',
  Olivia: process.env.OLIVIA_PHONE || '+14708333224',
  Danny: process.env.DANNY_PHONE || '+14048037330',
  Courtnee: process.env.COURTNEE_PHONE || '+14048037877',
};

const ALL5 = ['Shane', 'Austin', 'Olivia', 'Danny', 'Courtnee'];
const KIDS = ['Shane', 'Austin', 'Olivia'];

async function sendSms(phone, msg) {
  try {
    await sns.send(new PublishCommand({
      PhoneNumber: phone,
      Message: msg,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
      }
    }));
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    const date = event.queryStringParameters?.date;
    if (!date) return response(400, { error: 'date parameter required' });

    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const items = (result.Items || [])
      .filter(item => item.personDate.S.includes(date))
      .map(item => ({
        person: item.person?.S,
        chore: item.chore?.S,
        completedAt: item.completedAt?.S,
      }));

    return response(200, items);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { person, chore, date, undo } = body;

    if (!person || !chore || !date) {
      return response(400, { error: 'person, chore, and date required' });
    }

    const personDate = `${person}#${chore}#${date}`;

    if (undo) {
      // Remove the completion record
      await ddb.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: { personDate: { S: personDate } }
      }));
      return response(200, { success: true, undone: true, personDate });
    }

    // Mark complete
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

    // Send notifications to EVERYONE when a kid completes a chore
    if (KIDS.includes(person)) {
      for (const member of ALL5) {
        const phone = PHONES[member];
        if (!phone) continue;
        if (member === person) {
          await sendSms(phone, `✅ You marked "${chore}" complete and ready for review! Nice work, ${person}! 💪`);
        } else {
          await sendSms(phone, `📋 ${person} has marked "${chore}" complete and ready for review. (${date})`);
        }
      }
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
