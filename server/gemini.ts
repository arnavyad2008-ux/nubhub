import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('[Gemini] Failed to initialize GoogleGenAI client with key, using heuristic intelligence:', err);
  }
}

// 1. Automated Content Moderation & Spam / Profanity Detection
const PROFANITY_LIST = [
  'scam', 'fraud', 'steal', 'thief', 'bastard', 'fuck', 'shit', 'bitch', 'asshole',
  'idiot', 'garbage', 'trash', 'crap', 'scammer', 'fake'
];

export async function moderateReviewContent(text: string, authorName: string): Promise<{
  isFlagged: boolean;
  reason?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
}> {
  const lower = text.toLowerCase();

  // Basic check for profanity or aggressive keywords
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return {
        isFlagged: true,
        reason: `Automated filter flagged potentially abusive or hostile keyword: "${word}"`,
        sentiment: 'negative',
        confidence: 0.95
      };
    }
  }

  // Check for spam repetition (e.g., "aaaaaaa", "buy now click here", etc.)
  if (/(.)\1{5,}/.test(text) || /(http|https|www\.|\.com|\.xyz)/i.test(text)) {
    return {
      isFlagged: true,
      reason: 'Automated filter detected external link or repetitive spam string',
      sentiment: 'negative',
      confidence: 0.9
    };
  }

  // If Gemini API is available, run deep LLM safety check
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an automated content moderation agent for local business reviews.
Analyze this customer review:
Author: "${authorName}"
Review: "${text}"

Respond in JSON format with:
{
  "isFlagged": boolean, // true if contains severe hate speech, personal harassment, profanity, or blatant competitor review bombing
  "reason": string, // brief explanation if flagged, or empty string
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": number // 0.0 to 1.0
}`
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        isFlagged: Boolean(parsed.isFlagged),
        reason: parsed.reason || undefined,
        sentiment: parsed.sentiment || 'neutral',
        confidence: parsed.confidence || 0.85
      };
    } catch (e) {
      console.warn('[Gemini] Moderation API call failed, falling back to local analysis:', e);
    }
  }

  // Heuristic sentiment analysis
  const positiveWords = ['great', 'excellent', 'amazing', 'superb', 'fresh', 'tasty', 'friendly', 'fast', 'love', 'clean', 'professional', 'best', 'delicious'];
  const negativeWords = ['terrible', 'slow', 'rude', 'dirty', 'cold', 'bad', 'worst', 'horrible', 'expensive', 'unclean', 'delayed'];

  let posCount = 0;
  let negCount = 0;
  for (const w of positiveWords) if (lower.includes(w)) posCount++;
  for (const w of negativeWords) if (lower.includes(w)) negCount++;

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (posCount > negCount) sentiment = 'positive';
  else if (negCount > posCount) sentiment = 'negative';

  return {
    isFlagged: false,
    sentiment,
    confidence: 0.8
  };
}

// 2. AI Merchant Reply Assistant
export async function generateMerchantReplies(businessName: string, review: {
  author_name: string;
  overall_rating: number;
  service_type: string;
  service_ratings: Record<string, number>;
  comment: string;
}) {
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a hospitality and reputation management specialist for "${businessName}".
Generate 3 distinct, professional, and authentic responses for the business owner to reply to this customer review:

Customer: ${review.author_name}
Rating: ${review.overall_rating}/5 stars (Visit: ${review.service_type})
Metric breakdown: ${JSON.stringify(review.service_ratings)}
Review Comment: "${review.comment}"

Return exactly a JSON object in this format:
{
  "options": [
    {
      "tone": "Warm & Gracious",
      "text": "..."
    },
    {
      "tone": "Professional & Action-Oriented",
      "text": "..."
    },
    {
      "tone": "Concise & Welcoming",
      "text": "..."
    }
  ],
  "sentiment_summary": "Short 1-sentence recap of what the customer appreciated or critiqued"
}`
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[Gemini] Reply generation API call failed, generating contextual template:', e);
    }
  }

  // Contextual heuristic generator when API key is not yet set
  const rating = Number(review.overall_rating);
  const name = review.author_name;

  if (rating >= 4) {
    return {
      options: [
        {
          tone: 'Warm & Gracious',
          text: `Hi ${name}, thank you so much for your kind words and 5-star rating! We are thrilled to hear you had a great ${review.service_type.toLowerCase()} experience at ${businessName}. Our entire team looks forward to welcoming you back soon!`
        },
        {
          tone: 'Professional & Action-Oriented',
          text: `Dear ${name}, thank you for choosing ${businessName} and for rating our service so favorably! Consistency and quality are our top priorities, and your feedback is truly appreciated by our team.`
        },
        {
          tone: 'Concise & Welcoming',
          text: `Thank you for the wonderful feedback, ${name}! We loved serving you and look forward to your next visit!`
        }
      ],
      sentiment_summary: `Customer had a positive ${review.service_type} experience with strong overall satisfaction.`
    };
  } else {
    return {
      options: [
        {
          tone: 'Empathetic & Solution-Oriented',
          text: `Dear ${name}, thank you for taking the time to share your honest feedback. We hold ourselves to high service standards and are truly sorry that your recent ${review.service_type.toLowerCase()} experience did not meet expectations. We would love the opportunity to make this right—please reach out to our management directly so we can assist you.`
        },
        {
          tone: 'Professional & Transparent',
          text: `Hello ${name}, thank you for bringing this to our attention. We have reviewed your notes regarding your visit and are addressing this with our staff immediately to ensure our speed and service quality remain first-class. We hope to welcome you again soon.`
        },
        {
          tone: 'Concise & Receptive',
          text: `Thank you for your feedback, ${name}. We apologize for falling short during your visit and are actively working on improvements based on your review.`
        }
      ],
      sentiment_summary: `Customer pointed out areas for service improvement during their ${review.service_type} visit.`
    };
  }
}

