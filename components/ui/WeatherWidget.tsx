'use client'

import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer } from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  location: string;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return <Sun className="w-4 h-4" />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className="w-4 h-4" />;
    } else if (conditionLower.includes('rain')) {
      return <CloudRain className="w-4 h-4" />;
    } else if (conditionLower.includes('snow')) {
      return <CloudSnow className="w-4 h-4" />;
    } else if (conditionLower.includes('wind')) {
      return <Wind className="w-4 h-4" />;
    }
    return <Thermometer className="w-4 h-4" />;
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Using OpenWeatherMap API (you'll need to add your API key to environment variables)
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error('Weather data unavailable');
      }
      
      const data = await response.json();
      
      setWeather({
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        icon: data.weather[0].icon,
        location: data.name
      });
    } catch (err) {
      setError('Weather unavailable');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Location unavailable');
        }
      );
    } else {
      setError('Geolocation not supported');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Thermometer className="w-4 h-4 text-neutral-500" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Weather unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
      {getWeatherIcon(weather.condition)}
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {weather.temperature}°C
      </span>
    </div>
  );
};

export default WeatherWidget;