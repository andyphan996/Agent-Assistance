import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function TestGemini() {
  const [output, setOutput] = useState('');
  
  const handleTest = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hello, world!"
      });
      setOutput("Success! " + res.text);
    } catch (e: any) {
      setOutput("Error: " + e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleTest}>Test Gemini</button>
      <pre>{output}</pre>
    </div>
  );
}
