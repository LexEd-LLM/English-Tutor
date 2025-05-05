import { NextResponse } from "next/server";

interface ChatRequest {
  history: Array<{
    role: "user" | "bot";
    content: string;
  }>;
  pageContent: string;
  promptText: string;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { history, pageContent, promptText } = body;

    // Validation
    if (!promptText) {
      return NextResponse.json(
        { error: "Prompt text is required" },
        { status: 400 }
      );
    }

    try {
      // Here you would call your FastAPI backend
      // This is just a placeholder that simulates a response
      // Replace with actual API call to your FastAPI backend
      
      // Example API call (commented out)
      // const response = await fetch("http://your-fastapi-backend/chat", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     history,
      //     pageContent,
      //     promptText,
      //   }),
      // });
      // const data = await response.json();
      
      // For now, just simulate a response with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate response based on the prompt
      let responseText = "";
      if (promptText.toLowerCase().includes("hello") || promptText.toLowerCase().includes("hi")) {
        responseText = "Hello! How can I help you with your learning today?";
      } else if (promptText.toLowerCase().includes("help")) {
        responseText = "I'm here to help! What specific topic would you like assistance with?";
      } else if (promptText.toLowerCase().includes("explain") || promptText.toLowerCase().includes("what is")) {
        responseText = `I'd be happy to explain that. ${pageContent ? "Based on the current page content, " : ""}This is a complex topic that involves several key concepts...`;
      } else {
        responseText = "That's an interesting question. Let me help you understand this better. First, let's break it down...";
      }

      return NextResponse.json({
        response: responseText,
      });
    } catch (error) {
      console.error("Error calling FastAPI:", error);
      return NextResponse.json(
        { error: "Failed to communicate with AI service" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
} 