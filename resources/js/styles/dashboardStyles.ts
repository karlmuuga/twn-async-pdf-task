import type { SxProps, Theme } from '@mui/material/styles';

type Styles = Record<string, SxProps<Theme>>;

export const dashboardStyles: Styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3, md: 4 },
    },
    container: {
        maxWidth: 1280,
        mx: 'auto',
        display: 'grid',
        gap: 3,
    },
    header: {
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
    },
    headerTitle: {
        fontWeight: 700,
        color: '#111827',
        fontSize: { xs: '1.6rem', sm: '2rem' },
    },
    headerSubtitle: {
        color: '#374151',
    },
    connectionRegion: {
        display: 'grid',
        gap: 1,
        justifyItems: { xs: 'start', md: 'end' },
    },
    controlsCardContainer: {
        borderRadius: '15px',
    },
    controlsCard: {
        display: 'grid',
        gap: 2,
    },
    controlsRow: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
    },
    controlsInput: {
        flex: '1 1 auto',
        minWidth: 0,
        maxWidth: 280,
    },
    controlsHelper: {
        width: '100%',
        mt: 0.5,
        ml: 1.75,
    },
    statsGrid: {
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
        },
    },
    statCard: {
        p: 2,
        borderRadius: '15px',
        border: '1px solid #e5e7eb',
    },
    statLabel: {
        color: '#374151',
        fontWeight: 600,
    },
    statValue: {
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#111827',
    },
    tableCard: {
        borderRadius: '15px',
        border: '1px solid #e5e7eb',
    },
    desktopOnly: {
        display: { xs: 'none', md: 'block' },
    },
    mobileOnly: {
        display: { xs: 'grid', md: 'none' },
        gap: 1.5,
    },
    mobileJobCard: {
        p: 1.5,
        border: '1px solid #e5e7eb',
        borderRadius: '15px',
        display: 'grid',
        gap: 1,
    },
    mobileJobHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
    },
    mobileJobMeta: {
        display: 'grid',
        gap: 0.5,
    },
    mobileMetaLabel: {
        color: '#4b5563',
        fontSize: '0.8rem',
        fontWeight: 600,
    },
    mobileMetaValue: {
        color: '#111827',
        wordBreak: 'break-word',
    },
    mobileActions: {
        pt: 0.5,
    },
    tableContainer: {
        width: '100%',
        overflowX: 'auto',
    },
    tableHeadCell: {
        fontWeight: 700,
        color: '#111827',
        backgroundColor: '#f9fafb',
        whiteSpace: 'nowrap',
    },
    jobRow: {
        '&:focus-visible': {
            outline: '3px solid #2563eb',
            outlineOffset: '-3px',
        },
    },
    statusChip: {
        fontWeight: 700,
        '& .MuiChip-icon': {
            color: 'inherit',
        },
    },
    emptyState: {
        py: 5,
        textAlign: 'center',
        color: '#374151',
    },
    liveRegionText: {
        color: '#1f2937',
    },
};
