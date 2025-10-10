export default async function handler(req, res) {
  return res.status(200).json({ 
    message: 'Simple endpoint working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    query: req.query
  });
}
