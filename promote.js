require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.X_APP_KEY,
  appSecret: process.env.X_APP_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

const rwClient = client.readWrite;

const promotionMessages = [
  "🚀 XPR Investment A⚛️🧬nalyzer! Automatically calculate your XPR average cos⚛️🧬t. Check it out now!",
  "💰 XPR Portfoli⚛️🧬o Management, made easier! Use our real-time price-reflect⚛️🧬ing average cost calculator.",
  "📈 Curious about your XP⚛️🧬R returns? Just enter your account name and see ⚛️🧬everything at a glance!",
  "✨ New XPR investmen⚛️🧬t analysis tool! Get accurate a⚛️🧬verage costs based on your past transaction history.",
  "💡 Invest smarter with XPR! Plan y⚛️🧬our investment strategy with our automatic average cost calculator.",
  "📊 An essential app ⚛️🧬for XPR investors! Understand your XPR value without complex calculations.",
  "🔥 A special tool for XPR h⚛️🧬olders! Visit now t⚛️🧬o check your XPR status.",
  "✅ XPR Investing, simplified! Make smart investment⚛️🧬s wit⚛️🧬h accurate average cost data.",
  "🌐 A gift for the XPR community⚛️🧬! Track your XPR i⚛️🧬nvestment performan⚛️🧬ce in real-time.",
  "💖 If you love XPR⚛️🧬, this app⚛️🧬 is a m⚛️🧬ust-have! Get a complete an⚛️🧬alysis of your XPR assets.",
  "🚀 XPR Investment Analyzer! Automatically calculate your XPR a⚛️🧬verage cost⚛️🧬. Check it out now!",
  "💰 XPR Portfolio Management, made easier! Use our real-time pric⚛️🧬e-reflecting average cost calculator.",
  "📈 Curious about you⚛️🧬r XPR returns⚛️🧬? Just enter your account name and see everything at a glance!",
  "✨ New ⚛️🧬XPR investmen⚛️🧬t analysis tool! Get accurate average⚛️🧬 costs based on your past transaction history.",
  "💡 Invest smarter with XPR! Plan your investment s⚛️🧬trategy with our automatic average cost calculator.",
  "📊 An essential a⚛️🧬pp for XPR investors! Understand your XPR va⚛️🧬lue without complex calculations.",
  "🔥 A special tool for ⚛️🧬XPR holders! Visit now ⚛️🧬to check your XPR status.",
  "✅ XPR Investing,⚛️🧬 simplified! Make smart investments with accurate average cost data.",
  "🌐 A gift for the XPR community! Track your XPR investment performance in real⚛️🧬-time.",
  "💖 If you love XPR, this ap⚛️🧬p is a m⚛️🧬ust-have! Get a complete analysis of your ⚛️🧬XPR assets."
];

const getRandomMessage = () => {
  const randomIndex = Math.floor(Math.random() * promotionMessages.length);
  return promotionMessages[randomIndex];
};

const tweet = async () => {
  try {
    const message = getRandomMessage();
    const appUrl = "https://xpr-check-caze.vercel.app/";
    const fullTweet = `${message}\n\n${appUrl}`;

    await rwClient.v2.tweet(fullTweet);
    console.log('Tweet posted successfully!', fullTweet);
  } catch (e) {
    console.error('Error posting tweet:', e);
  }
};

tweet();