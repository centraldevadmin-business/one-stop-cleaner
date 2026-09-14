// Bridges an Express app to a Cloudflare Workers `fetch` handler.
//
// Express needs a Node `http.ServerResponse`, but a Workers fetch handler only
// has a Fetch API `Request`/`Response`. The loopback http.Server approach fails
// in the Workers runtime because there is no loopback networking.
//
// This adapter reads the entire request body into a Buffer synchronously, then
// builds minimal Node-compatible request/response objects that Express can
// consume. It works in both Node and the Workers runtime.

import { Readable } from 'node:stream';
/**
 * Read a Fetch body (ReadableStream or Buffer) into a Node Buffer.
 */
async function readBody(request) {
  const body = request.body;
  if (!body) return null;
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return chunks.length ? Buffer.concat(chunks) : null;
  }
  return Buffer.from(body);
}

/**
 * Build a minimal Node-like request object that Express can consume.
 *
 * The request body is already buffered synchronously (see readBody), so we
 * don't need a real stream. We set `req.body` directly and mark `req._body`
 * so body-parser skips reading the stream. We still expose `on()`/`resume()`
 * so middleware that expects a stream doesn't crash.
 */
function makeRequest(request, bodyBuffer) {
  const req = {
    method: request.method,
    url: request.url,
    httpVersion: '1.1',
    httpVersionMajor: '1',
    httpVersionMinor: '1',
    socket: {},
    connection: {},
    headers: {},
    body: undefined,
    _body: false,
    readable: false,
    destroyed: false,
  };

  // Normalize headers.
  for (const [key, value] of request.headers.entries()) {
    req.headers[key.toLowerCase()] = value;
  }

  // Parse and set the body directly so body-parser skips stream reading.
  if (bodyBuffer && bodyBuffer.length > 0) {
    const raw = bodyBuffer.toString('utf8').trim();
    if (raw) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = raw;
      }
    }
  }
  req._body = true;

  // Stream-like no-ops for middleware that expects them.
  req.on = () => req;
  req.once = () => req;
  req.removeListener = () => req;
  req.removeAllListeners = () => req;
  req.resume = () => req;
  req.resume = () => req;
  req.destroy = () => req;
  req.emit = () => false;
  req.readable = true;

  return req;
}

/**
 * Build a minimal Node-like response object that Express can write to.
 */
function makeResponse() {
  const res = {};
  res.statusCode = 200;
  res.statusMessage = 'OK';
  res._headers = {};
  res._chunks = [];
  res.headersSent = false;
  res.finished = false;
  res.writable = true;
  res.socket = {};
  res.connection = res.socket;
  res.httpVersion = '1.1';
  res.httpVersionMajor = '1';
  res.httpVersionMinor = '1';

  res.setHeader = (name, value) => {
    res._headers[name.toLowerCase()] = value;
  };
  res.getHeader = (name) => res._headers[name.toLowerCase()];
  res.removeHeader = (name) => {
    delete res._headers[name.toLowerCase()];
  };
  res.getHeaderNames = () => Object.keys(res._headers);
  res.getHeaders = () => ({ ...res._headers });
  res.writeHead = (statusCode, statusMessage, headers) => {
    res.statusCode = statusCode;
    if (typeof statusMessage === 'string') res.statusMessage = statusMessage;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        res._headers[k.toLowerCase()] = v;
      }
    }
    return res;
  };
  // Express calls res.status(code).json(...) throughout its handlers. Without
  // this, async handlers that set a non-200 status throw synchronously
  // ("res.status is not a function"), which hangs the request until the
  // Workers runtime times out (1101).
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.write = (chunk) => {
    if (chunk) { console.log("WRITE", chunk.toString()); res._chunks.push(Buffer.from(chunk)); }
    return true;
  };
  res.end = (data) => {
    if (data) { console.log("END", data.toString()); res._chunks.push(Buffer.from(data)); }
    res.headersSent = true;
    res.finished = true;
    res.writable = false;
    const body = res._chunks.length ? Buffer.concat(res._chunks) : null;
    const headers = { ...res._headers };
    if (body && !headers['content-length']) {
      headers['content-length'] = String(body.length);
    }
    res._response = new Response(body, { status: res.statusCode, headers });
    return res._response;
  };
  res.send = (data) => res.end(data);
  res.json = (data) => {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(data));
  };
  // Note: res.send/res.json reference res.end via property access (res.end),
  // NOT via closure, so reassigning res.end later (in runExpress) still works.
  res.on = () => res;
  res.once = () => res;
  res.emit = () => false;
  res.removeListener = () => res;
  return res;
}

/**
 * Run an Express `app` against a Fetch API `Request` and resolve with a Fetch
 * API `Response`. Safe to call repeatedly.
 */
export async function runExpress(app, request) {
  const bodyBuffer = await readBody(request);
  const req = makeRequest(request, bodyBuffer);
  const res = makeResponse();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(res._response);
    };

    // Express does NOT await async route handlers, so we cannot rely on a
    // fixed setTimeout. Instead we resolve as soon as Express finishes writing
    // the response (it calls res.end() via res.json()/res.send()).
    // Wrap res.end FIRST, then rebind res.json/res.send to the wrapped version.
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      const result = originalEnd(...args);
      finish();
      return result;
    };
    res.json = res.json.bind(res);
    res.send = res.send.bind(res);

    // Safety net: if Express never finishes the response (e.g. an async
    // handler hangs), resolve after a timeout so the request never hangs
    // forever and triggers a Workers 1101 timeout.
    const safetyTimer = setTimeout(() => {
      if (!res.finished) res.end();
      finish();
    }, 8000);

    try {
      app(req, res);
      if (res.finished) finish();
    } catch (err) {
      console.error('ADAPTER APP ERROR:', err && err.stack ? err.stack : err);
      reject(err);
    }
  });
}

export default runExpress;
