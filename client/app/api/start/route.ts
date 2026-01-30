import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  // Use BOT_START_URL from environment or fallback to localhost
  const botStartUrl =
    process.env.BOT_START_URL || "http://localhost:7860/start";

  try {
    // Prepare headers - make API key optional
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only add Authorization header if API key is provided
    if (process.env.BOT_START_PUBLIC_API_KEY) {
      headers.Authorization = `Bearer ${process.env.BOT_START_PUBLIC_API_KEY}`;
    }

    const response = await fetch(botStartUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        createDailyRoom: true,
        dailyRoomProperties: { start_video_off: true },
      }),
    });

    if (!response.ok) {
      // Log detailed error server-side
      const errorText = await response.text().catch(() => response.statusText);
      console.error("Pipecat API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      throw new Error(`Failed to connect to Pipecat: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      // Log error details server-side
      console.error("Pipecat API returned error:", data.error);
      throw new Error(data.error);
    }

    return NextResponse.json(data);
  } catch (error) {
    // Log full error details server-side for debugging
    console.error("API route error:", error);

    // Return generic error message to client (don't expose internal details)
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      { error: "Failed to process connection request" },
      { status: 500 }
    );
  }
}
