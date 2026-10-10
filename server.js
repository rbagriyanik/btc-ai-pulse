const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/fea3f365d619d533a174c3cfe954cbc4.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fea3f365d619d533a174c3cfe954cbc4.txt'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
