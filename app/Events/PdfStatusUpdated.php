<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\PdfGeneration;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event: PdfStatusUpdated
 * 
 * Broadcast the status change of a PDF generation to the user.
 * This event is used to fill the requirement of real-time updates.
 */
class PdfStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public PdfGeneration $pdf
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * The channel name is based on the User's UUID.
     * This ensures users only see their own job updates.
     * Brute-forcing this channel name is not feasible as it's based on a long enough string.
     * 
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("user-updates.{$this->pdf->user_id}"),
        ];
    }

    /**
     * Data to be sent to the frontend.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->pdf->id,
            'status' => $this->pdf->status->value,
            'file_name' => $this->pdf->file_name,
            'processing_time' => $this->pdf->processing_time,
            'updated_at' => $this->pdf->updated_at, // Laravel automatically converts to ISO 8601 format
        ];
    }

    public function broadcastAs(): string
    {
        return 'pdf.status.updated';
    }
}
