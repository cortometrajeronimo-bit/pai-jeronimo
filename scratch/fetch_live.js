const https = require('https');

https.get('https://pai-jeronimo.vercel.app/catering', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const matches = data.match(/page-[a-z0-9]+\.js/g);
    if (matches) {
      console.log('Found chunks:', Array.from(new Set(matches)));
    } else {
      console.log('No page chunks found in HTML.');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
