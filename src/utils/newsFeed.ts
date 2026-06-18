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
  { id: 'live-1', title: 'NHK WORLD-JAPAN News Live', pubDate: new Date().toISOString(), link: 'https://www3.nhk.or.jp/news/', source: 'NHK WORLD-JAPAN', videoUrl: 'https://media-tyo.hls.nhkworld.jp/hls/w/live/master.m3u8' },
  { id: 'live-2', title: 'BBC News Live', pubDate: new Date().toISOString(), link: 'https://www.bbc.com/news', source: 'BBC News', videoUrl: 'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/mobile_wifi_main_sd_abr_v2.m3u8' },
  { id: 'live-3', title: 'DW News Live', pubDate: new Date().toISOString(), link: 'https://www.dw.com/en/live-tv/channel-english', source: 'DW', videoUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8' },
  { id: 'live-4', title: 'FRANCE 24 English Live', pubDate: new Date().toISOString(), link: 'https://www.france24.com/en/live', source: 'FRANCE 24', videoUrl: 'https://live.france24.com/hls/live/2037218/F24_EN_HI_HLS/master_5000.m3u8' },
  { id: 'live-5', title: 'Al Jazeera English Live', pubDate: new Date().toISOString(), link: 'https://www.aljazeera.com/video/live', source: 'Al Jazeera English', videoUrl: 'https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8' },
  { id: 'live-6', title: 'CBS News 24/7 Live', pubDate: new Date().toISOString(), link: 'https://www.cbsnews.com/live/', source: 'CBS News', videoUrl: 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8' },
  { id: 'live-7', title: 'Sky News Arabia Live', pubDate: new Date().toISOString(), link: 'https://english.skynewsarabia.com/live', source: 'Sky News Arabia', videoUrl: 'https://stream.skynewsarabia.com/hls/sna_720.m3u8' },
  { id: 'live-8', title: 'TRT World Live', pubDate: new Date().toISOString(), link: 'https://www.trtworld.com/live', source: 'TRT World', videoUrl: 'https://tv-trtworld.medya.trt.com.tr/master_1080.m3u8' },
  { id: 'live-9', title: 'CNA Live', pubDate: new Date().toISOString(), link: 'https://www.channelnewsasia.com/watch', source: 'CNA', videoUrl: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index.m3u8' },
  { id: 'live-10', title: 'Euronews English Live', pubDate: new Date().toISOString(), link: 'https://www.euronews.com/live', source: 'Euronews', videoUrl: 'https://aegis-cloudfront-1.tubi.video/b1c4d439-03a5-4c40-ae9d-90a183e010c9/euronews-en.m3u8' },
  { id: 'live-11', title: 'ABC News Australia Live', pubDate: new Date().toISOString(), link: 'https://www.abc.net.au/news/newschannel', source: 'ABC News Australia', videoUrl: 'https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8' }
];

const getYoutubeVideoId = (url: URL): string | null => {
  if (url.hostname === 'youtu.be') {
    return url.pathname.replace(/^\//, '').split(/[/?#]/)[0] || null;
  }

  const watchId = url.searchParams.get('v');
  if (watchId) return watchId;

  const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/);
  if (embedMatch) return embedMatch[1];

  const liveMatch = url.pathname.match(/^\/live\/([^/?#]+)/);
  if (liveMatch) return liveMatch[1];

  return null;
};

const getYoutubeChannelId = (url: URL): string | null => {
  const match = url.pathname.match(/^\/(?:channel\/)?([^/?#]+)/);
  return match?.[1]?.startsWith('UC') ? match[1] : null;
};

const appendQueryParams = (url: string, params: URLSearchParams): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
};

const isHlsUrl = (url: string): boolean => /(^|\?)https?:\/\/[^?]+\.m3u8($|&)/i.test(url) || /\.m3u8($|\?)/i.test(url);

export const getPlayableVideoUrl = (videoUrl: string, options: { autoplay?: boolean; muted?: boolean; controls?: boolean } = {}): string => {
  if (isHlsUrl(videoUrl)) {
    return videoUrl;
  }

  const params = new URLSearchParams({
    autoplay: options.autoplay === false ? '0' : '1',
    mute: options.muted === false ? '0' : '1',
    controls: options.controls === false ? '0' : '1',
    playsinline: '1',
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
  });

  if (window.location.origin && window.location.origin !== 'null') {
    params.set('origin', window.location.origin);
  }

  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/embed/live_stream') {
        url.searchParams.set('autoplay', params.get('autoplay') || '1');
        url.searchParams.set('mute', params.get('mute') || '1');
        url.searchParams.set('controls', params.get('controls') || '1');
        url.searchParams.set('playsinline', '1');
        url.searchParams.set('enablejsapi', '1');
        url.searchParams.set('rel', '0');
        url.searchParams.set('modestbranding', '1');
        if (window.location.origin && window.location.origin !== 'null') {
          url.searchParams.set('origin', window.location.origin);
        }
        return url.toString();
      }

      const videoId = getYoutubeVideoId(url);
      if (videoId) {
        const embedUrl = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
        params.forEach((value, key) => embedUrl.searchParams.set(key, value));
        return embedUrl.toString();
      }

      const channelId = getYoutubeChannelId(url);
      if (channelId) {
        const embedUrl = new URL('https://www.youtube.com/embed/live_stream');
        embedUrl.searchParams.set('channel', channelId);
        params.forEach((value, key) => embedUrl.searchParams.set(key, value));
        return embedUrl.toString();
      }
    }

    if (host === 'youtu.be') {
      const videoId = getYoutubeVideoId(url);
      if (videoId) {
        const embedUrl = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
        params.forEach((value, key) => embedUrl.searchParams.set(key, value));
        return embedUrl.toString();
      }
    }
  } catch {
    return appendQueryParams(videoUrl, params);
  }

  return appendQueryParams(videoUrl, params);
};

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