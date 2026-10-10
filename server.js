const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Statik dosyaları sun (public klasörü)
app.use(express.static(path.join(__dirname, 'public')));

// Coinzilla TXT doğrulama dosyası için özel rota
app.get('/fea3f365d619d533a174c3cfe954cbc4.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fea3f365d619d533a174c3cfe954cbc4.txt'));
});

// Diğer tüm istekleri index.html'e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
