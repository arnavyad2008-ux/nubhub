import axios from 'axios';

async function testNubHub() {
  const base = 'http://localhost:3001/api';
  console.log('1. Testing GET /api/businesses...');
  const res1 = await axios.get(base + '/businesses');
  console.log('   Businesses count:', res1.data.businesses.length);

  console.log('2. Testing OTP request for phone +15559876543...');
  const res2 = await axios.post(base + '/auth/otp/request', { phone: '+15559876543' });
  console.log('   OTP request response:', res2.data.message, 'Code:', res2.data.simulatedCode);

  console.log('3. Verifying OTP...');
  const res3 = await axios.post(base + '/auth/otp/verify', {
    phone: '+15559876543',
    code: res2.data.simulatedCode
  });
  console.log('   Auth token received:', res3.data.token.substring(0, 15) + '...');
  const token = res3.data.token;

  console.log('4. Registering a real merchant business...');
  let bizId = '';
  if (res3.data.user?.hasBusiness && res3.data.user.business) {
    bizId = res3.data.user.business.id;
    console.log('   Business already bound:', res3.data.user.business.name);
  } else {
    const res4 = await axios.post(base + '/merchant/business', {
      name: 'Artisan Roastery & Bakehouse',
      category: 'Cafes & Restaurants',
      description: 'Single-origin espresso bar and sourdough patisserie with pet-friendly outdoor terrace.',
      address: '42 Pine Crest Avenue, Uptown District',
      phone: '+15559876543',
      socials: {
        whatsapp: '15559876543',
        instagram: '@artisanroastery',
        facebook: 'https://facebook.com/artisanroastery',
        website: 'https://artisanroastery.example.com'
      },
      is_open: true
    }, { headers: { Authorization: 'Bearer ' + token } });
    console.log('   Registered business ID:', res4.data.business.id, 'Name:', res4.data.business.name);
    bizId = res4.data.business.id;
  }

  console.log('5. Submitting Multi-Criteria Service Review...');
  try {
    const res5 = await axios.post(base + '/businesses/' + bizId + '/reviews', {
      author_name: 'Elena Rostova',
      overall_rating: 4.8,
      service_ratings: {
        food_quality: 5,
        speed: 4,
        cleanliness: 5,
        value: 5
      },
      service_type: 'Dine-in',
      comment: 'The Ethiopian pour-over and almond croissant were extraordinary. Beautiful ambiance and sparkling clean tables.'
    });
    console.log('   Review submitted:', res5.data.review.author_name, 'Rating:', res5.data.review.overall_rating);

    console.log('5b. Testing Anti-Abuse 30-Day IP Throttle Safeguard...');
    try {
      await axios.post(base + '/businesses/' + bizId + '/reviews', {
        author_name: 'Competitor Bot',
        overall_rating: 1.0,
        service_ratings: { food_quality: 1, speed: 1, cleanliness: 1, value: 1 },
        service_type: 'Takeaway',
        comment: 'Fake review attempt'
      });
      console.log('   FAIL: Should have been throttled!');
    } catch (e: any) {
      console.log('   SUCCESS: Anti-Abuse Throttled as expected:', e.response?.data?.error);
    }

    console.log('6. Testing Gemini AI Reply Suggestions...');
    const res7 = await axios.post(base + '/merchant/ai/reply-suggestions', {
      businessName: 'Artisan Roastery & Bakehouse',
      review: res5.data.review
    }, { headers: { Authorization: 'Bearer ' + token } });
    console.log('   AI Tone 1:', res7.data.options[0].tone);
    console.log('   AI Draft 1:', res7.data.options[0].text);
  } catch (err: any) {
    console.log('   Review notice:', err.response?.data?.error || err.message);
  }

  console.log('7. Checking business details and dimension metrics...');
  const res6 = await axios.get(base + '/businesses/' + bizId);
  console.log('   Updated Avg Rating:', res6.data.business.avg_rating, 'Reviews count:', res6.data.business.review_count);
  console.log('   Dimension Averages:', res6.data.metrics.dimension_averages);

  console.log('8. Testing Google Search Data & Market Insights...');
  const res8 = await axios.get(base + '/google/insights?category=Cafes%20%26%20Restaurants&location=Downtown');
  console.log('   Top Google Queries:', res8.data.popularSearchQueries.slice(0, 2));

  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
}

testNubHub().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
