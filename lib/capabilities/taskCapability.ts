import { db } from "../drizzle";
import { tasks } from "../../db/schema";
import { eq, and, sql, ilike, desc } from "drizzle-orm";
import type { FloCatCapability } from "../floCatCapabilities";

// Parse natural language due dates
const parseDueDate = (phrase: string): Date | undefined => {
  if (!phrase) return undefined;
  
  const now = new Date();
  const lowerPhrase = phrase.toLowerCase().trim();

  // Today
  if (lowerPhrase === "today") {
    const date = new Date(now);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // Tomorrow
  if (lowerPhrase === "tomorrow") {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // In X days
  const inDaysMatch = lowerPhrase.match(/^in (\d+) days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // Next [weekday]
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextWeekdayMatch = lowerPhrase.match(/^next (\w+)$/);
  if (nextWeekdayMatch) {
    const targetDay = weekdays.indexOf(nextWeekdayMatch[1]);
    if (targetDay >= 0) {
      const date = new Date(now);
      const currentDay = date.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7;
      date.setDate(date.getDate() + daysToAdd);
      date.setHours(23, 59, 59, 999);
      return date;
    }
  }

  // This [weekday]
  const thisWeekdayMatch = lowerPhrase.match(/^this (\w+)$/);
  if (thisWeekdayMatch) {
    const targetDay = weekdays.indexOf(thisWeekdayMatch[1]);
    if (targetDay >= 0) {
      const date = new Date(now);
      const currentDay = date.getDay();
      const daysToAdd = (targetDay - currentDay + 7) % 7;
      date.setDate(date.getDate() + daysToAdd);
      date.setHours(23, 59, 59, 999);
      return date;
    }
  }

  // End of week
  if (lowerPhrase.includes("end of week") || lowerPhrase.includes("this friday")) {
    const date = new Date(now);
    const daysUntilFriday = (5 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilFriday);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // End of month
  if (lowerPhrase.includes("end of month")) {
    const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  return undefined;
};

// Extract priority from task text
const extractPriority = (text: string): 'high' | 'medium' | 'low' => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("urgent") || lowerText.includes("asap") || lowerText.includes("critical") || lowerText.includes("!!")) {
    return 'high';
  }
  
  if (lowerText.includes("important") || lowerText.includes("priority") || lowerText.includes("!")) {
    return 'medium';
  }
  
  return 'low';
};

// Extract tags from task text
const extractTags = (text: string): string[] => {
  const tagMatches = text.match(/#(\w+)/g);
  return tagMatches ? tagMatches.map(tag => tag.substring(1)) : [];
};

// Clean task text by removing tags and priority indicators
const cleanTaskText = (text: string): string => {
  return text
    .replace(/#\w+/g, '') // Remove hashtags
    .replace(/\b(urgent|asap|critical|important|priority)\b/gi, '') // Remove priority keywords
    .replace(/!+/g, '') // Remove exclamation marks
    .trim()
    .replace(/\s+/g, ' '); // Normalize whitespace
};

async function handleTaskCommand(command: string, args: string, userId: string): Promise<string> {
  console.log(`[DEBUG] handleTaskCommand called with command: "${command}", args: "${args}", userId: "${userId}"`);
  try {
    switch (command.toLowerCase()) {
      case "add":
      case "create":
      case "new":
        return await addTask(args, userId);
      
      case "list":
      case "show":
      case "view":
        return await listTasks(args, userId);
      
      case "complete":
      case "done":
      case "finish":
        return await completeTask(args, userId);
      
      case "delete":
      case "remove":
        return await deleteTask(args, userId);
      
      case "search":
      case "find":
        return await searchTasks(args, userId);
      
      case "update":
      case "edit":
      case "modify":
        return await updateTask(args, userId);
      
      default:
        return `I don't understand the command "${command}". I can help you add, list, complete, delete, search, or update tasks.`;
    }
  } catch (error) {
    console.error("Error in task command:", error);
    return "Sorry, there was an error processing your task request. Please try again.";
  }
}

async function addTask(args: string, userId: string): Promise<string> {
  console.log(`[DEBUG] addTask called with args: "${args}", userId: "${userId}"`);
  if (!args.trim()) {
    return "Please specify what task you'd like to add. For example: 'add task: Review presentation due tomorrow'";
  }

  // Parse the arguments to extract task details with improved pattern matching
  let taskText = args;
  let dueDate: Date | undefined;
  let duePhrase: string | null = null;

  // Handle different patterns of due date specification
  const dueDatePatterns = [
    // "for tomorrow called [task]" or "due tomorrow called [task]"
    /^(?:for|due)\s+(\w+)\s+called\s+(.+)$/i,
    // "[task] for tomorrow" or "[task] due tomorrow"
    /^(.+?)\s+(?:for|due)\s+(\w+)$/i,
    // "called [task] for tomorrow" or "called [task] due tomorrow"
    /^called\s+(.+?)\s+(?:for|due)\s+(\w+)$/i,
    // Standard "due [date]" anywhere in the text
    /\bdue\s+(.+?)(?:\s|$)/i
  ];

  for (const pattern of dueDatePatterns) {
    const match = args.match(pattern);
    if (match) {
      if (pattern.source.includes('called')) {
        // Patterns that separate task name and due date
        if (match[2] && match[1]) {
          taskText = match[2].trim();
          duePhrase = match[1].trim();
        } else if (match[1] && match[2]) {
          taskText = match[1].trim();
          duePhrase = match[2].trim();
        }
      } else {
        // Standard due date pattern
        duePhrase = match[1].trim();
        taskText = taskText.replace(match[0], '').trim();
      }
      
      if (duePhrase) {
        dueDate = parseDueDate(duePhrase);
        break;
      }
    }
  }

  // Extract tags and priority
  const tags = extractTags(taskText);
  const priority = extractPriority(taskText);

  // Clean the task text
  taskText = cleanTaskText(taskText);

  if (!taskText) {
    return "Please provide a valid task description.";
  }

  // Insert the task
  const newTask = await db.insert(tasks).values({
    user_email: userId,
    text: taskText,
    dueDate: dueDate,
    tags: tags.length > 0 ? tags : null,
    source: 'assistant',
    done: false
  }).returning();

  let response = `✅ Task "${taskText}" added successfully!`;
  
  if (dueDate) {
    response += ` Due: ${dueDate.toLocaleDateString()}`;
  }
  
  if (tags.length > 0) {
    response += ` Tags: ${tags.map(tag => `#${tag}`).join(', ')}`;
  }
  
  if (priority === 'high') {
    response += " (High Priority)";
  }

  return response;
}

async function listTasks(args: string, userId: string): Promise<string> {
  let query = db.select().from(tasks).where(eq(tasks.user_email, userId));

  // Parse filters
  const lowerArgs = args.toLowerCase();
  let whereConditions = [eq(tasks.user_email, userId)];

  // Filter by completion status
  if (lowerArgs.includes("completed") || lowerArgs.includes("done")) {
    whereConditions.push(eq(tasks.done, true));
  } else if (lowerArgs.includes("pending") || lowerArgs.includes("incomplete") || !lowerArgs.includes("all")) {
    whereConditions.push(eq(tasks.done, false));
  }

  // Filter by due date
  if (lowerArgs.includes("overdue")) {
    whereConditions.push(sql`due_date < NOW()`);
  } else if (lowerArgs.includes("today")) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    whereConditions.push(sql`due_date >= ${today.toISOString().split('T')[0]} AND due_date < ${tomorrow.toISOString().split('T')[0]}`);
  } else if (lowerArgs.includes("week")) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    whereConditions.push(sql`due_date >= ${today.toISOString().split('T')[0]} AND due_date <= ${nextWeek.toISOString().split('T')[0]}`);
  }

  // Filter by tag
  const tagMatch = args.match(/#(\w+)/);
  if (tagMatch) {
    const tag = tagMatch[1];
    whereConditions.push(sql`tags @> ARRAY[${tag}]::text[]`);
  }

  const userTasks = await db.select().from(tasks)
    .where(and(...whereConditions))
    .orderBy(desc(tasks.createdAt))
    .limit(20);

  if (userTasks.length === 0) {
    return "No tasks found matching your criteria.";
  }

  const taskList = userTasks.map((task, index) => {
    let taskStr = `${index + 1}. ${task.text}`;
    
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const isOverdue = dueDate < now && !task.done;
      const dueStr = dueDate.toLocaleDateString();
      taskStr += ` (Due: ${dueStr}${isOverdue ? " ⚠️ OVERDUE" : ""})`;
    }
    
    if (task.tags && Array.isArray(task.tags) && task.tags.length > 0) {
      taskStr += ` [${task.tags.map((tag: string) => `#${tag}`).join(', ')}]`;
    }
    
    if (task.done) {
      taskStr += " ✅";
    }
    
    return taskStr;
  }).join('\n');

  const statusFilter = lowerArgs.includes("completed") ? "Completed" : 
                      lowerArgs.includes("all") ? "All" : "Pending";
  
  return `📋 **${statusFilter} Tasks** (${userTasks.length} found):\n\n${taskList}`;
}

async function completeTask(args: string, userId: string): Promise<string> {
  if (!args.trim()) {
    return "Please specify which task to complete. You can use the task number from the list or part of the task description.";
  }

  // Try to parse as task number first
  const taskNumber = parseInt(args.trim());
  let targetTask;

  if (!isNaN(taskNumber)) {
    // Get tasks by index
    const userTasks = await db.select().from(tasks)
      .where(and(eq(tasks.user_email, userId), eq(tasks.done, false)))
      .orderBy(desc(tasks.createdAt));
    
    if (taskNumber > 0 && taskNumber <= userTasks.length) {
      targetTask = userTasks[taskNumber - 1];
    }
  } else {
    // Search by task text
    const searchTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.user_email, userId),
        eq(tasks.done, false),
        ilike(tasks.text, `%${args}%`)
      ))
      .limit(1);
    
    targetTask = searchTasks[0];
  }

  if (!targetTask) {
    return "I couldn't find a matching incomplete task. Please check the task number or description.";
  }

  await db.update(tasks)
    .set({ done: true })
    .where(eq(tasks.id, targetTask.id));

  return `🎉 Task "${targetTask.text}" marked as complete!`;
}

