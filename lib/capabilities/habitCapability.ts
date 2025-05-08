import { FloCatCapability } from '../floCatCapabilities';
import { getUserHabits, toggleHabitCompletion, createHabit, getTodayFormatted } from '../habitService';

/**
 * FloCat capability for managing habits
 */
export const habitCapability: FloCatCapability = {
  featureName: 'Habit Tracker',
  supportedCommands: ['create', 'list', 'complete', 'status'],
  triggerPhrases: ['habit', 'habits', 'track habit', 'daily habit'],
  
  handler: async (command: string, args: string) => {
    try {
      // Extract user email from context (this would be implemented in a real system)
      const userEmail = 'user@example.com'; // Placeholder - in a real implementation, this would come from the session
      
      // Handle different commands
      if (command === 'list') {
        const habits = await getUserHabits(userEmail);
        if (habits.length === 0) {
          return "You don't have any habits tracked yet. Try saying 'create habit [name]' to get started!";
        }
        
        return `Here are your current habits:\n\n${habits.map(habit => 
          `- **${habit.name}**: ${habit.frequency === 'daily' ? 'Daily' : 
            habit.frequency === 'weekly' ? 'Weekly' : 'Custom days'}`
        ).join('\n')}`;
      }
      
      else if (command === 'create') {
        if (!args.trim()) {
          return "Please provide a name for your new habit. For example: 'create habit Drink water'";
        }
        
        // Simple implementation - in a real system, you'd want to parse more complex arguments
        const habitData = {
          name: args.trim(),
          description: '',
          frequency: 'daily' as const,
          color: '#4fd1c5'
        };
        
        await createHabit(userEmail, habitData);
        return `Great! I've created a new daily habit: "${habitData.name}". You can track it in your Habit Tracker.`;
      }
      
      else if (command === 'complete') {
        if (!args.trim()) {
          return "Please specify which habit you want to mark as complete. For example: 'complete habit Drink water'";
        }
        
        // Find the habit by name (case-insensitive)
        const habits = await getUserHabits(userEmail);
        const habitName = args.trim().toLowerCase();
        const habit = habits.find(h => h.name.toLowerCase().includes(habitName));
        
        if (!habit) {
          return `I couldn't find a habit matching "${args.trim()}". Please check the name and try again.`;
        }
        
        // Mark the habit as complete for today
        const today = getTodayFormatted();
        await toggleHabitCompletion(userEmail, habit.id, today);
        
        return `✅ Marked "${habit.name}" as complete for today. Keep up the good work!`;
      }
      
      else if (command === 'status') {
        const habits = await getUserHabits(userEmail);
        if (habits.length === 0) {
          return "You don't have any habits tracked yet. Try saying 'create habit [name]' to get started!";
        }
        
        // In a real implementation, you would check which habits are completed for today
        // This is a simplified version
        return `You have ${habits.length} habits tracked. Check your Habit Tracker widget for detailed progress!`;
      }
      
      return "I'm not sure what you want to do with your habits. Try 'list habits', 'create habit [name]', or 'complete habit [name]'.";
    } catch (error) {
      console.error('Error in habit capability:', error);
      return "Sorry, I encountered an error while managing your habits. Please try again later.";
    }
  }
};