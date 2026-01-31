#
# Copyright (c) 2024–2026, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Gemini Bot Implementation.

This module implements a chatbot using Google's Gemini Multimodal Live model.
It includes:

- Real-time audio/video interaction
- Screen sharing analysis for American Football educational assistance
- Speech-to-speech model with visual reasoning

The bot runs as part of a pipeline that processes audio/video frames and manages
the conversation flow using Gemini's streaming capabilities. It serves as an
educational assistant for learning American Football.
"""

import os

from dotenv import load_dotenv
from google.genai.types import ThinkingConfig
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import (
    LLMRunFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService, InputParams
from pipecat.transports.base_transport import BaseTransport
from pipecat.transports.daily.transport import DailyParams

load_dotenv(override=True)

SYSTEM_INSTRUCTION = f"""
You are a friendly and patient American Football educational assistant, specializing in helping beginners understand the game.
Your role is to:
- Explain rules and basic concepts in beginner-friendly terms
- Analyze plays, formations, and strategies visible on screen-shared content
- Answer questions about what's happening in real-time
- Provide context about football history, teams, and significant moments when relevant

When analyzing screen-shared content:
- Describe what you see: players, formations, down/distance, score, field position
- Explain the significance of what's happening
- Break down complex plays into simple, understandable parts
- Use visual cues from the screen to enhance your explanations

Tone and approach:
- Be friendly, enthusiastic, and patient with beginners
- Use simple language and avoid jargon when possible (or explain jargon when you use it)
- Make learning fun and engaging
- Celebrate exciting plays and moments
- If someone asks about something not visible on screen, explain it clearly


When the conversation starts, introduce yourself briefly as a Football Coach assistant and explain that you're here to help them learn about American Football by analyzing whatever content they share on their screen.
"""


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    """Main bot execution function.

    Sets up and runs the bot pipeline including:
    - Gemini Live multimodal model integration
    - Voice activity detection
    """

    # Initialize the Gemini Multimodal Live model
    llm = GeminiLiveLLMService(
        api_key=os.getenv("GOOGLE_API_KEY"),
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice_id="Charon",  # Aoede, Charon, Fenrir, Kore, Puck
        system_instruction=SYSTEM_INSTRUCTION,
        params=InputParams(thinking=ThinkingConfig(thinking_budget=0)),
    )

    messages = [
        {
            "role": "user",
            "content": "Welcome the user to the Football Assistant! Introduce yourself as their Football Coach assistant and explain that you can help them learn about American Football by analyzing screen-shared content like game footage, play diagrams, or stats. Encourage them to share their screen showing any football content they'd like to learn about.",
        },
    ]

    # Set up conversation context and management
    # The context aggregator will automatically collect conversation context
    context = LLMContext(messages)
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            user_aggregator,
            llm,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, participant):
        logger.info(f"Client connected")
        await transport.capture_participant_video(participant["id"], 30, "camera")
        await transport.capture_participant_video(participant["id"], 30, "screenVideo")
        # Start the conversation with initial message
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)

    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point for the bot starter."""

    # Krisp is available when deployed to Pipecat Cloud
    if os.environ.get("ENV") != "local":
        from pipecat.audio.filters.krisp_viva_filter import KrispVivaFilter

        krisp_filter = KrispVivaFilter()
    else:
        krisp_filter = None

    transport_params = {
        "daily": lambda: DailyParams(
            audio_in_enabled=True,
            audio_in_filter=krisp_filter,
            audio_out_enabled=True,
            video_in_enabled=True,
            vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.5)),
        )
    }

    transport = await create_transport(runner_args, transport_params)

    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
