'use client'

import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, MapPin, RefreshCw } from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

interface WidgetProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  colSpan?: number;
  rowSpan?: number;
  isCompact?: boolean;
  isHero?: boolean;
}

const WeatherDashboardWidget: React.FC<WidgetProps> = ({ 
  size = 'medium', 
  isCompact = false, 
  isHero = false 
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return <Sun className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-yellow-500`} />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-gray-500`} />;
    } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <CloudRain className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-blue-500`} />;
    } else if (conditionLower.includes('snow')) {
      return <CloudSnow className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-blue-300`} />;
    } else if (conditionLower.includes('wind')) {
      return <Wind className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-gray-600`} />;
    }
    return <Thermometer className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-orange-500`} />;
  };

  // Free weather data using IP geolocation and open weather APIs
  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      let locationData;
      
      // Step 1: Try multiple IP geolocation services for fallback
      try {
        const locationResponse = await fetch('https://ipapi.co/json/');
        if (!locationResponse.ok) throw new Error('Primary service failed');
        locationData = await locationResponse.json();
        if (locationData.error) throw new Error('Primary service error');
      } catch (err) {
        // Fallback to alternative service
        try {
          const fallbackResponse = await fetch('https://api.ipify.org?format=json');
          if (fallbackResponse.ok) {
            const ipData = await fallbackResponse.json();
            // Use a default location (San Francisco) if we can't get precise location
            locationData = { 
              latitude: 37.7749, 
              longitude: -122.4194,
              city: 'San Francisco',
              country_name: 'United States'
            };
          } else {
            throw new Error('All location services failed');
          }
        } catch (fallbackErr) {
          // Use a default location if all services fail
          locationData = { 
            latitude: 37.7749, 
            longitude: -122.4194,
            city: 'Default Location',
            country_name: 'Weather Service'
          };
        }
      }

      // Step 2: Get weather data using open-meteo (free, no API key needed)
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${locationData.latitude}&longitude=${locationData.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error('Unable to get weather data');
      }

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;

      // Map weather codes to conditions
      const getConditionFromCode = (code: number) => {
        if (code === 0) return { condition: 'Clear', description: 'Clear sky' };
        if (code <= 3) return { condition: 'Cloudy', description: 'Partly cloudy' };
        if (code <= 48) return { condition: 'Cloudy', description: 'Overcast' };
        if (code <= 67) return { condition: 'Rain', description: 'Light rain' };
        if (code <= 77) return { condition: 'Rain', description: 'Heavy rain' };
        if (code <= 82) return { condition: 'Rain', description: 'Rain showers' };
        if (code <= 86) return { condition: 'Snow', description: 'Snow showers' };
        if (code <= 99) return { condition: 'Rain', description: 'Thunderstorm' };
        return { condition: 'Clear', description: 'Unknown' };
      };

      const conditionInfo = getConditionFromCode(current.weather_code);

      setWeather({
        temperature: Math.round(current.temperature_2m),
        condition: conditionInfo.condition,
        description: conditionInfo.description,
        location: `${locationData.city}, ${locationData.country_name}`,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m)
      });

    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Weather data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const handleRefresh = () => {
    fetchWeatherData();
  };

  if (loading) {
    return (
      <div className="h-full p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading weather...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="h-full p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-neutral-500" />
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">Weather</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          >
            <RefreshCw className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
        <div className="flex items-center justify-center h-20">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Weather unavailable</span>
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="h-full p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getWeatherIcon(weather.condition)}
            <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">Weather</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          >
            <RefreshCw className="w-3 h-3 text-neutral-500" />
          </button>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
            {weather.temperature}°C
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            {weather.description}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getWeatherIcon(weather.condition)}
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">Weather</h3>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
        >
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Temperature and condition */}
        <div className="text-center">
          <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-1">
            {weather.temperature}°C
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            {weather.description}
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-neutral-500">
            <MapPin className="w-3 h-3" />
            <span>{weather.location}</span>
          </div>
        </div>

        {/* Additional details */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Humidity</div>
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {weather.humidity}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Wind</div>
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {weather.windSpeed} km/h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDashboardWidget;