import { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'BH365Leaderboard';

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || '';

  // GET /leaderboard/progress?username=X — get individual progress
  if (method === 'GET' && event.queryStringParameters?.username) {
    const username = event.queryStringParameters.username;
    const result = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { username: { S: username } }
    }));
    if (result.Item) {
      return response(200, {
        username: result.Item.username?.S,
        totalCorrect: parseInt(result.Item.totalCorrect?.N || '0'),
        totalQuestions: parseInt(result.Item.totalQuestions?.N || '0'),
        quizzesTaken: parseInt(result.Item.quizzesTaken?.N || '0'),
        bestStreak: parseInt(result.Item.bestStreak?.N || '0'),
        awards: JSON.parse(result.Item.awards?.S || '[]'),
        mapProgress: JSON.parse(result.Item.mapProgress?.S || '{"completed":[],"perfectCount":0,"sessionStreak":0,"awards":[]}'),
        stats: JSON.parse(result.Item.stats?.S || '{"quizzes":0,"totalPts":0,"totalCorrect":0,"totalQs":0,"bestStreak":0,"awards":[]}'),
      });
    }
    return response(200, { username, mapProgress: {completed:[],perfectCount:0,sessionStreak:0,awards:[]}, stats: {quizzes:0,totalPts:0,totalCorrect:0,totalQs:0,bestStreak:0,awards:[]} });
  }

  if (method === 'GET') {
    // Get full leaderboard
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const entries = (result.Items || []).map(item => ({
      username: item.username?.S,
      totalCorrect: parseInt(item.totalCorrect?.N || '0'),
      totalQuestions: parseInt(item.totalQuestions?.N || '0'),
      quizzesTaken: parseInt(item.quizzesTaken?.N || '0'),
      bestStreak: parseInt(item.bestStreak?.N || '0'),
      awards: JSON.parse(item.awards?.S || '[]'),
      mapCompleted: JSON.parse(item.mapProgress?.S || '{"completed":[]}').completed?.length || 0,
      lastActive: item.lastActive?.S || '',
    }));
    entries.sort((a, b) => b.totalCorrect - a.totalCorrect);
    return response(200, entries);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { username, totalCorrect, totalQuestions, quizzesTaken, bestStreak, awards, mapProgress, stats } = body;

    if (!username) return response(400, { error: 'username required' });

    const item = {
      username: { S: username },
      totalCorrect: { N: String(totalCorrect || 0) },
      totalQuestions: { N: String(totalQuestions || 0) },
      quizzesTaken: { N: String(quizzesTaken || 0) },
      bestStreak: { N: String(bestStreak || 0) },
      awards: { S: JSON.stringify(awards || []) },
      lastActive: { S: new Date().toISOString() },
    };

    // Save map progress if provided
    if (mapProgress) {
      item.mapProgress = { S: JSON.stringify(mapProgress) };
    }
    if (stats) {
      item.stats = { S: JSON.stringify(stats) };
    }

    await ddb.send(new PutItemCommand({ TableName: TABLE, Item: item }));
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
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
