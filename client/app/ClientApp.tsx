"use client";

import {
  PipecatClientVideo,
  usePipecatClient,
  usePipecatClientCamControl,
  usePipecatClientScreenShareControl,
} from "@pipecat-ai/client-react";
import {
  Button,
  Card,
  CardContent,
  cn,
  ConnectButton,
  ConversationPanel,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePipecatConnectionState,
  UserAudioControl,
  UserScreenControl,
  UserVideoControl,
} from "@pipecat-ai/voice-ui-kit";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Logs, MonitorOff } from "lucide-react";
import Image from "next/image";
import { EventStreamPanel } from "./EventStreamPanel";
import { LAYOUT_CONSTANTS, UI_CONFIG } from "./constants";

interface ClientAppProps {
  connect?: () => void | Promise<void>;
  disconnect?: () => void | Promise<void>;
  isMobile: boolean;
}

export const ClientApp: React.FC<ClientAppProps> = ({
  connect,
  disconnect,
  isMobile,
}) => {
  const client = usePipecatClient();

  const { isDisconnected } = usePipecatConnectionState();
  const { isCamEnabled } = usePipecatClientCamControl();
  const { isScreenShareEnabled } = usePipecatClientScreenShareControl();

  const [hasDisconnected, setHasDisconnected] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (hasDisconnected) return;
    if (client && isDisconnected) {
      // Initialize devices when disconnected state is detected
      // Note: initDevices is intentionally not in dependencies as it's stable
      client.initDevices();
    }
  }, [client, hasDisconnected, isDisconnected]);

  const handleConnect = useCallback(async () => {
    try {
      await connect?.();
    } catch (error) {
      console.error("Connection error:", error);
    }
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    setHasDisconnected(true);
    await disconnect?.();
  }, [disconnect]);

  const handleToggleLogs = useCallback(() => {
    setShowLogs((prev) => !prev);
  }, []);

  const conversationPanel = useMemo(
    () => (
      <ConversationPanel
        conversationElementProps={{ textMode: "tts" }}
        noMetrics
        noTextInput
      />
    ),
    []
  );

  const renderScreenShareLayout = useCallback(
    (direction: "vertical" | "horizontal") => (
      <ResizablePanelGroup direction={direction} className="h-full gap-2">
        <ResizablePanel
          defaultSize={
            isScreenShareEnabled
              ? LAYOUT_CONSTANTS.CONVERSATION_PANEL_SIZE
              : 100
          }
          minSize={LAYOUT_CONSTANTS.MIN_PANEL_SIZE_MEDIUM}
        >
          {conversationPanel}
        </ResizablePanel>
        {isScreenShareEnabled && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={LAYOUT_CONSTANTS.SCREENSHARE_PANEL_SIZE}
              minSize={
                direction === "vertical"
                  ? LAYOUT_CONSTANTS.MIN_PANEL_SIZE_SMALL
                  : LAYOUT_CONSTANTS.MIN_PANEL_SIZE_MEDIUM
              }
            >
              <PipecatClientVideo
                className="h-full rounded-md w-full bg-white border overflow-hidden"
                fit="contain"
                participant="local"
                trackType="screenVideo"
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    ),
    [conversationPanel, isScreenShareEnabled]
  );

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={
        {
          "--controls-height": LAYOUT_CONSTANTS.CONTROLS_HEIGHT,
          "--header-height": LAYOUT_CONSTANTS.HEADER_HEIGHT,
        } as React.CSSProperties
      }
    >
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Image src="/superhack-logo.png" alt="Superbowl Football Assistant" width={120} height={36} />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Football Assistant
              </h1>
            </div>
            {!hasDisconnected && (
              <div className="flex items-center gap-4">
                <ConnectButton
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
                <Button
                  variant={showLogs ? "primary" : "outline"}
                  onClick={handleToggleLogs}
                  title={showLogs ? "Hide logs" : "Show logs"}
                  aria-label={showLogs ? "Hide event logs" : "Show event logs"}
                  aria-pressed={showLogs}
                >
                  <Logs />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {hasDisconnected ? (
        <main className="relative max-w-7xl mx-auto mt-8 px-4 h-[calc(100vh-var(--header-height))] overflow-hidden">
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <h1 className="text-2xl font-bold">
              Disconnected. See you next time!
            </h1>
            <Button onClick={() => window.location.reload()} aria-label="Reload page to connect again">
              Connect again
            </Button>
          </div>
        </main>
      ) : (
        <main className="relative max-w-7xl mx-auto mt-8 px-4 h-[calc(100vh-var(--header-height)-var(--controls-height))] overflow-hidden">
          <ResizablePanelGroup direction="vertical" className="h-full gap-2">
            <ResizablePanel
              defaultSize={LAYOUT_CONSTANTS.DEFAULT_PANEL_SIZE}
              minSize={LAYOUT_CONSTANTS.MIN_PANEL_SIZE_LARGE}
            >
              {/* Small screens: resizable split between conversation and screenshare */}
              <div className="lg:hidden! h-full">
                {renderScreenShareLayout("vertical")}
              </div>

              {/* Large screens: resizable split between conversation and screenshare */}
              <div className="hidden lg:block! h-full">
                {renderScreenShareLayout("horizontal")}
              </div>
            </ResizablePanel>
            <ResizableHandle
              className={cn({ hidden: !showLogs })}
              withHandle
            />
            <ResizablePanel
              defaultSize={LAYOUT_CONSTANTS.LOGS_PANEL_SIZE}
              minSize={LAYOUT_CONSTANTS.MIN_PANEL_SIZE_SMALL}
              className={cn("min-h-0", { hidden: !showLogs })}
            >
              <EventStreamPanel />
            </ResizablePanel>
          </ResizablePanelGroup>

          <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
            <Card>
              <CardContent className="flex items-center justify-center gap-2">
                <UserAudioControl
                  visualizerProps={{ barCount: UI_CONFIG.AUDIO_VISUALIZER_BAR_COUNT }}
                />
                <UserVideoControl noVideo />
                {!isMobile && <UserScreenControl noScreen />}
              </CardContent>
            </Card>
          </div>

          <div
            className={cn(
              "fixed bottom-8 right-8 w-64 rounded-xl overflow-hidden transition-all origin-bottom-right bg-white shadow-gray-600 shadow-md",
              {
                "opacity-0 scale-0": !isCamEnabled,
                "opacity-100 scale-100": isCamEnabled,
              }
            )}
          >
            <PipecatClientVideo participant="local" trackType="video" />
          </div>

          {isMobile && (
            <div className="mt-8">
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                    <MonitorOff className="h-5 w-5" />
                    <p className="font-medium">
                      Screen sharing is not available on mobile devices
                    </p>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Please use a desktop browser to access screen sharing
                    features.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      )}
    </div>
  );
};
