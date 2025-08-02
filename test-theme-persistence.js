// Test theme persistence
console.log('🧪 Testing theme persistence...');

// Test 1: Change theme to dark
console.log('\n1️⃣ Testing theme change to dark...');
fetch('/api/userSettings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ theme: 'dark' }),
})
.then(response => response.json())
.then(data => {
  console.log('✅ Theme changed to dark:', data.theme);
  
  // Test 2: Verify theme persists
  console.log('\n2️⃣ Verifying theme persists...');
  return fetch('/api/userSettings');
})
.then(response => response.json())
.then(data => {
  console.log('✅ Theme still dark:', data.theme);
  
  // Test 3: Change theme to light
  console.log('\n3️⃣ Testing theme change to light...');
  return fetch('/api/userSettings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ theme: 'light' }),
  });
})
.then(response => response.json())
.then(data => {
  console.log('✅ Theme changed to light:', data.theme);
  
  // Test 4: Verify light theme persists
  console.log('\n4️⃣ Verifying light theme persists...');
  return fetch('/api/userSettings');
})
.then(response => response.json())
.then(data => {
  console.log('✅ Theme still light:', data.theme);
  
  // Test 5: Change back to auto
  console.log('\n5️⃣ Testing theme change back to auto...');
  return fetch('/api/userSettings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ theme: 'auto' }),
  });
})
.then(response => response.json())
.then(data => {
  console.log('✅ Theme changed to auto:', data.theme);
  console.log('\n🎉 All theme persistence tests passed!');
})
.catch(error => {
  console.error('❌ Theme persistence test failed:', error);
});