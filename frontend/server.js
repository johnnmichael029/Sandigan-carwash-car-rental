import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Apply Security Headers 
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google.com", "https://www.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"], // Allow images from all secure sources
            connectSrc: ["'self'", "wss:", "https:", "http://localhost:*", "ws://localhost:*"],
            frameSrc: ["'self'", "https://www.google.com"],
        },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' } // Essential for loading images from diverse CDNs
}));

const staticPath = path.resolve(__dirname);
console.log(`[INFO] Serving static files from: ${staticPath}`);

// 1. First, serve static files explicitly
// This ensures that /assets/xxx.css or images are served with the correct MIME type
app.use(express.static(staticPath, {
    maxAge: '1d',
    index: false // We will handle the index manually for the SPA
}));

// 2. Serve the main index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// 3. SPA Fallback: Redirect all other non-file requests to index.html (Express 5 safe)
app.use((req, res) => {
    // If the request is for a file that doesn't exist (e.g. broken .css), 
    // don't send index.html, just 404.
    if (req.url.includes('.')) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Frontend Secure Server listening on port ${port}`);
});