async function deleteTask(args: string, userId: string): Promise<string> {
  if (!args.trim()) {
    return "Please specify which task to delete. You can use the task number from the list or part of the task description.";
  }

  // Try to parse as task number first
  const taskNumber = parseInt(args.trim());
  let targetTask;

  if (!isNaN(taskNumber)) {
    // Get tasks by index
    const userTasks = await db.select().from(tasks)
      .where(eq(tasks.user_email, userId))
      .orderBy(desc(tasks.createdAt));
    
    if (taskNumber > 0 && taskNumber <= userTasks.length) {
      targetTask = userTasks[taskNumber - 1];
    }
  } else {
    // Search by task text
    const searchTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.user_email, userId),
        ilike(tasks.text, `%${args}%`)
      ))
      .limit(1);
    
    targetTask = searchTasks[0];
  }

  if (!targetTask) {
    return "I couldn't find a matching task to delete. Please check the task number or description.";
  }

  await db.delete(tasks).where(eq(tasks.id, targetTask.id));

  return `🗑️ Task "${targetTask.text}" deleted successfully.`;
}

async function searchTasks(args: string, userId: string): Promise<string> {
  if (!args.trim()) {
    return "Please specify what to search for in your tasks.";
  }

  const searchResults = await db.select().from(tasks)
    .where(and(
      eq(tasks.user_email, userId),
      ilike(tasks.text, `%${args}%`)
    ))
    .orderBy(desc(tasks.createdAt))
    .limit(10);

  if (searchResults.length === 0) {
    return `No tasks found containing "${args}".`;
  }

  const resultList = searchResults.map((task, index) => {
    let taskStr = `${index + 1}. ${task.text}`;
    
    if (task.dueDate) {
      taskStr += ` (Due: ${new Date(task.dueDate).toLocaleDateString()})`;
    }
    
    if (task.done) {
      taskStr += " ✅";
    } else {
      taskStr += " ⏳";
    }
    
    return taskStr;
  }).join('\n');

  return `🔍 **Search Results for "${args}"** (${searchResults.length} found):\n\n${resultList}`;
}