// 3. AI Service Dimension Insights & Synthesis
export async function generateServiceInsights(businessName: string, category: string, reviews: any[]) {
  if (reviews.length === 0) {
    return {
      summary: 'No customer reviews collected yet. Share your NubHub link to start gathering verified feedback!',
      strengths: [],
      areas_for_improvement: [],
      action_items: ['Display NubHub QR code or direct link at checkout', 'Encourage customers to rate specific service dimensions']
    };
  }

  if (aiClient) {
    try {
      const summaryPayload = reviews.map(r => ({
        author: r.author_name,
        rating: r.overall_rating,
        ratings: r.service_ratings,
        type: r.service_type,
        comment: r.comment
      }));

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an enterprise business intelligence analyst for NubHub.
Analyze these reviews for "${businessName}" (Category: ${category}):
${JSON.stringify(summaryPayload.slice(0, 20))}

Provide an executive JSON summary:
{
  "summary": "2-3 sentence executive summary of overall customer reception",
  "strengths": ["string", "string"], // top 2-3 specific service strengths
  "areas_for_improvement": ["string", "string"], // 1-2 constructive points
  "action_items": ["string", "string"] // 2 concrete actionable operational steps
}`
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[Gemini] Insights generation failed, using statistical breakdown:', e);
    }
  }

  // Statistical heuristic summary
  const avg = reviews.reduce((acc, r) => acc + Number(r.overall_rating), 0) / reviews.length;
  const isHigh = avg >= 4.0;

  return {
    summary: `Based on ${reviews.length} authentic customer reviews, ${businessName} holds an average rating of ${avg.toFixed(1)}/5.0 with strong customer sentiment across service categories.`,
    strengths: [
      isHigh ? 'High consistency in core quality and customer reception' : 'Identifiable customer base with specific service feedback',
      'Active responsiveness to multi-criteria service dimensions'
    ],
    areas_for_improvement: [
      'Monitor turnaround times and service speed during peak operational hours',
      'Maintain continuous engagement by responding promptly to all reviews'
    ],
    action_items: [
      'Promote your NubHub verified profile on your social channels and WhatsApp',
      'Acknowledge verified customer feedback within 24 hours to drive retention'
    ]
  };
}
