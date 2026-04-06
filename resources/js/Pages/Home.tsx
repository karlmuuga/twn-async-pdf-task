import { PdfDashboardTemplate } from '@/Components/dashboard/PdfDashboardTemplate';
import { usePdfJobs } from '@/hooks/usePdfJobs';

export default function Home() {
    const dashboardState = usePdfJobs();

    return (
        <PdfDashboardTemplate
            userId={dashboardState.userId}
            jobs={dashboardState.jobs}
            stats={dashboardState.stats}
            loading={dashboardState.loading}
            requestInFlight={dashboardState.requestInFlight}
            errorMessage={dashboardState.errorMessage}
            generationCount={dashboardState.generationCount}
            connectionStatus={dashboardState.connectionStatus}
            toasts={dashboardState.toasts}
            onGenerationCountChange={dashboardState.setGenerationCount}
            onEnqueueToast={dashboardState.enqueueToast}
            onCreateJobs={dashboardState.createPdfJobs}
            onCancelJob={dashboardState.cancelPdfJob}
            onToastClose={dashboardState.closeToast}
        />
    );
}
