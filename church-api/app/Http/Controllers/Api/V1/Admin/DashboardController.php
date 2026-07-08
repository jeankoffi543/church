<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Convert;
use App\Models\Donation;
use App\Models\EvangelismCampaign;
use App\Models\FollowUp;
use App\Models\Member;
use App\Models\OfferingCollection;
use App\Models\ResourceBooking;
use App\Models\Service;
use App\Models\ServiceAssignment;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * One aggregated snapshot of every "Vie de l'Église" module for the
     * requested period (default: this month). Each section is gated by the
     * caller's own permissions — a Huissier sees only what they could reach
     * directly — and is simply absent from the payload when unauthorized,
     * not zeroed, so the frontend can tell "no data" apart from "no access".
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $from = $request->filled('from') ? $request->string('from')->toString() : now()->startOfMonth()->toDateString();
        $to = $request->filled('to') ? $request->string('to')->toString() : now()->toDateString();

        $data = [];

        if ($this->authorized($user, ['view_members', 'manage_members'])) {
            $data['members'] = [
                'total' => Member::count(),
                'active' => Member::where('status', 'actif')->count(),
                'new_in_period' => Member::whereDate('created_at', '>=', $from)->whereDate('created_at', '<=', $to)->count(),
            ];
        }

        $canViewAttendance = $this->authorized($user, ['view_attendance', 'manage_attendance']);

        if ($this->authorized($user, ['view_services', 'manage_services'])) {
            $servicesInPeriod = Service::query()->whereDate('date', '>=', $from)->whereDate('date', '<=', $to);

            $data['services'] = [
                'count_in_period' => (clone $servicesInPeriod)->count(),
                'attendance_in_period' => $canViewAttendance
                    ? (int) Attendance::whereHas('service', fn ($q) => $q->whereDate('date', '>=', $from)->whereDate('date', '<=', $to))->sum('count')
                    : null,
            ];
        }

        if ($canViewAttendance) {
            $data['attendance_trend'] = Service::query()
                ->whereDate('date', '>=', $from)->whereDate('date', '<=', $to)
                ->withSum('attendances as attendance_total', 'count')
                ->orderBy('date')
                ->get(['id', 'date'])
                ->map(fn ($s) => ['date' => $s->date->format('Y-m-d'), 'count' => (int) ($s->attendance_total ?? 0)])
                ->values();
        }

        if ($this->authorized($user, ['view_finances'])) {
            $onlineByNature = Donation::query()->successful()
                ->whereDate('created_at', '>=', $from)->whereDate('created_at', '<=', $to)
                ->selectRaw('purpose_key as nature, sum(amount) as total')
                ->groupBy('purpose_key')
                ->pluck('total', 'nature')
                ->map(fn ($v) => (int) $v);

            $cashByNature = OfferingCollection::query()
                ->whereHas('service', fn ($q) => $q->whereDate('date', '>=', $from)->whereDate('date', '<=', $to))
                ->selectRaw('nature, sum(amount) as total')
                ->groupBy('nature')
                ->pluck('total', 'nature')
                ->map(fn ($v) => (int) $v);

            $natures = $onlineByNature->keys()->merge($cashByNature->keys())->unique()->values();
            $byNature = $natures->mapWithKeys(fn ($n) => [
                $n => (int) ($onlineByNature[$n] ?? 0) + (int) ($cashByNature[$n] ?? 0),
            ]);

            $data['giving'] = [
                'total' => (int) $onlineByNature->sum() + (int) $cashByNature->sum(),
                'en_ligne' => (int) $onlineByNature->sum(),
                'especes' => (int) $cashByNature->sum(),
                'by_nature' => $byNature,
            ];
        }

        if ($this->authorized($user, ['view_evangelism', 'manage_evangelism'])) {
            $data['evangelism'] = [
                'new_converts_in_period' => Convert::whereDate('created_at', '>=', $from)->whereDate('created_at', '<=', $to)->count(),
                'campaigns_in_period' => EvangelismCampaign::whereDate('date', '>=', $from)->whereDate('date', '<=', $to)->count(),
            ];
        }

        if ($this->authorized($user, ['view_followups', 'manage_followups'])) {
            $openQuery = FollowUp::query()->whereNotIn('status', ['integre', 'abandonne']);
            if (! AccessControl::viewsFollowUpsGlobally($user)) {
                $openQuery->where('assigned_to', $user->id);
            }
            $data['followups'] = ['open_count' => $openQuery->count()];
        }

        if ($this->authorized($user, ['view_resources', 'manage_resources'])) {
            $data['resources'] = [
                'upcoming_bookings' => ResourceBooking::active()->where('starts_at', '>=', now())->count(),
            ];
        }

        if ($this->authorized($user, ['view_teams', 'manage_teams'])) {
            $servicesInPeriodIds = Service::whereDate('date', '>=', $from)->whereDate('date', '<=', $to)->pluck('id');

            $data['teams'] = [
                'services_total' => $servicesInPeriodIds->count(),
                'services_planned' => ServiceAssignment::whereIn('service_id', $servicesInPeriodIds)->distinct('service_id')->count('service_id'),
            ];
        }

        return response()->json(['data' => $data, 'meta' => ['from' => $from, 'to' => $to]]);
    }

    /**
     * @param  list<string>  $permissions
     */
    private function authorized(User $user, array $permissions): bool
    {
        return $user->hasRole(AccessControl::SUPER_ADMIN) || $user->hasAnyPermission($permissions);
    }
}
