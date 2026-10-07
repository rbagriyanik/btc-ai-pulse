const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

let chatMessages = [
  {
    user: 'Crypto_Bot 🤖',
    text: 'Sohbet alanına hoş geldiniz! Piyasa analizleri ve kullanıcı yorumları burada canlı olarak yayınlanır.',
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    isAi: true
  }
];

// 1. Yapay Zeka Analiz Endpoint'i
app.post('/api/analyze', async (req, res) => {
  try {
    const { coinKey, coinName, price, changePercent } = req.body;

    const prompt = `
Sen kıdemli bir kripto para teknik analistisisin. 
Şu anki ${coinName || coinKey} (${coinKey}/USDT) piyasa verileri:
- Anlık Fiyat: $${price}
- 24s Değişim: %${changePercent}

Lütfen yanıtını SADECE geçerli bir JSON formatında döndür (başka metin ekleme):
{
  "alim_bolgesi": "Destek ve alım aralığı",
  "satim_bolgesi": "Direnç ve satım aralığı",
  "trend_yonu": "Yükseliş / Düşüş / Yatay",
  "ozet_yorum": "${coinName || coinKey} piyasa koşullarına dair 2-3 cümlelik profesyonel Türkçe analiz."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    // Chat alanına bot mesajı ekle
    chatMessages.push({
      user: 'Crypto_Bot 🤖',
      text: `📊 ${coinKey} ANALİZİ: Trend: ${aiResponse.trend_yonu} | Alım: ${aiResponse.alim_bolgesi} | Satım: ${aiResponse.satim_bolgesi}`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      isAi: true
    });

    res.json(aiResponse);

  } catch (error) {
    console.error("AI Analiz Hatası:", error);
    res.status(500).json({ error: 'Yapay zeka analizi oluşturulamadı.' });
  }
});

// 2. Chat Mesajlarını Getir
app.get('/api/chat', (req, res) => {
  res.json(chatMessages);
});

// 3. Chat Mesajı Ekle
app.post('/api/chat', (req, res) => {
  const { user, text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Mesaj boş olamaz.' });
  }

  const newMessage = {
    user: user && user.trim() !== '' ? user.trim() : 'Anonim Trader',
    text: text.trim(),
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    isAi: false
  };

  chatMessages.push(newMessage);
  if (chatMessages.length > 50) {
    chatMessages.shift();
  }

  res.json(newMessage);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});