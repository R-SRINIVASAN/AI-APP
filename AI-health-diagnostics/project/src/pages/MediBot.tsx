import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Bot, User, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// WARNING: Hardcoding API keys like this is insecure.
const GEMINI_API_KEY = "AIzaSyB8LoMMNW3gbmYVbnv0iGSAN50H_LRqOMU"; // Use your key

// Corrected model name to the public 'gemini-1.5-flash'
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// UPDATED SYSTEM_PROMPT: 
// This version is designed to handle common symptoms (like "stomach pain")
// and has the 6th rule (date/time) removed as requested.
const SYSTEM_PROMPT = `You are Dr. MediBot, an AI health assistant. Your primary role is to provide general health-related information and basic medical knowledge. You are programmed to always prioritize safety.

Crucially:

1.  **EMERGENCY RESPONSE (TOP PRIORITY):** If a user describes symptoms indicating a **medical emergency (e.g., severe chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, stroke symptoms, sudden severe pain, severe injury)**, you MUST immediately advise them to call 108 (India's emergency number) or seek immediate professional medical attention. Do NOT attempt to provide any other advice.

2.  **OTHER GENERAL HEALTH INQUIRIES:** For all other general health topics (e.g., "How does exercise help?", "What is a balanced diet?"), provide helpful and informative responses based on widely accepted medical knowledge. Always include a disclaimer that you are an AI, not a doctor, and your information is for general knowledge, not a substitute for professional medical advice.

4.  **NON-MEDICAL QUERIES:** If the user's query is not related to health or medicine, you must refuse to answer. Use a polite, canned response like "I am Dr. MediBot, an AI designed to answer only health-related questions. For other inquiries, I suggest you consult a different resource."

Your tone should be helpful, empathetic, and responsible.
`;


interface ChatMessage {
  id: string;
  message: string;
  isBot: boolean;
  timestamp: Date;
}

const MediBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'initial-greeting',
          message: `Hello there! I'm Dr. MediBot, your AI health assistant. I'm here to help answer your **general health-related questions** and provide **basic medical information**. How can I assist you today? **Remember, I am not a substitute for a doctor.**`,
          isBot: true,
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = useCallback(async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();

    // --- Start of Pre-API checks ---
    const nonMedicalKeywords = [
      'weather', 'news', 'recipe', 'history', 'sports', 'movie', 'book', 'coding', 'programming',
      'joke', 'game', 'politics', 'math', 'science', 'art', 'music', 'travel', 'finance', 'stock',
      'crypto', 'ai', 'chatbot', 'what is your name'
    ];
    if (nonMedicalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "I am Dr. MediBot, an AI designed to answer only health-related questions. For other inquiries, I suggest you consult a different resource. 🤖🩺";
    }

    const emergencyKeywords = [
      'heart attack', 'emergency', 'trouble breathing', 'difficulty breathing',
      'severe injury', 'stroke symptoms', 'lose consciousness', 'fainted', 'severe bleeding',
      'unresponsive', 'choking', 'poisoning', 'burns', 'fracture', 'head injury', 'accident',
      'call ambulance', 'urgent care', 'collapse', 'sudden weakness', 'paralysis', '911', '108'
    ];
    if (lowerMessage.includes('severe chest pain') || emergencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "⚠️ **MEDICAL EMERGENCY:** If you are experiencing severe symptoms like **chest pain, difficulty breathing, sudden weakness, severe injuries, loss of consciousness, or severe bleeding**, please **call 108 (the emergency ambulance service in India) immediately** or go to the nearest emergency room. **Do not delay seeking immediate medical attention for serious conditions.** I cannot provide emergency medical care.";
    }

    const professionalGuidanceKeywords = [
       'diagnose me', 'what is wrong with me', 'my prescription', 'interpret my report', 'my test results'
    ];
    if (professionalGuidanceKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "I understand you're looking for specific medical advice. As an AI, I cannot provide personalized medical diagnoses, prescribe medications, or interpret your personal test results. It is crucial to consult with a **qualified doctor or healthcare professional** for proper evaluation.";
    }
    // --- End of Pre-API checks ---

    const geminiContents = messages
      .filter(msg => msg.id !== 'initial-greeting')
      .map(msg => ({
        role: msg.isBot ? 'model' : 'user',
        parts: [{ 
          text: msg.isBot 
            ? msg.message.replace(/\n\n\*Disclaimer:.*$/s, '')
            : msg.message 
        }],
      }));

    geminiContents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const payload = {
      contents: geminiContents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
      }
    };

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error calling Gemini API:', errorData);
        throw new Error(`Gemini API Error: ${errorData.error.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          console.warn('Gemini prompt block:', data.promptFeedback);
          return "I apologize, but your request was blocked due to safety policies. Please rephrase your question. Remember, for emergencies, call 108.";
        }
        throw new Error("No candidates in Gemini response.");
      }
      
      const content = data.candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0 || !content.parts[0].text) {
         if(data.candidates[0].finishReason === 'SAFETY') {
           console.warn('Gemini safety block:', data.candidates[0].safetyRatings);
           return "I apologize, but I am unable to provide a response to that specific query due to safety guidelines. Please ask a different health question. Remember, for emergencies, call 108.";
         }
        throw new Error("No text content in Gemini response candidate.");
      }

      const botResponse = content.parts[0].text;

      if (!botResponse.includes("Disclaimer:")) {
           return `${botResponse}\n\n*Disclaimer: This information is AI-generated and for general knowledge. Always consult a healthcare professional for personalized medical advice.*`;
      }
      return botResponse;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('API key not valid'))) {
          return "I apologize, but there seems to be an issue with the Gemini API key. Please check that it is correct and enabled. Remember, for any specific health concerns, always consult a medical professional.";
      }
      if (error instanceof Error && error.message.includes('400')) {
          return "I apologize, but the request was malformed. This might be due to an API change. Please check the code. For any specific health concerns, always consult a medical professional.";
      }
      return "I apologize, but I'm currently having trouble connecting to my knowledge base. Please try again in a moment. Remember, for any specific health concerns, always consult a medical professional.";
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputMessage,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const botResponse = await generateBotResponse(userMessage.message);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: botResponse,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Failed to generate response:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: "I apologize, but there was an unexpected error. Please try again or consult with a healthcare professional for your health concerns.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'initial-greeting',
        message: `Hello there! I'm Dr. MediBot, your AI health assistant. I'm here to help answer your **general health-related questions** and provide **basic medical information**. How can I assist you today? **Remember, I am not a substitute for a doctor.**`,
        isBot: true,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6 pt-4">
        <div className="flex items-center space-x-4">
          <MessageCircle className="h-8 w-8 text-blue-600" />
          <div>
            {/* ================================================================== */}
            {/* THIS IS THE LINE THAT WAS FIXED */}
            {/* ================================================================== */}
            <h1 className="text-3xl font-bold text-gray-900">Dr. MediBot</h1>
            <p className="text-gray-600 text-sm">Your AI health assistant for general health questions</p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={clearChat}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-lg flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-start space-x-3 max-w-3xl ${message.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.isBot ? 'bg-blue-100' : 'bg-blue-600 text-white'
                }`}>
                  {message.isBot ? (
                    <Bot className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>

                <div className="rounded-lg p-4 max-w-[80%] flex flex-col"
                  style={{
                    backgroundColor: message.isBot ? 'rgb(239 246 255)' : 'rgb(243 244 246)',
                    borderColor: message.isBot ? 'rgb(191 219 254)' : 'rgb(229 231 235)',
                    borderWidth: '1px'
                  }}
                >
                  <div className="text-gray-800 leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {message.message}
                    </ReactMarkdown>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 self-end">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-3xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
                  <div className="typing-indicator flex space-x-1">
                    <span className="dot animate-bounce delay-0">.</span>
                    <span className="dot animate-bounce delay-100">.</span>
                    <span className="dot animate-bounce delay-200">.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center space-x-4">
          <textarea
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none custom-scrollbar"
            rows={1}
            placeholder="Ask Dr. MediBot a health question..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isTyping}
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            disabled={!inputMessage.trim() || isTyping}
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediBot;