import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fetchItemMeta, injectMetaIntoHtml } from './src/server/ogHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.resolve(distPath, 'index.html');

// Intercept product and pack URLs for dynamic OpenGraph metadata
app.get(['/produit/:id', '/pack/:id'], async (req, res, next) => {
  try {
    const isPack = req.path.startsWith('/pack');
    const type = isPack ? 'pack' : 'produit';
    const id = req.params.id;
    const origin = `${req.protocol}://${req.get('host')}`;

    const meta = await fetchItemMeta(type, id, origin);

    if (fs.existsSync(indexHtmlPath)) {
      const template = fs.readFileSync(indexHtmlPath, 'utf-8');
      const finalHtml = injectMetaIntoHtml(template, meta);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(finalHtml);
    }
  } catch (err) {
    console.error('Server OG error:', err);
  }
  next();
});

// Serve static assets if built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(indexHtmlPath);
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
