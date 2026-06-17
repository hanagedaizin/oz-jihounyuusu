import axios from 'axios';

export interface NewsItem {
  id: string;
  title: string;
  pubDate: string;
  link: string;
  source: string;
  videoUrl?: string;
}

let cachedPool: NewsItem[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 60_000;
let fetchPromise: Promise<NewsItem[]> | null = null;

const mockVideos: NewsItem[] = [
  { id: 'yt-1', title: 'NHK News Live', pubDate: new Date().toISOString(), link: '#', source: 'NHK', videoUrl: 'https://www.youtube.com/embed/Nb0ZoVU0vtM' },
  { id: 'yt-2', title: 'BBC World News', pubDate: new Date().toISOString(), link: '#', source: 'BBC', videoUrl: 'https://www.youtube.com/embed/9Au6i0s8bjA' }
];

export const getNewsPool = async (): Promise<NewsItem[]> => {
  const now = Date.now();
  if (cachedPool.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return cachedPool;
  }
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const allNews: NewsItem[] = [];

    try {
      const rssUrls = [
        'https://www.nhk.or.jp/rss/news/cat0.xml',
        'https://www.nhk.or.jp/rss/news/cat1.xml',
        'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja'
      ];
      const randomUrl = rssUrls[Math.floor(Math.random() * rssUrls.length)];
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(randomUrl)}`;
      const response = await axios.get(apiUrl);
      if (response.data?.items?.length) {
        response.data.items.forEach((item: { title: string; pubDate: string; link: string }) => {
          allNews.push({
            id: 'rss-' + Math.random().toString(36).substr(2, 9),
            title: item.title,
            pubDate: item.pubDate,
            link: item.link,
            source: response.data.feed?.title || 'News'
          });
        });
      }
    } catch (e) {
      console.error('RSS fetch failed:', e);
    }

    // Always add mock videos as fallback
    allNews.push(...mockVideos);

    // If still empty, use mock news items
    if (allNews.length === 0) {
      allNews.push(...getMockNews());
    }

    cachedPool = allNews;
    lastFetchTime = Date.now();
    fetchPromise = null;
    return cachedPool;
  })().catch(err => {
    fetchPromise = null;
    throw err;
  });
  return fetchPromise;
};

export const getBalancedRandomItem = (pool: NewsItem[]): NewsItem | null => {
  if (pool.length === 0) return null;
  const articles = pool.filter(n => !n.videoUrl);
  const videos = pool.filter(n => !!n.videoUrl);
  if (articles.length === 0 && videos.length > 0) return videos[Math.floor(Math.random() * videos.length)];
  if (videos.length === 0 && articles.length > 0) return articles[Math.floor(Math.random() * articles.length)];
  if (Math.random() < 0.5) return videos[Math.floor(Math.random() * videos.length)];
  else return articles[Math.floor(Math.random() * articles.length)];
};

export const fetchLatestNews = async (): Promise<NewsItem[]> => getNewsPool();

const getMockNews = (): NewsItem[] => {
  const sources = ['Global Network', 'OZ Central News', 'Tech Daily', 'World Update'];
  const topics = ['System Update', 'New AI Breakthrough', 'Traffic Alert', 'Weather Warning', 'Virtual Event', 'Market Update'];
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `mock-${Date.now()}-${i}`,
    title: `${topics[Math.floor(Math.random() * topics.length)]}: 仮想空間OZでの最新の動向について。`,
    pubDate: new Date().toISOString(),
    link: '#',
    source: sources[Math.floor(Math.random() * sources.length)]
  }));
};