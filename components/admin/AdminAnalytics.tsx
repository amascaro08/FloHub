import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Define types for our analytics data
interface PageVisit {
  page: string;
  count: number;
}

interface FloCatStyleData {
  style: string;
  count: number;
}

interface PerformanceData {
  metric: string;
  value: number;
}

interface UserInsight {
  category: string;
  data: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AdminAnalytics: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  const [loading, setLoading] = useState(true);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [floCatStyles, setFloCatStyles] = useState<FloCatStyleData[]>([]);
  const [floCatPersonalities, setFloCatPersonalities] = useState<{keyword: string, count: number}[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceData[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [widgetUsage, setWidgetUsage] = useState<{widget: string, count: number}[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7days');

  // Check if user is authorized (client-side only)
  const isClient = typeof window !== 'undefined';
  
  useEffect(() => {
    if (isClient && session?.user?.email !== 'amascaro08@gmail.com') {
      router.push('/dashboard');
    }
  }, [session, router, isClient]);

  // Fetch analytics data (client-side only)
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/analytics?timeframe=${selectedTimeframe}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        
        const data = await response.json();
        
        setPageVisits(data.pageVisits || []);
        setFloCatStyles(data.floCatStyles || []);
        setFloCatPersonalities(data.floCatPersonalities || []);
        setPerformanceMetrics(data.performanceMetrics || []);
        setUserCount(data.userCount || 0);
        setActiveUserCount(data.activeUserCount || 0);
        setWidgetUsage(data.widgetUsage || []);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setLoading(false);
      }
    };

    if (isClient && session?.user?.email === 'amascaro08@gmail.com') {
      fetchAnalytics();
    }
  }, [session, selectedTimeframe, isClient]);

  // Show loading state during SSR or while fetching data
  if (loading || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Don't render content for unauthorized users (will redirect via useEffect)
  if (isClient && session?.user?.email !== 'amascaro08@gmail.com') {
    return null;
  }

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="alltime">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Total Users</h3>
          <p className="text-3xl font-bold">{userCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Active Users</h3>
          <p className="text-3xl font-bold">{activeUserCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Avg. Session Duration</h3>
          <p className="text-3xl font-bold">
            {performanceMetrics.find(m => m.metric === 'avgSessionDuration')?.value.toFixed(2) || 0} min
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Avg. Page Load Time</h3>
          <p className="text-3xl font-bold">
            {performanceMetrics.find(m => m.metric === 'avgPageLoadTime')?.value.toFixed(2) || 0} ms
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Visited Pages */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Most Visited Pages</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pageVisits.slice(0, 10)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="page" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FloCat Style Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">FloCat Style Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={floCatStyles}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }: { name: string, percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="style"
                >
                  {floCatStyles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string, props: any) => [`${value} users`, props.payload.style]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Widget Usage */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Widget Usage</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={widgetUsage}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="widget" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FloCat Personality Keywords */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Popular FloCat Personality Keywords</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={floCatPersonalities.slice(0, 10)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="keyword" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#FF8042" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceMetrics.filter(m => 
                ['avgFCP', 'avgLCP', 'avgFID', 'avgCLS', 'avgTTFB'].includes(m.metric)
              )}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)} ms`, 'Value']} />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Value (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best Practices Insights */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Best Practice Insights</h2>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium">FloCat Personality Recommendation</h3>
            <p className="text-sm mt-1">
              {floCatStyles.length > 0 
                ? `Most users prefer the "${floCatStyles.sort((a, b) => b.count - a.count)[0].style}" FloCat style. Consider making this the default for new users.`
                : 'Not enough data to make recommendations yet.'}
            </p>
          </div>
          
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-medium">Widget Optimization</h3>
            <p className="text-sm mt-1">
              {widgetUsage.length > 0 
                ? `The "${widgetUsage.sort((a, b) => b.count - a.count)[0].widget}" widget is most popular. Consider optimizing its loading priority.`
                : 'Not enough data to make recommendations yet.'}
            </p>
          </div>
          
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="font-medium">Performance Insight</h3>
            <p className="text-sm mt-1">
              {(performanceMetrics.find(m => m.metric === 'avgLCP')?.value || 0) > 2500
                ? 'Largest Contentful Paint (LCP) is above the recommended 2.5s threshold. Consider optimizing image loading and reducing JavaScript bundle size.'
                : 'Performance metrics are within acceptable ranges. Continue monitoring for any degradation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;