import { DynamoDBClient, PutItemCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const smsClient = new PinpointSMSVoiceV2Client({ region: 'us-east-1' });
const TABLE = 'FamilyChoresExemptions';
const ORIGINATION_NUMBER = '+18552432682';

const PHONES = {
  Shane: '+14044932795',
  Austin: '+16789842089',
  Olivia: '+14708333224',
  Danny: '+14048037330',
  Courtnee: '+14048037877',
};

async function sendSms(phone, msg) {
  try {
    await smsClient.send(new SendTextMessageCommand({
      DestinationPhoneNumber: phone,
      OriginationIdentity: ORIGINATION_NUMBER,
      MessageBody: msg,
      MessageType: 'TRANSACTIONAL'
    }));
  } catch (err) { console.error('SMS error:', err.message); }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    // Get all pending exemptions (or filter by date)
    const date = event.queryStringParameters?.date;
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    let items = (result.Items || []).map(item => ({
      requestId: item.requestId?.S,
      person: item.person?.S,
      date: item.date?.S,
      reason: item.reason?.S,
      status: item.status?.S || 'pending',
      createdAt: item.createdAt?.S,
      reviewedBy: item.reviewedBy?.S || '',
    }));
    if (date) items = items.filter(i => i.date === date);
    // Show pending first
    items.sort((a, b) => (a.status === 'pending' ? -1 : 1));
    return response(200, items);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { person, date, reason, action, requestId, reviewedBy } = body;

    // Approve or deny
    if (action === 'approve' || action === 'deny') {
      if (!requestId) return response(400, { error: 'requestId required' });
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { requestId: { S: requestId } },
        UpdateExpression: 'SET #s = :s, reviewedBy = :r',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': { S: action === 'approve' ? 'approved' : 'denied' }, ':r': { S: reviewedBy || '' } }
      }));

      // Get the request details to notify the kid
      const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
      const req = (result.Items || []).find(i => i.requestId?.S === requestId);
      const kidName = req?.person?.S;
      if (kidName && PHONES[kidName]) {
        if (action === 'approve') {
          await sendSms(PHONES[kidName], `✅ ${kidName}, your exemption request was approved! No flag for today. 🙌`);
        } else {
          await sendSms(PHONES[kidName], `${kidName}, your exemption request was not approved. The flag stands. Let's get back on track tomorrow. 💪`);
        }
      }
      return response(200, { success: true, action, requestId });
    }

    // New exemption request
    if (!person || !reason) return response(400, { error: 'person and reason required' });

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        requestId: { S: id },
        person: { S: person },
        date: { S: date || new Date().toISOString().split('T')[0] },
        reason: { S: reason },
        status: { S: 'pending' },
        createdAt: { S: new Date().toISOString() },
      }
    }));

    // Notify parents
    const msg = `📋 ${person} is requesting an exemption from today's flag.\n\nReason: "${reason}"\n\nOpen the chores app to approve or deny.`;
    await sendSms(PHONES.Danny, msg);
    await sendSms(PHONES.Courtnee, msg);

    return response(200, { success: true, requestId: id });
  }

  return response(405, { error: 'Method not allowed' });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
    body: JSON.stringify(body),
  };
}
