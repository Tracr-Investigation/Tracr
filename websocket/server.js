const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { setupWSConnection } = require('y-websocket/bin/utils');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 1234;
const TOKEN_PROTOCOL_PREFIX = 'tracr.token.';
const ROOM_NAME_PATTERN = /^document_\d+$/;
const JWT_ALGORITHMS = ['HS256'];
const HEALTH_RESPONSE_BODY = 'tracr-websocket';

const HOST = process.env.HOST || DEFAULT_HOST;
const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const SECRET = process.env.SECRET_KEY;

if (!SECRET) {
  console.error('SECRET_KEY env var is required');
  process.exit(1);
}

function handleHealthRequest(_req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(HEALTH_RESPONSE_BODY);
}

function parseDocName(req) {
  const url = new URL(req.url, 'http://localhost');
  return url.pathname.slice(1);
}

function isValidDocName(docName) {
  return ROOM_NAME_PATTERN.test(docName);
}

function parseProtocolHeader(req) {
  const rawHeader = req.headers['sec-websocket-protocol'] || '';
  return rawHeader
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function extractToken(protocols) {
  const tokenProtocol = protocols.find((value) => value.startsWith(TOKEN_PROTOCOL_PREFIX));
  if (!tokenProtocol) {
    return null;
  }
  return tokenProtocol.slice(TOKEN_PROTOCOL_PREFIX.length);
}

function isValidToken(token) {
  try {
    jwt.verify(token, SECRET, { algorithms: JWT_ALGORITHMS });
    return true;
  } catch {
    return false;
  }
}

function rejectUpgrade(socket, statusLine) {
  socket.write(`HTTP/1.1 ${statusLine}\r\n\r\n`);
  socket.destroy();
}

function selectTokenProtocol(protocols) {
  for (const protocol of protocols) {
    if (protocol.startsWith(TOKEN_PROTOCOL_PREFIX)) {
      return protocol;
    }
  }
  return false;
}

const server = http.createServer(handleHealthRequest);
const wss = new WebSocketServer({ noServer: true });

wss.options.handleProtocols = selectTokenProtocol;

wss.on('connection', (ws, req, context) => {
  setupWSConnection(ws, req, { docName: context.docName, gc: true });
});

server.on('upgrade', (req, socket, head) => {
  const docName = parseDocName(req);
  if (!isValidDocName(docName)) {
    rejectUpgrade(socket, '400 Bad Request');
    return;
  }

  const protocols = parseProtocolHeader(req);
  const token = extractToken(protocols);
  if (!token) {
    rejectUpgrade(socket, '401 Unauthorized');
    return;
  }
  if (!isValidToken(token)) {
    rejectUpgrade(socket, '401 Unauthorized');
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { docName });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`y-websocket listening on ws://${HOST}:${PORT}`);
});
