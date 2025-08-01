// Simple test for LocalAssistant
const { LocalAssistant } = require('./lib/assistant/localAssistant');

async function testLocalAssistant() {
  try {
    console.log('Testing LocalAssistant...');
    
    // Create a mock LocalAssistant instance
    const assistant = new LocalAssistant('test@example.com');
    
    // Test queries
    const testQueries = [
      "When did I last talk about incentives?",
      "What's on my calendar today?",
      "Add task: review quarterly report",
      "How are my habits doing?",
      "Show me my pending tasks"
    ];
    
    for (const query of testQueries) {
      console.log(`\nTesting query: "${query}"`);
      try {
        const response = await assistant.processQuery(query);
        console.log(`Response: ${response.substring(0, 100)}...`);
      } catch (error) {
        console.error(`Error processing query: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLocalAssistant();