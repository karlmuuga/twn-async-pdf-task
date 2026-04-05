import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { ChipProps } from '@mui/material';
import type { ReactElement } from 'react';
import type { ConnectionStatus, PdfStats, PdfStatus } from '@/hooks/usePdfJobs';

export const STATUS_LABELS: Record<PdfStatus, string> = {
    waiting: 'Waiting',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
};

export const STATUS_CHIP_COLORS: Record<PdfStatus, ChipProps['color']> = {
    waiting: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'default',
};

export const STATUS_CHIP_ICONS: Record<PdfStatus, ReactElement> = {
    waiting: <HourglassEmptyIcon fontSize="small" aria-hidden="true" />,
    processing: <AutorenewIcon fontSize="small" aria-hidden="true" />,
    completed: <CheckCircleIcon fontSize="small" aria-hidden="true" />,
    failed: <ErrorIcon fontSize="small" aria-hidden="true" />,
    cancelled: <CancelIcon fontSize="small" aria-hidden="true" />,
};

export const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
    connecting: 'Connecting...',
    connected: 'Connected',
    offline: 'Offline',
};

export const CONNECTION_COLORS: Record<ConnectionStatus, ChipProps['color']> = {
    connecting: 'warning',
    connected: 'success',
    offline: 'error',
};

export const STAT_CARD_ITEMS: Array<{ key: keyof PdfStats; label: string }> = [
    { key: 'waiting', label: 'Waiting' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
    { key: 'cancelled', label: 'Cancelled' },
];

export const formatDashboardDate = (timestamp: string | null): string => {
    if (!timestamp) {
        return 'N/A';
    }

    const asDate = new Date(timestamp);
    if (Number.isNaN(asDate.valueOf())) {
        return 'N/A';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(asDate);
};
