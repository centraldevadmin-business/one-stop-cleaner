// Minimal JSON body parser.
//
// Replaces `express.json()` (which pulls in body-parser -> raw-body ->
// iconv-lite, whose Node stream code doesn't bundle cleanly on Workers). Our
// API only speaks JSON, so this is a drop-in that reads the request body and
// parses it without the charset/iconv machinery.

export function jsonBodyParser() {
  return (req, res, next) => {
    // Skip if there's no body to read.
    if (req.method === 'GET' || req.method === 'HEAD' || req._body) {
      return next();
    }

    let size = 0;
    const maxSize = 1024 * 1024; // 1 MiB cap.
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        return res.status(413).json({ error: 'Payload too large.' });
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        req.body = {};
        return next();
      }
      try {
        req.body = JSON.parse(raw);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }
      next();
    });

    req.on('error', (err) => next(err));
  };
}

export default jsonBodyParser;
