-- Create a separate table for user custom activities
-- This provides more flexibility for future features like activity categories, timestamps, etc.

CREATE TABLE user_activities (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique activity names per user
  CONSTRAINT unique_user_activity UNIQUE (user_email, name),
  
  -- Foreign key to users table (assuming email is the reference)
  CONSTRAINT fk_user_activities_user_email 
    FOREIGN KEY (user_email) 
    REFERENCES users(email) 
    ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_user_activities_user_email ON user_activities(user_email);
CREATE INDEX idx_user_activities_active ON user_activities(user_email, is_active);

-- Add comments
COMMENT ON TABLE user_activities IS 'User-defined custom activities for journal tracking';
COMMENT ON COLUMN user_activities.name IS 'Display name of the activity';
COMMENT ON COLUMN user_activities.icon IS 'Emoji or icon representing the activity';
COMMENT ON COLUMN user_activities.is_default IS 'Whether this is a system default activity';
COMMENT ON COLUMN user_activities.is_active IS 'Whether this activity is currently available for selection';

-- Insert default activities for existing users (optional)
-- This would populate the table with default activities for all existing users
INSERT INTO user_activities (user_email, name, icon, is_default, is_active)
SELECT 
  u.email,
  activity.name,
  activity.icon,
  TRUE,
  TRUE
FROM users u
CROSS JOIN (
  VALUES 
    ('Work', '💼'),
    ('Exercise', '🏋️'),
    ('Social', '👥'),
    ('Reading', '📚'),
    ('Gaming', '🎮'),
    ('Family', '👨‍👩‍👧‍👦'),
    ('Shopping', '🛒'),
    ('Cooking', '🍳'),
    ('Cleaning', '🧹'),
    ('TV', '📺'),
    ('Movies', '🎬'),
    ('Music', '🎵'),
    ('Outdoors', '🌳'),
    ('Travel', '✈️'),
    ('Relaxing', '🛌'),
    ('Hobbies', '🎨'),
    ('Study', '📝'),
    ('Meditation', '🧘'),
    ('Art', '🖼️'),
    ('Writing', '✍️')
) AS activity(name, icon);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_activities_updated_at
    BEFORE UPDATE ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();