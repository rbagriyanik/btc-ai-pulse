const express = require('express');
const axios = require('axios');
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

// Canlı Chat Mesajları
let chatMessages = [
  {
    user: 'Crypto_Bot 🤖',
    text: 'Sohbet alanına hoş geldiniz! Piyasa analizleri ve kullanıcı yorumları burada canlı olarak yayınlanır.',
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    isAi: true
  }
];

// SUI Eklenmiş Popüler Coin Listesi
const SUPPORTED_COINS = {
  'BTC': { symbol: 'BTCUSDT', name: 'Bitcoin' },
  'ETH': { symbol: 'ETHUSDT', name: 'Ethereum' },
  'SOL': { symbol: 'SOLUSDT', name: 'Solana' },
  'SUI': { symbol: 'SUIUSDT', name: 'Sui' },
  'BNB': { symbol: 'BNBUSDT', name: 'BNB' },
  'XRP': { symbol: 'XRPUSDT', name: 'Ripple' },
  'DOGE': { symbol: 'DOGEUSDT', name: 'Dogecoin' },
  'ADA': { symbol: 'ADAUSDT', name: 'Cardano' },
  'AVAX': { symbol: 'AVAXUSDT', name: 'Avalanche' },
  'LINK': { symbol: 'LINKUSDT', name: 'Chainlink' },
  'PEPE': { symbol: 'PEPEUSDT', name: 'Pepe' }
};

// 1. Canlı Fiyat Verisi Endpoint'i
app.get('/api/price/:coin', async (req, res) => {
  try {
    const coinKey = (req.params.coin || 'BTC').toUpperCase();
    const coinInfo = SUPPORTED_COINS[coinKey] || SUPPORTED_COINS['BTC'];

    const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${coinInfo.symbol}`);
    const data = response.data;
    
    res.json({
      coin: coinKey,
      name: coinInfo.name,
      price: parseFloat(data.lastPrice) < 1 ? parseFloat(data.lastPrice).toFixed(6) : parseFloat(data.lastPrice).toFixed(2),
      changePercent: parseFloat(data.priceChangePercent).toFixed(2),
      high: parseFloat(data.highPrice).toFixed(2),
      low: parseFloat(data.lowPrice).toFixed(2),
      volume: parseFloat(data.volume).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: 'Fiyat verisi çekilemedi.' });
  }
});

// 2. Yapay Zeka Analiz Endpoint'i
app.get('/api/analyze/:coin', async (req, res) => {
  try {
    const coinKey = (req.params.coin || 'BTC').toUpperCase();
    const coinInfo = SUPPORTED_COINS[coinKey] || SUPPORTED_COINS['BTC'];

    const btcRes = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${coinInfo.symbol}`);
    const coinData = btcRes.data;

    const prompt = `
Sen kıdemli bir kripto para teknik analistisisin. 
Şu anki ${coinInfo.name} (${coinKey}/USDT) piyasa verileri:
- Anlık Fiyat: $${parseFloat(coinData.lastPrice)}
- 24s Değişim: %${parseFloat(coinData.priceChangePercent).toFixed(2)}
- 24s En Yüksek: $${parseFloat(coinData.highPrice)}
- 24s En Düşük: $${parseFloat(coinData.lowPrice)}

Lütfen yanıtını SADECE geçerli bir JSON formatında döndür:
{
  "alim_bolgesi": "Örn: Destek ve alım aralığı",
  "satim_bolgesi": "Örn: Direnç ve satım aralığı",
  "trend_yonu": "Yükseliş / Düşüş / Yatay",
  "ozet_yorum": "${coinInfo.name} piyasa koşullarına dair 2-3 cümlelik profesyonel Türkçe analiz."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

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

// 3. Chat Mesajlarını Getir
app.get('/api/chat', (req, res) => {
  res.json(chatMessages);
});

// 4. Yeni Kullanıcı Yorumu Ekle
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