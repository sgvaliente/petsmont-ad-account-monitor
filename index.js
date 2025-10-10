// Basic entry point for Vercel
export default function handler(req, res) {
  return res.status(200).json({ 
    message: 'Root endpoint working!',
    timestamp: new Date().toISOString()
  });
}
