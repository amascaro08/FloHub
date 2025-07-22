# Shared Calendars Implementation

## 🎉 **Google Calendar Shared Calendars Support Added!**

Now your app will automatically detect and include ALL Google calendars (primary + shared) when connecting Google Calendar.

## 🔧 **What Was Changed**

### **1. Enhanced OAuth Callback**
**File:** `pages/api/auth/callback/google-additional.ts`

#### **Before (Primary Only):**
```typescript
const newGoogleSource: CalendarSource = {
  id: `google_${Date.now()}`,
  name: "Google Calendar", 
  type: "google",
  sourceId: "primary",  // ❌ Only primary calendar
  tags: ["personal"],
  isEnabled: true,
};
```

#### **After (All Calendars):**
```typescript
// Fetch ALL available calendars from Google
const calendarListRes = await fetch(
  "https://www.googleapis.com/calendar/v3/users/me/calendarList",
  { headers: { Authorization: `Bearer ${tokens.access_token}` } }
);

// Create a source for each calendar
newGoogleSources = calendarList.items.map((calendar: any, index: number) => ({
  id: `google_${calendar.id}_${Date.now() + index}`,
  name: calendar.summary || calendar.id,  // ✅ Real calendar names
  type: "google" as const,
  sourceId: calendar.id,  // ✅ Actual calendar IDs
  tags: calendar.id === "primary" ? ["personal"] : ["shared"],
  isEnabled: true,
}));
```

### **2. Added Refresh Functionality**
**File:** `components/settings/CalendarSettings.tsx`

- **Refresh Button**: Added "Refresh Calendars" button when Google is connected
- **Automatic Detection**: Refreshing will detect any newly shared calendars
- **Smart Updates**: Removes old Google sources and adds current ones

#### **UI Enhancement:**
```tsx
{connectionStatus.google === 'connected' && (
  <button
    onClick={() => {
      const refreshUrl = `/api/calendar/connect?provider=google&refresh=true`;
      window.location.href = refreshUrl;
    }}
    className="text-xs text-blue-600 hover:text-blue-800 underline"
  >
    Refresh Calendars
  </button>
)}
```

### **3. Enhanced State Management**
**File:** `pages/api/calendar/connect.ts`

- **Refresh Detection**: OAuth state now includes refresh flag
- **Smart Handling**: Callback knows whether this is initial setup or refresh

## 🔍 **How It Works**

### **Initial Google Calendar Connection:**
1. User clicks "Connect Google Calendar"
2. OAuth flow completes successfully  
3. **NEW**: System fetches ALL user's calendars from Google
4. **NEW**: Creates individual calendar sources for each calendar
5. **NEW**: Tags primary calendar as "personal", others as "shared"
6. User sees all calendars in settings

### **Refreshing Calendar List:**
1. User clicks "Refresh Calendars" (when connected)
2. Goes through OAuth again with refresh flag
3. **NEW**: System removes old Google calendar sources
4. **NEW**: Fetches current calendar list from Google
5. **NEW**: Creates updated sources for all current calendars
6. User sees updated calendar list with any new shared calendars

### **Calendar Source Structure:**
Each Google calendar now becomes a separate source:
```typescript
{
  id: "google_primary_1639123456789",
  name: "My Primary Calendar",
  type: "google",
  sourceId: "primary",
  tags: ["personal"],
  isEnabled: true
},
{
  id: "google_team@company.com_1639123456790", 
  name: "Team Calendar",
  type: "google", 
  sourceId: "team@company.com",
  tags: ["shared"],
  isEnabled: true
},
{
  id: "google_project123_1639123456791",
  name: "Project XYZ", 
  type: "google",
  sourceId: "project123@company.com",
  tags: ["shared"],
  isEnabled: true
}
```

## ✅ **Expected Results**

### **After Connecting Google Calendar:**
- ✅ All your Google calendars appear as separate sources
- ✅ Primary calendar tagged as "personal"
- ✅ Shared calendars tagged as "shared" 
- ✅ Each calendar shows with its real name
- ✅ All calendars enabled by default
- ✅ Events from ALL calendars appear in main calendar view

### **After Refreshing Calendars:**
- ✅ Any newly shared calendars are detected
- ✅ Removed calendars are cleaned up
- ✅ Calendar names are updated if changed
- ✅ Existing calendar settings preserved where possible

### **In Settings:**
- ✅ Connection status shows "Connected" 
- ✅ "Refresh Calendars" button available
- ✅ Multiple Google calendar sources listed
- ✅ Each source can be individually enabled/disabled
- ✅ Clear indication of primary vs shared calendars

### **In Main Calendar:**
- ✅ Events from all enabled Google calendars
- ✅ Events from Office 365 Power Automate URLs
- ✅ Mixed calendar view with all sources

## 🧪 **Testing Steps**

### **1. Test Initial Connection:**
1. Connect Google Calendar (if not already connected)
2. Check settings - should see multiple calendar sources
3. Check calendar page - should see events from all calendars

### **2. Test Shared Calendar Detection:**
1. Have someone share a calendar with you in Google Calendar
2. Click "Refresh Calendars" in settings
3. Should see the new shared calendar appear as a source

### **3. Test Calendar Management:**
1. In settings, disable one of the calendar sources
2. Check calendar page - events from that calendar should not appear
3. Re-enable the source - events should reappear

## 🎯 **Usage Scenarios**

### **Personal + Work Calendars:**
- Primary personal calendar: ✅ Detected
- Work calendar shared with you: ✅ Detected  
- Family calendar shared with you: ✅ Detected
- Project calendars: ✅ Detected

### **Team Collaboration:**
- Multiple shared team calendars: ✅ All detected
- Individual control over which calendars to show: ✅ Available
- Easy refresh when new calendars are shared: ✅ One-click refresh

### **Mixed Calendar Systems:**
- Google calendars (personal + shared): ✅ Working
- Office 365 via Power Automate: ✅ Working  
- Combined view of all calendar sources: ✅ Working

## 🚀 **Benefits**

1. **Comprehensive Calendar Access**: No more missing shared calendars
2. **Easy Management**: Individual control over each calendar source
3. **Automatic Updates**: Refresh button to detect new shared calendars
4. **Clear Organization**: Primary vs shared calendar tagging
5. **Flexible Configuration**: Enable/disable individual calendars as needed

Your calendar system now provides complete Google Calendar integration! 🎉