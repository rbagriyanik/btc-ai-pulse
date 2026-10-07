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

let chatMessages = [
  {
    user: 'Crypto_Bot 🤖',
    text: 'Sohbet alanına hoş geldiniz! Piyasa analizleri ve kullanıcı yorumları burada canlı olarak yayınlanır.',
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    isAi: true
  }
];

// Coin Tanımları ve CoinGecko ID Eşleşmeleri
const SUPPORTED_COINS = {
  'BTC': { symbol: 'BTCUSDT', geckoId: 'bitcoin', name: 'Bitcoin' },
  'ETH': { symbol: 'ETHUSDT', geckoId: 'ethereum', name: 'Ethereum' },
  'SOL': { symbol: 'SOLUSDT', geckoId: 'solana', name: 'Solana' },
  'SUI': { symbol: 'SUIUSDT', geckoId: 'sui', name: 'Sui' },
  'BNB': { symbol: 'BNBUSDT', geckoId: 'binancecoin', name: 'BNB' },
  'XRP': { symbol: 'XRPUSDT', geckoId: 'ripple', name: 'Ripple' },
  'DOGE': { symbol: 'DOGEUSDT', geckoId: 'dogecoin', name: 'Dogecoin' },
  'ADA': { symbol: 'ADAUSDT', geckoId: 'cardano', name: 'Cardano' },
  'AVAX': { symbol: 'AVAXUSDT', geckoId: 'avalanche-2', name: 'Avalanche' },
  'LINK': { symbol: 'LINKUSDT', geckoId: 'chainlink', name: 'Chainlink' },
  'PEPE': { symbol: 'PEPEUSDT', geckoId: 'pepe', name: 'Pepe' }
};

// Fiyat Çekme Yardımcı Fonksiyonu (Binance + CoinGecko Yedekli)
async function getCoinPriceData(coinKey) {
  const coinInfo = SUPPORTED_COINS[coinKey] || SUPPORTED_COINS['BTC'];

  // 1. Önce Binance API dene
  try {
    const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${coinInfo.symbol}`, { timeout: 3000 });
    const rawPrice = parseFloat(res.data.lastPrice);
    return {
      coin: coinKey,
      name: coinInfo.name,
      price: rawPrice < 1 ? rawPrice.toFixed(6) : rawPrice.toFixed(2),
      changePercent: parseFloat(res.data.priceChangePercent).toFixed(2),
      rawPrice: rawPrice
    };
  } catch (bErr) {
    console.log(`Binance ${coinKey} çekilemedi, CoinGecko deneniyor...`);
  }

  // 2. Binance Başarısız Olursa CoinGecko API'den Çek
  try {
    const geckoRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinInfo.geckoId}&vs_currencies=usd&include_24hr_change=true`, { timeout: 4000 });
    const data = geckoRes.data[coinInfo.geckoId];
    const rawPrice = data.usd;
    return {
      coin: coinKey,
      name: coinInfo.name,
      price: rawPrice < 1 ? rawPrice.toFixed(6) : rawPrice.toFixed(2),
      changePercent: parseFloat(data.usd_24h_change || 0).toFixed(2),
      rawPrice: rawPrice
    };
  } catch (gErr) {
    console.error(`CoinGecko hatası:`, gErr.message);
    throw new Error('Fiyat servislerine ulaşılamadı');
  }
}

// 1. Canlı Fiyat Endpoint'i
app.get('/api/price/:coin', async (req, res) => {
  try {
    const coinKey = (req.params.coin || 'BTC').toUpperCase();
    const data = await getCoinPriceData(coinKey);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Fiyat verisi çekilemedi.' });
  }
});

// 2. Yapay Zeka Analiz Endpoint'i
app.get('/api/analyze/:coin', async (req, res) => {
  try {
    const coinKey = (req.params.coin || 'BTC').toUpperCase();
    const coinData = await getCoinPriceData(coinKey);

    const prompt = `
Sen kıdemli bir kripto para teknik analistisisin. 
Şu anki ${coinData.name} (${coinKey}/USDT) piyasa verileri:
- Anlık Fiyat: $${coinData.price}
- 24s Değişim: %${coinData.changePercent}

Lütfen yanıtını SADECE geçerli bir JSON formatında döndür:
{
  "alim_bolgesi": "Örn: Destek ve alım aralığı",
  "satim_bolgesi": "Örn: Direnç ve satım aralığı",
  "trend_yonu": "Yükseliş / Düşüş / Yatay",
  "ozet_yorum": "${coinData.name} piyasa koşullarına dair 2-3 cümlelik profesyonel Türkçe analiz."
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

// 3. Chat Mesajları
app.get('/api/chat', (req, res) => {
  res.json(chatMessages);
});

// 4. Chat Mesaj Gönder
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