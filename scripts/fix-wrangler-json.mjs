import fs from 'fs';

const path = 'dist/server/wrangler.json';
if (fs.existsSync(path)) {
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  
  // Remove ASSETS binding (reserved in Cloudflare Pages)
  if (data.assets) {
    delete data.assets;
  }
  
  // Remove SESSION binding if it has no id
  if (data.kv_namespaces) {
    data.kv_namespaces = data.kv_namespaces.filter(kv => kv.binding !== 'SESSION');
  }
  
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  console.log('Successfully fixed wrangler.json for Cloudflare Pages deployment.');
}
