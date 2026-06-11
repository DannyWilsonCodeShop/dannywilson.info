import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'FamilyChoresSwaps';

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    const date = event.queryStringParameters?.date;
    if (!date) return response(400, { error: 'date required' });

    const result = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { dateKey: { S: date } }
    }));

    if (result.Item) {
      return response(200, JSON.parse(result.Item.swaps?.S || '{}'));
    }
    return response(200, {});
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { date, swaps } = body;
    // swaps is an object like { "Shane": ["Wash Dishes", "Feed Chaka"], "Austin": ["Sweep & Mop", "Physical Training"] }

    if (!date || !swaps) return response(400, { error: 'date and swaps required' });

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        dateKey: { S: date },
        swaps: { S: JSON.stringify(swaps) },
        updatedAt: { S: new Date().toISOString() },
      }
    }));

    return response(200, { success: true });
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
