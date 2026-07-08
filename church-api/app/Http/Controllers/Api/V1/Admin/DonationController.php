<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\ApplyPaystackCharge;
use App\Enums\DonationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\DonationResource;
use App\Jobs\SendDonationReceipt;
use App\Models\Donation;
use App\Models\WebhookEvent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rules\Enum;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DonationController extends Controller
{
    /**
     * The cash ledger — newest first, filterable, paginated.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return DonationResource::collection(
            $this->filtered($request)->latestFirst()->paginate($request->integer('per_page', 15))
        );
    }

    /**
     * KPI snapshot: total raised, tithes vs offerings split, success rate.
     */
    public function stats(Request $request): JsonResponse
    {
        $base = $this->filtered($request);

        $total = (clone $base)->count();
        $byStatus = (clone $base)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $byPurpose = (clone $base)->successful()
            ->selectRaw('purpose_key, sum(amount) as total')
            ->groupBy('purpose_key')
            ->pluck('total', 'purpose_key');

        $successCount = (int) ($byStatus[DonationStatus::Success->value] ?? 0);

        return response()->json([
            'data' => [
                'total_raised' => (int) (clone $base)->successful()->sum('amount'),
                'total_count' => $total,
                'success_count' => $successCount,
                'pending_count' => (int) ($byStatus[DonationStatus::Pending->value] ?? 0),
                'failed_count' => (int) ($byStatus[DonationStatus::Failed->value] ?? 0),
                'success_rate' => $total > 0 ? round($successCount / $total * 100, 1) : 0.0,
                'by_purpose' => $byPurpose->map(fn ($v) => (int) $v),
            ],
        ]);
    }

    /**
     * Manually reconcile a donation (re-confirm a stuck "pending", void, etc.).
     * Dispatches the receipt when a gift becomes successful.
     */
    public function updateStatus(Request $request, Donation $donation): DonationResource
    {
        $validated = $request->validate([
            'status' => ['required', new Enum(DonationStatus::class)],
        ]);

        $next = DonationStatus::from($validated['status']);
        $wasSuccess = $donation->status === DonationStatus::Success;

        $donation->update(['status' => $next->value]);

        if ($next === DonationStatus::Success && ! $wasSuccess) {
            SendDonationReceipt::dispatch($donation);
        }

        return new DonationResource($donation->refresh());
    }

    /**
     * Pull missed transactions from Paystack (Transaction Verify API) and
     * reconcile any "pending" donation — recovers gifts whose webhook never
     * reached us (e.g. the server / tunnel was down). Each check is logged as a
     * synthetic webhook event so it stays visible and replayable.
     */
    public function sync(ApplyPaystackCharge $applyCharge): JsonResponse
    {
        $secret = config('services.paystack.secret_key');
        if (! is_string($secret) || $secret === '') {
            return response()->json(['message' => 'Clé secrète Paystack non configurée.'], 422);
        }

        $pending = Donation::query()
            ->where('status', DonationStatus::Pending->value)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();

        $reconciled = 0;

        foreach ($pending as $donation) {
            $response = Http::withToken($secret)->acceptJson()
                ->get("https://api.paystack.co/transaction/verify/{$donation->reference}");

            if (! $response->ok()) {
                continue;
            }

            $data = (array) $response->json('data', []);
            $payStatus = $data['status'] ?? null;

            $log = WebhookEvent::create([
                'provider' => 'paystack',
                'event' => 'sync.verify',
                'reference' => $donation->reference,
                'signature_valid' => true,
                'status' => 'received',
                'payload' => ['event' => 'charge.success', 'data' => $data],
            ]);

            if ($payStatus === 'success') {
                $applyCharge($data);
                $log->update(['status' => 'processed', 'processed_at' => now()]);
                $reconciled++;
            } else {
                if ($payStatus === 'failed') {
                    $donation->update(['status' => DonationStatus::Failed->value]);
                }
                $log->update(['status' => 'ignored', 'processed_at' => now()]);
            }
        }

        return response()->json(['data' => ['checked' => $pending->count(), 'reconciled' => $reconciled]]);
    }

    /**
     * Stream the (filtered) ledger as a CSV cash journal.
     */
    public function export(Request $request): StreamedResponse
    {
        $donations = $this->filtered($request)->latestFirst()->cursor();
        $filename = 'journal-dons-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($donations): void {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel renders accents correctly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Référence', 'Donateur', 'Email', 'Téléphone', 'Affectation', 'Montant', 'Devise', 'Fréquence', 'Statut', 'Canal', 'Date']);

            foreach ($donations as $d) {
                fputcsv($out, [
                    $d->reference, $d->donor_name, $d->donor_email, $d->donor_phone,
                    $d->purpose_key, $d->amount, $d->currency, $d->frequency->value,
                    $d->status->value, $d->channel, $d->created_at?->format('Y-m-d H:i'),
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Apply the shared list/stat filters (status, purpose, search, date range).
     *
     * `from`/`to` (Y-m-d) take priority when present — the free custom-range
     * picker in the admin UI. `year`/`month` are kept for backward
     * compatibility with any existing bookmarked filter state.
     *
     * @return Builder<Donation>
     */
    private function filtered(Request $request): Builder
    {
        return Donation::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('purpose_key'), fn ($q) => $q->where('purpose_key', $request->string('purpose_key')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->string('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->string('to')))
            ->when(! $request->filled('from') && ! $request->filled('to') && $request->filled('year'), fn ($q) => $q->whereYear('created_at', $request->integer('year')))
            ->when(! $request->filled('from') && ! $request->filled('to') && $request->filled('month'), fn ($q) => $q->whereMonth('created_at', $request->integer('month')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($w) => $w
                    ->where('reference', 'like', $term)
                    ->orWhere('donor_name', 'like', $term)
                    ->orWhere('donor_email', 'like', $term));
            });
    }
}
