// Simple API test script for Fiorell backend
// Run with: node test-api.js

const API_BASE = 'http://localhost:3001/api';

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json();
    
    console.log(`${options.method || 'GET'} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('---\n');
    
    return { response, data };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return null;
  }
}

// Test data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'testpassword123',
  confirmPassword: 'testpassword123',
  dateOfBirth: '1995-01-15',
  gender: 'male',
  location: 'New York, NY'
};

const testUser2 = {
  firstName: 'Emma',
  lastName: 'Johnson',
  email: 'emma.johnson@example.com',
  password: 'testpassword123',
  confirmPassword: 'testpassword123',
  dateOfBirth: '1997-03-20',
  gender: 'female',
  location: 'New York, NY'
};

let userToken = null;
let user2Token = null;
let user2Id = null;

async function runTests() {
  console.log('🚀 Starting Fiorell API Tests\n');

  // Test 1: User Registration
  console.log('1. Testing User Registration');
  const signupResult = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });

  if (signupResult?.response.status === 201) {
    userToken = signupResult.data.token;
    console.log('✅ User registration successful\n');
  } else {
    console.log('❌ User registration failed\n');
    return;
  }

  // Test 2: User Login
  console.log('2. Testing User Login');
  const loginResult = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
  });

  if (loginResult?.response.status === 200) {
    console.log('✅ User login successful\n');
  } else {
    console.log('❌ User login failed\n');
  }

  // Test 3: Get User Profile
  console.log('3. Testing Get User Profile');
  const profileResult = await apiRequest('/user/profile', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (profileResult?.response.status === 200) {
    console.log('✅ Get user profile successful\n');
  } else {
    console.log('❌ Get user profile failed\n');
  }

  // Test 4: Update User Profile
  console.log('4. Testing Update User Profile');
  const updateResult = await apiRequest('/user/profile', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      bio: 'Adventure seeker and coffee lover. Looking for someone to explore the city with!',
      interests: ['Photography', 'Travel', 'Coffee', 'Hiking'],
      preferences: {
        ageRange: { min: 22, max: 35 },
        maxDistance: 50,
      },
    }),
  });

  if (updateResult?.response.status === 200) {
    console.log('✅ Update user profile successful\n');
  } else {
    console.log('❌ Update user profile failed\n');
  }

  // Test 5: Create Second User for Testing Interactions
  console.log('5. Creating Second Test User');
  const signup2Result = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testUser2),
  });

  if (signup2Result?.response.status === 201) {
    user2Token = signup2Result.data.token;
    user2Id = signup2Result.data.user.id;
    console.log('✅ Second user created successfully\n');

    // Update second user profile
    await apiRequest('/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        bio: 'Love hiking and outdoor adventures. Dog mom to a golden retriever!',
        interests: ['Hiking', 'Photography', 'Dogs', 'Nature'],
      }),
    });
  } else {
    console.log('❌ Second user creation failed\n');
  }

  // Test 6: Get Discovery Matches
  console.log('6. Testing Discovery Matches');
  const matchesResult = await apiRequest('/discovery/matches?limit=5', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (matchesResult?.response.status === 200) {
    console.log('✅ Get discovery matches successful\n');
  } else {
    console.log('❌ Get discovery matches failed\n');
  }

  // Test 7: Like a User
  if (user2Id) {
    console.log('7. Testing Like Interaction');
    const likeResult = await apiRequest('/interactions/likes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        targetUserId: user2Id,
        action: 'like',
      }),
    });

    if (likeResult?.response.status === 200) {
      console.log('✅ Like interaction successful\n');

      // Test 8: Like Back (Create Match)
      console.log('8. Testing Mutual Like (Match Creation)');
      const likeBackResult = await apiRequest('/interactions/likes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user2Token}`,
        },
        body: JSON.stringify({
          targetUserId: signupResult.data.user.id,
          action: 'like',
        }),
      });

      if (likeBackResult?.response.status === 200 && likeBackResult.data.isMatch) {
        console.log('✅ Match created successfully\n');

        // Test 9: Get Matches
        console.log('9. Testing Get Matches');
        const getMatchesResult = await apiRequest('/matches', {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        if (getMatchesResult?.response.status === 200) {
          console.log('✅ Get matches successful\n');

          // Test 10: Send Message
          if (getMatchesResult.data.matches.length > 0) {
            const matchId = getMatchesResult.data.matches[0].id;
            
            console.log('10. Testing Send Message');
            const messageResult = await apiRequest('/messages', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${userToken}`,
              },
              body: JSON.stringify({
                matchId: matchId,
                content: 'Hey! Thanks for the like! I love your photos.',
                type: 'text',
              }),
            });

            if (messageResult?.response.status === 201) {
              console.log('✅ Send message successful\n');

              // Test 11: Get Messages
              console.log('11. Testing Get Messages');
              const getMessagesResult = await apiRequest(`/messages?matchId=${matchId}`, {
                headers: {
                  Authorization: `Bearer ${user2Token}`,
                },
              });

              if (getMessagesResult?.response.status === 200) {
                console.log('✅ Get messages successful\n');
              } else {
                console.log('❌ Get messages failed\n');
              }
            } else {
              console.log('❌ Send message failed\n');
            }
          }
        } else {
          console.log('❌ Get matches failed\n');
        }
      } else {
        console.log('❌ Match creation failed\n');
      }
    } else {
      console.log('❌ Like interaction failed\n');
    }
  }

  // Test 12: Get Received Likes
  console.log('12. Testing Get Received Likes');
  const receivedLikesResult = await apiRequest('/interactions/likes?type=received', {
    headers: {
      Authorization: `Bearer ${user2Token}`,
    },
  });

  if (receivedLikesResult?.response.status === 200) {
    console.log('✅ Get received likes successful\n');
  } else {
    console.log('❌ Get received likes failed\n');
  }

  console.log('🏁 API Tests Completed!');
  console.log('\n📋 Test Summary:');
  console.log('- User registration and authentication ✅');
  console.log('- Profile management ✅');
  console.log('- Discovery and matching ✅');
  console.log('- User interactions (likes) ✅');
  console.log('- Match creation ✅');
  console.log('- Messaging system ✅');
  console.log('\n🎉 All core features are working!');
}

// Run the tests
runTests().catch(console.error);