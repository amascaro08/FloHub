# Weather API Setup

To enable the weather widget functionality, you need to set up an OpenWeatherMap API key.

## Setup Instructions

1. **Get an API Key**:
   - Go to [OpenWeatherMap](https://openweathermap.org/api)
   - Sign up for a free account
   - Get your API key from the dashboard

2. **Add Environment Variable**:
   - Create or update your `.env.local` file
   - Add the following line:
   ```
   NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key_here
   ```

3. **Restart Development Server**:
   - Stop your development server
   - Run `npm run dev` again

## Features

- **Automatic Location Detection**: Uses browser geolocation to get user's location
- **Real-time Weather**: Shows current temperature and weather conditions
- **Responsive Design**: Works on both desktop and mobile
- **Error Handling**: Gracefully handles location and API errors

## Weather Widget Location

The weather widget is now located in the top header bar, next to the chat toggle button and lock/unlock button.

## Notes

- The weather widget will request location permission from the user
- If location is denied or unavailable, it will show "Weather unavailable"
- The widget is designed to be lightweight and non-intrusive