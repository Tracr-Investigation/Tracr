const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const decoding = require('lib0/decoding');
const { setupWSConnection } = require('y-websocket/bin/utils');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 1234;
const TOKEN_PROTOCOL_PREFIX = 'tracr.token.';
const ROOM_PREFIX = 'document_';
const ROOM_NAME_PATTERN = /^document_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const JWT_ALGORITHMS = ['HS256'];
const SESSION_SCOPE = 'session';
const ACCESS_CHECK_TIMEOUT_MS = 5000;
// Protocole y-websocket : messageSync = 0 ; sous-types syncStep2 = 1 et update = 2 modifient le document.
const MESSAGE_SYNC = 0;
const SYNC_WRITE_TYPES = new Set([1, 2]);
const HEALTH_RESPONSE_BODY = 'tracr-websocket';

const HOST = process.env.HOST || DEFAULT_HOST;
const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const SECRET = process.env.SECRET_KEY;
const BACKEND_URL = (process.env.BACKEND_URL || 'http://backend:8000').replace(/\/$/, '');

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
    const payload = jwt.verify(token, SECRET, { algorithms: JWT_ALGORITHMS });
    // Seul un jeton de session ouvre une room (jamais un jeton de challenge MFA).
    return payload.scope === SESSION_SCOPE;
  } catch {
    return false;
  }
}

// Demande au backend si l'utilisateur est membre de l'enquete du document.
// Retourne { readOnly } si l'acces est accorde, null sinon (non membre, inexistant, backend KO).
async function fetchDocumentAccess(docName, token) {
  const documentId = docName.slice(ROOM_PREFIX.length);
  try {
    const res = await fetch(`${BACKEND_URL}/documents/${documentId}/collab-access`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(ACCESS_CHECK_TIMEOUT_MS),
    });
    if (!res.ok) {
      return null;
    }
    const body = await res.json();
    return { readOnly: body.read_only !== false };
  } catch {
    return null;
  }
}

function isWriteMessage(data) {
  try {
    const decoder = decoding.createDecoder(new Uint8Array(data));
    if (decoding.readVarUint(decoder) !== MESSAGE_SYNC) {
      return false;
    }
    return SYNC_WRITE_TYPES.has(decoding.readVarUint(decoder));
  } catch {
    return true;
  }
}

// Lecteur : on ignore silencieusement les messages qui modifieraient le document
// (syncStep2 / update) ; la synchro initiale et l'awareness (curseurs) restent permises.
function enforceReadOnly(ws) {
  const originalOn = ws.on.bind(ws);
  ws.on = (event, listener) => {
    if (event !== 'message') {
      return originalOn(event, listener);
    }
    return originalOn(event, (data, ...rest) => {
      if (!isWriteMessage(data)) {
        listener(data, ...rest);
      }
    });
  };
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
  if (context.readOnly) {
    enforceReadOnly(ws);
  }
  setupWSConnection(ws, req, { docName: context.docName, gc: true });
});

server.on('upgrade', async (req, socket, head) => {
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

  // Un JWT valide ne suffit pas : l'utilisateur doit etre membre de l'enquete du document.
  const access = await fetchDocumentAccess(docName, token);
  if (!access) {
    rejectUpgrade(socket, '404 Not Found');
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { docName, readOnly: access.readOnly });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`y-websocket listening on ws://${HOST}:${PORT}`);
});
