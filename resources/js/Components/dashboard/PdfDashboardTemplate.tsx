import LinkOffIcon from '@mui/icons-material/LinkOff';
import WifiIcon from '@mui/icons-material/Wifi';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    FormHelperText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ActiveToast, ConnectionStatus, PdfJob, PdfStats, ToastSeverity } from '@/hooks/usePdfJobs';
import { dashboardStyles } from '@/styles/dashboardStyles';
import {
    CONNECTION_COLORS,
    CONNECTION_LABELS,
    formatDashboardDate,
    STAT_CARD_ITEMS,
    STATUS_CHIP_COLORS,
    STATUS_CHIP_ICONS,
    STATUS_LABELS,
} from './dashboardViewConfig';

interface PdfDashboardTemplateProps {
    userId: string;
    jobs: PdfJob[];
    stats: PdfStats;
    loading: boolean;
    requestInFlight: boolean;
    errorMessage: string | null;
    generationCount: number;
    connectionStatus: ConnectionStatus;
    toasts: ActiveToast[];
    onGenerationCountChange: (value: number) => void;
    onEnqueueToast: (severity: ToastSeverity, message: string) => void;
    onCreateJobs: (countOverride?: number) => Promise<void>;
    onCancelJob: (jobId: number) => void;
    onToastClose: (id: string) => void;
}

const getFileNameDisplay = (job: PdfJob): string => {
    if (job.file_name) {
        return job.file_name;
    }

    if (job.status === 'cancelled') {
        return 'Not available';
    }

    return 'Pending file name';
};

interface JobRowProps {
    job: PdfJob;
    onCancelJob: (jobId: number) => void;
}

interface GenerateControlsProps {
    initialGenerationCount: number;
    requestInFlight: boolean;
    errorMessage: string | null;
    onGenerationCountChange: (value: number) => void;
    onEnqueueToast: (severity: ToastSeverity, message: string) => void;
    onCreateJobs: (countOverride?: number) => Promise<void>;
}

