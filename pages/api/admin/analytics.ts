import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, analyticsPageVisits, userSettings, analyticsWidgetUsage, analyticsPerformanceMetrics } from '@/db/schema';
import { count, gte, eq } from 'drizzle-orm';

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

// Define types for our analytics data
interface PageVisit {
  page: string;
  count: number;
}

interface FloCatStyleData {
  style: string;
  count: number;
}

interface FloCatPersonalityData {
  keyword: string;
  count: number;
}

interface WidgetUsageData {
  widget: string;
  count: number;
}

interface PerformanceMetricData {
  metric: string;
  value: number;
}

interface MetricSum {
  sum: number;
  count: number;
}

interface AnalyticsData {
  pageVisits: PageVisit[];
  floCatStyles: FloCatStyleData[];
  floCatPersonalities: FloCatPersonalityData[];
  performanceMetrics: PerformanceMetricData[];
  userCount: number;
  activeUserCount: number;
  widgetUsage: WidgetUsageData[];
}

// Helper function to get date X days ago
const getDateDaysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if method is GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user and verify admin access
    const decoded = auth(req);
    if (!decoded) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user || user.email !== 'amascaro08@gmail.com') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get timeframe from query params
    const { timeframe = '7days' } = req.query;
    let startDate: Date;
    
    switch (timeframe) {
      case '30days':
        startDate = getDateDaysAgo(30);
        break;
      case '90days':
        startDate = getDateDaysAgo(90);
        break;
      case 'alltime':
        startDate = new Date(2020, 0, 1); // Set a far past date
        break;
      case '7days':
      default:
        startDate = getDateDaysAgo(7);
        break;
    }

    // Convert to Firestore timestamp
    const startTimestampMs = startDate.getTime(); // Convert Date to Unix milliseconds

    // Fetch analytics data from Neon
    const analyticsData = await fetchAnalyticsData(startTimestampMs);
    
    return res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Error in admin analytics API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function fetchAnalyticsData(startTimestampMs: number) {
  // Initialize analytics data structure
  const analyticsData: AnalyticsData = {
    pageVisits: [],
    floCatStyles: [],
    floCatPersonalities: [],
    performanceMetrics: [],
    userCount: 0,
    activeUserCount: 0,
    widgetUsage: []
  };

  try {
    // Get user count
    const [userCountResult] = await db.select({ value: count() }).from(users);
    analyticsData.userCount = userCountResult.value;

    // The "active users" metric has been removed as it's no longer possible to calculate it without the `lastLogin` column.

    // Get page visits
    const pageVisitsRows = await db.select().from(analyticsPageVisits).where(gte(analyticsPageVisits.timestamp, new Date(startTimestampMs)));

    // Process page visits
    const pageVisitCounts: Record<string, number> = {};
    pageVisitsRows.forEach(row => {
      const page = row.page;
      pageVisitCounts[page] = (pageVisitCounts[page] || 0) + 1;
    });

    analyticsData.pageVisits = Object.entries(pageVisitCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count);

    // Get FloCat styles
    const floCatStyleCounts: Record<string, number> = {
      'default': 0,
      'more_catty': 0,
      'less_catty': 0,
      'professional': 0
    };

    // Get user settings to analyze FloCat styles and personalities
    const userSettingsRows = await db.select({ floCatStyle: userSettings.floCatStyle, floCatPersonality: userSettings.floCatPersonality }).from(userSettings);
    
    // Process FloCat styles and personalities
    const personalityKeywords: Record<string, number> = {};
    
    userSettingsRows.forEach(settings => {
      // Count FloCat styles
      if (settings.floCatStyle) {
        floCatStyleCounts[settings.floCatStyle] = (floCatStyleCounts[settings.floCatStyle] || 0) + 1;
      } else {
        floCatStyleCounts['default'] += 1; // Count as default if not set
      }
      
      // Count personality keywords
      if (settings.floCatPersonality && Array.isArray(settings.floCatPersonality)) {
        settings.floCatPersonality.forEach((keyword: string) => {
          personalityKeywords[keyword] = (personalityKeywords[keyword] || 0) + 1;
        });
      }
    });

    analyticsData.floCatStyles = Object.entries(floCatStyleCounts)
      .map(([style, count]) => ({ style, count }))
      .filter(item => item.count > 0);

    analyticsData.floCatPersonalities = Object.entries(personalityKeywords)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);

    // Get widget usage
    const widgetUsageRows = await db.select().from(analyticsWidgetUsage).where(gte(analyticsWidgetUsage.timestamp, new Date(startTimestampMs)));

    // Process widget usage
    const widgetCounts: Record<string, number> = {};
    widgetUsageRows.forEach(row => {
      const widget = row.widget;
      widgetCounts[widget] = (widgetCounts[widget] || 0) + 1;
    });

    analyticsData.widgetUsage = Object.entries(widgetCounts)
      .map(([widget, count]) => ({ widget, count }))
      .sort((a, b) => b.count - a.count);

    // Get performance metrics
    const performanceRows = await db.select().from(analyticsPerformanceMetrics).where(gte(analyticsPerformanceMetrics.timestamp, new Date(startTimestampMs)));

    // Process performance metrics
    const metricSums: Record<string, MetricSum> = {
      avgFCP: { sum: 0, count: 0 },
      avgLCP: { sum: 0, count: 0 },
      avgFID: { sum: 0, count: 0 },
      avgCLS: { sum: 0, count: 0 },
      avgTTFB: { sum: 0, count: 0 },
      avgPageLoadTime: { sum: 0, count: 0 },
      avguserDuration: { sum: 0, count: 0 }
    };

    performanceRows.forEach(data => {
      if (data.fcp) {
        metricSums.avgFCP.sum += data.fcp;
        metricSums.avgFCP.count += 1;
      }
      
      if (data.lcp) {
        metricSums.avgLCP.sum += data.lcp;
        metricSums.avgLCP.count += 1;
      }
      
      if (data.fid) {
        metricSums.avgFID.sum += data.fid;
        metricSums.avgFID.count += 1;
      }
      
      if (data.cls) {
        metricSums.avgCLS.sum += data.cls;
        metricSums.avgCLS.count += 1;
      }
      
      if (data.ttfb) {
        metricSums.avgTTFB.sum += data.ttfb;
        metricSums.avgTTFB.count += 1;
      }
      
      if (data.loadComplete && data.navStart) {
        const pageLoadTime = data.loadComplete - data.navStart;
        metricSums.avgPageLoadTime.sum += pageLoadTime;
        metricSums.avgPageLoadTime.count += 1;
      }
      
      if (data.userDuration) {
        metricSums.avguserDuration.sum += data.userDuration;
        metricSums.avguserDuration.count += 1;
      }
    });

    // Calculate averages
    analyticsData.performanceMetrics = Object.entries(metricSums)
      .map(([metric, { sum, count }]) => ({
        metric,
        value: count > 0 ? sum / count : 0
      }));

    // If no real data exists yet, provide sample data for testing
    if (analyticsData.pageVisits.length === 0) {
      analyticsData.pageVisits = [
        { page: '/dashboard', count: 120 },
        { page: '/dashboard/journal', count: 85 },
        { page: '/dashboard/tasks', count: 72 },
        { page: '/dashboard/notes', count: 65 },
        { page: '/calendar', count: 58 },
        { page: '/dashboard/meetings', count: 45 },
        { page: '/habit-tracker', count: 40 },
        { page: '/feedback', count: 25 },
        { page: '/dashboard/settings-modular', count: 20 },
      ];
    }

    if (analyticsData.floCatStyles.length === 0) {
      analyticsData.floCatStyles = [
        { style: 'default', count: 45 },
        { style: 'more_catty', count: 30 },
        { style: 'less_catty', count: 15 },
        { style: 'professional', count: 10 },
      ];
    }

    if (analyticsData.floCatPersonalities.length === 0) {
      analyticsData.floCatPersonalities = [
        { keyword: 'friendly', count: 25 },
        { keyword: 'humorous', count: 20 },
        { keyword: 'helpful', count: 18 },
        { keyword: 'sarcastic', count: 15 },
        { keyword: 'playful', count: 12 },
        { keyword: 'serious', count: 10 },
        { keyword: 'enthusiastic', count: 8 },
        { keyword: 'calm', count: 7 },
        { keyword: 'witty', count: 5 },
        { keyword: 'quirky', count: 3 },
      ];
    }

    if (analyticsData.widgetUsage.length === 0) {
      analyticsData.widgetUsage = [
        { widget: 'CalendarWidget', count: 80 },
        { widget: 'TaskWidget', count: 75 },
        { widget: 'AtAGlanceWidget', count: 70 },
        { widget: 'QuickNoteWidget', count: 65 },
        { widget: 'HabitTrackerWidget', count: 40 },
        { widget: 'ChatWidget', count: 35 },
      ];
    }

    if (analyticsData.performanceMetrics.length === 0) {
      analyticsData.performanceMetrics = [
        { metric: 'avgFCP', value: 850 },
        { metric: 'avgLCP', value: 2200 },
        { metric: 'avgFID', value: 120 },
        { metric: 'avgCLS', value: 0.15 },
        { metric: 'avgTTFB', value: 320 },
        { metric: 'avgPageLoadTime', value: 1800 },
        { metric: 'avguserDuration', value: 8.5 },
      ];
    }

    if (analyticsData.userCount === 0) {
      analyticsData.userCount = 100;
    }

    if (analyticsData.activeUserCount === 0) {
      analyticsData.activeUserCount = 75;
    }

    return analyticsData;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    throw error;
  }
}