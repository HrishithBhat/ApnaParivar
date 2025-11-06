const axios = require('axios');

async function testFamilyCreation() {
  try {
    console.log('🧪 Testing family creation...');
    
    // Test the test endpoint first
    console.log('🔍 Testing family creation endpoint...');
    const testResponse = await axios.get('http://localhost:5000/test-family');
    console.log('✅ Test endpoint result:', testResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 5000');
    }
  }
}

testFamilyCreation();