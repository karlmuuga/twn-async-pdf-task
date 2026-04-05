<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\PdfStatus;
use App\Models\PdfGeneration;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PdfGenerationStatusChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public PdfGeneration $pdf,
        public PdfStatus $from,
        public PdfStatus $to,
        /** @var array<string, mixed> */
        public array $transitionMeta = [],
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("user-updates.{$this->pdf->user_id}"),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->pdf->id,
            'from' => $this->from->value,
            'to' => $this->to->value,
            'status' => $this->pdf->status->value,
            'file_name' => $this->pdf->file_name,
            'processing_time' => $this->pdf->processing_time,
            'updated_at' => $this->pdf->updated_at,
            'transition_meta' => $this->transitionMeta,
        ];
    }

    public function broadcastAs(): string
    {
        return 'pdf.generation.status.changed';
    }
}
