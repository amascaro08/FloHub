import { FloCatCapability } from '../floCatCapabilities';
import { getUserHabits, toggleHabitCompletion, createHabit, getTodayFormatted } from '../habitService';
import { firestore } from '../firebaseAdmin';

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
      
      // Get the user's FloCat style and personality preferences
      let floCatStyle = "default";
      let floCatPersonality: string[] = [];
      let preferredName = "";
      
      try {
        const userSettingsDoc = await firestore.collection("users").doc(userEmail).collection("settings").doc("userSettings").get();
        if (userSettingsDoc.exists) {
          const userSettings = userSettingsDoc.data();
          floCatStyle = userSettings?.floCatStyle || "default";
          floCatPersonality = userSettings?.floCatPersonality || [];
          preferredName = userSettings?.preferredName || "";
        }
      } catch (error) {
        console.error("Error fetching user settings for FloCat style:", error);
        // Continue with default style if there's an error
      }
      
      // Build personality traits string from keywords
      const personalityTraits = floCatPersonality.length > 0
        ? `Your personality traits include: ${floCatPersonality.join(", ")}.`
        : "";
      
      // Use preferred name if available
      const nameInstruction = preferredName
        ? `Address the user as "${preferredName}".`
        : "";
      
      // Handle different commands
      // Function to get response based on FloCat style
      const getStyledResponse = (defaultMsg: string, moreCattyMsg: string, lessCattyMsg: string, professionalMsg: string) => {
        // Add personality traits and name instruction to the messages if they exist
        const enhanceMessage = (msg: string) => {
          // If the message contains a greeting or is addressing the user directly,
          // and we have a preferred name, replace generic terms with the preferred name
          let enhancedMsg = msg;
          if (preferredName) {
            enhancedMsg = enhancedMsg.replace(/you/gi, preferredName);
          }
          return enhancedMsg;
        };
        
        switch(floCatStyle) {
          case "more_catty": return enhanceMessage(moreCattyMsg);
          case "less_catty": return enhanceMessage(lessCattyMsg);
          case "professional": return enhanceMessage(professionalMsg);
          default: return enhanceMessage(defaultMsg);
        }
      };
      
      if (command === 'list') {
        const habits = await getUserHabits(userEmail);
        if (habits.length === 0) {
          return getStyledResponse(
            "You don't have any habits tracked yet. Try saying 'create habit [name]' to get started!",
            "Meow! Your habit list is as empty as my food bowl at dinner time! 😿 Try saying 'create habit [name]' to start filling it up, paw-lease!",
            "You don't have any habits tracked yet. Try creating a habit by saying 'create habit [name]' to get started.",
            "No habits are currently being tracked. To begin tracking a habit, use the command 'create habit [name]'."
          );
        }
        
        const habitsList = habits.map(habit =>
          `- **${habit.name}**: ${habit.frequency === 'daily' ? 'Daily' :
            habit.frequency === 'weekly' ? 'Weekly' : 'Custom days'}`
        ).join('\n');
        
        return getStyledResponse(
          `Here are your current habits:\n\n${habitsList}`,
          `Purr-esenting your current habits! 😺\n\n${habitsList}\n\nKeep up the good work, you're doing paw-some!`,
          `Here are your current habits:\n\n${habitsList}`,
          `Current Habit Tracking List:\n\n${habitsList}`
        );
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
        
        return getStyledResponse(
          `Great! I've created a new daily habit: "${habitData.name}". You can track it in your Habit Tracker.`,
          `Meow-velous! 😸 I've created a purr-fect new daily habit: "${habitData.name}". You can track it in your Habit Tracker. Let's make this a paw-sitive routine!`,
          `Great! I've created a new daily habit: "${habitData.name}". You can track it in your Habit Tracker.`,
          `Habit created successfully: "${habitData.name}" (daily frequency). This habit is now available in your Habit Tracker.`
        );
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
          return getStyledResponse(
            `I couldn't find a habit matching "${args.trim()}". Please check the name and try again.`,
            `Hmm, I've sniffed around but can't find a habit called "${args.trim()}" in your list. 🐱 Could you check the name and try again? My whiskers are twitching to help you!`,
            `I couldn't find a habit matching "${args.trim()}". Please check the name and try again.`,
            `No habit found matching "${args.trim()}". Please verify the habit name and try again.`
          );
        }
        
        // Mark the habit as complete for today
        const today = getTodayFormatted();
        await toggleHabitCompletion(userEmail, habit.id, today);
        
        return getStyledResponse(
          `✅ Marked "${habit.name}" as complete for today. Keep up the good work!`,
          `✅ Paw-some job completing "${habit.name}" today! 😸 You're absolutely cat-tastic! Keep up the great work, I'm purr-oud of you!`,
          `✅ Marked "${habit.name}" as complete for today. Keep up the good work!`,
          `✅ Habit "${habit.name}" marked complete for today. Progress recorded successfully.`
        );
      }
      
      else if (command === 'status') {
        const habits = await getUserHabits(userEmail);
        if (habits.length === 0) {
          return getStyledResponse(
            "You don't have any habits tracked yet. Try saying 'create habit [name]' to get started!",
            "Meow! Your habit list is as empty as my food bowl at dinner time! 😿 Try saying 'create habit [name]' to start filling it up, paw-lease!",
            "You don't have any habits tracked yet. Try creating a habit by saying 'create habit [name]' to get started.",
            "No habits are currently being tracked. To begin tracking a habit, use the command 'create habit [name]'."
          );
        }
        
        // In a real implementation, you would check which habits are completed for today
        // This is a simplified version
        return getStyledResponse(
          `You have ${habits.length} habits tracked. Check your Habit Tracker widget for detailed progress!`,
          `You're tracking ${habits.length} purr-fect habits! 😺 Paw on over to your Habit Tracker widget for all the meow-velous details!`,
          `You have ${habits.length} habits tracked. Check your Habit Tracker widget for detailed progress.`,
          `Currently tracking ${habits.length} habit(s). For detailed progress metrics, please refer to the Habit Tracker widget.`
        );
      }
      
      return getStyledResponse(
        "I'm not sure what you want to do with your habits. Try 'list habits', 'create habit [name]', or 'complete habit [name]'.",
        "Meow? I'm a bit confused about what you want to do with your habits. 😸 Try 'list habits', 'create habit [name]', or 'complete habit [name]' so I can help you paw-perly!",
        "I'm not sure what you want to do with your habits. Try 'list habits', 'create habit [name]', or 'complete habit [name]'.",
        "Command not recognized. Available habit commands: 'list habits', 'create habit [name]', or 'complete habit [name]'."
      );
    } catch (error) {
      console.error('Error in habit capability:', error);
      return "Sorry, I encountered an error while managing your habits. Please try again later.";
    }
  }
};