async function updateTask(args: string, userId: string): Promise<string> {
  // Parse update command: "update task [number/text] set [field] to [value]"
  const updateMatch = args.match(/^(.+?)\s+set\s+(.+?)\s+to\s+(.+)$/i);
  
  if (!updateMatch) {
    return "Please use the format: 'update task [number/description] set [field] to [value]'. Fields: text, due, tags";
  }

  const [, taskIdentifier, field, newValue] = updateMatch;
  
  // Find the task
  const taskNumber = parseInt(taskIdentifier.trim());
  let targetTask;

  if (!isNaN(taskNumber)) {
    const userTasks = await db.select().from(tasks)
      .where(eq(tasks.user_email, userId))
      .orderBy(desc(tasks.createdAt));
    
    if (taskNumber > 0 && taskNumber <= userTasks.length) {
      targetTask = userTasks[taskNumber - 1];
    }
  } else {
    const searchTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.user_email, userId),
        ilike(tasks.text, `%${taskIdentifier.trim()}%`)
      ))
      .limit(1);
    
    targetTask = searchTasks[0];
  }

  if (!targetTask) {
    return "I couldn't find the task to update. Please check the task number or description.";
  }

  // Update the appropriate field
  const fieldLower = field.toLowerCase().trim();
  let updateData: any = {};

  switch (fieldLower) {
    case "text":
    case "description":
      updateData.text = newValue.trim();
      break;
    
    case "due":
    case "duedate":
    case "due_date":
      const dueDate = parseDueDate(newValue.trim());
      if (dueDate) {
        updateData.dueDate = dueDate;
      } else {
        return `I couldn't understand the due date "${newValue}". Try formats like "tomorrow", "next friday", or "in 3 days".`;
      }
      break;
    
    case "tags":
      const tags = newValue.split(',').map(tag => tag.trim().replace('#', ''));
      updateData.tags = tags;
      break;
    
    default:
      return `I don't know how to update the field "${field}". Available fields: text, due, tags`;
  }

  await db.update(tasks)
    .set(updateData)
    .where(eq(tasks.id, targetTask.id));

  return `✏️ Task "${targetTask.text}" updated successfully!`;
}

export const taskCapability: FloCatCapability = {
  featureName: "Task Management",
  supportedCommands: ["add", "create", "new", "list", "show", "view", "complete", "done", "finish", "delete", "remove", "search", "find", "update", "edit", "modify"],
  triggerPhrases: [
    "add task", "create task", "new task", "add a task", "create a task", "make a task",
    "list tasks", "show tasks", "view tasks", "my tasks", "show my tasks",
    "complete task", "finish task", "done task", "mark task complete",
    "delete task", "remove task", "delete a task",
    "search tasks", "find task", "find tasks",
    "update task", "edit task", "modify task", "change task"
  ],
  handler: async (command: string, args: string) => {
    // Get the user ID from the global context set by the API endpoint
    const userId = (global as any).currentUserId;
    if (!userId) {
      return "Sorry, I need to know who you are to manage tasks. Please make sure you're logged in.";
    }
    return await handleTaskCommand(command, args, userId);
  }
};