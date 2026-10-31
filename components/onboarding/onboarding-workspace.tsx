"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanEvent } from "@/lib/types";
import { ConnectPanel } from "./connect-panel";
import {
  LiveScanTheater,
  type TheaterStatus,
  type ScanSummary,
} from "./live-scan-theater";

export function OnboardingWorkspace() {
  const router = useRouter();
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [status, setStatus] = useState<TheaterStatus>("idle");
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const startTs = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    return () => {
      esRef.current?.close();
      stopTimer();
    };
  }, []);

  const start = useCallback(() => {
    esRef.current?.close();
    stopTimer();
    setEvents([]);
    setSummary(null);
    setStatus("running");
    setStarting(true);
    setElapsed(0);
    startTs.current = Date.now();
    timer.current = setInterval(() => setElapsed((Date.now() - startTs.current) / 1000), 200);

    const es = new EventSource("/api/scan/stream?target=sample");
    esRef.current = es;

    es.onmessage = (msg) => {
      let data: {
        type: string;
        event?: ScanEvent;
        result?: {
          status: string;
          score: number;
          findingCount: number;
          fileCount: number;
          durationMs: number;
          source: { label: string };
          error?: string;
        };
      };
      try {
        data = JSON.parse(msg.data);
      } catch {
        return;
      }
      if (data.type === "event" && data.event) {
        setStarting(false);
        setEvents((prev) => [...prev, data.event!]);
      } else if (data.type === "result" && data.result) {
        const r = data.result;
        setStatus(r.status === "completed" ? "completed" : "failed");
        if (r.status === "completed") {
          setSummary({
            score: r.score,
            findingCount: r.findingCount,
            fileCount: r.fileCount,
            durationMs: r.durationMs,
            label: r.source.label,
          });
        }
      } else if (data.type === "error") {
        setStatus("failed");
      } else if (data.type === "done") {
        es.close();
        esRef.current = null;
        stopTimer();
        setStarting(false);
        // Revalidate server data so Overview / Fix show the real results.
        router.refresh();
      }
    };

    es.onerror = () => {
      setStatus((s) => (s === "running" ? "failed" : s));
      setStarting(false);
      stopTimer();
      es.close();
      esRef.current = null;
    };
  }, [router]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ConnectPanel onStart={start} scanning={status === "running"} />
      <LiveScanTheater
        events={events}
        status={status}
        elapsed={status === "completed" && summary ? summary.durationMs / 1000 : elapsed}
        summary={summary}
        starting={starting}
        onStart={start}
      />
    </div>
  );
}
