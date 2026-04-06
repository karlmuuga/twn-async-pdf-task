import axios from 'axios';
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

export type PdfStatus = 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ConnectionStatus = 'connecting' | 'connected' | 'offline';
export type ToastSeverity = 'success' | 'error' | 'info';

export interface PdfJob {
    id: number;
    status: PdfStatus;
    file_name: string | null;
    updated_at: string | null;
}

export interface PdfStats {
    total: number;
    waiting: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
}

interface StatusEventPayload {
    id?: number;
    status?: string;
    to?: string;
    file_name?: string | null;
    updated_at?: string | null;
}

export interface ActiveToast {
    id: string;
    /** false while the exit animation is playing, before the item is removed */
    open: boolean;
    message: string;
    severity: ToastSeverity;
}

interface QueuedStatusEvent {
    id: number;
    status: PdfStatus;
    file_name?: string | null;
    updated_at?: string | null;
}

interface UsePdfJobsResult {
    userId: string;
    jobs: PdfJob[];
    stats: PdfStats;
    loading: boolean;
    requestInFlight: boolean;
    errorMessage: string | null;
    generationCount: number;
    connectionStatus: ConnectionStatus;
    toasts: ActiveToast[];
    setGenerationCount: (value: number) => void;
    enqueueToast: (severity: ToastSeverity, message: string) => void;
    closeToast: (id: string) => void;
    createPdfJobs: (countOverride?: number) => Promise<void>;
    cancelPdfJob: (jobId: number) => Promise<void>;
}

type EchoLike = {
    channel: (name: string) => {
        listen: (event: string, callback: (payload: StatusEventPayload) => void) => void;
        stopListening: (event: string) => void;
    };
    leaveChannel: (name: string) => void;
    connector?: {
        pusher?: {
            connection?: {
                state?: string;
                bind: (event: string, callback: (state: { current: string }) => void) => void;
                unbind: (event: string, callback: (state: { current: string }) => void) => void;
            };
        };
    };
};

const STORAGE_KEY = 'user_id';
const EMPTY_STATS: PdfStats = {
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
};
const STATUS_KEYS: PdfStatus[] = ['waiting', 'processing', 'completed', 'failed', 'cancelled'];

/** RFC 4122 string form (matches Laravel `uuid` validation). */
const UUID_STRING = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRfc4122UuidString = (value: string): boolean => UUID_STRING.test(value);

const generateRandomUuid = (): string => {
    const c = globalThis.crypto;
    if (!c) {
        throw new Error('Web Crypto API is not available; cannot generate a user id.');
    }
    if (typeof c.randomUUID === 'function') {
        return c.randomUUID();
    }
    if (typeof c.getRandomValues !== 'function') {
        throw new Error('crypto.getRandomValues is not available; cannot generate a user id.');
    }
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Creates a persistent user ID for the user so that the user can be identified across sessions
 * and closing the browser tab won't lose the user's jobs.
 */
const createPersistentUserId = (): string => {
    if (typeof window === 'undefined') {
        throw new Error('createPersistentUserId must run in a browser environment.');
    }

    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && isRfc4122UuidString(existing)) {
        return existing;
    }

    const newId = generateRandomUuid();
    window.localStorage.setItem(STORAGE_KEY, newId);

    return newId;
};

const toPdfStatus = (value: string | undefined): PdfStatus => {
    if (value && STATUS_KEYS.includes(value as PdfStatus)) {
        return value as PdfStatus;
    }

    return 'waiting';
};

const normalizeJob = (input: unknown): PdfJob | null => {
    if (!input || typeof input !== 'object') {
        return null;
    }

    const raw = input as Record<string, unknown>;
    const id = Number(raw.id);
    if (!Number.isFinite(id)) {
        return null;
    }

    return {
        id,
        status: toPdfStatus(String(raw.status ?? 'waiting')),
        file_name: typeof raw.file_name === 'string' ? raw.file_name : null,
        updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    };
};

const normalizeJobs = (payload: unknown): PdfJob[] => {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map(job => normalizeJob(job))
        .filter((job): job is PdfJob => job !== null)
        .sort((a, b) => b.id - a.id);
};

const normalizeStats = (payload: unknown): PdfStats => {
    if (!payload || typeof payload !== 'object') {
        return EMPTY_STATS;
    }

    const raw = payload as Record<string, unknown>;

    return {
        total: Number(raw.total ?? 0),
        waiting: Number(raw.waiting ?? 0),
        processing: Number(raw.processing ?? 0),
        completed: Number(raw.completed ?? 0),
        failed: Number(raw.failed ?? 0),
        cancelled: Number(raw.cancelled ?? 0),
    };
};

const deriveStats = (jobs: PdfJob[]): PdfStats => {
    const next = { ...EMPTY_STATS, total: jobs.length };

    jobs.forEach(job => {
        next[job.status] += 1;
    });

    return next;
};

const mapConnectionState = (state: string | undefined): ConnectionStatus => {
    if (state === 'connected') {
        return 'connected';
    }

    if (state === 'connecting' || state === 'initialized') {
        return 'connecting';
    }

    return 'offline';
};

