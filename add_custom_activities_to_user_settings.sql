-- Add custom_activities column to user_settings table
-- This stores user's custom activities as JSON array

ALTER TABLE user_settings 
ADD COLUMN custom_activities JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN user_settings.custom_activities IS 'JSON array of custom activities with name and icon properties';

-- Example of the JSON structure that will be stored:
-- [
--   {"name": "Yoga", "icon": "🧘"},
--   {"name": "Coding", "icon": "💻"},
--   {"name": "Gardening", "icon": "🌱"}
-- ]

-- Optional: Add a check constraint to ensure valid JSON structure
ALTER TABLE user_settings 
ADD CONSTRAINT check_custom_activities_structure 
CHECK (
  custom_activities IS NULL OR 
  (
    jsonb_typeof(custom_activities) = 'array' AND
    (
      jsonb_array_length(custom_activities) = 0 OR
      (
        SELECT bool_and(
          jsonb_typeof(elem) = 'object' AND
          elem ? 'name' AND
          elem ? 'icon' AND
          jsonb_typeof(elem->'name') = 'string' AND
          jsonb_typeof(elem->'icon') = 'string'
        )
        FROM jsonb_array_elements(custom_activities) AS elem
      )
    )
  )
);