const GenerateControls = memo(
    ({
        initialGenerationCount,
        requestInFlight,
        errorMessage,
        onGenerationCountChange,
        onEnqueueToast,
        onCreateJobs,
    }: GenerateControlsProps) => {
        const inputRef = useRef<HTMLInputElement | null>(null);

        const isValidCount = useCallback((trimmed: string): boolean => {
            if (trimmed === '') return false;
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 100;
        }, []);

        /** Silently clears the field on blur if the value is not a valid count. */
        const handleBlur = useCallback(() => {
            const trimmed = (inputRef.current?.value ?? '').trim();
            if (!isValidCount(trimmed) && inputRef.current) {
                inputRef.current.value = '';
            } else if (isValidCount(trimmed)) {
                onGenerationCountChange(Number(trimmed));
            }
        }, [isValidCount, onGenerationCountChange]);

        /**
         * Validates on explicit generate (button / Enter).
         * Returns the parsed count, or null after clearing + toasting on invalid input.
         */
        const validateInput = useCallback((): number | null => {
            const trimmed = (inputRef.current?.value ?? '').trim();

            if (!isValidCount(trimmed)) {
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
                onEnqueueToast('error', 'Please enter a whole number between 1 and 100.');
                return null;
            }

            const parsed = Number(trimmed);
            onGenerationCountChange(parsed);
            return parsed;
        }, [isValidCount, onEnqueueToast, onGenerationCountChange]);

        const handleGenerate = useCallback(async () => {
            const count = validateInput();
            if (count === null) return;
            await onCreateJobs(count);
        }, [validateInput, onCreateJobs]);

        const handleKeyDown = useCallback(
            async (event: ReactKeyboardEvent<HTMLInputElement>) => {
                if (event.key !== 'Enter') {
                    return;
                }
                event.preventDefault();
                await handleGenerate();
            },
            [handleGenerate]
        );

        const handleFocus = useCallback(
            (e: React.FocusEvent<HTMLInputElement>) => {
                const target = e.currentTarget;
                setTimeout(() => target.select(), 0);
            },
            []
        );

        return (
            <Card sx={dashboardStyles.controlsCardContainer}>
                <CardContent sx={dashboardStyles.controlsCard}>
                    <Typography variant="h6" component="h2">
                        Generate PDFs
                    </Typography>

                    <Box>
                        <Box sx={dashboardStyles.controlsRow}>
                            <TextField
                                id="pdf-count"
                                label="Number of PDFs"
                                type="text"
                                defaultValue={String(initialGenerationCount)}
                                inputRef={inputRef}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                onKeyDown={handleKeyDown}
                                slotProps={{
                                    htmlInput: {
                                        inputMode: 'numeric',
                                        pattern: '[0-9]*',
                                        'aria-describedby': 'pdf-count-helper',
                                    },
                                }}
                                size="small"
                                sx={{
                                    ...dashboardStyles.controlsInput,
                                    '& .MuiOutlinedInput-root': { borderRadius: '15px' }
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleGenerate}
                                disabled={requestInFlight}
                                aria-label="Generate selected number of PDF jobs"
                                sx={{ flexShrink: 0, alignSelf: 'center', borderRadius: '15px' }}
                            >
                                Generate
                            </Button>
                        </Box>
                        <FormHelperText id="pdf-count-helper" sx={dashboardStyles.controlsHelper}>
                            Choose between 1 and 100.
                        </FormHelperText>
                    </Box>

                    {errorMessage && (
                        <Alert severity="error" role="alert">
                            {errorMessage}
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    }
);

const DesktopJobRow = memo(({ job, onCancelJob }: JobRowProps) => (
    <TableRow key={job.id} tabIndex={0} sx={dashboardStyles.jobRow}>
        <TableCell>{job.id}</TableCell>
        <TableCell>
            <Chip
                icon={STATUS_CHIP_ICONS[job.status]}
                color={STATUS_CHIP_COLORS[job.status]}
                label={STATUS_LABELS[job.status]}
                sx={dashboardStyles.statusChip}
            />
        </TableCell>
        <TableCell>{getFileNameDisplay(job)}</TableCell>
        <TableCell>{formatDashboardDate(job.updated_at)}</TableCell>
        <TableCell>
            {job.status === 'waiting' && (
                <Button
                    variant="outlined"
                    color="error"
                    onClick={() => onCancelJob(job.id)}
                    aria-label={`Cancel PDF job ${job.id}`}
                    sx={{ borderRadius: '15px' }}
                >
                    Cancel
                </Button>
            )}
            {job.status === 'completed' && (
                <Button
                    href="/sample.pdf"
                    download={job.file_name ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="outlined"
                    color="success"
                    aria-label={`Download PDF job ${job.id}`}
                    sx={{ borderRadius: '15px' }}
                >
                    Download
                </Button>
            )}
        </TableCell>
    </TableRow>
));

const MobileJobCard = memo(({ job, onCancelJob }: JobRowProps) => (
    <Card key={job.id} sx={dashboardStyles.mobileJobCard} tabIndex={0}>
        <Box sx={dashboardStyles.mobileJobHeader}>
            <Typography variant="subtitle1" component="h3">
                Job #{job.id}
            </Typography>
            <Chip
                icon={STATUS_CHIP_ICONS[job.status]}
                color={STATUS_CHIP_COLORS[job.status]}
                label={STATUS_LABELS[job.status]}
                sx={dashboardStyles.statusChip}
            />
        </Box>

        <Box sx={dashboardStyles.mobileJobMeta}>
            <Typography component="p" sx={dashboardStyles.mobileMetaLabel}>
                File Name
            </Typography>
            <Typography component="p" sx={dashboardStyles.mobileMetaValue}>
                {getFileNameDisplay(job)}
            </Typography>
        </Box>

        <Box sx={dashboardStyles.mobileJobMeta}>
            <Typography component="p" sx={dashboardStyles.mobileMetaLabel}>
                Last Updated
            </Typography>
            <Typography component="p" sx={dashboardStyles.mobileMetaValue}>
                {formatDashboardDate(job.updated_at)}
            </Typography>
        </Box>

        {job.status === 'waiting' && (
            <Box sx={dashboardStyles.mobileActions}>
                <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={() => onCancelJob(job.id)}
                    aria-label={`Cancel PDF job ${job.id}`}
                    sx={{ borderRadius: '15px' }}
                >
                    Cancel
                </Button>
            </Box>
        )}
        {job.status === 'completed' && (
            <Box sx={dashboardStyles.mobileActions}>
                <Button
                    fullWidth
                    href="/sample.pdf"
                    download={job.file_name ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="outlined"
                    color="success"
                    aria-label={`Download PDF job ${job.id}`}
                    sx={{ borderRadius: '15px' }}
                >
                    Download
                </Button>
            </Box>
        )}
    </Card>
));

const ToastItem = memo(({ toast, onClose }: { toast: ActiveToast; onClose: (id: string) => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(toast.id), 5000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    return (
        <Collapse in={toast.open} timeout={300}>
            <Alert
                onClose={() => onClose(toast.id)}
                severity={toast.severity}
                role="status"
                aria-live={toast.severity === 'error' ? 'assertive' : 'polite'}
                variant="filled"
                sx={{ mb: 1, boxShadow: 3 }}
            >
                {toast.message}
            </Alert>
        </Collapse>
    );
});

export const PdfDashboardTemplate = ({
    userId,
    jobs,
    stats,
    loading,
    requestInFlight,
    errorMessage,
    generationCount,
    connectionStatus,
    toasts,
    onGenerationCountChange,
    onEnqueueToast,
    onCreateJobs,
    onCancelJob,
    onToastClose,
}: PdfDashboardTemplateProps) => {
    const jobsSectionRef = useRef<HTMLDivElement | null>(null);
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(max-width:899px)').matches
    );

    useEffect(() => {
        const mq = window.matchMedia('(max-width:899px)');
        const handler = (e: MediaQueryListEvent) => {
            /*
             * Wrap in startTransition so the layout switch is a low-priority
             * deferred render. The 'change' handler returns instantly and
             * Chrome will not log a violation for it.
             */
            startTransition(() => setIsMobile(e.matches));
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const handleCreateAndScroll = useCallback(async (countOverride?: number) => {
        await onCreateJobs(countOverride);
        /*
        * On smaller screens, scroll to the jobs section after creating the jobs
        * so the resulting jobs are immediately visible.
        */
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches) {
            window.requestAnimationFrame(() => {
                jobsSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            });
        }
    }, [onCreateJobs]);

    const statsContent = useMemo(
        () =>
            STAT_CARD_ITEMS.map(item => (
                <Card key={item.key} sx={dashboardStyles.statCard}>
                    <Typography component="p" sx={dashboardStyles.statLabel}>
                        {item.label}
                    </Typography>
                    <Typography component="p" sx={dashboardStyles.statValue}>
                        {stats[item.key]}
                    </Typography>
                </Card>
            )),
        [stats]
    );

    const jobsContent = useMemo(() => {
        if (isMobile) {            return (
                <Box aria-label="PDF job list for mobile" sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                    {loading ? (
                        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                            <CircularProgress size={26} aria-label="Loading jobs" />
                        </Box>
                    ) : jobs.length === 0 ? (
                        <Box sx={dashboardStyles.emptyState}>No PDF jobs yet. Create one to get started.</Box>
                    ) : (
                        jobs.map(job => (
                            <MobileJobCard key={job.id} job={job} onCancelJob={onCancelJob} />
                        ))
                    )}
                </Box>
            );
        }

        return (
            <TableContainer sx={dashboardStyles.tableContainer}>
                <Table aria-label="PDF job table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={dashboardStyles.tableHeadCell}>ID</TableCell>
                            <TableCell sx={dashboardStyles.tableHeadCell}>Status</TableCell>
                            <TableCell sx={dashboardStyles.tableHeadCell}>File Name</TableCell>
                            <TableCell sx={dashboardStyles.tableHeadCell}>Last Updated</TableCell>
                            <TableCell sx={dashboardStyles.tableHeadCell}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                                        <CircularProgress size={26} aria-label="Loading jobs" />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} sx={dashboardStyles.emptyState}>
                                    No PDF jobs yet. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map(job => (
                                <DesktopJobRow key={job.id} job={job} onCancelJob={onCancelJob} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }, [isMobile, jobs, loading, onCancelJob]);

    return (
        <Box component="main" sx={dashboardStyles.page}>
        <Box sx={dashboardStyles.container}>
            <Box component="header" sx={dashboardStyles.header}>
                <Box>
                    <Typography variant="h4" component="h1" sx={dashboardStyles.headerTitle}>
                        TWN PDF Generation Dashboard
                    </Typography>
                    <Typography component="p" variant="body2" sx={dashboardStyles.headerSubtitle}>
                        User UUID: {userId}
                    </Typography>
                </Box>

                <Box sx={dashboardStyles.connectionRegion}>
                    <Button
                        href="/horizon"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        aria-label="Open Horizon dashboard in a new tab"
                        sx={{ borderRadius: '15px' }}
                    >
                        Horizon Dashboard
                    </Button>
                    <Chip
                        icon={connectionStatus === 'offline' ? <LinkOffIcon aria-hidden="true" /> : <WifiIcon aria-hidden="true" />}
                        color={CONNECTION_COLORS[connectionStatus]}
                        label={`WebSocket: ${CONNECTION_LABELS[connectionStatus]}`}
                        role="status"
                        aria-live="polite"
                    />
                </Box>
            </Box>

            <GenerateControls
                initialGenerationCount={generationCount}
                requestInFlight={requestInFlight}
                errorMessage={errorMessage}
                onGenerationCountChange={onGenerationCountChange}
                onEnqueueToast={onEnqueueToast}
                onCreateJobs={handleCreateAndScroll}
            />

            <Box component="section" aria-label="Job statistics" sx={dashboardStyles.statsGrid}>
                {statsContent}
            </Box>

            <Paper ref={jobsSectionRef} sx={dashboardStyles.tableCard}>
                {jobsContent}
            </Paper>

            <Box
                aria-live="polite"
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1400,
                    width: 360,
                    maxWidth: 'calc(100vw - 32px)',
                }}
            >
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onClose={onToastClose} />
                ))}
            </Box>
        </Box>
    </Box>
    );
};