/**
 * The main hook that manages the PDF jobs and the user's connection status.
 * It loads the initial data, listens for status updates, and creates/cancels PDF jobs.
 */
export const usePdfJobs = (): UsePdfJobsResult => {
    const [userId] = useState<string>(() => createPersistentUserId());
    const [jobs, setJobs] = useState<PdfJob[]>([]);
    const [stats, setStats] = useState<PdfStats>(EMPTY_STATS);
    const [loading, setLoading] = useState<boolean>(true);
    const [requestInFlight, setRequestInFlight] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [generationCount, setGenerationCount] = useState<number>(1);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [toasts, setToasts] = useState<ActiveToast[]>([]);
    const initializedRef = useRef<boolean>(false);
    const jobsRef = useRef<PdfJob[]>([]);
    const pendingStatusEventsRef = useRef<Map<number, QueuedStatusEvent>>(new Map());
    const flushRafRef = useRef<number | null>(null);
    const toastIdRef = useRef<number>(0);

    const enqueueToast = useCallback((severity: ToastSeverity, message: string) => {
        const id = String(++toastIdRef.current);
        setToasts(prev => [...prev, { id, open: true, message, severity }]);
    }, []);

    useEffect(() => {
        let active = true;

        const loadInitialData = async () => {
            try {
                setLoading(true);
                setErrorMessage(null);

                const [jobsResponse, statsResponse] = await Promise.all([
                    axios.get('/api/pdf-generations', { params: { user_id: userId } }),
                    axios.get('/api/pdf-generations/aggregate', { params: { user_id: userId } }),
                ]);

                if (!active) {
                    return;
                }

                /*
                 * Mark as initialized before the transition so the stats
                 * derivation effect (which checks this flag) sees it as true
                 * when the deferred render commits.
                 */
                initializedRef.current = true;
                startTransition(() => {
                    setJobs(normalizeJobs(jobsResponse.data));
                    setStats(normalizeStats(statsResponse.data));
                });
            } catch {
                if (!active) {
                    return;
                }

                setErrorMessage('Failed to load your PDF jobs. Please refresh the page.');
                setStats(EMPTY_STATS);
                setJobs([]);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadInitialData();

        return () => {
            active = false;
        };
    }, [userId]);

    useEffect(() => {
        if (!initializedRef.current) {
            return;
        }

        setStats(deriveStats(jobs));
    }, [jobs]);

    useEffect(() => {
        jobsRef.current = jobs;
    }, [jobs]);

    const applyQueuedStatusEvents = useCallback((events: QueuedStatusEvent[]) => {
        if (events.length === 0) {
            return;
        }

        startTransition(() => {
            setJobs(previousJobs => {
                let nextJobs = previousJobs;
                let didChange = false;

                events.forEach(event => {
                    const jobIndex = nextJobs.findIndex(job => job.id === event.id);

                    if (jobIndex < 0) {
                        if (!didChange) {
                            nextJobs = [...nextJobs];
                            didChange = true;
                        }
                        nextJobs.unshift({
                            id: event.id,
                            status: event.status,
                            file_name: event.file_name ?? null,
                            updated_at: event.updated_at ?? null,
                        });
                        return;
                    }

                    const currentJob = nextJobs[jobIndex];
                    const hasFileNameUpdate = event.file_name !== undefined;
                    const hasUpdatedAtUpdate = event.updated_at !== undefined;

                    if (currentJob.status === event.status && !hasFileNameUpdate && !hasUpdatedAtUpdate) {
                        return;
                    }

                    if (!didChange) {
                        nextJobs = [...nextJobs];
                        didChange = true;
                    }

                    nextJobs[jobIndex] = {
                        ...currentJob,
                        status: event.status,
                        file_name: event.file_name !== undefined ? event.file_name : currentJob.file_name,
                        updated_at: event.updated_at !== undefined ? event.updated_at : currentJob.updated_at,
                    };
                });

                return didChange ? nextJobs : previousJobs;
            });
        });
    }, []);

    const flushQueuedStatusEvents = useCallback(() => {
        flushRafRef.current = null;

        const queuedEvents = Array.from(pendingStatusEventsRef.current.values());
        pendingStatusEventsRef.current.clear();
        applyQueuedStatusEvents(queuedEvents);
    }, [applyQueuedStatusEvents]);

    const scheduleQueuedStatusFlush = useCallback(() => {
        if (flushRafRef.current !== null) {
            return;
        }

        flushRafRef.current = window.requestAnimationFrame(flushQueuedStatusEvents);
    }, [flushQueuedStatusEvents]);

    /*
     * Listen for status updates and connection state changes.
     * Leave the channel when the component unmounts to avoid memory leaks.
     */
    useEffect(() => {
        const echo = (window as Window & { Echo?: EchoLike }).Echo;
        if (!echo) {
            setConnectionStatus('offline');
            return;
        }

        const channelName = `user-updates.${userId}`;
        const channel = echo.channel(channelName);
        const pusherConnection = echo.connector?.pusher?.connection;
        setConnectionStatus(mapConnectionState(pusherConnection?.state));

        const handleStateChange = (state: { current: string }) => {
            const mapped = mapConnectionState(state.current);
            startTransition(() => setConnectionStatus(mapped));
        };

        const handleStatusUpdate = (event: StatusEventPayload) => {
            const eventId = Number(event.id);
            if (!Number.isFinite(eventId)) {
                return;
            }

            const nextStatus = toPdfStatus(event.status ?? event.to);
            const existingJob = jobsRef.current.find(job => job.id === eventId);
            const shouldShowCompletedToast = existingJob?.status !== nextStatus && nextStatus === 'completed';
            const shouldShowFailedToast = existingJob?.status !== nextStatus && nextStatus === 'failed';

            pendingStatusEventsRef.current.set(eventId, {
                id: eventId,
                status: nextStatus,
                file_name: event.file_name,
                updated_at: event.updated_at,
            });
            scheduleQueuedStatusFlush();

            /*
             * Defer React state updates (setToast) completely out of the WebSocket
             * message handler callback so the browser does not attribute the
             * React render time to the 'message' handler and trigger violations.
             */
            if (shouldShowCompletedToast || shouldShowFailedToast) {
                setTimeout(() => {
                    if (shouldShowCompletedToast) {
                        enqueueToast('success', `PDF #${eventId} completed successfully.`);
                    }
                    if (shouldShowFailedToast) {
                        enqueueToast('error', `PDF #${eventId} failed to generate.`);
                    }
                }, 0);
            }
        };

        pusherConnection?.bind('state_change', handleStateChange);
        channel.listen('.pdf.generation.status.changed', handleStatusUpdate);

        return () => {
            pusherConnection?.unbind('state_change', handleStateChange);
            channel.stopListening('.pdf.generation.status.changed');
            echo.leaveChannel(channelName);
            if (flushRafRef.current !== null) {
                window.cancelAnimationFrame(flushRafRef.current);
                flushRafRef.current = null;
            }
            pendingStatusEventsRef.current.clear();
        };
    }, [enqueueToast, scheduleQueuedStatusFlush, userId]);

    /*
     * Create the PDF jobs.
     * It's main purpose is to send the request to the server, and update the jobs state.
     */
    const createPdfJobs = useCallback(async (countOverride?: number) => {
        const candidateCount = countOverride ?? generationCount;
        const sanitizedCount = Number.isFinite(candidateCount)
            ? Math.max(1, Math.min(100, Math.floor(candidateCount)))
            : 1;

        try {
            setRequestInFlight(true);
            setErrorMessage(null);

            const response = await axios.post('/api/pdf-generations', {
                user_id: userId,
                pdf_count: sanitizedCount,
            });

            const createdJobs = normalizeJobs(response.data);
            const createdIds = new Set(createdJobs.map(job => job.id));

            startTransition(() => {
                setJobs(previousJobs => [...createdJobs, ...previousJobs.filter(job => !createdIds.has(job.id))]);
                enqueueToast('info', `${createdJobs.length} PDF job${createdJobs.length === 1 ? '' : 's'} queued.`);
            });
        } catch {
            setErrorMessage('Could not start PDF generation. Please try again.');
        } finally {
            setRequestInFlight(false);
        }
    }, [enqueueToast, generationCount, userId]);

    /*
     * Cancel a PDF job.
     * Main purpose is to send the request to the server and update the jobs state.
     */
    const cancelPdfJob = useCallback(
        async (jobId: number) => {
            try {
                setRequestInFlight(true);
                setErrorMessage(null);

                const response = await axios.delete(`/api/pdf-generations/${jobId}`, {
                    data: { user_id: userId },
                });

                // Update the jobs state if the cancellation was successful
                if (response.data?.cancelled === true) {
                    startTransition(() => {
                        setJobs(previousJobs =>
                            previousJobs.map(job =>
                                job.id === jobId
                                    ? {
                                          ...job,
                                          status: 'cancelled',
                                          updated_at: new Date().toISOString(),
                                      }
                                    : job
                            )
                        );
                        // Show a notification to user that the job was cancelled
                        enqueueToast('info', `PDF #${jobId} cancelled.`);
                    });
                } else {
                    enqueueToast('error', `PDF #${jobId} could not be cancelled because it is no longer waiting.`);
                }
            } catch {
                setErrorMessage(`Could not cancel PDF #${jobId}.`);
                enqueueToast('error', `Failed to cancel PDF #${jobId}. Please try again.`);
            } finally {
                setRequestInFlight(false);
            }
        },
        [enqueueToast, userId]
    );

    const closeToast = useCallback((id: string) => {
        /*
         * First set open=false so the exit animation plays, then remove the
         * toast from the array after the animation duration (300ms).
         */
        setToasts(prev => prev.map(t => (t.id === id ? { ...t, open: false } : t)));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    return {
        userId,
        jobs,
        stats,
        loading,
        requestInFlight,
        errorMessage,
        generationCount,
        connectionStatus,
        toasts,
        setGenerationCount,
        enqueueToast,
        closeToast,
        createPdfJobs,
        cancelPdfJob,
    };
};
