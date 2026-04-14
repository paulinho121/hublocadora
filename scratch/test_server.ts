import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('OK'));
app.listen(3002, () => {
  console.log('Basic server listening on 3002');
  process.exit(0);
});
